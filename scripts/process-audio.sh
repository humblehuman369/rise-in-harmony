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
# Usage: process_loop <output_name> <source_glob> <duration_sec>
process_loop() {
  local out_name="$1"
  local source_glob="$2"
  local duration="$3"
  local src
  src=$(find_source "$source_glob")
  local dest="$OUT/${out_name}.mp3"

  echo "→ $out_name  (${duration}s)  ←  $(basename "$src")"

  ffmpeg -y -hide_banner -loglevel error \
    -i "$src" \
    -t "$duration" \
    -af "loudnorm=I=-18:TP=-1.5:LRA=11" \
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

# ── Nature soundscapes (replace existing ambient-*.mp3) ───────────────────────
process_loop "ambient-rain"   "*03 loop n3 rain only*" 60
process_loop "ambient-ocean"  "*63 loop n191 ocean soft wave*" 60
process_loop "ambient-forest" "*90 Birds In A Natural Forest*" 90
process_loop "ambient-wind"   "*12 loop n12 wind forest*" 60
process_loop "ambient-fire"  "*18 loop n18 fire crisp fireplace*" 57

# ── Bowl soundscape (new — fills silent meditation soundscape) ───────────────
process_loop "ambient-bowl"  "*06 528Hz Shiva Bowl Turning*" 54

# ── Music beds (replace procedural ambient/drone/crystal synthesis) ─────────
process_loop "music-ambient" "*01 Slow Current*" 90
process_loop "music-drone"   "*05 Sinking Slowly Below Consciousness*" 90
process_loop "music-crystal" "*06 528Hz Shiva Bowl Turning*" 54

echo ""
echo "Done. $(ls -1 "$OUT"/*.mp3 | wc -l | tr -d ' ') files in $OUT"
du -sh "$OUT"
