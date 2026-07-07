#!/usr/bin/env bash
# Process royalty-free source tracks into normalized, bundle-sized loops for Rise In Harmony.
# Reads from references/audio/incoming/, writes to references/audio/processed/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INCOMING="$ROOT/references/audio/incoming"
OUT="$ROOT/references/audio/processed"
mkdir -p "$OUT"

# Resolve a source file by glob pattern under INCOMING
find_source() {
  local pattern="$1"
  local found
  found=$(find "$INCOMING" -name "$pattern" -print -quit 2>/dev/null || true)
  if [[ -z "$found" ]]; then
    echo "ERROR: no source matching: $pattern" >&2
    exit 1
  fi
  echo "$found"
}

# Process one track: trim to duration, loudness-normalize, encode MP3
# Usage: process_loop <output_name> <source_glob> <duration_sec> <lufs>
process_loop() {
  local out_name="$1"
  local source_glob="$2"
  local duration="$3"
  local lufs="$4"
  local src
  src=$(find_source "$source_glob")
  local dest="$OUT/${out_name}.mp3"

  echo "→ $out_name  (${duration}s @ ${lufs} LUFS)  ←  $(basename "$src")"

  ffmpeg -y -hide_banner -loglevel error \
    -i "$src" \
    -t "$duration" \
    -vn \
    -af "loudnorm=I=${lufs}:TP=-2.0:LRA=11" \
    -ar 44100 \
    -ac 2 \
    -codec:a libmp3lame \
    -b:a 160k \
    "$dest"

  local size
  size=$(du -h "$dest" | cut -f1)
  echo "   ✓ $dest ($size)"
}

echo "Processing audio loops into $OUT"
echo ""

# ── Nature soundscapes ────────────────────────────────────────────────────────
# Sourced from "MEDITATION MUSIC - Nature Sounds" pack. Normalized to -21 LUFS
# (softer than the music beds) so meditation ambience sits gently in the mix.
# NOTE: no wind recording exists in this pack — the bundled ambient-wind.mp3 is
# kept from the previous processing run and is not regenerated here.
process_loop "ambient-rain"   "Rain only.mp3" 24.9 -21
process_loop "ambient-ocean"  "ocean sea lagoon.mp3" 24.9 -21
process_loop "ambient-forest" "Birds single blackbird.mp3" 56 -21
process_loop "ambient-fire"   "Fire crisp fireplace.mp3" 56 -21
process_loop "ambient-river"  "River slow gentle.mp3" 59.9 -21
process_loop "ambient-night"  "Jungle crikets chirp.mp3" 56 -21
process_loop "ambient-cave"   "Cave water dripping.mp3" 50 -21

# ── Bowl soundscape (from Singing Bowls pack) ────────────────────────────────
process_loop "ambient-bowl"  "*06 528Hz Shiva Bowl Turning*" 54 -21

# ── Music beds (from Ethereal Sanctuary Vol. 5) ──────────────────────────────
process_loop "music-ambient" "*01 Slow Current*" 90 -18
process_loop "music-drone"   "*05 Sinking Slowly Below Consciousness*" 90 -18
process_loop "music-crystal" "*06 528Hz Shiva Bowl Turning*" 54 -18

# ── Recorded Schumann binaurals (Sinta Positivo — All Hertz Frequencies) ─────
# Full-length pre-mixed sessions (~2 min each): Solfeggio carrier + 7.83 Hz
# Schumann binaural beat. Kept full length (no trim); normalized to -20 LUFS
# because the source files are mastered hot (ReplayGain ≈ -21.5 dB).
# Usage: process_full <output_name> <source_glob> <lufs>
process_full() {
  local out_name="$1"
  local source_glob="$2"
  local lufs="$3"
  local src
  src=$(find_source "$source_glob")
  local dest="$OUT/${out_name}.mp3"

  echo "→ $out_name  (full length @ ${lufs} LUFS)  ←  $(basename "$src")"

  ffmpeg -y -hide_banner -loglevel error \
    -i "$src" \
    -vn \
    -af "loudnorm=I=${lufs}:TP=-2.0:LRA=11" \
    -ar 44100 \
    -ac 2 \
    -codec:a libmp3lame \
    -b:a 160k \
    "$dest"

  local size
  size=$(du -h "$dest" | cut -f1)
  echo "   ✓ $dest ($size)"
}

for hz in 174 285 396 417 432 528 639 741 852 963; do
  # Note: the 639 Hz source file has a vendor typo ("SBinaural…"), so match
  # on the Hz portion of the name only.
  process_full "binaural-${hz}" "*inaural Frequency ${hz} Hz*" -20
done

echo ""
echo "Done. $(ls -1 "$OUT"/*.mp3 | wc -l | tr -d ' ') files in $OUT"
du -sh "$OUT"
