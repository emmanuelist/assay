import Link from "next/link";
import type { AgentSummary } from "@/lib/db/queries";
import { ProofMarks } from "./ProofMarks";
import { BAND_CLASS, BAND_NOTE, bandFor } from "@/lib/latency";

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function LivenessCell({ agent }: { agent: AgentSummary }) {
  const l = agent.liveness;
  switch (l.state) {
    case "live": {
      const band = bandFor(l.latencyMs);
      return (
        <span className={`${BAND_CLASS[band]} tnum`} title={BAND_NOTE[band]}>
          {l.latencyMs.toLocaleString()}ms
        </span>
      );
    }
    case "dead":
      return <span className="text-refuted">{l.error.replace(/^HTTP /, "")}</span>;
    case "unprobed":
      return <span className="text-fg-faint">—</span>;
    case "no-endpoint":
      return <span className="text-fg-faint">no endpoint</span>;
  }
}

/**
 * The browse surface is a ledger, not a card grid. 329,000 rows of mostly-empty
 * evidence is a document problem, not a gallery problem — and a card grid would
 * give 24 near-identical blanks equal visual weight while hiding the scale.
 */
export function AgentLedger({ agents }: { agents: AgentSummary[] }) {
  if (agents.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-[15px] font-medium">Nothing matched.</p>
        <p className="mx-auto mt-2 max-w-[44ch] text-[13.5px] leading-relaxed text-fg-secondary">
          Either the index is empty, or every agent was filtered out. Of{" "}
          <span className="tnum">329,449</span> registrations only{" "}
          <span className="tnum">1,240</span> answer when called, so narrow filters return
          nothing more often than you would expect.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table id="ledger" className="w-full min-w-[52rem] text-[13px] border-collapse">
        <thead>
          <tr className="border-b border-line-strong text-left">
            {[
              ["Proof", "w-[4.5rem]"],
              ["Agent", ""],
              ["Used by", "w-[6rem]"],
              ["Copies", "w-[6rem]"],
              ["Answers in", "w-[7rem]"],
              ["Owner", "w-[8rem]"],
            ].map(([h, w]) => (
              <th
                key={h}
                className={`${w} px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-fg-faint`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.map((a) => (
            <tr
              key={a.id.toString()}
              className="border-b border-line hover:bg-surface-hover transition-colors"
            >
              <td className="px-3 py-2.5 align-middle">
                <ProofMarks agent={a} />
              </td>

              <td className="px-3 py-2.5 min-w-0">
                <Link
                  href={`/agent/${a.id}`}
                  className="group flex items-baseline gap-2 min-w-0 focus-visible:underline"
                >
                  <span className="font-mono text-[11px] text-fg-faint tnum shrink-0">
                    #{a.id.toString()}
                  </span>
                  <span className="truncate group-hover:underline underline-offset-2 [overflow-wrap:anywhere]">
                    {a.name ?? <span className="text-fg-faint italic">unnamed</span>}
                  </span>
                </Link>
                {a.description && (
                  <p className="mt-0.5 pl-[3.4rem] text-[11.5px] leading-snug text-fg-faint truncate max-w-[46ch]">
                    {a.description}
                  </p>
                )}
              </td>

              <td className="px-3 py-2.5 align-middle">
                {a.clientCount === null ? (
                  <span className="text-fg-faint" title="not yet read">—</span>
                ) : a.clientCount > 0 ? (
                  <span className="tnum text-proven" title={`${a.clientCount} on-chain clients`}>
                    {a.clientCount.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-fg-faint" title="no client has ever rated it">none</span>
                )}
              </td>

              <td className="px-3 py-2.5 align-middle">
                {a.clusterSize > 1 ? (
                  <span className="tnum text-refuted" title={`${a.clusterSize} identical registrations`}>
                    {a.clusterSize.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-fg-faint">unique</span>
                )}
              </td>

              <td className="px-3 py-2.5 align-middle">
                <LivenessCell agent={a} />
              </td>

              <td className="px-3 py-2.5 align-middle font-mono text-[11px] text-fg-muted">
                {a.owner ? shortAddr(a.owner) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
