/**
 * ReikiPlayer — 432Hz Reiki Healing Frequency Player
 *
 * A dedicated healing session page that pairs:
 *   1. The studio-produced 432Hz Reiki ambient soundscape (crystal bowls + Tibetan tones)
 *   2. A precision DDS 432Hz sine wave synthesized by the AudioWorklet engine
 *
 * Design: Bioluminescent Depth dark theme (#0A0B14 bg, #00D4AA teal accent)
 * Audio:  All frequency synthesis uses the DDS engine (SRS NFR-FREQ-004)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, Radio, Music2,
  Sparkles, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useTheme } from "@/contexts/ThemeContext";
import { useSoundStudio } from "@/hooks/useSoundStudio";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Constants ────────────────────────────────────────────────────────────────

const REIKI_HZ = 432;
const SESSION_MINUTES = 20;
const FADE_TC = 0.3; // seconds time-constant for DDS gain transitions
const WORKLET_URL = "/dds-processor.js";

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

function ReikiVisualizer({ isPlaying, freqActive }: { isPlaying: boolean; freqActive: boolean }) {
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

      const speed = isPlaying ? 1 : 0.15;
      const pulse = isPlaying ? Math.sin(t * 0.0015 * speed) * 0.08 + 1 : 1;

      // ── Outer sacred geometry rings ──────────────────────────────────────
      const numRings = 7; // 7 chakras
      for (let i = numRings; i >= 1; i--) {
        const radius = (size * 0.065 * i) * pulse;
        const alpha = isPlaying ? 0.12 - i * 0.012 : 0.04;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `#00D4AA${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
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
          // 432Hz waveform: amplitude modulated by slow sine
          const waveAmp = 10 * Math.sin(i * (REIKI_HZ / 120) * 0.12 + t * 0.0025);
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

      // ── Violet secondary ring (spiritual layer) ───────────────────────────
      if (isPlaying) {
        const vRadius = size * 0.22 * pulse;
        ctx.beginPath();
        ctx.arc(cx, cy, vRadius, 0, Math.PI * 2);
        ctx.strokeStyle = "#8B5CF640";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ── Center radial gradient glow ───────────────────────────────────────
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.18);
      gradient.addColorStop(0, `#00D4AA${isPlaying ? '35' : '12'}`);
      gradient.addColorStop(0.5, `#8B5CF6${isPlaying ? '18' : '06'}`);
      gradient.addColorStop(1, "#00D4AA00");
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // ── Center dot with pulse ─────────────────────────────────────────────
      const dotR = isPlaying ? 7 + Math.sin(t * 0.004) * 2.5 : 4;
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

  return (
    <canvas
      ref={canvasRef}
      width={340}
      height={340}
      className="w-full max-w-[340px] mx-auto"
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReikiPlayer() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { isAuthenticated } = useAuth();

  // ── Playback state ────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState<"sound" | "frequency">("frequency");
  const [ambientVolume, setAmbientVolume] = useState(0.75);
  const [freqVolume, setFreqVolume] = useState(0.25);
  const [currentStep, setCurrentStep] = useState(0);
  const [showGuidance, setShowGuidance] = useState(true);
  const [audioContextSuspended, setAudioContextSuspended] = useState(false);

  const totalSeconds = SESSION_MINUTES * 60;
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
      // Start
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

      // Start Reiki ambient soundscape (recorded loop, no music layer)
      studioPlay({
        frequencyVolume: 0,
        natureSound: "reiki-432",
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

      // Timer
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
    isPlaying, elapsed, mode, ambientVolume, isAuthenticated,
    studioPlay, studioStop, startFrequency, stopFrequency,
    startSession, endSession, stepDuration, totalSeconds,
  ]);

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
              <ReikiVisualizer isPlaying={isPlaying} freqActive={isPlaying && mode === "frequency"} />
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

            {/* Progress bar */}
            <div className="w-full mt-4 px-2">
              <div
                className="flex justify-between text-xs mb-2"
                style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}
              >
                <span>{formatTime(elapsed)}</span>
                <span>{SESSION_MINUTES} min session</span>
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
                    phase accumulation ensures zero frequency drift across the full 20-minute session.
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

          {/* ── Ambient volume ────────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-4"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Music2 size={14} style={{ color: textSecondary }} />
              <span
                className="text-sm font-medium"
                style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}
              >
                Reiki Soundscape Volume
              </span>
            </div>
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
