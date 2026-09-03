/**
 * The reads the four agents actually perform.
 *
 * Every value an agent returns is fetched from BNB Smart Chain at request time.
 * None of it is cached, seeded or canned — an agent that answered with a stored
 * response would be exactly the kind of thing Assay exists to catch.
 */
import { createPublicClient, http, parseAbi, type Address } from "viem";
import { bsc } from "viem/chains";

const rpc = process.env.BSC_RPC_URLS?.split(",")[0]?.trim() ?? "https://bsc-dataseed.binance.org/";
export const chain = createPublicClient({ chain: bsc, transport: http(rpc, { timeout: 15_000 }) });

/** BSC produces a block roughly every 3s. */
export const BLOCKS_PER_YEAR = 10_512_000n;

export const VENUS_COMPTROLLER = "0xfD36E2c2a6789Db23113685031d7F16329158384" as const;
export const VTOKENS: { symbol: string; address: Address }[] = [
  { symbol: "vUSDT", address: "0xfD5840Cd36d94D7229439859C0112a4185BC0255" },
  { symbol: "vBNB",  address: "0xA07c5b74C9B40447a954e1466938b865b6BBea36" },
  { symbol: "vBUSD", address: "0x95c78222B3D6e262426483D42CfA53685A67Ab9D" },
  { symbol: "vUSDC", address: "0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8" },
  { symbol: "vBTC",  address: "0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B" },
];

export const vTokenAbi = parseAbi([
  "function supplyRatePerBlock() view returns (uint256)",
  "function borrowRatePerBlock() view returns (uint256)",
]);

export const comptrollerAbi = parseAbi([
  "function getAccountLiquidity(address) view returns (uint256, uint256, uint256)",
]);

export const poolAbi = parseAbi([
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 obsIndex, uint16 obsCard, uint16 obsCardNext, uint32 feeProtocol, bool unlocked)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function fee() view returns (uint24)",
]);

/** Annualise a Venus per-block rate. */
export function annualise(perBlock: bigint): number {
  return Number((perBlock * BLOCKS_PER_YEAR * 10_000n) / 10n ** 18n) / 100;
}

/** A V3 tick as a price ratio. */
export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}
