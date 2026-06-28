/**
 * useSoundStudio — Layered Audio Synthesis Engine
 * Three independent layers blended in real-time via Web Audio API:
 *   1. Healing Frequency — pure sine wave at the target Hz
 *   2. Musical Harmony  — procedural ambient chords tuned to the frequency root
 *   3. Nature Soundscape — synthesized rain / ocean / forest / wind / fire
 *
 * All audio is generated entirely in the browser — no external files needed.
 * Bioluminescent Depth theme
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

// ─── Musical helpers ──────────────────────────────────────────────────────────

/**
 * Build a pentatonic scale rooted at `rootHz`.
 * Ratios: 1, 9/8, 5/4, 3/2, 5/3  (just-intonation pentatonic)
 */
function pentatonicScale(rootHz: number): number[] {
  const ratios = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3];
  const notes: number[] = [];
  for (let octave = 0; octave < 3; octave++) {
    for (const r of ratios) {
      notes.push(rootHz * r * Math.pow(2, octave - 1));
    }
  }
  return notes;
}

/**
 * Build a drone chord: root + perfect fifth + octave
 */
function droneChord(rootHz: number): number[] {
  return [rootHz * 0.5, rootHz, rootHz * 1.5, rootHz * 2];
}

/**
 * Crystal bowl overtone series: root + 2nd + 3rd + 5th harmonic
 */
