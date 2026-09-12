import { CONNECTOR_SPEC, GENERATED_COMMANDS } from "../data/demo";
import { CheckIcon, PlugIcon } from "./Icons";
import { Modal } from "./Modal";
import { Button } from "./ui";

const STEPS = [
  { label: "Parse OpenAPI spec", detail: CONNECTOR_SPEC.path },
  {
    label: "Detect resources & endpoints",
    detail: `${CONNECTOR_SPEC.endpoints} endpoints → ${CONNECTOR_SPEC.resources}`,
  },
  {
    label: "Generate commands, connector & policies",
    detail: `${GENERATED_COMMANDS.length} commands · read / write / execute`,
  },
  { label: "Validate & run tests", detail: "permission policies · contract tests" },
];

interface ConnectorDialogProps {
  step: number;
  onClose: () => void;
  onRunScorecard: () => void;
}

export function ConnectorDialog({ step, onClose, onRunScorecard }: ConnectorDialogProps) {
  const done = step >= STEPS.length;

  return (
    <Modal labelledBy="connector-title" describedBy="connector-sub" onClose={onClose}>
      <div className="dialog__head">
        <span className="dialog__icon dialog__icon--accent">
          <PlugIcon size={20} />
        </span>
        <div>
          <h2 className="dialog__title" id="connector-title">
            Generate connector
          </h2>
          <p className="dialog__sub" id="connector-sub">
            <code>agent generate connector {CONNECTOR_SPEC.path}</code> — turn an API AgentOS has
            never seen into agent-operable commands.
          </p>
        </div>
      </div>

      <div className="dialog__body">
        <div className="gen-steps">
          {STEPS.map((s, i) => {
            const state = i < step ? "done" : i === step ? "active" : "pending";
            return (
              <div key={s.label} className={`gen-step gen-step--${state}`}>
                <span className="gen-step__mark">
                  {state === "done" ? <CheckIcon size={12} /> : i + 1}
                </span>
                <span className="gen-step__text">
                  <span className="gen-step__label">{s.label}</span>
                  <span className="gen-step__detail">{s.detail}</span>
                </span>
              </div>
            );
          })}
        </div>

        {done && (
          <div className="field-block">
            <span className="field-block__label">New commands · available to every agent</span>
            <span className="field-block__value field-block__value--mono">
              {GENERATED_COMMANDS.map((c) => c.name).join("\n")}
            </span>
          </div>
        )}
      </div>

      <div className="dialog__actions">
        {done ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" onClick={onRunScorecard}>
              Run agent driver john scorecard
            </Button>
          </>
        ) : (
          <span className="dialog__sub">Generating…</span>
        )}
      </div>
    </Modal>
  );
}
