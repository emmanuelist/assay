import type { AgentSummary } from "@/lib/db/queries";

export type MarkState = "proven" | "absent" | "refuted" | "unexamined";

const TITLES: Record<MarkState, string> = {
  proven: "proven",
  absent: "looked, found nothing",
  refuted: "looked, it failed",
  unexamined: "not yet examined",
};

const CLS: Record<MarkState, string> = {
  proven: "bg-proven",
  refuted: "bg-refuted",
  absent: "bg-transparent border border-line-strong",
  unexamined: "bg-unexamined/40",
};

/** 0–4 rows proven, mapped onto the proof ramp. */
export const SCORE_COLOR = [
  "var(--score-0)", "var(--score-1)", "var(--score-2)",
  "var(--score-3)", "var(--score-4)",
] as const;

export function scoreOf(a: AgentSummary): number {
  return marksFor(a).filter((m) => m.state === "proven").length;
}

export function marksFor(a: AgentSummary): { label: string; state: MarkState }[] {
  const liveness: MarkState =
    a.liveness.state === "live" ? "proven"
    : a.liveness.state === "dead" ? "refuted"
    : a.liveness.state === "unprobed" ? "unexamined"
    : "absent";
  return [
    { label: "Identity", state: a.owner ? "proven" : "absent" },
    { label: "Liveness", state: liveness },
    { label: "Authority", state: "absent" },
    { label: "Work", state: a.clientCount === null ? "unexamined" : a.clientCount > 0 ? "proven" : "absent" },
  ];
}

/** The Assay's four rows compressed, so one proof vocabulary survives into a 329k-row ledger. */
export function ProofMarks({ agent }: { agent: AgentSummary }) {
  const marks = marksFor(agent);
  const proven = marks.filter((m) => m.state === "proven").length;
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`${proven} of 4 proven`}>
      {marks.map((m) => (
        <span
          key={m.label}
          className={`block h-4 w-[3px] rounded-full ${CLS[m.state]}`}
          style={m.state === "proven" ? { background: SCORE_COLOR[proven] } : undefined}
          title={`${m.label}: ${TITLES[m.state]}`}
        />
      ))}
    </span>
  );
}

export function ProofLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]">
      {[
        ["Identity", "who it says it is"],
        ["Liveness", "does it answer"],
        ["Authority", "what it may spend"],
        ["Work", "has anyone used it"],
      ].map(([l, q], i) => (
        <span key={l} className="flex items-baseline gap-1.5">
          <span className="text-fg-faint tnum">{i + 1}</span>
          <span className="text-fg-secondary">{l}</span>
          <span className="text-fg-faint">— {q}</span>
        </span>
      ))}
    </div>
  );
}
