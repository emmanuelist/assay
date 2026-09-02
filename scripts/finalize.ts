/**
 * Stage F — derive what the UI reads on every request.
 *
 * listAgents was computing count(*) over (partition by dedup_key) across all
 * 329k rows per page view. That is a batch computation wearing a query's
 * clothes: it changes only when the indexer runs, so it belongs here.
 *
 *   npm run index:finalize
 */
import "../src/lib/env";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { CATEGORIES } from "../src/lib/categories";

async function main() {
  const t = Date.now();

  console.log("building cluster_sizes …");
  await db.execute(sql`drop materialized view if exists cluster_sizes cascade`);
  await db.execute(sql`
    create materialized view cluster_sizes as
      select dedup_key, count(*)::int as size, min(id) as representative_id
      from agents where dedup_key is not null
      group by dedup_key
  `);
  await db.execute(sql`create unique index cluster_sizes_key_idx on cluster_sizes (dedup_key)`);
  await db.execute(sql`create index cluster_sizes_size_idx on cluster_sizes (size desc)`);
  await db.execute(sql`create index cluster_sizes_rep_idx on cluster_sizes (representative_id)`);

  console.log("building latest_probe …");
  await db.execute(sql`drop materialized view if exists latest_probe_mv cascade`);
  await db.execute(sql`
    create materialized view latest_probe_mv as
      select distinct on (agent_id)
             agent_id, ok, status_code, latency_ms, error, checked_at
      from probes order by agent_id, checked_at desc
  `);
  await db.execute(sql`create unique index latest_probe_agent_idx on latest_probe_mv (agent_id)`);
  await db.execute(sql`create index latest_probe_ok_idx on latest_probe_mv (ok, latency_ms)`);

  console.log("classifying categories …");
  // A regex over name||description for every request cost ~2.5s per page.
  // The inputs only change when the indexer runs, so classify once, here.
  await db.execute(sql`alter table agents add column if not exists categories text[]`);
  for (const c of CATEGORIES) {
    await db.execute(sql`
      update agents
      set categories = case
        when categories is null then array[${c.id}::text]
        when not (${c.id}::text = any(categories)) then array_append(categories, ${c.id}::text)
        else categories
      end
      where lower(coalesce(name,'') || ' ' || coalesce(description,'')) ~ ${c.pattern}
    `);
  }
  await db.execute(sql`create index if not exists agents_categories_idx on agents using gin (categories)`);

  console.log("indexing agents for the ledger …");
  await db.execute(sql`create index if not exists agents_name_trgm_idx on agents (lower(name))`);
  await db.execute(sql`analyze agents`);

  const [c] = await db.execute<{ clusters: string; agents: string }>(sql`
    select count(*) as clusters, coalesce(sum(size),0) as agents from cluster_sizes
  `);
  const cats = await db.execute<{ id: string; n: string }>(sql`
    select unnest(categories) as id, count(*) as n from agents
    where categories is not null group by 1 order by 2 desc
  `);
  for (const r of cats) console.log(`  ${r.id.padEnd(12)} ${Number(r.n).toLocaleString()}`);
  console.log(`\ndone in ${((Date.now() - t) / 1000).toFixed(1)}s — ${Number(c.clusters).toLocaleString()} clusters covering ${Number(c.agents).toLocaleString()} registrations`);
  process.exit(0);
}
main().catch((e) => { console.error("finalize failed:", e); process.exit(1); });
