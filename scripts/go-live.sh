#!/usr/bin/env bash
# Waits for indexing, then puts the real data on Neon and checks it fits.
set -euo pipefail
cd "$(dirname "$0")/.."
while pgrep -f 'scripts/(resolve|probe)\.ts' >/dev/null; do sleep 30; done
echo "[live] indexing done"
npx tsx scripts/finalize.ts
echo "[live] syncing to Neon"
bash scripts/sync-hosted.sh
echo "[live] COMPLETE"
