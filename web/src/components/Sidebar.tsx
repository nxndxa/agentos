import { ENTITIES, SOURCE_DEFS } from "../data/demo";
import type { CommandDef, SourceKind } from "../data/demo";
import type { AgentConn, SourceRuntime } from "../lib/useAgentOS";
import { CpuIcon, PlusIcon, PlugIcon, SourceIcon } from "./Icons";
import { Button, Pill } from "./ui";

const STATE_LABEL: Record<string, string> = {
  detected: "detected",
  authenticating: "authorizing…",
  syncing: "syncing…",
  connected: "connected",
  indexed: "indexed",
};

const STATE_PROGRESS: Record<string, number> = {
  detected: 15,
  authenticating: 40,
  syncing: 70,
  connected: 90,
  indexed: 100,
};

function entityCount(kind: SourceKind) {
  return ENTITIES.filter((e) => e.from === kind).length;
}

interface SidebarProps {
  sources: SourceRuntime[];
  commands: CommandDef[];
  agents: AgentConn[];
  generated: boolean;
  busy: boolean;
  hidden?: boolean;
  onConnect: (kind: SourceKind) => void;
  onConnectAgent: () => void;
  onGenerate: () => void;
}

export function Sidebar({
  sources,
  commands,
  agents,
  generated,
  busy,
  hidden,
  onConnect,
  onConnectAgent,
  onGenerate,
}: SidebarProps) {
  const connected = new Set(sources.map((s) => s.kind));
  const indexed = sources.filter((s) => s.state === "indexed").length;
  const remaining = SOURCE_DEFS.filter((d) => !connected.has(d.kind));
  const qoderConnected = agents.some((a) => a.id === "qoder");

  return (
    <aside className="workspace__sidebar" hidden={hidden}>
      <section className="panel">
        <div className="panel__head">
          <span className="panel__title">Sources</span>
          <Pill tone={indexed === sources.length && sources.length > 0 ? "success" : "muted"}>
            {indexed}/{sources.length} indexed
          </Pill>
        </div>
        <div className="panel__body">
          <div className="source-list">
            {sources.map((src) => {
              const def = SOURCE_DEFS.find((d) => d.kind === src.kind)!;
              const done = src.state === "indexed";
              return (
                <div
                  key={src.kind}
                  className={`source-row${done ? " source-row--indexed" : " source-row--active"}`}
                >
                  <span className="source-row__icon">
                    <SourceIcon kind={src.kind} size={18} />
                  </span>
                  <span className="source-row__meta">
                    <span className="source-row__name">{def.label}</span>
                    <span className="source-row__detail">
                      {done ? `indexed · ${entityCount(src.kind)} entities` : STATE_LABEL[src.state]}
                    </span>
                    {!done && (
                      <span className="source-row__bar">
                        <span
                          className="source-row__bar-fill"
                          style={{ width: `${STATE_PROGRESS[src.state]}%` }}
                        />
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {remaining.length > 0 && (
            <div className="connect-list" style={{ marginTop: "var(--space-3)" }}>
              {remaining.map((def) => (
                <button
                  key={def.kind}
                  type="button"
                  className="connect-row"
                  onClick={() => onConnect(def.kind)}
                  disabled={busy}
                >
                  <span className="connect-row__left">
                    <PlusIcon size={16} />
                    {def.label}
                  </span>
                  <span className="cap-row__perm">connect</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <span className="panel__title">Capabilities</span>
          <Pill tone="muted">{commands.length}</Pill>
        </div>
        <div className="panel__body">
          <div className="cap-list">
            {commands.map((cmd) => (
              <div
                key={cmd.name}
                className={`cap-row${cmd.from === "generated" ? " cap-row--new" : ""}`}
                title={cmd.description}
              >
                <span>{cmd.name}</span>
                <span className="cap-row__perm">{cmd.permission}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <span className="panel__title">Agents</span>
          {qoderConnected && <Pill tone="success">live</Pill>}
        </div>
        <div className="panel__body">
          {agents.length > 0 ? (
            <div className="agent-list">
              {agents.map((agent) => (
                <div key={agent.id} className="agent-row">
                  <span className="agent-row__dot" />
                  <span className="agent-row__meta">
                    <span className="agent-row__name">{agent.name}</span>
                    <span className="agent-row__detail">{agent.transport}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-note">
              No agent attached. Expose the company over MCP so any agent can use it.
            </p>
          )}

          <div className="connect-list" style={{ marginTop: "var(--space-3)" }}>
            <Button
              variant="ghost"
              block
              icon={<CpuIcon size={16} />}
              onClick={onConnectAgent}
              disabled={qoderConnected}
            >
              {qoderConnected ? "Qoder connected" : "Connect Qoder (MCP)"}
            </Button>
            <Button
              variant={generated ? "ghost" : "subtle"}
              block
              icon={<PlugIcon size={16} />}
              onClick={onGenerate}
              disabled={generated || busy}
            >
              {generated ? "Connector generated" : "Generate connector"}
            </Button>
          </div>
        </div>
      </section>
    </aside>
  );
}
