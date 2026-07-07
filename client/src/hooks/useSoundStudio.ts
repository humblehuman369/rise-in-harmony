/**
 * useSoundStudio — Layered Ambient Audio Engine (v4 — Recorded Music + Nature)
 *
 * Three independent layers blended in real-time:
 *   1. Healing Frequency — pure sine wave at the target Hz (Web Audio API)
 *   2. Musical Harmony  — bundled royalty-free ambient/drone/crystal loops
 *   3. Nature Soundscape — bundled real audio files (rain, ocean, forest, wind, fire, bowl)
 *
 * Nature and music layers use HTMLAudioElement for seamless looping of real recordings.
 * Frequency layer uses Web Audio API oscillators.
 * A DynamicsCompressorNode on the master bus prevents level stacking.
 */
import { useState, useRef, useCallback, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NatureSound = "rain" | "ocean" | "forest" | "wind" | "fire" | "none";
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

// ─── Bundled audio file URLs ──────────────────────────────────────────────────
const NATURE_AUDIO_URLS: Record<string, string> = {
  rain: "/sounds/ambient-rain.mp3",
  ocean: "/sounds/ambient-ocean.mp3",
  forest: "/sounds/ambient-forest.mp3",
  wind: "/sounds/ambient-wind.mp3",
  fire: "/sounds/ambient-fire.mp3",
  bowl: "/sounds/ambient-bowl.mp3",
};

const MUSIC_AUDIO_URLS: Record<Exclude<MusicMode, "none">, string> = {
  ambient: "/sounds/music-ambient.mp3",
  drone: "/sounds/music-drone.mp3",
  crystal: "/sounds/music-crystal.mp3",
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

  // HTMLAudioElement for nature + music real-audio playback
  const natureAudioRef = useRef<HTMLAudioElement | null>(null);
  const natureAudioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

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

  // ── Nature sounds — real audio file playback ─────────────────────────────────

  /**
   * Start a real audio file for the nature layer.
   * Uses HTMLAudioElement connected into the Web Audio graph via
   * createMediaElementSource so volume is controlled by natureGainRef.
   * The audio element loops seamlessly.
   */
  const startNatureAudio = useCallback((ctx: AudioContext, soundKey: string) => {
    stopNature();
    if (!natureGainRef.current) return;

    const url = NATURE_AUDIO_URLS[soundKey];
    if (!url) return;

    const audio = new Audio(url);
    audio.loop = true;
    audio.crossOrigin = "anonymous";
    audio.volume = 1; // volume controlled by Web Audio gain node

    // Connect into the Web Audio graph so it respects natureGainRef
    const source = ctx.createMediaElementSource(audio);
    source.connect(natureGainRef.current);

    // Soft fade-in via the nature gain node
    const now = ctx.currentTime;
    natureGainRef.current.gain.setValueAtTime(0, now);
    natureGainRef.current.gain.linearRampToValueAtTime(
      state.natureVolume,
      now + 3  // 3-second fade-in
    );

    audio.play().catch(() => {
      // Autoplay blocked — will play on next user interaction
    });

    natureAudioRef.current = audio;
    natureAudioSourceRef.current = source;
  }, [stopNature, state.natureVolume]);

  const startNatureRain   = useCallback((ctx: AudioContext) => startNatureAudio(ctx, "rain"),   [startNatureAudio]);
  const startNatureOcean  = useCallback((ctx: AudioContext) => startNatureAudio(ctx, "ocean"),  [startNatureAudio]);
  const startNatureForest = useCallback((ctx: AudioContext) => startNatureAudio(ctx, "forest"), [startNatureAudio]);
  const startNatureWind   = useCallback((ctx: AudioContext) => startNatureAudio(ctx, "wind"),   [startNatureAudio]);
  const startNatureFire   = useCallback((ctx: AudioContext) => startNatureAudio(ctx, "fire"),   [startNatureAudio]);

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

    if (s.natureSound === "rain") startNatureRain(ctx);
    else if (s.natureSound === "ocean") startNatureOcean(ctx);
    else if (s.natureSound === "forest") startNatureForest(ctx);
    else if (s.natureSound === "wind") startNatureWind(ctx);
    else if (s.natureSound === "fire") startNatureFire(ctx);
  }, [
    getCtx,
    startFrequency,
    startMusicAudio,
    startNatureRain, startNatureOcean, startNatureForest, startNatureWind, startNatureFire,
  ]);

  const stopAllLayers = useCallback(() => {
    stopFrequency();
    stopMusic();
    stopNature();
  }, [stopFrequency, stopMusic, stopNature]);

  // ── Public API ───────────────────────────────────────────────────────────────

  const play = useCallback(() => {
    setState(prev => {
      const next = { ...prev, isPlaying: true };
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
        if (sound === "rain") startNatureRain(ctxRef.current);
        else if (sound === "ocean") startNatureOcean(ctxRef.current);
        else if (sound === "forest") startNatureForest(ctxRef.current);
        else if (sound === "wind") startNatureWind(ctxRef.current);
        else if (sound === "fire") startNatureFire(ctxRef.current);
        else stopNature();
      }
      return next;
    });
  }, [startNatureRain, startNatureOcean, startNatureForest, startNatureWind, startNatureFire, stopNature]);

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
