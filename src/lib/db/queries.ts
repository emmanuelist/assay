import { sql } from "drizzle-orm";
import { db } from ".";
import type { CardStatus } from "../chain/card";
import { CATEGORIES, type CategoryId } from "../categories";

export interface RegistryStats {
  registered: number; distinct: number; withEndpoint: number;
  live: number; rated: number; maxId: bigint | null; indexedAt: Date | null;
}

export type Liveness =
  | { state: "live"; checkedAt: Date; latencyMs: number; statusCode: number }
  | { state: "dead"; checkedAt: Date; error: string; statusCode: number | null }
  | { state: "unprobed" }
  | { state: "no-endpoint" };

export interface AgentSummary {
  id: bigint;
  name: string | null;
  description: string | null;
  owner: string | null;
  cardStatus: CardStatus | null;
  cardHost: string | null;
  clusterSize: number;
  endpointCount: number;
  clientCount: number | null;
  liveness: Liveness;
}

/**
 * `latest_probe_mv` and `cluster_sizes` are materialised by `npm run index:finalize`.
 * Both were previously computed per request — a window over 329k rows cost ~1.1s
 * of every page view, which is batch work wearing a query's clothes.
 */

function toLiveness(r: {
  endpoint_count: number; ok: boolean | null; status_code: number | null;
  latency_ms: number | null; error: string | null; checked_at: Date | null;
}): Liveness {
  if (r.endpoint_count === 0) return { state: "no-endpoint" };
  if (r.checked_at === null) return { state: "unprobed" };
  if (r.ok) {
    return {
      state: "live", checkedAt: r.checked_at,
      latencyMs: r.latency_ms ?? 0, statusCode: r.status_code ?? 200,
    };
  }
  return {
    state: "dead", checkedAt: r.checked_at,
    error: r.error ?? "no response", statusCode: r.status_code,
  };
}

export async function registryStats(): Promise<RegistryStats> {
  const [row] = await db.execute<{
    registered: string; distinct: string; with_endpoint: string; rated: string; live: string;
  }>(sql`
    select
      (select count(*) from agents)                                        as registered,
      (select count(*) from cluster_sizes)                                 as distinct,
      (select count(*) from agents where endpoint_count > 0)               as with_endpoint,
      (select count(*) from agents where client_count > 0)                 as rated,
      (select count(*) from latest_probe_mv where ok)                      as live
  `);

  const [state] = await db.execute<{ value: { max?: string }; updated_at: Date }>(sql`
    select value, updated_at from index_state where key = 'backfill:identity'
  `);

  return {
    registered: Number(row?.registered ?? 0),
    distinct: Number(row?.distinct ?? 0),
    withEndpoint: Number(row?.with_endpoint ?? 0),
    live: Number(row?.live ?? 0),
    rated: Number(row?.rated ?? 0),
    maxId: state?.value?.max ? BigInt(state.value.max) : null,
    indexedAt: state?.updated_at ?? null,
  };
}

export type AgentSort = "provable" | "rated" | "newest";

export interface ListOptions {
  sort?: AgentSort;
  /** collapse duplicate clusters to one representative row */
  collapse?: boolean;
  liveOnly?: boolean;
  search?: string | null;
  limit?: number;
  offset?: number;
}

/**
 * The default ordering is deliberate: a registry where 77% of cards are copies
 * cannot be sorted by recency or id without showing the same agent 108 times.
 * "provable" ranks by what an agent can demonstrate — a live endpoint first,
 * then on-chain clients, then a resolvable card — and pushes the bulk registrants down.
 */
export async function listAgents(opts: ListOptions = {}): Promise<AgentSummary[]> {
  const { sort = "provable", collapse = true, liveOnly = false, search = null,
          limit = 60, offset = 0 } = opts;

  const order =
    sort === "rated"
      ? sql`coalesce(a.client_count, 0) desc, live_rank desc, a.id asc`
      : sort === "newest"
        ? sql`a.id desc`
        : sql`live_rank desc,
             coalesce(a.client_count,0) desc,
             coalesce(lp.latency_ms, 2147483647) asc,
             coalesce(cs.size, 1) asc, a.id asc`;

  const rows = await db.execute<{
    id: string; name: string | null; description: string | null; owner: string | null;
    card_status: CardStatus | null; card_host: string | null;
    cluster_size: string; endpoint_count: number; client_count: number | null;
    ok: boolean | null; status_code: number | null; latency_ms: number | null;
    error: string | null; checked_at: Date | null;
  }>(sql`
    select a.id, a.name, a.description, a.owner, a.card_status, a.card_host,
           coalesce(cs.size, 1) as cluster_size,
           a.endpoint_count, a.client_count,
           lp.ok, lp.status_code, lp.latency_ms, lp.error, lp.checked_at,
           (case when lp.ok then 2 when lp.checked_at is not null then 0 else 1 end) as live_rank
    from agents a
    left join cluster_sizes cs   on cs.dedup_key = a.dedup_key
    left join latest_probe_mv lp on lp.agent_id  = a.id
    where true
      ${collapse ? sql`and (a.dedup_key is null or a.id = cs.representative_id)` : sql``}
      ${liveOnly ? sql`and lp.ok` : sql``}
      ${search ? sql`and (a.name ilike ${"%" + search + "%"} or a.description ilike ${"%" + search + "%"})` : sql``}
    order by ${order}
    limit ${limit} offset ${offset}
  `);

  return rows.map((r) => ({
    id: BigInt(r.id),
    name: r.name,
    description: r.description,
    owner: r.owner,
    cardStatus: r.card_status,
    cardHost: r.card_host,
    clusterSize: Number(r.cluster_size),
    endpointCount: r.endpoint_count,
    clientCount: r.client_count,
    liveness: toLiveness(r),
  }));
}

