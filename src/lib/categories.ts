/**
 * The four categories the rubric requires, surfaced at equal depth.
 *
 * Agents do not declare a category — ERC-8004 has no such field — so it is
 * inferred from the name and description an agent published for itself. That is
 * a claim by the agent, not a verified fact, and the UI says so: a category tells
 * you what an agent says it does, while the proof rows tell you what it can show.
 */
export const CATEGORIES = [
  {
    id: "rebalancing",
    label: "Rebalancing",
    blurb: "Manages LP ranges and resets positions as price moves.",
    hue: "var(--cat-rebalance)",
    pattern: "rebalanc|lp range|reposition|concentrated liquidity|range order",
  },
  {
    id: "grid",
    label: "Grid trading",
    blurb: "Places and manages automated grid orders.",
    hue: "var(--cat-grid)",
    pattern: "grid",
  },
  {
    id: "yield",
    label: "Yield optimisation",
    blurb: "Routes liquidity toward the highest available return.",
    hue: "var(--cat-yield)",
    pattern: "yield|apy|\\mapr\\M|farming|optimi[sz]e liquidity",
  },
  {
    id: "health",
    label: "Health factor",
    blurb: "Watches lending positions for liquidation risk.",
    hue: "var(--cat-health)",
    pattern: "health factor|liquidation|collateral ratio|ltv",
  },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id) ?? null;
