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

echo "[film] 1/7 facts"      && npx tsx scripts/facts.ts
echo "[film] 2/7 voice"      && npx tsx scripts/voice.ts
echo "[film] 3/7 film"       && npx tsx scripts/film.ts
echo "[film] 4/7 cut"        && bash scripts/film-cut.sh
echo "[film] 5/7 voice pad"  && npx tsx scripts/voice.ts
# The padded pass REWRITES timing.json. Captions and pointer moves are burned
# into the picture from those timings, so the picture has to be shot again
# afterwards — otherwise the audio moves and the captions stay where they were,
# which is exactly the desync this pass exists to remove.
echo "[film] 6/7 re-film"    && npx tsx scripts/film.ts && bash scripts/film-cut.sh
echo "[film] 7/7 mix"        && bash scripts/film-mix.sh
echo "[film] COMPLETE"
