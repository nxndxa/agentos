import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Answer } from "../data/demo";
import type { LogLine } from "../lib/useAgentOS";
import { SendIcon } from "./Icons";
import { Button } from "./ui";
import { AnswerCard } from "./AnswerCard";

interface ConsolePanelProps {
  log: LogLine[];
  question: string | null;
  answer: Answer | null;
  draftId: string | null;
  generated: boolean;
  canAsk: boolean;
  hidden?: boolean;
  onRun: (raw: string) => void;
}

export function ConsolePanel({
  log,
  question,
  answer,
  draftId,
  generated,
  canAsk,
  hidden,
  onRun,
}: ConsolePanelProps) {
  const [value, setValue] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length, answer, question, hidden]);

  const examples = useMemo(() => {
    if (!canAsk) return ["agent connect Gmail", "agent help"];
    const base = [
      'agent ask "What happened with Acme this week?"',
      "agent customers",
      "agent customer acme",
      "agent email draft acme",
    ];
    if (draftId) base.push("agent email send draft-294");
    if (generated) base.push("agent driver john scorecard");
    return base;
  }, [canAsk, draftId, generated]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const raw = value.trim();
    if (!raw) return;
    onRun(raw);
    setValue("");
  };

  return (
    <section className="panel console workspace__console" hidden={hidden}>
      <div className="panel__head">
        <span className="panel__title">Console</span>
        <span className="panel__title" style={{ color: "var(--text-dim)" }}>
          agent
        </span>
      </div>

      <div className="console__log" ref={logRef}>
        {log.length === 0 ? (
          <p className="console__empty">Run a command to operate the company.</p>
        ) : (
          log.map((line) => (
            <div key={line.id} className={`line line--${line.kind}`}>
              {line.text}
            </div>
          ))
        )}
      </div>

      {(question || answer) && (
        <div className="console__answer">
          <AnswerCard answer={answer} pending={question !== null} />
        </div>
      )}

      <div className="console__examples">
        {examples.map((example) => (
          <button key={example} type="button" className="example-btn" onClick={() => onRun(example)}>
            {example}
          </button>
        ))}
      </div>

      <form className="console__form" onSubmit={submit}>
        <input
          className="console__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='agent ask "…"'
          aria-label="Agent command"
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" variant="primary" icon={<SendIcon size={16} />} disabled={!value.trim()}>
          Run
        </Button>
      </form>
    </section>
  );
}
