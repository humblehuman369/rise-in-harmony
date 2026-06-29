/**
 * useSoundStudio — Layered Ambient Audio Engine (v2 — Smooth Redesign)
 *
 * Three independent layers blended in real-time via Web Audio API:
 *   1. Healing Frequency — pure sine wave at the target Hz (via DDS in Meditation page)
 *   2. Musical Harmony  — soft, stable harmonic drones tuned to the frequency root
 *   3. Nature Soundscape — gentle, heavily-filtered pink-noise approximations
 *
 * Design principles for v2:
 *   - All noise sources use cascaded low-pass filters at low cutoff frequencies
 *     to produce smooth, rumbling textures rather than harsh hiss
 *   - LFOs modulate a *multiplier* gain node so gain never goes negative
 *   - Crystal/bowl mode uses only the fundamental and octave (no harsh 3rd/5th harmonics)
 *   - Ambient chord mode uses fixed, stable pentatonic intervals — no random selection
 *   - A DynamicsCompressorNode on the master bus prevents level stacking
 *   - All envelopes use exponential ramps for natural-sounding fades
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

// ─── Pink-noise approximation ─────────────────────────────────────────────────
/**
 * Generate a buffer of pink-noise-approximated audio using the Voss-McCartney
 * algorithm. Pink noise has equal energy per octave — much warmer/softer than
 * white noise which has equal energy per Hz (very bright/hissy).
 */
