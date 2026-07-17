#!/usr/bin/env node
/**
 * S0-7: Verify mobile audio assets required by Metro `require()` exist.
 *
 * Bundled files are intentionally large and may live outside the webdev
 * checkpoint system, but EAS/production builds will fail without them.
 * Run in CI and before `eas build`.
 *
 * Usage:
 *   node scripts/check-mobile-assets.mjs
 *   REQUIRE_MOBILE_ASSETS=0 node scripts/check-mobile-assets.mjs  # warn only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOUNDS_DIR = path.join(ROOT, "apps/mobile/assets/sounds");

/** Files referenced via require() in apps/mobile (must stay in sync). */
const REQUIRED_ASSETS = [
  "ambient-rain.mp3",
  "ambient-ocean.mp3",
  "ambient-forest.mp3",
  "ambient-wind.mp3",
  "ambient-fire.mp3",
  "music-ambient.mp3",
  "music-drone.mp3",
  "music-crystal.mp3",
];

const MIN_BYTES = 100; // reject empty / placeholder-empty files

const strict =
  process.env.REQUIRE_MOBILE_ASSETS !== "0" &&
  process.env.REQUIRE_MOBILE_ASSETS !== "false";

const missing = [];
const tooSmall = [];

for (const name of REQUIRED_ASSETS) {
  const full = path.join(SOUNDS_DIR, name);
  if (!fs.existsSync(full)) {
    missing.push(name);
    continue;
  }
  const stat = fs.statSync(full);
  if (!stat.isFile() || stat.size < MIN_BYTES) {
    tooSmall.push(`${name} (${stat.size} bytes)`);
  }
}

if (missing.length === 0 && tooSmall.length === 0) {
  console.log(
    `[check-mobile-assets] OK — ${REQUIRED_ASSETS.length} required files present in ${SOUNDS_DIR}`
  );
  process.exit(0);
}

console.error("[check-mobile-assets] Mobile audio asset check failed.");
if (missing.length) {
  console.error("  Missing:");
  for (const m of missing) console.error(`    - ${m}`);
}
if (tooSmall.length) {
  console.error("  Too small / empty:");
  for (const m of tooSmall) console.error(`    - ${m}`);
}
console.error(
  "\n  These files are required by apps/mobile/src/hooks/useSoundStudio.ts."
);
console.error(
  "  Place licensed/generated loops under apps/mobile/assets/sounds/ and ensure"
);
console.error(
  "  they are available to EAS builds (see apps/mobile/ENV_SETUP.md / .easignore)."
);

if (strict) {
  process.exit(1);
}
console.warn(
  "[check-mobile-assets] REQUIRE_MOBILE_ASSETS=0 — treating as warning only."
);
process.exit(0);
