# Audio Asset Licenses

Records for royalty-free audio used in Rise In Harmony. Keep purchase receipts alongside this file.

## Integrated (in app)

### Tera Mangala — Nature Sounds Sample Pack (103 Loops)

Curated subset kept locally in `incoming/MEDITATION MUSIC - Nature Sounds`.

| Field | Value |
|---|---|
| **Source** | Tera Mangala Meditation Music |
| **Purchase price** | $15 |
| **License** | Royalty-free, commercial use |
| **Used in app** | `ambient-rain`, `ambient-ocean`, `ambient-forest`, `ambient-fire`, `ambient-river`, `ambient-night`, `ambient-cave`, `ambient-wind` |
| **Source tracks** | Rain only; ocean sea lagoon; Birds single blackbird; Fire crisp fireplace; River slow gentle; Jungle crikets chirp; Cave water dripping; loop n12 wind forest (wind kept from earlier processing run — no wind track in curated subset) |

### Tera Mangala — Singing Bowls Sample Pack (Chakras High Frequencies Scale)

| Field | Value |
|---|---|
| **Source** | Tera Mangala Meditation Music |
| **Purchase price** | $4 |
| **License** | Royalty-free, commercial use |
| **Used in app** | `ambient-bowl`, `music-crystal` |
| **Source tracks** | 528Hz Shiva Bowl Turning |

### Tera Mangala — Ethereal Sanctuary Vol. 5 (30 Tracks)

| Field | Value |
|---|---|
| **Source** | Tera Mangala Meditation Music |
| **Purchase price** | $15 |
| **License** | Royalty-free, commercial use |
| **Used in app** | `music-ambient`, `music-drone` (90s trimmed loops; full tracks reserved for future CDN streaming) |
| **Source tracks** | 01 Slow Current Deep Water, 05 Sinking Slowly Below Consciousness |

## Not integrated

### Sinta Positivo — All Hertz Frequencies (10 binaural tracks)

| Field | Value |
|---|---|
| **Source** | Sinta Positivo |
| **License** | **Unverified** — folder name does not state royalty-free/commercial terms |
| **Status** | **HOLD** — app uses live synthesis for exact-Hz binaurals; do not ship until license is confirmed |
| **Notes** | Verify purchase terms and commercial-use rights before any integration |

## Processing

Bundled loops are normalized to ~-18 LUFS, 44.1 kHz stereo, MP3 ~160 kbps via `scripts/process-audio.sh`. Originals remain in `references/audio/incoming/`; processed outputs in `references/audio/processed/`.
