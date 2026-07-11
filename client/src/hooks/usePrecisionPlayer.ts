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
 *
 * Bug fixes (v1.1):
 *   - stopAudio(false) fade-out timeout is now stored and cancelled on next play/stop
 *     → prevents stale timeout from nulling a newly-created worklet node
 *   - Added setMode() live-update helper (posts setMode + setIsochronic to worklet)
 *     → Play Mode now switches without requiring stop/restart
 *   - stopAudio always clears the fade-out timer ref before scheduling a new one
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
const FADE_TC = 0.3; // seconds (≈ 1.2s to reach ~0)

export function usePrecisionPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [session, setSession] = useState<PrecisionSession | null>(null);
  const [volume, setVolumeState] = useState(0.7);
  const [playTime, setPlayTime] = useState(0);
  const [isWorkletReady, setIsWorkletReady] = useState(false);

  const audioCtxRef    = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const gainNodeRef    = useRef<GainNode | null>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Stores the fade-out disconnect timeout so it can be cancelled on next play/stop */
  const fadeOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workletLoadedRef = useRef(false);

  // ── Internal helpers ──────────────────────────────────────────────────────

  /** Cancel any pending fade-out disconnect timer */
  const cancelFadeOut = useCallback(() => {
    if (fadeOutTimerRef.current !== null) {
      clearTimeout(fadeOutTimerRef.current);
      fadeOutTimerRef.current = null;
    }
  }, []);

  /** Disconnect and null the current worklet node immediately */
  const teardownWorklet = useCallback(() => {
    const node = workletNodeRef.current;
    if (node) {
      try { node.disconnect(); } catch { /* already disconnected */ }
      workletNodeRef.current = null;
    }
  }, []);

  // ── Ensure AudioContext + Worklet are ready ───────────────────────────────
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
    // Always cancel any in-flight fade-out timer first
    cancelFadeOut();

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (sleepTimerRef.current) { clearTimeout(sleepTimerRef.current); sleepTimerRef.current = null; }

    const ctx  = audioCtxRef.current;
    const gain = gainNodeRef.current;

    if (!ctx || !gain || !workletNodeRef.current) {
      teardownWorklet();
      setIsPlaying(false);
      return;
    }

    if (immediate) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      teardownWorklet();
      setIsPlaying(false);
    } else {
      // Smooth fade-out (FR-004)
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.setTargetAtTime(0, ctx.currentTime, FADE_TC);

      // Capture the node reference NOW so the timeout always disconnects the
      // correct node even if play() is called before the timeout fires.
      const nodeToDisconnect = workletNodeRef.current;
      workletNodeRef.current = null; // prevent new stop/play from double-disconnecting
      setIsPlaying(false);           // UI responds immediately

      fadeOutTimerRef.current = setTimeout(() => {
        fadeOutTimerRef.current = null;
        try { nodeToDisconnect.disconnect(); } catch { /* already gone */ }
      }, 1500);
    }
  }, [cancelFadeOut, teardownWorklet]);

  // ── Play ──────────────────────────────────────────────────────────────────
  const play = useCallback(async (s: PrecisionSession) => {
    // Cancel any pending fade-out and tear down any existing node immediately
    cancelFadeOut();
    teardownWorklet();

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const ctx = await ensureContext();

    // Build graph: WorkletNode → GainNode → AnalyserNode → Destination
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gainNodeRef.current = gain;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 8192;
    analyser.smoothingTimeConstant = 0.6;
    analyserRef.current = analyser;

    const worklet = new AudioWorkletNode(ctx, "dds-processor", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    workletNodeRef.current = worklet;

    // Wait for the worklet processor to signal ready before sending parameters
    await new Promise<void>((resolve) => {
      const onReady = (e: MessageEvent) => {
        if (e.data?.type === "ready") {
          worklet.port.removeEventListener("message", onReady);
          resolve();
        }
      };
      worklet.port.addEventListener("message", onReady);
      worklet.port.start();
      setTimeout(resolve, 50); // fallback if ready message was missed
    });

    // Configure the DDS processor
    const freqL = s.freqL;
    const freqR = s.mode === "binaural"
      ? (s.freqR ?? (s.freqL + (s.beatHz ?? 10)))
      : s.freqL;

    worklet.port.postMessage({ type: "setFreq", freqL, freqR });
    worklet.port.postMessage({ type: "setWaveform", waveform: s.waveform });
    worklet.port.postMessage({
      type: "setMode",
      mode: s.mode === "binaural" ? "binaural" : "mono",
    });

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
    gain.gain.setTargetAtTime(volume, ctx.currentTime, FADE_TC * 0.5);

    setSession(s);
    setIsPlaying(true);
    setPlayTime(0);

    timerRef.current = setInterval(() => setPlayTime(t => t + 1), 1000);
  }, [cancelFadeOut, teardownWorklet, ensureContext, volume]);

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

  // ── Change play mode live (FR-020 / FR-021) ───────────────────────────────
  /**
   * Hot-swap the play mode while audio is running.
   * Sends the appropriate worklet messages so the DSP switches without a restart.
   */
  const setMode = useCallback((
    mode: PlayMode,
    opts?: { freqL?: number; beatHz?: number; isoRate?: number; isoDuty?: number }
  ) => {
    const node = workletNodeRef.current;
    if (!node) return;

    node.port.postMessage({
      type: "setMode",
      mode: mode === "binaural" ? "binaural" : "mono",
    });

    if (mode === "binaural") {
      const freqL = opts?.freqL ?? 0;
      const beat  = opts?.beatHz ?? 10;
      node.port.postMessage({ type: "setFreq", freqL, freqR: freqL + beat });
      node.port.postMessage({ type: "setIsochronic", enabled: false });
    } else if (mode === "isochronic") {
      node.port.postMessage({
        type: "setIsochronic",
        enabled: true,
        rate: opts?.isoRate ?? 10,
        duty: opts?.isoDuty ?? 0.5,
      });
    } else {
      // mono
      node.port.postMessage({ type: "setIsochronic", enabled: false });
      if (opts?.freqL !== undefined) {
        node.port.postMessage({ type: "setFreq", freqL: opts.freqL, freqR: opts.freqL });
      }
    }

    setSession(prev => prev ? { ...prev, mode } : prev);
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
      cancelFadeOut();
      if (timerRef.current) clearInterval(timerRef.current);
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      teardownWorklet();
      audioCtxRef.current?.close();
    };
  }, [cancelFadeOut, teardownWorklet]);

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
    setMode,
    setVolume,
    setSleepTimer,
    setIsochronic,
    // Expose AudioContext for advanced consumers (e.g. Meditation page)
    getAudioContext: () => audioCtxRef.current,
  };
}
