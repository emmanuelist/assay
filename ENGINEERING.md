# Assay — engineering rules and pinned context

**An agent earns its place by what it can prove, not by the fact that it registered.**

The on-chain reconnaissance these rules rest on is reproducible with `recon/`. The frontend's real data seam is `DATA_CONTRACTS.md`.
Current phase is marked in `AGENT_PROGRESS.md`.

## Repo layout

```
src/app              Next.js 16 App Router frontend
src/lib/chain        viem clients, ABIs, registry reads
src/lib/db           drizzle schema + queries
scripts/             backfill + probe workers (tsx)
recon/               reproducible on-chain evidence (python, no deps)
```

## Pinned versions

| | |
|---|---|
| Node | 26.x |
| Next.js | 16.3.4 — **App Router only. Pages Router must never appear.** |
| React | 19.2.8 |
| Tailwind | v4 — CSS-first config in `globals.css`. **No `tailwind.config.js`.** |
| viem | 2.56.x |
| drizzle-orm | 0.45.x · Postgres 17 |

## Chain facts — verified on BSC mainnet, Sep 2 2026. Do not re-derive.

| | |
|---|---|
| IdentityRegistry (canonical ERC-8004) | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| ReputationRegistry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |
| Max agent id (Sep 2) | 329,359 |

- `0xfA09B3397fAC75424422C4D28b1729E3D4f659D7` (BRC8004) is a **decoy** — 26 agents,
  agent #1 is named `Test`. Never index it.
- `totalSupply()` **reverts** on the canonical registry — it is not enumerable. Walk ids
  with `ownerOf` / `tokenURI`; find the ceiling by binary search on `ownerOf`.
- `getFeedbackCount` / `getSummary` **revert** on the ReputationRegistry.
  The verified read is **`getClients(uint256)`**.
- **Public BSC RPC refuses `eth_getLogs` at any span** ("limit exceeded"). There is no
  log-based backfill. Enumerate via **Multicall3 `aggregate3`** — batches of ~250 work in
  ~5s; JSON-RPC array batching caps at 10 and is useless here.

## Rules

1. **No mocks, no fake data, no demo mode.** Every rendered value comes from the chain, the
   database, or a live probe. On a registry this dirty a mock is indistinguishable from a
   bug, and it is the first thing a judge looks for.
2. **An absent value renders as absent.** Never substitute a placeholder, a zero, or a
   plausible default for data that is missing. Most of the 329k agents *are* mostly empty
   and the product's entire claim is that it shows this honestly.
3. **Verify every SDK call against installed types** (`node_modules/<pkg>/**/*.d.ts`) or
   official docs before writing it. `@altananetwork/sdk` and `@bnbagent/studio-cli` exist on
   npm (0.8.0 / 0.0.13) but their surfaces are **unverified** — check before use.
4. **Phase-gated.** Build the current phase only, then stop for confirmation.
5. **Every write persists, and the response returns the persisted row** — never an object
   built in memory.
6. **No secrets in the repo.** Env vars only; blank keys in `.env.example`.
7. **Never scope-cut silently.** Argue tradeoffs on merit — data integrity, latency,
   attack surface — not on effort.

## Frontend conventions

- Tokens live in `src/app/globals.css` and **supersede** any design language described
  elsewhere. Semantic names only — never `gray-100` in a component.
- **Tailwind + Radix primitives only.** No MUI/Chakra/daisyUI/shadcn-default — a styled
  library puts this in the same visual bucket as thirty other entries.
- Fonts through `next/font` only. **Never add `<link>` tags to font CDNs.**
- Every animation checks `prefers-reduced-motion`.
- Async calls wrap in try/catch with a shared error component; a failure must never strand
  a flow in a terminal in-flight state.
- Agent ids are `bigint` end to end. **Never** let one become a JS `number` — ids exceed
  `Number.MAX_SAFE_INTEGER` in principle and precision loss is silent.

## Verification before any gate

```bash
npm run lint       # zero warnings
npm run typecheck
npm run build
```
