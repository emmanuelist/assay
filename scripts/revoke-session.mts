/**
 * Revokes an Altana session. Effect is immediate: the account contract rejects
 * anything signed by that key at validation time, so the next call reverts.
 *
 *   npx tsx scripts/revoke-session.mts <slug> [--send]
 *   npx tsx scripts/revoke-session.mts --all --send
 */
import { createClient, signerFromPrivateKey, BNB } from "@altananetwork/sdk";
import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { Hex } from "viem";

config({ path: ".env.local" });
const OUT = "sessions.granted.json";
const SEND = process.argv.includes("--send");
const ALL = process.argv.includes("--all");
const slug = process.argv.slice(2).find((a) => !a.startsWith("--"));

function key(): `0x${string}` {
  const raw = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (!raw) throw new Error("DEPLOYER_PRIVATE_KEY is not set");
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
}

async function main() {
  if (!existsSync(OUT)) throw new Error(`${OUT} not found — nothing to revoke`);
  const all = JSON.parse(readFileSync(OUT, "utf8")) as Record<string, { publicKey: Hex; walletAddress: string }>;
  const targets = ALL ? Object.keys(all) : slug ? [slug] : [];
  if (!targets.length) throw new Error("pass a slug or --all");

  const signer = signerFromPrivateKey(key());
  const client = createClient({ chains: [BNB] });
  console.log(`  signer ${signer.address}`);
  for (const t of targets) {
    const s = all[t];
    if (!s) { console.log(`  ${t}: not in ${OUT}`); continue; }
    console.log(`  ${t}: key ${String(s.publicKey).slice(0, 14)}…`);
  }
  if (!SEND) { console.log("\n  DRY RUN. Re-run with --send to revoke."); return; }

  const wallet = await client.createWallet({ signer });
  for (const t of targets) {
    const s = all[t];
    if (!s) continue;
    process.stdout.write(`  revoking ${t}… `);
    const res = await client.revokeSession({ wallet: wallet as never, signer, session: s.publicKey });
    const hash = (res as unknown as { transactionHash?: string }).transactionHash ?? "(no hash reported)";
    (all[t] as Record<string, unknown>).revokedAt = new Date().toISOString();
    (all[t] as Record<string, unknown>).revokeTx = hash;
    writeFileSync(OUT, JSON.stringify(all, null, 2));
    console.log(hash);
  }
  console.log("\n  revoked. the next call signed by those keys will revert.");
}
main().catch((e) => { console.error("\n  failed:", (e as Error).message.slice(0, 250)); process.exit(1); });
