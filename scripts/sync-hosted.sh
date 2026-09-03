#!/usr/bin/env bash
#
# Copies the local index into the hosted database, trimmed to fit a free tier.
#
# Dropped: agent card JSON and tokenURI for registrations that are duplicates
# AND have never answered a call AND have never been rated. One agent alone has
# 117,696 identical copies; the UI collapses them and never lists them.
# Kept: every agent ROW, so all counts stay real, plus full detail for anything
# a visitor can actually reach.
#
# Transfers are chunked. A single COPY of 329k rows loses the TLS connection to
# Neon partway through ("SSL error: unexpected eof"); each chunk is its own
# short-lived connection, so a drop costs one chunk instead of the whole run.
#
#   bash scripts/sync-hosted.sh
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET=$(grep '^DATABASE_URL_UNPOOLED=' .env.vercel | cut -d= -f2- | tr -d '"')
[ -n "$TARGET" ] || { echo "no DATABASE_URL_UNPOOLED in .env.vercel"; exit 1; }

# postgres:17-alpine's musl/OpenSSL build cannot negotiate SNI with Neon and
# fails every connect. The Debian image works.
psql_t() { docker run --rm -i postgres:17 psql "$TARGET" -v ON_ERROR_STOP=1 -q "$@"; }
local_q() { docker exec -i assay-db psql -U assay -d assay -v ON_ERROR_STOP=1 -q "$@"; }

CHUNK=${CHUNK:-20000}
MAXID=$(docker exec assay-db psql -U assay -d assay -tAc "select coalesce(max(id),0) from agents")

echo "== truncating target =="
psql_t -c "truncate agents, endpoints, probes, index_state restart identity cascade;"

echo "== building the keep-set locally (reachable agents keep full detail) =="
local_q -c "
  drop table if exists _keep;
  create table _keep as
    select a.id from agents a
    left join (select dedup_key, min(id) as rep from agents where dedup_key is not null group by 1) r
      on r.dedup_key = a.dedup_key
    left join (select distinct agent_id from probes where ok) p on p.agent_id = a.id
    where a.dedup_key is null or a.id = r.rep or p.agent_id is not null or a.client_count > 0;
  create unique index on _keep(id);"
echo "   keep-set: $(docker exec assay-db psql -U assay -d assay -tAc 'select count(*) from _keep') agents keep full detail"

echo "== agents in chunks of $CHUNK (max id $MAXID) =="
lo=0
while [ "$lo" -le "$MAXID" ]; do
  hi=$((lo + CHUNK))
  for attempt in 1 2 3; do
    if docker exec assay-db psql -U assay -d assay -q -c "\copy (
        select a.id, a.owner,
               case when k.id is null then null else a.token_uri end,
               a.card_status,
               case when k.id is null then null else a.card end,
               a.card_host, a.name, a.description, a.dedup_key,
               a.endpoint_count, a.client_count, a.resolved_at, a.created_at
        from agents a left join _keep k on k.id = a.id
        where a.id > $lo and a.id <= $hi
      ) to stdout" | psql_t -c "\copy agents (id,owner,token_uri,card_status,card,card_host,name,description,dedup_key,endpoint_count,client_count,resolved_at,created_at) from stdin"
    then break; fi
    echo "   chunk $lo-$hi failed (attempt $attempt), retrying"; sleep 5
    psql_t -c "delete from agents where id > $lo and id <= $hi;" || true
    [ "$attempt" = 3 ] && { echo "   chunk $lo-$hi FAILED after 3 attempts"; exit 1; }
  done
  printf "\r   %s / %s" "$hi" "$MAXID"
  lo=$hi
done
echo

echo "== endpoints =="
docker exec assay-db psql -U assay -d assay -q -c "\copy (select id, agent_id, type, url from endpoints) to stdout" \
  | psql_t -c "\copy endpoints (id,agent_id,type,url) from stdin"

echo "== probes (latest per endpoint; history is not rendered) =="
docker exec assay-db psql -U assay -d assay -q -c "\copy (
  select distinct on (endpoint_id) id, endpoint_id, agent_id, checked_at, ok, status_code, latency_ms, error
  from probes order by endpoint_id, checked_at desc
) to stdout" | psql_t -c "\copy probes (id,endpoint_id,agent_id,checked_at,ok,status_code,latency_ms,error) from stdin"

echo "== index_state =="
docker exec assay-db psql -U assay -d assay -q -c "\copy (select key, value, updated_at from index_state) to stdout" \
  | psql_t -c "\copy index_state (key,value,updated_at) from stdin"

psql_t -c "select setval('endpoints_id_seq', coalesce((select max(id) from endpoints),1));
           select setval('probes_id_seq',    coalesce((select max(id) from probes),1));" >/dev/null
local_q -c "drop table if exists _keep;"

echo "== materialising views on the target =="
DATABASE_URL="$TARGET" npx tsx scripts/finalize.ts

echo
psql_t -c "select pg_size_pretty(pg_database_size(current_database())) as hosted,
                  (select count(*) from agents) as agents,
                  (select count(*) from probes where ok) as live;"
