import Link from "next/link";

export default function AgentNotFound() {
  return (
    <main className="min-h-screen pt-24 grid place-items-center px-6">
      <div className="max-w-[46ch]">
        <span className="block h-1 w-24 rounded-full bg-refuted" aria-hidden />
        <h1 className="mt-6 text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.03em]">
          No agent holds that token id.
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-fg-secondary">
          The ERC-8004 registry on BNB Smart Chain has issued ids 1 upward. This one has
          either never been minted or was not present when Assay last walked the registry.
        </p>
        <Link
          href="/ledger"
          className="inline-block mt-7 rounded-full bg-fg text-bg px-5 py-2.5 text-[14px]
                     font-medium hover:opacity-90 transition-opacity"
        >
          Browse the ledger
        </Link>
      </div>
    </main>
  );
}
