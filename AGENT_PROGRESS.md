# Phases

`ENGINEERING.md` points here for the current phase.

- [x] **0 · Scaffold** — Next 16.3.4 / React 19.2.8 / Tailwind 4, Postgres 17 in Docker,
      tokens, build rules. Gate green.
- [x] **1 · Indexer** — all **329,449** agents walked via Multicall3 (16.7 min; public RPC
      refuses `eth_getLogs` at any span). Cards resolved, duplicates clustered,
      1,950 endpoints probed, reputation read for every agent.
- [x] **2 · The Assay + ledger** — proof card, compressed proof marks, ledger, detail route
      with full evidence, landing page.
- [x] **2b · Redesign** — paper skeuomorphism replaced on the client's brief with
      bento structure + dark/light minimalism + glass on elevated surfaces only.
      Geist replaces IBM Plex. Contrast re-verified in both themes.
- [x] **3 · Agent Diversity** — **resolved by classification, not by building agents.**
      An earlier claim that rebalancing and health-factor agents "do not exist" came from a
      300-agent sample and was wrong. Across all 329,449: grid 5,259 · yield 73 ·
      rebalancing 31 · health 17. Categories are now materialised as a GIN-indexed column
      (`npm run index:finalize`), surfaced at equal depth on the landing, and browsable at
      `/category/[id]` ranked by proof. The UI states plainly that a category is the
      agent's own claim while the proof marks are what was checked.
- [x] **3b · Harden** — loading skeletons, error boundary naming the real failure,
      agent 404, ledger empty state, and `overflow-wrap` on every user-controlled string
      (the registry contains 100-character unbroken names and 2,000-character descriptions).
- [ ] **4 · Altana sessions** — grant, spend cap, allowlist, expiry, real BSC tx, **revoke**.
      Fills the Assay's Authority row, which is blank for every agent on the registry today.
- [ ] **5 · Hire flow** — ERC-8183 + x402/B402. The rubric's "end-to-end journey".
- [ ] **6 · Agent Advantage Report** — 3 real tasks, agent vs manual, ≥1 trading/security.
- [ ] **7 · README as proof surface, demo video, run-of-show, pre-flight.**

## Benchmark, 2 Sep

Strong: evidence, data quality. Weak: rubric fit
(no hire flow, Agent Diversity failing), integration depth (three of four bounties
untouched; the unportability test currently fails), measurable advantage (absent).

Two P0s found and fixed: a `postgres` client leaked a pool on every HMR reload until the app
hung with zero connections; and per-request window functions over 329k rows cost 2.2s per
page, now materialised (`npm run index:finalize`) at 0.50s.

## Known limits

- **Not-found routes return HTTP 200.** `/agent/<unknown>` and `/category/<unknown>` render
  the correct not-found page, but Next 16 has already committed the response status by the
  time `notFound()` runs on these streamed dynamic routes. Users see the right page;
  crawlers and uptime monitors see a 200. Removing `force-dynamic` did not change it.
- Mainnet only. No audit. Single-process indexer, no scheduler.
- A category is **inferred** from the name and description an agent published for itself.
  It is the agent's own claim; only the proof marks were verified.
- Liveness proves an endpoint responded, not that the agent behind it is competent or honest.

## Indexer order

```
npm run index:backfill    # walk token ids     (~17 min)
npm run index:resolve     # fetch agent cards
npm run index:probe       # call every endpoint
npm run index:reputation  # getClients per agent
npm run index:finalize    # materialise what the UI reads  ← after any of the above
```
