import { ENTITIES, RELATIONS, SOURCE_DEFS } from "../data/demo";
import type { EntityKind, SourceKind } from "../data/demo";
import type { SourceRuntime } from "../lib/useAgentOS";
import { EntityIcon, SourceIcon } from "./Icons";

const CX = 400;
const CY = 320;
const R_SOURCE = 110;
const R_ENTITY = 235;

const SOURCE_ANGLE: Record<SourceKind, number> = {
  drive: -150,
  gmail: -30,
  calendar: 90,
};

const KIND_ORDER: EntityKind[] = ["customer", "person", "document", "email", "meeting"];

function polar(radius: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
}

/** Entities are laid out once, evenly around the ring, grouped by kind. */
const ENTITY_POS: Record<string, { x: number; y: number }> = (() => {
  const ordered: string[] = [];
  for (const kind of KIND_ORDER) {
    for (const entity of ENTITIES) if (entity.kind === kind) ordered.push(entity.id);
  }
  const step = 360 / ordered.length;
  const map: Record<string, { x: number; y: number }> = {};
  ordered.forEach((id, i) => {
    map[id] = polar(R_ENTITY, -90 + i * step);
  });
  return map;
})();

function shortLabel(value: string) {
  return value.length > 13 ? `${value.slice(0, 12)}…` : value;
}

interface GraphCanvasProps {
  sources: SourceRuntime[];
  revealed: string[];
  working: boolean;
}

export function GraphCanvas({ sources, revealed, working }: GraphCanvasProps) {
  const shown = new Set(revealed);
  const sourceByKind = new Map(sources.map((s) => [s.kind, s]));

  return (
    <div className="graph-wrap">
      <svg className="graph" viewBox="0 0 800 640" role="img" aria-label="Company business graph">
        {RELATIONS.map(([from, to]) => {
          const a = ENTITY_POS[from];
          const b = ENTITY_POS[to];
          const visible = shown.has(from) && shown.has(to);
          return (
            <line
              key={`rel-${from}-${to}`}
              className={`graph__edge graph__edge--relation${visible ? "" : " graph__edge--hidden"}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
            />
          );
        })}

        {ENTITIES.map((entity) => {
          const p = ENTITY_POS[entity.id];
          const visible = shown.has(entity.id);
          return (
            <line
              key={`spoke-${entity.id}`}
              className={`graph__edge graph__edge--spoke${visible ? "" : " graph__edge--hidden"}`}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
            />
          );
        })}

        {SOURCE_DEFS.map((def) => {
          const src = sourceByKind.get(def.kind);
          if (!src) return null;
          const p = polar(R_SOURCE, SOURCE_ANGLE[def.kind]);
          const flowing = src.state !== "indexed";
          return (
            <line
              key={`flow-${def.kind}`}
              className={`graph__edge${flowing ? " graph__edge--flow" : ""}`}
              x1={p.x}
              y1={p.y}
              x2={CX}
              y2={CY}
            />
          );
        })}

        <g>
          {working && <circle className="brain__ring brain__ring--pulse" cx={CX} cy={CY} r={40} />}
          <circle className="graph__center-halo" cx={CX} cy={CY} r={40} />
          <circle className="graph__center-ring" cx={CX} cy={CY} r={26} />
          <circle className="graph__center-core" cx={CX} cy={CY} r={12} />
          <text className="graph__center-label" x={CX} y={CY + 60}>
            business graph
          </text>
        </g>

        {SOURCE_DEFS.map((def) => {
          const src = sourceByKind.get(def.kind);
          if (!src) return null;
          const p = polar(R_SOURCE, SOURCE_ANGLE[def.kind]);
          const indexed = src.state === "indexed";
          return (
            <g
              key={`src-${def.kind}`}
              className={`graph__source${indexed ? " graph__source--indexed" : ""}`}
              transform={`translate(${p.x} ${p.y})`}
            >
              <circle className="graph__source-bg" r={22} />
              <g transform="translate(-9 -9)">
                <SourceIcon kind={def.kind} size={18} />
              </g>
              <text className="graph__node-label" y={40}>
                {def.label.replace("Google ", "")}
              </text>
            </g>
          );
        })}

        {ENTITIES.map((entity) => {
          const p = ENTITY_POS[entity.id];
          const visible = shown.has(entity.id);
          const customer = entity.kind === "customer";
          const r = customer ? 26 : 18;
          const icon = customer ? 16 : 13;
          return (
            <g key={entity.id} transform={`translate(${p.x} ${p.y})`}>
              <g className={`graph__node graph__node--${entity.kind}${visible ? "" : " graph__node--hidden"}`}>
                <circle className="graph__node-circle" r={r} />
                <g transform={`translate(${-icon / 2} ${-icon / 2})`}>
                  <EntityIcon kind={entity.kind} size={icon} />
                </g>
                <text className="graph__node-label" y={r + 15}>
                  {shortLabel(entity.label)}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {sources.length === 0 && (
        <div className="graph__empty">
          Connect a source to build your company graph. Entities appear as each system is indexed.
        </div>
      )}

      <div className="graph__legend" aria-hidden>
        <span className="graph__legend-item">
          <span className="graph__legend-swatch graph__legend-swatch--customer" />
          customer
        </span>
        <span className="graph__legend-item">
          <span className="graph__legend-swatch" />
          entity
        </span>
        <span className="graph__legend-item">
          <span className="graph__legend-swatch graph__legend-swatch--flow" />
          live sync
        </span>
      </div>
    </div>
  );
}
