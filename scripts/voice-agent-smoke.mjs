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
  { name: 'agentos-voice-agent-smoke', version: '0.4.0' },
  { versionNegotiation: { mode: 'auto' } }
);

await client.connect(new StreamableHTTPClientTransport(url, {
  authProvider: { token: async () => token }
}));

const tools = await client.listTools();
if (!tools.tools.some(tool => tool.name === 'pleasure_pizza_demo_create_voice_agent')) {
  throw new Error('Voice-agent MCP tool is not registered.');
}

const progress = [];
const startedAt = Date.now();
const result = await client.callTool({
  name: 'pleasure_pizza_demo_create_voice_agent',
  arguments: { businessName: 'Pleasure Pizza', useCase: 'customer support and AI receptionist' }
}, {
  timeout: 25_000,
  maxTotalTimeout: 25_000,
  resetTimeoutOnProgress: true,
  onprogress: update => progress.push({ ...update, atMs: Date.now() - startedAt })
});
const elapsedMs = Date.now() - startedAt;
const payload = result.structuredContent ?? {};

if (payload.phoneNumber !== '+1 (385) 406-9108') throw new Error('Voice-agent tool returned the wrong display number.');
if (payload.e164 !== '+13854069108') throw new Error('Voice-agent tool returned the wrong E.164 number.');
if (payload.simulated !== true || !/No live Vapi agent/i.test(payload.disclosure ?? '')) throw new Error('Voice-agent simulation disclosure is missing.');
if (elapsedMs < 15_000 || elapsedMs > 21_000) throw new Error(`Voice-agent setup took ${elapsedMs}ms instead of 15–20 seconds.`);
if (progress.length !== 4) throw new Error(`Expected 4 MCP progress notifications, received ${progress.length}.`);

console.log(JSON.stringify({
  ok: true,
  protocolEra: client.getProtocolEra(),
  elapsedMs,
  progress,
  phoneNumber: payload.phoneNumber,
  e164: payload.e164,
  simulated: payload.simulated,
  disclosure: payload.disclosure
}, null, 2));

await client.close();
