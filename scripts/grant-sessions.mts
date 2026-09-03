/**
 * Grants each Assay agent an Altana session: a spend cap, a call allowlist and
 * an expiry, enforced on-chain by the Altana account contract.
 *
 * This is what fills the Assay's Authority row. Every agent on the ERC-8004
 * registry today leaves it blank — not one operates under authority anyone can
 * see or withdraw — so this is the finding the product exists to make, answered.
 *
 * Runs on BNB testnet by default: the Altana bounty accepts testnet, the stack
 * is complete there, and a mainnet EIP-7702 delegation plus KeyStore
 * registration costs real money for no additional proof.
 *
 *   npx tsx scripts/grant-sessions.mts             # preflight, spends nothing
 *   npx tsx scripts/grant-sessions.mts --send      # actually grants
 *   npx tsx scripts/grant-sessions.mts --mainnet   # chain 56 instead of 97
 */
import { createClient, signerFromPrivateKey, serializeSession, BNB, BNB_TESTNET } from "@altananetwork/sdk";
import { generatePrivateKey } from "viem/accounts";
import { createPublicClient, http, formatEther, type Address } from "viem";
import { config } from "dotenv";
import { writeFileSync, existsSync, readFileSync } from "node:fs";

config({ path: ".env.local" });

const SEND = process.argv.includes("--send");
const MAINNET = process.argv.includes("--mainnet");
const NET = MAINNET ? BNB : BNB_TESTNET;
const OUT = "sessions.granted.json";
/**
 * Session private keys, gitignored.
 *
 * grantSession without a sessionSigner makes the SDK generate a key that lives
 * only in that process's memory. The first run did exactly that: four
 * authorizations landed on chain and became unusable the moment the process
 * exited, because a serialized session is "everything except the secret".
 * Generate the key here, persist it, and rebuild the signer on load.
 */
const KEYS = "sessions.keys.json";

/** PancakeSwap and Venus are the only places these agents ever need to call. */
const ALLOWED: { label: string; to: Address }[] = [
  { label: "Venus Comptroller", to: "0xfD36E2c2a6789Db23113685031d7F16329158384" },
  { label: "PancakeSwap V3 WBNB/USDT", to: "0x36696169c63e42cd08ce11f5deebbcebae652050" },
];

const AGENT_SLUGS = ["range", "grid", "yield", "health"] as const;

function key(): `0x${string}` {
  const raw = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (!raw) throw new Error("DEPLOYER_PRIVATE_KEY is not set in .env.local");
  const k = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(k)) throw new Error("DEPLOYER_PRIVATE_KEY is not a 32-byte hex key");
  return k;
}

async function main() {
  const signer = signerFromPrivateKey(key());
  const chainId = (NET as { chainId: number }).chainId;
  const rpcUrl = (NET as { rpcUrls?: string[] }).rpcUrls?.[0];

  console.log(`  network   ${MAINNET ? "BNB mainnet" : "BNB testnet"} (chain ${chainId})`);
  console.log(`  signer    ${signer.address}`);

  if (rpcUrl) {
    const pub = createPublicClient({ transport: http(rpcUrl) });
    const bal = await pub.getBalance({ address: signer.address as Address }).catch(() => null);
    if (bal !== null) {
      console.log(`  balance   ${formatEther(bal)} ${MAINNET ? "BNB" : "tBNB"}`);
      if (bal === 0n) {
        console.log(`\n  This account has no ${MAINNET ? "BNB" : "testnet BNB"}.`);
        if (!MAINNET) console.log("  Fund it at https://testnet.bnbchain.org/faucet-smart");
      }
    }
  }

  console.log(`\n  session terms, identical for all four agents:`);
  console.log(`    spend cap   0.01 native per day`);
  console.log(`    allowlist   ${ALLOWED.map((a) => a.label).join(", ")}`);
  console.log(`    expiry      24 hours from grant\n`);

  if (!SEND) {
    console.log("  DRY RUN. Nothing was signed. Re-run with --send to grant.");
    return;
  }

  const client = createClient({ chains: [NET] });
  const wallet = await client.createWallet({ signer });
  console.log(`  wallet    ${(wallet as unknown as { address: string }).address}`);

  const out: Record<string, unknown> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
  const keys: Record<string, string> = existsSync(KEYS) ? JSON.parse(readFileSync(KEYS, "utf8")) : {};
  const pub2 = rpcUrl ? createPublicClient({ transport: http(rpcUrl) }) : null;
  for (const slug of AGENT_SLUGS) {
    if (out[slug] && !(out[slug] as { revokedAt?: string }).revokedAt) {
      console.log(`  ${slug} already granted, skipping`);
      continue;
    }
    // Altana bills per operation through its relay, well above raw gas. Check
    // before each grant rather than discovering it empty three calls later.
    if (pub2) {
      const bal = await pub2.getBalance({ address: signer.address as Address });
      if (bal < 700_000_000_000_000n) {
        console.log(`\n  stopping: ${formatEther(bal)} BNB left, under one observed grant (~0.0005).`);
        break;
      }
    }
    process.stdout.write(`  granting ${slug}… `);
    // Own the session key so the grant survives this process.
    keys[slug] ??= generatePrivateKey();
    writeFileSync(KEYS, JSON.stringify(keys, null, 2));
    const sessionSigner = signerFromPrivateKey(keys[slug]! as `0x${string}`);
    const session = await client.grantSession({
      wallet: wallet as never,
      signer,
      sessionSigner,
      permissions: {
        calls: ALLOWED.map((a) => ({ to: a.to })),
        spend: [{ limit: 10_000_000_000_000_000n, period: "day" }], // 0.01 native
      },
      expiry: Math.floor(Date.now() / 1000) + 86_400,
    });
    out[slug] = {
      chainId,
      walletAddress: session.walletAddress,
      publicKey: session.publicKey,
      expiry: session.expiry,
      allowlist: ALLOWED,
      spendCapWei: "10000000000000000",
      grantedAt: new Date().toISOString(),
      serialized: serializeSession(session),
    };
    writeFileSync(OUT, JSON.stringify(out, null, 2));
    console.log(`key ${String(session.publicKey).slice(0, 14)}…  expires ${new Date(session.expiry * 1000).toISOString()}`);
  }
  console.log(`\n  done. sessions saved to ${OUT}`);
}

main().catch((e) => { console.error("\n  failed:", (e as Error).message.slice(0, 300)); process.exit(1); });
