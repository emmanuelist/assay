import { NextResponse } from "next/server";
import type { Address } from "viem";
import { bySlug } from "@/lib/agents/definitions";
import {
  chain, annualise, tickToPrice, comptrollerAbi, poolAbi, vTokenAbi,
  VENUS_COMPTROLLER, VTOKENS,
} from "@/lib/agents/onchain";

export const dynamic = "force-dynamic";

const DEFAULT_POOL = "0x36696169c63e42cd08ce11f5deebbcebae652050" as Address; // WBNB/USDT 0.05%

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store", "access-control-allow-origin": "*" },
  });

const isAddress = (s: string | null): s is Address => !!s && /^0x[0-9a-fA-F]{40}$/.test(s);

/** Every branch reads the chain live; nothing here is cached or canned. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const def = bySlug(slug);
  if (!def) return json({ error: "no such agent", known: ["range", "grid", "yield", "health"] }, 404);

  const q = new URL(req.url).searchParams;
  const at = new Date().toISOString();

  try {
    if (slug === "range") {
      const pool = isAddress(q.get("pool")) ? (q.get("pool") as Address) : DEFAULT_POOL;
      const [slot0, block] = await Promise.all([
        chain.readContract({ address: pool, abi: poolAbi, functionName: "slot0" }),
        chain.getBlockNumber(),
      ]);
      const tick = Number(slot0[1]);
      const lower = Number(q.get("lower") ?? tick - 600);
      const upper = Number(q.get("upper") ?? tick + 600);
      const inRange = tick >= lower && tick > -887273 && tick <= upper;
      const width = upper - lower;
      const drift = inRange ? 0 : tick < lower ? lower - tick : tick - upper;
      return json({
        agent: def.name, category: def.category, pool, block: block.toString(), at,
        tick, range: { lower, upper, width },
        inRange,
        driftTicks: drift,
        driftPercent: width > 0 ? +((drift / width) * 100).toFixed(2) : null,
        priceRatio: +tickToPrice(tick).toExponential(6),
        verdict: inRange
          ? "Position is earning. No action."
          : `Position is out of range by ${drift} ticks and is earning nothing.`,
        source: "PancakeSwap V3 pool slot0(), read live",
      });
    }

    if (slug === "grid") {
      const pool = isAddress(q.get("pool")) ? (q.get("pool") as Address) : DEFAULT_POOL;
      const steps = Math.min(12, Math.max(1, Number(q.get("steps") ?? 5)));
      const bps = Math.min(2000, Math.max(10, Number(q.get("spacingBps") ?? 100)));
      const [slot0, block] = await Promise.all([
        chain.readContract({ address: pool, abi: poolAbi, functionName: "slot0" }),
        chain.getBlockNumber(),
      ]);
      const tick = Number(slot0[1]);
      const mid = tickToPrice(tick);
      const levels = [];
      for (let i = steps; i >= 1; i--) levels.push({ side: "buy", price: +(mid * (1 - (bps * i) / 10_000)).toExponential(6) });
      for (let i = 1; i <= steps; i++) levels.push({ side: "sell", price: +(mid * (1 + (bps * i) / 10_000)).toExponential(6) });
      return json({
        agent: def.name, category: def.category, pool, block: block.toString(), at,
        tick, midPriceRatio: +mid.toExponential(6),
        spacingBps: bps, levels,
        verdict: `${levels.length} levels placed ${bps} bps apart around the live pool price.`,
        source: "PancakeSwap V3 pool slot0(), read live",
      });
    }

    if (slug === "yield") {
      const block = await chain.getBlockNumber();
      const results = await chain.multicall({
        contracts: VTOKENS.map((v) => ({
          address: v.address, abi: vTokenAbi, functionName: "supplyRatePerBlock",
        } as const)),
        allowFailure: true,
      });
      const markets = VTOKENS.map((v, i) => ({
        market: v.symbol, address: v.address,
        supplyApy: results[i].status === "success" ? annualise(results[i].result as bigint) : null,
      })).filter((m) => m.supplyApy !== null)
        .sort((a, b) => (b.supplyApy ?? 0) - (a.supplyApy ?? 0));
      const best = markets[0];
      return json({
        agent: def.name, category: def.category, block: block.toString(), at,
        markets,
        verdict: best
          ? `Best live supply rate is ${best.market} at ${best.supplyApy}% APY.`
          : "No market answered.",
        source: "Venus vToken supplyRatePerBlock(), annualised at 10,512,000 blocks/year",
      });
    }

    // health
    const account = q.get("account");
    if (!isAddress(account)) {
      return json({ error: "account is required and must be a 0x address", example: "?account=0x…" }, 400);
    }
    const [liq, block] = await Promise.all([
      chain.readContract({
        address: VENUS_COMPTROLLER, abi: comptrollerAbi,
        functionName: "getAccountLiquidity", args: [account],
      }),
      chain.getBlockNumber(),
    ]);
    const [err, liquidity, shortfall] = liq as readonly [bigint, bigint, bigint];
    const usd = (x: bigint) => Number(x) / 1e18;
    const atRisk = shortfall > 0n;
    return json({
      agent: def.name, category: def.category, account, block: block.toString(), at,
      comptrollerError: Number(err),
      liquidityUsd: +usd(liquidity).toFixed(2),
      shortfallUsd: +usd(shortfall).toFixed(2),
      atRisk,
      verdict: atRisk
        ? `Liquidatable now: shortfall of $${usd(shortfall).toFixed(2)}.`
        : liquidity === 0n
          ? "No open borrow, or no collateral posted. Nothing to protect."
          : `Safe: $${usd(liquidity).toFixed(2)} of borrowing power left before liquidation.`,
      source: "Venus Comptroller getAccountLiquidity(), read live",
    });
  } catch (e) {
    return json({ error: "chain read failed", detail: (e as Error).message.slice(0, 200) }, 502);
  }
}
