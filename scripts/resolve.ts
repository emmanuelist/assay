/**
 * Stage C — fetch the off-chain agent cards (http/https/ipfs tokenURIs).
 *
 * ~69% of off-chain cards in a random sample resolved to a single host, so this
 * is throttled per host rather than globally: one slow or rate-limiting host
 * must not stall the run, and we must not hammer a bulk registrant's bucket.
 *
 *   npm run index:resolve -- [--limit N] [--per-host N] [--retry]
 */
import "../src/lib/env";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { agents, endpoints } from "../src/lib/db/schema";
import { fetchCard, hostOf } from "../src/lib/chain/card";

const arg = (f: string) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : undefined; };
const LIMIT = Number(arg("--limit") ?? 0);
const PER_HOST = Number(arg("--per-host") ?? 6);
const RETRY = process.argv.includes("--retry");

async function main() {
  const pending = await db
    .select({ id: agents.id, tokenUri: agents.tokenUri })
    .from(agents)
    .where(
      and(
        sql`${agents.tokenUri} is not null`,
        RETRY
          ? or(isNull(agents.cardStatus), eq(agents.cardStatus, "unreachable"))
          : isNull(agents.cardStatus),
      ),
    )
    .limit(LIMIT > 0 ? LIMIT : 1_000_000);

  console.log(`${pending.length.toLocaleString()} cards to fetch (${PER_HOST}/host)\n`);
  if (!pending.length) return;

  // bucket by host so each host gets its own bounded worker pool
  const byHost = new Map<string, typeof pending>();
  for (const row of pending) {
    const h = hostOf(row.tokenUri!) ?? "<invalid>";
    if (!byHost.has(h)) byHost.set(h, []);
    byHost.get(h)!.push(row);
  }
  const hosts = [...byHost.entries()].sort((a, b) => b[1].length - a[1].length);
  console.log("top hosts:");
  for (const [h, rows] of hosts.slice(0, 6)) console.log(`  ${rows.length.toString().padStart(7)}  ${h}`);
  console.log();

  const started = Date.now();
  let done = 0, ok = 0, dead = 0;

  const runHost = async (rows: typeof pending) => {
    let i = 0;
    const worker = async () => {
      while (i < rows.length) {
        const row = rows[i++];
        const res = await fetchCard(row.tokenUri!);
        await db.update(agents).set({
          cardStatus: res.status,
          card: res.card,
          cardHost: res.host,
          name: res.name,
          description: res.description,
          dedupKey: res.dedupKey,
          endpointCount: res.endpoints.length,
          resolvedAt: new Date(),
        }).where(eq(agents.id, row.id));

        if (res.endpoints.length) {
          await db.insert(endpoints)
            .values(res.endpoints.map((e) => ({ agentId: row.id, type: e.type, url: e.url })))
            .onConflictDoNothing();
        }

        done++;
        if (res.status === "http") ok++; else dead++;
        if (done % 50 === 0) {
          const rate = done / ((Date.now() - started) / 1000);
          process.stdout.write(
            `\r  ${done.toLocaleString()}/${pending.length.toLocaleString()} · ${ok} ok · ${dead} dead · ` +
            `${rate.toFixed(0)}/s · eta ${(((pending.length - done) / Math.max(rate, .01)) / 60).toFixed(1)}m   `,
          );
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PER_HOST, rows.length) }, worker));
  };

  await Promise.all(hosts.map(([, rows]) => runHost(rows)));
  console.log(`\n\ndone — ${ok.toLocaleString()} resolved, ${dead.toLocaleString()} unreachable/malformed`);
  process.exit(0);
}

main().catch((e) => { console.error("\nresolve failed:", e); process.exit(1); });
