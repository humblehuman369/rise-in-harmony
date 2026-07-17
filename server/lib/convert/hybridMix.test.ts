import { describe, expect, it } from "vitest";
import {
  applyPeakLimiter,
  measurePeakHz,
  mixHybridBed,
  TRUE_PEAK_LIMIT,
} from "./hybridMix";
import type { WavData } from "./wavCodec";
import { clampHz } from "../../../packages/shared-utils/src/trueHzOffline.ts";

function silenceWav(
  durationSec: number,
  sampleRate = 48000,
  channels = 2,
): WavData {
  const frameCount = Math.floor(durationSec * sampleRate);
  return {
    sampleRate,
    channels,
    frameCount,
    samples: new Float32Array(frameCount * channels),
  };
}

describe("hybridMix TrueHz bed", () => {
  it("applies peak limiter to over-unity peaks", () => {
    const s = new Float32Array([0, 0.5, 1.5, -2, 0.1]);
    const r = applyPeakLimiter(s, TRUE_PEAK_LIMIT);
    expect(r.peakBefore).toBeGreaterThan(1);
    expect(r.peakAfter).toBeLessThanOrEqual(TRUE_PEAK_LIMIT + 1e-9);
    for (const v of s) {
      expect(Math.abs(v)).toBeLessThanOrEqual(TRUE_PEAK_LIMIT + 1e-6);
    }
  });

  it("hybrid bed-only peak is within ±0.05 Hz of target (TrueHz contract)", () => {
    const targets = [432, 528, 639.12];
    for (const hz of targets) {
      const wav = silenceWav(3.0, 48000, 2);
      const mixed = mixHybridBed(wav, {
        hybridHz: hz,
        hybridGainDb: -12,
        bedOnly: true,
      });
      const peak = measurePeakHz(
        mixed.wav.samples,
        mixed.wav.sampleRate,
        mixed.wav.channels,
        hz * 0.5,
        hz * 1.5,
      );
      const expected = clampHz(hz);
      expect(Math.abs(peak - expected)).toBeLessThanOrEqual(0.05);
    }
  });

  it("music + bed still peaks near hybrid Hz when bed dominates silence", () => {
    const hz = 528;
    const wav = silenceWav(2.5, 48000, 2);
    // Add tiny noise so it's not pure bed-only path
    for (let i = 0; i < wav.samples.length; i++) {
      wav.samples[i] = (Math.random() - 0.5) * 0.001;
    }
    const mixed = mixHybridBed(wav, {
      hybridHz: hz,
      hybridGainDb: -6,
      bedOnly: false,
    });
    const peak = measurePeakHz(
      mixed.wav.samples,
      mixed.wav.sampleRate,
      mixed.wav.channels,
      400,
      700,
    );
    expect(Math.abs(peak - 528)).toBeLessThanOrEqual(0.05);
  });
});
