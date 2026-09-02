import { createPublicClient, http, type PublicClient } from "viem";
import { bsc } from "viem/chains";

const DEFAULT_RPCS = [
  "https://bsc-dataseed.binance.org/",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed2.defibit.io",
  "https://bsc-dataseed1.ninicoin.io",
];

export const rpcUrls: string[] =
  process.env.BSC_RPC_URLS?.split(",").map((s) => s.trim()).filter(Boolean) ??
  DEFAULT_RPCS;

/**
 * One client per RPC. The backfill saturates several endpoints at once, so we
 * round-robin rather than using a `fallback` transport — fallback serialises
 * onto a single healthy node and gives up most of the throughput.
 */
export const clients: PublicClient[] = rpcUrls.map((url) =>
  createPublicClient({
    chain: bsc,
    transport: http(url, { timeout: 60_000, retryCount: 2 }),
  }),
);

let cursor = 0;
export function nextClient(): PublicClient {
  const c = clients[cursor % clients.length];
  cursor += 1;
  return c;
}

export const publicClient = clients[0];
