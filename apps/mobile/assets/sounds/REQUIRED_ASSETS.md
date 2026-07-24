# Required mobile audio assets

These files are `require()`d by Sound Studio and/or registered as iOS
notification sounds. They **must** exist for production / EAS builds.
CI runs `scripts/check-mobile-assets.mjs` to enforce this.

## Sound Studio loops (MP3)

| File | Used for |
| --- | --- |
| `ambient-rain.mp3` | Nature layer — rain |
| `ambient-ocean.mp3` | Nature layer — ocean |
| `ambient-forest.mp3` | Nature layer — forest |
| `ambient-wind.mp3` | Nature layer — wind |
| `ambient-fire.mp3` | Nature layer — fire |
| `music-ambient.mp3` | Music layer — ambient |
| `music-drone.mp3` | Music layer — drone |
| `music-crystal.mp3` | Music layer — crystal |

## Alarm notification tones (WAV, ≤30 s)

| File | Used for |
| --- | --- |
| `alarm_174.wav` … `alarm_963.wav` | Exact-Hz solfeggio wake tones for local notifications (10 files) |

## Notes

- Loops are ~30 s, 128 kbps stereo; alarms are mono PCM sine + soft tremolo.
- Local verify: `node scripts/check-mobile-assets.mjs` from the monorepo root.
- Soft-check (warn only): `REQUIRE_MOBILE_ASSETS=0 node scripts/check-mobile-assets.mjs`
