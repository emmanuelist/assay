/**
 * Loads granted Altana sessions into the index so the Assay can render them.
 *
 *   npx tsx scripts/load-sessions.ts [--target hosted]
 */
import "../src/lib/env";
import { sql } from "drizzle-orm";
import { readFileSync, existsSync } from "node:fs";
import { db } from "../src/lib/db";
import { sessions } from "../src/lib/db/schema";

/** slug -> the ERC-8004 token id it was registered as */
const AGENT_IDS: Record<string, bigint> = {
  range: 331750n, grid: 331751n, yield: 331752n, health: 331753n,
};

interface Granted {
  chainId: number; walletAddress: string; publicKey: string; expiry: number;
  spendCapWei?: string; allowlist?: { label: string; to: string }[];
  grantedAt?: string; revokedAt?: string; revokeTx?: string;
}

async function main() {
  const file = "sessions.granted.json";
  if (!existsSync(file)) { console.error(`${file} not found`); process.exit(1); }
  const all = JSON.parse(readFileSync(file, "utf8")) as Record<string, Granted>;

  let n = 0;
  for (const [slug, s] of Object.entries(all)) {
    const agentId = AGENT_IDS[slug];
    if (!agentId) { console.log(`  ${slug}: no agent id mapping, skipped`); continue; }
    await db.insert(sessions).values({
      agentId, chainId: s.chainId, walletAddress: s.walletAddress,
      publicKey: s.publicKey, expiry: s.expiry,
      spendCapWei: s.spendCapWei ?? null, spendPeriod: "day",
      allowlist: s.allowlist ?? [],
      grantedAt: s.grantedAt ? new Date(s.grantedAt) : new Date(),
      revokedAt: s.revokedAt ? new Date(s.revokedAt) : null,
      revokeTx: s.revokeTx ?? null,
    }).onConflictDoUpdate({
      target: sessions.agentId,
      set: {
        publicKey: sql`excluded.public_key`, expiry: sql`excluded.expiry`,
        spendCapWei: sql`excluded.spend_cap_wei`, allowlist: sql`excluded.allowlist`,
        revokedAt: sql`excluded.revoked_at`, revokeTx: sql`excluded.revoke_tx`,
      },
    });
    console.log(`  ${slug.padEnd(7)} -> agent #${agentId}  expires ${new Date(s.expiry * 1000).toISOString()}`);
    n++;
  }
  console.log(`\n  ${n} session(s) loaded`);
  process.exit(0);
}
main().catch((e) => { console.error("load failed:", e); process.exit(1); });
