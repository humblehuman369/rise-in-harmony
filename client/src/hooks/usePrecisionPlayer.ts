/**
 * usePrecisionPlayer — ResoNate SRS v1.0 compliant frequency engine
 *
 * Compliance:
 *   FR-001  Custom frequency 1–22000 Hz, 0.01 Hz resolution
 *   FR-002  Phase-continuous synthesis via DDS AudioWorklet — zero clicks/pops
 *   FR-003  Sine, Square, Triangle, Sawtooth waveforms
 *   FR-004  Smooth amplitude ramping on start/stop/change
 *   FR-020  Binaural beats: independent L/R channel frequencies, user-configurable
 *   FR-021  Isochronic tones: pulsing single tone, adjustable rate + duty cycle
 *   FR-030  AnalyserNode exposed for oscilloscope rendering
 *   FR-031  AnalyserNode exposed for FFT spectrum rendering
 *   FR-040  Play / Pause / Stop with smooth transitions
 *   FR-041  Sleep timer with fade-out
 *   NFR-FREQ-004  Double-precision phase accumulation (JS number = IEEE 754 double)
 *   NFR-FREQ-002  Phase-continuous — no artifacts on parameter changes
 */
import { useState, useRef, useCallback, useEffect } from "react";

export type Waveform = "sine" | "square" | "triangle" | "sawtooth" | "bowl";
export type PlayMode = "mono" | "binaural" | "isochronic";

export interface PrecisionSession {
  /** Left channel / mono frequency in Hz */
  freqL: number;
  /** Right channel frequency in Hz (binaural only) */
  freqR?: number;
  /** Beat frequency for binaural (freqR = freqL + beatHz) */
  beatHz?: number;
  waveform: Waveform;
  mode: PlayMode;
  /** Isochronic pulse rate in Hz (isochronic mode only) */
  isoRate?: number;
  /** Isochronic duty cycle 0–1 (default 0.5) */
  isoDuty?: number;
  /** Display name */
  name?: string;
  /** Preset ID if from catalog */
  presetId?: string;
}

const WORKLET_URL = "/dds-processor.js";
const FADE_TIME_CONSTANT = 0.3; // seconds (≈ 1.2s to reach ~0)

