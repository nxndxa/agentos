import { useCallback, useState, useSyncExternalStore } from "react";
import { ENTITIES } from "../data/demo";
import type { useAgentOS } from "../lib/useAgentOS";
import { GitHubIcon } from "./Icons";
import { Sidebar } from "./Sidebar";
import { GraphCanvas } from "./GraphCanvas";
import { ConsolePanel } from "./ConsolePanel";
import { ApprovalDialog } from "./ApprovalDialog";
import { ConnectorDialog } from "./ConnectorDialog";

type MobileView = "graph" | "sources" | "console";

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

const TABS: Array<{ id: MobileView; label: string }> = [
  { id: "graph", label: "Graph" },
  { id: "sources", label: "Sources" },
  { id: "console", label: "Console" },
];

export function Workspace({ agentos }: { agentos: ReturnType<typeof useAgentOS> }) {
  const { state, run, connect, dispatch } = agentos;
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const [view, setView] = useState<MobileView>("graph");

  const indexed = state.sources.filter((s) => s.state === "indexed").length;
  const working = state.sources.some((s) => s.state !== "indexed");
  const hide = (id: MobileView) => isMobile && view !== id;

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <img className="brand__mark" src="/favicon.svg" alt="" width={24} height={24} />
          <span className="brand__name">AgentOS</span>
          <span className="brand__tag">one company · one cli · any agent</span>
        </div>

        <div className="header__status">
          <span>{state.revealed.length}/{ENTITIES.length} entities</span>
          <span>{indexed}/{state.sources.length} sources</span>
          <span>{state.commands.length} commands</span>
        </div>

        <div className="header__actions">
          <a
            className="btn btn--ghost btn--sm"
            href="https://github.com/nxndxa/agentos"
            target="_blank"
            rel="noreferrer"
          >
            <GitHubIcon size={16} />
            Source
          </a>
        </div>
      </header>

      <div className="workspace">
        <div className="mobile-tabs" role="tablist" aria-label="Workspace views">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={view === tab.id}
              className={`mobile-tab${view === tab.id ? " mobile-tab--active" : ""}`}
              onClick={() => setView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Sidebar
          sources={state.sources}
          commands={state.commands}
          agents={state.agents}
          generated={state.generated}
          busy={working}
          onConnect={connect}
          onConnectAgent={() => dispatch({ type: "connectAgent" })}
          onGenerate={() => dispatch({ type: "startConnector" })}
          hidden={hide("sources")}
        />

        <div className="workspace__canvas" hidden={hide("graph")}>
          <GraphCanvas sources={state.sources} revealed={state.revealed} working={working} />
        </div>

        <ConsolePanel
          log={state.log}
          question={state.question}
          answer={state.answer}
          draftId={state.draftId}
          generated={state.generated}
          canAsk={state.revealed.length > 0}
          hidden={hide("console")}
          onRun={run}
        />
      </div>

      {state.approvalOpen && (
        <ApprovalDialog
          onClose={() => dispatch({ type: "closeApproval" })}
          onConfirm={() => dispatch({ type: "send" })}
        />
      )}

      {state.connectorStep !== null && (
        <ConnectorDialog
          step={state.connectorStep}
          onClose={() => dispatch({ type: "closeConnector" })}
          onRunScorecard={() => {
            dispatch({ type: "closeConnector" });
            run("agent driver john scorecard");
          }}
        />
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {working ? "Connecting sources and building the business graph." : "Business graph ready."}
      </span>
    </div>
  );
}