export interface Cluster {
  dedupKey: string;
  name: string | null;
  description: string | null;
  size: number;
  representativeId: bigint;
}

/**
 * The landfill, measured. One template accounts for tens of thousands of
 * registrations; showing the top clusters is the fastest way to make the
 * registry's actual condition legible.
 */
export async function biggestClusters(limit = 6): Promise<Cluster[]> {
  const rows = await db.execute<{
    dedup_key: string; name: string | null; description: string | null;
    size: string; representative_id: string;
  }>(sql`
    select cs.dedup_key, a.name, a.description, cs.size, cs.representative_id
    from cluster_sizes cs
    join agents a on a.id = cs.representative_id
    where cs.size > 1
    order by cs.size desc
    limit ${limit}
  `);
  return rows.map((r) => ({
    dedupKey: r.dedup_key,
    name: r.name,
    description: r.description,
    size: Number(r.size),
    representativeId: BigInt(r.representative_id),
  }));
}

/** Everything the Assay needs for one agent. */
export async function getAgent(id: bigint): Promise<AgentSummary | null> {
  const [a] = await listAgentsById([id]);
  return a ?? null;
}

async function listAgentsById(ids: bigint[]): Promise<AgentSummary[]> {
  if (!ids.length) return [];
  const rows = await db.execute<{
    id: string; name: string | null; description: string | null; owner: string | null;
    card_status: CardStatus | null; card_host: string | null;
    cluster_size: string; endpoint_count: number; client_count: number | null;
    ok: boolean | null; status_code: number | null; latency_ms: number | null;
    error: string | null; checked_at: Date | null;
  }>(sql`
    select a.id, a.name, a.description, a.owner, a.card_status, a.card_host,
           a.endpoint_count, a.client_count,
           coalesce(cs.size, 1) as cluster_size,
           lp.ok, lp.status_code, lp.latency_ms, lp.error, lp.checked_at
    from agents a
    left join cluster_sizes cs   on cs.dedup_key = a.dedup_key
    left join latest_probe_mv lp on lp.agent_id  = a.id
    where a.id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})
  `);
  return rows.map((r) => ({
    id: BigInt(r.id), name: r.name, description: r.description, owner: r.owner,
    cardStatus: r.card_status, cardHost: r.card_host,
    clusterSize: Number(r.cluster_size), endpointCount: r.endpoint_count,
    clientCount: r.client_count, liveness: toLiveness(r),
  }));
}

export interface AgentEvidence {
  card: unknown | null;
  probes: { id: number; url: string; ok: boolean; statusCode: number | null;
            latencyMs: number | null; error: string | null; checkedAt: Date }[];
  siblings: string[];
}

/** Everything backing one agent's Assay — the raw material, so a reader can check us. */
export async function agentEvidence(id: bigint): Promise<AgentEvidence> {
  const [cardRow] = await db.execute<{ card: unknown; dedup_key: string | null }>(sql`
    select card, dedup_key from agents where id = ${id}
  `);

  const probeRows = await db.execute<{
    id: number; url: string; ok: boolean; status_code: number | null;
    latency_ms: number | null; error: string | null; checked_at: Date;
  }>(sql`
    select p.id, e.url, p.ok, p.status_code, p.latency_ms, p.error, p.checked_at
    from probes p join endpoints e on e.id = p.endpoint_id
    where p.agent_id = ${id}
    order by p.checked_at desc limit 20
  `);

  const siblingRows = cardRow?.dedup_key
    ? await db.execute<{ id: string }>(sql`
        select id from agents
        where dedup_key = ${cardRow.dedup_key} and id <> ${id}
        order by id limit 24
      `)
    : [];

  return {
    card: cardRow?.card ?? null,
    probes: probeRows.map((p) => ({
      id: p.id, url: p.url, ok: p.ok, statusCode: p.status_code,
      latencyMs: p.latency_ms, error: p.error, checkedAt: p.checked_at,
    })),
    siblings: siblingRows.map((s) => s.id),
  };
}

