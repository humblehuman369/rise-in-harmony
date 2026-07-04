/**
 * Synthesis engine — live frequency generation via react-native-audio-api.
 *
 * Replaces the pre-rendered frequency MP3s with real oscillators:
 *   - Pure tones at any Hz (1–22000, 0.01 resolution) in 4 waveforms
 *   - True binaural beats: left ear carrier, right ear carrier + beat,
 *     via hard-panned stereo oscillators (requires headphones)
 *   - Isochronic pulses: amplitude-gated tone (square LFO on a gate gain)
 *
 * All voices share one AudioContext and end in their own envelope GainNode,
 * so multiple voices can run concurrently (e.g. chakra crossfades).
 */
import {
  AudioContext,
  AudioManager,
  type GainNode,
  type OscillatorNode,
  type ConstantSourceNode,
} from "react-native-audio-api";
import {
  clampHz,
  clampBeatHz,
  binauralPair,
  type Waveform,
} from "./synthMath";

let sharedCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === "closed") {
    AudioManager.setAudioSessionOptions({
      iosCategory: "playback",
      iosMode: "default",
      // Route to high-fidelity outputs: stereo Bluetooth (A2DP, not the
      // low-quality hands-free profile) and AirPlay speakers.
      iosOptions: ["allowBluetoothA2DP", "allowAirPlay"],
    });
    AudioManager.setAudioSessionActivity(true).catch(() => {});
    sharedCtx = new AudioContext();
  }
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

export interface VoiceOptions {
  hz: number;
  waveform?: Waveform;
  /** When set, produces a binaural pair: left = hz, right = hz + beat */
  binauralBeatHz?: number;
  /** When set, gates the tone's amplitude at this pulse rate */
  isochronicHz?: number;
  /** Initial volume 0–1 (default 0.8) */
  volume?: number;
}

export interface SynthVoice {
  start(fadeInSec?: number): void;
  stop(fadeOutSec?: number): void;
  setVolume(volume: number, rampSec?: number): void;
  /** Retune the voice; binaural voices keep their beat offset. */
  setFrequency(hz: number): void;
  readonly isRunning: boolean;
}

export function createVoice(options: VoiceOptions): SynthVoice {
  const ctx = getContext();
  const waveform = options.waveform ?? "sine";
  const beatHz = options.binauralBeatHz;
  let volume = Math.max(0, Math.min(1, options.volume ?? 0.8));

  const envelope: GainNode = ctx.createGain();
  envelope.gain.value = 0;
  envelope.connect(ctx.destination);

  const oscillators: OscillatorNode[] = [];
  const extraSources: (OscillatorNode | ConstantSourceNode)[] = [];
  let running = false;

  // ── Build the voice graph ─────────────────────────────────────────────────
  if (beatHz !== undefined) {
    // Binaural: two oscillators hard-panned left/right
    const [leftHz, rightHz] = binauralPair(options.hz, beatHz);

    const leftOsc = ctx.createOscillator();
    leftOsc.type = waveform;
    leftOsc.frequency.value = leftHz;
    const leftPan = ctx.createStereoPanner();
    leftPan.pan.value = -1;
    leftOsc.connect(leftPan);
    leftPan.connect(envelope);

    const rightOsc = ctx.createOscillator();
    rightOsc.type = waveform;
    rightOsc.frequency.value = rightHz;
    const rightPan = ctx.createStereoPanner();
    rightPan.pan.value = 1;
    rightOsc.connect(rightPan);
    rightPan.connect(envelope);

    oscillators.push(leftOsc, rightOsc);
  } else {
    const osc = ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.value = clampHz(options.hz);

    if (options.isochronicHz !== undefined) {
      // Isochronic: gate the tone with a 0..1 square modulation
      // gate.gain = 0 (base) + squareLFO(±0.5) + constant(0.5)
      const gate = ctx.createGain();
      gate.gain.value = 0;

      const lfo = ctx.createOscillator();
      lfo.type = "square";
      lfo.frequency.value = clampBeatHz(options.isochronicHz);
      const lfoScale = ctx.createGain();
      lfoScale.gain.value = 0.5;
      lfo.connect(lfoScale);
      lfoScale.connect(gate.gain);

      const offset = ctx.createConstantSource();
      offset.offset.value = 0.5;
      offset.connect(gate.gain);

      osc.connect(gate);
      gate.connect(envelope);
      extraSources.push(lfo, offset);
    } else {
      osc.connect(envelope);
    }
    oscillators.push(osc);
  }

  return {
    get isRunning() {
      return running;
    },

    start(fadeInSec = 1.5) {
      if (running) return;
      running = true;
      oscillators.forEach((o) => o.start(0));
      extraSources.forEach((s) => s.start(0));
      const now = ctx.currentTime;
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(volume, now + Math.max(0.01, fadeInSec));
    },

    setVolume(v: number, rampSec = 0.05) {
      volume = Math.max(0, Math.min(1, v));
      if (running) {
        envelope.gain.linearRampToValueAtTime(volume, ctx.currentTime + rampSec);
      }
    },

    setFrequency(hz: number) {
      if (beatHz !== undefined) {
        const [leftHz, rightHz] = binauralPair(hz, beatHz);
        if (oscillators[0]) oscillators[0].frequency.value = leftHz;
        if (oscillators[1]) oscillators[1].frequency.value = rightHz;
      } else if (oscillators[0]) {
        oscillators[0].frequency.value = clampHz(hz);
      }
    },

    stop(fadeOutSec = 0.4) {
      if (!running) return;
      running = false;
      const now = ctx.currentTime;
      const end = now + Math.max(0.05, fadeOutSec);
      envelope.gain.linearRampToValueAtTime(0, end);
      const stopAt = end + 0.05;
      oscillators.forEach((o) => {
        try {
          o.stop(stopAt);
        } catch {}
      });
      extraSources.forEach((s) => {
        try {
          s.stop(stopAt);
        } catch {}
      });
    },
  };
}

/**
 * Build a voice for an entry from the shared FREQUENCIES catalog.
 * Solfeggio entries become pure tones; binaural entries (alpha/theta/delta,
 * whose hz value IS the beat frequency) ride on the standard 200Hz carrier.
 */
export function createCatalogVoice(
  freq: { hz: number; category: "solfeggio" | "binaural" },
  volume: number
): SynthVoice {
  if (freq.category === "binaural") {
    return createVoice({
      hz: 200,
      binauralBeatHz: freq.hz,
      volume,
    });
  }
  return createVoice({ hz: freq.hz, volume });
}
