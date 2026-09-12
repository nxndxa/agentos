# AgentOS

> **One company. One CLI. Any agent.**

AgentOS turns an existing business into an agent-native operating environment. Connect a company's tools and knowledge once, and AgentOS builds a semantic graph of the organization and exposes it through a single command layer that humans, scripts, and AI agents can all drive.

```
agent ask "what happened with Acme this week?"
agent customer acme
agent meeting prepare acme
agent email draft acme --follow-up
```

## The thesis

The terminal is not merely the UI. **The CLI is the protocol.**

Today every AI application rebuilds the same plumbing: a support agent integrates with Zendesk, a sales agent with Salesforce, a scheduling agent with Google Calendar. Duplicated infrastructure, isolated agents.

AgentOS reverses that:

```
Business tools  →  AgentOS  →  Universal Business Interface  →  Any agent
```

An agent no longer needs credentials for every SaaS platform. It needs access to AgentOS.

## Architecture

```
┌────────────────────────────────────┐
│           INTERFACES               │
│  CLI / iMessage / Slack / Capy     │
│  Qoder / API / MCP / Agents        │
└──────────────────┬─────────────────┘
                   │
┌──────────────────▼─────────────────┐
│     AGENTOS COMMAND LAYER          │
│  Intent → command → policy → action│
└──────────────────┬─────────────────┘
                   │
┌──────────────────▼─────────────────┐
│        BUSINESS GRAPH              │
│  Customers / people / docs / tasks │
│  conversations / meetings / tools  │
└──────────────────┬─────────────────┘
                   │
┌──────────────────▼─────────────────┐
│        CONNECTOR LAYER             │
│   Drive / Gmail / Slack / APIs     │
└──────────────────┬─────────────────┘
                   │
┌──────────────────▼─────────────────┐
│       EXISTING BUSINESS            │
└────────────────────────────────────┘
```

The business graph lives in Neo4j. AgentOS models actual relationships rather than storing disconnected embeddings:

```
(Person)-[:WORKS_AT]->(Company)
(Customer)-[:HAS_CONTRACT]->(Document)
(Customer)-[:ATTENDED]->(Meeting)
(Meeting)-[:DISCUSSED]->(Project)
(Employee)-[:OWNS]->(Customer)
```

So a question like *"What happened with Acme last week?"* resolves Acme as an entity, traverses its people, emails, meetings, documents and projects, then fetches the original sources — instead of running five isolated keyword searches.

## The single registry

One `AgentCommand` registry powers every interface at once: CLI, MCP, AI tool calls, the HTTP API, Capy, and iMessage. See [`cli/core/registry.ts`](cli/core/registry.ts). This is the load-bearing architectural choice — a capability defined once becomes callable everywhere.

## Permissions

Every action carries an explicit permission level:

| Level | Examples | Behaviour |
| --- | --- | --- |
| `read` | `customer list`, `docs search`, `email search` | Runs automatically |
| `write` | `task create`, `customer update` | Policy-validated |
| `execute` | `email send`, `invoice send`, `meeting schedule` | Requires human confirmation by default |

Every operation is audit-logged with the calling agent's identity.

## Repository layout

The separate [Pleasure Pizza Eve service](services/eve-agent/README.md) connects MiniMax reasoning, the existing restaurant knowledge API, and SendBlue iMessage on Railway. Its README covers the architecture, configuration, deployment, and verification limits.

```
cli/
├── commands/     # init, ask, customer, connect — thin CLI surface
├── core/         # registry, router, policy, agent runtime
├── graph/        # Neo4j client, entities, relationships
├── connectors/   # gmail/, drive/, demo/ (deterministic fixture data)
├── retrieval/    # graph-search + semantic-search (hybrid retrieval)
├── gateway/      # external interfaces (iMessage, chat)
├── generated/    # connectors produced from OpenAPI specs
└── tests/
```

## Build priority

- **P0 — must work:** CLI → business data → Neo4j graph → natural-language query → structured response. And the same response via an external interface.
- **P1 — very valuable:** `email draft` / one executable action.
- **P2 — killer technical feature:** OpenAPI → Qoder → automatically generated AgentOS commands.

  ```
  agent generate connector ./delivery-api.yaml
  ```

  Detects endpoints, generates the connector, command manifest, permission policies and tests — then `agent driver john scorecard` works moments later.
- **P3 — stretch:** MCP, permissions UI, audit UI, dynamic plugins.

## Non-goals

Full OAuth platform, enterprise RBAC, ten integrations, a complex admin dashboard, production billing, large-scale vector infrastructure, mobile app. These distract from the central demonstration.

## Status

Scaffolding. Built for the **B.E.L.L.E × Qoder × Neo4j AI Hackathon** (AI-native enterprise infrastructure / agentic developer tool).
