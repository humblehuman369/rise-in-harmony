/**
 * useSoundStudio — Layered Ambient Audio Engine (v3 — Real Audio Files)
 *
 * Three independent layers blended in real-time:
 *   1. Healing Frequency — pure sine wave at the target Hz (via DDS in Meditation page)
 *   2. Musical Harmony  — soft, stable harmonic drones tuned to the frequency root
 *   3. Nature Soundscape — AI-generated real audio files (rain, ocean, forest, wind, fire)
 *
 * Nature layer uses HTMLAudioElement for seamless looping of real recordings.
 * Frequency and music layers use Web Audio API oscillators.
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

// ─── Nature sound file URLs ───────────────────────────────────────────────────
/** AI-generated ambient audio files uploaded to webdev storage */
const NATURE_AUDIO_URLS: Record<string, string> = {
  rain:   "/manus-storage/ambient-rain_ca541d35.mp3",
  ocean:  "/manus-storage/ambient-ocean_cd73c379.mp3",
  forest: "/manus-storage/ambient-forest_745cd58c.mp3",
  wind:   "/manus-storage/ambient-wind_fcd03d0d.mp3",
  fire:   "/manus-storage/ambient-fire_354802d4.mp3",
};

// ─── Musical helpers ──────────────────────────────────────────────────────────

/** Fixed stable drone: root + perfect fifth + octave — always consonant */
function droneFreqs(rootHz: number): number[] {
  return [
    rootHz * 0.5,   // sub-octave (warm foundation)
    rootHz,         // root
    rootHz * 1.5,   // perfect fifth (3:2 — most consonant interval)
    rootHz * 2,     // octave
  ];
}

/** Fixed pentatonic ambient chord — 3 stable notes, no random selection */
function ambientChordFreqs(rootHz: number): number[] {
  // Root + major third + perfect fifth (a stable major triad in just intonation)
  return [
    rootHz * 0.5,       // sub-octave root
    rootHz,             // root
    rootHz * (5 / 4),   // major third (5:4)
    rootHz * (3 / 2),   // perfect fifth (3:2)
  ];
}

