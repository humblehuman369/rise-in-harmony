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
  type AudioNode,
  type GainNode,
  type OscillatorNode,
  type ConstantSourceNode,
} from "react-native-audio-api";
import {
  clampHz,
  clampBeatHz,
  binauralPair,
  BOWL_PARTIALS,
  BOWL_GAIN_NORM,
  type Waveform,
} from "./synthMath";

let sharedCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === "closed") {
    // NOTE: do NOT pass iosOptions here. "allowAirPlay"/"allowBluetoothA2DP"
    // may only be set explicitly with the playAndRecord category — combining
    // them with "playback" raises NSInvalidArgumentException and crashes the
    // app (TestFlight crash B6479B0C, build 21). With the playback category,
    // AirPlay and A2DP routing are enabled implicitly (Apple QA1803).
    AudioManager.setAudioSessionOptions({
      iosCategory: "playback",
      iosMode: "default",
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

interface ToneStack {
  oscillators: OscillatorNode[];
  retune(hz: number): void;
}

/**
 * Build the sound source for one channel. Standard waveforms are a single
 * native oscillator; "bowl" is an additive stack of sine partials whose
 * fundamental sits at the exact requested Hz (singing-bowl timbre without
 * sacrificing frequency precision).
 */
function buildToneStack(
  ctx: AudioContext,
  hz: number,
  waveform: Waveform,
  destination: AudioNode
): ToneStack {
  if (waveform === "bowl") {
    const nyquist = ctx.sampleRate / 2;
    const oscillators: OscillatorNode[] = [];
    const partialGains: GainNode[] = [];

    // All partials are always created; ones at/above Nyquist are muted via
    // their gain node so retuning in either direction stays consistent
    // (no stale frequencies, and muted partials come back on downward retunes).
    const applyHz = (targetHz: number) => {
      BOWL_PARTIALS.forEach((partial, i) => {
        const partialHz = targetHz * partial.ratio;
        const audible = partialHz < nyquist;
        oscillators[i].frequency.value = audible ? partialHz : 0;
        partialGains[i].gain.value = audible ? partial.gain * BOWL_GAIN_NORM : 0;
      });
    };

    for (const _partial of BOWL_PARTIALS) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const partialGain = ctx.createGain();
      osc.connect(partialGain);
      partialGain.connect(destination);
      oscillators.push(osc);
      partialGains.push(partialGain);
    }
    applyHz(hz);

    return {
      oscillators,
      retune: applyHz,
    };
  }

  const osc = ctx.createOscillator();
  osc.type = waveform;
  osc.frequency.value = hz;
  osc.connect(destination);
  return {
    oscillators: [osc],
    retune(nextHz: number) {
      osc.frequency.value = nextHz;
    },
  };
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
  let retuneLeft: (hz: number) => void = () => {};
  let retuneRight: ((hz: number) => void) | null = null;
  let running = false;

  // ── Build the voice graph ─────────────────────────────────────────────────
  if (beatHz !== undefined) {
    // Binaural: two tone stacks hard-panned left/right
    const [leftHz, rightHz] = binauralPair(options.hz, beatHz);

    const leftPan = ctx.createStereoPanner();
    leftPan.pan.value = -1;
    leftPan.connect(envelope);
    const leftStack = buildToneStack(ctx, leftHz, waveform, leftPan);

    const rightPan = ctx.createStereoPanner();
    rightPan.pan.value = 1;
    rightPan.connect(envelope);
    const rightStack = buildToneStack(ctx, rightHz, waveform, rightPan);

    oscillators.push(...leftStack.oscillators, ...rightStack.oscillators);
    retuneLeft = leftStack.retune;
    retuneRight = rightStack.retune;
  } else {
    let toneDestination: AudioNode = envelope;

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

      gate.connect(envelope);
      extraSources.push(lfo, offset);
      toneDestination = gate;
    }

    const stack = buildToneStack(ctx, clampHz(options.hz), waveform, toneDestination);
    oscillators.push(...stack.oscillators);
    retuneLeft = stack.retune;
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
        retuneLeft(leftHz);
        retuneRight?.(rightHz);
      } else {
        retuneLeft(clampHz(hz));
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
        try { o.stop(stopAt); } catch { /* already stopped */ }
      });
      extraSources.forEach((s) => {
        try { s.stop(stopAt); } catch { /* already stopped */ }
      });
      // Disconnect the entire voice subgraph from the AudioContext destination
      // after the fade-out completes. Without this, stopped oscillator nodes
      // remain connected and accumulate in the native audio graph, eventually
      // exhausting the rendering budget and causing silence.
      // See: https://developer.mozilla.org/en-US/docs/Web/API/AudioNode/disconnect
      const disconnectDelayMs = Math.ceil((stopAt - now + 0.1) * 1000);
      setTimeout(() => {
        try { envelope.disconnect(); } catch { /* already disconnected */ }
        oscillators.forEach((o) => {
          try { o.disconnect(); } catch { /* no-op */ }
        });
        extraSources.forEach((s) => {
          try { s.disconnect(); } catch { /* no-op */ }
        });
      }, disconnectDelayMs);
    },
  };
}

/**
 * Build a voice for an entry from the shared FREQUENCIES catalog.
 * - solfeggio: pure tone at the exact catalog Hz
 * - binaural: the catalog hz IS the beat frequency, riding on the standard
 *   200Hz carrier (left 200, right 200 + beat)
 * - isochronic: the catalog hz IS the pulse rate, gating a 200Hz tone
 *   (works on speakers — no headphones needed)
 */
export function createCatalogVoice(
  freq: { hz: number; category: "solfeggio" | "binaural" | "isochronic" | "recorded" },
  volume: number,
  waveform: Waveform = "sine"
): SynthVoice {
  switch (freq.category) {
    case "binaural":
      return createVoice({ hz: 200, binauralBeatHz: freq.hz, volume, waveform });
    case "isochronic":
      return createVoice({ hz: 200, isochronicHz: freq.hz, volume, waveform });
    case "solfeggio":
      return createVoice({ hz: freq.hz, volume, waveform });
    case "recorded":
      // Recorded sessions are streamed pre-mixed files, never synthesized —
      // callers must route them to the media player path instead.
      throw new Error("Recorded sessions cannot be synthesized — use streamed playback");
    default: {
      const exhaustive: never = freq.category;
      throw new Error(`Unknown frequency category: ${exhaustive}`);
    }
  }
}
