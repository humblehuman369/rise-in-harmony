/**
 * Offline TrueHz pure-tone render (sample-accurate sine).
 * Used for optional hybrid bed under Convert outputs (Phase 2+).
 */

/** Clamp Hz to TrueHz contract: 1–22000 @ 0.01 resolution. */
export function clampHz(hz: number): number {
  const n = Number(hz);
  if (!Number.isFinite(n)) return 1;
  const clamped = Math.min(22000, Math.max(1, n));
  return Math.round(clamped * 100) / 100;
}

/**
 * Render a mono Float32 sine at exact f Hz for `durationSec` at `sampleRate`.
 * Phase is continuous from 0; amplitude is linear peak (0–1).
 */
export function renderSinePcm(
  frequencyHz: number,
  durationSec: number,
  sampleRate: number,
  amplitude = 0.25,
): Float32Array {
  const f = clampHz(frequencyHz);
  const fs = Math.max(8000, Math.floor(sampleRate));
  const n = Math.max(0, Math.floor(durationSec * fs));
  const out = new Float32Array(n);
  const twoPiFOverFs = (2 * Math.PI * f) / fs;
  const amp = Math.min(1, Math.max(0, amplitude));
  for (let i = 0; i < n; i++) {
    out[i] = Math.sin(twoPiFOverFs * i) * amp;
  }
  return out;
}

/** Convert linear amplitude to dB (0 dBFS = 1.0). */
export function dbToLinear(db: number): number {
  return 10 ** (db / 20);
}
