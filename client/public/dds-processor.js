/**
 * DDS (Direct Digital Synthesis) AudioWorklet Processor
 * ResoNate SRS v1.0 — NFR-FREQ-004 compliance
 *
 * Uses 64-bit (JavaScript number = IEEE 754 double) phase accumulation
 * to eliminate long-term frequency drift during sessions > 2 hours.
 *
 * Supports: sine, square, triangle, sawtooth waveforms (FR-003)
 * Supports: "bowl" singing-bowl timbre — additive sine partials with the
 *           fundamental at the exact tuned Hz (precision is preserved)
 * Supports: isochronic tone mode with configurable pulse rate + duty cycle (FR-021)
 * Supports: binaural mode with independent L/R frequencies (FR-020)
 * Phase-continuous: frequency changes via atomic phase increment update — no clicks (FR-002)
 */
/**
 * Singing-bowl additive partials: fundamental stays at the exact tuned Hz,
 * a detuned twin creates the slow "shimmer" beating of a rubbed bowl, and
 * quieter, slightly inharmonic overtones give the metallic body.
 *
 * MUST stay in sync with BOWL_PARTIALS in apps/mobile/src/lib/synthMath.ts
 * (this worklet runs in an isolated scope and cannot import shared modules).
 */
const BOWL_PARTIALS = [
  { ratio: 1, gain: 1 },        // fundamental — the precision-tuned frequency
  { ratio: 1.005, gain: 0.55 }, // detuned twin → slow shimmer beating
  { ratio: 2, gain: 0.28 },     // octave ring
  { ratio: 3.01, gain: 0.14 },  // slightly inharmonic metallic body
  { ratio: 4.19, gain: 0.07 },  // high sheen
];
const BOWL_GAIN_NORM = 1 / BOWL_PARTIALS.reduce((sum, p) => sum + p.gain, 0);

/**
 * Tuning-fork additive partials: a struck fork is dominated by its fundamental
 * (the precision-tuned Hz) with a faint clang mode near 6.27x that decays much
 * faster than the fundamental. The fork is periodically re-struck so the tone
 * breathes like a real instrument instead of sustaining forever.
 */
const FORK_PARTIALS = [
  { ratio: 1, gain: 1, decay: 0.12 },      // fundamental — slow decay (~8s to -60dB)
  { ratio: 6.267, gain: 0.18, decay: 2.2 }, // clang mode — fast decay (~0.5s)
];
const FORK_GAIN_NORM = 1 / FORK_PARTIALS.reduce((sum, p) => sum + p.gain, 0);
const FORK_STRIKE_INTERVAL = 8.0; // seconds between re-strikes
const FORK_ATTACK = 0.004;        // 4ms strike attack

class DDSProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Left channel state
    this._phaseL = 0.0;       // [0, 1) normalized phase
    this._freqL = 440.0;

    // Right channel state (binaural)
    this._phaseR = 0.0;
    this._freqR = 440.0;

    // Amplitude — start at full so GainNode controls the envelope
    this._amplitude = 1.0;
    this._targetAmplitude = 1.0;
    this._ampSmooth = 0.0005; // ~10ms at 48kHz

    // Waveform: 'sine' | 'square' | 'triangle' | 'sawtooth' | 'bowl'
    this._waveform = 'sine';

    // Bowl mode: one phase accumulator per additive partial, per channel
    this._bowlPhasesL = new Float64Array(BOWL_PARTIALS.length);
    this._bowlPhasesR = new Float64Array(BOWL_PARTIALS.length);

    // Fork mode: per-partial phase accumulators + strike clock (seconds since strike)
    this._forkPhasesL = new Float64Array(FORK_PARTIALS.length);
    this._forkPhasesR = new Float64Array(FORK_PARTIALS.length);
    this._forkClock = 0.0;

    // Isochronic mode
    this._isochronic = false;
    this._isoRate = 10.0;     // Hz pulse rate
    this._isoDuty = 0.5;      // duty cycle 0–1
    this._isoPhase = 0.0;

    // Mode: 'mono' | 'binaural'
    this._mode = 'mono';

    // Signal to the main thread that this processor instance is ready to receive messages
    this.port.postMessage({ type: 'ready' });

    this.port.onmessage = (e) => {
      const d = e.data;
      if (d.type === 'setFreq') {
        this._freqL = d.freqL;
        this._freqR = d.freqR ?? d.freqL;
      } else if (d.type === 'setAmplitude') {
        this._targetAmplitude = Math.max(0, Math.min(1, d.value));
      } else if (d.type === 'setWaveform') {
        if (d.waveform === 'fork' && this._waveform !== 'fork') {
          this._forkClock = 0.0; // strike immediately on switching to fork
        }
        this._waveform = d.waveform;
      } else if (d.type === 'setMode') {
        this._mode = d.mode; // 'mono' | 'binaural'
      } else if (d.type === 'setIsochronic') {
        this._isochronic = d.enabled;
        if (d.rate !== undefined) this._isoRate = d.rate;
        if (d.duty !== undefined) this._isoDuty = d.duty;
      } else if (d.type === 'getPhase') {
        this.port.postMessage({ type: 'phase', phaseL: this._phaseL });
      }
    };
  }

  /** Generate one sample for a given normalized phase [0,1) */
  _sample(phase, waveform) {
    switch (waveform) {
      case 'sine':
        return Math.sin(phase * 2 * Math.PI);
      case 'square':
        return phase < 0.5 ? 1.0 : -1.0;
      case 'triangle':
        return phase < 0.5
          ? 4 * phase - 1
          : 3 - 4 * phase;
      case 'sawtooth':
        return 2 * phase - 1;
      default:
        return Math.sin(phase * 2 * Math.PI);
    }
  }

  /**
   * One additive tuning-fork sample. Each partial has its own exponential
   * decay from the last strike; the fork re-strikes every FORK_STRIKE_INTERVAL
   * seconds. Fundamental stays at the exact tuned Hz (precision preserved).
   */
  _forkSample(phases, freq, sr, t) {
    let s = 0;
    const nyquist = sr / 2;
    // Short linear attack right after the strike to avoid a click
    const attack = t < FORK_ATTACK ? t / FORK_ATTACK : 1.0;
    for (let p = 0; p < FORK_PARTIALS.length; p++) {
      const part = FORK_PARTIALS[p];
      const partialFreq = freq * part.ratio;
      if (partialFreq >= nyquist) continue;
      const env = Math.exp(-t * part.decay * 5.0) * attack;
      s += Math.sin(phases[p] * 2 * Math.PI) * part.gain * env;
      phases[p] += partialFreq / sr;
      if (phases[p] >= 1.0) phases[p] -= 1.0;
    }
    return s * FORK_GAIN_NORM;
  }

  /**
   * One additive singing-bowl sample. Advances the per-partial phase array
   * in place. Partials at or above Nyquist are skipped to avoid aliasing.
   */
  _bowlSample(phases, freq, sr) {
    let s = 0;
    const nyquist = sr / 2;
    for (let p = 0; p < BOWL_PARTIALS.length; p++) {
      const partialFreq = freq * BOWL_PARTIALS[p].ratio;
      if (partialFreq >= nyquist) continue;
      s += Math.sin(phases[p] * 2 * Math.PI) * BOWL_PARTIALS[p].gain;
      phases[p] += partialFreq / sr;
      if (phases[p] >= 1.0) phases[p] -= 1.0;
    }
    return s * BOWL_GAIN_NORM;
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const left = output[0];
    const right = output.length > 1 ? output[1] : output[0];
    const sr = sampleRate; // AudioWorkletGlobalScope global

    const dtL = this._freqL / sr;
    const dtR = this._freqR / sr;
    const dtIso = this._isoRate / sr;
    const smooth = this._ampSmooth;

    for (let i = 0; i < left.length; i++) {
      // Smooth amplitude toward target
      this._amplitude += (this._targetAmplitude - this._amplitude) * smooth;

      // Isochronic envelope
      let isoEnv = 1.0;
      if (this._isochronic) {
        this._isoPhase += dtIso;
        if (this._isoPhase >= 1.0) this._isoPhase -= 1.0;
        isoEnv = this._isoPhase < this._isoDuty ? 1.0 : 0.0;
      }

      const amp = this._amplitude * isoEnv;
      const isBowl = this._waveform === 'bowl';
      const isFork = this._waveform === 'fork';

      // Fork strike clock — advance and wrap for periodic re-strikes
      let forkT = 0;
      if (isFork) {
        forkT = this._forkClock;
        this._forkClock += 1 / sr;
        if (this._forkClock >= FORK_STRIKE_INTERVAL) this._forkClock -= FORK_STRIKE_INTERVAL;
      }

      // Left channel
      let sL;
      if (isBowl) {
        sL = this._bowlSample(this._bowlPhasesL, this._freqL, sr) * amp;
      } else if (isFork) {
        sL = this._forkSample(this._forkPhasesL, this._freqL, sr, forkT) * amp;
      } else {
        sL = this._sample(this._phaseL, this._waveform) * amp;
        this._phaseL += dtL;
        if (this._phaseL >= 1.0) this._phaseL -= 1.0;
      }

      if (this._mode === 'binaural') {
        // Right channel — independent frequency
        let sR;
        if (isBowl) {
          sR = this._bowlSample(this._bowlPhasesR, this._freqR, sr) * amp;
        } else if (isFork) {
          sR = this._forkSample(this._forkPhasesR, this._freqR, sr, forkT) * amp;
        } else {
          sR = this._sample(this._phaseR, this._waveform) * amp;
          this._phaseR += dtR;
          if (this._phaseR >= 1.0) this._phaseR -= 1.0;
        }
        left[i] = sL;
        right[i] = sR;
      } else {
        // Mono — same signal to both channels
        left[i] = sL;
        right[i] = sL;
      }
    }

    return true;
  }
}

registerProcessor('dds-processor', DDSProcessor);
