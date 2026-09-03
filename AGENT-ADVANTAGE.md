◇ injected env (6) from .env.local // tip: ⌘ custom filepath { path: '/custom/path/.env' }
◇ injected env (0) from .env // tip: ⌘ multiple files { path: ['.env.local', '.env'] }
# Agent Advantage Report

**Assay · BNB Chain Smart Money Era · TermiX challenge**

Generated 2026-09-03T10:13:40.187Z by `scripts/advantage-report.ts`. Every number below
was measured in a single run against BNB Smart Chain mainnet, not estimated.
Re-run the script and it regenerates itself.

Agents were called at `http://localhost:3000` — the deployed origin was unreachable from this network at the time of the run; the handler is byte-identical.

## Summary

| | Agent | Manual |
|---|---|---|
| Wall-clock across 3 tasks | **588 ms** | 1889 ms |
| Chain reads / requests | 3 | 10 |
| Decoding and arithmetic steps | 0 | 12 |
| Answers matching the manual result | 3 of 3 | — |

Agent path is **3.21x** the speed of the manual path
on wall-clock, and asks the user for **7 fewer chain reads**.

### What this does *not* claim

- The manual timings are a **best case**. They exclude finding contract addresses,
  reading ABIs, and knowing that `supplyRatePerBlock` must be annualised — all of
  which a person pays for and this harness does not.
- Both paths hit the same RPC, so network latency is common to both and cancels.
- Correctness is the real advantage here, not milliseconds. Every manual path
  below requires decoding a signed integer, checking an error code before trusting
  a value, or applying a unit conversion — each a place to be quietly wrong, and a
  wrong answer about a liquidation costs more than the seconds saved.

## Task 1 — Find the best live lending rate on BNB Chain

**Category:** Yield optimisation · high-stakes (funds at risk)  
**Question:** Which Venus market pays most to supply right now?

| | Agent | Manual |
|---|---|---|
| Time | **196 ms** | 1521 ms |
| Chain reads | 1 | 6 |
| Steps the user performs | 1 (ask) | 4 |
| Cost | 0 (session-bounded, no spend) | gas-free reads |

**What the manual path requires:**

1. Locate five vToken contract addresses
1. Call supplyRatePerBlock() on each, one at a time
1. Annualise each per-block rate over 10,512,000 blocks
1. Sort and pick the highest

**Actual output — agent:**

```
Best live supply rate is vUSDT at 0.47% APY.
```

**Actual output — manual:**

```
Best live supply rate is vUSDT at 0.47% APY.
```

> The two agree exactly. The agent is not approximating the manual answer; it is the same answer, reached without the intervening steps.

## Task 2 — Decide whether a lending position is about to be liquidated

**Category:** Health-factor monitoring · high-stakes (funds at risk)  
**Question:** Is this borrower liquidatable, and by how much?

| | Agent | Manual |
|---|---|---|
| Time | **201 ms** | 197 ms |
| Chain reads | 1 | 2 |
| Steps the user performs | 1 (ask) | 4 |
| Cost | 0 (session-bounded, no spend) | gas-free reads |

**What the manual path requires:**

1. Find the Venus Comptroller address
1. Call getAccountLiquidity(address) and decode three uint256 returns
1. Check the error code before trusting the other two
1. Convert wei to USD and work out which of liquidity/shortfall applies

**Actual output — agent:**

```
No open borrow, or no collateral posted. Nothing to protect.
```

**Actual output — manual:**

```
No open borrow, or no collateral posted. Nothing to protect.
```

> The two agree exactly. The agent is not approximating the manual answer; it is the same answer, reached without the intervening steps.

## Task 3 — Check whether a liquidity position still earns

**Category:** Rebalancing · high-stakes (funds at risk)  
**Question:** Is this PancakeSwap V3 position inside its range?

| | Agent | Manual |
|---|---|---|
| Time | **191 ms** | 171 ms |
| Chain reads | 1 | 2 |
| Steps the user performs | 1 (ask) | 4 |
| Cost | 0 (session-bounded, no spend) | gas-free reads |

**What the manual path requires:**

1. Find the pool address for the pair and fee tier
1. Call slot0() and decode a signed int24 tick out of the second return word
1. Compare the tick against the position's bounds
1. Work out the drift if it has fallen outside

**Actual output — agent:**

```
Position is earning. No action.
```

**Actual output — manual:**

```
Position is earning. No action.
```

> The two agree exactly. The agent is not approximating the manual answer; it is the same answer, reached without the intervening steps.

## Where the agents live

All four are registered on the canonical ERC-8004 registry on BSC mainnet and
indexed by Assay through the same pipeline as every other agent, with no
special-casing:

| Agent | Token | Category | Endpoint |
|---|---|---|---|
| Assay Range | [#331750](https://bscscan.com/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432?a=331750) | Rebalancing | `http://localhost:3000/api/agents/range` |
| Assay Grid | [#331751](https://bscscan.com/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432?a=331751) | Grid trading | `http://localhost:3000/api/agents/grid` |
| Assay Yield | [#331752](https://bscscan.com/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432?a=331752) | Yield optimisation | `http://localhost:3000/api/agents/yield` |
| Assay Health | [#331753](https://bscscan.com/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432?a=331753) | Health factor | `http://localhost:3000/api/agents/health` |

Three of the four operate under an Altana session — a 0.01 BNB/day spend cap, an
allowlist of the two contracts they read, and a 24-hour expiry, enforced on-chain.
The fourth is ungranted because the operator wallet ran out of funds, and Assay
renders its Authority row blank rather than implying otherwise.

