#!/usr/bin/env bash
#
# Copies the local index into the hosted database, trimmed to fit a free tier.
#
# What is dropped: the agent card JSON and tokenURI for registrations that are
# duplicates of another agent AND have never answered a call AND have never been
# rated. There are 117,696 copies of one agent all storing the identical card;
# the UI collapses them and never lists them, so the JSON is pure weight.
#
# What is kept: every agent ROW, so all counts stay real, plus full detail for
# anything a visitor can actually reach.
#
#   bash scripts/sync-hosted.sh
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET=$(grep '^DATABASE_URL_UNPOOLED=' .env.vercel | cut -d= -f2- | tr -d '"')
[ -n "$TARGET" ] || { echo "no DATABASE_URL_UNPOOLED in .env.vercel"; exit 1; }
PSQL=(docker run --rm -i postgres:17-alpine psql "$TARGET" -v ON_ERROR_STOP=1)
LOCAL=(docker exec -i assay-db psql -U assay -d assay -v ON_ERROR_STOP=1)

echo "== truncating target =="
"${PSQL[@]}" -c "truncate agents, endpoints, probes, index_state restart identity cascade;" >/dev/null

echo "== agents (card/token_uri trimmed on unreachable duplicates) =="
docker exec assay-db psql -U assay -d assay -c "\copy (
  with keep as (
    select a.id from agents a
    left join (select dedup_key, min(id) as rep from agents where dedup_key is not null group by 1) r
      on r.dedup_key = a.dedup_key
    left join (select distinct agent_id from probes where ok) p on p.agent_id = a.id
    where a.dedup_key is null or a.id = r.rep or p.agent_id is not null or a.client_count > 0
  )
  select a.id, a.owner,
         case when k.id is null then null else a.token_uri end,
         a.card_status,
         case when k.id is null then null else a.card end,
         a.card_host, a.name, a.description, a.dedup_key,
         a.endpoint_count, a.client_count, a.resolved_at, a.created_at
  from agents a left join keep k on k.id = a.id
) to stdout" | "${PSQL[@]}" -c "\copy agents (id,owner,token_uri,card_status,card,card_host,name,description,dedup_key,endpoint_count,client_count,resolved_at,created_at) from stdin"

echo "== endpoints =="
docker exec assay-db psql -U assay -d assay -c "\copy (select id, agent_id, type, url from endpoints) to stdout" \
  | "${PSQL[@]}" -c "\copy endpoints (id,agent_id,type,url) from stdin"

echo "== probes (latest per endpoint; history is not rendered) =="
docker exec assay-db psql -U assay -d assay -c "\copy (
  select distinct on (endpoint_id) id, endpoint_id, agent_id, checked_at, ok, status_code, latency_ms, error
  from probes order by endpoint_id, checked_at desc
) to stdout" | "${PSQL[@]}" -c "\copy probes (id,endpoint_id,agent_id,checked_at,ok,status_code,latency_ms,error) from stdin"

echo "== index_state =="
docker exec assay-db psql -U assay -d assay -c "\copy (select key, value, updated_at from index_state) to stdout" \
  | "${PSQL[@]}" -c "\copy index_state (key,value,updated_at) from stdin"

echo "== sequences =="
"${PSQL[@]}" -c "select setval('endpoints_id_seq', coalesce((select max(id) from endpoints),1));
                 select setval('probes_id_seq',    coalesce((select max(id) from probes),1));" >/dev/null

echo "== materialising views on the target =="
DATABASE_URL="$TARGET" npx tsx scripts/finalize.ts

echo
"${PSQL[@]}" -c "select pg_size_pretty(pg_database_size(current_database())) as hosted_size,
                        (select count(*) from agents)  as agents,
                        (select count(*) from probes)  as probes,
                        (select count(*) from probes where ok) as live;"
