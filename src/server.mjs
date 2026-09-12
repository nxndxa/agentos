import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createPleasurePizzaMcpServer } from './mcp.mjs';
import { askPleasurePizza, createDemoSmsAgent, createDemoVoiceAgent, escalatePleasurePizza, getPleasurePizzaLocations, getPleasurePizzaMenu, TOOL_DEFINITIONS } from './runtime.mjs';
import { KNOWLEDGE_BASE_VERSION } from './knowledge.mjs';
import { renderDocsPage } from './docs-page.mjs';
import { renderCrmPage } from './crm-page.mjs';
import { crmStore } from './crm-store.mjs';
import { assistCrmCustomer } from './crm-runtime.mjs';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const allowInsecureLocalDemo = process.env.ALLOW_INSECURE_LOCAL_DEMO === 'true';
const expectedToken = process.env.AGENTOS_API_KEY ?? (allowInsecureLocalDemo ? 'agentos-local-demo-only' : '');
const crmPassword = process.env.CRM_PASSWORD ?? '';
const crmSessionSecret = process.env.CRM_SESSION_SECRET ?? (allowInsecureLocalDemo ? expectedToken : '');
if (!expectedToken) throw new Error('AGENTOS_API_KEY is required. Set ALLOW_INSECURE_LOCAL_DEMO=true only for local development.');
if (!crmPassword && !allowInsecureLocalDemo) throw new Error('CRM_PASSWORD is required.');
if (!crmSessionSecret) throw new Error('CRM_SESSION_SECRET is required.');
const crmCookieName = 'pleasure_crm_session';
const crmSessionToken = createHmac('sha256', crmSessionSecret).update(`pleasure-crm:${crmPassword}`).digest('base64url');
const mcpHandler = createMcpHandler(() => createPleasurePizzaMcpServer());
const handleMcp = toNodeHandler(mcpHandler, { onerror: error => console.error('MCP adapter error:', error) });

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders });
  res.end(JSON.stringify(body));
}

function sendHtml(res) {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' });
  res.end(renderDocsPage(process.env.PUBLIC_URL ?? 'https://mcp-production-110f.up.railway.app'));
}

function sendCrmHtml(res) {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(renderCrmPage(process.env.PUBLIC_URL ?? 'https://mcp-production-110f.up.railway.app'));
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function sendLoginHtml(res, { status = 200, error = '' } = {}) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY'
  });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in · Pleasure Pizza CRM</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet"><style>:root{--ink:#1d211c;--muted:#6b7067;--paper:#f4f2ec;--line:#d7d5ce;--accent:#a33b26}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--paper);color:var(--ink);font:16px/1.5 "IBM Plex Sans",sans-serif}.shell{width:min(420px,100%)}.brand{display:flex;align-items:center;gap:12px;margin-bottom:40px}.mark{width:34px;height:34px;display:grid;place-items:center;background:var(--ink);color:#fff;font-size:12px;font-weight:600}.brand strong{display:block}.brand span{display:block;color:var(--muted);font-size:13px}.panel{padding:32px;border:1px solid var(--line);background:#fff;box-shadow:0 12px 35px rgba(36,32,24,.08)}h1{margin:0;font-size:26px;letter-spacing:-.03em}p{margin:8px 0 26px;color:var(--muted)}label{display:block;margin-bottom:7px;font-size:14px;font-weight:500}input{width:100%;height:46px;padding:0 12px;border:1px solid #aaa99f;border-radius:4px;font:inherit;outline:none}input:focus{border-color:var(--ink);box-shadow:0 0 0 3px rgba(29,33,28,.1)}button{width:100%;height:46px;margin-top:14px;border:0;border-radius:4px;background:var(--ink);color:#fff;font:600 15px "IBM Plex Sans",sans-serif;cursor:pointer}button:hover{background:#30362f}.error{margin:0 0 16px;padding:10px 12px;border:1px solid #dfb5ac;background:#fff5f2;color:#842f1f;font-size:14px}.foot{margin-top:18px;color:var(--muted);font-size:13px;text-align:center}@media(max-width:480px){.panel{padding:24px}.brand{margin-bottom:28px}}</style></head><body><main class="shell"><div class="brand"><span class="mark">PP</span><div><strong>Pleasure Pizza</strong><span>Customer operations · AgentOS</span></div></div><section class="panel"><h1>Sign in to the CRM</h1><p>Use the workspace password to access customer records and support cases.</p>${error ? `<div class="error" role="alert">${escapeHtml(error)}</div>` : ''}<form method="post" action="/crm/login"><label for="password">Workspace password</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus><button type="submit">Sign in</button></form></section><div class="foot">Protected workspace · MCP access uses a separate API credential</div></main></body></html>`);
}

