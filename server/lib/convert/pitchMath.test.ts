import { describe, expect, it } from "vitest";
import {
  clampConcertA,
  describeRetune,
  expectedPeakHz,
  formatCents,
  pitchRatio,
  ratioToCents,
} from "../../../packages/shared-utils/src/pitchMath.ts";

describe("pitchMath (TrueHz Convert)", () => {
  it("computes 440→432 ratio and cents", () => {
    const r = describeRetune(440, 432);
    expect(r.ratio).toBeCloseTo(432 / 440, 10);
    expect(r.cents).toBeCloseTo(-31.76665, 4);
    expect(expectedPeakHz(440, r.ratio)).toBeCloseTo(432, 10);
  });

  it("pitchRatio rejects non-positive", () => {
    expect(() => pitchRatio(0, 432)).toThrow();
    expect(() => pitchRatio(440, -1)).toThrow();
  });

  it("ratioToCents is inverse of cents path", () => {
    const cents = ratioToCents(432 / 440);
    expect(cents).toBeLessThan(0);
    expect(formatCents(cents)).toMatch(/31\.7/);
  });

  it("clampConcertA bounds", () => {
    expect(clampConcertA(440)).toBe(440);
    expect(clampConcertA(399)).toBe(400);
    expect(clampConcertA(500)).toBe(480);
    expect(clampConcertA(Number.NaN)).toBe(440);
  });
});
