#!/usr/bin/env bash
# Waits for indexing to settle, then rebuilds the film end to end.
#
# Order matters and is not negotiable:
#   facts  -> narration can only hold numbers the index actually contains
#   voice  -> measures each sentence, writes timing.json
#   film   -> sizes each segment to its measured narration
#   cut    -> trims setup frames, crossfades, writes the manifest
#   voice  -> re-run: pads to the real post-transition segment lengths
#   mix    -> picture + voice + ducked bed
set -euo pipefail
cd "$(dirname "$0")/.."

while pgrep -f 'scripts/(resolve|probe|finalize)\.ts' >/dev/null; do
  echo "[film] indexing still running, waiting…"; sleep 60
done

echo "[film] 1/6 facts"     && npx tsx scripts/facts.ts
echo "[film] 2/6 voice"     && ELEVENLABS_API_KEY="" SAY_VOICE=Daniel npx tsx scripts/voice.ts
echo "[film] 3/6 film"      && npx tsx scripts/film.ts
echo "[film] 4/6 cut"       && bash scripts/film-cut.sh
echo "[film] 5/6 voice pad" && ELEVENLABS_API_KEY="" SAY_VOICE=Daniel npx tsx scripts/voice.ts
echo "[film] 6/6 mix"       && bash scripts/film-mix.sh
echo "[film] COMPLETE"
