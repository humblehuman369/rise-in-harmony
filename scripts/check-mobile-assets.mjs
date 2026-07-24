#!/usr/bin/env node
/**
 * Verify mobile audio assets required by Metro `require()` and iOS
 * notification sounds exist and are non-trivial size.
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

/** Files referenced via require() / expo-notifications sounds. */
const REQUIRED_ASSETS = [
  "ambient-rain.mp3",
  "ambient-ocean.mp3",
  "ambient-forest.mp3",
  "ambient-wind.mp3",
  "ambient-fire.mp3",
  "music-ambient.mp3",
  "music-drone.mp3",
  "music-crystal.mp3",
  "alarm_174.wav",
  "alarm_285.wav",
  "alarm_396.wav",
  "alarm_417.wav",
  "alarm_432.wav",
  "alarm_528.wav",
  "alarm_639.wav",
  "alarm_741.wav",
  "alarm_852.wav",
  "alarm_963.wav",
];

/** Reject silent stubs (old 489-byte placeholders). */
const MIN_BYTES = 50_000;

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
    `[check-mobile-assets] OK — ${REQUIRED_ASSETS.length} required files present in ${SOUNDS_DIR}`,
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
  "\n  See apps/mobile/assets/sounds/REQUIRED_ASSETS.md",
);

if (strict) {
  process.exit(1);
}
console.warn(
  "[check-mobile-assets] REQUIRE_MOBILE_ASSETS=0 — treating as warning only.",
);
process.exit(0);
