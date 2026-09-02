"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * The indexer talks to Postgres and BNB Chain, so the realistic failures are
 * "the database is unreachable" and "a query timed out". Say which, and offer
 * the action that actually recovers — not a generic apology.
 */
export default function Error({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[assay]", error);
  }, [error]);

  const isDb = /connect|ECONNREFUSED|timeout|terminating|pool/i.test(error.message);

  return (
    <main className="min-h-screen pt-24 grid place-items-center px-6">
      <div className="max-w-[46ch]">
        <span className="ramp-edge block h-1 w-24 rounded-full" aria-hidden />
        <h1 className="mt-6 text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.03em]">
          {isDb ? "Assay can't reach its index right now." : "Something broke while reading the chain."}
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-fg-secondary">
          {isDb
            ? "Every figure here is read live from a Postgres index of the ERC-8004 registry. That database isn't answering, so rather than show you stale or invented numbers, Assay is showing you nothing."
            : "This page reads from BNB Smart Chain and a local index. One of them returned something unexpected."}
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[12px] text-fg-faint break-all">
            digest {error.digest}
          </p>
        )}
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-fg text-bg px-5 py-2.5 text-[14px] font-medium
                       hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-line-strong px-5 py-2.5 text-[14px]
                       text-fg-secondary hover:text-fg hover:bg-surface-hover transition-colors"
          >
            Back to the start
          </Link>
        </div>
      </div>
    </main>
  );
}
