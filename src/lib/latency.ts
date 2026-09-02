/**
 * A response is not a good response. The product exists to help someone choose
 * an agent, so latency is banded rather than uniformly coloured "success".
 */
export type LatencyBand = "brisk" | "slow" | "laboured";

export function bandFor(ms: number): LatencyBand {
  if (ms < 800) return "brisk";
  if (ms < 2500) return "slow";
  return "laboured";
}

export const BAND_CLASS: Record<LatencyBand, string> = {
  brisk: "text-proven",
  slow: "text-ink-secondary",
  laboured: "text-refuted",
};

export const BAND_NOTE: Record<LatencyBand, string> = {
  brisk: "answered promptly",
  slow: "answered, but slowly",
  laboured: "answered only after a long wait",
};
