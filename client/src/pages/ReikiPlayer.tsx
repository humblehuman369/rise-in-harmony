/**
 * ReikiPlayer — 432Hz Reiki Healing Frequency Player
 *
 * A dedicated healing session page that pairs:
 *   1. A selectable ambient soundscape (Reiki crystal bowls, rain, or ocean waves)
 *   2. A precision DDS 432Hz sine wave synthesized by the AudioWorklet engine
 *
 * Design: Bioluminescent Depth dark theme (#0A0B14 bg, #00D4AA teal accent)
 * Audio:  All frequency synthesis uses the DDS engine (SRS NFR-FREQ-004)
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Play, Pause, Volume2, VolumeX, Radio, Music2,
  Sparkles, Info, ChevronDown, ChevronUp, Timer, CloudRain, Waves,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useTheme } from "@/contexts/ThemeContext";
import { useSoundStudio, type NatureSound } from "@/hooks/useSoundStudio";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Constants ────────────────────────────────────────────────────────────────

const REIKI_HZ = 432;
const DEFAULT_MINUTES = 20;
const FADE_TC = 0.3; // seconds time-constant for DDS gain transitions
const WORKLET_URL = "/dds-processor.js";

// Visual pulse rate: 432 Hz / 108 = 4 pulses/sec (perceptible as gentle breathing)
const VISUAL_PULSE_HZ = REIKI_HZ / 108; // ≈ 4 Hz

const DURATION_PRESETS = [5, 10, 15, 20, 30];

const SOUNDSCAPE_OPTIONS: { id: NatureSound; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: "reiki-432",
    label: "Crystal Bowls",
    icon: <Sparkles size={14} />,
    description: "Tibetan crystal bowl resonance",
  },
  {
    id: "rain",
    label: "Gentle Rain",
    icon: <CloudRain size={14} />,
    description: "Soft rainfall — endless synthesis",
  },
  {
    id: "ocean",
    label: "Ocean Waves",
    icon: <Waves size={14} />,
    description: "Rhythmic ocean shore — endless synthesis",
  },
];

const REIKI_BENEFITS = [
  { label: "Cellular Healing", description: "432Hz resonates with the body's natural repair cycles" },
  { label: "Energy Clearing", description: "Dissolves energetic blockages in the chakra system" },
  { label: "Deep Calm", description: "Activates the parasympathetic nervous system" },
  { label: "Inner Harmony", description: "Aligns body, mind, and spirit with nature's frequency" },
];

const GUIDANCE_STEPS = [
  "Find a comfortable position — lying down is ideal. Close your eyes and take three deep, releasing breaths.",
  "Set a healing intention. It may be physical, emotional, or spiritual. Hold it gently in your awareness.",
  "Imagine a warm, golden-teal light entering through the crown of your head with each inhale.",
  "Feel this light moving slowly down through your head, face, and neck — dissolving any tension it encounters.",
  "The light reaches your heart center. Feel it expand outward in all directions — a sphere of healing warmth.",
  "Allow the 432Hz frequency to resonate in your chest. This is the sound of your body's natural harmony.",
  "The light continues down through your solar plexus — releasing any stored stress or anxiety.",
  "Your sacral center now — the light clears old emotional patterns, restoring creative flow and joy.",
  "The light reaches your root — grounding you deeply into the earth's own healing field.",
  "Your entire energy body is now bathed in 432Hz resonance. Simply receive. There is nothing to do.",
  "If you notice sensations — warmth, tingling, pulsing — these are signs of energy moving and healing.",
  "Rest in this field of pure healing intention. The frequency is doing the work. You only need to be present.",
  "Gently scan your body from head to toe. Notice any areas that feel lighter than when you began.",
  "Take three deep breaths. With each exhale, release anything that no longer serves your highest good.",
  "Slowly return your awareness to the room. Wiggle your fingers and toes. Open your eyes when ready.",
];

// ─── Reiki Visualizer ─────────────────────────────────────────────────────────

function ReikiVisualizer({
  isPlaying,
  freqActive,
  elapsed,
  totalSeconds,
}: {
  isPlaying: boolean;
  freqActive: boolean;
  elapsed: number;
  totalSeconds: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, size, size);

      // ── Breathing pulse: synced to 432Hz visual cycle (4 pulses/sec) ─────
      // t is in ms; VISUAL_PULSE_HZ pulses per second
      const breathPhase = (t * VISUAL_PULSE_HZ * 0.001 * Math.PI * 2);
      const breathScale = isPlaying
        ? 1 + Math.sin(breathPhase) * 0.055   // ±5.5% breathing
        : 1 + Math.sin(t * 0.001) * 0.015;    // very subtle idle

      // ── Outer sacred geometry rings (7 chakras) ───────────────────────────
      const numRings = 7;
      for (let i = numRings; i >= 1; i--) {
        // Each ring breathes slightly out of phase for a ripple effect
        const ringPhase = breathPhase - i * 0.22;
        const ringScale = isPlaying
          ? 1 + Math.sin(ringPhase) * (0.04 + i * 0.006)
          : 1;
        const radius = (size * 0.065 * i) * ringScale;
        const alpha = isPlaying ? 0.14 - i * 0.013 : 0.04;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `#00D4AA${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = isPlaying ? 1.2 : 0.5;
        ctx.stroke();
      }

      // ── Frequency waveform arc (only when DDS is active) ─────────────────
      if (isPlaying && freqActive) {
        const waveRadius = size * 0.30;
        const wavePoints = 180;
        ctx.beginPath();
        for (let i = 0; i <= wavePoints; i++) {
          const angle = (i / wavePoints) * Math.PI * 2 - Math.PI / 2;
          // 432Hz waveform: amplitude modulated by slow sine + breathing
          const waveAmp = 10 * Math.sin(i * (REIKI_HZ / 120) * 0.12 + t * 0.0025) * breathScale;
          const r = waveRadius + waveAmp;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = "#00D4AACC";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // ── Orbiting particles (active only when playing) ─────────────────────
      if (isPlaying) {
        const numParticles = 8;
        const orbitRadius = size * 0.28 * breathScale;
        for (let p = 0; p < numParticles; p++) {
          // Each particle orbits at a slightly different speed
          const orbitSpeed = 0.0004 + p * 0.00005;
          const angle = (p / numParticles) * Math.PI * 2 + t * orbitSpeed;
          const px = cx + Math.cos(angle) * orbitRadius;
          const py = cy + Math.sin(angle) * orbitRadius;
          const pAlpha = 0.4 + Math.sin(breathPhase + p) * 0.3;
          const pRadius = 2.5 + Math.sin(breathPhase + p * 0.8) * 1;
          ctx.beginPath();
          ctx.arc(px, py, pRadius, 0, Math.PI * 2);
          ctx.fillStyle = `#00D4AA${Math.round(pAlpha * 255).toString(16).padStart(2, "0")}`;
          ctx.fill();
        }

        // ── Violet secondary ring (spiritual layer) ─────────────────────────
        const vRadius = size * 0.22 * breathScale;
        ctx.beginPath();
        ctx.arc(cx, cy, vRadius, 0, Math.PI * 2);
        ctx.strokeStyle = "#8B5CF640";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ── Center radial gradient glow ───────────────────────────────────────
      const glowR = size * 0.18 * breathScale;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      gradient.addColorStop(0, `#00D4AA${isPlaying ? "38" : "12"}`);
      gradient.addColorStop(0.5, `#8B5CF6${isPlaying ? "1A" : "06"}`);
      gradient.addColorStop(1, "#00D4AA00");
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // ── Center dot with pulse ─────────────────────────────────────────────
      const dotR = isPlaying
        ? 7 + Math.sin(breathPhase) * 3
        : 4;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fillStyle = isPlaying ? "#00D4AA" : "#00D4AA60";
      ctx.fill();

      // ── Hz label in center ────────────────────────────────────────────────
      ctx.font = `bold ${isPlaying ? 13 : 11}px DM Sans, sans-serif`;
      ctx.fillStyle = isPlaying ? "#00D4AACC" : "#00D4AA60";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("432 Hz", cx, cy + size * 0.12);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, freqActive]);

  // Progress arc overlay
  const progressFraction = totalSeconds > 0 ? Math.min(elapsed / totalSeconds, 1) : 0;

  return (
    <div className="relative w-full max-w-[340px] mx-auto">
      <canvas
        ref={canvasRef}
        width={340}
        height={340}
        className="w-full"
      />
      {/* SVG progress arc drawn on top */}
      {isPlaying && progressFraction > 0 && (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 340 340"
          style={{ pointerEvents: "none" }}
        >
          <circle
            cx="170" cy="170" r="158"
            fill="none"
            stroke="rgba(0,212,170,0.08)"
            strokeWidth="3"
          />
          <circle
            cx="170" cy="170" r="158"
            fill="none"
            stroke="#00D4AA"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 158}`}
            strokeDashoffset={`${2 * Math.PI * 158 * (1 - progressFraction)}`}
            transform="rotate(-90 170 170)"
            style={{ filter: "drop-shadow(0 0 4px rgba(0,212,170,0.6))" }}
          />
        </svg>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  const clamped = Math.max(0, s);
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReikiPlayer() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { isAuthenticated } = useAuth();

  // ── Session duration (customizable) ──────────────────────────────────────
  const [sessionMinutes, setSessionMinutes] = useState(DEFAULT_MINUTES);
  const [customMinutesInput, setCustomMinutesInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const totalSeconds = useMemo(() => sessionMinutes * 60, [sessionMinutes]);

  // ── Playback state ────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState<"sound" | "frequency">("frequency");
  const [ambientVolume, setAmbientVolume] = useState(0.75);
  const [freqVolume, setFreqVolume] = useState(0.25);
  const [currentStep, setCurrentStep] = useState(0);
  const [showGuidance, setShowGuidance] = useState(true);
  const [audioContextSuspended, setAudioContextSuspended] = useState(false);
  const [selectedSoundscape, setSelectedSoundscape] = useState<NatureSound>("reiki-432");

  const remaining = Math.max(0, totalSeconds - elapsed);
  const progress = Math.min((elapsed / totalSeconds) * 100, 100);
  const stepDuration = Math.floor(totalSeconds / GUIDANCE_STEPS.length);

  // ── DDS frequency layer refs ──────────────────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const freqGainRef = useRef<GainNode | null>(null);
  const workletLoadedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Ambient sound studio (Reiki soundscape layer) ─────────────────────────
  const {
    play: studioPlay,
    stop: studioStop,
    setLayerVolume,
    setNatureSound,
  } = useSoundStudio();

  // ── tRPC session logging ──────────────────────────────────────────────────
  const startSession = trpc.sessions.start.useMutation({ meta: { noAuthRedirect: true } });
  const endSession = trpc.sessions.end.useMutation({ meta: { noAuthRedirect: true } });
  const sessionIdRef = useRef<number | null>(null);

  // ── DDS frequency start/stop ──────────────────────────────────────────────
  const stopFrequency = useCallback(() => {
    const ctx = audioCtxRef.current;
    const gain = freqGainRef.current;
    const node = workletNodeRef.current;
    if (!ctx || !gain || !node) return;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.setTargetAtTime(0, ctx.currentTime, FADE_TC);
    setTimeout(() => {
      node.disconnect();
      workletNodeRef.current = null;
    }, 1200);
  }, []);

  const startFrequency = useCallback(async () => {
    if (mode !== "frequency") return;
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
      workletLoadedRef.current = false;
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        setAudioContextSuspended(true);
        toast.error("Tap anywhere to enable audio, then press play again.", { duration: 6000 });
        return;
      }
    }
    if (!workletLoadedRef.current) {
      await ctx.audioWorklet.addModule(WORKLET_URL);
      workletLoadedRef.current = true;
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.setTargetAtTime(freqVolume, ctx.currentTime, FADE_TC * 0.5);
    freqGainRef.current = gain;

    const worklet = new AudioWorkletNode(ctx, "dds-processor", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    workletNodeRef.current = worklet;

    // 432Hz pure sine — mono (no binaural offset for Reiki)
    worklet.port.postMessage({ type: "setFreq", freqL: REIKI_HZ, freqR: REIKI_HZ });
    worklet.port.postMessage({ type: "setWaveform", waveform: "sine" });
    worklet.port.postMessage({ type: "setMode", mode: "mono" });

    worklet.connect(gain);
    gain.connect(ctx.destination);
  }, [mode, freqVolume]);

  // ── Main play/pause handler ───────────────────────────────────────────────
  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      // Pause
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
      studioStop();
      stopFrequency();
      if (isAuthenticated && sessionIdRef.current) {
        endSession.mutateAsync({ sessionId: sessionIdRef.current, durationSeconds: elapsed }).catch(() => {});
        sessionIdRef.current = null;
      }
    } else {
      // Start — reset if session was previously completed
      if (elapsed >= totalSeconds) {
        setElapsed(0);
        setCurrentStep(0);
      }
      setIsPlaying(true);
      setAudioContextSuspended(false);

      // Log session start
      if (isAuthenticated && !sessionIdRef.current) {
        try {
          const result = await startSession.mutateAsync({
            frequencyHz: REIKI_HZ,
            frequencyName: "432Hz Reiki Healing",
            sessionType: "single",
          });
          sessionIdRef.current = result.sessionId;
        } catch { /* non-critical */ }
      }

      // Start ambient soundscape
      studioPlay({
        frequencyVolume: 0,
        natureSound: selectedSoundscape,
        musicMode: "none",
        natureVolume: ambientVolume,
        musicVolume: 0,
      });

      // Start DDS frequency if in frequency mode
      if (mode === "frequency") {
        try {
          await startFrequency();
        } catch {
          setAudioContextSuspended(true);
          toast.error("Tap anywhere to enable audio, then press play again.", { duration: 6000 });
          studioStop();
          setIsPlaying(false);
          return;
        }
      }

      // Countdown timer
      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          const step = Math.min(Math.floor(next / stepDuration), GUIDANCE_STEPS.length - 1);
          setCurrentStep(step);
          if (next >= totalSeconds) {
            clearInterval(timerRef.current!);
            setIsPlaying(false);
            studioStop();
            stopFrequency();
            if (isAuthenticated && sessionIdRef.current) {
              endSession.mutateAsync({ sessionId: sessionIdRef.current, durationSeconds: next }).catch(() => {});
              sessionIdRef.current = null;
            }
            toast("Reiki session complete. Namaste. ✦", { duration: 5000 });
          }
          return next;
        });
      }, 1000);
    }
  }, [
    isPlaying, elapsed, mode, ambientVolume, selectedSoundscape, isAuthenticated,
    studioPlay, studioStop, startFrequency, stopFrequency,
    startSession, endSession, stepDuration, totalSeconds,
  ]);

  // ── Handle soundscape change while playing ────────────────────────────────
  const handleSoundscapeChange = useCallback((sound: NatureSound) => {
    setSelectedSoundscape(sound);
    if (isPlaying) {
      setNatureSound(sound);
    }
  }, [isPlaying, setNatureSound]);

  // ── Handle duration change (resets elapsed) ───────────────────────────────
  const handleDurationChange = useCallback((minutes: number) => {
    if (isPlaying) return; // don't allow change while playing
    setSessionMinutes(minutes);
    setElapsed(0);
    setCurrentStep(0);
  }, [isPlaying]);

  // ── Live freq volume update ───────────────────────────────────────────────
  useEffect(() => {
    if (freqGainRef.current && audioCtxRef.current) {
      freqGainRef.current.gain.setTargetAtTime(freqVolume, audioCtxRef.current.currentTime, 0.1);
    }
  }, [freqVolume]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      studioStop();
      stopFrequency();
      audioCtxRef.current?.close();
      if (isAuthenticated && sessionIdRef.current) {
        endSession.mutateAsync({ sessionId: sessionIdRef.current, durationSeconds: elapsed }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tap-to-unlock audio ───────────────────────────────────────────────────
  const unlockAudio = useCallback(async () => {
    if (!audioContextSuspended) return;
    try {
      if (audioCtxRef.current?.state === "suspended") await audioCtxRef.current.resume();
      setAudioContextSuspended(false);
    } catch { /* ignore */ }
  }, [audioContextSuspended]);

  // ── Color tokens ──────────────────────────────────────────────────────────
  const bg = isLight ? "#F5F6F9" : "#0A0B14";
  const cardBg = isLight ? "#FFFFFF" : "#0E1020";
  const cardBorder = isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.07)";
  const textPrimary = isLight ? "#1A1D2E" : "#E8EDF5";
  const textSecondary = isLight ? "#4A5568" : "#8FA3BF";
  const textMuted = "#6B7A99";

  return (
    <Layout>
      <div
        className="min-h-screen"
        style={{ background: bg }}
        onClick={unlockAudio}
      >
        {/* ── Autoplay blocked banner ───────────────────────────────────── */}
        {audioContextSuspended && (
          <div
            className="flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium cursor-pointer"
            style={{
              background: "linear-gradient(90deg, rgba(245,158,11,0.15), rgba(245,158,11,0.08))",
              borderBottom: "1px solid rgba(245,158,11,0.3)",
              color: "#F59E0B",
              fontFamily: "DM Sans, sans-serif",
            }}
            onClick={unlockAudio}
          >
            <span style={{ fontSize: "1.1rem" }}>🔇</span>
            <span>Tap here to enable audio, then press play</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>(browser autoplay blocked)</span>
          </div>
        )}

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between">
            <div>
              <div
                className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}
              >
                Healing Frequency Session
              </div>
              <h1
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontSize: "2rem",
                  fontWeight: 600,
                  color: textPrimary,
                  lineHeight: 1.2,
                }}
              >
                432Hz Reiki Healing
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}
              >
                Crystal bowls · Tibetan resonance · DDS precision tone
              </p>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(0,212,170,0.12)",
                border: "1px solid rgba(0,212,170,0.25)",
                color: "#00D4AA",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              <Sparkles size={11} />
              Free
            </div>
          </div>

          {/* ── Session Duration Picker ───────────────────────────────────── */}
          <div
            className="rounded-2xl p-4"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Timer size={14} style={{ color: "#00D4AA" }} />
              <span
                className="text-sm font-semibold"
                style={{ color: textPrimary, fontFamily: "DM Sans, sans-serif" }}
              >
                Session Duration
              </span>
              {isPlaying && (
                <span
                  className="ml-auto text-xs"
                  style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}
                >
                  (change when paused)
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map(min => (
                <button
                  key={min}
                  disabled={isPlaying}
                  onClick={() => {
                    setShowCustomInput(false);
                    handleDurationChange(min);
                  }}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    background: sessionMinutes === min && !showCustomInput
                      ? "linear-gradient(135deg, rgba(0,212,170,0.25), rgba(139,92,246,0.15))"
                      : isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)",
                    color: sessionMinutes === min && !showCustomInput ? "#00D4AA" : textSecondary,
                    border: sessionMinutes === min && !showCustomInput
                      ? "1px solid rgba(0,212,170,0.35)"
                      : `1px solid ${cardBorder}`,
                  }}
                >
                  {min} min
                </button>
              ))}
              {/* Custom duration button */}
              <button
                disabled={isPlaying}
                onClick={() => setShowCustomInput(v => !v)}
                className="px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  background: showCustomInput
                    ? "linear-gradient(135deg, rgba(0,212,170,0.25), rgba(139,92,246,0.15))"
                    : isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)",
                  color: showCustomInput ? "#00D4AA" : textSecondary,
                  border: showCustomInput
                    ? "1px solid rgba(0,212,170,0.35)"
                    : `1px solid ${cardBorder}`,
                }}
              >
                Custom
              </button>
            </div>

            {/* Custom input */}
            {showCustomInput && (
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="number"
                  min={1}
                  max={120}
                  placeholder="Minutes (1–120)"
                  value={customMinutesInput}
                  onChange={e => setCustomMinutesInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                  style={{
                    background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${cardBorder}`,
                    color: textPrimary,
                    fontFamily: "DM Sans, sans-serif",
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      const v = parseInt(customMinutesInput, 10);
                      if (v >= 1 && v <= 120) {
                        handleDurationChange(v);
                        setShowCustomInput(false);
                        setCustomMinutesInput("");
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const v = parseInt(customMinutesInput, 10);
                    if (v >= 1 && v <= 120) {
                      handleDurationChange(v);
                      setShowCustomInput(false);
                      setCustomMinutesInput("");
                    } else {
                      toast.error("Enter a duration between 1 and 120 minutes.");
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #00D4AA, #8B5CF6)",
                    color: "#0A0B14",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  Set
                </button>
              </div>
            )}
          </div>

          {/* ── Visualizer + Play button ──────────────────────────────────── */}
          <div
            className="rounded-3xl flex flex-col items-center py-8 px-4"
            style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              boxShadow: isPlaying
                ? "0 0 60px rgba(0,212,170,0.08), 0 0 120px rgba(139,92,246,0.04)"
                : "none",
            }}
          >
            <div className="relative w-full max-w-[340px]">
              <ReikiVisualizer
                isPlaying={isPlaying}
                freqActive={isPlaying && mode === "frequency"}
                elapsed={elapsed}
                totalSeconds={totalSeconds}
              />
              {/* Centered play button */}
              <button
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                  style={{
                    background: isPlaying
                      ? "linear-gradient(135deg, #00D4AA, #8B5CF6)"
                      : "rgba(255,255,255,0.06)",
                    border: `2px solid ${isPlaying ? "#00D4AA" : "rgba(255,255,255,0.12)"}`,
                    boxShadow: isPlaying ? "0 0 30px rgba(0,212,170,0.4)" : "none",
                    color: isPlaying ? "#0A0B14" : textPrimary,
                  }}
                >
                  {isPlaying
                    ? <Pause size={24} fill="currentColor" />
                    : <Play size={24} fill="currentColor" />}
                </div>
              </button>
            </div>

            {/* Countdown + progress bar */}
            <div className="w-full mt-4 px-2">
              <div
                className="flex justify-between text-xs mb-2"
                style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}
              >
                <span>{formatTime(elapsed)}</span>
                <span
                  className="font-semibold"
                  style={{ color: isPlaying ? "#00D4AA" : textMuted }}
                >
                  {isPlaying
                    ? `${formatTime(remaining)} remaining`
                    : `${sessionMinutes} min session`}
                </span>
                <span>{formatTime(totalSeconds)}</span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #00D4AA, #8B5CF6)",
                    boxShadow: "0 0 8px rgba(0,212,170,0.5)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Mode toggle ───────────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-1 flex gap-1"
            style={{
              background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${cardBorder}`,
            }}
          >
            {[
              { id: "sound", label: "Sound Only", icon: <Music2 size={14} /> },
              { id: "frequency", label: "Sound + 432Hz", icon: <Radio size={14} /> },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  if (isPlaying) {
                    if (opt.id === "frequency" && mode === "sound") startFrequency();
                    else if (opt.id === "sound" && mode === "frequency") stopFrequency();
                  }
                  setMode(opt.id as "sound" | "frequency");
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  background: mode === opt.id
                    ? "linear-gradient(135deg, rgba(0,212,170,0.2), rgba(139,92,246,0.12))"
                    : "transparent",
                  color: mode === opt.id ? "#00D4AA" : textMuted,
                  border: mode === opt.id ? "1px solid rgba(0,212,170,0.3)" : "1px solid transparent",
                }}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          {/* ── Frequency info card ───────────────────────────────────────── */}
          {mode === "frequency" && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(0,212,170,0.05)",
                border: "1px solid rgba(0,212,170,0.15)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,212,170,0.15)", color: "#00D4AA" }}
                >
                  <Radio size={15} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: textPrimary, fontFamily: "DM Sans, sans-serif" }}
                    >
                      432Hz — Natural Harmony
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: "rgba(0,212,170,0.15)", color: "#00D4AA" }}
                    >
                      DDS
                    </span>
                  </div>
                  <p
                    className="text-xs leading-relaxed mb-3"
                    style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}
                  >
                    Precision-synthesized by the DDS AudioWorklet engine — double-precision
                    phase accumulation ensures zero frequency drift across the entire session.
                    Tuned to the mathematical frequency of nature.
                  </p>
                  {/* Frequency volume slider */}
                  <div className="flex items-center gap-3">
                    <VolumeX size={12} style={{ color: textMuted }} />
                    <Slider
                      value={[freqVolume * 100]}
                      onValueChange={([v]) => setFreqVolume(v / 100)}
                      min={0} max={100} step={1}
                      className="flex-1"
                    />
                    <Volume2 size={12} style={{ color: textMuted }} />
                    <span
                      className="text-xs w-8 text-right"
                      style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}
                    >
                      {Math.round(freqVolume * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Soundscape Selector ───────────────────────────────────────── */}
          <div
            className="rounded-2xl p-4"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Music2 size={14} style={{ color: "#00D4AA" }} />
              <span
                className="text-sm font-semibold"
                style={{ color: textPrimary, fontFamily: "DM Sans, sans-serif" }}
              >
                Ambient Soundscape
              </span>
            </div>

            {/* Soundscape option pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {SOUNDSCAPE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSoundscapeChange(opt.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 active:scale-95"
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    background: selectedSoundscape === opt.id
                      ? "linear-gradient(135deg, rgba(0,212,170,0.2), rgba(139,92,246,0.12))"
                      : isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)",
                    color: selectedSoundscape === opt.id ? "#00D4AA" : textSecondary,
                    border: selectedSoundscape === opt.id
                      ? "1px solid rgba(0,212,170,0.3)"
                      : `1px solid ${cardBorder}`,
                  }}
                  title={opt.description}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-3">
              <VolumeX size={12} style={{ color: textMuted }} />
              <Slider
                value={[ambientVolume * 100]}
                onValueChange={([v]) => {
                  setAmbientVolume(v / 100);
                  setLayerVolume("nature", v / 100);
                }}
                min={0} max={100} step={1}
                className="flex-1"
              />
              <Volume2 size={12} style={{ color: textMuted }} />
              <span
                className="text-xs w-8 text-right"
                style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}
              >
                {Math.round(ambientVolume * 100)}%
              </span>
            </div>
          </div>

          {/* ── Affirmation ───────────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-5 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(0,212,170,0.08), rgba(139,92,246,0.06))",
              border: "1px solid rgba(0,212,170,0.18)",
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00D4AA" }} />
              <span
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
              >
                Healing Intention
              </span>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00D4AA" }} />
            </div>
            <p
              className="italic leading-relaxed"
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "1.05rem",
                color: isLight ? "#2D3748" : "#C8D8E8",
              }}
            >
              "Universal life energy flows through me, healing every cell,
              clearing every block, restoring perfect harmony."
            </p>
          </div>

          {/* ── Benefits grid ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {REIKI_BENEFITS.map(b => (
              <div
                key={b.label}
                className="rounded-2xl p-4"
                style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
              >
                <div
                  className="text-xs font-semibold mb-1"
                  style={{ color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
                >
                  {b.label}
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}
                >
                  {b.description}
                </p>
              </div>
            ))}
          </div>

          {/* ── Guided steps ──────────────────────────────────────────────── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <button
              onClick={() => setShowGuidance(g => !g)}
              className="flex items-center gap-2 w-full px-5 py-4"
            >
              <Info size={14} style={{ color: "#00D4AA" }} />
              <span
                className="text-sm font-semibold flex-1 text-left"
                style={{ color: textPrimary, fontFamily: "DM Sans, sans-serif" }}
              >
                Session Guidance
              </span>
              {showGuidance
                ? <ChevronUp size={14} style={{ color: textMuted }} />
                : <ChevronDown size={14} style={{ color: textMuted }} />}
            </button>

            {showGuidance && (
              <div style={{ borderTop: `1px solid ${cardBorder}` }}>
                {GUIDANCE_STEPS.map((step, i) => {
                  const isActive = i === currentStep && isPlaying;
                  return (
                    <div
                      key={i}
                      className="px-5 py-3 flex gap-3 transition-all duration-500"
                      style={{
                        background: isActive ? "rgba(0,212,170,0.06)" : "transparent",
                        borderBottom: i < GUIDANCE_STEPS.length - 1 ? `1px solid ${cardBorder}` : "none",
                        opacity: isActive ? 1 : 0.55,
                      }}
                    >
                      <span
                        className="text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{
                          color: isActive ? "#00D4AA" : textMuted,
                          fontFamily: "DM Sans, sans-serif",
                          minWidth: "1.25rem",
                        }}
                      >
                        {i + 1}
                      </span>
                      <p
                        className="text-sm leading-relaxed"
                        style={{
                          color: isActive ? textPrimary : textSecondary,
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        {step}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Technology note ───────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-4 flex gap-3"
            style={{
              background: isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${cardBorder}`,
            }}
          >
            <Radio size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#00D4AA" }} />
            <p
              className="text-xs leading-relaxed"
              style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}
            >
              The 432Hz tone is synthesized in real-time by the{" "}
              <span style={{ color: "#00D4AA" }}>DDS AudioWorklet engine</span> using
              double-precision phase accumulation — the same technology used in professional
              signal generators. This ensures the frequency never drifts from 432.000Hz across
              the entire session, unlike recordings which degrade with lossy compression.
            </p>
          </div>

        </div>
      </div>
    </Layout>
  );
}
