import type { Answer } from "../data/demo";

interface AnswerCardProps {
  answer: Answer | null;
  pending: boolean;
}

export function AnswerCard({ answer, pending }: AnswerCardProps) {
  if (pending) {
    return (
      <div className="answer" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Resolving entities and traversing the business graph…</span>
        <div className="skeleton" style={{ width: "62%", height: 14 }} />
        <div className="answer__points">
          <div className="skeleton" style={{ width: "92%" }} />
          <div className="skeleton" style={{ width: "78%" }} />
          <div className="skeleton" style={{ width: "84%" }} />
        </div>
        <div className="answer__sources">
          <div className="skeleton" style={{ width: 116, height: 20 }} />
          <div className="skeleton" style={{ width: 92, height: 20 }} />
        </div>
      </div>
    );
  }

  if (!answer) return null;

  return (
    <div className="answer">
      <div className="answer__title">{answer.title}</div>
      <div className="answer__points">
        {answer.points.map((point, i) => (
          <div className="answer__point" key={i}>
            <span className="answer__point-index">{i + 1}</span>
            <span>{point}</span>
          </div>
        ))}
      </div>
      <div className="answer__sources">
        {answer.sources.map((source, i) => (
          <span className="answer__source" key={i}>
            <span className="answer__source-kind">{source.kind}</span>
            {source.ref}
          </span>
        ))}
      </div>
    </div>
  );
}
