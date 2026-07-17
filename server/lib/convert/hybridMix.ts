/**
 * TrueHz hybrid bed: mix sample-accurate pure sine under retuned audio,
 * then apply a true-peak style brickwall limiter (~−1 dBTP).
 */
import {
  clampHz,
  dbToLinear,
  renderSinePcm,
} from "../../../packages/shared-utils/src/trueHzOffline.ts";
import { readWavFile, writeWavFile, type WavData } from "./wavCodec";

/** Target true-peak ceiling (linear), ~ −1.0 dBTP */
export const TRUE_PEAK_LIMIT = 10 ** (-1.0 / 20); // ≈ 0.89125

export type HybridMixOptions = {
  hybridHz: number;
  hybridGainDb: number;
  /** If true, skip music and write pure sine (QC). */
  bedOnly?: boolean;
};

/**
 * Soft brickwall: scale so peak ≤ limit, with tiny headroom.
 * Not a full ITU true-peak oversampler; sufficient for Phase 2 offline master.
 */
export function applyPeakLimiter(
  samples: Float32Array,
  limit = TRUE_PEAK_LIMIT,
): { peakBefore: number; peakAfter: number; gainApplied: number } {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i] ?? 0);
    if (a > peak) peak = a;
  }
  if (peak <= limit || peak === 0) {
    return { peakBefore: peak, peakAfter: peak, gainApplied: 1 };
  }
  const g = limit / peak;
  for (let i = 0; i < samples.length; i++) {
    samples[i] = (samples[i] ?? 0) * g;
  }
  return { peakBefore: peak, peakAfter: limit, gainApplied: g };
}

/**
 * Mix mono TrueHz sine into stereo (or mono) wav, equal on all channels.
 */
export function mixHybridBed(
  wav: WavData,
  opts: HybridMixOptions,
): {
  wav: WavData;
  hybridHz: number;
  bedAmplitude: number;
  limiter: { peakBefore: number; peakAfter: number; gainApplied: number };
} {
  const hz = clampHz(opts.hybridHz);
  const bedAmp = Math.min(0.5, Math.max(0, dbToLinear(opts.hybridGainDb)));
  const durationSec = wav.frameCount / wav.sampleRate;
  const bed = renderSinePcm(hz, durationSec, wav.sampleRate, bedAmp);

  const out = new Float32Array(wav.samples.length);
  const ch = wav.channels;

  for (let f = 0; f < wav.frameCount; f++) {
    const bedS = bed[f] ?? 0;
    for (let c = 0; c < ch; c++) {
      const idx = f * ch + c;
      const music = opts.bedOnly ? 0 : (wav.samples[idx] ?? 0);
      out[idx] = music + bedS;
    }
  }

  const limiter = applyPeakLimiter(out);
  return {
    wav: {
      sampleRate: wav.sampleRate,
      channels: wav.channels,
      samples: out,
      frameCount: wav.frameCount,
    },
    hybridHz: hz,
    bedAmplitude: bedAmp,
    limiter,
  };
}

/** Apply hybrid mix to a WAV file on disk. */
export async function applyHybridToWavFile(
  inPath: string,
  outPath: string,
  opts: HybridMixOptions,
): Promise<{
  hybridHz: number;
  bedAmplitude: number;
  limiter: { peakBefore: number; peakAfter: number; gainApplied: number };
}> {
  const wav = await readWavFile(inPath);
  const result = mixHybridBed(wav, opts);
  await writeWavFile(outPath, result.wav, 16);
  return {
    hybridHz: result.hybridHz,
    bedAmplitude: result.bedAmplitude,
    limiter: result.limiter,
  };
}

/**
 * Parabolic-interpolated FFT peak of mono mixdown — for hybrid QC.
 * Zero-pads to ≥4s equivalent length for sub-0.05 Hz resolution at 48 kHz.
 */
export function measurePeakHz(
  samples: Float32Array,
  sampleRate: number,
  channels: number,
  searchLo = 20,
  searchHi = 5000,
): number {
  // Mono mixdown, skip edges for steady-state
  const frames = Math.floor(samples.length / channels);
  const start = Math.min(frames - 1, Math.floor(0.15 * sampleRate));
  const end = Math.max(start + 1, Math.min(frames, frames - Math.floor(0.15 * sampleRate)));
  const n = end - start;
  const mono = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    const f = start + i;
    for (let c = 0; c < channels; c++) {
      s += samples[f * channels + c] ?? 0;
    }
    mono[i] = s / channels;
  }
  // Hann
  if (n > 1) {
    for (let i = 0; i < n; i++) {
      mono[i] *= 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    }
  }

  // Zero-pad to next power of 2 with enough length for ≤0.02 Hz bins when possible
  const minNfft = Math.max(n, Math.ceil(sampleRate / 0.02));
  let nfft = 1;
  while (nfft < minNfft) nfft <<= 1;
  // Cap memory (≈ 2^20 ≈ 1M samples)
  nfft = Math.min(nfft, 1 << 20);

  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  for (let i = 0; i < n; i++) re[i] = mono[i] ?? 0;
  fftInPlace(re, im);

  const binHz = sampleRate / nfft;
  const lo = Math.max(1, Math.floor(searchLo / binHz));
  const hi = Math.min(nfft / 2 - 1, Math.ceil(searchHi / binHz));
  let bestK = lo;
  let bestMag = 0;
  for (let k = lo; k <= hi; k++) {
    const mag = re[k]! * re[k]! + im[k]! * im[k]!;
    if (mag > bestMag) {
      bestMag = mag;
      bestK = k;
    }
  }
  // Parabolic interpolation on log magnitude for better sub-bin accuracy
  const m0 = Math.log(magAt(re, im, bestK - 1) + 1e-20);
  const m1 = Math.log(magAt(re, im, bestK) + 1e-20);
  const m2 = Math.log(magAt(re, im, bestK + 1) + 1e-20);
  const denom = m0 - 2 * m1 + m2;
  const delta = denom !== 0 ? (0.5 * (m0 - m2)) / denom : 0;
  return (bestK + delta) * binHz;
}

function magAt(re: Float64Array, im: Float64Array, k: number): number {
  if (k < 0 || k >= re.length) return 0;
  return Math.sqrt(re[k]! * re[k]! + im[k]! * im[k]!);
}

/** In-place radix-2 FFT */
function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  // bit reverse
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]!;
      re[i] = re[j]!;
      re[j] = tr;
      const ti = im[i]!;
      im[i] = im[j]!;
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j]!;
        const uIm = im[i + j]!;
        const vRe = re[i + j + len / 2]! * wRe - im[i + j + len / 2]! * wIm;
        const vIm = re[i + j + len / 2]! * wIm + im[i + j + len / 2]! * wRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + len / 2] = uRe - vRe;
        im[i + j + len / 2] = uIm - vIm;
        const nWRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nWRe;
      }
    }
  }
}
