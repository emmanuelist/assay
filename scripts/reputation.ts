/**
 * Stage D — ReputationRegistry.getClients() for every agent.
 *
 * getFeedbackCount() and getSummary() both revert on this contract; getClients
 * is the verified read. ~1% of agents return a non-empty array, and that 1% is
 * the only population with any provable track record.
 *
 *   npm run index:reputation -- [--chunk N]
 */
import "../src/lib/env";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { agents } from "../src/lib/db/schema";
import { clients } from "../src/lib/chain/client";
import { REPUTATION_REGISTRY, reputationRegistryAbi } from "../src/lib/chain/abi";

const arg = (f: string) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : undefined; };
const CHUNK = Number(arg("--chunk") ?? 400);

async function main() {
  const rows = await db.select({ id: agents.id }).from(agents)
    .where(sql`${agents.clientCount} is null`).orderBy(agents.id);
  console.log(`${rows.length.toLocaleString()} agents to read\n`);
  if (!rows.length) return;

  const started = Date.now();
  let done = 0, rated = 0;

  for (let i = 0; i < rows.length; i += CHUNK * clients.length) {
    const batches: { id: bigint }[][] = [];
    for (let p = 0; p < clients.length; p++) {
      const slice = rows.slice(i + p * CHUNK, i + (p + 1) * CHUNK);
      if (slice.length) batches.push(slice);
    }

    const settled = await Promise.allSettled(batches.map(async (slice, bi) => {
      const res = await clients[bi % clients.length].multicall({
        contracts: slice.map((r) => ({
          address: REPUTATION_REGISTRY, abi: reputationRegistryAbi,
          functionName: "getClients", args: [r.id],
        } as const)),
        allowFailure: true, batchSize: 0,
      });
      return slice.map((r, j) => ({
        id: r.id,
        count: res[j].status === "success" ? (res[j].result as readonly string[]).length : 0,
      }));
    }));

    const updates = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
    if (updates.length) {
      // one statement per batch, not per row
      await db.execute(sql`
        update agents set client_count = v.c
        from (values ${sql.join(updates.map((u) => sql`(${u.id}::bigint, ${u.count}::int)`), sql`, `)}) as v(id, c)
        where agents.id = v.id
      `);
      done += updates.length;
      rated += updates.filter((u) => u.count > 0).length;
    }

    const rate = done / ((Date.now() - started) / 1000);
    process.stdout.write(
      `\r  ${done.toLocaleString()}/${rows.length.toLocaleString()} · ${rated} rated · ` +
      `${rate.toFixed(0)}/s · eta ${(((rows.length - done) / Math.max(rate, .01)) / 60).toFixed(1)}m   `,
    );
  }

  console.log(`\n\ndone — ${rated.toLocaleString()} of ${done.toLocaleString()} agents have any on-chain client`);
  process.exit(0);
}

main().catch((e) => { console.error("\nreputation failed:", e); process.exit(1); });