function crystalSeries(rootHz: number): number[] {
  return [rootHz, rootHz * 2, rootHz * 3, rootHz * 5];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSoundStudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  // Layer gain nodes
  const freqGainRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const natureGainRef = useRef<GainNode | null>(null);

  // Active oscillators / nodes (kept so we can stop them)
  const freqOscRef = useRef<OscillatorNode | null>(null);
  const musicNodesRef = useRef<(OscillatorNode | AudioNode)[]>([]);
  const natureNodesRef = useRef<AudioNode[]>([]);
  const musicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      masterGainRef.current = ctxRef.current.createGain();
      masterGainRef.current.gain.value = state.masterVolume;
      masterGainRef.current.connect(ctxRef.current.destination);

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

    // Soft envelope
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);

    osc.connect(env);
    env.connect(freqGainRef.current);
    osc.start();
    freqOscRef.current = osc;
  }, [stopFrequency]);

  // ── Music layer ──────────────────────────────────────────────────────────────
  const startMusicAmbient = useCallback((ctx: AudioContext, rootHz: number) => {
    stopMusic();
    if (!musicGainRef.current) return;

    const scale = pentatonicScale(rootHz);
    const nodes: OscillatorNode[] = [];

    // Play a slow evolving chord: pick 3 random notes, fade in/out over 4s, then repeat
    const playChord = () => {
      if (!musicGainRef.current) return;
      // Stop previous chord
      nodes.forEach(n => { try { n.stop(ctx.currentTime + 4); } catch {} });
      nodes.length = 0;

      const pick = [...scale].sort(() => Math.random() - 0.5).slice(0, 3);
      pick.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? "sine" : "triangle";
        osc.frequency.value = freq;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0, ctx.currentTime);
        env.gain.linearRampToValueAtTime(0.3 / pick.length, ctx.currentTime + 2);
        env.gain.linearRampToValueAtTime(0, ctx.currentTime + 6);

        osc.connect(env);
        env.connect(musicGainRef.current!);
        osc.start();
        nodes.push(osc);
        musicNodesRef.current.push(osc);
      });

      musicTimerRef.current = setTimeout(playChord, 5000);
    };
    playChord();
  }, [stopMusic]);

  const startMusicDrone = useCallback((ctx: AudioContext, rootHz: number) => {
    stopMusic();
    if (!musicGainRef.current) return;

    const chord = droneChord(rootHz);
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      // Slow LFO vibrato
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.1 + i * 0.05;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = freq * 0.003;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, ctx.currentTime);
      env.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 3);

      osc.connect(env);
      env.connect(musicGainRef.current!);
      osc.start();
      musicNodesRef.current.push(osc, lfo);
    });
  }, [stopMusic]);

  const startMusicCrystal = useCallback((ctx: AudioContext, rootHz: number) => {
    stopMusic();
    if (!musicGainRef.current) return;

    const series = crystalSeries(rootHz);

    const playNote = () => {
      if (!musicGainRef.current) return;
      const freq = series[Math.floor(Math.random() * series.length)];
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const env = ctx.createGain();
      const now = ctx.currentTime;
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.25, now + 0.05);
      env.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

      osc.connect(env);
      env.connect(musicGainRef.current!);
      osc.start();
      osc.stop(now + 2.6);
      musicNodesRef.current.push(osc);

      // Random interval between notes: 0.8s–3s
      const delay = 800 + Math.random() * 2200;
      musicTimerRef.current = setTimeout(playNote, delay);
    };
    playNote();
  }, [stopMusic]);

  // ── Nature layer ─────────────────────────────────────────────────────────────

  /** Create a looping white-noise buffer */
  const createNoiseBuffer = useCallback((ctx: AudioContext, durationSec = 2): AudioBuffer => {
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * durationSec, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }, []);

  const startNatureRain = useCallback((ctx: AudioContext) => {
    stopNature();
    if (!natureGainRef.current) return;

    // White noise → low-pass filter → gain
    const buf = createNoiseBuffer(ctx, 3);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 3500;
    lpf.Q.value = 0.5;

    // Gentle amplitude modulation for rain variation
    const mod = ctx.createOscillator();
    mod.frequency.value = 0.3;
    const modGain = ctx.createGain();
    modGain.gain.value = 0.15;
    mod.connect(modGain);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 2);
    modGain.connect(env.gain);

    src.connect(lpf);
    lpf.connect(env);
    env.connect(natureGainRef.current);
    src.start();
    mod.start();
    natureNodesRef.current.push(src, mod);
  }, [stopNature, createNoiseBuffer]);

  const startNatureOcean = useCallback((ctx: AudioContext) => {
    stopNature();
    if (!natureGainRef.current) return;

    // Pink-ish noise (filtered white) with slow LFO for wave rhythm
    const buf = createNoiseBuffer(ctx, 4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 800;
    lpf.Q.value = 1.2;

    // Wave LFO: ~8-second cycle
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.4;
    lfo.connect(lfoGain);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.3, ctx.currentTime);
    lfoGain.connect(env.gain);

    src.connect(lpf);
    lpf.connect(env);
    env.connect(natureGainRef.current);
    src.start();
    lfo.start();
    natureNodesRef.current.push(src, lfo);
  }, [stopNature, createNoiseBuffer]);

  const startNatureForest = useCallback((ctx: AudioContext) => {
    stopNature();
    if (!natureGainRef.current) return;

    // Layered: soft wind base + occasional high-freq bird-like chirps
    const buf = createNoiseBuffer(ctx, 3);
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = buf;
    windSrc.loop = true;

    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.value = 1200;
    bpf.Q.value = 0.8;

    const windEnv = ctx.createGain();
    windEnv.gain.setValueAtTime(0, ctx.currentTime);
    windEnv.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 2);

    windSrc.connect(bpf);
    bpf.connect(windEnv);
    windEnv.connect(natureGainRef.current);
    windSrc.start();
    natureNodesRef.current.push(windSrc);

    // Chirp generator
    const chirp = () => {
      if (!natureGainRef.current) return;
      const osc = ctx.createOscillator();
      const chirpFreqs = [2400, 3200, 2800, 3600, 2200];
      osc.frequency.value = chirpFreqs[Math.floor(Math.random() * chirpFreqs.length)];
      osc.type = "sine";

      const env = ctx.createGain();
      const now = ctx.currentTime;
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.08, now + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(env);
      env.connect(natureGainRef.current!);
      osc.start();
      osc.stop(now + 0.35);

      const delay = 1500 + Math.random() * 4000;
      musicTimerRef.current = setTimeout(chirp, delay);
    };
    setTimeout(chirp, 1000);
  }, [stopNature, createNoiseBuffer]);

  const startNatureWind = useCallback((ctx: AudioContext) => {
    stopNature();
    if (!natureGainRef.current) return;

    const buf = createNoiseBuffer(ctx, 4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 200;

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 2000;

    // Gusting LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.35;
    lfo.connect(lfoGain);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.2, ctx.currentTime);
    lfoGain.connect(env.gain);

    src.connect(hpf);
    hpf.connect(lpf);
    lpf.connect(env);
    env.connect(natureGainRef.current);
    src.start();
    lfo.start();
    natureNodesRef.current.push(src, lfo);
  }, [stopNature, createNoiseBuffer]);

  const startNatureFire = useCallback((ctx: AudioContext) => {
    stopNature();
    if (!natureGainRef.current) return;

    // Crackling fire: filtered noise + fast random amplitude modulation
    const buf = createNoiseBuffer(ctx, 2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 1200;
    lpf.Q.value = 2;

    // Fast crackle LFO
    const crackle = ctx.createOscillator();
    crackle.frequency.value = 8;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.3;
    crackle.connect(crackleGain);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.4, ctx.currentTime);
    crackleGain.connect(env.gain);

    src.connect(lpf);
    lpf.connect(env);
    env.connect(natureGainRef.current);
    src.start();
    crackle.start();
    natureNodesRef.current.push(src, crackle);
  }, [stopNature, createNoiseBuffer]);

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
    description: "639Hz connection + fire + ambient chords",
    icon: "💚",
    color: "#00D4AA",
    settings: { frequencyHz: 639, musicMode: "ambient", natureSound: "fire", frequencyVolume: 0.6, musicVolume: 0.4, natureVolume: 0.35 },
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
