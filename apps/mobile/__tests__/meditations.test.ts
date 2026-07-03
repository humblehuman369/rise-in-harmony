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

const MOBILE_NATURE_SOUNDSCAPES = ["rain", "ocean", "forest", "wind", "fire"];

describe("meditation catalog", () => {
  it("has 12 meditations", () => {
    expect(MEDITATIONS).toHaveLength(12);
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

  it("every soundscape has a bundled mobile audio asset", () => {
    for (const m of MEDITATIONS) {
      // "bowl" and "silence" are allowed by the type but have no mobile asset;
      // the current catalog should only use the five bundled loops.
      expect(MOBILE_NATURE_SOUNDSCAPES).toContain(m.soundscape);
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
});
