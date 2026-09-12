import { useCallback, useEffect, useReducer } from "react";
import {
  ACME_WEEK_ANSWER,
  CONNECTOR_SPEC,
  CORE_COMMANDS,
  CUSTOMERS_ANSWER,
  DRIVER_LIST_OUTPUT,
  ENTITIES,
  GENERATED_COMMANDS,
  SCORECARD_OUTPUT,
  SOURCE_COMMANDS,
  SOURCE_DEFS,
  fallbackAnswer,
} from "../data/demo";
import type { Answer, CommandDef, SourceKind, SourceState } from "../data/demo";

export interface SourceRuntime {
  kind: SourceKind;
  state: SourceState;
}

export interface LogLine {
  id: number;
  kind: "cmd" | "out" | "ok" | "err" | "dim";
  text: string;
}

export interface AgentConn {
  id: string;
  name: string;
  transport: string;
}

export interface AgentOSState {
  phase: "intro" | "workspace";
  sources: SourceRuntime[];
  revealed: string[];
  commands: CommandDef[];
  agents: AgentConn[];
  log: LogLine[];
  question: string | null;
  answer: Answer | null;
  draftId: string | null;
  approvalOpen: boolean;
  sent: boolean;
  connectorStep: number | null;
  generated: boolean;
}

const INITIAL: AgentOSState = {
  phase: "intro",
  sources: [],
  revealed: [],
  commands: CORE_COMMANDS,
  agents: [],
  log: [],
  question: null,
  answer: null,
  draftId: null,
  approvalOpen: false,
  sent: false,
  connectorStep: null,
  generated: false,
};

type Action =
  | { type: "start"; kinds: SourceKind[] }
  | { type: "connect"; kind: SourceKind }
  | { type: "sourceState"; kind: SourceKind; state: SourceState }
  | { type: "run"; raw: string }
  | { type: "resolveAnswer" }
  | { type: "openApproval" }
  | { type: "closeApproval" }
  | { type: "send" }
  | { type: "connectAgent" }
  | { type: "startConnector" }
  | { type: "connectorStep"; step: number }
  | { type: "finishConnector" }
  | { type: "closeConnector" };

function label(kind: SourceKind): string {
  return SOURCE_DEFS.find((s) => s.kind === kind)?.label ?? kind;
}

function entitiesFor(kind: SourceKind): string[] {
  return ENTITIES.filter((e) => e.from === kind).map((e) => e.id);
}

function push(state: AgentOSState, kind: LogLine["kind"], text: string): LogLine[] {
  return [...state.log, { id: state.log.length, kind, text }];
}

function withLog(state: AgentOSState, kind: LogLine["kind"], text: string): AgentOSState {
  return { ...state, log: push(state, kind, text) };
}

