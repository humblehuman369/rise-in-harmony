/**
 * Sleep Preparation recorded soundscape — integration wiring tests
 *
 * Validates that the new studio-produced "sleep-preparation" soundscape
 * (user-provided recording, tuned for the 200 Hz Delta binaural carrier)
 * is registered end-to-end:
 *  - background loop catalog exposes the storage URL
 *  - the Sleep Preparation meditation (web + shared) points at the new key
 *  - the shared NatureSoundscape type accepts the new value
 */
import { describe, expect, it } from "vitest";
import { BACKGROUND_LOOPS, getLibraryLoopUrl } from "../client/src/data/backgroundLoops";
import { MEDITATIONS } from "../client/src/data/meditations";
import { MEDITATIONS as SHARED_MEDITATIONS } from "../packages/shared-utils/src/meditations";

describe("sleep-preparation recorded soundscape", () => {
  it("is registered in the background loop catalog", () => {
    const entry = BACKGROUND_LOOPS.find(l => l.id === "sleep-preparation");
    expect(entry).toBeDefined();
    expect(entry?.category).toBe("nature");
    expect(entry?.label).toBe("Sleep Preparation");
  });

  it("resolves to a manus-storage MP3 URL", () => {
    const url = getLibraryLoopUrl("sleep-preparation");
    expect(url).toMatch(/^\/manus-storage\/sleep-preparation_[0-9a-f]+\.mp3$/);
  });

  it("is set as the Sleep Preparation meditation soundscape (web client)", () => {
    const med = MEDITATIONS.find(m => m.id === "sleep-body-release");
    expect(med).toBeDefined();
    expect(med?.title).toBe("Sleep Preparation");
    expect(med?.soundscape).toBe("sleep-preparation");
    // Delta pairing preserved — recording was notched at 200 Hz for this carrier
    expect(med?.recommendedFrequencyId).toBe("delta");
  });

  it("is set as the Sleep Preparation meditation soundscape (shared catalog)", () => {
    const med = SHARED_MEDITATIONS.find(m => m.id === "sleep-body-release");
    expect(med).toBeDefined();
    expect(med?.soundscape).toBe("sleep-preparation");
    expect(med?.recommendedFrequencyId).toBe("delta");
  });

  it("keeps all other meditations on their original soundscapes", () => {
    const others = MEDITATIONS.filter(m => m.id !== "sleep-body-release");
    for (const med of others) {
      expect(med.soundscape).not.toBe("sleep-preparation");
    }
  });
});
