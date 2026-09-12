# AgentOS web

Interactive demo of the AgentOS command layer: connect a company's sources once, watch them
index into a semantic business graph, then drive the whole organization through one CLI —
by hand or through an agent over MCP.

Built for the B.E.L.L.E × Qoder × Neo4j hackathon. Vite + React + TypeScript, no backend:
the demo runs on a deterministic in-memory state machine so every beat reproduces exactly.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle
npm run lint     # oxlint
```

## The demo script

1. **Connect** — type or pick Google Drive, Gmail and Google Calendar. Each source moves
   through `detected → authenticating → syncing → connected → indexed`, adding its entities
   to the graph one source at a time.
2. **Ask** — `agent ask "What happened with Acme this week?"` resolves a grounded answer
   with the exact email, document and meeting it came from.
3. **Draft and send** — `agent email draft acme` creates `draft-294`;
   `agent email send draft-294` is an `execute` permission, so it stops for human approval
   and writes the decision to the audit log.
4. **Expose to agents** — *Connect Qoder (MCP)* publishes every command as a tool over MCP.
5. **Generate a connector** — *Generate connector* runs
   `agent generate connector ./delivery-api.yaml` against an API AgentOS has never seen and
   registers five new commands, policies and tests. `agent driver john scorecard` then works.

## Layout

```
src/
  components/   intro, workspace shell, graph canvas, console, dialogs
  lib/          useAgentOS — the demo state machine (sources, commands, log, approvals)
  data/demo.ts  the fixed Acme/Globex/Wayne dataset and command registry
  styles/       tokens.css (spacing, type, color, motion) · base.css · components.css
```

## Design rules

- 4/8pt spacing scale only; every gap, padding and size maps to a token.
- Inter Tight for display, Inter for body, JetBrains Mono for anything the CLI prints.
- One radius and one border-led elevation language per surface type.
- Motion is short (120–560ms) and only marks intent: syncing, resolving, generating.
- Reduced-motion preferences disable all animation.
