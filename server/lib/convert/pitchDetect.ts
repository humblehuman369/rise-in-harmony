/**
 * Experimental concert-pitch estimator for TrueHz Convert.
 * Estimates a dominant fundamental, then snaps to common A= refs (432/440/444).
 * Not a full music key detector — labeled experimental in the API/UI.
 */
import { readWavFile } from "./wavCodec";

export type PitchDetectResult = {
  /** Dominant peak in search band (Hz). */
  dominantHz: number;
  /** Best-guess concert A among candidates. */
  suggestedSourceA: number;
  /** Confidence 0–1 (relative peak strength). */
  confidence: number;
  /** How far dominant is from nearest candidate A (cents). */
  centsFromSuggested: number;
  experimental: true;
  note: string;
};

const CANDIDATE_A = [432, 440, 444] as const;

/**
 * Autocorrelation pitch estimate on mono mixdown (YIN-lite / ACF peak).
 * Good enough for pure tones and sparse content; noisy mixes → low confidence.
 */
export function estimateDominantHz(
  samples: Float32Array,
  sampleRate: number,
  channels: number,
  opts?: { minHz?: number; maxHz?: number },
): { hz: number; confidence: number } {
  const minHz = opts?.minHz ?? 80;
  const maxHz = opts?.maxHz ?? 1000;
  const frames = Math.floor(samples.length / channels);
  // Use up to 3s from middle
  const maxFrames = Math.min(frames, Math.floor(sampleRate * 3));
  const start = Math.max(0, Math.floor((frames - maxFrames) / 2));
  const n = maxFrames;
  const mono = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < channels; c++) {
      s += samples[(start + i) * channels + c] ?? 0;
    }
    mono[i] = s / channels;
  }

  // Remove DC
  let mean = 0;
  for (let i = 0; i < n; i++) mean += mono[i]!;
  mean /= n;
  for (let i = 0; i < n; i++) mono[i]! -= mean;

  // RMS
  let rms = 0;
  for (let i = 0; i < n; i++) rms += mono[i]! * mono[i]!;
  rms = Math.sqrt(rms / n);
  if (rms < 1e-6) {
    return { hz: 0, confidence: 0 };
  }

  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.min(n - 1, Math.floor(sampleRate / minHz));
  if (maxLag <= minLag + 2) {
    return { hz: 0, confidence: 0 };
  }

  let bestLag = minLag;
  let bestCorr = -Infinity;
  let zeroCorr = 0;
  for (let i = 0; i < n; i++) zeroCorr += mono[i]! * mono[i]!;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    const len = n - lag;
    for (let i = 0; i < len; i++) {
      corr += mono[i]! * mono[i + lag]!;
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  const confidence = Math.min(1, Math.max(0, bestCorr / (zeroCorr + 1e-12)));
  // Parabolic refine
  const c0 = acfAt(mono, bestLag - 1, n);
  const c1 = bestCorr;
  const c2 = acfAt(mono, bestLag + 1, n);
  const denom = c0 - 2 * c1 + c2;
  const delta = denom !== 0 ? (0.5 * (c0 - c2)) / denom : 0;
  const lag = bestLag + delta;
  const hz = sampleRate / lag;
  return { hz, confidence };
}

function acfAt(mono: Float64Array, lag: number, n: number): number {
  if (lag < 1 || lag >= n) return 0;
  let corr = 0;
  const len = n - lag;
  for (let i = 0; i < len; i++) corr += mono[i]! * mono[i + lag]!;
  return corr;
}

export function snapToConcertA(dominantHz: number): {
  suggestedSourceA: number;
  centsFromSuggested: number;
} {
  if (!(dominantHz > 0)) {
    return { suggestedSourceA: 440, centsFromSuggested: 0 };
  }
  // Fold into octave near A4 by repeated *2 /2
  let f = dominantHz;
  while (f < 200) f *= 2;
  while (f > 900) f /= 2;

  let bestA: number = 440;
  let bestAbsCents = Infinity;
  for (const a of CANDIDATE_A) {
    // Compare f to a and harmonic neighbors a/2, 2a within band
    for (const ref of [a / 2, a, a * 2]) {
      if (ref < 100 || ref > 1000) continue;
      const cents = 1200 * Math.log2(f / ref);
      if (Math.abs(cents) < bestAbsCents) {
        bestAbsCents = Math.abs(cents);
        bestA = a;
      }
    }
  }
  const centsFromSuggested = 1200 * Math.log2(f / bestA);
  return { suggestedSourceA: bestA, centsFromSuggested };
}

export function detectConcertAFromPcm(
  samples: Float32Array,
  sampleRate: number,
  channels: number,
): PitchDetectResult {
  const { hz, confidence } = estimateDominantHz(samples, sampleRate, channels);
  const { suggestedSourceA, centsFromSuggested } = snapToConcertA(hz);
  return {
    dominantHz: Math.round(hz * 100) / 100,
    suggestedSourceA,
    confidence: Math.round(confidence * 1000) / 1000,
    centsFromSuggested: Math.round(centsFromSuggested * 100) / 100,
    experimental: true,
    note:
      confidence < 0.25
        ? "Low confidence — noisy or polyphonic source; defaulting suggestion may be unreliable."
        : "Experimental estimate — confirm by ear before trusting.",
  };
}

export async function detectConcertAFromWavFile(
  wavPath: string,
): Promise<PitchDetectResult> {
  const wav = await readWavFile(wavPath);
  return detectConcertAFromPcm(wav.samples, wav.sampleRate, wav.channels);
}
