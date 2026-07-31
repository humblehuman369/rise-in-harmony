/**
 * ReikiPlayer — Immersive 432Hz Reiki Healing Session
 *
 * A premium healing session experience built on the brief:
 *   - 5-phase structured session (Arrival → Grounding → Energy Opening → Healing Core → Return)
 *   - DDS tri-layer frequency system: 216Hz (warm) + 432Hz (anchor) + 864Hz (radiance)
 *   - Bowl type selection: Crystal (pure/ethereal) or Tibetan (earthy/grounding)
 *   - Live phase guidance with sparse, spaced-out cues
 *   - Session lengths: 20 min (standard) or 30 min (deep)
 *   - Bioluminescent Depth dark theme
 *
 * Audio: All frequency synthesis uses the DDS engine (SRS NFR-FREQ-004)
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Play, Pause, Volume2, VolumeX, Radio,
  Sparkles, ChevronDown, ChevronUp, Timer,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useTheme } from "@/contexts/ThemeContext";
import { useSoundStudio, type NatureSound } from "@/hooks/useSoundStudio";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Constants ────────────────────────────────────────────────────────────────

const WORKLET_URL = "/dds-processor.js";
const FADE_TC = 0.4; // seconds time-constant for DDS gain transitions

// DDS tri-layer frequencies (from brief)
const FREQ_LOW = 216;   // one octave below — warm, physical depth
const FREQ_MID = 432;   // principal anchor
const FREQ_HIGH = 864;  // one octave above — clarity/radiance (very subtle)

// Session phase definitions — based on the 30-min structure from the brief
// Scaled proportionally for both 20-min and 30-min sessions
const SESSION_PHASES = [
  {
    id: "arrival",
    label: "Arrival",
    fraction: 0.083,       // ~8.3% of session (2.5 min of 30)
    color: "#6B7A99",
    guidance: [
      "Find a comfortable position — lying down is ideal. Close your eyes.",
      "Take three slow, releasing breaths. Let the surface beneath you hold your weight completely.",
    ],
  },
  {
    id: "grounding",
    label: "Grounding",
    fraction: 0.117,       // ~11.7% (3.5 min of 30)
    color: "#F59E0B",
    guidance: [
      "Bring awareness to your feet, legs, and the base of your spine.",
      "Feel the earth's steady support rising up through you. You are held.",
      "The 432Hz tone enters gently now — a warm, precise anchor beneath the bowls.",
    ],
  },
  {
    id: "opening",
    label: "Energy Opening",
    fraction: 0.167,       // ~16.7% (5 min of 30)
    color: "#00D4AA",
    guidance: [
      "Invite your energy field to soften and open. There is nothing to force.",
      "Receive the bowl tones as permission — permission to release what no longer serves.",
      "Notice any areas of tension. Breathe into them gently, without judgment.",
    ],
  },
  {
    id: "core",
    label: "Healing Core",
    fraction: 0.333,       // ~33.3% (10 min of 30) — the longest phase
    color: "#8B5CF6",
    guidance: [
      "You are now in the heart of the session. Simply receive.",
      "The frequency field is doing the work. Your only task is to be present.",
      "If you notice warmth, tingling, or pulsing — these are signs of energy moving.",
      "Allow the 432Hz resonance to move through your chest, your heart center.",
      "The light continues through your solar plexus, your sacral center, your root.",
      "Your entire energy body is bathed in healing resonance.",
    ],
  },
  {
    id: "integration",
    label: "Integration",
    fraction: 0.167,       // ~16.7% (5 min of 30)
    color: "#EC4899",
    guidance: [
      "The words grow fewer now. The sound holds you.",
      "Feel the energy settling — like water finding its level.",
      "Invite the body to integrate everything it has received.",
    ],
  },
  {
    id: "return",
    label: "Grounded Return",
    fraction: 0.133,       // ~13.3% (4 min of 30)
    color: "#3B82F6",
    guidance: [
      "The frequency tone fades first, leaving only the bowls.",
      "Gently deepen your breath. Feel the weight of your body.",
      "Wiggle your fingers and toes. Take your time.",
      "When you are ready, slowly open your eyes. Namaste. ✦",
    ],
  },
] as const;

type PhaseId = typeof SESSION_PHASES[number]["id"];

// Bowl type options
const BOWL_TYPES = [
  {
    id: "crystal" as const,
    label: "Crystal Bowls",
    subtitle: "Pure · Luminous · Ethereal",
    description: "432-tuned crystal bowls for clarity and spacious resonance. Best for emotional release and heart-centered work.",
    soundscape: "reiki-432" as NatureSound,
    color: "#00D4AA",
    icon: "✦",
  },
  {
    id: "tibetan" as const,
    label: "Tibetan Bowls",
    subtitle: "Earthy · Ancient · Grounding",
    description: "Metal bowls with complex inharmonic overtones. Ceremonial, tactile, and deeply grounding. Best for root and body work.",
    soundscape: "rain" as NatureSound, // closest available ambient for Tibetan feel
    color: "#F59E0B",
    icon: "◉",
  },
] as const;

type BowlType = typeof BOWL_TYPES[number]["id"];

// Session duration presets
const DURATION_OPTIONS = [
  { minutes: 20, label: "20 min", sublabel: "Standard" },
  { minutes: 30, label: "30 min", sublabel: "Deep" },
];

// ─── Phase Timeline Component ─────────────────────────────────────────────────

function PhaseTimeline({
  phases,
  currentPhaseId,
  progress,
  isLight,
}: {
  phases: typeof SESSION_PHASES;
  currentPhaseId: PhaseId | null;
  progress: number;
  isLight: boolean;
}) {
  return (
    <div className="w-full">
      {/* Phase labels */}
      <div className="flex gap-0.5 mb-2">
        {phases.map((phase) => {
          const isActive = phase.id === currentPhaseId;
          const isDone = currentPhaseId !== null &&
            phases.findIndex(p => p.id === currentPhaseId) >
            phases.findIndex(p => p.id === phase.id);
          return (
            <div
              key={phase.id}
              className="flex-1 text-center transition-all duration-500"
              style={{ flexBasis: `${phase.fraction * 100}%` }}
            >
              <div
                className="text-[9px] font-semibold truncate px-0.5"
                style={{
                  color: isActive ? phase.color : isDone ? (isLight ? '#9AA3B5' : '#4A5568') : (isLight ? '#C5CAD6' : '#2A3040'),
                  fontFamily: "DM Sans, sans-serif",
                  transition: "color 0.5s ease",
                }}
              >
                {phase.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Segmented progress bar */}
      <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
        {phases.map((phase) => {
          const phaseIdx = phases.findIndex(p => p.id === phase.id);
          const currentIdx = currentPhaseId ? phases.findIndex(p => p.id === currentPhaseId) : -1;
          const isDone = currentIdx > phaseIdx;
          const isActive = currentIdx === phaseIdx;

          // Calculate fill within this segment
          let segFill = 0;
          if (isDone) segFill = 1;
          else if (isActive) {
            // How far into this phase are we?
            const phaseStart = phases.slice(0, phaseIdx).reduce((s, p) => s + p.fraction, 0);
            const phaseFrac = phase.fraction;
            const globalFrac = progress / 100;
            segFill = Math.min(1, Math.max(0, (globalFrac - phaseStart) / phaseFrac));
          }

          return (
            <div
              key={phase.id}
              className="relative overflow-hidden rounded-full"
              style={{
                flex: `0 0 ${phase.fraction * 100}%`,
                background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="absolute inset-y-0 left-0 transition-all duration-1000"
                style={{
                  width: `${segFill * 100}%`,
                  background: isDone
                    ? (isLight ? 'rgba(0,212,170,0.4)' : 'rgba(0,212,170,0.3)')
                    : `linear-gradient(90deg, ${phase.color}, ${phase.color}CC)`,
                  boxShadow: isActive ? `0 0 6px ${phase.color}80` : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Reiki Visualizer ─────────────────────────────────────────────────────────

function ReikiVisualizer({
  isPlaying,
  freqActive,
  currentPhaseId,
  bowlType,
}: {
  isPlaying: boolean;
  freqActive: boolean;
  currentPhaseId: PhaseId | null;
  bowlType: BowlType;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const phaseColor = currentPhaseId
    ? SESSION_PHASES.find(p => p.id === currentPhaseId)?.color ?? "#00D4AA"
    : "#00D4AA";

  const accentColor = bowlType === "crystal" ? "#00D4AA" : "#F59E0B";

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

      // Breathing pulse — 432/108 ≈ 4 Hz visual cycle
      const breathPhase = t * (432 / 108) * 0.001 * Math.PI * 2;
      const breathScale = isPlaying
        ? 1 + Math.sin(breathPhase) * 0.055
        : 1 + Math.sin(t * 0.001) * 0.015;

      // ── Outer sacred geometry rings (7 chakras) ───────────────────────────
      const numRings = 7;
      for (let i = numRings; i >= 1; i--) {
        const ringPhase = breathPhase - i * 0.22;
        const ringScale = isPlaying ? 1 + Math.sin(ringPhase) * (0.04 + i * 0.006) : 1;
        const radius = (size * 0.065 * i) * ringScale;
        const alpha = isPlaying ? 0.15 - i * 0.014 : 0.04;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        // Alternate ring color based on bowl type
        const ringColor = i % 2 === 0 ? accentColor : phaseColor;
        ctx.strokeStyle = `${ringColor}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = isPlaying ? 1.2 : 0.5;
        ctx.stroke();
      }

      // ── Waveform arc (DDS active) ─────────────────────────────────────────
      if (isPlaying && freqActive) {
        const waveRadius = size * 0.30;
        const wavePoints = 180;
        ctx.beginPath();
        for (let i = 0; i <= wavePoints; i++) {
          const angle = (i / wavePoints) * Math.PI * 2 - Math.PI / 2;
          const waveAmp = 10 * Math.sin(i * (FREQ_MID / 120) * 0.12 + t * 0.0025) * breathScale;
          const r = waveRadius + waveAmp;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `${accentColor}CC`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // ── Orbiting particles ────────────────────────────────────────────────
      if (isPlaying) {
        const numParticles = bowlType === "crystal" ? 8 : 6;
        const orbitRadius = size * 0.28 * breathScale;
        for (let p = 0; p < numParticles; p++) {
          const orbitSpeed = 0.0004 + p * 0.00005;
          const angle = (p / numParticles) * Math.PI * 2 + t * orbitSpeed;
          const px = cx + Math.cos(angle) * orbitRadius;
          const py = cy + Math.sin(angle) * orbitRadius;
          const pAlpha = 0.4 + Math.sin(breathPhase + p) * 0.3;
          const pRadius = bowlType === "tibetan"
            ? 3 + Math.sin(breathPhase + p * 0.8) * 1.5
            : 2.5 + Math.sin(breathPhase + p * 0.8) * 1;
          ctx.beginPath();
          ctx.arc(px, py, pRadius, 0, Math.PI * 2);
          ctx.fillStyle = `${accentColor}${Math.round(pAlpha * 255).toString(16).padStart(2, "0")}`;
          ctx.fill();
        }

        // Phase color secondary ring
        const vRadius = size * 0.22 * breathScale;
        ctx.beginPath();
        ctx.arc(cx, cy, vRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `${phaseColor}40`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ── Center glow ───────────────────────────────────────────────────────
      const glowR = size * 0.18 * breathScale;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      gradient.addColorStop(0, `${accentColor}${isPlaying ? "38" : "12"}`);
      gradient.addColorStop(0.5, `${phaseColor}${isPlaying ? "1A" : "06"}`);
      gradient.addColorStop(1, `${accentColor}00`);
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // ── Center dot ────────────────────────────────────────────────────────
      const dotR = isPlaying ? 7 + Math.sin(breathPhase) * 3 : 4;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fillStyle = isPlaying ? accentColor : `${accentColor}60`;
      ctx.fill();

      // ── Hz label ─────────────────────────────────────────────────────────
      ctx.font = `bold ${isPlaying ? 13 : 11}px DM Sans, sans-serif`;
      ctx.fillStyle = isPlaying ? `${accentColor}CC` : `${accentColor}60`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("432 Hz", cx, cy + size * 0.12);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, freqActive, phaseColor, accentColor, bowlType]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={320}
      className="w-full max-w-[320px] mx-auto block"
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  const clamped = Math.max(0, s);
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

function getPhaseAtProgress(progressFraction: number): PhaseId {
  let cumulative = 0;
  for (const phase of SESSION_PHASES) {
    cumulative += phase.fraction;
    if (progressFraction <= cumulative) return phase.id;
  }
  return SESSION_PHASES[SESSION_PHASES.length - 1].id;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReikiPlayer() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { isAuthenticated } = useAuth();

  // ── Session config ────────────────────────────────────────────────────────
  const [sessionMinutes, setSessionMinutes] = useState(20);
  const [bowlType, setBowlType] = useState<BowlType>("crystal");
  const totalSeconds = useMemo(() => sessionMinutes * 60, [sessionMinutes]);

  // ── Playback state ────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ambientVolume, setAmbientVolume] = useState(0.78);
  const [freqEnabled, setFreqEnabled] = useState(true);
  const [freqVolume, setFreqVolume] = useState(0.22); // 432Hz anchor — subtle
  const [audioContextSuspended, setAudioContextSuspended] = useState(false);
  const [showGuidance, setShowGuidance] = useState(true);
  const [showFreqDetails, setShowFreqDetails] = useState(false);

  const remaining = Math.max(0, totalSeconds - elapsed);
  const progress = Math.min((elapsed / totalSeconds) * 100, 100);
  const progressFraction = elapsed / totalSeconds;

  // Current phase derived from elapsed time
  const currentPhaseId: PhaseId | null = isPlaying || elapsed > 0
    ? getPhaseAtProgress(Math.min(progressFraction, 0.9999))
    : null;
  const currentPhase = SESSION_PHASES.find(p => p.id === currentPhaseId) ?? null;

  // Current guidance cue within the phase
  const currentGuidanceCue = useMemo(() => {
    if (!currentPhase || !isPlaying) return null;
    const phaseStart = SESSION_PHASES.slice(0, SESSION_PHASES.findIndex(p => p.id === currentPhaseId))
      .reduce((s, p) => s + p.fraction, 0);
    const phaseDuration = currentPhase.fraction * totalSeconds;
    const phaseElapsed = progressFraction * totalSeconds - phaseStart * totalSeconds;
    const cueInterval = phaseDuration / currentPhase.guidance.length;
    const cueIdx = Math.min(
      Math.floor(phaseElapsed / cueInterval),
      currentPhase.guidance.length - 1
    );
    return currentPhase.guidance[cueIdx];
  }, [currentPhaseId, currentPhase, progressFraction, totalSeconds, isPlaying]);

  // ── DDS frequency layer refs ──────────────────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletLowRef = useRef<AudioWorkletNode | null>(null);
  const workletMidRef = useRef<AudioWorkletNode | null>(null);
  const workletHighRef = useRef<AudioWorkletNode | null>(null);
  const gainLowRef = useRef<GainNode | null>(null);
  const gainMidRef = useRef<GainNode | null>(null);
  const gainHighRef = useRef<GainNode | null>(null);
  const workletLoadedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Ambient sound studio ──────────────────────────────────────────────────
  const { play: studioPlay, stop: studioStop, setLayerVolume, setNatureSound } = useSoundStudio();

  // ── tRPC session logging ──────────────────────────────────────────────────
  const startSession = trpc.sessions.start.useMutation({ meta: { noAuthRedirect: true } });
  const endSession = trpc.sessions.end.useMutation({ meta: { noAuthRedirect: true } });
  const sessionIdRef = useRef<number | null>(null);

  // ── DDS stop (all layers) ─────────────────────────────────────────────────
  const stopFrequency = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    [gainLowRef, gainMidRef, gainHighRef].forEach(gainRef => {
      if (gainRef.current) {
        gainRef.current.gain.cancelScheduledValues(now);
        gainRef.current.gain.setValueAtTime(gainRef.current.gain.value, now);
        gainRef.current.gain.setTargetAtTime(0, now, FADE_TC);
      }
    });
    setTimeout(() => {
      [workletLowRef, workletMidRef, workletHighRef].forEach(ref => {
        ref.current?.disconnect();
        ref.current = null;
      });
    }, 1500);
  }, []);

  // ── DDS start (tri-layer: 216 + 432 + 864) ───────────────────────────────
  const startFrequency = useCallback(async (delaySeconds = 0) => {
    if (!freqEnabled) return;
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
      workletLoadedRef.current = false;
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      try { await ctx.resume(); }
      catch {
        setAudioContextSuspended(true);
        return;
      }
    }
    if (!workletLoadedRef.current) {
      await ctx.audioWorklet.addModule(WORKLET_URL);
      workletLoadedRef.current = true;
    }

    // Per the brief: 216Hz warm presence, 432Hz identifiable anchor, 864Hz almost imperceptible
    const layerConfigs = [
      { ref: workletLowRef, gainRef: gainLowRef, freq: FREQ_LOW, vol: freqVolume * 0.55 },   // warm supporting presence
      { ref: workletMidRef, gainRef: gainMidRef, freq: FREQ_MID, vol: freqVolume * 1.0 },    // principal anchor
      { ref: workletHighRef, gainRef: gainHighRef, freq: FREQ_HIGH, vol: freqVolume * 0.12 }, // almost imperceptible
    ];

    for (const layer of layerConfigs) {
      if (layer.ref.current) {
        layer.ref.current.disconnect();
        layer.ref.current = null;
      }
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      // Fade in after delaySeconds (per brief: 432Hz enters at ~2:30)
      gain.gain.setTargetAtTime(layer.vol, ctx.currentTime + delaySeconds, FADE_TC * 2);
      layer.gainRef.current = gain;

      const worklet = new AudioWorkletNode(ctx, "dds-processor", {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      layer.ref.current = worklet;
      worklet.port.postMessage({ type: "setFreq", freqL: layer.freq, freqR: layer.freq });
      worklet.port.postMessage({ type: "setWaveform", waveform: "sine" });
      worklet.port.postMessage({ type: "setMode", mode: "mono" });
      worklet.connect(gain);
      gain.connect(ctx.destination);
    }
  }, [freqEnabled, freqVolume]);

  // ── Fade out DDS before session end (per brief: tone fades first) ─────────
  const scheduleDdsFadeOut = useCallback((secondsUntilEnd: number) => {
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    const fadeAt = Math.max(0, secondsUntilEnd - 90) * 1000; // fade 90s before end
    phaseTimerRef.current = setTimeout(() => {
      stopFrequency();
    }, fadeAt);
  }, [stopFrequency]);

  // ── Main play/pause ───────────────────────────────────────────────────────
  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
      studioStop();
      stopFrequency();
      if (isAuthenticated && sessionIdRef.current) {
        endSession.mutateAsync({ sessionId: sessionIdRef.current, durationSeconds: elapsed }).catch(() => {});
        sessionIdRef.current = null;
      }
    } else {
      if (elapsed >= totalSeconds) {
        setElapsed(0);
      }
      setIsPlaying(true);
      setAudioContextSuspended(false);

      if (isAuthenticated && !sessionIdRef.current) {
        try {
          const result = await startSession.mutateAsync({
            frequencyHz: FREQ_MID,
            frequencyName: "432Hz Reiki Healing",
            sessionType: "single",
          });
          sessionIdRef.current = result.sessionId;
        } catch { /* non-critical */ }
      }

      const selectedBowl = BOWL_TYPES.find(b => b.id === bowlType)!;
      studioPlay({
        frequencyVolume: 0,
        natureSound: selectedBowl.soundscape,
        musicMode: "none",
        natureVolume: ambientVolume,
        musicVolume: 0,
      });

      // DDS enters at ~2:30 per the brief (150 seconds delay)
      const ddsDelay = Math.min(150, totalSeconds * 0.083);
      if (freqEnabled) {
        try {
          await startFrequency(ddsDelay);
        } catch {
          setAudioContextSuspended(true);
          toast.error("Tap anywhere to enable audio, then press play again.", { duration: 6000 });
          studioStop();
          setIsPlaying(false);
          return;
        }
      }

      // Schedule DDS fade-out before session end
      const secondsRemaining = totalSeconds - elapsed;
      scheduleDdsFadeOut(secondsRemaining);

      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          if (next >= totalSeconds) {
            clearInterval(timerRef.current!);
            setIsPlaying(false);
            studioStop();
            stopFrequency();
            if (isAuthenticated && sessionIdRef.current) {
              endSession.mutateAsync({ sessionId: sessionIdRef.current, durationSeconds: next }).catch(() => {});
              sessionIdRef.current = null;
            }
            toast("Your Reiki session is complete. Namaste. ✦", { duration: 6000 });
          }
          return next;
        });
      }, 1000);
    }
  }, [
    isPlaying, elapsed, totalSeconds, bowlType, ambientVolume, freqEnabled, isAuthenticated,
    studioPlay, studioStop, startFrequency, stopFrequency, scheduleDdsFadeOut,
    startSession, endSession,
  ]);

  // ── Live freq volume update ───────────────────────────────────────────────
  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    if (gainLowRef.current) gainLowRef.current.gain.setTargetAtTime(freqVolume * 0.55, now, 0.1);
    if (gainMidRef.current) gainMidRef.current.gain.setTargetAtTime(freqVolume * 1.0, now, 0.1);
    if (gainHighRef.current) gainHighRef.current.gain.setTargetAtTime(freqVolume * 0.12, now, 0.1);
  }, [freqVolume]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
      studioStop();
      stopFrequency();
      audioCtxRef.current?.close();
      if (isAuthenticated && sessionIdRef.current) {
        endSession.mutateAsync({ sessionId: sessionIdRef.current, durationSeconds: elapsed }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tap to unlock ─────────────────────────────────────────────────────────
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
  const bowlAccent = bowlType === "crystal" ? "#00D4AA" : "#F59E0B";
  const phaseAccent = currentPhase?.color ?? bowlAccent;

  return (
    <Layout>
      <div className="min-h-screen relative" style={{ background: bg }} onClick={unlockAudio}>
        {/* Bioluminescent background */}
        {!isLight && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
            <div className="absolute" style={{ top: '5%', left: '50%', transform: 'translateX(-50%)', width: '90%', height: '60%', background: `radial-gradient(ellipse, ${bowlAccent}06 0%, transparent 70%)` }} />
            <div className="absolute" style={{ bottom: '10%', right: '5%', width: '40%', height: '40%', background: 'radial-gradient(ellipse, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
          </div>
        )}

        {/* ── Autoplay blocked banner ────────────────────────────────────── */}
        {audioContextSuspended && (
          <div
            className="flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium cursor-pointer"
            style={{
              background: "linear-gradient(90deg, rgba(245,158,11,0.15), rgba(245,158,11,0.08))",
              borderBottom: "1px solid rgba(245,158,11,0.3)",
              color: "#F59E0B",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            <span>🔇</span>
            <span>Tap here to enable audio, then press play</span>
          </div>
        )}

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">

          {/* ── Header ──────────────────────────────────────────────────── */}
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
                fontSize: "2.2rem",
                fontWeight: 600,
                color: textPrimary,
                lineHeight: 1.15,
              }}
            >
              432Hz Reiki Healing
            </h1>
            <p className="text-sm mt-1" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}>
              DDS precision anchor · {bowlType === "crystal" ? "Crystal bowl resonance" : "Tibetan bowl resonance"} · Structured session
            </p>
          </div>

          {/* ── Bowl type selector ───────────────────────────────────────── */}
          {!isPlaying && (
            <div className="grid grid-cols-2 gap-3">
              {BOWL_TYPES.map(bowl => (
                <button
                  key={bowl.id}
                  onClick={() => setBowlType(bowl.id)}
                  className="p-4 rounded-2xl text-left transition-all duration-200 relative overflow-hidden"
                  style={{
                    background: bowlType === bowl.id
                      ? `${bowl.color}12`
                      : (isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)"),
                    border: `1px solid ${bowlType === bowl.id ? `${bowl.color}45` : cardBorder}`,
                    transform: bowlType === bowl.id ? "scale(1.01)" : "scale(1)",
                    boxShadow: bowlType === bowl.id ? `0 0 20px ${bowl.color}15` : "none",
                  }}
                >
                  <div className="text-xl mb-2" style={{ color: bowl.color }}>{bowl.icon}</div>
                  <div className="text-sm font-semibold mb-0.5" style={{ color: bowlType === bowl.id ? textPrimary : textSecondary, fontFamily: "DM Sans, sans-serif" }}>
                    {bowl.label}
                  </div>
                  <div className="text-[10px] font-medium mb-1.5" style={{ color: bowl.color, fontFamily: "DM Sans, sans-serif" }}>
                    {bowl.subtitle}
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>
                    {bowl.description}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* ── Duration selector ────────────────────────────────────────── */}
          {!isPlaying && (
            <div className="flex gap-2">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.minutes}
                  onClick={() => { setSessionMinutes(opt.minutes); setElapsed(0); }}
                  className="flex-1 py-3 rounded-2xl text-center transition-all duration-200"
                  style={{
                    background: sessionMinutes === opt.minutes
                      ? `${bowlAccent}15`
                      : (isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)"),
                    border: `1px solid ${sessionMinutes === opt.minutes ? `${bowlAccent}40` : cardBorder}`,
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  <div className="text-base font-bold" style={{ color: sessionMinutes === opt.minutes ? bowlAccent : textPrimary }}>
                    {opt.label}
                  </div>
                  <div className="text-[10px]" style={{ color: textMuted }}>{opt.sublabel}</div>
                </button>
              ))}
            </div>
          )}

          {/* ── Visualizer + Play ────────────────────────────────────────── */}
          <div
            className="rounded-3xl flex flex-col items-center py-8 px-4 relative overflow-hidden"
            style={{
              background: cardBg,
              border: `1px solid ${isPlaying ? `${phaseAccent}30` : cardBorder}`,
              boxShadow: isPlaying ? `0 0 60px ${phaseAccent}08, 0 0 120px ${phaseAccent}04` : "none",
              transition: "border-color 1s ease, box-shadow 1s ease",
            }}
          >
            {/* Phase name badge */}
            {isPlaying && currentPhase && (
              <div
                className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest transition-all duration-1000"
                style={{
                  background: `${phaseAccent}15`,
                  border: `1px solid ${phaseAccent}35`,
                  color: phaseAccent,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {currentPhase.label}
              </div>
            )}

            {/* Visualizer */}
            <div className="relative w-full max-w-[320px]">
              <ReikiVisualizer
                isPlaying={isPlaying}
                freqActive={isPlaying && freqEnabled}
                currentPhaseId={currentPhaseId}
                bowlType={bowlType}
              />
              {/* Play button overlay */}
              <button
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                  style={{
                    background: isPlaying
                      ? `linear-gradient(135deg, ${bowlAccent}, ${bowlAccent}99)`
                      : "rgba(255,255,255,0.06)",
                    border: `2px solid ${isPlaying ? bowlAccent : "rgba(255,255,255,0.12)"}`,
                    boxShadow: isPlaying ? `0 0 30px ${bowlAccent}50` : "none",
                    color: isPlaying ? "#0A0B14" : textPrimary,
                  }}
                >
                  {isPlaying
                    ? <Pause size={24} fill="currentColor" />
                    : <Play size={24} fill="currentColor" />}
                </div>
              </button>
            </div>

            {/* Time display */}
            <div className="w-full mt-4 px-2">
              <div className="flex justify-between text-xs mb-2" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>
                <span>{formatTime(elapsed)}</span>
                <span className="font-semibold" style={{ color: isPlaying ? phaseAccent : textMuted }}>
                  {isPlaying ? `${formatTime(remaining)} remaining` : `${sessionMinutes} min session`}
                </span>
                <span>{formatTime(totalSeconds)}</span>
              </div>

              {/* Phase timeline progress */}
              <PhaseTimeline
                phases={SESSION_PHASES}
                currentPhaseId={currentPhaseId}
                progress={progress}
                isLight={isLight}
              />
            </div>
          </div>

          {/* ── Live guidance cue ────────────────────────────────────────── */}
          {isPlaying && currentGuidanceCue && (
            <div
              className="rounded-2xl p-5 text-center transition-all duration-1000"
              style={{
                background: `${phaseAccent}08`,
                border: `1px solid ${phaseAccent}25`,
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: phaseAccent }} />
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: phaseAccent, fontFamily: "DM Sans, sans-serif" }}>
                  {currentPhase?.label}
                </span>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: phaseAccent }} />
              </div>
              <p
                className="italic leading-relaxed transition-all duration-1000"
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontSize: "1.1rem",
                  color: isLight ? "#2D3748" : "#C8D8E8",
                }}
              >
                "{currentGuidanceCue}"
              </p>
            </div>
          )}

          {/* ── Frequency layer controls ─────────────────────────────────── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <button
              onClick={() => setShowFreqDetails(v => !v)}
              className="flex items-center gap-2 w-full px-5 py-4"
            >
              <Radio size={14} style={{ color: bowlAccent }} />
              <span className="text-sm font-semibold flex-1 text-left" style={{ color: textPrimary, fontFamily: "DM Sans, sans-serif" }}>
                DDS Frequency Layers
              </span>
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold mr-2"
                style={{ background: `${bowlAccent}15`, color: bowlAccent, fontFamily: "DM Sans, sans-serif" }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: freqEnabled ? bowlAccent : textMuted }} />
                {freqEnabled ? "Active" : "Off"}
              </div>
              {showFreqDetails
                ? <ChevronUp size={14} style={{ color: textMuted }} />
                : <ChevronDown size={14} style={{ color: textMuted }} />}
            </button>

            {showFreqDetails && (
              <div style={{ borderTop: `1px solid ${cardBorder}` }} className="px-5 pb-5 pt-4 space-y-4">
                {/* Enable toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: textPrimary, fontFamily: "DM Sans, sans-serif" }}>
                      Enable DDS anchor
                    </div>
                    <div className="text-xs" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>
                      Enters at ~2:30, fades 90s before end
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (isPlaying) {
                        if (freqEnabled) stopFrequency();
                        else startFrequency(0);
                      }
                      setFreqEnabled(v => !v);
                    }}
                    className="w-10 h-6 rounded-full transition-all duration-200 relative"
                    style={{ background: freqEnabled ? bowlAccent : (isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)") }}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
                      style={{
                        background: "#fff",
                        left: freqEnabled ? "calc(100% - 1.375rem)" : "0.125rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      }}
                    />
                  </button>
                </div>

                {/* Volume slider */}
                {freqEnabled && (
                  <div>
                    <div className="text-xs font-medium mb-2" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}>
                      Frequency blend level
                    </div>
                    <div className="flex items-center gap-3">
                      <VolumeX size={12} style={{ color: textMuted }} />
                      <Slider
                        value={[freqVolume * 100]}
                        onValueChange={([v]) => setFreqVolume(v / 100)}
                        min={0} max={60} step={1}
                        className="flex-1"
                      />
                      <Volume2 size={12} style={{ color: textMuted }} />
                      <span className="text-xs w-8 text-right" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>
                        {Math.round(freqVolume * 100)}%
                      </span>
                    </div>
                    <p className="text-[11px] mt-2" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>
                      Keep below 30% — the DDS tone is a subliminal anchor, not the dominant sound.
                    </p>
                  </div>
                )}

                {/* Layer breakdown */}
                <div className="space-y-2">
                  {[
                    { hz: 216, label: "Warm supporting presence", vol: "55%", color: "#F59E0B" },
                    { hz: 432, label: "Principal anchor", vol: "100%", color: bowlAccent },
                    { hz: 864, label: "Clarity & radiance (trace)", vol: "12%", color: "#8B5CF6" },
                  ].map(layer => (
                    <div key={layer.hz} className="flex items-center gap-3">
                      <div
                        className="w-12 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${layer.color}15`, border: `1px solid ${layer.color}30` }}
                      >
                        <span className="text-[10px] font-bold" style={{ color: layer.color, fontFamily: "DM Sans, sans-serif" }}>
                          {layer.hz}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}>
                          {layer.label}
                        </div>
                      </div>
                      <span className="text-[10px]" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>
                        {layer.vol}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Ambient volume ───────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-4"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} style={{ color: bowlAccent }} />
              <span className="text-sm font-semibold" style={{ color: textPrimary, fontFamily: "DM Sans, sans-serif" }}>
                {bowlType === "crystal" ? "Crystal Bowl" : "Tibetan Bowl"} Volume
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
              <span className="text-xs w-8 text-right" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>
                {Math.round(ambientVolume * 100)}%
              </span>
            </div>
          </div>

          {/* ── Session phase guide (collapsible) ────────────────────────── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <button
              onClick={() => setShowGuidance(g => !g)}
              className="flex items-center gap-2 w-full px-5 py-4"
            >
              <Timer size={14} style={{ color: bowlAccent }} />
              <span className="text-sm font-semibold flex-1 text-left" style={{ color: textPrimary, fontFamily: "DM Sans, sans-serif" }}>
                Session Structure
              </span>
              {showGuidance
                ? <ChevronUp size={14} style={{ color: textMuted }} />
                : <ChevronDown size={14} style={{ color: textMuted }} />}
            </button>

            {showGuidance && (
              <div style={{ borderTop: `1px solid ${cardBorder}` }}>
                {SESSION_PHASES.map((phase, i) => {
                  const isActive = phase.id === currentPhaseId && isPlaying;
                  const isDone = currentPhaseId !== null && isPlaying &&
                    SESSION_PHASES.findIndex(p => p.id === currentPhaseId) >
                    SESSION_PHASES.findIndex(p => p.id === phase.id);
                  const phaseDurationMin = (phase.fraction * sessionMinutes).toFixed(0);
                  return (
                    <div
                      key={phase.id}
                      className="px-5 py-4 flex gap-4 transition-all duration-700"
                      style={{
                        background: isActive ? `${phase.color}08` : "transparent",
                        borderBottom: i < SESSION_PHASES.length - 1 ? `1px solid ${cardBorder}` : "none",
                        opacity: isDone ? 0.45 : 1,
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 transition-all duration-700"
                        style={{
                          background: isActive ? phase.color : isDone ? (isLight ? "#C5CAD6" : "#2A3040") : `${phase.color}50`,
                          boxShadow: isActive ? `0 0 8px ${phase.color}80` : "none",
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold" style={{ color: isActive ? textPrimary : textSecondary, fontFamily: "DM Sans, sans-serif" }}>
                            {phase.label}
                          </span>
                          <span className="text-[10px]" style={{ color: phase.color, fontFamily: "DM Sans, sans-serif" }}>
                            ~{phaseDurationMin} min
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>
                          {phase.guidance[0]}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Technology note ──────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-4 flex gap-3"
            style={{
              background: isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${cardBorder}`,
            }}
          >
            <Radio size={14} className="flex-shrink-0 mt-0.5" style={{ color: bowlAccent }} />
            <p className="text-xs leading-relaxed" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>
              The 432Hz anchor is synthesized in real-time by the{" "}
              <span style={{ color: bowlAccent }}>DDS AudioWorklet engine</span> using double-precision
              phase accumulation — the same technology used in professional signal generators.
              A tri-layer system (216Hz · 432Hz · 864Hz) creates depth without clinical harshness.
              The tone enters at ~2:30 and fades before the final silence, per therapeutic best practice.
            </p>
          </div>

        </div>
      </div>
    </Layout>
  );
}
