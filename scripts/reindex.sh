#!/usr/bin/env bash
# Waits for any running resolve, then probes every endpoint and materialises.
set -u
cd "$(dirname "$0")/.."
while pgrep -f 'scripts/resolve.ts' >/dev/null; do sleep 20; done
echo "[reindex] resolve done, probing endpoints"
npx tsx scripts/probe.ts --per-host 6 --stale-hours 999999
echo "[reindex] finalising"
npx tsx scripts/finalize.ts
echo "[reindex] COMPLETE"
