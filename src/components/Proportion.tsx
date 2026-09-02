export interface Band {
  n: number;
  label: string;
  tone: "neutral" | "refuted" | "proven";
}

const TONE: Record<Band["tone"], string> = {
  neutral: "bg-fg-faint",
  refuted: "bg-refuted",
  proven: "bg-proven",
};

/**
 * The argument is a ratio, so it is drawn as one: each bar spans its true share
 * of the registry. "Answered when called" lands at 0.4% — a sliver you have to
 * look for, which is the finding rather than a rendering fault.
 */
export function Proportion({ bands, total }: { bands: Band[]; total: number }) {
  return (
    <ul className="space-y-4">
      {bands.map((b, i) => {
        const share = total > 0 ? b.n / total : 0;
        return (
          <li key={b.label}>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-[12.5px] text-fg-secondary">{b.label}</span>
              <span className="text-[12.5px] tnum text-fg-faint">
                {share >= 0.01 ? `${(share * 100).toFixed(1)}%` : `${(share * 100).toFixed(2)}%`}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-bg-sunk overflow-hidden">
              <div
                className={`h-full rounded-full draw ${TONE[b.tone]}`}
                style={{
                  width: `max(3px, ${(share * 100).toFixed(3)}%)`,
                  animationDelay: `${120 + i * 170}ms`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
