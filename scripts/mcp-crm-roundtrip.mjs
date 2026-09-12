import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { homedir } from 'node:os';
import { readFile } from 'node:fs/promises';

let savedConfig = {};
try { savedConfig = JSON.parse(await readFile(`${homedir()}/.config/agentos/pleasure-pizza.json`, 'utf8')); } catch {}

const url = new URL(process.env.AGENTOS_MCP_URL ?? savedConfig.mcpUrl ?? 'http://localhost:3000/mcp');
const token = process.env.PLEASURE_PIZZA_API_KEY ?? process.env.AGENTOS_API_KEY ?? savedConfig.token ?? 'agentos-local-demo-only';
const origin = url.origin;
const client = new Client({ name: 'agentos-crm-roundtrip', version: '0.2.0' }, { versionNegotiation: { mode: 'auto' } });

async function api(path) {
  const response = await fetch(`${origin}${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`CRM API ${path} returned ${response.status}.`);
  return response.json();
}

await client.connect(new StreamableHTTPClientTransport(url, { authProvider: { token: async () => token } }));

let customerId;
const eventController = new AbortController();
const eventResponse = await fetch(`${origin}/api/crm/events`, {
  headers: { authorization: `Bearer ${token}` },
  signal: eventController.signal
});
if (!eventResponse.ok || !/text\/event-stream/.test(eventResponse.headers.get('content-type') ?? '')) {
  throw new Error('CRM live event stream is unavailable.');
}
const eventReader = eventResponse.body.getReader();
const decoder = new TextDecoder();
let eventText = decoder.decode((await eventReader.read()).value);
if (!eventText.includes('event: ready')) throw new Error('CRM live event stream did not become ready.');
try {
  const created = await client.callTool({
    name: 'pleasure_pizza_crm_create_customer',
    arguments: { name: 'MCP Round Trip', email: 'mcp.roundtrip@example.com', location: 'downtown', tags: ['automated verification'] }
  });
  customerId = created.structuredContent?.customer?.id;
  if (!customerId) throw new Error('MCP create did not return a customer ID.');

  const eventDeadline = Date.now() + 4_000;
  while (!eventText.includes(customerId) && Date.now() < eventDeadline) {
    const chunk = await eventReader.read();
    if (chunk.done) break;
    eventText += decoder.decode(chunk.value);
  }
  if (!eventText.includes('event: crm-change') || !eventText.includes(customerId)) {
    throw new Error('MCP write did not reach the CRM live event stream.');
  }

  const apiAfterCreate = await api('/api/crm/dashboard');
  if (!apiAfterCreate.customers.some(customer => customer.id === customerId)) {
    throw new Error('MCP-created customer is missing from the CRM API database view.');
  }

  const updated = await client.callTool({
    name: 'pleasure_pizza_crm_update_customer',
    arguments: { customerId, status: 'vip', loyaltyTier: 'Gold' }
  });
  if (updated.structuredContent?.customer?.status !== 'vip') throw new Error('MCP update did not persist.');

  const assisted = await client.callTool({
    name: 'pleasure_pizza_crm_assist_customer',
    arguments: { customerId, question: 'Is the gluten-free crust safe for celiac disease?' }
  });
  if (!assisted.structuredContent?.case?.id) throw new Error('MCP assistant did not create the required staff case.');

  const fetched = await client.callTool({ name: 'pleasure_pizza_crm_get_customer', arguments: { customerId } });
  const customer = fetched.structuredContent?.customer;
  if (customer?.cases?.length < 1 || customer?.activities?.length < 2) throw new Error('MCP read did not return the shared case and activity history.');

  console.log(JSON.stringify({
    ok: true,
    customerId,
    status: customer.status,
    cases: customer.cases.length,
    activities: customer.activities.length,
    apiVisible: true,
    liveEventObserved: true,
    database: apiAfterCreate.meta.database,
    revision: apiAfterCreate.meta.revision
  }, null, 2));
} finally {
  eventController.abort();
  if (customerId) {
    await client.callTool({ name: 'pleasure_pizza_crm_delete_customer', arguments: { customerId } });
    const apiAfterDelete = await api(`/api/crm/customers?query=${encodeURIComponent(customerId)}`);
    if (apiAfterDelete.customers.some(customer => customer.id === customerId)) {
      throw new Error('MCP-deleted customer is still visible through the CRM API.');
    }
  }
  await client.close();
}
