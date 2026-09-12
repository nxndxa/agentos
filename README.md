# Pleasure CRM + MCP by AgentOS

A complete synthetic customer-management demo with a responsive password-protected web frontend, persistent SQLite database, real-time web/MCP synchronization, full-PDF hybrid retrieval, credentialed MCP server, and CLI. The source of truth is the updated 78-page Pleasure Pizza Downtown Knowledge Base dated September 12, 2026.

## Hosted service

- Service: `https://mcp-production-110f.up.railway.app`
- CRM application: `https://mcp-production-110f.up.railway.app/crm`
- MCP endpoint: `https://mcp-production-110f.up.railway.app/mcp`
- Health: `https://mcp-production-110f.up.railway.app/health`
- Authentication: `Authorization: Bearer <PLEASURE_PIZZA_API_KEY>`

The server supports the current MCP protocol and the legacy Streamable HTTP fallback. It exposes the original knowledge tools plus complete CRM tools:

- `pleasure_pizza_ask`
- `pleasure_pizza_demo_create_voice_agent`
- `pleasure_pizza_demo_create_sms_agent`
- `pleasure_pizza_locations`
- `pleasure_pizza_menu`
- `pleasure_pizza_escalate`
- `pleasure_pizza_knowledge_search`
- `pleasure_pizza_crm_dashboard`
- `pleasure_pizza_crm_search_customers`
- `pleasure_pizza_crm_get_customer`
- `pleasure_pizza_crm_create_customer`
- `pleasure_pizza_crm_update_customer`
- `pleasure_pizza_crm_delete_customer`
- `pleasure_pizza_crm_list_cases`
- `pleasure_pizza_crm_create_case`
- `pleasure_pizza_crm_update_case`
- `pleasure_pizza_crm_delete_case`
- `pleasure_pizza_crm_assist_customer`

The CRM webpage and MCP tools read and write the same SQLite database. Server-Sent Events push MCP and CLI mutations into already-open browser sessions, with periodic polling as a fallback. Railway mounts the database at `/data`, so records survive deploys and restarts. All seeded people and contact details are fictional demo data.

## Full PDF knowledge index

`data/pleasure-pizza-knowledge.txt` is the complete text extraction of all 78 PDF pages. `data/pleasure-pizza-knowledge-vectors.json` stores one L2-normalized sparse TF-IDF vector per page. On startup, the service verifies the corpus and vector hashes, ingests every page into SQLite FTS5, and uses reciprocal-rank fusion across FTS5 and cosine-vector results. `pleasure_pizza_knowledge_search` returns grounded passages with source PDF page numbers. These are local sparse lexical vectors, not hosted neural embeddings, and the product labels them accurately.

## CLI

The local deployment process saves the credential at `.agentos/credentials.env` and installs a private user config at `~/.config/agentos/pleasure-pizza.json`. Both are excluded from Git.

```bash
node bin/agent.mjs ask "Do you have gluten-free pizza?"
node bin/agent.mjs locations downtown
node bin/agent.mjs menu vegetarian
node bin/agent.mjs escalate "missing order" --location downtown
node bin/agent.mjs voice-agent "Pleasure Pizza"
node bin/agent.mjs sms-agent "Pleasure Pizza"
node bin/agent.mjs knowledge "award winning chowder"
node bin/agent.mjs crm dashboard
node bin/agent.mjs crm customers maya
node bin/agent.mjs crm add-customer "Alex Rivera" --email alex@example.com --location downtown
node bin/agent.mjs crm assist cus_maya "What vegetarian pizza should I try?"
```

## Demo voice-agent flow

The primary demo is CLI-facing. Run `node bin/agent.mjs voice-agent "Pleasure Pizza"`, or use a normal prompt such as `node bin/agent.mjs ask "Create a Vapi customer-support voice agent and give me the phone number"`. Both commands print four setup stages live over roughly 15–20 seconds and return the fixed demo number `+1 (385) 406-9108` (`+13854069108`). The same flow is available through `pleasure_pizza_ask` and `pleasure_pizza_demo_create_voice_agent`. This is a deterministic simulation for the hackathon demo; it does not create a live Vapi agent or phone-number resource.

## Demo SMS-agent flow

Run `node bin/agent.mjs sms-agent "Pleasure Pizza"`, or use a normal prompt such as `node bin/agent.mjs ask "Create an SMS customer-support agent and give me the number"`. Both commands print four setup stages live over roughly 15–20 seconds and return the fixed demo number `+1 (347) 281-2048` (`+13472812048`). The same flow is available through `pleasure_pizza_ask` and `pleasure_pizza_demo_create_sms_agent`. This is a deterministic simulation for the hackathon demo; it does not create a live SMS agent, carrier service, or phone-number resource.

## Connect Codex

Export the credential into the environment that launches Codex, then register the hosted server:

```bash
codex mcp add pleasure-pizza-by-agentos \
  --url https://mcp-production-110f.up.railway.app/mcp \
  --bearer-token-env-var PLEASURE_PIZZA_API_KEY
```

The installed Codex skill is `$pleasure-pizza-by-agentos` and includes a dependency-free CLI helper.

## Accuracy boundaries

The runtime treats locations as distinct, asks for location when required, qualifies dynamic prices and hours, never guarantees allergy safety or delivery coverage, and routes order/refund/payment problems to restaurant staff. It does not connect to live ordering or point-of-sale systems.

## Development

```bash
npm install
npm test
ALLOW_INSECURE_LOCAL_DEMO=true npm start
```

Production startup fails closed unless `AGENTOS_API_KEY`, `CRM_PASSWORD`, and `CRM_SESSION_SECRET` are all configured. `ALLOW_INSECURE_LOCAL_DEMO=true` enables the documented local-only defaults and must never be used in production.

With the server running:

```bash
npm run smoke
npm run smoke:mcp
npm run smoke:crm
npm run smoke:voice
npm run smoke:sms
```
