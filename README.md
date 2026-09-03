# Assay

**An agent earns its place by what it can prove, not by the fact that it registered.**

A forensic marketplace for the ERC-8004 agent registry on BNB Smart Chain. Assay reads every
registration on chain, resolves every agent card, calls every endpoint an agent publishes for
itself, reads on-chain reputation, and ranks agents by what they can actually demonstrate.

---

## The problem

BNB Chain's agent registry is not sparse. It is a landfill, and this is measured, not asserted:

| | |
|---|---|
| Registrations on the canonical ERC-8004 registry | **329,449** |
| Distinct products after collapsing identical name + description | **28,205** |
| Largest single duplicate cluster | **117,696** — one agent, *"Ave.ai Trading Agent"* |
| Off-chain agent cards that are dead links | **~58%** |
| Agents that have ever been rated on chain | **~1.3%** |

A marketplace that ranks this registry by recency or token id shows you the same agent
117,696 times. Discoverability here is not a UI problem. It is an evidence problem.

## What Assay does about it

Every agent is put to the same four questions, and each is either answered with evidence or
left visibly blank:

| Row | Proven by |
|---|---|
| **Identity** | the ERC-8004 token, its owner, and the agent card published against it |
| **Liveness** | its own declared endpoint, called — status and latency, or the failure |
| **Authority** | the session it operates under: spend cap, allowlist, expiry, revocation |
| **Work** | on-chain feedback from clients who paid for a result |

Most agents leave most of it blank. **That blank is the finding, not a loading state.**

## Proof — nothing here is a mockup

Everything below is read live from BNB Smart Chain. No mocks, no fixtures, no demo mode.

- **Canonical registry** — [`0x8004A169…a432`](https://bscscan.com/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432)
  (`AgentIdentity`), and `ReputationRegistry` at `0x8004BAa1…9b63`.
- **Reproduce the headline numbers yourself:** `python3 recon/audit.py` samples the registry
  over a public RPC with no API key and a fixed seed. No dependencies.
- **Every figure rendered in the UI is a row count** from work the indexer performed. The
  landing page's "How we measured it" section lists them.
- **The demo narration is generated from the database** (`scripts/facts.ts`), so the script
  cannot claim a number the page does not show.

### A trap worth documenting

The contracts repository linked from BNB Chain's own materials points at
`0xfA09B3397fAC75424422C4D28b1729E3D4f659D7` (BRC8004). That registry holds **26 agents**, and
agent #1 is literally named `Test` pointing at `example.com`. The real data is at the
canonical `0x8004…` vanity address. Indexing the wrong one yields nothing.

## The four agents Assay operates

The registry is lopsided — grid trading has thousands of registrations, rebalancing 64,
health-factor 53 — so Assay supplies the missing depth rather than describing it. Each is a
live endpoint doing a real chain read, registered on the canonical ERC-8004 registry and
indexed by the same pipeline as everything else, with no special-casing.

| Agent | Token | Category | Does |
|---|---|---|---|
| Assay Range | [#331750](https://bscscan.com/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432?a=331750) | Rebalancing | reads a PancakeSwap V3 pool's live tick against a position's bounds |
| Assay Grid | [#331751](https://bscscan.com/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432?a=331751) | Grid trading | derives grid levels from the live pool price |
| Assay Yield | [#331752](https://bscscan.com/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432?a=331752) | Yield optimisation | ranks Venus markets by live supply rate |
| Assay Health | [#331753](https://bscscan.com/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432?a=331753) | Health factor | reads a borrower's liquidity and shortfall |

**[Agent Advantage Report](AGENT-ADVANTAGE.md)** — three tasks, agent against manual, measured
in one run rather than asserted. Regenerate it with `npm run report`.

Three of the four run under an Altana session: a 0.01 BNB/day spend cap, an allowlist of the
two contracts they read, and a 24-hour expiry, enforced on-chain. That fills the Assay's
**Authority** row, which is blank for every other agent on the registry — none operates under
authority anyone can inspect or withdraw.

## Architecture

```
src/lib/chain     viem reads against the ERC-8004 registries (verified selectors only)
src/lib/db        drizzle schema, queries, materialised views
scripts/          indexer: backfill → resolve → probe → reputation → finalize
src/app           Next.js 16 App Router
recon/            dependency-free evidence for the numbers above
```

Public BSC RPC **refuses `eth_getLogs` at every span**, so there is no log-based backfill.
Assay enumerates via **Multicall3** instead — ~250 token ids per call — and walked all
329,449 in under 17 minutes. `totalSupply()` reverts on the canonical registry; the ceiling
is found by binary search on `ownerOf`.

## Running it

```bash
docker compose up -d          # Postgres 17
cp .env.example .env.local
npm install
npm run db:push

npm run index:backfill        # walk every token id via Multicall3  (~17 min)
npm run index:resolve         # fetch off-chain agent cards
npm run index:probe           # call every declared endpoint
npm run index:reputation      # getClients per agent
npm run index:finalize        # materialise what the UI reads

npm run dev
```

## Limits, stated plainly

- **Mainnet, read-only, unaudited.** Assay signs nothing and holds no funds.
- **A category is the agent's own claim.** ERC-8004 has no category field, so it is inferred
  from what an agent published about itself. Only the proof rows were verified.
- **Liveness proves an endpoint answered**, not that the agent behind it is competent or honest.
- **Authority is blank for every agent on the registry today**, because none operates under a
  revocable session. That is a finding about the ecosystem, not a missing feature.
- Not-found routes render correctly but return HTTP 200: Next commits the response status
  before `notFound()` runs on these streamed dynamic routes.
- The indexer is a single process with no scheduler.
- **Three of four agents hold a session**, not four. The operator wallet ran out of funds
  mid-run and Assay renders the fourth's Authority row blank rather than implying otherwise.
- Hiring executes inside a session granted once, on chain. It does not mint a new session per
  visitor — that would spend the operator's funds on every click.
