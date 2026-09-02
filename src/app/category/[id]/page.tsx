import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentLedger } from "@/components/AgentLedger";
import { ProofLegend } from "@/components/ProofMarks";
import { categoryById, type CategoryId } from "@/lib/categories";
import { agentsInCategory, categoryCounts } from "@/lib/db/queries";

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = categoryById(id);
  if (!cat) notFound();

  const [agents, counts] = await Promise.all([
    agentsInCategory(cat.id as CategoryId, 50),
    categoryCounts(),
  ]);
  const count = counts.find((c) => c.id === cat.id);

  return (
    <main className="min-h-screen pt-20 pb-24">
      <div className="mx-auto max-w-[78rem] px-4 sm:px-6">
        <nav className="pt-8 flex flex-wrap gap-2" aria-label="Agent categories">
          {counts.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.id}`}
              aria-current={c.id === cat.id ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
                c.id === cat.id
                  ? "border-transparent text-bg"
                  : "border-line-strong text-fg-secondary hover:text-fg hover:bg-surface-hover"
              }`}
              style={c.id === cat.id ? { background: c.hue } : undefined}
            >
              {c.label}
              <span className="ml-1.5 tnum opacity-70">{c.total.toLocaleString()}</span>
            </Link>
          ))}
        </nav>

        <header className="pt-9 pb-7">
          <span className="block h-1 w-16 rounded-full" style={{ background: cat.hue }} aria-hidden />
          <h1 className="mt-5 text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-[-0.03em] leading-[1.08]">
            {cat.label}
          </h1>
          <p className="mt-4 max-w-[62ch] text-[14.5px] leading-relaxed text-fg-secondary">
            {cat.blurb}{" "}
            {count && (
              <>
                <span className="tnum text-fg">{count.total.toLocaleString()}</span> agents describe
                themselves this way; <span className="tnum text-fg">{count.withEndpoint.toLocaleString()}</span>{" "}
                declare an endpoint and{" "}
                <span className="tnum text-proven">{count.live.toLocaleString()}</span> answered when
                called.
              </>
            )}
          </p>
          <p className="mt-3 max-w-[62ch] text-[12.5px] leading-relaxed text-fg-faint">
            ERC-8004 has no category field, so this is inferred from what each agent published
            about itself. It is a claim, not a verified fact — the proof marks are the part that
            was checked.
          </p>
        </header>

        <div className="border-b border-line-strong pb-2.5 mb-3">
          <ProofLegend />
        </div>
        <AgentLedger agents={agents} />
      </div>
    </main>
  );
}
