/**
 * useSoundStudio — Layered Ambient Audio Engine (v4 — Recorded Music + Nature)
 *
 * Three independent layers blended in real-time:
 *   1. Healing Frequency — pure sine wave at the target Hz (Web Audio API)
 *   2. Musical Harmony  — bundled royalty-free ambient/drone/crystal loops
 *   3. Nature Soundscape — procedurally synthesized textures (rain, ocean, forest, wind, fire, river, night, cave, bowl)
 *      plus recorded soundscapes (sleep-preparation) played as seamless loops
 *
 * Music layer uses HTMLAudioElement for looping of real recordings.
 * Nature layer is procedurally synthesized (natureSynth) — endless, never-looping textures —
 * except for recorded keys listed in RECORDED_NATURE_URLS, which loop a studio-produced file.
 * Frequency layer uses Web Audio API oscillators.
 * A DynamicsCompressorNode on the master bus prevents level stacking.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { getLibraryLoopUrl } from "@/data/backgroundLoops";
import { startNatureSynth, type NatureSynthHandle } from "@/lib/natureSynth";
import type { AudioErrorCallback } from "./useFrequencyPlayer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NatureSound =
  | "rain" | "ocean" | "forest" | "wind" | "fire"
  | "river" | "night" | "cave" | "bowl"
  | "sleep-preparation"
  | "none";

/**
 * Nature keys backed by a recorded (studio-produced) audio file instead of
 * procedural synthesis. These play via HTMLAudioElement with looping enabled.
 * Files are pre-processed for seamless looping (equal-power crossfaded tail)
 * and tuned to keep the 200 Hz Delta binaural carrier zone clear (-6 dB notch),
 * so the recording never masks the precision DDS frequency layer.
 */
const RECORDED_NATURE_URLS: Partial<Record<NatureSound, string>> = {
  "sleep-preparation": getLibraryLoopUrl("sleep-preparation"),
};
export type MusicMode = "ambient" | "drone" | "crystal" | "none";

export interface StudioState {
  isPlaying: boolean;
  frequencyHz: number;
  frequencyVolume: number;   // 0–1
  musicMode: MusicMode;
  musicVolume: number;       // 0–1
  natureSound: NatureSound;
  natureVolume: number;      // 0–1
  masterVolume: number;      // 0–1
}

