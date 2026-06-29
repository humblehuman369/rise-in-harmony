/**
 * DDS (Direct Digital Synthesis) AudioWorklet Processor
 * ResoNate SRS v1.0 — NFR-FREQ-004 compliance
 *
 * Uses 64-bit (JavaScript number = IEEE 754 double) phase accumulation
 * to eliminate long-term frequency drift during sessions > 2 hours.
 *
 * Supports: sine, square, triangle, sawtooth waveforms (FR-003)
 * Supports: isochronic tone mode with configurable pulse rate + duty cycle (FR-021)
 * Supports: binaural mode with independent L/R frequencies (FR-020)
 * Phase-continuous: frequency changes via atomic phase increment update — no clicks (FR-002)
 */
class DDSProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Left channel state
    this._phaseL = 0.0;       // [0, 1) normalized phase
    this._freqL = 440.0;

    // Right channel state (binaural)
    this._phaseR = 0.0;
    this._freqR = 440.0;

    // Amplitude
    this._amplitude = 0.0;
    this._targetAmplitude = 0.0;
    this._ampSmooth = 0.0005; // ~10ms at 48kHz

    // Waveform: 'sine' | 'square' | 'triangle' | 'sawtooth'
    this._waveform = 'sine';

    // Isochronic mode
    this._isochronic = false;
    this._isoRate = 10.0;     // Hz pulse rate
    this._isoDuty = 0.5;      // duty cycle 0–1
    this._isoPhase = 0.0;

    // Mode: 'mono' | 'binaural'
    this._mode = 'mono';

    this.port.onmessage = (e) => {
      const d = e.data;
      if (d.type === 'setFreq') {
        this._freqL = d.freqL;
        this._freqR = d.freqR ?? d.freqL;
      } else if (d.type === 'setAmplitude') {
        this._targetAmplitude = Math.max(0, Math.min(1, d.value));
      } else if (d.type === 'setWaveform') {
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

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const left = output[0];
    const right = output.length > 1 ? output[1] : output[0];
    const sampleRate = sampleRate; // AudioWorkletGlobalScope

    const dtL = this._freqL / sampleRate;
    const dtR = this._freqR / sampleRate;
    const dtIso = this._isoRate / sampleRate;
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

      // Left channel
      const sL = this._sample(this._phaseL, this._waveform) * amp;
      this._phaseL += dtL;
      if (this._phaseL >= 1.0) this._phaseL -= 1.0;

      if (this._mode === 'binaural') {
        // Right channel — independent frequency
        const sR = this._sample(this._phaseR, this._waveform) * amp;
        this._phaseR += dtR;
        if (this._phaseR >= 1.0) this._phaseR -= 1.0;
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
