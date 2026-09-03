/**
 * Registers Assay's four agents on the canonical ERC-8004 registry (BSC mainnet).
 *
 * The key is read from .env.local as DEPLOYER_PRIVATE_KEY and never printed,
 * logged, or written anywhere. Dry run is the default: nothing is signed until
 * you pass --send.
 *
 *   npm run agents:register            # preflight only, spends nothing
 *   npm run agents:register -- --send  # actually registers
 */
import "../src/lib/env";
import { createPublicClient, createWalletClient, http, formatEther, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { AGENTS } from "../src/lib/agents/definitions";
import { IDENTITY_REGISTRY } from "../src/lib/chain/abi";

const SEND = process.argv.includes("--send");
const ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://assay-ten-iota.vercel.app";
const OUT = "agents.registered.json";

const registerAbi = parseAbi(["function register(string tokenURI) returns (uint256)"]);

async function main() {
  const raw = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (!raw) {
    console.error(
      "DEPLOYER_PRIVATE_KEY is not set.\n" +
      "Add it to .env.local (which is gitignored) as:\n" +
      "  DEPLOYER_PRIVATE_KEY=0x…\n",
    );
    process.exit(1);
  }
  const key = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    console.error("DEPLOYER_PRIVATE_KEY is not a 32-byte hex key. Not proceeding.");
    process.exit(1);
  }

  const account = privateKeyToAccount(key);
  const rpc = process.env.BSC_RPC_URLS?.split(",")[0]?.trim() ?? "https://bsc-dataseed.binance.org/";
  const pub = createPublicClient({ chain: bsc, transport: http(rpc) });
  const wallet = createWalletClient({ account, chain: bsc, transport: http(rpc) });

  const [balance, gasPrice] = await Promise.all([
    pub.getBalance({ address: account.address }),
    pub.getGasPrice(),
  ]);

  console.log(`  signer     ${account.address}`);
  console.log(`  balance    ${formatEther(balance)} BNB`);
  console.log(`  gas price  ${Number(gasPrice) / 1e9} gwei`);
  console.log(`  registry   ${IDENTITY_REGISTRY}`);
  console.log(`  cards from ${ORIGIN}\n`);

  const already: Record<string, { agentId: string; tx: string }> =
    existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};

  let totalGas = 0n;
  const plan: { slug: string; uri: string; gas: bigint }[] = [];
  for (const a of AGENTS) {
    if (already[a.slug]) { console.log(`  ${a.slug.padEnd(7)} already registered as #${already[a.slug]!.agentId}`); continue; }
    const uri = `${ORIGIN}/api/agents/${a.slug}/card`;
    const gas = await pub.estimateContractGas({
      address: IDENTITY_REGISTRY, abi: registerAbi, functionName: "register",
      args: [uri], account,
    }).catch(() => 250_000n);
    plan.push({ slug: a.slug, uri, gas });
    totalGas += gas;
    console.log(`  ${a.slug.padEnd(7)} ${a.category.padEnd(12)} ${Number(gas).toLocaleString()} gas   ${uri}`);
  }

  if (!plan.length) { console.log("\n  nothing left to register."); process.exit(0); }

  const cost = totalGas * gasPrice;
  console.log(`\n  total ${Number(totalGas).toLocaleString()} gas = ${formatEther(cost)} BNB`);
  if (balance < cost * 2n) console.log("  ! balance is under 2x the estimate; top up before sending");

  if (!SEND) {
    console.log("\n  DRY RUN. Nothing was signed. Re-run with --send to register.");
    process.exit(0);
  }

  for (const p of plan) {
    process.stdout.write(`  registering ${p.slug}… `);
    const hash = await wallet.writeContract({
      address: IDENTITY_REGISTRY, abi: registerAbi, functionName: "register",
      args: [p.uri], gas: (p.gas * 13n) / 10n,
    });
    const rcpt = await pub.waitForTransactionReceipt({ hash, timeout: 120_000 });
    // The minted token id is the last topic of the Transfer log from the registry.
    const transfer = rcpt.logs.find((l) => l.address.toLowerCase() === IDENTITY_REGISTRY.toLowerCase() && l.topics.length === 4);
    const agentId = transfer ? BigInt(transfer.topics[3]!).toString() : "?";
    already[p.slug] = { agentId, tx: hash };
    writeFileSync(OUT, JSON.stringify(already, null, 2));
    console.log(`#${agentId}  ${hash}`);
  }

  console.log(`\n  done. ids saved to ${OUT}`);
  console.log("  next: npm run index:backfill -- --from <lowest id> to pull them into the ledger");
  process.exit(0);
}

main().catch((e) => { console.error("\nregistration failed:", (e as Error).message.slice(0, 300)); process.exit(1); });
