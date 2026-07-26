/**
 * Legacy sleep-preparation recorded soundscape still remains in the
 * background-loop registry for Studio / Alarm reuse, even though the
 * Meditation tab no longer lists the old Sleep Preparation session.
 */
import { describe, expect, it } from "vitest";
import { BACKGROUND_LOOPS, getLibraryLoopUrl } from "../client/src/data/backgroundLoops";
import { MEDITATIONS } from "../client/src/data/meditations";

describe("sleep-preparation recorded soundscape (legacy registry)", () => {
  it("is still registered in the background loop catalog", () => {
    const entry = BACKGROUND_LOOPS.find(l => l.id === "sleep-preparation");
    expect(entry).toBeDefined();
    expect(entry?.category).toBe("nature");
    expect(entry?.label).toBe("Sleep Preparation");
  });

  it("resolves to a static public audio URL", () => {
    const url = getLibraryLoopUrl("sleep-preparation");
    expect(url).toBe("/audio/sleep-preparation.mp3");
  });

  it("is not used by the current TrueHz meditation catalog", () => {
    for (const med of MEDITATIONS) {
      expect(med.soundscape).not.toBe("sleep-preparation");
      expect(med.id).not.toBe("sleep-body-release");
    }
  });
});
