/**
 * Frequency integrity — the TrueHz contract.
 *
 * Precision-tuned frequencies are the app's core promise. This suite locks
 * every catalog value to its canonical reference so that any accidental edit
 * (a merge, a typo, a "helpful" tweak) fails CI instead of silently shipping
 * a mistuned app.
 */
import { FREQUENCIES, CHAKRA_FREQUENCIES } from "../../../packages/shared-utils/src";
import {
  STUDIO_FREQUENCIES,
  droneFreqs,
  ambientChordFreqs,
  bowlFreqs,
} from "../../../packages/shared-utils/src";
import { clampHz, clampBeatHz, binauralPair, BINAURAL_CARRIER_HZ } from "../src/lib/synthMath";

// Canonical Solfeggio scale (+432 concert alternative)
const CANONICAL_SOLFEGGIO: Record<string, number> = {
  "174": 174,
  "285": 285,
  "396": 396,
  "417": 417,
  "432": 432,
  "528": 528,
  "639": 639,
  "741": 741,
  "852": 852,
  "963": 963,
};

// Brainwave entries: catalog hz IS the beat/pulse rate
const CANONICAL_BRAINWAVE: Record<string, { hz: number; category: string }> = {
  alpha: { hz: 10, category: "binaural" }, // Alpha band 8–13 Hz
  theta: { hz: 6, category: "binaural" }, // Theta band 4–8 Hz
  delta: { hz: 3, category: "binaural" }, // Delta band 0.5–4 Hz
  "alpha-isochronic": { hz: 10, category: "isochronic" },
  schumann: { hz: 7.83, category: "binaural" }, // Earth's Schumann resonance
};

// Chakra ladder: position → exact Hz (Root → Crown)
const CANONICAL_CHAKRA: [number, number][] = [
  [1, 396],
  [2, 417],
  [3, 528],
  [4, 639],
  [5, 741],
  [6, 852],
  [7, 963],
];

describe("solfeggio catalog values are exact", () => {
  for (const [id, hz] of Object.entries(CANONICAL_SOLFEGGIO)) {
    it(`${id} → ${hz} Hz`, () => {
      const f = FREQUENCIES.find((x) => x.id === id);
      expect(f).toBeDefined();
      expect(f!.hz).toBe(hz);
      expect(f!.category).toBe("solfeggio");
      // Survives the synth engine's clamp/quantize untouched
      expect(clampHz(f!.hz)).toBe(hz);
    });
  }
});

describe("brainwave catalog values are exact", () => {
  for (const [id, spec] of Object.entries(CANONICAL_BRAINWAVE)) {
    it(`${id} → ${spec.hz} Hz (${spec.category})`, () => {
      const f = FREQUENCIES.find((x) => x.id === id);
      expect(f).toBeDefined();
      expect(f!.hz).toBe(spec.hz);
      expect(f!.category).toBe(spec.category);
      // Beat/pulse rate survives clamping exactly
      expect(clampBeatHz(f!.hz)).toBe(spec.hz);
    });
  }

  it("binaural voices produce exact L/R pairs on the 200Hz carrier", () => {
    expect(binauralPair(BINAURAL_CARRIER_HZ, 10)).toEqual([200, 210]);
    expect(binauralPair(BINAURAL_CARRIER_HZ, 6)).toEqual([200, 206]);
    expect(binauralPair(BINAURAL_CARRIER_HZ, 3)).toEqual([200, 203]);
    expect(binauralPair(BINAURAL_CARRIER_HZ, 7.83)).toEqual([200, 207.83]);
  });
});

describe("recorded Schumann sessions are exact and streamable", () => {
  const RECORDED_HZ = [174, 285, 396, 417, 432, 528, 639, 741, 852, 963];

  it("has exactly the 10 canonical carrier frequencies", () => {
    const recorded = FREQUENCIES.filter((f) => f.category === "recorded");
    expect(recorded.map((f) => f.hz)).toEqual(RECORDED_HZ);
  });

  for (const hz of RECORDED_HZ) {
    it(`recorded-${hz} → ${hz} Hz carrier with a streamable audioUrl`, () => {
      const f = FREQUENCIES.find((x) => x.id === `recorded-${hz}`);
      expect(f).toBeDefined();
      expect(f!.hz).toBe(hz);
      expect(f!.category).toBe("recorded");
      expect(f!.audioUrl).toBe(`/sounds/binaural-${hz}.mp3`);
    });
  }

  it("recorded entries never leak into the synthesis-only alarm catalog", () => {
    const solfeggio = FREQUENCIES.filter((f) => f.category === "solfeggio");
    expect(solfeggio.every((f) => f.audioUrl === undefined)).toBe(true);
  });
});

describe("chakra journey ladder is exact (Root → Crown)", () => {
  it("has 7 chakras in ascending position order", () => {
    expect(CHAKRA_FREQUENCIES).toHaveLength(7);
  });
  for (const [position, hz] of CANONICAL_CHAKRA) {
    it(`chakra ${position} → ${hz} Hz`, () => {
      const f = CHAKRA_FREQUENCIES[position - 1];
      expect(f.chakraPosition).toBe(position);
      expect(f.hz).toBe(hz);
    });
  }
});

describe("studio frequencies mirror the solfeggio scale exactly", () => {
  it("contains exactly the 10 canonical values", () => {
    expect(STUDIO_FREQUENCIES.map((f) => f.hz)).toEqual([
      174, 285, 396, 417, 432, 528, 639, 741, 852, 963,
    ]);
  });
});

describe("just-intonation music layers derive exactly from the root", () => {
  // Ratios must be pure just-intonation so the music layer reinforces the
  // healing frequency instead of beating against it.
  it("drone = 1/2, 1, 3/2, 2 of the root", () => {
    for (const root of [174, 432, 528, 963]) {
      expect(droneFreqs(root)).toEqual([root / 2, root, root * 1.5, root * 2]);
    }
  });
  it("ambient chord = 1/2, 1, 5/4, 3/2 of the root", () => {
    for (const root of [396, 432, 528]) {
      expect(ambientChordFreqs(root)).toEqual([root / 2, root, root * 1.25, root * 1.5]);
    }
  });
  it("bowl = 1, 2 of the root", () => {
    for (const root of [432, 852]) {
      expect(bowlFreqs(root)).toEqual([root, root * 2]);
    }
  });
});
