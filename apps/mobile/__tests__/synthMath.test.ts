/**
 * Tests for the pure synthesis math powering the Precision Player and the
 * live-synthesis frequency engine (clamping, binaural pairs, band labels).
 */
import {
  clampHz,
  clampBeatHz,
  binauralPair,
  brainwaveBand,
  MIN_HZ,
  MAX_HZ,
  MIN_BEAT_HZ,
  MAX_BEAT_HZ,
} from "../src/lib/synthMath";

describe("clampHz", () => {
  it("passes through valid frequencies", () => {
    expect(clampHz(432)).toBe(432);
    expect(clampHz(7.83)).toBe(7.83);
  });

  it("clamps to the supported range", () => {
    expect(clampHz(0)).toBe(MIN_HZ);
    expect(clampHz(-5)).toBe(MIN_HZ);
    expect(clampHz(99999)).toBe(MAX_HZ);
  });

  it("quantizes to 0.01 Hz resolution", () => {
    expect(clampHz(432.005)).toBe(432.01);
    expect(clampHz(432.004)).toBe(432);
  });

  it("handles non-finite input", () => {
    expect(clampHz(NaN)).toBe(MIN_HZ);
    expect(clampHz(Infinity)).toBe(MIN_HZ);
  });
});

describe("clampBeatHz", () => {
  it("clamps to the perceivable beat range", () => {
    expect(clampBeatHz(0)).toBe(MIN_BEAT_HZ);
    expect(clampBeatHz(100)).toBe(MAX_BEAT_HZ);
    expect(clampBeatHz(10)).toBe(10);
  });
});

describe("binauralPair", () => {
  it("returns carrier and carrier + beat", () => {
    expect(binauralPair(200, 10)).toEqual([200, 210]);
    expect(binauralPair(200, 7.83)).toEqual([200, 207.83]);
  });

  it("clamps the beat before offsetting", () => {
    expect(binauralPair(200, 500)).toEqual([200, 240]);
  });
});

describe("brainwaveBand", () => {
  it("classifies each band boundary", () => {
    expect(brainwaveBand(2)).toBe("Delta");
    expect(brainwaveBand(6)).toBe("Theta");
    expect(brainwaveBand(10)).toBe("Alpha");
    expect(brainwaveBand(20)).toBe("Beta");
    expect(brainwaveBand(40)).toBe("Gamma");
  });

  it("uses lower-inclusive boundaries", () => {
    expect(brainwaveBand(4)).toBe("Theta");
    expect(brainwaveBand(8)).toBe("Alpha");
    expect(brainwaveBand(13)).toBe("Beta");
    expect(brainwaveBand(30)).toBe("Gamma");
  });
});
