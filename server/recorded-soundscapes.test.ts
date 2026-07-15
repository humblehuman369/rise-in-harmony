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
import { MEDITATIONS as SHARED_MEDITATIONS } from "../packages/shared-utils/src/meditations";

const CASES = [
  {
    key: "deep-focus",
    label: "Deep Focus",
    meditationId: "focused-attention",
    title: "Deep Focus Meditation",
    webFrequencyId: "alpha-isochronic",
    sharedFrequencyId: "alpha",
  },
  {
    key: "anxiety-reset",
    label: "Anxiety Reset",
    meditationId: "4-7-8-breath",
    title: "4-7-8 Anxiety Reset",
    webFrequencyId: "417",
    sharedFrequencyId: "417",
  },
  {
    key: "chakra-dawn",
    label: "Chakra Dawn",
    meditationId: "chakra-morning",
    title: "7-Chakra Morning Activation",
    webFrequencyId: "528",
    sharedFrequencyId: "528",
  },
  {
    key: "morning-breath",
    label: "Morning Breath",
    meditationId: "morning-breath",
    title: "Morning Breath Awakening",
    webFrequencyId: "432",
    sharedFrequencyId: "432",
  },
] as const;

const RECORDED_KEYS = ["sleep-preparation", ...CASES.map(c => c.key)];

describe.each(CASES)("$key recorded soundscape", ({ key, label, meditationId, title, webFrequencyId, sharedFrequencyId }) => {
  it("is registered in the background loop catalog", () => {
    const entry = BACKGROUND_LOOPS.find(l => l.id === key);
    expect(entry).toBeDefined();
    expect(entry?.category).toBe("nature");
    expect(entry?.label).toBe(label);
  });

  it("resolves to a manus-storage MP3 URL", () => {
    const url = getLibraryLoopUrl(key);
    expect(url).toMatch(new RegExp(`^\\/manus-storage\\/${key}_[0-9a-f]+\\.mp3$`));
  });

  it("is set as the meditation soundscape (web client)", () => {
    const med = MEDITATIONS.find(m => m.id === meditationId);
    expect(med).toBeDefined();
    expect(med?.title).toBe(title);
    expect(med?.soundscape).toBe(key);
    expect(med?.recommendedFrequencyId).toBe(webFrequencyId);
  });

  it("is set as the meditation soundscape (shared catalog)", () => {
    const med = SHARED_MEDITATIONS.find(m => m.id === meditationId);
    expect(med).toBeDefined();
    expect(med?.soundscape).toBe(key);
    expect(med?.recommendedFrequencyId).toBe(sharedFrequencyId);
  });
});

describe("recorded soundscape catalog integrity", () => {
  it("assigns each recorded key to exactly one web meditation", () => {
    for (const key of RECORDED_KEYS) {
      const holders = MEDITATIONS.filter(m => m.soundscape === key);
      expect(holders.length).toBe(1);
    }
  });

  it("keeps non-target meditations on procedural soundscapes", () => {
    const targetIds = new Set(["sleep-body-release", ...CASES.map(c => c.meditationId)]);
    for (const med of MEDITATIONS.filter(m => !targetIds.has(m.id))) {
      expect(RECORDED_KEYS).not.toContain(med.soundscape);
    }
  });
});
