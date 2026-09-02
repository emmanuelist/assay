import Link from "next/link";
import { notFound } from "next/navigation";
import { Assay } from "@/components/Assay";
import { getAgent, agentEvidence } from "@/lib/db/queries";

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const agentId = BigInt(id);
  const [agent, evidence] = await Promise.all([getAgent(agentId), agentEvidence(agentId)]);
  if (!agent) notFound();

  return (
    <main className="min-h-screen pt-20">
      <div className="mx-auto max-w-[72rem] px-4 sm:px-6 pb-24">
        <nav className="pt-8 pb-6">
          <Link
            href="/"
            className="text-[13px] text-fg-muted hover:text-fg transition-colors"
          >
            ← Assay
          </Link>
        </nav>

        <div className="grid lg:grid-cols-[minmax(0,23rem)_1fr] gap-6 lg:gap-10 items-start">
          <div className="lg:sticky lg:top-8">
            <Assay agent={agent} />
          </div>

          <div className="space-y-8 min-w-0">
            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] border-b border-line-strong pb-2.5">
                Where this came from
              </h2>
              <dl className="mt-3 text-[13px] divide-y divide-line">
                {[
                  ["Token id", `#${agent.id.toString()}`],
                  ["Owner", agent.owner ?? "—"],
                  ["Agent card", agent.cardStatus ?? "not resolved"],
                  ["Card host", agent.cardHost ?? "inline on chain"],
                  ["Endpoints declared", String(agent.endpointCount)],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[10rem_1fr] gap-4 py-2">
                    <dt className="text-[11.5px] uppercase tracking-[0.08em] text-fg-faint pt-0.5">
                      {k}
                    </dt>
                    <dd className="font-mono text-[12px] break-all">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[12px] text-fg-faint">
                Verify independently on{" "}
                <a
                  className="underline underline-offset-2 hover:text-fg"
                  href={`https://bscscan.com/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432?a=${agent.id}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  BscScan
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] border-b border-line-strong pb-2.5">
                Every call we made
              </h2>
              {evidence.probes.length === 0 ? (
                <p className="mt-3 text-[13px] text-fg-faint">
                  This agent declares no callable endpoint, so there was nothing to call.
                </p>
              ) : (
                <table className="mt-3 w-full text-[12px]">
                  <thead>
                    <tr className="text-left border-b border-line">
                      {["When", "Endpoint", "Result"].map((h) => (
                        <th
                          key={h}
                          className="pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-faint"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evidence.probes.map((p) => (
                      <tr key={p.id} className="border-b border-line align-top">
                        <td className="py-2 pr-3 font-mono text-fg-muted whitespace-nowrap">
                          {new Date(p.checkedAt).toISOString().replace("T", " ").slice(5, 16)}
                        </td>
                        <td className="py-1.5 pr-3 font-mono break-all max-w-[24rem]">{p.url}</td>
                        <td className={`py-1.5 font-mono whitespace-nowrap ${p.ok ? "text-proven" : "text-refuted"}`}>
                          {p.ok ? `${p.latencyMs}ms · ${p.statusCode}` : (p.error ?? "failed")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {agent.clusterSize > 1 && (
              <section>
                <h2 className="text-[16px] font-semibold tracking-[-0.02em] border-b border-line-strong pb-2.5">
                  Identical registrations
                </h2>
                <p className="mt-3 text-[13px] leading-relaxed text-fg-secondary">
                  <span className="tnum text-refuted">{agent.clusterSize.toLocaleString()}</span>{" "}
                  registrations on this registry share this exact name and description. They are
                  collapsed to one row everywhere else in Assay.
                </p>
                {evidence.siblings.length > 0 && (
                  <p className="mt-2 font-mono text-[11px] text-fg-faint break-all">
                    {evidence.siblings.map((s) => `#${s}`).join("  ")}
                    {agent.clusterSize > evidence.siblings.length && " …"}
                  </p>
                )}
              </section>
            )}

            {agent.cardStatus && (
              <section>
                <h2 className="text-[16px] font-semibold tracking-[-0.02em] border-b border-line-strong pb-2.5">
                  The agent card, as published
                </h2>
                {evidence.card ? (
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-bg-sunk border border-line p-4 font-mono text-[11.5px] leading-relaxed">
                    {JSON.stringify(evidence.card, null, 2).slice(0, 4000)}
                  </pre>
                ) : (
                  <p className="mt-3 text-[13px] text-fg-faint">
                    Nothing resolved at this agent&apos;s tokenURI.
                  </p>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
