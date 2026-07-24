/**
 * TrueHz HQ meditation catalog — wiring tests
 *
 * Validates the six studio sessions are registered end-to-end:
 *  - background loop catalog + static /meditations URLs
 *  - web + shared meditation catalogs
 *  - musicMode none (self-contained TrueHz masters)
 */
import { describe, expect, it } from "vitest";
import { BACKGROUND_LOOPS, getLibraryLoopUrl } from "../client/src/data/backgroundLoops";
import { MEDITATIONS } from "../client/src/data/meditations";
import { MEDITATIONS as SHARED_MEDITATIONS } from "../packages/shared-utils/src/meditations";

const TRUEHZ_IDS = [
  "calm-sleep-528",
  "deep-serenity-444",
  "nature-meditation-174",
  "reiki-healing-garden-285",
  "spiritual-meditation-444",
  "third-eye-activation-528",
] as const;

describe("TrueHz meditation sessions", () => {
  it("catalog has exactly six sessions (web)", () => {
    expect(MEDITATIONS).toHaveLength(6);
    expect(MEDITATIONS.map((m) => m.id).sort()).toEqual([...TRUEHZ_IDS].sort());
  });

  it("catalog has exactly six sessions (shared)", () => {
    expect(SHARED_MEDITATIONS).toHaveLength(6);
    expect(SHARED_MEDITATIONS.map((m) => m.id).sort()).toEqual([...TRUEHZ_IDS].sort());
  });

  it("each session is registered in BACKGROUND_LOOPS", () => {
    for (const id of TRUEHZ_IDS) {
      const entry = BACKGROUND_LOOPS.find((l) => l.id === id);
      expect(entry, id).toBeDefined();
      expect(entry?.category).toBe("nature");
    }
  });

  it("each session resolves to a /meditations/*.mp3 URL", () => {
    for (const id of TRUEHZ_IDS) {
      const url = getLibraryLoopUrl(id);
      expect(url).toBe(`/meditations/${id}.mp3`);
    }
  });

  it("web + shared soundscapes match ids and use musicMode none", () => {
    for (const id of TRUEHZ_IDS) {
      const web = MEDITATIONS.find((m) => m.id === id)!;
      const shared = SHARED_MEDITATIONS.find((m) => m.id === id)!;
      expect(web.soundscape).toBe(id);
      expect(shared.soundscape).toBe(id);
      expect(web.musicMode).toBe("none");
      expect(shared.musicMode).toBe("none");
    }
  });
});
