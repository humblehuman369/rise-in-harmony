/**
 * BreathingGuide — Animated breathing overlay for Sound Studio
 * Supports 4-7-8 breathing and Box breathing patterns
 * Bioluminescent Depth theme
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { X, Wind } from "lucide-react";

// ─── Breathing patterns ───────────────────────────────────────────────────────

interface BreathPhase {
  label: string;
  seconds: number;
  color: string;
  scale: number; // circle scale target
}

interface BreathPattern {
  id: string;
  name: string;
  description: string;
  benefit: string;
  color: string;
  phases: BreathPhase[];
}

export const BREATH_PATTERNS: BreathPattern[] = [
  {
    id: "478",
    name: "4-7-8",
    description: "Inhale 4s · Hold 7s · Exhale 8s",
    benefit: "Calms the nervous system, ideal before sleep",
    color: "#8B5CF6",
    phases: [
      { label: "Inhale", seconds: 4, color: "#00D4AA", scale: 1.4 },
      { label: "Hold", seconds: 7, color: "#8B5CF6", scale: 1.4 },
      { label: "Exhale", seconds: 8, color: "#3B82F6", scale: 0.7 },
    ],
  },
  {
    id: "box",
    name: "Box Breathing",
    description: "Inhale 4s · Hold 4s · Exhale 4s · Hold 4s",
    benefit: "Reduces stress, sharpens focus and clarity",
    color: "#00D4AA",
    phases: [
      { label: "Inhale", seconds: 4, color: "#00D4AA", scale: 1.35 },
      { label: "Hold", seconds: 4, color: "#8B5CF6", scale: 1.35 },
      { label: "Exhale", seconds: 4, color: "#3B82F6", scale: 0.7 },
      { label: "Hold", seconds: 4, color: "#6B7A99", scale: 0.7 },
    ],
  },
  {
    id: "calm",
    name: "Calm Breath",
    description: "Inhale 5s · Exhale 5s",
    benefit: "Simple coherence breathing for grounding",
    color: "#F59E0B",
    phases: [
      { label: "Inhale", seconds: 5, color: "#F59E0B", scale: 1.4 },
      { label: "Exhale", seconds: 5, color: "#3B82F6", scale: 0.7 },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface BreathingGuideProps {
  onClose: () => void;
  accentColor?: string;
}

export default function BreathingGuide({ onClose, accentColor = "#00D4AA" }: BreathingGuideProps) {
  const [selectedPattern, setSelectedPattern] = useState<BreathPattern>(BREATH_PATTERNS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseRemain, setPhaseRemain] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [circleScale, setCircleScale] = useState(1.0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  // ── Breathing timer ──────────────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const startBreathing = useCallback(() => {
    stopTimer();
    const pattern = selectedPattern;
    let pIdx = 0;
    let remain = pattern.phases[0].seconds;
    setPhaseIndex(0);
    setPhaseRemain(pattern.phases[0].seconds);
    setCircleScale(pattern.phases[0].scale);
    setIsRunning(true);
    setCycleCount(0);

    intervalRef.current = setInterval(() => {
      remain -= 1;
      if (remain <= 0) {
        pIdx = (pIdx + 1) % pattern.phases.length;
        if (pIdx === 0) setCycleCount(c => c + 1);
        remain = pattern.phases[pIdx].seconds;
        setPhaseIndex(pIdx);
        setCircleScale(pattern.phases[pIdx].scale);
      }
      setPhaseRemain(remain);
    }, 1000);
  }, [selectedPattern, stopTimer]);

  const stopBreathing = useCallback(() => {
    stopTimer();
    setIsRunning(false);
    setPhaseIndex(0);
    setPhaseRemain(0);
    setCircleScale(1.0);
    setCycleCount(0);
  }, [stopTimer]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  // ── CSS transition duration matches phase seconds ────────────────────────────
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
          onClick={onClose}
          className="absolute -top-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center z-10 transition-all duration-200"
          style={{ background: "rgba(255,255,255,0.08)", color: "#6B7A99" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#E8EDF5"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6B7A99"; }}
        >
          <X size={16} />
        </button>

        {/* Pattern selector (shown when not running) */}
        {!isRunning && (
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-center" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
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
                    <span className="text-sm font-semibold" style={{ color: selectedPattern.id === pattern.id ? "#E8EDF5" : "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
                      {pattern.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${pattern.color}20`, color: pattern.color, fontFamily: "DM Sans, sans-serif" }}>
                      {totalCycleSec}s cycle
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>{pattern.description}</div>
                  <div className="text-[10px] mt-1 italic" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>{pattern.benefit}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Breathing circle */}
        <div className="flex flex-col items-center">
          {/* Outer ring */}
          <div className="relative flex items-center justify-center" style={{ width: "220px", height: "220px" }}>
            {/* Glow rings */}
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

            {/* Main breathing circle */}
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
                  <div
                    className="text-4xl font-bold font-mono-brand"
                    style={{ color: currentPhase?.color ?? accentColor }}
                  >
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

          {/* Cycle counter */}
          {isRunning && cycleCount > 0 && (
            <div className="mt-3 text-xs" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
              {cycleCount} {cycleCount === 1 ? "cycle" : "cycles"} complete
            </div>
          )}

          {/* Pattern name when running */}
          {isRunning && (
            <div className="mt-2 text-sm font-semibold" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
              {selectedPattern.name}
            </div>
          )}

          {/* Start / Stop button */}
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

          {/* Benefit text */}
          {!isRunning && (
            <p className="mt-4 text-xs text-center leading-relaxed" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif", maxWidth: "240px" }}>
              {selectedPattern.benefit}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
