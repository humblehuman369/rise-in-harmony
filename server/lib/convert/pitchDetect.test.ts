import { describe, expect, it } from "vitest";
import {
  detectConcertAFromPcm,
  estimateDominantHz,
  snapToConcertA,
} from "./pitchDetect";

function sine(
  hz: number,
  sec: number,
  sampleRate = 48000,
  channels = 1,
): Float32Array {
  const n = Math.floor(sec * sampleRate);
  const out = new Float32Array(n * channels);
  for (let i = 0; i < n; i++) {
    const s = 0.4 * Math.sin((2 * Math.PI * hz * i) / sampleRate);
    for (let c = 0; c < channels; c++) out[i * channels + c] = s;
  }
  return out;
}

describe("pitchDetect (experimental)", () => {
  it("estimates pure 440 Hz", () => {
    const samples = sine(440, 2.5);
    const { hz, confidence } = estimateDominantHz(samples, 48000, 1);
    expect(Math.abs(hz - 440)).toBeLessThan(1);
    expect(confidence).toBeGreaterThan(0.5);
  });

  it("snaps 432-ish tone to A=432", () => {
    const { suggestedSourceA } = snapToConcertA(432);
    expect(suggestedSourceA).toBe(432);
  });

  it("detectConcertAFromPcm suggests 440 for A4 sine", () => {
    const samples = sine(440, 2);
    const r = detectConcertAFromPcm(samples, 48000, 1);
    expect(r.experimental).toBe(true);
    expect(r.suggestedSourceA).toBe(440);
    expect(Math.abs(r.dominantHz - 440)).toBeLessThan(2);
  });

  it("detectConcertAFromPcm suggests 432 for 432 sine", () => {
    const samples = sine(432, 2);
    const r = detectConcertAFromPcm(samples, 48000, 1);
    expect(r.suggestedSourceA).toBe(432);
  });
});
