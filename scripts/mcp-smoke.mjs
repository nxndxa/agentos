import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { homedir } from 'node:os';
import { readFile } from 'node:fs/promises';

let savedConfig = {};
try {
  savedConfig = JSON.parse(await readFile(`${homedir()}/.config/agentos/pleasure-pizza.json`, 'utf8'));
} catch {}

const url = new URL(process.env.AGENTOS_MCP_URL ?? savedConfig.mcpUrl ?? 'http://localhost:3000/mcp');
const token = process.env.PLEASURE_PIZZA_API_KEY ?? process.env.AGENTOS_API_KEY ?? savedConfig.token ?? 'agentos-local-demo-only';
const client = new Client(
  { name: 'agentos-pleasure-pizza-smoke', version: '0.1.0' },
  { versionNegotiation: { mode: 'auto' } }
);

await client.connect(new StreamableHTTPClientTransport(url, {
  authProvider: { token: async () => token }
}));

const listed = await client.listTools();
const expected = [
  'pleasure_pizza_ask',
  'pleasure_pizza_demo_create_voice_agent',
  'pleasure_pizza_demo_create_sms_agent',
  'pleasure_pizza_locations',
  'pleasure_pizza_menu',
  'pleasure_pizza_escalate',
  'pleasure_pizza_knowledge_search',
  'pleasure_pizza_crm_dashboard',
  'pleasure_pizza_crm_search_customers',
  'pleasure_pizza_crm_get_customer',
  'pleasure_pizza_crm_create_customer',
  'pleasure_pizza_crm_update_customer',
  'pleasure_pizza_crm_delete_customer',
  'pleasure_pizza_crm_list_cases',
  'pleasure_pizza_crm_create_case',
  'pleasure_pizza_crm_update_case',
  'pleasure_pizza_crm_delete_case',
  'pleasure_pizza_crm_assist_customer'
];
for (const name of expected) {
  if (!listed.tools.some(tool => tool.name === name)) throw new Error(`MCP tool is missing: ${name}`);
}

const result = await client.callTool({
  name: 'pleasure_pizza_ask',
  arguments: { question: 'My Downtown order is missing. Who should I call?' }
});
const text = result.content?.find(item => item.type === 'text')?.text ?? '';
if (!text.includes('831-600-7859')) throw new Error('MCP tool did not route the Downtown order issue correctly.');

const knowledge = await client.callTool({ name: 'pleasure_pizza_knowledge_search', arguments: { query: 'pepperoni inventory supplier manager task', limit: 3 } });
const knowledgeText = knowledge.content?.find(item => item.type === 'text')?.text ?? '';
if (!/pepperoni/i.test(knowledgeText) || !/Pacific Food Distribution/i.test(knowledgeText)) throw new Error('Hybrid PDF retrieval did not find the updated inventory and supplier passages.');

const fallback = await client.callTool({ name: 'pleasure_pizza_ask', arguments: { question: 'Who is Carlos and what can he add?' } });
const fallbackText = fallback.content?.find(item => item.type === 'text')?.text ?? '';
if (!/PDF index/i.test(fallbackText) || !/Pacific Food Distribution/i.test(fallbackText)) throw new Error('General ask did not fall back to the updated complete PDF index.');

const crm = await client.callTool({ name: 'pleasure_pizza_crm_dashboard', arguments: {} });
const crmData = crm.structuredContent ?? {};
if (!Number.isInteger(crmData.stats?.customers) || crmData.stats.customers < 0) throw new Error('CRM dashboard tool did not return a valid customer count.');

console.log(JSON.stringify({
  ok: true,
  protocolEra: client.getProtocolEra(),
  tools: listed.tools.map(tool => tool.name),
  sample: text,
  pdfSearch: knowledgeText,
  askFallback: fallbackText,
  crmCustomers: crmData.stats.customers
}, null, 2));

await client.close();
