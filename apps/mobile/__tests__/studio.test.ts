/**
 * Integrity tests for the shared Sound Studio catalog + music math.
 */
import {
  STUDIO_PRESETS,
  STUDIO_FREQUENCIES,
  STUDIO_MUSIC_MODES,
  STUDIO_NATURE_SOUNDS,
  droneFreqs,
  ambientChordFreqs,
  bowlFreqs,
} from "../../../packages/shared-utils/src";

describe("studio catalog", () => {
  it("every preset frequency exists in the studio frequency list", () => {
    const hzSet = new Set(STUDIO_FREQUENCIES.map((f) => f.hz));
    for (const p of STUDIO_PRESETS) {
      expect(hzSet.has(p.settings.frequencyHz)).toBe(true);
    }
  });

  it("every preset music mode and nature sound is a known option", () => {
    const modes = new Set(STUDIO_MUSIC_MODES.map((m) => m.id));
    const sounds = new Set(STUDIO_NATURE_SOUNDS.map((n) => n.id));
    for (const p of STUDIO_PRESETS) {
      expect(modes.has(p.settings.musicMode)).toBe(true);
      expect(sounds.has(p.settings.natureSound)).toBe(true);
    }
  });

  it("preset volumes are within 0–1", () => {
    for (const p of STUDIO_PRESETS) {
      for (const v of [
        p.settings.frequencyVolume,
        p.settings.musicVolume,
        p.settings.natureVolume,
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("just-intonation helpers", () => {
  it("drone returns sub-octave, root, fifth, octave", () => {
    expect(droneFreqs(432)).toEqual([216, 432, 648, 864]);
  });

  it("ambient chord returns sub-octave root + major triad", () => {
    expect(ambientChordFreqs(432)).toEqual([216, 432, 540, 648]);
  });

  it("bowl returns fundamental + octave", () => {
    expect(bowlFreqs(432)).toEqual([432, 864]);
  });
});
