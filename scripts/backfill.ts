/**
 * Stage A — enumerate the canonical ERC-8004 IdentityRegistry on BSC.
 *
 * Public BSC RPC refuses `eth_getLogs` at every span, so there is no log-based
 * backfill. We walk token ids through Multicall3 instead: ~250 ids per call
 * (500 subcalls) lands in ~5s, and several RPCs run in parallel.
 *
 *   npm run index:backfill -- [--from N] [--to N] [--chunk N] [--reset]
 */
import "../src/lib/env";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { agents, indexState } from "../src/lib/db/schema";
import { clients, rpcUrls } from "../src/lib/chain/client";
import { IDENTITY_REGISTRY, identityRegistryAbi } from "../src/lib/chain/abi";
import { parseTokenUri, hostOf } from "../src/lib/chain/card";

const CURSOR_KEY = "backfill:identity";

const arg = (flag: string): string | undefined => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const num = (flag: string, dflt: number) => Number(arg(flag) ?? dflt);

/** The registry is not enumerable — totalSupply() reverts. Find the ceiling. */
async function findMaxId(): Promise<bigint> {
  const c = clients[0];
  const exists = async (id: bigint) => {
    try {
      await c.readContract({
        address: IDENTITY_REGISTRY, abi: identityRegistryAbi,
        functionName: "ownerOf", args: [id],
      });
      return true;
    } catch { return false; }
  };
  let lo = 1n, hi = 1n;
  while (await exists(hi)) { lo = hi; hi *= 2n; }
  while (lo + 1n < hi) {
    const mid = (lo + hi) / 2n;
    if (await exists(mid)) lo = mid; else hi = mid;
  }
  return lo;
}

async function readChunk(clientIndex: number, ids: bigint[]) {
  const client = clients[clientIndex % clients.length];
  const contracts = ids.flatMap((id) => [
    { address: IDENTITY_REGISTRY, abi: identityRegistryAbi, functionName: "ownerOf", args: [id] } as const,
    { address: IDENTITY_REGISTRY, abi: identityRegistryAbi, functionName: "tokenURI", args: [id] } as const,
  ]);
  const res = await client.multicall({ contracts, allowFailure: true, batchSize: 0 });

  return ids.map((id, i) => {
    const ownerR = res[i * 2];
    const uriR = res[i * 2 + 1];
    if (ownerR.status !== "success") return null; // not minted / burned
    const owner = String(ownerR.result).toLowerCase();
    const tokenUri = uriR.status === "success" ? String(uriR.result) : null;

    const parsed = parseTokenUri(tokenUri);
    // parsed === null means it is an http(s) URI that stage C must fetch.
    return {
      id,
      owner,
      tokenUri,
      cardStatus: parsed?.status ?? null,
      card: parsed?.card ?? null,
      cardHost: parsed ? parsed.host : tokenUri ? hostOf(tokenUri) : null,
      name: parsed?.name ?? null,
      description: parsed?.description ?? null,
      dedupKey: parsed?.dedupKey ?? null,
      endpointCount: parsed?.endpoints.length ?? 0,
      resolvedAt: parsed ? new Date() : null,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);
}

async function main() {
  const chunk = num("--chunk", 250);
  const parallel = clients.length;

  if (process.argv.includes("--reset")) {
    await db.delete(indexState).where(sql`${indexState.key} = ${CURSOR_KEY}`);
    console.log("cursor reset");
  }

  const max = arg("--to") ? BigInt(arg("--to")!) : await findMaxId();
  const saved = await db.select().from(indexState).where(sql`${indexState.key} = ${CURSOR_KEY}`);
  const from = arg("--from")
    ? BigInt(arg("--from")!)
    : BigInt((saved[0]?.value as { next?: string })?.next ?? "1");

  console.log(`registry ${IDENTITY_REGISTRY}`);
  console.log(`rpcs     ${rpcUrls.length} (${parallel}-way parallel, chunk ${chunk})`);
  console.log(`range    ${from} … ${max}  (${max - from + 1n} ids)\n`);

  const started = Date.now();
  let cursor = from;
  let written = 0;

  while (cursor <= max) {
    const batches: bigint[][] = [];
    for (let p = 0; p < parallel && cursor <= max; p++) {
      const ids: bigint[] = [];
      for (let i = 0; i < chunk && cursor <= max; i++) ids.push(cursor++);
      batches.push(ids);
    }

    const settled = await Promise.allSettled(batches.map((ids, i) => readChunk(i, ids)));
    const rows = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
    const failed = settled.filter((s) => s.status === "rejected").length;

    if (rows.length) {
      await db.insert(agents).values(rows).onConflictDoUpdate({
        target: agents.id,
        set: {
          owner: sql`excluded.owner`,
          tokenUri: sql`excluded.token_uri`,
          cardStatus: sql`excluded.card_status`,
          card: sql`excluded.card`,
          cardHost: sql`excluded.card_host`,
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          dedupKey: sql`excluded.dedup_key`,
          endpointCount: sql`excluded.endpoint_count`,
          resolvedAt: sql`excluded.resolved_at`,
        },
      });
      written += rows.length;
    }

    await db.insert(indexState).values({ key: CURSOR_KEY, value: { next: cursor.toString(), max: max.toString() } })
      .onConflictDoUpdate({ target: indexState.key, set: { value: sql`excluded.value`, updatedAt: new Date() } });

    const done = Number(cursor - from);
    const total = Number(max - from + 1n);
    const secs = (Date.now() - started) / 1000;
    const rate = done / Math.max(secs, 0.001);
    const eta = (total - done) / Math.max(rate, 0.001);
    process.stdout.write(
      `\r  ${done.toLocaleString()}/${total.toLocaleString()} (${((done / total) * 100).toFixed(1)}%) ` +
      `· ${written.toLocaleString()} rows · ${rate.toFixed(0)} ids/s · eta ${(eta / 60).toFixed(1)}m` +
      (failed ? ` · ${failed} chunk fail` : "") + "   ",
    );
  }

  console.log(`\n\ndone — ${written.toLocaleString()} agents in ${((Date.now() - started) / 1000 / 60).toFixed(1)}m`);
  process.exit(0);
}

main().catch((e) => { console.error("\nbackfill failed:", e); process.exit(1); });