function safeEqual(actual, expected) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function authorized(req) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return safeEqual(token, expectedToken);
}

function crmSessionAuthorized(req) {
  if (!crmPassword) return true;
  const cookies = {};
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    try {
      const name = decodeURIComponent(part.slice(0, separator).trim());
      const value = decodeURIComponent(part.slice(separator + 1).trim());
      cookies[name] = value;
    } catch {
      return false;
    }
  }
  return safeEqual(cookies[crmCookieName] ?? '', crmSessionToken);
}

function crmAuthorized(req) {
  return authorized(req) || crmSessionAuthorized(req);
}

function sessionCookie(req, value, maxAge) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim();
  const secure = forwardedProto === 'https' ? '; Secure' : '';
  return `${crmCookieName}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readJson(req) {
  return JSON.parse((await readBody(req)) || '{}');
}

async function sendCrmEvents(res) {
  await crmStore.init();
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no'
  });
  res.write(`event: ready\ndata: ${JSON.stringify({ connected: true })}\n\n`);
  const unsubscribe = crmStore.subscribe(change => {
    if (!res.destroyed) res.write(`event: crm-change\ndata: ${JSON.stringify(change)}\n\n`);
  });
  const heartbeat = setInterval(() => {
    if (!res.destroyed) res.write(': heartbeat\n\n');
  }, 20_000);
  res.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

async function handleRequest(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'authorization, content-type, mcp-protocol-version, mcp-session-id');
  res.setHeader('access-control-expose-headers', 'mcp-session-id, mcp-protocol-version');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS' });
    return res.end();
  }

  if (url.pathname === '/health') {
    return sendJson(res, 200, { ok: true, service: 'the-pleasure-pizza-skill-by-agentos', version: '0.5.0', knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION, crm: 'SQLite + FTS5 + TF-IDF vectors', demoVoiceAgent: true, demoSmsAgent: true });
  }

  if (url.pathname === '/' && req.method === 'GET') return sendHtml(res);
  if (url.pathname === '/crm/login' && req.method === 'GET') {
    if (crmSessionAuthorized(req)) {
      res.writeHead(302, { location: '/crm', 'cache-control': 'no-store' });
      return res.end();
    }
    return sendLoginHtml(res);
  }
  if (url.pathname === '/crm/login' && req.method === 'POST') {
    const form = new URLSearchParams(await readBody(req));
    if (!crmPassword || safeEqual(form.get('password') ?? '', crmPassword)) {
      res.writeHead(303, { location: '/crm', 'set-cookie': sessionCookie(req, crmSessionToken, 43_200), 'cache-control': 'no-store' });
      return res.end();
    }
    return sendLoginHtml(res, { status: 401, error: 'That password is not correct. Try again.' });
  }
  if (url.pathname === '/crm/logout' && req.method === 'POST') {
    res.writeHead(303, { location: '/crm/login', 'set-cookie': sessionCookie(req, '', 0), 'cache-control': 'no-store' });
    return res.end();
  }
  if (url.pathname === '/crm' && req.method === 'GET') {
    if (!crmSessionAuthorized(req)) {
      res.writeHead(302, { location: '/crm/login', 'cache-control': 'no-store' });
      return res.end();
    }
    return sendCrmHtml(res);
  }

  if (url.pathname.startsWith('/api/crm/')) {
    if (!crmAuthorized(req)) return sendJson(res, 401, { error: 'unauthorized', message: 'Sign in to the CRM or provide the AgentOS Bearer credential.' });
    if (url.pathname === '/api/crm/events' && req.method === 'GET') return sendCrmEvents(res);
    try {
      if (url.pathname === '/api/crm/dashboard' && req.method === 'GET') return sendJson(res, 200, await crmStore.dashboard());
      if (url.pathname === '/api/crm/customers' && req.method === 'GET') return sendJson(res, 200, { customers: await crmStore.searchCustomers({ query: url.searchParams.get('query') ?? '', location: url.searchParams.get('location') ?? '', status: url.searchParams.get('status') ?? '' }) });
      if (url.pathname === '/api/crm/customers' && req.method === 'POST') return sendJson(res, 201, await crmStore.createCustomer(await readJson(req)));
      if (url.pathname === '/api/crm/cases' && req.method === 'GET') return sendJson(res, 200, { cases: await crmStore.listCases({ customerId: url.searchParams.get('customerId') ?? '', status: url.searchParams.get('status') ?? '', priority: url.searchParams.get('priority') ?? '' }) });
      if (url.pathname === '/api/crm/cases' && req.method === 'POST') return sendJson(res, 201, await crmStore.createCase(await readJson(req)));
      if (url.pathname === '/api/crm/assistant' && req.method === 'POST') return sendJson(res, 200, (await assistCrmCustomer(await readJson(req))).structuredContent);
      if (url.pathname === '/api/crm/knowledge' && req.method === 'GET') return sendJson(res, 200, { query: url.searchParams.get('query') ?? '', results: await crmStore.searchKnowledge(url.searchParams.get('query') ?? '', url.searchParams.get('limit') ?? 5), retrieval: 'Hybrid SQLite FTS5 + sparse TF-IDF cosine vectors', source: 'Pleasure Pizza Knowledge Base (1).pdf' });

      const customerMatch = url.pathname.match(/^\/api\/crm\/customers\/([^/]+)$/);
      if (customerMatch && req.method === 'GET') return sendJson(res, 200, await crmStore.getCustomer(decodeURIComponent(customerMatch[1])));
      if (customerMatch && req.method === 'PATCH') return sendJson(res, 200, await crmStore.updateCustomer(decodeURIComponent(customerMatch[1]), await readJson(req)));
      if (customerMatch && req.method === 'DELETE') return sendJson(res, 200, await crmStore.deleteCustomer(decodeURIComponent(customerMatch[1])));

      const caseMatch = url.pathname.match(/^\/api\/crm\/cases\/([^/]+)$/);
      if (caseMatch && req.method === 'PATCH') return sendJson(res, 200, await crmStore.updateCase(decodeURIComponent(caseMatch[1]), await readJson(req)));
      if (caseMatch && req.method === 'DELETE') return sendJson(res, 200, await crmStore.deleteCase(decodeURIComponent(caseMatch[1])));
      return sendJson(res, 404, { error: 'not_found' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';
      return sendJson(res, /not found/i.test(message) ? 404 : 400, { error: 'invalid_request', message });
    }
  }

  if (!authorized(req)) {
    return sendJson(res, 401, { error: 'unauthorized', message: 'Provide the AgentOS demo credential as a Bearer token.' }, { 'www-authenticate': 'Bearer realm="agentos-pleasure-pizza"' });
  }

  if (url.pathname === '/mcp') {
    req.auth = { token: expectedToken, clientId: 'agentos-demo-client', scopes: ['mcp'], expiresAt: Math.floor(Date.now() / 1000) + 3600 };
    return handleMcp(req, res);
  }

  if (url.pathname === '/api/tools' && req.method === 'GET') return sendJson(res, 200, { tools: TOOL_DEFINITIONS, crm: true, mcpEndpoint: '/mcp' });

  if (url.pathname.startsWith('/api/') && req.method === 'POST') {
    try {
      const body = await readJson(req);
      const result = url.pathname === '/api/ask'
        ? await askPleasurePizza(body)
        : url.pathname === '/api/locations'
          ? getPleasurePizzaLocations(body)
          : url.pathname === '/api/menu'
            ? getPleasurePizzaMenu(body)
            : url.pathname === '/api/escalate'
              ? escalatePleasurePizza(body)
              : url.pathname === '/api/voice-agent'
                ? await createDemoVoiceAgent(body)
              : url.pathname === '/api/sms-agent'
                ? await createDemoSmsAgent(body)
              : null;
      if (!result) return sendJson(res, 404, { error: 'not_found' });
      return sendJson(res, 200, result.structuredContent);
    } catch (error) {
      return sendJson(res, 400, { error: 'invalid_request', message: error instanceof Error ? error.message : 'Invalid request.' });
    }
  }

  return sendJson(res, 404, { error: 'not_found' });
}

const server = createServer((req, res) => {
  void handleRequest(req, res).catch(error => {
    console.error('Unhandled request error:', error);
    if (!res.headersSent) return sendJson(res, 500, { error: 'internal_error', message: 'The request could not be completed.' });
    res.destroy();
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`The Pleasure Pizza Skill by AgentOS listening on port ${port}`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, async () => {
    await mcpHandler.close();
    server.close(() => process.exit(0));
  });
}