/** The most convincing live agent we have — used as the worked example on the landing. */
export async function featuredAgent(): Promise<AgentSummary | null> {
  const [row] = await listAgents({ sort: "provable", collapse: true, liveOnly: true, limit: 1 });
  return row ?? null;
}

export interface MethodCounts {
  cardsResolved: number; cardsDead: number;
  endpointsCalled: number; endpointsAnswered: number;
  reputationReads: number; malformed: number;
}

/** What the indexer actually did. Every figure is a row count, not a claim. */
export async function methodCounts(): Promise<MethodCounts> {
  const [r] = await db.execute<Record<string, string>>(sql`
    select
      (select count(*) from agents where card_status in ('inline','http'))   as cards_resolved,
      (select count(*) from agents where card_status = 'unreachable')        as cards_dead,
      (select count(*) from agents where card_status = 'malformed')          as malformed,
      (select count(*) from probes)                                          as endpoints_called,
      (select count(*) from probes where ok)                                 as endpoints_answered,
      (select count(*) from agents where client_count is not null)           as reputation_reads
  `);
  return {
    cardsResolved: Number(r.cards_resolved), cardsDead: Number(r.cards_dead),
    malformed: Number(r.malformed), endpointsCalled: Number(r.endpoints_called),
    endpointsAnswered: Number(r.endpoints_answered), reputationReads: Number(r.reputation_reads),
  };
}


export interface CategoryCount {
  id: CategoryId; label: string; blurb: string; hue: string;
  total: number; withEndpoint: number; live: number; rated: number;
}

/** Reads the GIN-indexed column written by `npm run index:finalize`. */
const catSql = (id: string) => sql`(a.categories @> array[${id}]::text[])`;

/** Counts for all four required categories, in one pass. */
export async function categoryCounts(): Promise<CategoryCount[]> {
  const parts = CATEGORIES.map(
    (c) => sql`
      select ${c.id}::text as id,
             count(*)::int as total,
             count(*) filter (where a.endpoint_count > 0)::int as with_endpoint,
             count(*) filter (where lp.ok)::int as live,
             count(*) filter (where a.client_count > 0)::int as rated
      from agents a
      left join latest_probe_mv lp on lp.agent_id = a.id
      where ${catSql(c.id)}`,
  );
  const rows = await db.execute<{
    id: CategoryId; total: number; with_endpoint: number; live: number; rated: number;
  }>(sql.join(parts, sql` union all `));

  return CATEGORIES.map((c) => {
    const r = rows.find((x) => x.id === c.id);
    return {
      id: c.id, label: c.label, blurb: c.blurb, hue: c.hue,
      total: r?.total ?? 0, withEndpoint: r?.with_endpoint ?? 0,
      live: r?.live ?? 0, rated: r?.rated ?? 0,
    };
  });
}

/** Agents in one category, ranked by what they can prove. */
export async function agentsInCategory(
  id: CategoryId, limit = 40,
): Promise<AgentSummary[]> {
  const cat = CATEGORIES.find((c) => c.id === id);
  if (!cat) return [];
  const rows = await db.execute<{
    id: string; name: string | null; description: string | null; owner: string | null;
    card_status: CardStatus | null; card_host: string | null;
    cluster_size: string; endpoint_count: number; client_count: number | null;
    ok: boolean | null; status_code: number | null; latency_ms: number | null;
    error: string | null; checked_at: Date | null;
  }>(sql`
    select a.id, a.name, a.description, a.owner, a.card_status, a.card_host,
           coalesce(cs.size, 1) as cluster_size, a.endpoint_count, a.client_count,
           lp.ok, lp.status_code, lp.latency_ms, lp.error, lp.checked_at
    from agents a
    left join cluster_sizes cs   on cs.dedup_key = a.dedup_key
    left join latest_probe_mv lp on lp.agent_id  = a.id
    where ${catSql(cat.id)}
      and (a.dedup_key is null or a.id = cs.representative_id)
    order by (case when lp.ok then 2 when lp.checked_at is not null then 0 else 1 end) desc,
             coalesce(a.client_count,0) desc,
             coalesce(lp.latency_ms, 2147483647) asc,
             a.id asc
    limit ${limit}
  `);
  return rows.map((r) => ({
    id: BigInt(r.id), name: r.name, description: r.description, owner: r.owner,
    cardStatus: r.card_status, cardHost: r.card_host,
    clusterSize: Number(r.cluster_size), endpointCount: r.endpoint_count,
    clientCount: r.client_count, liveness: toLiveness(r),
  }));
}