/** Singing bowl: fundamental + octave only — no harsh upper harmonics */
function bowlFreqs(rootHz: number): number[] {
  return [rootHz, rootHz * 2];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSoundStudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);

  // Layer gain nodes
  const freqGainRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const natureGainRef = useRef<GainNode | null>(null);

  // Active oscillators / nodes (kept so we can stop them)
  const freqOscRef = useRef<OscillatorNode | null>(null);
  const musicNodesRef = useRef<(OscillatorNode | AudioNode)[]>([]);
  const natureNodesRef = useRef<AudioNode[]>([]);
  const musicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // HTMLAudioElement for nature sound real-audio playback
  const natureAudioRef = useRef<HTMLAudioElement | null>(null);
  const natureAudioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

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
    if (musicTimerRef.current) { clearTimeout(musicTimerRef.current); musicTimerRef.current = null; }
    musicNodesRef.current.forEach(n => { try { (n as OscillatorNode).stop?.(); } catch {} });
    musicNodesRef.current = [];
  }, []);

  const stopNature = useCallback(() => {
    // Stop real audio element
    if (natureAudioRef.current) {
      natureAudioRef.current.pause();
      natureAudioRef.current.currentTime = 0;
      natureAudioRef.current = null;
    }
    if (natureAudioSourceRef.current) {
      try { natureAudioSourceRef.current.disconnect(); } catch {}
      natureAudioSourceRef.current = null;
    }
    // Stop any legacy synthesis nodes (fallback)
    natureNodesRef.current.forEach(n => {
      try { (n as AudioBufferSourceNode).stop?.(); } catch {}
      try { (n as OscillatorNode).stop?.(); } catch {}
    });
    natureNodesRef.current = [];
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

  // ── Music layer — Ambient (stable harmonic chord, slow cross-fade) ────────────
  const startMusicAmbient = useCallback((ctx: AudioContext, rootHz: number) => {
    stopMusic();
    if (!musicGainRef.current) return;

    const freqs = ambientChordFreqs(rootHz);
    // Each note fades in slowly and sustains indefinitely — no random re-triggering
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      // Very slow vibrato LFO — adds warmth without pitch instability
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.02; // 0.05–0.11 Hz (very slow)
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = freq * 0.001; // ±0.1% pitch variation — barely perceptible
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      // Staggered fade-in so notes don't all hit at once
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, ctx.currentTime);
      env.gain.linearRampToValueAtTime(
        0.18 / freqs.length,
        ctx.currentTime + 3 + i * 1.5
      );

      osc.connect(env);
      env.connect(musicGainRef.current!);
      osc.start();
      musicNodesRef.current.push(osc, lfo);
    });
  }, [stopMusic]);

  // ── Music layer — Drone (deep, stable, warm) ──────────────────────────────────
  const startMusicDrone = useCallback((ctx: AudioContext, rootHz: number) => {
    stopMusic();
    if (!musicGainRef.current) return;

    const freqs = droneFreqs(rootHz);
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      // Very slow LFO vibrato — adds organic warmth
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.03 + i * 0.015; // 0.03–0.075 Hz
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = freq * 0.0008;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      // Staggered 4-second fade-in
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, ctx.currentTime);
      env.gain.linearRampToValueAtTime(
        0.15 / freqs.length,
        ctx.currentTime + 4 + i * 2
      );

      osc.connect(env);
      env.connect(musicGainRef.current!);
      osc.start();
      musicNodesRef.current.push(osc, lfo);
    });
  }, [stopMusic]);

  // ── Music layer — Crystal/Bowl (soft singing bowl simulation) ────────────────
  const startMusicCrystal = useCallback((ctx: AudioContext, rootHz: number) => {
    stopMusic();
    if (!musicGainRef.current) return;

    const freqs = bowlFreqs(rootHz);

    // Sustain the fundamental and octave as soft, slowly-decaying tones
    // Re-strike every 12 seconds for a natural bowl resonance feel
    const strike = () => {
      if (!musicGainRef.current) return;

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;

        // Bowl-like envelope: fast attack, very long exponential decay
        const env = ctx.createGain();
        const now = ctx.currentTime;
        const peakGain = i === 0 ? 0.22 : 0.10; // fundamental louder than octave
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(peakGain, now + 0.08);  // 80ms attack
        env.gain.exponentialRampToValueAtTime(0.001, now + 10);  // 10s decay

        osc.connect(env);
        env.connect(musicGainRef.current!);
        osc.start(now);
        osc.stop(now + 10.1);
        musicNodesRef.current.push(osc);
      });

      // Re-strike after 12 seconds (2s silence between ring-outs)
      musicTimerRef.current = setTimeout(strike, 12000);
    };

    strike();
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

    if (s.musicMode === "ambient") startMusicAmbient(ctx, s.frequencyHz);
    else if (s.musicMode === "drone") startMusicDrone(ctx, s.frequencyHz);
    else if (s.musicMode === "crystal") startMusicCrystal(ctx, s.frequencyHz);

    if (s.natureSound === "rain") startNatureRain(ctx);
    else if (s.natureSound === "ocean") startNatureOcean(ctx);
    else if (s.natureSound === "forest") startNatureForest(ctx);
    else if (s.natureSound === "wind") startNatureWind(ctx);
    else if (s.natureSound === "fire") startNatureFire(ctx);
  }, [
    getCtx,
    startFrequency,
    startMusicAmbient, startMusicDrone, startMusicCrystal,
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
        // Restart music layer tuned to new root
        if (prev.musicMode === "ambient") startMusicAmbient(ctxRef.current, hz);
        else if (prev.musicMode === "drone") startMusicDrone(ctxRef.current, hz);
        else if (prev.musicMode === "crystal") startMusicCrystal(ctxRef.current, hz);
      }
      return next;
    });
  }, [startFrequency, startMusicAmbient, startMusicDrone, startMusicCrystal]);

  /** Change music mode — restarts only the music layer */
  const setMusicMode = useCallback((mode: MusicMode) => {
    setState(prev => {
      const next = { ...prev, musicMode: mode };
      if (prev.isPlaying && ctxRef.current) {
        if (mode === "ambient") startMusicAmbient(ctxRef.current, prev.frequencyHz);
        else if (mode === "drone") startMusicDrone(ctxRef.current, prev.frequencyHz);
        else if (mode === "crystal") startMusicCrystal(ctxRef.current, prev.frequencyHz);
        else stopMusic();
      }
      return next;
    });
  }, [startMusicAmbient, startMusicDrone, startMusicCrystal, stopMusic]);

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
