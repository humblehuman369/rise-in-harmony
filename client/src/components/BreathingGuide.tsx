/**
 * BreathingGuide — Guided breathing overlay for Rise In Harmony
 *
 * Patterns: 4-7-8 · Box Breathing · Calm Breath
 * Modes:    Guided (voice cues) · Silent (visual only)
 * Theme:    Bioluminescent Depth  bg #0A0B14 · accent #00D4AA
 *
 * Architecture:
 *  - A single `useRef`-based ticker drives the session so React
 *    re-renders never cause timer drift or double-fire.
 *  - `sessionRef` is the single source of truth for running state;
 *    React state is only used for display.
 *  - Start/Stop are fully idempotent — calling either twice is safe.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Wind, Mic, MicOff } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Phase {
  label: string;
  seconds: number;
  color: string;
  targetScale: number; // final circle scale at end of this phase
  voiceCue?: string;
}

interface Pattern {
  id: string;
  name: string;
  description: string;
  benefit: string;
  accentColor: string;
  phases: Phase[];
}

// ─── Voice cue assets ─────────────────────────────────────────────────────────

const CUE_INHALE   = "/manus-storage/rih-breath-inhale-v3_d8576e3c.wav";
const CUE_EXHALE   = "/manus-storage/rih-breath-exhale-v3_30eb22d8.wav";
const CUE_HOLD     = "/manus-storage/rih-breath-hold-v3_bcc068ae.wav";
const CUE_COMPLETE = "/manus-storage/rih-breath-complete-v3_0d6d4b26.wav";

// ─── Patterns ─────────────────────────────────────────────────────────────────

export const BREATH_PATTERNS: Pattern[] = [
  {
    id: "478",
    name: "4-7-8",
    description: "Inhale 4s · Hold 7s · Exhale 8s",
    benefit: "Calms the nervous system, ideal before sleep",
    accentColor: "#8B5CF6",
    phases: [
      { label: "Inhale", seconds: 4, color: "#00D4AA", targetScale: 1.45, voiceCue: CUE_INHALE },
      { label: "Hold",   seconds: 7, color: "#8B5CF6", targetScale: 1.45, voiceCue: CUE_HOLD   },
      { label: "Exhale", seconds: 8, color: "#3B82F6", targetScale: 0.70, voiceCue: CUE_EXHALE },
    ],
  },
  {
    id: "box",
    name: "Box Breathing",
    description: "Inhale 4s · Hold 4s · Exhale 4s · Hold 4s",
    benefit: "Reduces stress, sharpens focus and clarity",
    accentColor: "#00D4AA",
    phases: [
      { label: "Inhale", seconds: 4, color: "#00D4AA", targetScale: 1.40, voiceCue: CUE_INHALE },
      { label: "Hold",   seconds: 4, color: "#8B5CF6", targetScale: 1.40, voiceCue: CUE_HOLD   },
      { label: "Exhale", seconds: 4, color: "#3B82F6", targetScale: 0.70, voiceCue: CUE_EXHALE },
      { label: "Hold",   seconds: 4, color: "#6B7A99", targetScale: 0.70, voiceCue: CUE_HOLD   },
    ],
  },
  {
    id: "calm",
    name: "Calm Breath",
    description: "Inhale 5s · Exhale 5s",
    benefit: "Simple coherence breathing for grounding",
    accentColor: "#F59E0B",
    phases: [
      { label: "Inhale", seconds: 5, color: "#F59E0B", targetScale: 1.45, voiceCue: CUE_INHALE },
      { label: "Exhale", seconds: 5, color: "#3B82F6", targetScale: 0.70, voiceCue: CUE_EXHALE },
    ],
  },
];

const CYCLES_PER_SESSION = 5;

// ─── Props ────────────────────────────────────────────────────────────────────

interface BreathingGuideProps {
  onClose: () => void;
  accentColor?: string;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
  onBgVolumeChange?: (v: number) => void;
  initialBgVolume?: number;
}

// ─── Session state (lives in a ref, not React state) ──────────────────────────

interface SessionState {
  running: boolean;
  patternId: string;
  phaseIndex: number;
  phaseElapsed: number; // seconds elapsed in current phase
  cycleCount: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BreathingGuide({
  onClose,
  accentColor = "#00D4AA",
  onSessionStart,
  onSessionEnd,
  onBgVolumeChange,
  initialBgVolume = 0.12,
}: BreathingGuideProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  // ── UI state (display only) ─────────────────────────────────────────────────
  const [pattern, setPattern] = useState<Pattern>(BREATH_PATTERNS[0]);
  const [guided, setGuided] = useState(true);
  const [bgVolume, setBgVolume] = useState(initialBgVolume);

  // Running display state — driven by the ticker
  const [isRunning, setIsRunning] = useState(false);
  const [displayPhaseIndex, setDisplayPhaseIndex] = useState(0);
  const [displayRemain, setDisplayRemain] = useState(0);
  const [displayCycles, setDisplayCycles] = useState(0);
  const [circleScale, setCircleScale] = useState(1.0);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const tickerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef  = useRef<SessionState>({
    running: false,
    patternId: BREATH_PATTERNS[0].id,
    phaseIndex: 0,
    phaseElapsed: 0,
    cycleCount: 0,
  });

  // Audio
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const bufferCache   = useRef<Map<string, AudioBuffer>>(new Map());
  const activeSrc     = useRef<AudioBufferSourceNode | null>(null);
  const guidedRef     = useRef(true); // mirror of `guided` state for use inside ticker closure

  // Particle canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);

  // Keep guidedRef in sync
  useEffect(() => { guidedRef.current = guided; }, [guided]);

  // ── Audio helpers ────────────────────────────────────────────────────────────

  const getAudioCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const preloadCue = useCallback(async (url: string) => {
    if (bufferCache.current.has(url)) return;
    try {
      const ctx  = getAudioCtx();
      const resp = await fetch(url);
      const arr  = await resp.arrayBuffer();
      const buf  = await ctx.decodeAudioData(arr);
      bufferCache.current.set(url, buf);
    } catch { /* non-critical */ }
  }, [getAudioCtx]);

  const stopCue = useCallback(() => {
    try { activeSrc.current?.stop(); } catch { /* already stopped */ }
    activeSrc.current = null;
  }, []);

  const playCue = useCallback((url: string) => {
    if (!guidedRef.current || !sessionRef.current.running) return;
    try {
      const ctx = getAudioCtx();
      stopCue();
      const buf = bufferCache.current.get(url);
      if (!buf) {
        // Fetch on demand if not yet cached
        fetch(url)
          .then(r => r.arrayBuffer())
          .then(a => ctx.decodeAudioData(a))
          .then(b => {
            bufferCache.current.set(url, b);
            if (!sessionRef.current.running || !guidedRef.current) return;
            const src = ctx.createBufferSource();
            src.buffer = b;
            src.connect(ctx.destination);
            src.start(0);
            activeSrc.current = src;
          })
          .catch(() => {});
        return;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      activeSrc.current = src;
    } catch { /* audio non-critical */ }
  }, [getAudioCtx, stopCue]);

  // Preload all cues on mount
  useEffect(() => {
    [CUE_INHALE, CUE_EXHALE, CUE_HOLD, CUE_COMPLETE].forEach(url => preloadCue(url));
  }, [preloadCue]);

  // ── Ticker (single setInterval, no closures over React state) ───────────────

  const clearTicker = useCallback(() => {
    if (tickerRef.current !== null) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  const startSession = useCallback((pat: Pattern) => {
    // Idempotent: stop any existing session first
    clearTicker();
    stopCue();

    const s = sessionRef.current;
    s.running     = true;
    s.patternId   = pat.id;
    s.phaseIndex  = 0;
    s.phaseElapsed = 0;
    s.cycleCount  = 0;

    const firstPhase = pat.phases[0];

    // Initialise display state
    setIsRunning(true);
    setDisplayPhaseIndex(0);
    setDisplayRemain(firstPhase.seconds);
    setDisplayCycles(0);
    setCircleScale(firstPhase.targetScale);

    // Fire first voice cue
    if (firstPhase.voiceCue) playCue(firstPhase.voiceCue);

    onSessionStart?.();

    // Tick every second
    tickerRef.current = setInterval(() => {
      const sess = sessionRef.current;
      if (!sess.running) return;

      // Resolve the live pattern from the ref's patternId
      const livePat = BREATH_PATTERNS.find(p => p.id === sess.patternId)!;
      const phase   = livePat.phases[sess.phaseIndex];

      sess.phaseElapsed += 1;

      const remain = phase.seconds - sess.phaseElapsed;

      if (remain > 0) {
        // Still in this phase — just update countdown
        setDisplayRemain(remain);
      } else {
        // Phase complete — advance
        const nextPhaseIndex = (sess.phaseIndex + 1) % livePat.phases.length;
        const isNewCycle     = nextPhaseIndex === 0;

        if (isNewCycle) {
          sess.cycleCount += 1;
          setDisplayCycles(sess.cycleCount);

          if (sess.cycleCount >= CYCLES_PER_SESSION) {
            // Session complete
            sess.running = false;
            clearTicker();
            stopCue();
            setIsRunning(false);
            setCircleScale(1.0);
            setDisplayRemain(0);
            // Play completion cue
            setTimeout(() => playCue(CUE_COMPLETE), 50);
            onSessionEnd?.();
            return;
          }
        }

        sess.phaseIndex   = nextPhaseIndex;
        sess.phaseElapsed = 0;

        const nextPhase = livePat.phases[nextPhaseIndex];
        setDisplayPhaseIndex(nextPhaseIndex);
        setDisplayRemain(nextPhase.seconds);
        setCircleScale(nextPhase.targetScale);

        if (nextPhase.voiceCue) playCue(nextPhase.voiceCue);
      }
    }, 1000);
  }, [clearTicker, stopCue, playCue, onSessionStart, onSessionEnd]);

  const stopSession = useCallback(() => {
    sessionRef.current.running = false;
    clearTicker();
    stopCue();
    setIsRunning(false);
    setCircleScale(1.0);
    setDisplayPhaseIndex(0);
    setDisplayRemain(0);
    setDisplayCycles(0);
    onSessionEnd?.();
  }, [clearTicker, stopCue, onSessionEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current.running = false;
      clearTicker();
      stopCue();
    };
  }, [clearTicker, stopCue]);

  // ── Particle canvas ──────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles = Array.from({ length: 28 }, () => ({
      x: Math.random() * 400,
      y: Math.random() * 400,
      r: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.25 + 0.08,
      angle: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.35 + 0.08,
    }));

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.angle += 0.004;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        const hex = Math.round(p.opacity * 255).toString(16).padStart(2, "0");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${accentColor}${hex}`;
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [accentColor]);

  // ── Derived display values ───────────────────────────────────────────────────

  const currentPhase      = pattern.phases[displayPhaseIndex];
  const phaseColor        = isRunning ? currentPhase.color : accentColor;
  const cycleSec          = pattern.phases.reduce((s, p) => s + p.seconds, 0);
  const transitionDur     = isRunning
    ? `${currentPhase.seconds}s`
    : "0.5s";

  // ── Render ───────────────────────────────────────────────────────────────────

  const bg   = isLight ? "rgba(237,240,247,0.97)" : "rgba(10,11,20,0.93)";
  const card = isLight ? "rgba(255,255,255,0.85)"  : "rgba(255,255,255,0.03)";
  const cardBorder = isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)";
  const mutedText = "#6B7A99";
  const bodyText  = isLight ? "#1A1D2E" : "#E8EDF5";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: bg, backdropFilter: "blur(18px)" }}
    >
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
        style={{ objectFit: "cover" }}
      />

      <div className="relative w-full max-w-sm mx-4 flex flex-col items-center">

        {/* ── Close button ─────────────────────────────────────────────────── */}
        <button
          onClick={() => { stopSession(); onClose(); }}
          className="absolute -top-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center z-10 transition-colors duration-200"
          style={{ background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.08)", color: mutedText }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = bodyText; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = mutedText; }}
          aria-label="Close breathing guide"
        >
          <X size={16} />
        </button>

        {/* ── Pattern selector (hidden while running) ──────────────────────── */}
        {!isRunning && (
          <div className="w-full mb-6">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3 text-center"
              style={{ color: mutedText, fontFamily: "DM Sans, sans-serif" }}
            >
              Choose a Breathing Pattern
            </p>

            <div className="space-y-2">
              {BREATH_PATTERNS.map(p => {
                const active = pattern.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPattern(p)}
                    className="w-full p-3 rounded-xl text-left transition-all duration-200"
                    style={{
                      background: active ? `${p.accentColor}15` : card,
                      border: `1px solid ${active ? `${p.accentColor}40` : cardBorder}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: active ? bodyText : mutedText, fontFamily: "DM Sans, sans-serif" }}
                      >
                        {p.name}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: `${p.accentColor}20`, color: p.accentColor, fontFamily: "DM Sans, sans-serif" }}
                      >
                        {p.phases.reduce((s, ph) => s + ph.seconds, 0)}s cycle
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: mutedText, fontFamily: "DM Sans, sans-serif" }}>
                      {p.description}
                    </p>
                    <p className="text-[10px] mt-1 italic" style={{ color: isLight ? mutedText : "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
                      {p.benefit}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Guided / Silent toggle */}
            <div className="flex gap-2 mt-4 justify-center">
              {[true, false].map(isGuided => (
                <button
                  key={String(isGuided)}
                  onClick={() => setGuided(isGuided)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200"
                  style={{
                    background: guided === isGuided ? "rgba(0,212,170,0.12)" : (isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)"),
                    border: `1px solid ${guided === isGuided ? "rgba(0,212,170,0.35)" : cardBorder}`,
                    color: guided === isGuided ? "#00D4AA" : mutedText,
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  {isGuided ? <Mic size={12} /> : <MicOff size={12} />}
                  {isGuided ? "Guided" : "Silent"}
                </button>
              ))}
            </div>

            {/* Background frequency volume slider */}
            {onBgVolumeChange && (
              <div className="mt-4 px-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: mutedText, fontFamily: "DM Sans, sans-serif" }}>
                    Background Frequency
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: accentColor, fontFamily: "DM Sans, sans-serif" }}>
                    {Math.round(bgVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range" min={0} max={0.4} step={0.01}
                  value={bgVolume}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    setBgVolume(v);
                    onBgVolumeChange(v);
                  }}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${accentColor} ${(bgVolume / 0.4) * 100}%, ${isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} ${(bgVolume / 0.4) * 100}%)`,
                    accentColor,
                  }}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px]" style={{ color: isLight ? mutedText : "#4A5568", fontFamily: "DM Sans, sans-serif" }}>Off</span>
                  <span className="text-[9px]" style={{ color: isLight ? mutedText : "#4A5568", fontFamily: "DM Sans, sans-serif" }}>40%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Breathing circle ─────────────────────────────────────────────── */}
        <div className="flex flex-col items-center">

          {/* Outer glow rings */}
          <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width:  180 + i * 20,
                  height: 180 + i * 20,
                  border: `1px solid ${phaseColor}${Math.round((0.14 - i * 0.04) * 255).toString(16).padStart(2, "0")}`,
                  transform: `scale(${isRunning ? circleScale * (1 + i * 0.04) : 1})`,
                  transition: `transform ${transitionDur} cubic-bezier(0.45, 0, 0.55, 1)`,
                }}
              />
            ))}

            {/* Main circle */}
            <div
              className="rounded-full flex flex-col items-center justify-center select-none"
              style={{
                width:  160,
                height: 160,
                background: `radial-gradient(circle at 40% 35%, ${phaseColor}28, ${phaseColor}08)`,
                border: `2px solid ${phaseColor}55`,
                boxShadow: isRunning
                  ? `0 0 48px ${phaseColor}35, inset 0 0 32px ${phaseColor}12`
                  : "none",
                transform: `scale(${isRunning ? circleScale : 1.0})`,
                transition: `transform ${transitionDur} cubic-bezier(0.45, 0, 0.55, 1), border-color 0.9s ease, box-shadow 0.9s ease`,
              }}
            >
              {isRunning ? (
                <>
                  <span
                    className="text-4xl font-bold tabular-nums"
                    style={{ color: currentPhase.color, fontFamily: "DM Mono, monospace", lineHeight: 1 }}
                  >
                    {displayRemain}
                  </span>
                  <span
                    className="text-xs font-semibold uppercase tracking-widest mt-1"
                    style={{ color: currentPhase.color, fontFamily: "DM Sans, sans-serif", opacity: 0.85 }}
                  >
                    {currentPhase.label}
                  </span>
                </>
              ) : (
                <Wind size={32} style={{ color: accentColor, opacity: 0.55 }} />
              )}
            </div>
          </div>

          {/* Phase progress dots */}
          {isRunning && (
            <div className="flex gap-2 mt-4">
              {pattern.phases.map((ph, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width:  i === displayPhaseIndex ? 20 : 6,
                    height: 6,
                    background: i === displayPhaseIndex
                      ? ph.color
                      : (isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)"),
                  }}
                />
              ))}
            </div>
          )}

          {/* Cycle counter */}
          {isRunning && displayCycles > 0 && (
            <p className="mt-3 text-xs" style={{ color: mutedText, fontFamily: "DM Sans, sans-serif" }}>
              {displayCycles} {displayCycles === 1 ? "cycle" : "cycles"} complete
            </p>
          )}

          {/* Pattern name during session */}
          {isRunning && (
            <p className="mt-2 text-sm font-semibold" style={{ color: isLight ? "#4A5568" : "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
              {pattern.name}
              {guided && (
                <span className="ml-2 text-xs" style={{ color: "#00D4AA", opacity: 0.75 }}>
                  · Guided
                </span>
              )}
            </p>
          )}

          {/* ── Start / Stop button ─────────────────────────────────────────── */}
          <button
            onClick={isRunning ? stopSession : () => startSession(pattern)}
            className="mt-6 px-8 py-3 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background: isRunning
                ? (isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)")
                : `linear-gradient(135deg, ${pattern.accentColor}, ${pattern.accentColor}CC)`,
              color:  isRunning ? (isLight ? "#4A5568" : "#8FA3BF") : "#fff",
              border: isRunning
                ? `1px solid ${isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}`
                : "none",
              boxShadow: isRunning ? "none" : `0 0 22px ${pattern.accentColor}45`,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {isRunning ? "Stop" : `Begin ${pattern.name}`}
          </button>

          {/* Benefit text (idle only) */}
          {!isRunning && (
            <p
              className="mt-4 text-xs text-center leading-relaxed"
              style={{ color: isLight ? mutedText : "#4A5568", fontFamily: "DM Sans, sans-serif", maxWidth: 240 }}
            >
              {pattern.benefit}
            </p>
          )}

          {/* Background frequency slider during active session */}
          {isRunning && onBgVolumeChange && (
            <div className="mt-5 w-full px-1" style={{ maxWidth: 240 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest" style={{ color: mutedText, fontFamily: "DM Sans, sans-serif" }}>
                  Background Frequency
                </span>
                <span className="text-[10px] font-mono" style={{ color: accentColor, fontFamily: "DM Sans, sans-serif" }}>
                  {Math.round(bgVolume * 100)}%
                </span>
              </div>
              <input
                type="range" min={0} max={0.4} step={0.01}
                value={bgVolume}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  setBgVolume(v);
                  onBgVolumeChange(v);
                }}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${accentColor} ${(bgVolume / 0.4) * 100}%, ${isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} ${(bgVolume / 0.4) * 100}%)`,
                  accentColor,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