// ─── Audio file URLs (served from Manus storage via getLibraryLoopUrl) ───────
const MUSIC_AUDIO_URLS: Record<Exclude<MusicMode, "none">, string> = {
  ambient: getLibraryLoopUrl("music-ambient"),
  drone: getLibraryLoopUrl("music-drone"),
  crystal: getLibraryLoopUrl("music-crystal"),
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSoundStudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);

  // Layer gain nodes
  const freqGainRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const natureGainRef = useRef<GainNode | null>(null);

  // Active oscillators (frequency layer only)
  const freqOscRef = useRef<OscillatorNode | null>(null);

  // Procedural synth handle for the nature layer (never loops — synthesized live)
  const natureSynthRef = useRef<NatureSynthHandle | null>(null);
  // HTMLAudioElement for recorded nature soundscapes (e.g. Sleep Preparation)
  const natureAudioRef = useRef<HTMLAudioElement | null>(null);
  const natureAudioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  // HTMLAudioElement for music real-audio playback
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [audioContextSuspended, setAudioContextSuspended] = useState(false);
  const onErrorRef = useRef<AudioErrorCallback | null>(null);

  const [state, setState] = useState<StudioState>({
    isPlaying: false,
    frequencyHz: 432,
    frequencyVolume: 0.6,
    musicMode: "ambient",
    musicVolume: 0.4,
    natureSound: "rain",
    natureVolume: 0.35,
    masterVolume: 0.8,
  });

  // ── Audio context bootstrap ──────────────────────────────────────────────────
  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();

      // Master compressor — prevents harsh peaks when layers stack
      const comp = ctxRef.current.createDynamicsCompressor();
      comp.threshold.value = -18;   // dB — gentle limiting
      comp.knee.value = 12;         // soft knee
      comp.ratio.value = 4;         // 4:1 — gentle compression
      comp.attack.value = 0.05;     // 50ms attack
      comp.release.value = 0.3;     // 300ms release
      comp.connect(ctxRef.current.destination);
      compressorRef.current = comp;

      masterGainRef.current = ctxRef.current.createGain();
      masterGainRef.current.gain.value = state.masterVolume;
      masterGainRef.current.connect(comp);

      freqGainRef.current = ctxRef.current.createGain();
      freqGainRef.current.gain.value = state.frequencyVolume;
      freqGainRef.current.connect(masterGainRef.current);

      musicGainRef.current = ctxRef.current.createGain();
      musicGainRef.current.gain.value = state.musicVolume;
      musicGainRef.current.connect(masterGainRef.current);

      natureGainRef.current = ctxRef.current.createGain();
      natureGainRef.current.gain.value = state.natureVolume;
      natureGainRef.current.connect(masterGainRef.current);
    }
    return ctxRef.current;
  }, [state.masterVolume, state.frequencyVolume, state.musicVolume, state.natureVolume]);

  // ── Stop helpers ─────────────────────────────────────────────────────────────
  const stopFrequency = useCallback(() => {
    if (freqOscRef.current) {
      try { freqOscRef.current.stop(); } catch {}
      freqOscRef.current = null;
    }
  }, []);

  const stopMusic = useCallback(() => {
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current.currentTime = 0;
      musicAudioRef.current = null;
    }
    if (musicAudioSourceRef.current) {
      try { musicAudioSourceRef.current.disconnect(); } catch {}
      musicAudioSourceRef.current = null;
    }
  }, []);

  const stopNature = useCallback(() => {
    if (natureSynthRef.current) {
      try { natureSynthRef.current.stop(); } catch {}
      natureSynthRef.current = null;
    }
    if (natureAudioRef.current) {
      natureAudioRef.current.pause();
      natureAudioRef.current.currentTime = 0;
      natureAudioRef.current = null;
    }
    if (natureAudioSourceRef.current) {
      try { natureAudioSourceRef.current.disconnect(); } catch {}
      natureAudioSourceRef.current = null;
    }
  }, []);

  // ── Frequency layer ──────────────────────────────────────────────────────────
  const startFrequency = useCallback((ctx: AudioContext, hz: number) => {
    stopFrequency();
    if (!freqGainRef.current) return;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = hz;

    // Soft 2-second fade-in
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(1, ctx.currentTime + 2);

    osc.connect(env);
    env.connect(freqGainRef.current);
    osc.start();
    freqOscRef.current = osc;
  }, [stopFrequency]);

  // ── Music layer — bundled royalty-free loops ────────────────────────────────
  const startMusicAudio = useCallback((ctx: AudioContext, mode: Exclude<MusicMode, "none">, volume: number) => {
    stopMusic();
    if (!musicGainRef.current) return;

    const url = MUSIC_AUDIO_URLS[mode];
    const audio = new Audio(url);
    audio.loop = true;
    audio.crossOrigin = "anonymous";
    audio.volume = 1;

    const source = ctx.createMediaElementSource(audio);
    source.connect(musicGainRef.current);

    const now = ctx.currentTime;
    musicGainRef.current.gain.setValueAtTime(0, now);
    musicGainRef.current.gain.linearRampToValueAtTime(volume, now + 3);

    audio.play().catch(() => {});

    musicAudioRef.current = audio;
    musicAudioSourceRef.current = source;
  }, [stopMusic]);

  // ── Nature sounds — procedural synthesis (endless, no loop seams) ────────────

  /**
   * Start a procedurally synthesized nature soundscape.
   * Replaces MP3 loop playback: HTMLAudioElement MP3 looping is never gapless
   * (codec padding causes an audible restart), and short source files made the
   * seam obvious. The synth generates continuous, non-repeating texture live.
   */
  const startNatureAudio = useCallback((ctx: AudioContext, soundKey: string) => {
    stopNature();
    if (!natureGainRef.current) return;

    // Recorded soundscape path — bypasses the procedural synth entirely.
    // Used for studio-produced recordings (e.g. "sleep-preparation") that are
    // pre-processed for seamless looping and 200 Hz Delta-carrier clearance.
    const recordedUrl = RECORDED_NATURE_URLS[soundKey as NatureSound];
    if (recordedUrl) {
      const audio = new Audio(recordedUrl);
      audio.loop = true;
      audio.crossOrigin = "anonymous";
      audio.volume = 1;

      const source = ctx.createMediaElementSource(audio);
      source.connect(natureGainRef.current);

      const now = ctx.currentTime;
      natureGainRef.current.gain.setValueAtTime(0, now);
      natureGainRef.current.gain.linearRampToValueAtTime(
        state.natureVolume,
        now + 3  // 3-second fade-in
      );

      audio.play().catch(() => {});

      natureAudioRef.current = audio;
      natureAudioSourceRef.current = source;
      return;
    }

    const handle = startNatureSynth(ctx, soundKey);
    if (!handle) return;

    handle.output.connect(natureGainRef.current);

    // Soft fade-in via the nature gain node
    const now = ctx.currentTime;
    natureGainRef.current.gain.setValueAtTime(0, now);
    natureGainRef.current.gain.linearRampToValueAtTime(
      state.natureVolume,
      now + 3  // 3-second fade-in
    );

    natureSynthRef.current = handle;
  }, [stopNature, state.natureVolume]);

  // ── Master play / stop ───────────────────────────────────────────────────────
  const startAllLayers = useCallback((s: StudioState) => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();

    // Sync gain values
    if (masterGainRef.current) masterGainRef.current.gain.value = s.masterVolume;
    if (freqGainRef.current) freqGainRef.current.gain.value = s.frequencyVolume;
    if (musicGainRef.current) musicGainRef.current.gain.value = s.musicVolume;
    if (natureGainRef.current) natureGainRef.current.gain.value = s.natureVolume;

    startFrequency(ctx, s.frequencyHz);

    if (s.musicMode === "ambient") startMusicAudio(ctx, "ambient", s.musicVolume);
    else if (s.musicMode === "drone") startMusicAudio(ctx, "drone", s.musicVolume);
    else if (s.musicMode === "crystal") startMusicAudio(ctx, "crystal", s.musicVolume);

    if (s.natureSound !== "none") startNatureAudio(ctx, s.natureSound);
  }, [getCtx, startFrequency, startMusicAudio, startNatureAudio]);

  const stopAllLayers = useCallback(() => {
    stopFrequency();
    stopMusic();
    stopNature();
  }, [stopFrequency, stopMusic, stopNature]);

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Start playback. Optional `overrides` are merged into the state *before*
   * the layers start, guaranteeing the requested soundscape/music/volumes are
   * used immediately. Without this, callers that invoke setters (e.g.
   * setNatureSound) right before play() race React's batched state updates and
   * the layers can start with stale settings.
   */
  const play = useCallback((overrides?: Partial<Omit<StudioState, "isPlaying">>) => {
    setState(prev => {
      const next = { ...prev, ...overrides, isPlaying: true };
      startAllLayers(next);
      return next;
    });
  }, [startAllLayers]);

  const stop = useCallback(() => {
    stopAllLayers();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, [stopAllLayers]);

  const toggle = useCallback(() => {
    setState(prev => {
      if (prev.isPlaying) {
        stopAllLayers();
        return { ...prev, isPlaying: false };
      } else {
        const next = { ...prev, isPlaying: true };
        startAllLayers(next);
        return next;
      }
    });
  }, [startAllLayers, stopAllLayers]);

  /** Update a single layer volume in real-time without restarting */
  const setLayerVolume = useCallback((layer: "frequency" | "music" | "nature" | "master", value: number) => {
    setState(prev => {
      const next = { ...prev };
      if (layer === "frequency") {
        next.frequencyVolume = value;
        if (freqGainRef.current) freqGainRef.current.gain.linearRampToValueAtTime(value, (ctxRef.current?.currentTime ?? 0) + 0.05);
      } else if (layer === "music") {
        next.musicVolume = value;
        if (musicGainRef.current) musicGainRef.current.gain.linearRampToValueAtTime(value, (ctxRef.current?.currentTime ?? 0) + 0.05);
      } else if (layer === "nature") {
        next.natureVolume = value;
        if (natureGainRef.current) natureGainRef.current.gain.linearRampToValueAtTime(value, (ctxRef.current?.currentTime ?? 0) + 0.05);
      } else if (layer === "master") {
        next.masterVolume = value;
        if (masterGainRef.current) masterGainRef.current.gain.linearRampToValueAtTime(value, (ctxRef.current?.currentTime ?? 0) + 0.05);
      }
      return next;
    });
  }, []);

  /** Change the healing frequency — restarts only the frequency layer */
  const setFrequency = useCallback((hz: number) => {
    setState(prev => {
      const next = { ...prev, frequencyHz: hz };
      if (prev.isPlaying && ctxRef.current) {
        startFrequency(ctxRef.current, hz);
      }
      return next;
    });
  }, [startFrequency]);

  /** Change music mode — restarts only the music layer */
  const setMusicMode = useCallback((mode: MusicMode) => {
    setState(prev => {
      const next = { ...prev, musicMode: mode };
      if (prev.isPlaying && ctxRef.current) {
        if (mode === "ambient") startMusicAudio(ctxRef.current, "ambient", prev.musicVolume);
        else if (mode === "drone") startMusicAudio(ctxRef.current, "drone", prev.musicVolume);
        else if (mode === "crystal") startMusicAudio(ctxRef.current, "crystal", prev.musicVolume);
        else stopMusic();
      }
      return next;
    });
  }, [startMusicAudio, stopMusic]);

  /** Change nature sound — restarts only the nature layer */
  const setNatureSound = useCallback((sound: NatureSound) => {
    setState(prev => {
      const next = { ...prev, natureSound: sound };
      if (prev.isPlaying && ctxRef.current) {
        if (sound !== "none") startNatureAudio(ctxRef.current, sound);
        else stopNature();
      }
      return next;
    });
  }, [startNatureAudio, stopNature]);

  const unlockAudio = useCallback(async () => {
    const ctx = ctxRef.current;
    if (ctx && ctx.state === "suspended") {
      try {
        await ctx.resume();
        setAudioContextSuspended(false);
      } catch {}
    }
  }, []);

  const registerErrorCallback = useCallback((cb: AudioErrorCallback | null) => {
    onErrorRef.current = cb;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stopAllLayers();
      ctxRef.current?.close();
    };
  }, [stopAllLayers]);

  return {
    state,
    play,
    stop,
    toggle,
    setLayerVolume,
    setFrequency,
    setMusicMode,
    setNatureSound,
    audioContextSuspended,
    unlockAudio,
    registerErrorCallback,
  };
}

