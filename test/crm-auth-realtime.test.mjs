import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

async function availablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForHealth(origin, child) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Server exited early with ${child.exitCode}.`);
    try {
      const response = await fetch(`${origin}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Server did not become healthy.');
}

test('protects browser CRM access while preserving Bearer CLI access and pushing live events', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'pleasure-crm-server-'));
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const apiKey = 'test-agentos-api-key-123456';
  const password = 'test-crm-password-123456';
  const child = spawn(process.execPath, ['src/server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      PORT: String(port),
      AGENTOS_API_KEY: apiKey,
      CRM_PASSWORD: password,
      CRM_SESSION_SECRET: 'test-session-secret-123456789',
      CRM_DATA_FILE: join(directory, 'crm.sqlite')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    child.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => child.once('exit', resolve)),
      new Promise(resolve => setTimeout(resolve, 2_000))
    ]);
    await rm(directory, { recursive: true, force: true });
  });

  await waitForHealth(origin, child);

  const lockedPage = await fetch(`${origin}/crm`, { redirect: 'manual' });
  assert.equal(lockedPage.status, 302);
  assert.equal(lockedPage.headers.get('location'), '/crm/login');
  assert.equal((await fetch(`${origin}/api/crm/dashboard`)).status, 401);

  const rejected = await fetch(`${origin}/crm/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ password: 'wrong-password' })
  });
  assert.equal(rejected.status, 401);

  const accepted = await fetch(`${origin}/crm/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ password })
  });
  assert.equal(accepted.status, 303);
  const cookie = accepted.headers.get('set-cookie');
  assert.match(cookie, /pleasure_crm_session=/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);

  const cookieHeader = cookie.split(';', 1)[0];
  const crmPage = await fetch(`${origin}/crm`, { headers: { cookie: cookieHeader } });
  assert.equal(crmPage.status, 200);
  assert.match(await crmPage.text(), /Customer overview/);

  const bearerHeaders = { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' };
  const cliDashboard = await fetch(`${origin}/api/crm/dashboard`, { headers: bearerHeaders });
  assert.equal(cliDashboard.status, 200);

  const malformedCookie = await fetch(`${origin}/api/crm/dashboard`, {
    headers: { cookie: 'pleasure_crm_session=%' }
  });
  assert.equal(malformedCookie.status, 401);
  assert.equal(child.exitCode, null);
  assert.equal((await fetch(`${origin}/health`)).status, 200);

  const controller = new AbortController();
  const eventResponse = await fetch(`${origin}/api/crm/events`, {
    headers: { cookie: cookieHeader },
    signal: controller.signal
  });
  assert.equal(eventResponse.status, 200);
  assert.match(eventResponse.headers.get('content-type'), /text\/event-stream/);
  const reader = eventResponse.body.getReader();
  const decoder = new TextDecoder();
  let events = decoder.decode((await reader.read()).value);
  assert.match(events, /event: ready/);

  const createResponse = await fetch(`${origin}/api/crm/customers`, {
    method: 'POST',
    headers: bearerHeaders,
    body: JSON.stringify({ name: 'Realtime Test Customer', email: 'realtime@test.invalid', location: 'downtown' })
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();

  const timeout = setTimeout(() => controller.abort(), 3_000);
  while (!events.includes('event: crm-change')) {
    const chunk = await reader.read();
    if (chunk.done) break;
    events += decoder.decode(chunk.value);
  }
  clearTimeout(timeout);
  controller.abort();
  assert.match(events, /event: crm-change/);
  assert.match(events, new RegExp(created.id));

  const browserDashboard = await fetch(`${origin}/api/crm/dashboard`, { headers: { cookie: cookieHeader } });
  const dashboard = await browserDashboard.json();
  assert.ok(dashboard.customers.some(customer => customer.id === created.id));

  const removed = await fetch(`${origin}/api/crm/customers/${created.id}`, { method: 'DELETE', headers: bearerHeaders });
  assert.equal(removed.status, 200);
});

test('fails closed when production credentials are missing', async () => {
  const env = { ...process.env, PORT: '0' };
  delete env.AGENTOS_API_KEY;
  delete env.CRM_PASSWORD;
  delete env.CRM_SESSION_SECRET;
  delete env.ALLOW_INSECURE_LOCAL_DEMO;

  const child = spawn(process.execPath, ['src/server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env,
    stdio: ['ignore', 'ignore', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  const exitCode = await new Promise(resolve => child.once('exit', resolve));

  assert.notEqual(exitCode, 0);
  assert.match(stderr, /AGENTOS_API_KEY is required/);
});
