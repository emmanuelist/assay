import Link from "next/link";
import { AgentLedger } from "@/components/AgentLedger";
import { ProofLegend } from "@/components/ProofMarks";
import { biggestClusters, listAgents, registryStats } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const pct = (n: number, d: number) =>
  d === 0 ? "0" : ((n / d) * 100).toFixed(n / d < 0.01 ? 2 : 1);

export default async function Home() {
  const [stats, agents, clusters] = await Promise.all([
    registryStats(),
    listAgents({ sort: "provable", collapse: true, limit: 40 }),
    biggestClusters(5),
  ]);

  return (
    <main className="min-h-screen pt-20">
      <div className="mx-auto max-w-[78rem] px-4 sm:px-6">
        <header className="pt-8 pb-7">
          <Link
            href="/"
            className="text-[13px] text-fg-muted hover:text-fg transition-colors"
          >
            ← Assay
          </Link>
          <h1 className="mt-5 text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-[-0.03em] leading-[1.08]">
            The ledger
          </h1>
          <p className="mt-4 max-w-[64ch] text-[14.5px] leading-relaxed text-fg-secondary">
            Every registration on the BNB Chain agent registry, with duplicates collapsed and
            ranked by what each one can demonstrate. {stats.registered.toLocaleString()} read,{" "}
            {stats.live.toLocaleString()} answered when called.
          </p>
        </header>

        <p className="py-3 text-[12.5px] text-fg-muted">
          <span className="tnum">{stats.withEndpoint.toLocaleString()}</span> declare a callable
          endpoint ({pct(stats.withEndpoint, stats.registered)}%) ·{" "}
          <span className="tnum">{stats.rated.toLocaleString()}</span> have ever been rated on
          chain ({pct(stats.rated, stats.registered)}%)
          {stats.indexedAt && (
            <>
              {" "}· indexed{" "}
              {new Date(stats.indexedAt).toISOString().replace("T", " ").slice(0, 16)} UTC
            </>
          )}
        </p>

        {clusters.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] border-b border-line-strong pb-2.5">
              What is actually in there
            </h2>
            <p className="mt-3 mb-4 max-w-[62ch] text-[13.5px] leading-relaxed text-fg-secondary">
              These are the largest groups of registrations sharing an identical name and
              description — the same agent, registered over and over. Any marketplace that
              ranks this registry by recency or id shows you this, repeatedly.
            </p>
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden">
              {clusters.map((c) => (
                <li key={c.dedupKey} className="flex items-baseline gap-4 px-4 py-3">
                  <span className="tnum text-[18px] font-semibold text-refuted w-[5.5rem] shrink-0 text-right">
                    {c.size.toLocaleString()}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] truncate [overflow-wrap:anywhere]">
                      {c.name ?? <span className="text-fg-faint italic">unnamed</span>}
                    </span>
                    <span className="block text-[12px] text-fg-faint truncate max-w-[54ch]">
                      {c.description ?? "no description"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="pt-10 pb-16">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line-strong pb-2.5">
            <h2 className="text-[18px] font-semibold tracking-[-0.02em]">Ranked by what they can prove</h2>
            <p className="text-[11.5px] text-fg-faint">
              duplicates collapsed · {agents.length} shown
            </p>
          </div>
          <div className="py-3">
            <ProofLegend />
          </div>
          <AgentLedger agents={agents} />
        </section>
      </div>
    </main>
  );
}
