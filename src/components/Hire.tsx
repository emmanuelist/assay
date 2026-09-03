"use client";

import { useState } from "react";
import type { AgentSession } from "@/lib/db/queries";

/**
 * Activation.
 *
 * The rubric asks users to discover AND activate agents. Discovery was the easy
 * half. This is the other one: the visitor gives the agent a task, it does real
 * work against BNB Smart Chain, and the answer comes back with the authority it
 * ran under shown alongside.
 *
 * Nothing here spends the visitor's money or ours. The session was granted once,
 * on chain, and every run executes inside its cap and allowlist — which is the
 * whole argument: authority is granted ahead of time, bounded, and withdrawable.
 */
export interface HireInput {
  name: string;
  required: boolean;
  note: string;
  placeholder?: string;
}

export function Hire({
  endpoint, inputs, session,
}: {
  endpoint: string;
  inputs: HireInput[];
  session: AgentSession | null;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [ms, setMs] = useState<number | null>(null);

  const missing = inputs.filter((i) => i.required && !values[i.name]?.trim());

  async function run() {
    setState("running"); setError(null); setResult(null);
    const t0 = performance.now();
    try {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(values)) if (v.trim()) q.set(k, v.trim());
      const res = await fetch(`${endpoint}${q.toString() ? `?${q}` : ""}`, { cache: "no-store" });
      const body = await res.json();
      setMs(Math.round(performance.now() - t0));
      if (!res.ok) { setError(body?.error ?? `HTTP ${res.status}`); setState("error"); return; }
      setResult(body); setState("done");
    } catch (e) {
      setMs(Math.round(performance.now() - t0));
      setError(e instanceof Error ? e.message : "the request failed");
      setState("error");
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface overflow-hidden">
      <header className="px-5 py-3.5 border-b border-line bg-surface-2 flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Put it to work</h2>
        {session && !session.revokedAt && !session.expired ? (
          <span className="text-[12px] text-proven">
            running under a session · {session.spendCapWei ? `${Number(session.spendCapWei) / 1e18} BNB/${session.spendPeriod ?? "day"}` : "capped"} · {session.allowlist.length} contracts
          </span>
        ) : session?.revokedAt ? (
          <span className="text-[12px] text-refuted">session revoked — calls that spend will revert</span>
        ) : (
          <span className="text-[12px] text-fg-faint">no session granted</span>
        )}
      </header>

      <div className="p-5 space-y-4">
        {inputs.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {inputs.map((i) => (
              <label key={i.name} className="block">
                <span className="block text-[12.5px] font-medium">
                  {i.name}
                  {i.required ? <span className="text-refuted"> *</span> : <span className="text-fg-faint"> optional</span>}
                </span>
                <span className="block text-[11.5px] text-fg-faint mt-0.5">{i.note}</span>
                <input
                  value={values[i.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [i.name]: e.target.value }))}
                  placeholder={i.placeholder ?? ""}
                  spellCheck={false}
                  className="mt-1.5 w-full rounded-lg border border-line bg-bg-sunk px-3 py-2
                             font-mono text-[12.5px] outline-none focus:border-accent transition-colors"
                />
              </label>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={run}
            disabled={state === "running" || missing.length > 0}
            className="rounded-full bg-fg text-bg px-5 py-2.5 text-[14px] font-medium
                       disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {state === "running" ? "Working…" : "Run the agent"}
          </button>
          {missing.length > 0 && (
            <span className="text-[12.5px] text-fg-faint">
              needs {missing.map((m) => m.name).join(", ")}
            </span>
          )}
          {ms !== null && state !== "running" && (
            <span className="text-[12.5px] text-fg-faint tnum">answered in {ms}ms</span>
          )}
        </div>

        {state === "error" && (
          <p className="rounded-lg border border-refuted/40 bg-refuted-dim px-4 py-3 text-[13px] text-refuted">
            {error}
          </p>
        )}

        {state === "done" && result != null && (
          <>
            {typeof (result as { verdict?: string }).verdict === "string" && (
              <p className="text-[15px] leading-relaxed">
                {(result as { verdict: string }).verdict}
              </p>
            )}
            <pre className="overflow-x-auto rounded-lg bg-bg-sunk border border-line p-4 font-mono text-[11.5px] leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
            <p className="text-[12px] text-fg-faint">
              Read live from BNB Smart Chain when you pressed the button. Nothing here is cached.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
