export type BrainState = "idle" | "listening" | "working" | "ready";

const CENTER = 80;
const ORBIT = 52;
const SATELLITES = 6;

export function Brain({ size = 160, state = "idle" }: { size?: number; state?: BrainState }) {
  const points = Array.from({ length: SATELLITES }, (_, i) => {
    const angle = (i / SATELLITES) * Math.PI * 2 - Math.PI / 2;
    return {
      x: CENTER + ORBIT * Math.cos(angle),
      y: CENTER + ORBIT * Math.sin(angle),
    };
  });

  return (
    <svg
      className={`brain brain--${state}`}
      width={size}
      height={size}
      viewBox="0 0 160 160"
      role="img"
      aria-label="AgentOS company brain"
    >
      <circle className="brain__halo" cx={CENTER} cy={CENTER} r={46} />
      <circle className="brain__ring brain__ring--pulse" cx={CENTER} cy={CENTER} r={46} />
      <circle className="brain__ring" cx={CENTER} cy={CENTER} r={ORBIT} />
      <circle className="brain__ring" cx={CENTER} cy={CENTER} r={30} />
      {points.map((p, i) => (
        <circle
          key={i}
          className="graph__node-circle"
          cx={p.x}
          cy={p.y}
          r={4}
        />
      ))}
      <circle className="brain__core" cx={CENTER} cy={CENTER} r={11} />
    </svg>
  );
}
