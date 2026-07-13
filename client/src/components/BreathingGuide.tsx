/**
 * BreathingGuide — Animated breathing overlay for Sound Studio
 * Supports 4-7-8, Box Breathing, and Calm Breath patterns
 * Bioluminescent Depth theme
 *
 * v2: Guided voice mode — calm female TTS cues (Sulafat voice) play at each
 * phase transition. Toggle between "Guided" (voice + visual) and "Silent" (visual only).
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { X, Wind, Mic, MicOff } from "lucide-react";

// ─── Breathing patterns ───────────────────────────────────────────────────────

interface BreathPhase {
  label: string;
  seconds: number;
  color: string;
  scale: number;
  voiceCue?: string;
}

interface BreathPattern {
  id: string;
  name: string;
  description: string;
  benefit: string;
  color: string;
  phases: BreathPhase[];
  introCue: string;
}

/** Measured intro audio durations in ms (from ffprobe) */
const INTRO_DURATION_MS: Record<string, number> = {
  "478": 29_000,
  "box": 30_720,
  "calm": 29_120,
};

/** Number of cycles after which the completion cue plays */
const COMPLETE_AFTER_CYCLES = 5;
const COMPLETE_CUE = "/manus-storage/v2-complete_3b0e0367.wav";

export const BREATH_PATTERNS: BreathPattern[] = [
  {
    id: "478",
    name: "4-7-8",
    description: "Inhale 4s · Hold 7s · Exhale 8s",
    benefit: "Calms the nervous system, ideal before sleep",
    color: "#8B5CF6",
    introCue: "/manus-storage/v2-478-intro_8eb10b42.wav",
    phases: [
      { label: "Inhale", seconds: 4, color: "#00D4AA", scale: 1.4, voiceCue: "/manus-storage/v2-478-inhale_b9f2c19e.wav" },
      { label: "Hold", seconds: 7, color: "#8B5CF6", scale: 1.4, voiceCue: "/manus-storage/v2-478-hold_6aa044c1.wav" },
      { label: "Exhale", seconds: 8, color: "#3B82F6", scale: 0.7, voiceCue: "/manus-storage/v2-478-exhale_e50f5d78.wav" },
    ],
  },
  {
    id: "box",
    name: "Box Breathing",
    description: "Inhale 4s · Hold 4s · Exhale 4s · Hold 4s",
    benefit: "Reduces stress, sharpens focus and clarity",
    color: "#00D4AA",
    introCue: "/manus-storage/v2-box-intro_6a67f083.wav",
    phases: [
      { label: "Inhale", seconds: 4, color: "#00D4AA", scale: 1.35, voiceCue: "/manus-storage/v2-box-inhale_9e1c5838.wav" },
      { label: "Hold", seconds: 4, color: "#8B5CF6", scale: 1.35, voiceCue: "/manus-storage/v2-box-hold-top_212a3a20.wav" },
      { label: "Exhale", seconds: 4, color: "#3B82F6", scale: 0.7, voiceCue: "/manus-storage/v2-box-exhale_c1886059.wav" },
      { label: "Hold", seconds: 4, color: "#6B7A99", scale: 0.7, voiceCue: "/manus-storage/v2-box-hold-bottom_afe4cb52.wav" },
    ],
  },
  {
    id: "calm",
    name: "Calm Breath",
    description: "Inhale 5s · Exhale 5s",
    benefit: "Simple coherence breathing for grounding",
    color: "#F59E0B",
    introCue: "/manus-storage/v2-calm-intro_dbcdc3b9.wav",
    phases: [
      { label: "Inhale", seconds: 5, color: "#F59E0B", scale: 1.4, voiceCue: "/manus-storage/v2-calm-inhale_79ba4dcc.wav" },
      { label: "Exhale", seconds: 5, color: "#3B82F6", scale: 0.7, voiceCue: "/manus-storage/v2-calm-exhale_99c92c60.wav" },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface BreathingGuideProps {
  onClose: () => void;
  accentColor?: string;
  /** Called when a breathing session starts — use to duck background audio */
  onSessionStart?: () => void;
  /** Called when a breathing session ends or the overlay closes — use to restore background audio */
  onSessionEnd?: () => void;
}

export default function BreathingGuide({ onClose, accentColor = "#00D4AA", onSessionStart, onSessionEnd }: BreathingGuideProps) {
  const [selectedPattern, setSelectedPattern] = useState<BreathPattern>(BREATH_PATTERNS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [introPlaying, setIntroPlaying] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseRemain, setPhaseRemain] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [circleScale, setCircleScale] = useState(1.0);
  const [guided, setGuided] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const introTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const currentPhase = selectedPattern.phases[phaseIndex];
  const totalCycleSec = selectedPattern.phases.reduce((s, p) => s + p.seconds, 0);

  // ── Particle canvas background ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: { x: number; y: number; r: number; speed: number; angle: number; opacity: number }[] = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * 400,
        y: Math.random() * 400,
        r: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        angle: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      timeRef.current += 0.005;

      particles.forEach(p => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.angle += 0.005;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${accentColor}${Math.round(p.opacity * 255).toString(16).padStart(2, "0")}`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [accentColor]);

  // ── Audio helpers ────────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, []);

  const playVoiceCue = useCallback((path: string) => {
    if (!guided) return;
    stopAudio();
    try {
      const audio = new Audio(path);
      audio.volume = 1.0;
      audio.play().catch(() => {/* swallow autoplay errors */});
      audioRef.current = audio;
    } catch {
      // audio not critical
    }
  }, [guided, stopAudio]);

  // ── Timer helpers ────────────────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const clearIntroTimeout = useCallback(() => {
    if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
    introTimeoutRef.current = null;
  }, []);

  // ── Session control ──────────────────────────────────────────────────────────
  const startBreathing = useCallback(() => {
    stopTimer();
    clearIntroTimeout();
    const pattern = selectedPattern;
    let pIdx = 0;
    let remain = pattern.phases[0].seconds;
    let cycles = 0;

    setPhaseIndex(0);
    setPhaseRemain(pattern.phases[0].seconds);
    setCircleScale(pattern.phases[0].scale);
    setCycleCount(0);

    const runTimer = () => {
      setIsRunning(true);
      const firstCue = pattern.phases[0].voiceCue;
      if (firstCue) playVoiceCue(firstCue);

      intervalRef.current = setInterval(() => {
        remain -= 1;
        if (remain <= 0) {
          pIdx = (pIdx + 1) % pattern.phases.length;
          if (pIdx === 0) {
            cycles += 1;
            setCycleCount(cycles);
            if (cycles >= COMPLETE_AFTER_CYCLES) {
              stopTimer();
              setIsRunning(false);
              setCircleScale(1.0);
              playVoiceCue(COMPLETE_CUE);
              return;
            }
          }
          remain = pattern.phases[pIdx].seconds;
          setPhaseIndex(pIdx);
          setCircleScale(pattern.phases[pIdx].scale);
          const cue = pattern.phases[pIdx].voiceCue;
          if (cue) playVoiceCue(cue);
        }
        setPhaseRemain(remain);
      }, 1000);
    };

    onSessionStart?.();

    if (guided) {
      setIntroPlaying(true);
      setIsRunning(false);
      playVoiceCue(pattern.introCue);
      const introMs = INTRO_DURATION_MS[pattern.id] ?? 10_000;
      introTimeoutRef.current = setTimeout(() => {
        setIntroPlaying(false);
        runTimer();
      }, introMs);
    } else {
      runTimer();
    }
  }, [selectedPattern, guided, stopTimer, clearIntroTimeout, playVoiceCue, onSessionStart]);

  const stopBreathing = useCallback(() => {
    stopTimer();
    clearIntroTimeout();
    stopAudio();
    setIsRunning(false);
    setIntroPlaying(false);
    setPhaseIndex(0);
    setPhaseRemain(0);
    setCircleScale(1.0);
    setCycleCount(0);
    onSessionEnd?.();
  }, [stopTimer, clearIntroTimeout, stopAudio, onSessionEnd]);

  useEffect(() => {
    return () => {
      stopTimer();
      clearIntroTimeout();
      stopAudio();
    };
  }, [stopTimer, clearIntroTimeout, stopAudio]);

  const transitionDuration = isRunning ? `${currentPhase?.seconds ?? 4}s` : "0.4s";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(10,11,20,0.92)", backdropFilter: "blur(16px)" }}
    >
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
        style={{ objectFit: "cover" }}
      />

      <div className="relative w-full max-w-sm mx-4">
        {/* Close */}
        <button
          onClick={() => { onSessionEnd?.(); onClose(); }}
          className="absolute -top-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center z-10 transition-all duration-200"
          style={{ background: "rgba(255,255,255,0.08)", color: "#6B7A99" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#E8EDF5"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6B7A99"; }}
        >
          <X size={16} />
        </button>

        {/* Pattern selector (shown when not running and not in intro) */}
        {!isRunning && !introPlaying && (
          <div className="mb-6">
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-3 text-center"
              style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}
            >
              Choose a Breathing Pattern
            </div>
            <div className="space-y-2">
              {BREATH_PATTERNS.map(pattern => (
                <button
                  key={pattern.id}
                  onClick={() => setSelectedPattern(pattern)}
                  className="w-full p-3 rounded-xl text-left transition-all duration-200"
                  style={{
                    background: selectedPattern.id === pattern.id ? `${pattern.color}15` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedPattern.id === pattern.id ? `${pattern.color}40` : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: selectedPattern.id === pattern.id ? "#E8EDF5" : "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}
                    >
                      {pattern.name}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: `${pattern.color}20`, color: pattern.color, fontFamily: "DM Sans, sans-serif" }}
                    >
                      {totalCycleSec}s cycle
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                    {pattern.description}
                  </div>
                  <div className="text-[10px] mt-1 italic" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
                    {pattern.benefit}
                  </div>
                </button>
              ))}
            </div>

            {/* Guided / Silent toggle */}
            <div className="flex gap-2 mt-4 justify-center">
              <button
                onClick={() => setGuided(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200"
                style={{
                  background: guided ? "rgba(0,212,170,0.12)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${guided ? "rgba(0,212,170,0.35)" : "rgba(255,255,255,0.08)"}`,
                  color: guided ? "#00D4AA" : "#6B7A99",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                <Mic size={12} />
                Guided
              </button>
              <button
                onClick={() => setGuided(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200"
                style={{
                  background: !guided ? "rgba(0,212,170,0.12)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${!guided ? "rgba(0,212,170,0.35)" : "rgba(255,255,255,0.08)"}`,
                  color: !guided ? "#00D4AA" : "#6B7A99",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                <MicOff size={12} />
                Silent
              </button>
            </div>
          </div>
        )}

        {/* Intro playing state */}
        {introPlaying && (
          <div
            className="mb-6 px-4 py-3 rounded-xl text-center text-sm"
            style={{
              background: "rgba(0,212,170,0.08)",
              border: "1px solid rgba(0,212,170,0.2)",
              color: "#00D4AA",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            🎙 Listening to introduction…
          </div>
        )}

        {/* Breathing circle */}
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center" style={{ width: "220px", height: "220px" }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: `${180 + i * 20}px`,
                  height: `${180 + i * 20}px`,
                  border: `1px solid ${(isRunning ? currentPhase?.color : accentColor) ?? accentColor}${Math.round((0.15 - i * 0.04) * 255).toString(16).padStart(2, "0")}`,
                  transform: `scale(${isRunning ? circleScale * (1 + i * 0.05) : 1})`,
                  transition: `transform ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
                }}
              />
            ))}

            <div
              className="rounded-full flex flex-col items-center justify-center"
              style={{
                width: "160px",
                height: "160px",
                background: `radial-gradient(circle at 40% 35%, ${(isRunning ? currentPhase?.color : accentColor) ?? accentColor}25, ${(isRunning ? currentPhase?.color : accentColor) ?? accentColor}08)`,
                border: `2px solid ${(isRunning ? currentPhase?.color : accentColor) ?? accentColor}50`,
                boxShadow: isRunning ? `0 0 40px ${(currentPhase?.color ?? accentColor)}30, inset 0 0 30px ${(currentPhase?.color ?? accentColor)}10` : "none",
                transform: `scale(${isRunning ? circleScale : 1.0})`,
                transition: `transform ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1), border-color 0.8s ease, box-shadow 0.8s ease`,
              }}
            >
              {isRunning ? (
                <>
                  <div className="text-4xl font-bold font-mono-brand" style={{ color: currentPhase?.color ?? accentColor }}>
                    {phaseRemain}
                  </div>
                  <div
                    className="text-xs font-semibold uppercase tracking-widest mt-1"
                    style={{ color: currentPhase?.color ?? accentColor, fontFamily: "DM Sans, sans-serif", opacity: 0.8 }}
                  >
                    {currentPhase?.label}
                  </div>
                </>
              ) : (
                <Wind size={32} style={{ color: accentColor, opacity: 0.6 }} />
              )}
            </div>
          </div>

          {/* Phase dots */}
          {isRunning && (
            <div className="flex gap-2 mt-4">
              {selectedPattern.phases.map((phase, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === phaseIndex ? "20px" : "6px",
                    height: "6px",
                    background: i === phaseIndex ? phase.color : "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
            </div>
          )}

          {isRunning && cycleCount > 0 && (
            <div className="mt-3 text-xs" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
              {cycleCount} {cycleCount === 1 ? "cycle" : "cycles"} complete
            </div>
          )}

          {isRunning && (
            <div className="mt-2 text-sm font-semibold" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
              {selectedPattern.name}
              {guided && <span className="ml-2 text-xs" style={{ color: "#00D4AA", opacity: 0.7 }}>🎙 Guided</span>}
            </div>
          )}

          {/* Start / Stop button */}
          {!introPlaying && (
            <button
              onClick={isRunning ? stopBreathing : startBreathing}
              className="mt-6 px-8 py-3 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95"
              style={{
                background: isRunning
                  ? "rgba(255,255,255,0.06)"
                  : `linear-gradient(135deg, ${selectedPattern.color}, ${selectedPattern.color}CC)`,
                color: isRunning ? "#8FA3BF" : "#fff",
                border: isRunning ? "1px solid rgba(255,255,255,0.1)" : "none",
                boxShadow: isRunning ? "none" : `0 0 20px ${selectedPattern.color}40`,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {isRunning ? "Stop" : `Begin ${selectedPattern.name}`}
            </button>
          )}

          {!isRunning && !introPlaying && (
            <p
              className="mt-4 text-xs text-center leading-relaxed"
              style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif", maxWidth: "240px" }}
            >
              {selectedPattern.benefit}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
