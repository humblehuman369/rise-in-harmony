/**
 * Pure synthesis math helpers — no native imports so they are unit-testable.
 */

export type Waveform = "sine" | "square" | "triangle" | "sawtooth" | "bowl";

/** Waveforms an OscillatorNode can produce natively (bowl is additive). */
export type OscillatorWaveform = Exclude<Waveform, "bowl">;

/**
 * Singing-bowl additive partials: fundamental stays at the exact tuned Hz,
 * a detuned twin creates the slow "shimmer" beating of a rubbed bowl, and
 * quieter, slightly inharmonic overtones give the metallic body.
 *
 * MUST stay in sync with BOWL_PARTIALS in client/public/dds-processor.js
 * (the web AudioWorklet cannot import from this package).
 */
export const BOWL_PARTIALS: ReadonlyArray<{ ratio: number; gain: number }> = [
  { ratio: 1, gain: 1 }, // fundamental — the precision-tuned frequency
  { ratio: 1.005, gain: 0.55 }, // detuned twin → slow shimmer beating
  { ratio: 2, gain: 0.28 }, // octave ring
  { ratio: 3.01, gain: 0.14 }, // slightly inharmonic metallic body
  { ratio: 4.19, gain: 0.07 }, // high sheen
];

/** Normalization so the summed bowl partials never exceed unity gain. */
export const BOWL_GAIN_NORM =
  1 / BOWL_PARTIALS.reduce((sum, p) => sum + p.gain, 0);

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
