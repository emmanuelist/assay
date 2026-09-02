# Assay — product truth

Written from on-chain reconnaissance and the hackathon rubric, not from an interview. Visual decisions live in `DESIGN.md`; this file is product only.

## What it is

A forensic marketplace for AI agents on BNB Smart Chain. It reads the canonical ERC-8004
registry, resolves every agent card, calls every endpoint an agent declares, reads on-chain
reputation, and ranks agents by **what they can demonstrate** rather than by the fact that
they registered.

## The problem it exists for

The registry is a landfill, and this is measured, not asserted:

| | |
|---|---|
| Registrations | **329,449** |
| Distinct products after collapsing identical name+description | **28,205** |
| Largest single duplicate cluster | **117,696** — one agent, "Ave.ai Trading Agent" |
| Declare a callable endpoint | **3,450** (1.0%) |
| Actually answered when called | **1,240** |
| Have ever been rated on chain | **4,401** (1.3%) |
| Off-chain agent cards that are dead links | **58%** |

A marketplace that ranks this registry by recency or id shows the same agent 117,696 times.
Discoverability is not a UI problem here; it is an evidence problem.

## Who uses it

1. **Someone hiring an agent**, who per the rubric needs **zero blockchain knowledge**. They
   need to know: does this thing work, has anyone used it, what can it spend, can I stop it.
2. **Hackathon judges**, ~4 minutes each, scoring Functionality, Data Quality, and Agent
   Diversity. They are scanning for mocks and will not read documentation.

These pull in opposite directions and that tension is the core design problem.

## Primary workflow

Land → understand the gap between registered and provable → filter to agents that answer →
open one → read its proof → hire it under a revocable session.

## What must be true

- **Nothing is a mock.** Every figure comes from the chain, the database, or a live probe.
- **Absence renders as absence.** ~98% of agents are mostly empty; showing that honestly is
  the product's entire claim, not a defect to be papered over.
- **The distinction between "not measured" and "measured as zero" is never collapsed.**

## Competitive position

The main track asks entrants to build the official BNB Agent Studio marketplace, so nearly
every competitor will ship a ranked directory. A directory over this data is the failure
mode. Assay's claim is the inverse: rank by proof, and let most of the registry render empty.

## Constraints

- Deadline **9 Sep 2026**. Judged 9–23 Sep.
- BSC mainnet; public RPC refuses `eth_getLogs`, so enumeration is Multicall3-based.
- Bounties available on the same submission: Altana (sessions + revocation), PancakeSwap
  (LP/yield benefit), TermiX (measured agent-advantage report).
