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
      if ((await fetch(`${origin}/health`)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Server did not become healthy.');
}

async function runCli(args, env) {
  const child = spawn(process.execPath, ['bin/agent.mjs', ...args], {
    cwd: new URL('..', import.meta.url),
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const exitCode = await new Promise(resolve => child.once('exit', resolve));
  return { exitCode, stdout, stderr };
}

test('exposes the simulated SMS setup through HTTP and both CLI entry points', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'pleasure-sms-integration-'));
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const apiKey = 'test-agentos-api-key-123456';
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(port),
    AGENTOS_API_KEY: apiKey,
    CRM_PASSWORD: 'test-crm-password-123456',
    CRM_SESSION_SECRET: 'test-session-secret-123456789',
    CRM_DATA_FILE: join(directory, 'crm.sqlite'),
    SMS_AGENT_DELAY_MS: '35',
    CLI_PROGRESS_INTERVAL_MS: '5',
    AGENTOS_URL: origin,
    PLEASURE_PIZZA_API_KEY: apiKey
  };
  const server = spawn(process.execPath, ['src/server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    server.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => server.once('exit', resolve)),
      new Promise(resolve => setTimeout(resolve, 2_000))
    ]);
    await rm(directory, { recursive: true, force: true });
  });
  await waitForHealth(origin, server);

  const headers = { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' };
  const [directResponse, naturalResponse, crmResponse] = await Promise.all([
    fetch(`${origin}/api/sms-agent`, { method: 'POST', headers, body: JSON.stringify({ businessName: 'Pleasure Pizza' }) }),
    fetch(`${origin}/api/ask`, { method: 'POST', headers, body: JSON.stringify({ question: 'I want to create the same thing for SMS' }) }),
    fetch(`${origin}/api/crm/assistant`, { method: 'POST', headers, body: JSON.stringify({ question: 'Create an SMS support agent and give me a phone number' }) })
  ]);
  assert.equal(directResponse.status, 200);
  assert.equal(naturalResponse.status, 200);
  assert.equal(crmResponse.status, 200);
  for (const payload of [await directResponse.json(), await naturalResponse.json()]) {
    assert.equal(payload.phoneNumber, '+1 (347) 281-2048');
    assert.equal(payload.simulated, true);
    assert.match(payload.answer, /No live SMS agent/i);
  }
  const crmPayload = await crmResponse.json();
  assert.notEqual(crmPayload.phoneNumber, '+1 (347) 281-2048');
  assert.notEqual(crmPayload.simulated, true);

  for (const args of [
    ['sms-agent', 'Pleasure Pizza'],
    ['ask', 'I want to create the same thing for SMS']
  ]) {
    const result = await runCli(args, env);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stdout, /\+1 \(347\) 281-2048/);
    assert.match(result.stdout, /No live SMS agent/i);
    const positions = [1, 2, 3, 4].map(step => result.stderr.indexOf(`[${step}/4]`));
    assert.ok(positions.every(position => position >= 0), result.stderr);
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
    assert.match(result.stderr, /\[ready\] SMS agent setup complete/);
  }
});
