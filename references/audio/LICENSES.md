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

### Sinta Positivo — All Hertz Frequencies (10 binaural tracks)

| Field | Value |
|---|---|
| **Source** | Sinta Positivo (https://sintapositivo.bandcamp.com) |
| **License** | Royalty-free, commercial use (confirmed by owner 2026-07-07) |
| **Used in app** | `binaural-174` … `binaural-963` (web "Recorded Sessions" library category) |
| **Source tracks** | Binaural Frequency 174/285/396/417/432/528/639/741/852/963 Hz (Theta 7.83 Hz Schumann), 2024 |
| **Notes** | Full-length (~2 min) pre-mixed sessions: Solfeggio carrier + 7.83 Hz Schumann binaural beat. Normalized to -20 LUFS (sources mastered hot, ReplayGain ≈ -21.5 dB). Complements — does not replace — the live TrueHz synthesis engine. |

## Processing

Bundled loops are normalized to ~-18 LUFS (nature -21, recorded binaurals -20), 44.1 kHz stereo, MP3 ~160 kbps via `scripts/process-audio.sh`. Originals remain in `references/audio/incoming/`; processed outputs in `references/audio/processed/`.
