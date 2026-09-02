import Link from "next/link";
import { Assay } from "@/components/Assay";
import { Proportion, type Band } from "@/components/Proportion";
import { Stat } from "@/components/Stat";
import {
  biggestClusters, categoryCounts, featuredAgent, methodCounts, registryStats,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/** One hue per proof row, reused wherever that row is named. */
const HUES = [
  "var(--cat-grid)", "var(--cat-rebalance)", "var(--cat-health)", "var(--cat-yield)",
] as const;

export default async function Home() {
  const [stats, clusters, featured, method, cats] = await Promise.all([
    registryStats(), biggestClusters(5), featuredAgent(), methodCounts(), categoryCounts(),
  ]);

  const bands: Band[] = [
    { n: stats.registered, label: "Registered", tone: "neutral" },
    { n: stats.distinct, label: "Distinct after collapsing duplicates", tone: "refuted" },
    { n: stats.live, label: "Answered when called", tone: "proven" },
  ];
  const biggest = clusters[0];

  return (
    <main className="min-h-screen pt-24 pb-24">
      <div className="mx-auto max-w-[78rem] px-4 sm:px-6">

        {/* ── Hero ───────────────────────────────────────────────── */}
        <section id="claim" className="field pt-8 sm:pt-16 pb-14">
          <h1 className="rise max-w-[17ch] text-[clamp(2.4rem,7vw,4.75rem)] font-semibold
                         leading-[1.02] tracking-[-0.04em]">
            An agent earns its place by what it can prove.
          </h1>
          <p className="rise mt-7 max-w-[62ch] text-[15.5px] leading-relaxed text-fg-secondary"
             style={{ animationDelay: "80ms" }}>
            BNB Chain&apos;s agent registry holds{" "}
            <span className="text-fg font-medium tnum">{stats.registered.toLocaleString()}</span>{" "}
            registered agents. Assay called every endpoint they declare and read every on-chain
            rating, then ranked them by what they could actually demonstrate.
          </p>
          <div className="rise mt-9 flex flex-wrap items-center gap-3"
               style={{ animationDelay: "150ms" }}>
            <Link
              href="/ledger"
              className="rounded-full bg-fg text-bg px-5 py-2.5 text-[14px] font-medium
                         hover:opacity-90 transition-opacity"
            >
              Open the ledger
            </Link>
            <Link
              href="#method"
              className="rounded-full border border-line-strong px-5 py-2.5 text-[14px]
                         text-fg-secondary hover:text-fg hover:bg-surface-hover transition-colors"
            >
              How we measured it
            </Link>
          </div>
        </section>

        {/* ── Bento: the finding ─────────────────────────────────── */}
        <section id="finding" className="bento">
          <div className="cell cell-proven lg:col-span-2 lg:row-span-2 flex flex-col justify-between gap-10">
            <Stat
              n={stats.live}
              label="Agents answered when we called"
              note="We fetched the endpoint each agent publishes for itself. This is the entire population that demonstrably works."
              tone="proven"
              size="lg"
            />
            <Proportion bands={bands} total={stats.registered} />
          </div>

          <div className="cell">
            <Stat n={stats.registered} label="Registered"
                  note="Token ids minted on the ERC-8004 registry." />
          </div>

          <div className="cell cell-refuted">
            <Stat n={stats.distinct} label="Distinct" tone="refuted"
                  note="What remains once identical name and description collapse to one." />
          </div>

          <div className="cell cell-accent lg:col-span-2">
            <Stat n={stats.withEndpoint} label="Declare a callable endpoint"
                  note={`Only ${((stats.withEndpoint / stats.registered) * 100).toFixed(1)}% of the registry offers any way to reach it.`} />
          </div>
        </section>

        {/* ── The four categories, at equal depth ─────────────────── */}
        <section id="categories" className="mt-4 bento">
          {cats.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.id}`}
              className="cell group relative hover:bg-surface-hover"
            >
              <span
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: c.hue }}
                aria-hidden
              />
              <p
                className="text-[clamp(1.6rem,3vw,2.15rem)] font-semibold tracking-[-0.03em] tnum leading-none"
                style={{ color: c.hue }}
              >
                {c.total.toLocaleString()}
              </p>
              <p className="mt-3 text-[13.5px] font-medium group-hover:underline underline-offset-2">
                {c.label}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">{c.blurb}</p>
              <p className="mt-3 text-[12px] text-fg-faint tnum">
                {c.withEndpoint.toLocaleString()} callable ·{" "}
                <span className="text-proven">{c.live.toLocaleString()} answered</span>
              </p>
            </Link>
          ))}
        </section>

        {/* ── Bento: the landfill ────────────────────────────────── */}
        <section id="landfill" className="mt-4 bento">
          <div className="cell cell-refuted lg:col-span-2 flex flex-col justify-center">
            <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-semibold tracking-[-0.03em] leading-tight">
              One agent is registered{" "}
              <span className="text-refuted tnum">
                {biggest ? biggest.size.toLocaleString() : "many"}
              </span>{" "}
              times.
            </h2>
            <p className="mt-4 text-[13.5px] leading-relaxed text-fg-secondary max-w-[46ch]">
              These are the largest groups sharing an identical name and description. Rank this
              registry by recency or id — the way a directory does — and this is what fills your
              first thousand results.
            </p>
          </div>

          <div className="cell lg:col-span-2 p-0">
            <ul className="divide-y divide-line h-full">
              {clusters.map((c) => (
                <li key={c.dedupKey}>
                  <Link
                    href={`/agent/${c.representativeId}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-surface-hover transition-colors"
                  >
                    <span className="tnum text-[15px] font-semibold text-refuted w-[4.5rem] shrink-0 text-right">
                      {c.size.toLocaleString()}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] truncate [overflow-wrap:anywhere]">
                        {c.name ?? <span className="text-fg-faint italic">unnamed</span>}
                      </span>
                      <span className="block text-[12px] text-fg-faint truncate">
                        {c.description ?? "no description"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── The instrument ─────────────────────────────────────── */}
        <section id="instrument" className="mt-20">
          <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-semibold tracking-[-0.03em] max-w-[22ch]">
            Four questions, asked of every agent.
          </h2>
          <p className="mt-4 max-w-[58ch] text-[14px] leading-relaxed text-fg-secondary">
            Each is either answered with evidence or left blank. Most agents leave most of it
            blank. Below is a real one, assayed live.
          </p>

          <div className="mt-9 grid lg:grid-cols-[minmax(0,23rem)_1fr] gap-6 lg:gap-10 items-start">
            {featured ? <Assay agent={featured} /> : (
              <p className="text-[13px] text-fg-muted">No live agent indexed yet.</p>
            )}

            <div className="bento !grid-cols-1 sm:!grid-cols-2">
              {[
                ["Identity", "Who does it say it is?",
                 "The ERC-8004 token, its owner, and the agent card published against it. Nearly every agent clears this — it costs one transaction."],
                ["Liveness", "Does it answer when called?",
                 `We fetch the endpoint the agent declares. ${method.endpointsCalled.toLocaleString()} calls made, ${method.endpointsAnswered.toLocaleString()} answered.`],
                ["Authority", "What may it spend, and can you stop it?",
                 "Its spend cap, allowlist, expiry, and a revoke control. No agent on this registry has one yet — this line is blank everywhere, which is the finding."],
                ["Work", "Has anyone actually used it?",
                 `On-chain feedback from clients who paid for a result. ${stats.rated.toLocaleString()} of ${stats.registered.toLocaleString()} have ever received any.`],
              ].map(([label, q, body], i) => (
                <div key={label} className="cell relative">
                  <span
                    className="absolute inset-x-0 top-0 h-[2px]"
                    style={{ background: HUES[i] }}
                    aria-hidden
                  />
                  <p className="text-[13.5px] font-medium" style={{ color: HUES[i] }}>{label}</p>
                  <p className="mt-1 text-[13px] text-fg-muted">{q}</p>
                  <p className="mt-3 text-[13px] leading-relaxed text-fg-secondary">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Method ─────────────────────────────────────────────── */}
        <section id="method" className="mt-20 scroll-mt-24">
          <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-semibold tracking-[-0.03em]">
            How we measured it
          </h2>
          <p className="mt-4 max-w-[60ch] text-[14px] leading-relaxed text-fg-secondary">
            Nothing here is sampled, estimated, or mocked. Every figure is a row count from work
            the indexer performed against BNB Smart Chain.
          </p>

          <div className="mt-8 bento bento-3">
            {[
              ["Token ids walked", stats.registered, "Multicall3, ~250 per call"],
              ["Agent cards resolved", method.cardsResolved, "inline and off-chain"],
              ["Dead or malformed cards", method.cardsDead + method.malformed, "link rot and junk"],
              ["Endpoints called", method.endpointsCalled, "real HTTP requests"],
              ["Endpoints that answered", method.endpointsAnswered, "non-error response"],
              ["Reputation records read", method.reputationReads, "getClients per agent"],
            ].map(([label, v, note], i) => (
              <div key={label as string} className="cell">
                <p
                  className="text-[clamp(1.3rem,2.4vw,1.7rem)] font-semibold tracking-[-0.03em] tnum"
                  style={{ color: `var(--score-${[4,3,0,2,4,3][i]})` }}
                >
                  {(v as number).toLocaleString()}
                </p>
                <p className="mt-2 text-[13px] font-medium">{label}</p>
                <p className="mt-0.5 text-[12px] text-fg-faint">{note}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-[12.5px] text-fg-faint">
            Registry <span className="font-mono">0x8004A169…a432</span> on BNB Smart Chain
            {stats.indexedAt && (
              <> · last indexed {new Date(stats.indexedAt).toISOString().replace("T", " ").slice(0, 16)} UTC</>
            )}
            {" "}· reproduce with <span className="font-mono">recon/</span>
          </p>
        </section>

        <section className="mt-20 rounded-2xl border border-line bg-surface overflow-hidden">
          <div className="ramp-edge h-1" aria-hidden />
          <div className="p-8 sm:p-12">
          <p className="text-[clamp(1.4rem,3vw,2rem)] font-semibold tracking-[-0.03em] max-w-[24ch]">
            {stats.live.toLocaleString()} agents answered when we called.
          </p>
          <Link
            href="/ledger"
            className="inline-block mt-6 rounded-full bg-fg text-bg px-5 py-2.5 text-[14px]
                       font-medium hover:opacity-90 transition-opacity"
          >
            See which ones
          </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
