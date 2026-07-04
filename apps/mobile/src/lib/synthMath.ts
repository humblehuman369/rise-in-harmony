/**
 * Pure synthesis math helpers — no native imports so they are unit-testable.
 */

export type Waveform = "sine" | "square" | "triangle" | "sawtooth";

/** ResoNate SRS FR-001: custom frequency 1–22000 Hz at 0.01 Hz resolution */
export const MIN_HZ = 1;
export const MAX_HZ = 22000;

/** Binaural beats ride on a fixed carrier (matches the web app's catalog). */
export const BINAURAL_CARRIER_HZ = 200;

/** Perceivable binaural/isochronic beat range */
export const MIN_BEAT_HZ = 0.5;
export const MAX_BEAT_HZ = 40;

/** Clamp to the supported range and quantize to 0.01 Hz. */
export function clampHz(hz: number): number {
  if (!Number.isFinite(hz)) return MIN_HZ;
  const clamped = Math.min(MAX_HZ, Math.max(MIN_HZ, hz));
  return Math.round(clamped * 100) / 100;
}

export function clampBeatHz(beat: number): number {
  if (!Number.isFinite(beat)) return MIN_BEAT_HZ;
  const clamped = Math.min(MAX_BEAT_HZ, Math.max(MIN_BEAT_HZ, beat));
  return Math.round(clamped * 100) / 100;
}

/**
 * Left/right oscillator frequencies for a binaural beat:
 * left ear gets the carrier, right ear gets carrier + beat.
 * The brain perceives the difference (the beat frequency).
 */
export function binauralPair(carrierHz: number, beatHz: number): [number, number] {
  const carrier = clampHz(carrierHz);
  const beat = clampBeatHz(beatHz);
  return [carrier, clampHz(carrier + beat)];
}

export type BrainwaveBand = "Delta" | "Theta" | "Alpha" | "Beta" | "Gamma";

/** Classify a beat/pulse rate into its brainwave band. */
export function brainwaveBand(beatHz: number): BrainwaveBand {
  if (beatHz < 4) return "Delta";
  if (beatHz < 8) return "Theta";
  if (beatHz < 13) return "Alpha";
  if (beatHz < 30) return "Beta";
  return "Gamma";
}
