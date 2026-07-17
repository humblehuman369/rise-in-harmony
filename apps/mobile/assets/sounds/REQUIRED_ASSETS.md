# Required mobile audio assets

These files are `require()`d by the Sound Studio hook and **must** exist for
production / EAS builds. CI runs `scripts/check-mobile-assets.mjs` to enforce this.

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

## Notes

- Files may be excluded from Manus webdev checkpoints (size); they still need to
  be present for EAS (see root `.easignore` — audio is **not** excluded there).
- Local verify: `node scripts/check-mobile-assets.mjs` from the monorepo root.
- Soft-check (warn only): `REQUIRE_MOBILE_ASSETS=0 node scripts/check-mobile-assets.mjs`
