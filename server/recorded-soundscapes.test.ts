/**
 * Recorded soundscapes batch 2 — integration wiring tests
 *
 * Validates that the four new studio-produced soundscapes
 * (user-provided recordings, each tuned for its meditation's frequency
 * carrier) are registered end-to-end:
 *  - background loop catalog exposes the storage URLs
 *  - each target meditation (web + shared) points at its new key
 *  - no other meditation accidentally picked up a recorded key
 *
 * Carrier tuning applied during processing:
 *  - deep-focus       → 200 Hz (Alpha Isochronic audible carrier), -9 dB notch
 *  - anxiety-reset    → 417 Hz (Transmutation), zone naturally clear
 *  - chakra-dawn      → 528 Hz (Miracle Tone), -6 dB notch
 *  - morning-breath   → 432 Hz (Natural Harmony), -9 dB notch
 */
import { describe, expect, it } from "vitest";
import { BACKGROUND_LOOPS, getLibraryLoopUrl } from "../client/src/data/backgroundLoops";
import { MEDITATIONS } from "../client/src/data/meditations";

const CASES = [
  {
    key: "deep-focus",
    label: "Deep Focus",
    meditationId: "focused-attention",
  },
  {
    key: "anxiety-reset",
    label: "Anxiety Reset",
    meditationId: "4-7-8-breath",
  },
  {
    key: "chakra-dawn",
    label: "Chakra Dawn",
    meditationId: "chakra-morning",
  },
  {
    key: "morning-breath",
    label: "Morning Breath",
    meditationId: "morning-breath",
  },
] as const;

const RECORDED_KEYS = ["sleep-preparation", ...CASES.map(c => c.key)];

describe.each(CASES)("$key recorded soundscape", ({ key, label }) => {
  it("is registered in the background loop catalog", () => {
    const entry = BACKGROUND_LOOPS.find(l => l.id === key);
    expect(entry).toBeDefined();
    expect(entry?.category).toBe("nature");
    expect(entry?.label).toBe(label);
  });

  // These were served from signed /manus-storage/* S3 paths, which 403 on new
  // Manus projects. The catalog was deliberately moved to static /audio/*
  // (see client/src/data/backgroundLoops.ts); this assertion had not followed.
  it("resolves to a static /audio MP3 URL", () => {
    expect(getLibraryLoopUrl(key)).toBe(`/audio/${key}.mp3`);
  });

  // The meditations these soundscapes were attached to (focused-attention,
  // 4-7-8-breath, chakra-morning, morning-breath) were removed in b7da014,
  // "replace catalog with 6 TrueHz HQ sessions". Both catalogs now hold the
  // TrueHz set instead, so the per-meditation assignment assertions that used
  // to live here described a catalog that no longer exists. The soundscape
  // recordings themselves are still shipped and are still covered above.
});

describe("recorded soundscape catalog integrity", () => {
  it("never assigns a recorded key to more than one web meditation", () => {
    // Zero holders is expected for the keys orphaned by the b7da014 catalog
    // replacement; two or more would mean a recording is double-booked.
    for (const key of RECORDED_KEYS) {
      const holders = MEDITATIONS.filter(m => m.soundscape === key);
      expect(holders.length).toBeLessThanOrEqual(1);
    }
  });

  it("keeps non-target meditations on procedural soundscapes", () => {
    const targetIds = new Set(["sleep-body-release", ...CASES.map(c => c.meditationId)]);
    for (const med of MEDITATIONS.filter(m => !targetIds.has(m.id))) {
      expect(RECORDED_KEYS).not.toContain(med.soundscape);
    }
  });
});
