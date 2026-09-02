# Data contracts

Every value the frontend renders crosses this seam. Written before the UI so no screen is
designed against imagined data. The governing fact below is why the shapes look like this.

## The governing fact

The registry is a landfill: ~329k registrations resolve to ~38 distinct products, ~2% of
cards declare a callable endpoint, ~1% have any on-chain client. **Most fields are null for
most agents, and that is the product's central claim, not a defect.**

Therefore every nullable field below is `T | null` in TypeScript, never `T` with a default.
A component that renders `0`, `"Unknown"`, or an em dash where the truth is "we looked and
there was nothing" is a bug — see ENGINEERING.md rule 2.

## `RegistryStats` — the landing headline

| field | type | source |
|---|---|---|
| `registered` | `number` | `count(agents)` — every minted token id |
| `distinct` | `number` | `count(distinct dedup_key)` — the honest product count |
| `withEndpoint` | `number` | agents declaring ≥1 callable endpoint |
| `live` | `number` | agents whose endpoint answered on its most recent probe |
| `rated` | `number` | agents with `client_count > 0` |
| `maxId` | `bigint` | backfill ceiling, grows during a run |
| `indexedAt` | `Date` | when the cursor last advanced |

`live ≤ withEndpoint ≤ distinct ≤ registered` must hold. If it ever doesn't, the indexer
is wrong — surface the error, do not clamp the numbers.

## `AgentSummary` — one row in any list

```ts
{ id: bigint; name: string | null; description: string | null;
  owner: string | null; cardStatus: CardStatus | null; cardHost: string | null;
  clusterSize: number;        // 1 = unique; 108 = one of the "Ave.ai" copies
  endpointCount: number;
  clientCount: number | null; // null = not yet read, 0 = read and genuinely none
  liveness: Liveness }
```

`clientCount` distinguishes **not yet measured** (`null`) from **measured as zero** (`0`).
These must never render the same way.

## `Liveness` — the proof, not a badge

```ts
type Liveness =
  | { state: "live";        checkedAt: Date; latencyMs: number; statusCode: number }
  | { state: "dead";        checkedAt: Date; error: string; statusCode: number | null }
  | { state: "unprobed" }               // has an endpoint, not yet called
  | { state: "no-endpoint" };           // declares nothing callable — ~98% of the registry
```

Four states, four distinct treatments. `no-endpoint` is the common case and must not look
like an error; it is simply the truth about most of the registry.

## `Assay` — the signature component's payload

Four rows, each independently provable or absent:

```ts
{ identity:  { id, owner, tokenUri, cardStatus, cardHost }
  liveness:  Liveness
  authority: AltanaSession | null   // phase 4 — null until then, rendered as absent
  work:      { clients: string[]; clientCount: number | null } }
```

`authority` is `null` until phase 4 lands. It renders as an honestly empty row — never
hidden, because an agent with no revocable session is exactly what the product is warning
about.