function reducer(state: AgentOSState, action: Action): AgentOSState {
  switch (action.type) {
    case "start": {
      const next: AgentOSState = { ...state, phase: "workspace" };
      return action.kinds.reduce((acc, kind) => reducer(acc, { type: "connect", kind }), next);
    }

    case "connect": {
      if (state.sources.some((s) => s.kind === action.kind)) return state;
      const next: AgentOSState = {
        ...state,
        sources: [...state.sources, { kind: action.kind, state: "detected" }],
      };
      let out = withLog(next, "cmd", `agent connect ${label(action.kind)}`);
      out = withLog(out, "dim", `→ detected ${label(action.kind)} (${SOURCE_DEFS.find((s) => s.kind === action.kind)?.vendor})`);
      return out;
    }

    case "sourceState": {
      const sources = state.sources.map((s) =>
        s.kind === action.kind ? { ...s, state: action.state } : s,
      );
      const next = { ...state, sources };
      switch (action.state) {
        case "authenticating":
          return withLog(next, "dim", `authorizing ${label(action.kind)}…`);
        case "syncing":
          return withLog(next, "dim", `syncing ${label(action.kind)}…`);
        case "connected":
          return withLog(next, "ok", `✓ ${label(action.kind)} connected`);
        case "indexed": {
          const ids = entitiesFor(action.kind);
          let out: AgentOSState = {
            ...next,
            revealed: [...state.revealed, ...ids],
            commands: [...state.commands, ...SOURCE_COMMANDS[action.kind]],
          };
          out = withLog(out, "ok", `✓ ${label(action.kind)} indexed — ${ids.length} entities added to graph`);
          return out;
        }
        case "detected":
          return next;
      }
      return next;
    }

    case "run": {
      const raw = action.raw.trim();
      if (!raw) return state;
      const next = withLog(state, "cmd", raw);
      const body = raw.replace(/^agent\s+/, "").trim();
      const [head, ...rest] = body.split(/\s+/);
      const arg = rest.join(" ");

      if (head === "ask") {
        const question = arg.replace(/^"|"$/g, "").trim();
        if (!question) return withLog(next, "err", "error: ask requires a question");
        if (state.revealed.length === 0)
          return withLog(next, "err", "error: no sources indexed. Run 'agent connect Gmail' first.");
        return { ...next, question, answer: null };
      }

      if (head === "customers" || (head === "customer" && arg === "list")) {
        if (!state.revealed.includes("acme"))
          return withLog(next, "err", "error: no customers resolved yet");
        let out = withLog(next, "out", "Acme Corp      owned by Sarah   5 artifacts   active this week");
        out = withLog(out, "out", "Globex         owned by David     3 artifacts");
        out = withLog(out, "out", "Wayne Logistics owned by Mike     2 artifacts");
        return out;
      }

      if (head === "customer" && arg.startsWith("acme")) {
        if (!state.revealed.includes("acme")) return withLog(next, "err", "error: unknown customer 'acme'");
        let out = withLog(next, "out", "Acme Corp — customer");
        out = withLog(out, "out", "  owner     Sarah (sarah@acme.com)");
        out = withLog(out, "out", "  emails    Re: revised pricing, Onboarding call");
        out = withLog(out, "out", "  docs      Acme Proposal, Acme Contract, pricing-v3.pdf");
        out = withLog(out, "out", "  meetings  Acme onboarding (Mon 2:00pm)");
        return out;
      }

      if (head === "email" && arg.startsWith("draft")) {
        if (!state.commands.some((c) => c.name === "email.draft"))
          return withLog(next, "err", "error: unknown command 'email.draft'. Connect Gmail first.");
        let out = withLog(next, "ok", "✓ draft-294 created → sarah@acme.com");
        out = withLog(out, "dim", "subject: Updated pricing proposal");
        out = withLog(out, "dim", "run 'agent email send draft-294' — external action, requires approval");
        return { ...out, draftId: "draft-294" };
      }

      if (head === "email" && arg.startsWith("send")) {
        if (!state.draftId) return withLog(next, "err", "error: no draft to send");
        if (state.sent) return withLog(next, "err", "error: draft-294 already sent");
        return { ...next, approvalOpen: true };
      }

      if (head === "driver" && arg.startsWith("john scorecard")) {
        if (!state.generated)
          return withLog(next, "err", `error: unknown command 'driver'. Run 'agent help' to list ${state.commands.length} commands.`);
        return withLog(next, "out", SCORECARD_OUTPUT);
      }

      if (head === "drivers" || (head === "driver" && arg === "list")) {
        if (!state.generated)
          return withLog(next, "err", "error: unknown command 'driver'. Run 'agent generate connector ./delivery-api.yaml' first.");
        return withLog(next, "out", DRIVER_LIST_OUTPUT);
      }

      if (head === "help") {
        let out = withLog(next, "dim", "core");
        for (const c of state.commands.filter((c) => c.from === "core"))
          out = withLog(out, "out", `  ${c.name.padEnd(18)} ${c.description}`);
        for (const src of SOURCE_DEFS) {
          const cmds = state.commands.filter((c) => c.from === src.kind);
          if (cmds.length === 0) continue;
          out = withLog(out, "dim", src.label.toLowerCase());
          for (const c of cmds) out = withLog(out, "out", `  ${c.name.padEnd(18)} ${c.description}`);
        }
        if (state.generated) {
          out = withLog(out, "dim", "generated (delivery-api)");
          for (const c of state.commands.filter((c) => c.from === "generated"))
            out = withLog(out, "out", `  ${c.name.padEnd(18)} ${c.description}`);
        }
        return out;
      }

      if (head === "audit") {
        let out = withLog(next, "out", "11:03  qoder   READ    customer.acme");
        out = withLog(out, "out", "11:04  qoder   READ    email.thread.193");
        out = withLog(out, "out", "11:05  ani     CREATE  email.draft.294");
        if (state.sent) out = withLog(out, "out", "11:09  ani     SEND    email.draft.294  (approved)");
        return out;
      }

      if (head === "connect") {
        const def = SOURCE_DEFS.find((s) => s.label.toLowerCase() === arg.toLowerCase());
        if (!def) return withLog(next, "err", `error: unknown source '${arg}'`);
        return reducer(next, { type: "connect", kind: def.kind });
      }

      return withLog(next, "err", `error: unknown command '${head}'. Run 'agent help'.`);
    }

    case "resolveAnswer": {
      const question = state.question;
      if (!question) return state;
      const sourceCount = state.sources.filter((s) => s.state === "indexed").length;
      let answer: Answer;
      if (/acme/i.test(question) && /(week|happen|latest|update)/i.test(question))
        answer = ACME_WEEK_ANSWER;
      else if (/customer|who/i.test(question)) answer = CUSTOMERS_ANSWER;
      else answer = fallbackAnswer(state.revealed.length, sourceCount);

      const next: AgentOSState = { ...state, question: null, answer };
      let out = withLog(next, "ok", `✓ grounded answer · ${answer.sources.length} sources`);
      out = withLog(
        out,
        "dim",
        `sources: ${answer.sources.map((s) => `${s.kind} ${s.ref}`).join(" · ")}`,
      );
      return out;
    }

    case "openApproval":
      return { ...state, approvalOpen: true };

    case "closeApproval":
      return { ...state, approvalOpen: false };

    case "send": {
      let out: AgentOSState = { ...state, approvalOpen: false, sent: true };
      out = withLog(out, "ok", "✓ sent to sarah@acme.com");
      out = withLog(out, "dim", "audit: ani SEND email.draft.294 (approved)");
      return out;
    }

    case "connectAgent": {
      if (state.agents.some((a) => a.id === "qoder")) return state;
      let out = withLog(state, "cmd", "agent mcp start");
      out = withLog(out, "dim", "MCP server listening on stdio");
      out = withLog(out, "ok", `✓ Qoder connected — ${state.commands.length} tools exposed`);
      return { ...out, agents: [...state.agents, { id: "qoder", name: "Qoder", transport: "MCP · stdio" }] };
    }

    case "startConnector": {
      if (state.connectorStep !== null) return state;
      const out = withLog(state, "cmd", `agent generate connector ${CONNECTOR_SPEC.path}`);
      return { ...out, connectorStep: 0 };
    }

    case "connectorStep":
      return { ...state, connectorStep: action.step };

    case "finishConnector": {
      let out: AgentOSState = {
        ...state,
        connectorStep: CONNECTOR_DELAYS.length,
        generated: true,
        commands: [...state.commands, ...GENERATED_COMMANDS],
      };
      out = withLog(out, "ok", `✓ detected ${CONNECTOR_SPEC.endpoints} endpoints → ${CONNECTOR_SPEC.resources}`);
      out = withLog(out, "ok", `✓ generated ${GENERATED_COMMANDS.length} commands, connector, permission policies, tests`);
      out = withLog(out, "ok", "✓ validation passed");
      out = withLog(out, "dim", `new commands: ${GENERATED_COMMANDS.map((c) => c.name).join("  ")}`);
      if (out.agents.some((a) => a.id === "qoder"))
        out = withLog(out, "dim", `qoder: +${GENERATED_COMMANDS.length} tools available over MCP — no new credentials`);
      return out;
    }

    case "closeConnector":
      return { ...state, connectorStep: null };
  }
}