function createPinkNoiseBuffer(ctx: AudioContext, durationSec = 4): AudioBuffer {
  const sr = ctx.sampleRate;
  const frameCount = sr * durationSec;
  const buf = ctx.createBuffer(1, frameCount, sr);
  const data = buf.getChannelData(0);

  // Voss-McCartney pink noise: sum of 7 white-noise sources, each updated
  // at half the rate of the previous one
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < frameCount; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buf;
}

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

  // ── Nature layer helpers ──────────────────────────────────────────────────────

  /**
   * Create a looped pink-noise source through a chain of low-pass filters.
   * Using cascaded filters gives a steeper roll-off for a much softer sound.
   * The LFO modulates a *separate* gain node (not the main env) so the
   * main gain never goes negative.
   */
  const buildFilteredNoise = useCallback((
    ctx: AudioContext,
    cutoffHz: number,
    lfoFreqHz: number,
    lfoDepth: number,   // 0–1, fraction of base gain to modulate
    baseGain: number,
    outputNode: AudioNode,
  ): AudioNode[] => {
    const buf = createPinkNoiseBuffer(ctx, 6);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    // Two cascaded low-pass filters for a steeper, softer roll-off
    const lpf1 = ctx.createBiquadFilter();
    lpf1.type = "lowpass";
    lpf1.frequency.value = cutoffHz;
    lpf1.Q.value = 0.5;

    const lpf2 = ctx.createBiquadFilter();
    lpf2.type = "lowpass";
    lpf2.frequency.value = cutoffHz * 0.7; // second filter even lower
    lpf2.Q.value = 0.5;

    // Main envelope gain
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(baseGain, ctx.currentTime + 3);

    // LFO modulates a *multiplier* gain (0.7–1.0 range) — never negative
    const lfoGainNode = ctx.createGain();
    lfoGainNode.gain.value = 1.0; // base multiplier

    const lfo = ctx.createOscillator();
    lfo.frequency.value = lfoFreqHz;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = lfoDepth * 0.15; // small modulation depth
    lfo.connect(lfoAmt);
    lfoAmt.connect(lfoGainNode.gain);
    lfo.start();

    src.connect(lpf1);
    lpf1.connect(lpf2);
    lpf2.connect(env);
    env.connect(lfoGainNode);
    lfoGainNode.connect(outputNode);
    src.start();

    return [src, lfo];
  }, []);

  // ── Nature sounds ─────────────────────────────────────────────────────────────

  const startNatureRain = useCallback((ctx: AudioContext) => {
    stopNature();
    if (!natureGainRef.current) return;

    // Gentle rain: pink noise, low cutoff (700Hz), very slow modulation
    const nodes = buildFilteredNoise(
      ctx,
      700,    // cutoff — warm, not hissy
      0.25,   // LFO freq — very slow rain variation
      0.3,    // LFO depth
      0.65,   // base gain
      natureGainRef.current,
    );
    natureNodesRef.current.push(...nodes);
  }, [stopNature, buildFilteredNoise]);

  const startNatureOcean = useCallback((ctx: AudioContext) => {
    stopNature();
    if (!natureGainRef.current) return;

    // Ocean waves: pink noise, very low cutoff (400Hz), slow wave LFO (~8s cycle)
    const nodes = buildFilteredNoise(
      ctx,
      400,    // cutoff — deep, rumbling ocean
      0.12,   // LFO freq — ~8s wave cycle
      0.5,    // LFO depth — noticeable wave swell
      0.6,
      natureGainRef.current,
    );
    natureNodesRef.current.push(...nodes);
  }, [stopNature, buildFilteredNoise]);

  const startNatureForest = useCallback((ctx: AudioContext) => {
    stopNature();
    if (!natureGainRef.current) return;

    // Forest breeze: pink noise, medium cutoff (550Hz), gentle wind variation
    const nodes = buildFilteredNoise(
      ctx,
      550,    // cutoff — soft wind through leaves
      0.08,   // LFO freq — slow breeze gusts
      0.35,
      0.5,
      natureGainRef.current,
    );
    natureNodesRef.current.push(...nodes);

    // Occasional soft bird-like tone (very quiet, smooth sine, not a chirp)
    const addBirdTone = () => {
      if (!natureGainRef.current) return;
      // Use a gentle, low-frequency bird call (600–900Hz) — not the harsh 2400–3600Hz range
      const birdFreqs = [620, 740, 680, 820, 700];
      const freq = birdFreqs[Math.floor(Math.random() * birdFreqs.length)];
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      // Smooth, slow envelope — a gentle warble, not a sharp chirp
      const env = ctx.createGain();
      const now = ctx.currentTime;
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.04, now + 0.3);   // slow attack
      env.gain.linearRampToValueAtTime(0.02, now + 0.8);   // sustain
      env.gain.exponentialRampToValueAtTime(0.001, now + 1.8); // slow decay

      osc.connect(env);
      env.connect(natureGainRef.current!);
      osc.start(now);
      osc.stop(now + 1.9);

      // Next bird tone in 8–20 seconds — infrequent and peaceful
      const delay = 8000 + Math.random() * 12000;
      musicTimerRef.current = setTimeout(addBirdTone, delay);
    };
    // First bird tone after 5 seconds
    setTimeout(addBirdTone, 5000);
  }, [stopNature, buildFilteredNoise]);

  const startNatureWind = useCallback((ctx: AudioContext) => {
    stopNature();
    if (!natureGainRef.current) return;

    // Wind: pink noise, low cutoff (350Hz), slow gusting LFO
    const nodes = buildFilteredNoise(
      ctx,
      350,    // cutoff — deep, smooth wind
      0.06,   // LFO freq — very slow gusts (~17s cycle)
      0.45,
      0.55,
      natureGainRef.current,
    );
    natureNodesRef.current.push(...nodes);
  }, [stopNature, buildFilteredNoise]);

  const startNatureFire = useCallback((ctx: AudioContext) => {
    stopNature();
    if (!natureGainRef.current) return;

    // Fire: pink noise, low cutoff (500Hz), medium-speed flicker LFO
    // The crackle LFO is now at 1.5Hz (not 8Hz) — a gentle flicker, not a buzz
    const nodes = buildFilteredNoise(
      ctx,
      500,    // cutoff — warm fire rumble
      1.5,    // LFO freq — gentle flicker (was 8Hz — that was the harsh buzz)
      0.4,
      0.55,
      natureGainRef.current,
    );
    natureNodesRef.current.push(...nodes);
  }, [stopNature, buildFilteredNoise]);

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