// ─── Preset definitions ───────────────────────────────────────────────────────

export interface StudioPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  settings: Partial<StudioState>;
}

export const STUDIO_PRESETS: StudioPreset[] = [
  {
    id: "deep-sleep",
    name: "Deep Sleep",
    description: "Delta waves + ocean + drone for profound rest",
    icon: "🌙",
    color: "#8B5CF6",
    settings: { frequencyHz: 174, musicMode: "drone", natureSound: "ocean", frequencyVolume: 0.5, musicVolume: 0.3, natureVolume: 0.5 },
  },
  {
    id: "morning-rise",
    name: "Morning Rise",
    description: "528Hz miracle tone + forest + crystal bowls",
    icon: "🌅",
    color: "#F59E0B",
    settings: { frequencyHz: 528, musicMode: "crystal", natureSound: "forest", frequencyVolume: 0.7, musicVolume: 0.5, natureVolume: 0.3 },
  },
  {
    id: "deep-focus",
    name: "Deep Focus",
    description: "Alpha waves + rain + ambient for flow state",
    icon: "🧠",
    color: "#3B82F6",
    settings: { frequencyHz: 432, musicMode: "ambient", natureSound: "rain", frequencyVolume: 0.4, musicVolume: 0.5, natureVolume: 0.4 },
  },
  {
    id: "heart-healing",
    name: "Heart Healing",
    description: "639Hz connection + forest + ambient chords",
    icon: "💚",
    color: "#00D4AA",
    settings: { frequencyHz: 639, musicMode: "ambient", natureSound: "forest", frequencyVolume: 0.6, musicVolume: 0.4, natureVolume: 0.35 },
  },
  {
    id: "meditation",
    name: "Deep Meditation",
    description: "963Hz crown + wind + drone for transcendence",
    icon: "✦",
    color: "#EC4899",
    settings: { frequencyHz: 963, musicMode: "drone", natureSound: "wind", frequencyVolume: 0.5, musicVolume: 0.45, natureVolume: 0.3 },
  },
  {
    id: "pure-frequency",
    name: "Pure Frequency",
    description: "Unblended healing tone — just the frequency",
    icon: "〰",
    color: "#6B7A99",
    settings: { frequencyHz: 432, musicMode: "none", natureSound: "none", frequencyVolume: 0.8, musicVolume: 0, natureVolume: 0 },
  },
];