const SOURCE_DELAYS: Record<SourceState, number> = {
  detected: 600,
  authenticating: 900,
  syncing: 1500,
  connected: 900,
  indexed: 0,
};

const NEXT_STATE: Record<SourceState, SourceState | null> = {
  detected: "authenticating",
  authenticating: "syncing",
  syncing: "connected",
  connected: "indexed",
  indexed: null,
};

const CONNECTOR_DELAYS = [600, 800, 1100, 700];

export function useAgentOS() {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  useEffect(() => {
    for (const src of state.sources) {
      const next = NEXT_STATE[src.state];
      if (!next) continue;
      const timer = setTimeout(
        () => dispatch({ type: "sourceState", kind: src.kind, state: next }),
        SOURCE_DELAYS[src.state],
      );
      return () => clearTimeout(timer);
    }
    return;
  }, [state.sources]);

  useEffect(() => {
    if (!state.question) return;
    const timer = setTimeout(() => dispatch({ type: "resolveAnswer" }), 900);
    return () => clearTimeout(timer);
  }, [state.question]);

  useEffect(() => {
    if (state.connectorStep === null) return;
    const step = state.connectorStep;
    if (step < CONNECTOR_DELAYS.length) {
      const timer = setTimeout(
        () => dispatch({ type: "connectorStep", step: step + 1 }),
        CONNECTOR_DELAYS[step],
      );
      return () => clearTimeout(timer);
    }
    if (!state.generated) {
      const timer = setTimeout(() => dispatch({ type: "finishConnector" }), 500);
      return () => clearTimeout(timer);
    }
    return;
  }, [state.connectorStep, state.generated]);

  const run = useCallback((raw: string) => dispatch({ type: "run", raw }), []);
  const start = useCallback((kinds: SourceKind[]) => dispatch({ type: "start", kinds }), []);
  const connect = useCallback((kind: SourceKind) => dispatch({ type: "connect", kind }), []);

  return { state, run, start, connect, dispatch };
}
