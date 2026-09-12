import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';

let savedConfig = {};
try {
  savedConfig = JSON.parse(await readFile(`${homedir()}/.config/agentos/pleasure-pizza.json`, 'utf8'));
} catch {}

const url = new URL(process.env.AGENTOS_MCP_URL ?? savedConfig.mcpUrl ?? 'http://localhost:3000/mcp');
const token = process.env.PLEASURE_PIZZA_API_KEY ?? process.env.AGENTOS_API_KEY ?? savedConfig.token ?? 'agentos-local-demo-only';
const client = new Client(
  { name: 'agentos-sms-agent-smoke', version: '0.5.0' },
  { versionNegotiation: { mode: 'auto' } }
);

await client.connect(new StreamableHTTPClientTransport(url, {
  authProvider: { token: async () => token }
}));

const tools = await client.listTools();
if (!tools.tools.some(tool => tool.name === 'pleasure_pizza_demo_create_sms_agent')) {
  throw new Error('SMS-agent MCP tool is not registered.');
}

const startedAt = Date.now();
const directProgress = [];
const naturalProgress = [];
const [result, naturalResult] = await Promise.all([
  client.callTool({
    name: 'pleasure_pizza_demo_create_sms_agent',
    arguments: { businessName: 'Pleasure Pizza', useCase: 'customer support over SMS' }
  }, {
    timeout: 25_000,
    maxTotalTimeout: 25_000,
    resetTimeoutOnProgress: true,
    onprogress: update => directProgress.push({ ...update, atMs: Date.now() - startedAt })
  }),
  client.callTool({
    name: 'pleasure_pizza_ask',
    arguments: { question: 'I want to create the same thing for SMS' }
  }, {
    timeout: 25_000,
    maxTotalTimeout: 25_000,
    resetTimeoutOnProgress: true,
    onprogress: update => naturalProgress.push({ ...update, atMs: Date.now() - startedAt })
  })
]);
const elapsedMs = Date.now() - startedAt;
const payload = result.structuredContent ?? {};
const naturalPayload = naturalResult.structuredContent ?? {};
const expectedMessages = [
  'Designing the customer-support SMS workflow',
  'Connecting the Pleasure Pizza knowledge base',
  'Configuring replies, routing, and staff escalation',
  'Assigning and validating the demo SMS number'
];

if (payload.phoneNumber !== '+1 (347) 281-2048') throw new Error('SMS-agent tool returned the wrong display number.');
if (payload.e164 !== '+13472812048') throw new Error('SMS-agent tool returned the wrong E.164 number.');
if (payload.simulated !== true || !/No live SMS agent/i.test(payload.disclosure ?? '') || !/No live SMS agent/i.test(payload.answer ?? '')) throw new Error('SMS-agent simulation disclosure is missing.');
if (naturalPayload.phoneNumber !== payload.phoneNumber || naturalPayload.e164 !== payload.e164 || naturalPayload.simulated !== true) throw new Error('Natural-language SMS request did not reach the same setup flow.');
if (!/No live SMS agent/i.test(naturalPayload.answer ?? '')) throw new Error('Natural-language SMS response is missing its simulation disclosure.');
if (elapsedMs < 15_000 || elapsedMs > 21_000) throw new Error(`SMS-agent setup took ${elapsedMs}ms instead of 15–20 seconds.`);
for (const [label, progress] of [['dedicated', directProgress], ['natural', naturalProgress]]) {
  if (progress.length !== 4) throw new Error(`Expected 4 ${label} MCP progress notifications, received ${progress.length}.`);
  if (progress.some((update, index) => update.progress !== index + 1 || update.total !== 4 || update.message !== expectedMessages[index])) {
    throw new Error(`${label} MCP progress notifications were incomplete or out of order.`);
  }
}

console.log(JSON.stringify({
  ok: true,
  protocolEra: client.getProtocolEra(),
  elapsedMs,
  directProgress,
  naturalProgress,
  phoneNumber: payload.phoneNumber,
  e164: payload.e164,
  simulated: payload.simulated,
  disclosure: payload.disclosure,
  naturalLanguagePrompt: naturalPayload.answer
}, null, 2));

await client.close();
