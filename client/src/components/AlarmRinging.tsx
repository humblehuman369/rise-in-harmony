/**
 * AlarmRinging — Enhanced full-screen wake experience
 *
 * FIXES (Aug 2026):
 *   - Stage timing now relative to fadeInMinutes so Persistent stage always fires
 *   - Volume escalation runs indefinitely (no totalMs cutoff) — alarm stays loud until dismissed
 *   - Wake Lock API prevents screen/tab from sleeping while alarm is active
 *   - STAGE_VOLUMES[3] raised to 1.0 — maximum volume reached at Persistent stage
 *   - Persistent stage pulses at 1.0 to ensure alarm cannot be missed
 *   - Audio context resumed on each tick to recover from browser suspension
 *
 * Original features:
 *   - 4-stage progressive volume escalation (Whisper → Rise → Full → Persistent)
 *   - Sleep Profile: Light / Normal / Heavy / Very Heavy (controls stage timing)
 *   - Sunrise simulation: screen brightness + amber→white colour temperature shift
 *   - Alarm Mission: user must complete a task to dismiss (breathing round, gratitude)
 *   - Smart snooze display: shows count remaining, escalates message
 *   - Delta→Theta→Alpha frequency sweep support (handled by parent via sound prop)
 *
 * Bioluminescent Depth theme
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { AlarmClock, BellOff, Moon, Wind, Heart, ChevronRight } from "lucide-react";
import { FREQUENCIES, useFrequencyPlayer, type Frequency } from "@/hooks/useFrequencyPlayer";
import { usePrecisionPlayer, type PrecisionSession } from "@/hooks/usePrecisionPlayer";
import { useBackgroundLayer } from "@/hooks/useBackgroundLayer";
import { useSoundStudio, type NatureSound, type MusicMode } from "@/hooks/useSoundStudio";
import type { BackgroundType } from "@/data/backgroundLoops";

export interface RingingSound {
  type: "frequency" | "user_sound" | "studio_mix";
  frequencyId?: string;
  userSound?: {
    name: string;
    freqL: number;
    beatHz: number | null;
    isoRate: number | null;
    isoDuty: number | null;
    waveform: string;
    mode: string;
    toneVolume: number;
    backgroundType: string;
    backgroundKey: string | null;
    backgroundVolume: number;
  };
  studioMix?: {
    name: string;
    frequencyHz: number;
    musicMode: string;
    natureSound: string;
    frequencyVolume: number;
    musicVolume: number;
    natureVolume: number;
  };
}

export type SleepProfile = "light" | "normal" | "heavy" | "very_heavy";

interface AlarmRingingProps {
  label: string;
  soundName: string;
  sound: RingingSound;
  fadeInMinutes: number;
  sleepProfile?: SleepProfile;
  snoozeCount?: number;
  maxSnoozes?: number;
  sequenceId?: string;
  onStop: () => void;
  onSnooze?: () => void;
  missionEnabled?: boolean;
}

// ─── Stage timing: fractions of fadeInMinutes for each stage boundary ─────────
// e.g. for normal profile: stage1 ends at 20% of fadeIn, stage2 at 50%, stage3 at 80%
// After stage3, Persistent runs indefinitely at full volume until dismissed.
const STAGE_FRACTIONS: Record<SleepProfile, [number, number, number]> = {
  light:     [0.25, 0.55, 0.80],  // gentler escalation
  normal:    [0.20, 0.50, 0.80],  // standard
  heavy:     [0.12, 0.35, 0.65],  // faster escalation — heavy sleepers need it sooner
  very_heavy:[0.08, 0.25, 0.50],  // very fast — almost no whisper, quick to full
};

// ─── Stage volume targets ────────────────────────────────────────────────────
// Stage 0 (Whisper): 5%→22%, Stage 1 (Rise): 22%→65%, Stage 2 (Full): 65%→100%
// Stage 3 (Persistent): stays at 100% — alarm will NOT stop until dismissed
const STAGE_VOLUMES = [0.05, 0.22, 0.65, 1.0, 1.0] as const;

// ─── Alarm Mission types ─────────────────────────────────────────────────────
type MissionType = "breathing" | "gratitude" | "frequency_tap";

interface Mission {
  type: MissionType;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
}

const MISSIONS: Mission[] = [
  {
    type: "breathing",
    label: "Breathing Round",
    description: "Complete one 4-7-8 breath cycle",
    icon: Wind,
    color: "#00D4AA",
  },
  {
    type: "gratitude",
    label: "Morning Intention",
    description: "Type one word for your day",
    icon: Heart,
    color: "#F59E0B",
  },
  {
    type: "frequency_tap",
    label: "Frequency Recognition",
    description: "Tap the correct healing frequency",
    icon: AlarmClock,
    color: "#8B5CF6",
  },
];

// ─── Breathing Guide sub-component ──────────────────────────────────────────
type BreathPhase = "inhale" | "hold" | "exhale" | "done";

function BreathingMission({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<BreathPhase>("inhale");
  const [countdown, setCountdown] = useState(4);
  const [cycleCount, setCycleCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PHASES: Array<{ phase: BreathPhase; duration: number; label: string; color: string }> = [
    { phase: "inhale",  duration: 4, label: "Inhale",  color: "#00D4AA" },
    { phase: "hold",    duration: 7, label: "Hold",    color: "#8B5CF6" },
    { phase: "exhale",  duration: 8, label: "Exhale",  color: "#F59E0B" },
  ];

  useEffect(() => {
    if (phase === "done") return;
    const current = PHASES.find(p => p.phase === phase)!;
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else {
      // Advance to next phase
      const idx = PHASES.findIndex(p => p.phase === phase);
      const next = PHASES[idx + 1];
      if (next) {
        setPhase(next.phase);
        setCountdown(next.duration);
      } else {
        // Completed one cycle
        const newCount = cycleCount + 1;
        setCycleCount(newCount);
        if (newCount >= 1) {
          setPhase("done");
          setTimeout(onComplete, 800);
        } else {
          setPhase("inhale");
          setCountdown(4);
        }
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, countdown, cycleCount]);

  if (phase === "done") {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">✓</div>
        <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.5rem", color: "#00D4AA" }}>
          Beautifully done
        </div>
      </div>
    );
  }

  const current = PHASES.find(p => p.phase === phase)!;
  const progress = 1 - countdown / current.duration;
  const circumference = 2 * Math.PI * 56;

  return (
    <div className="flex flex-col items-center py-6">
      <div className="relative w-36 h-36 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="64" cy="64" r="56" fill="none"
            stroke={current.color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: "stroke-dashoffset 0.9s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold font-mono-brand" style={{ color: current.color }}>{countdown}</div>
          <div className="text-xs mt-1" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>seconds</div>
        </div>
      </div>
      <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2rem", color: current.color, marginBottom: 4 }}>
        {current.label}
      </div>
      <div className="text-sm" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
        {phase === "inhale" && "Breathe in slowly through your nose"}
        {phase === "hold" && "Hold gently — feel the stillness"}
        {phase === "exhale" && "Release fully through your mouth"}
      </div>
      <div className="flex gap-2 mt-5">
        {PHASES.map(p => (
          <div key={p.phase} className="w-2 h-2 rounded-full transition-all duration-300"
            style={{ background: p.phase === phase ? p.color : "rgba(255,255,255,0.12)" }} />
        ))}
      </div>
    </div>
  );
}

// ─── Gratitude Mission ────────────────────────────────────────────────────────
function GratitudeMission({ onComplete }: { onComplete: () => void }) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const PROMPTS = [
    "What is one thing you're grateful for today?",
    "Name one person who makes your life brighter.",
    "What small joy are you looking forward to today?",
    "What strength in yourself are you grateful for?",
  ];
  const prompt = PROMPTS[new Date().getDay() % PROMPTS.length];

  const handleSubmit = () => {
    if (text.trim().length < 2) return;
    setSubmitted(true);
    setTimeout(onComplete, 1200);
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">🌅</div>
        <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.4rem", color: "#F59E0B" }}>
          Beautiful intention set
        </div>
        <div className="mt-2 text-sm italic" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
          "{text}"
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-4 w-full max-w-xs mx-auto">
      <div className="text-3xl mb-4">🌅</div>
      <div className="text-center text-sm mb-4" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
        {prompt}
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type your answer…"
        rows={2}
        className="w-full px-4 py-3 rounded-2xl text-sm resize-none mb-4"
        style={{
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.25)",
          color: "#E8EDF5",
          fontFamily: "DM Sans, sans-serif",
          outline: "none",
        }}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
      />
      <button
        onClick={handleSubmit}
        disabled={text.trim().length < 2}
        className="w-full py-3 rounded-2xl text-sm font-semibold transition-all duration-200"
        style={{
          background: text.trim().length >= 2 ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${text.trim().length >= 2 ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.08)"}`,
          color: text.trim().length >= 2 ? "#F59E0B" : "#4A5568",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        Set My Intention
      </button>
    </div>
  );
}

// ─── Frequency Tap Mission ────────────────────────────────────────────────────
function FrequencyTapMission({ targetHz, onComplete }: { targetHz: number; onComplete: () => void }) {
  const SOLFEGGIO = [174, 285, 396, 417, 432, 528, 639, 741, 852, 963];
  const [options, setOptions] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    const others = SOLFEGGIO.filter(h => h !== targetHz);
    const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 2);
    const all = [...shuffled, targetHz].sort(() => Math.random() - 0.5);
    setOptions(all);
  }, [targetHz]);

  const handleTap = (hz: number) => {
    if (selected !== null) return;
    setSelected(hz);
    const isCorrect = hz === targetHz;
    setCorrect(isCorrect);
    if (isCorrect) {
      setTimeout(onComplete, 1000);
    } else {
      // Reset after 1.5s to try again
      setTimeout(() => { setSelected(null); setCorrect(null); }, 1500);
    }
  };

  return (
    <div className="flex flex-col items-center py-4 w-full">
      <div className="text-3xl mb-3">🎵</div>
      <div className="text-center text-sm mb-1" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
        Which frequency is playing right now?
      </div>
      <div className="text-xs mb-5" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
        Listen carefully and tap the correct Hz
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        {options.map(hz => {
          const isSelected = selected === hz;
          const isTarget = hz === targetHz;
          let bg = "rgba(139,92,246,0.08)";
          let border = "rgba(139,92,246,0.2)";
          let color = "#8FA3BF";
          if (isSelected) {
            if (isTarget) { bg = "rgba(0,212,170,0.2)"; border = "#00D4AA"; color = "#00D4AA"; }
            else { bg = "rgba(239,68,68,0.15)"; border = "#EF4444"; color = "#EF4444"; }
          }
          return (
            <button key={hz} onClick={() => handleTap(hz)}
              className="flex-1 py-4 rounded-2xl text-center transition-all duration-200"
              style={{ background: bg, border: `1.5px solid ${border}`, color, fontFamily: "DM Mono, monospace", fontSize: "1.1rem", fontWeight: 700 }}>
              {hz}
              <div className="text-[10px] mt-0.5" style={{ color: "inherit", opacity: 0.6, fontFamily: "DM Sans, sans-serif" }}>Hz</div>
            </button>
          );
        })}
      </div>
      {correct === false && (
        <div className="mt-3 text-xs" style={{ color: "#EF4444", fontFamily: "DM Sans, sans-serif" }}>
          Not quite — listen again and try once more
        </div>
      )}
    </div>
  );
}

// ─── Main AlarmRinging component ──────────────────────────────────────────────
const FALLBACK_FREQ = FREQUENCIES.find(f => f.id === "432") ?? FREQUENCIES[0];

export default function AlarmRinging({
  label,
  soundName,
  sound,
  fadeInMinutes,
  sleepProfile = "normal",
  snoozeCount = 0,
  maxSnoozes = 2,
  sequenceId,
  onStop,
  onSnooze,
  missionEnabled = true,
}: AlarmRingingProps) {
  const freqPlayer = useFrequencyPlayer();
  const precision = usePrecisionPlayer();
  const background = useBackgroundLayer(() => precision.getAudioContext());
  const studio = useSoundStudio();

  // ── Stage escalation state ────────────────────────────────────────────────
  const [stage, setStage] = useState(0); // 0=Whisper 1=Rise 2=Full 3=Persistent
  const [volumePct, setVolumePct] = useState(0);
  const startedRef = useRef(false);
  const enginesRef = useRef({ freqPlayer, precision, background, studio });
  enginesRef.current = { freqPlayer, precision, background, studio };

  // ── Sunrise simulation state ──────────────────────────────────────────────
  const [sunriseProgress, setSunriseProgress] = useState(0); // 0→1

  // ── Deep Sleep Wake brainwave sweep state
  const isDeepSleepWake = sequenceId === "deep-sleep-wake";
  const [brainwavePhase, setBrainwavePhase] = useState<"delta" | "theta" | "alpha">("delta");
  const CARRIER_HZ = 200; // binaural carrier for Deep Sleep Wake

  // ── Mission state ─────────────────────────────────────────────────────────
  const [showMission, setShowMission] = useState(false);
  const [missionType, setMissionType] = useState<MissionType>("breathing");
  const [missionComplete, setMissionComplete] = useState(false);

  // Pick a mission type based on snooze count
  useEffect(() => {
    const types: MissionType[] = ["breathing", "gratitude", "frequency_tap"];
    setMissionType(types[snoozeCount % types.length]);
  }, [snoozeCount]);

  // ── Stage labels ──────────────────────────────────────────────────────────
  const STAGE_LABELS = ["Whispering…", "Rising gently…", "Full resonance", "Wake up — it's time ✦"];
  const STAGE_COLORS = ["#4A5568", "#00D4AA", "#00D4AA", "#F59E0B"];

  // ── Wake Lock: prevent screen/tab from sleeping while alarm is active ─────
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    // Request Wake Lock to keep the screen on during alarm
    if ("wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then(lock => {
        wakeLockRef.current = lock;
      }).catch(() => {
        // Wake Lock denied (e.g. battery saver) — alarm still plays, just screen may dim
      });
    }
    return () => {
      // Release Wake Lock when alarm is dismissed
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  // Re-acquire Wake Lock if it is released (e.g. tab visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && "wakeLock" in navigator) {
        navigator.wakeLock.request("screen").then(lock => {
          wakeLockRef.current = lock;
        }).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // ── Audio start + escalation engine ──────────────────────────────────────
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Stage boundaries in ms, computed as fractions of fadeInMinutes
    // Minimum fadeIn of 1 minute ensures stages are meaningful
    const fadeMs = Math.max(fadeInMinutes, 1) * 60 * 1000;
    const fractions = STAGE_FRACTIONS[sleepProfile];
    const stage1Ms = fractions[0] * fadeMs;
    const stage2Ms = fractions[1] * fadeMs;
    const stage3Ms = fractions[2] * fadeMs;
    // After stage3Ms, Persistent stage runs indefinitely until dismissed

    const start = async () => {
      const e = enginesRef.current;
      if (sound.type === "frequency" || !sound.type) {
        const freq: Frequency = FREQUENCIES.find(f => f.id === sound.frequencyId) ?? FALLBACK_FREQ;
        e.freqPlayer.setVolume(0.02);
        await e.freqPlayer.playFrequency(freq);
      } else if (sound.type === "user_sound" && sound.userSound) {
        const s = sound.userSound;
        const session: PrecisionSession = {
          freqL: s.freqL,
          waveform: s.waveform as PrecisionSession["waveform"],
          mode: s.mode as PrecisionSession["mode"],
          name: s.name,
          ...(s.beatHz != null ? { beatHz: s.beatHz, freqR: s.freqL + s.beatHz } : {}),
          ...(s.isoRate != null ? { isoRate: s.isoRate } : {}),
          ...(s.isoDuty != null ? { isoDuty: s.isoDuty } : {}),
        };
        e.precision.setVolume(0.02);
        await e.precision.play(session);
        await e.background.startBackground(s.backgroundType as BackgroundType, s.backgroundKey, 0.02);
      } else if (sound.type === "studio_mix" && sound.studioMix) {
        const m = sound.studioMix;
        e.studio.setFrequency(m.frequencyHz);
        e.studio.setMusicMode(m.musicMode as MusicMode);
        e.studio.setNatureSound(m.natureSound as NatureSound);
        e.studio.setLayerVolume("frequency", m.frequencyVolume);
        e.studio.setLayerVolume("music", m.musicVolume);
        e.studio.setLayerVolume("nature", m.natureVolume);
        e.studio.setLayerVolume("master", 0.02);
        e.studio.play();
      }
    };
    void start();

    const stepMs = 500; // tick every 500ms for smoother volume ramps
    const startedAt = Date.now();

    const fadeTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;

      // Determine current stage — Persistent (stage 3) runs indefinitely
      let currentStage = 3; // Persistent — default once past stage3Ms
      if (elapsed < stage1Ms) currentStage = 0;
      else if (elapsed < stage2Ms) currentStage = 1;
      else if (elapsed < stage3Ms) currentStage = 2;

      setStage(currentStage);

      // Compute volume within stage
      let level: number;
      if (currentStage === 0) {
        const stageT = elapsed / stage1Ms;
        level = STAGE_VOLUMES[0] + (STAGE_VOLUMES[1] - STAGE_VOLUMES[0]) * Math.min(1, stageT);
      } else if (currentStage === 1) {
        const stageT = (elapsed - stage1Ms) / (stage2Ms - stage1Ms);
        level = STAGE_VOLUMES[1] + (STAGE_VOLUMES[2] - STAGE_VOLUMES[1]) * Math.min(1, stageT);
      } else if (currentStage === 2) {
        const stageT = (elapsed - stage2Ms) / (stage3Ms - stage2Ms);
        level = STAGE_VOLUMES[2] + (STAGE_VOLUMES[3] - STAGE_VOLUMES[2]) * Math.min(1, stageT);
      } else {
        // Persistent: hold at maximum volume (1.0) indefinitely
        // Add a subtle 2-second pulse between 0.92 and 1.0 to prevent audio normalisation
        const pulseT = (elapsed / 2000) % 1;
        level = 0.92 + 0.08 * Math.abs(Math.sin(pulseT * Math.PI));
      }

      level = Math.max(0.02, Math.min(1.0, level));
      setVolumePct(Math.round(level * 100));

      // Sunrise progress: complete by end of stage2 (Full stage)
      const sunriseT = Math.min(1, elapsed / Math.max(stage3Ms, 1));
      setSunriseProgress(sunriseT);

      const e = enginesRef.current;

      // Resume audio context if it was suspended (browser may suspend on tab hide)
      // This is a best-effort recovery — the DDS engine will continue from where it left off
      try {
        const ctx = (e.freqPlayer as unknown as { _ctx?: AudioContext })._ctx;
        if (ctx && ctx.state === "suspended") {
          void ctx.resume();
        }
      } catch { /* ignore */ }

      if (sound.type === "frequency" || !sound.type) {
        e.freqPlayer.setVolume(level);
      } else if (sound.type === "user_sound") {
        e.precision.setVolume(level * (sound.userSound?.toneVolume ?? 0.7));
        e.background.setBackgroundVolume(level * (sound.userSound?.backgroundVolume ?? 0.35));
      } else if (sound.type === "studio_mix") {
        e.studio.setLayerVolume("master", level);
      }
    }, stepMs);

    // ── Deep Sleep Wake: sweep binaural beat δ→3Hz → θ6Hz → α10Hz over fade period
    let sweepTimer: ReturnType<typeof setInterval> | null = null;
    if (isDeepSleepWake) {
      // Phase boundaries: delta for first 40%, theta for next 35%, alpha for final 25%
      sweepTimer = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const t = Math.min(1, elapsed / fadeMs);
        let beatHz: number;
        let phase: "delta" | "theta" | "alpha";
        if (t < 0.4) {
          beatHz = 3 + t / 0.4;
          phase = "delta";
        } else if (t < 0.75) {
          const tT = (t - 0.4) / 0.35;
          beatHz = 5 + tT * 2;
          phase = "theta";
        } else {
          const tA = (t - 0.75) / 0.25;
          beatHz = 8 + tA * 2;
          phase = "alpha";
        }
        setBrainwavePhase(phase);
        enginesRef.current.freqPlayer.sweepBeat?.(CARRIER_HZ, beatHz);
      }, 5000);
    }

    return () => {
      clearInterval(fadeTimer);
      if (sweepTimer) clearInterval(sweepTimer);
      const e = enginesRef.current;
      e.freqPlayer.stopAudio(true);
      e.precision.stopAudio(true);
      e.background.stopBackground();
      e.studio.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sunrise colour temperature interpolation ──────────────────────────────
  const sunriseR = Math.round(10 + sunriseProgress * 8);
  const sunriseG = Math.round(10 + sunriseProgress * 11);
  const sunriseB = Math.round(20 + sunriseProgress * 0);
  const ambientGlow = `rgba(${sunriseR * 8}, ${sunriseG * 6}, ${sunriseB * 3}, ${0.08 + sunriseProgress * 0.12})`;
  const ringColor = stage >= 3 ? "#F59E0B" : "#00D4AA";

  // ── Snooze label ──────────────────────────────────────────────────────────
  const snoozesLeft = maxSnoozes - snoozeCount;
  const snoozeLabel = snoozesLeft > 0
    ? `Snooze 5 min${snoozesLeft < maxSnoozes ? ` (${snoozesLeft} left)` : ""}`
    : "Last snooze used";

  // ── Mission handler ───────────────────────────────────────────────────────
  const handleStopPress = useCallback(() => {
    if (missionEnabled && !missionComplete) {
      setShowMission(true);
    } else {
      onStop();
    }
  }, [missionEnabled, missionComplete, onStop]);

  const handleMissionComplete = useCallback(() => {
    setMissionComplete(true);
    setShowMission(false);
    setTimeout(onStop, 600);
  }, [onStop]);

  // ── Frequency Hz for mission ──────────────────────────────────────────────
  const targetFreq = FREQUENCIES.find(f => f.id === sound.frequencyId);
  const targetHz = targetFreq?.hz ?? 432;

  // ── Stage indicator dots ──────────────────────────────────────────────────
  const stageNames = ["Whisper", "Rise", "Full", "Persistent"];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 20%, ${ambientGlow} 0%, transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(0,212,170,0.04) 0%, transparent 50%), #0A0B14`,
        transition: "background 2s ease",
      }}
    >
      {/* ── Sunrise overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, rgba(245,158,11,${sunriseProgress * 0.12}) 0%, transparent 60%)`,
          transition: "background 3s ease",
        }}
      />

      {/* ── Pulsing rings (colour shifts with stage) ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="absolute rounded-full border"
            style={{
              width: `${160 + i * 100}px`,
              height: `${160 + i * 100}px`,
              borderColor: `${ringColor}${Math.round((0.18 - i * 0.03) * 255).toString(16).padStart(2, "0")}`,
              animation: `frequency-pulse ${2.2 + i * 0.6}s ease-in-out infinite`,
              animationDelay: `${i * 0.25}s`,
              transition: "border-color 2s ease",
            }}
          />
        ))}
      </div>

      {/* ── Mission overlay ── */}
      {showMission && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6"
          style={{ background: "rgba(10,11,20,0.95)", backdropFilter: "blur(20px)" }}
        >
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
                style={{ background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.2)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}>
                Complete to dismiss
              </div>
              <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.6rem", color: "#E8EDF5" }}>
                Morning Ritual
              </div>
            </div>

            <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {missionType === "breathing" && <BreathingMission onComplete={handleMissionComplete} />}
              {missionType === "gratitude" && <GratitudeMission onComplete={handleMissionComplete} />}
              {missionType === "frequency_tap" && <FrequencyTapMission targetHz={targetHz} onComplete={handleMissionComplete} />}
            </div>

            <button
              onClick={() => setShowMission(false)}
              className="w-full mt-4 py-3 text-sm"
              style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}
            >
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* ── Main wake screen ── */}
      <div className="relative z-10 text-center w-full max-w-sm">

        {/* Stage indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {stageNames.map((name, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className="rounded-full transition-all duration-700"
                style={{
                  width: i === stage ? "24px" : "6px",
                  height: "6px",
                  background: i <= stage ? STAGE_COLORS[i] : "rgba(255,255,255,0.1)",
                }}
              />
              {i < stageNames.length - 1 && (
                <div className="w-3 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              )}
            </div>
          ))}
        </div>

        {/* Clock icon */}
        <AlarmClock
          size={44}
          className="mx-auto mb-5"
          style={{
            color: STAGE_COLORS[stage],
            filter: `drop-shadow(0 0 12px ${STAGE_COLORS[stage]}60)`,
            animation: stage >= 3 ? "frequency-pulse 1s ease-in-out infinite" : "frequency-pulse 2.5s ease-in-out infinite",
          }}
        />

        {/* Label */}
        <div
          className="text-4xl font-semibold mb-2"
          style={{ fontFamily: "Cormorant Garamond, serif", color: "#E8EDF5", textShadow: `0 0 30px ${STAGE_COLORS[stage]}30` }}
        >
          {label}
        </div>

        {/* Sound name */}
        <div className="text-sm mb-1" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
          Waking you with <span style={{ color: STAGE_COLORS[stage] }}>{soundName}</span>
        </div>

        {/* Stage status */}
        <div className="text-xs mb-2" style={{ color: STAGE_COLORS[stage], fontFamily: "DM Sans, sans-serif", opacity: 0.8 }}>
          {STAGE_LABELS[stage]}
        </div>

        {/* Deep Sleep Wake brainwave indicator */}
        {isDeepSleepWake && (
          <div className="flex items-center justify-center gap-2 mb-3">
            {(["delta", "theta", "alpha"] as const).map(p => {
              const colors = { delta: "#8B5CF6", theta: "#00D4AA", alpha: "#F59E0B" };
              const labels = { delta: "δ Delta", theta: "θ Theta", alpha: "α Alpha" };
              const hz = { delta: "3Hz", theta: "6Hz", alpha: "10Hz" };
              const active = brainwavePhase === p;
              return (
                <div key={p} className="flex flex-col items-center px-3 py-1.5 rounded-xl transition-all duration-700"
                  style={{
                    background: active ? `${colors[p]}18` : "transparent",
                    border: `1px solid ${active ? colors[p] + "40" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  <span className="text-[11px] font-semibold" style={{ color: active ? colors[p] : "#4A5568", fontFamily: "DM Sans, sans-serif" }}>{labels[p]}</span>
                  <span className="text-[10px]" style={{ color: active ? colors[p] : "#2D3748", fontFamily: "DM Mono, monospace" }}>{hz[p]}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Volume bar */}
        <div className="mx-auto mb-8 w-48">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px]" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>Volume</span>
            <span className="text-[10px] font-mono" style={{ color: STAGE_COLORS[stage], fontFamily: "DM Sans, sans-serif" }}>{volumePct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${volumePct}%`,
                background: `linear-gradient(to right, #00D4AA, ${STAGE_COLORS[stage]})`,
                boxShadow: `0 0 8px ${STAGE_COLORS[stage]}60`,
              }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          {onSnooze && snoozesLeft > 0 && (
            <button
              onClick={onSnooze}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                background: "rgba(139,92,246,0.12)",
                border: "1px solid rgba(139,92,246,0.3)",
                color: "#C084FC",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              <Moon size={15} />
              {snoozeLabel}
            </button>
          )}
          <button
            onClick={handleStopPress}
            className="flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold transition-all duration-200"
            style={{
              background: missionEnabled && !missionComplete
                ? `rgba(0,212,170,0.15)`
                : `rgba(0,212,170,0.2)`,
              border: `1px solid rgba(0,212,170,0.4)`,
              color: "#00D4AA",
              fontFamily: "DM Sans, sans-serif",
              boxShadow: stage >= 2 ? "0 0 20px rgba(0,212,170,0.2)" : "none",
            }}
          >
            {missionEnabled && !missionComplete ? (
              <><ChevronRight size={15} /> I'm awake</>
            ) : (
              <><BellOff size={15} /> Dismiss</>
            )}
          </button>
        </div>

        {/* Mission hint */}
        {missionEnabled && !missionComplete && (
          <div className="mt-4 text-[11px]" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
            A short morning ritual awaits when you dismiss
          </div>
        )}

        {/* Snooze escalation message */}
        {snoozeCount >= 1 && (
          <div className="mt-3 px-4 py-2 rounded-full inline-block text-[11px]"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B", fontFamily: "DM Sans, sans-serif" }}>
            {snoozeCount === 1 && "Frequency shifted to 174Hz for gentle re-entry"}
            {snoozeCount >= 2 && "⚡ Full volume — time to rise in harmony"}
          </div>
        )}
      </div>
    </div>
  );
}