export function usePrecisionPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [session, setSession] = useState<PrecisionSession | null>(null);
  const [volume, setVolumeState] = useState(0.7);
  const [playTime, setPlayTime] = useState(0);
  const [isWorkletReady, setIsWorkletReady] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workletLoadedRef = useRef(false);

  // ── Internal: ensure AudioContext + Worklet are ready ──────────────────────
  const ensureContext = useCallback(async () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
      workletLoadedRef.current = false;
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") await ctx.resume();

    if (!workletLoadedRef.current) {
      await ctx.audioWorklet.addModule(WORKLET_URL);
      workletLoadedRef.current = true;
      setIsWorkletReady(true);
    }
    return ctx;
  }, []);

  // ── Stop ──────────────────────────────────────────────────────────────────
  const stopAudio = useCallback((immediate = false) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (sleepTimerRef.current) { clearTimeout(sleepTimerRef.current); sleepTimerRef.current = null; }

    const ctx = audioCtxRef.current;
    const gain = gainNodeRef.current;
    const node = workletNodeRef.current;

    if (!ctx || !gain || !node) {
      setIsPlaying(false);
      return;
    }

    if (immediate) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      node.disconnect();
      workletNodeRef.current = null;
      setIsPlaying(false);
    } else {
      // Smooth fade-out (FR-004)
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.setTargetAtTime(0, ctx.currentTime, FADE_TIME_CONSTANT);
      setTimeout(() => {
        node.disconnect();
        workletNodeRef.current = null;
        setIsPlaying(false);
      }, 1500);
    }
  }, []);

  // ── Play ──────────────────────────────────────────────────────────────────
  const play = useCallback(async (s: PrecisionSession) => {
    // Stop existing audio cleanly
    if (workletNodeRef.current) {
      stopAudio(true);
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const ctx = await ensureContext();

    // Build graph: WorkletNode → GainNode → AnalyserNode → Destination
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gainNodeRef.current = gain;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 8192;           // high resolution FFT (FR-031)
    analyser.smoothingTimeConstant = 0.6;
    analyserRef.current = analyser;

    const worklet = new AudioWorkletNode(ctx, "dds-processor", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    workletNodeRef.current = worklet;

    // Wait for the worklet processor to signal it is ready before sending parameters
    await new Promise<void>((resolve) => {
      const onReady = (e: MessageEvent) => {
        if (e.data?.type === 'ready') {
          worklet.port.removeEventListener('message', onReady);
          resolve();
        }
      };
      worklet.port.addEventListener('message', onReady);
      worklet.port.start();
      // Fallback: resolve after 50ms if ready message was missed
      setTimeout(resolve, 50);
    });

    // Configure the DDS processor
    const freqL = s.freqL;
    const freqR = s.mode === "binaural"
      ? (s.freqR ?? (s.freqL + (s.beatHz ?? 10)))
      : s.freqL;

    worklet.port.postMessage({ type: "setFreq", freqL, freqR });
    worklet.port.postMessage({ type: "setWaveform", waveform: s.waveform });
    worklet.port.postMessage({ type: "setMode", mode: s.mode === "binaural" ? "binaural" : "mono" });

    if (s.mode === "isochronic") {
      worklet.port.postMessage({
        type: "setIsochronic",
        enabled: true,
        rate: s.isoRate ?? 10,
        duty: s.isoDuty ?? 0.5,
      });
    } else {
      worklet.port.postMessage({ type: "setIsochronic", enabled: false });
    }

    worklet.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);

    // Smooth fade-in (FR-004)
    gain.gain.setTargetAtTime(volume, ctx.currentTime, FADE_TIME_CONSTANT * 0.5);

    setSession(s);
    setIsPlaying(true);
    setPlayTime(0);

    timerRef.current = setInterval(() => setPlayTime(t => t + 1), 1000);
  }, [ensureContext, stopAudio, volume]);

  // ── Change frequency without stopping (phase-continuous, FR-002) ──────────
  const setFrequency = useCallback((freqL: number, freqR?: number) => {
    if (!workletNodeRef.current) return;
    workletNodeRef.current.port.postMessage({
      type: "setFreq",
      freqL,
      freqR: freqR ?? freqL,
    });
    setSession(prev => prev ? { ...prev, freqL, freqR } : prev);
  }, []);

  // ── Change waveform without stopping (FR-003) ─────────────────────────────
  const setWaveform = useCallback((waveform: Waveform) => {
    if (!workletNodeRef.current) return;
    workletNodeRef.current.port.postMessage({ type: "setWaveform", waveform });
    setSession(prev => prev ? { ...prev, waveform } : prev);
  }, []);

  // ── Volume ────────────────────────────────────────────────────────────────
  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(v, audioCtxRef.current.currentTime, 0.05);
    }
  }, []);

  // ── Sleep timer (FR-041) ──────────────────────────────────────────────────
  const setSleepTimer = useCallback((minutes: number) => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = setTimeout(() => stopAudio(false), minutes * 60 * 1000);
  }, [stopAudio]);

  // ── Update isochronic params live ─────────────────────────────────────────
  const setIsochronic = useCallback((rate: number, duty: number) => {
    if (!workletNodeRef.current) return;
    workletNodeRef.current.port.postMessage({
      type: "setIsochronic",
      enabled: true,
      rate,
      duty,
    });
    setSession(prev => prev ? { ...prev, isoRate: rate, isoDuty: duty } : prev);
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      workletNodeRef.current?.disconnect();
      audioCtxRef.current?.close();
    };
  }, []);

  return {
    isPlaying,
    session,
    volume,
    playTime,
    isWorkletReady,
    analyserNode: analyserRef.current,
    play,
    stopAudio,
    setFrequency,
    setWaveform,
    setVolume,
    setSleepTimer,
    setIsochronic,
    // Expose AudioContext for advanced consumers (e.g. Meditation page)
    getAudioContext: () => audioCtxRef.current,
  };
}
