/**
 * The mark IS the product's core unit: the four proof rows — identity,
 * liveness, authority, work — as four bars, three filled along the proof ramp
 * and the fourth left open. Every agent in Assay renders exactly this shape,
 * so the logo is the same object the ledger is made of, not an ornament beside
 * it. A competitor cannot take it without also taking the four-row idea.
 */
export function LogoMark({ size = 20 }: { size?: number }) {
  const bars = [
    { x: 0, h: 20, fill: "var(--score-4)" },
    { x: 6, h: 20, fill: "var(--score-3)" },
    { x: 12, h: 20, fill: "var(--score-2)" },
    { x: 18, h: 20, fill: "none" },
  ];
  return (
    <svg
      width={size} height={size} viewBox="0 0 22 20" fill="none"
      aria-hidden focusable="false" className="shrink-0 overflow-visible"
    >
      {bars.map((b) => (
        <rect
          key={b.x}
          x={b.x} y={0} width={3} height={b.h} rx={1.5}
          fill={b.fill}
          stroke={b.fill === "none" ? "var(--line-strong)" : "none"}
          strokeWidth={b.fill === "none" ? 1 : 0}
        />
      ))}
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className="text-[14px] font-semibold tracking-[-0.02em]">Assay</span>
    </span>
  );
}
