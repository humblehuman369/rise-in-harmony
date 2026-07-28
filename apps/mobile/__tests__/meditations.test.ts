/**
 * Integrity tests for the shared meditation catalog.
 * Guards against broken cross-references (frequency ids, soundscapes) that
 * would silently produce silent/broken meditation sessions on mobile.
 */
import {
  MEDITATIONS,
  MEDITATION_CATEGORIES,
  FREQUENCIES,
} from "../../../packages/shared-utils/src";

/** Procedural nature keys the mobile synth can render natively. */
const MOBILE_PROCEDURAL_SOUNDSCAPES = [
  "rain",
  "ocean",
  "forest",
  "wind",
  "fire",
  "river",
  "night",
  "cave",
  "bowl",
];

/** Recorded web keys that fall back to a procedural texture on mobile. */
const RECORDED_FALLBACKS: Record<string, string> = {
  "sleep-preparation": "night",
  "deep-focus": "river",
  "anxiety-reset": "ocean",
  "chakra-dawn": "forest",
  "morning-breath": "forest",
  "reiki-432": "bowl",
  "calm-sleep-528": "night",
  "deep-serenity-444": "ocean",
  "nature-meditation-174": "forest",
  "reiki-healing-garden-285": "forest",
  "spiritual-meditation-444": "cave",
  "third-eye-activation-528": "cave",
  "deep-into-nature-60": "forest",
  "inner-calling-60": "cave",
  "peaceful-ocean-60": "ocean",
};

describe("meditation catalog", () => {
  it("has 9 TrueHz meditations", () => {
    expect(MEDITATIONS).toHaveLength(9);
  });

  it("has unique ids", () => {
    const ids = MEDITATIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every recommendedFrequencyId exists in the shared FREQUENCIES catalog", () => {
    const freqIds = new Set(FREQUENCIES.map((f) => f.id));
    for (const m of MEDITATIONS) {
      expect(freqIds.has(m.recommendedFrequencyId)).toBe(true);
    }
  });

  it("every soundscape is playable on mobile (procedural or recorded fallback)", () => {
    for (const m of MEDITATIONS) {
      if (m.soundscape === "silence") continue;
      const resolved =
        RECORDED_FALLBACKS[m.soundscape] ?? m.soundscape;
      expect(MOBILE_PROCEDURAL_SOUNDSCAPES).toContain(resolved);
    }
  });

  it("every category is present in MEDITATION_CATEGORIES", () => {
    const categoryIds = new Set(MEDITATION_CATEGORIES.map((c) => c.id));
    for (const m of MEDITATIONS) {
      expect(categoryIds.has(m.category)).toBe(true);
    }
  });

  it("every meditation has guidance steps and a positive duration", () => {
    for (const m of MEDITATIONS) {
      expect(m.guidance.length).toBeGreaterThan(0);
      expect(m.durationMinutes).toBeGreaterThan(0);
    }
  });

  it("TrueHz sessions use musicMode none (self-contained masters)", () => {
    for (const m of MEDITATIONS) {
      expect(m.musicMode).toBe("none");
    }
  });
});
