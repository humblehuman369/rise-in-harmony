/**
 * ChakraSequence — 7-Chakra Guided Morning Sequence
 * Timed progression through Root → Sacral → Solar → Heart → Throat → Third Eye → Crown
 * Each chakra plays for a configurable duration with smooth crossfade transitions
 * Bioluminescent Depth theme
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipForward, X, Zap } from "lucide-react";
import { useFrequencyPlayer, FREQUENCIES, type Frequency } from "@/hooks/useFrequencyPlayer";
import { toast } from "sonner";

interface ChakraStep {
  name: string;
  sanskrit: string;
  hz: number;
  frequencyId: string;
  color: string;
  glowColor: string;
  element: string;
  affirmation: string;
  durationSeconds: number;
}

const CHAKRA_STEPS: ChakraStep[] = [
  {
    name: "Root",
    sanskrit: "Mūlādhāra",
    hz: 396,
    frequencyId: "396hz",
    color: "#EF4444",
    glowColor: "#EF444480",
    element: "Earth",
    affirmation: "I am grounded. I am safe. I belong.",
    durationSeconds: 60,
  },
  {
    name: "Sacral",
    sanskrit: "Svādhiṣṭhāna",
    hz: 417,
    frequencyId: "417hz",
    color: "#F97316",
    glowColor: "#F9731680",
    element: "Water",
    affirmation: "I flow with creativity and joy.",
    durationSeconds: 60,
  },
  {
    name: "Solar Plexus",
    sanskrit: "Maṇipūra",
    hz: 528,
    frequencyId: "528hz",
    color: "#EAB308",
    glowColor: "#EAB30880",
    element: "Fire",
    affirmation: "I am confident. I am powerful.",
    durationSeconds: 60,
  },
  {
    name: "Heart",
    sanskrit: "Anāhata",
    hz: 432,
    frequencyId: "432hz",
    color: "#00D4AA",
    glowColor: "#00D4AA80",
    element: "Air",
    affirmation: "I give and receive love freely.",
    durationSeconds: 60,
  },
  {
    name: "Throat",
    sanskrit: "Viśuddha",
    hz: 639,
    frequencyId: "639hz",
    color: "#3B82F6",
    glowColor: "#3B82F680",
    element: "Sound",
    affirmation: "I speak my truth with clarity.",
    durationSeconds: 60,
  },
  {
    name: "Third Eye",
    sanskrit: "Ājñā",
    hz: 741,
    frequencyId: "741hz",
    color: "#8B5CF6",
    glowColor: "#8B5CF680",
    element: "Light",
    affirmation: "I trust my intuition and inner wisdom.",
    durationSeconds: 60,
  },
  {
    name: "Crown",
    sanskrit: "Sahasrāra",
    hz: 963,
    frequencyId: "963hz",
    color: "#EC4899",
    glowColor: "#EC489980",
    element: "Thought",
    affirmation: "I am connected to divine consciousness.",
    durationSeconds: 60,
  },
];

// Duration options in seconds
const DURATION_OPTIONS = [
  { label: "1 min", value: 60 },
  { label: "3 min", value: 180 },
  { label: "5 min", value: 300 },
];

function ChakraDot({ step, index, isActive, isCompleted, onClick }: {
  step: ChakraStep;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group transition-all duration-300"
      title={`${step.name} — ${step.hz}Hz`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 relative"
        style={{
          background: isActive
            ? step.color
            : isCompleted
            ? `${step.color}40`
            : "rgba(255,255,255,0.06)",
          border: `2px solid ${isActive ? step.color : isCompleted ? `${step.color}60` : "rgba(255,255,255,0.1)"}`,
          boxShadow: isActive ? `0 0 16px ${step.glowColor}` : "none",
        }}
      >
        {isCompleted && !isActive && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke={step.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isActive && (
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: `${step.color}30` }}
          />
        )}
      </div>
      <span
        className="text-[9px] font-semibold uppercase tracking-wide transition-colors duration-300"
        style={{
          color: isActive ? step.color : isCompleted ? `${step.color}80` : "#4A5568",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {step.name}
      </span>
    </button>
  );
}

function CircularProgress({ progress, color, size = 160 }: { progress: number; color: string; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="absolute inset-0 m-auto" style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
      />
    </svg>
  );
}

interface ChakraSequenceProps {
  onClose: () => void;
}

export default function ChakraSequence({ onClose }: ChakraSequenceProps) {
  const { playFrequency, stopAudio, isPlaying, currentFrequency } = useFrequencyPlayer();
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [stepDuration, setStepDuration] = useState(60);
  const [showDurationPicker, setShowDurationPicker] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(currentStep);
  stepRef.current = currentStep;

  const chakra = CHAKRA_STEPS[currentStep];
  const progress = elapsed / stepDuration;

  // Find the matching frequency from the FREQUENCIES array
  const getFreqForChakra = useCallback((step: ChakraStep): Frequency => {
    return FREQUENCIES.find(f => f.id === step.frequencyId) || FREQUENCIES[4]; // fallback to 432hz
  }, []);

  const advanceStep = useCallback(() => {
    const next = stepRef.current + 1;
    if (next >= CHAKRA_STEPS.length) {
      // Sequence complete
      stopAudio(true);
      setIsRunning(false);
      setIsComplete(true);
      if (timerRef.current) clearInterval(timerRef.current);
      toast("✦ Chakra sequence complete — your energy is aligned");
      return;
    }
    setCompletedSteps(prev => [...prev, stepRef.current]);
    setCurrentStep(next);
    setElapsed(0);
    playFrequency(getFreqForChakra(CHAKRA_STEPS[next]));
  }, [playFrequency, stopAudio, getFreqForChakra]);

  const startSequence = useCallback(() => {
    setShowDurationPicker(false);
    setIsRunning(true);
    setCurrentStep(0);
    setElapsed(0);
    setCompletedSteps([]);
    setIsComplete(false);
    playFrequency(getFreqForChakra(CHAKRA_STEPS[0]));
  }, [playFrequency, getFreqForChakra]);

  const togglePause = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
      stopAudio(false);
    } else {
      setIsRunning(true);
      playFrequency(getFreqForChakra(CHAKRA_STEPS[currentStep]));
    }
  }, [isRunning, currentStep, playFrequency, stopAudio, getFreqForChakra]);

  const skipStep = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    advanceStep();
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          if (e + 1 >= stepDuration) {
            advanceStep();
            return 0;
          }
          return e + 1;
        });
      }, 1000);
    }
  }, [advanceStep, isRunning, stepDuration]);

  const jumpToStep = useCallback((index: number) => {
    if (!isRunning) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setCompletedSteps(prev => [...prev, ...Array.from({ length: index }, (_, i) => i).filter(i => !prev.includes(i))]);
    setCurrentStep(index);
    setElapsed(0);
    playFrequency(getFreqForChakra(CHAKRA_STEPS[index]));
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= stepDuration) {
          advanceStep();
          return 0;
        }
        return e + 1;
      });
    }, 1000);
  }, [isRunning, playFrequency, getFreqForChakra, advanceStep, stepDuration]);

  // Timer effect
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= stepDuration) {
          advanceStep();
          return 0;
        }
        return e + 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, stepDuration, advanceStep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAudio(false);
    };
  }, [stopAudio]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const remainingSeconds = stepDuration - elapsed;
  const totalElapsed = completedSteps.length * stepDuration + elapsed;
  const totalDuration = CHAKRA_STEPS.length * stepDuration;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
    >
      <div
        className="w-full max-w-lg rounded-3xl overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, #0D0F1E 0%, #12152A 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: `0 0 80px ${chakra.glowColor}30, 0 24px 80px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Ambient glow bg */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${chakra.color}12 0%, transparent 60%)`,
          }}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Zap size={16} style={{ color: chakra.color }} />
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}
            >
              7-Chakra Morning Sequence
            </span>
          </div>
          <button
            onClick={() => { stopAudio(true); onClose(); }}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
            style={{ background: "rgba(255,255,255,0.06)", color: "#6B7A99" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Duration picker */}
        {showDurationPicker && (
          <div className="relative px-6 pb-8">
            <h2
              className="text-2xl font-semibold mb-2"
              style={{ fontFamily: "Cormorant Garamond, serif", color: "#E8EDF5" }}
            >
              Align your chakras
            </h2>
            <p className="text-sm mb-6" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
              A guided 7-step journey from Root to Crown. Choose how long to spend at each energy center.
            </p>

            {/* Chakra preview dots */}
            <div className="flex justify-between mb-8 px-2">
              {CHAKRA_STEPS.map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-7 h-7 rounded-full"
                    style={{ background: `${step.color}25`, border: `2px solid ${step.color}50` }}
                  />
                  <span className="text-[9px]" style={{ color: step.color, fontFamily: "DM Sans, sans-serif" }}>
                    {step.hz}
                  </span>
                </div>
              ))}
            </div>

            <label
              className="block text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}
            >
              Time per chakra
            </label>
            <div className="flex gap-2 mb-6">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStepDuration(opt.value)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    background: stepDuration === opt.value ? "rgba(0,212,170,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${stepDuration === opt.value ? "rgba(0,212,170,0.4)" : "rgba(255,255,255,0.06)"}`,
                    color: stepDuration === opt.value ? "#00D4AA" : "#6B7A99",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div
              className="text-xs text-center mb-6"
              style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}
            >
              Total session: {formatTime(CHAKRA_STEPS.length * stepDuration)}
            </div>

            <button
              onClick={startSequence}
              className="btn-teal w-full py-4 text-base font-semibold flex items-center justify-center gap-2"
            >
              <Play size={18} fill="currentColor" />
              Begin Chakra Journey
            </button>
          </div>
        )}

        {/* Active sequence */}
        {!showDurationPicker && !isComplete && (
          <div className="relative px-6 pb-6">
            {/* Chakra dots nav */}
            <div className="flex justify-between mb-6 px-1">
              {CHAKRA_STEPS.map((step, i) => (
                <ChakraDot
                  key={i}
                  step={step}
                  index={i}
                  isActive={i === currentStep}
                  isCompleted={completedSteps.includes(i)}
                  onClick={() => jumpToStep(i)}
                />
              ))}
            </div>

            {/* Main display */}
            <div className="flex flex-col items-center mb-6">
              {/* Circular timer */}
              <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                <CircularProgress progress={progress} color={chakra.color} size={160} />
                {/* Glow orb */}
                <div
                  className="w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-1000"
                  style={{
                    background: `radial-gradient(circle, ${chakra.color}30 0%, ${chakra.color}08 100%)`,
                    border: `1px solid ${chakra.color}30`,
                    boxShadow: `0 0 30px ${chakra.glowColor}`,
                  }}
                >
                  <span
                    className="font-mono-brand text-xl font-bold"
                    style={{ color: chakra.color }}
                  >
                    {formatTime(remainingSeconds)}
                  </span>
                </div>
              </div>

              {/* Chakra info */}
              <div className="text-center">
                <div
                  className="text-2xl font-semibold mb-0.5"
                  style={{ fontFamily: "Cormorant Garamond, serif", color: "#E8EDF5" }}
                >
                  {chakra.name} Chakra
                </div>
                <div
                  className="text-sm mb-1"
                  style={{ color: chakra.color, fontFamily: "DM Sans, sans-serif" }}
                >
                  {chakra.sanskrit} · {chakra.hz}Hz · {chakra.element}
                </div>
                <div
                  className="text-sm italic px-4"
                  style={{ color: "#6B7A99", fontFamily: "Cormorant Garamond, serif", fontSize: "1rem" }}
                >
                  "{chakra.affirmation}"
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-5">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
                <span>{completedSteps.length + 1} of 7 chakras</span>
                <span>{formatTime(totalElapsed)} / {formatTime(totalDuration)}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${(totalElapsed / totalDuration) * 100}%`,
                    background: `linear-gradient(90deg, #EF4444, #F97316, #EAB308, #00D4AA, #3B82F6, #8B5CF6, #EC4899)`,
                  }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={togglePause}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: `linear-gradient(135deg, ${chakra.color}, ${chakra.color}CC)`,
                  boxShadow: `0 0 24px ${chakra.glowColor}`,
                  color: "#0A0B14",
                }}
              >
                {isRunning ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" style={{ marginLeft: "2px" }} />}
              </button>
              <button
                onClick={skipStep}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.06)", color: "#6B7A99" }}
                title="Skip to next chakra"
              >
                <SkipForward size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Completion screen */}
        {isComplete && (
          <div className="relative px-6 pb-8 text-center">
            <div className="mb-4">
              <div
                className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg, #EF4444, #F97316, #EAB308, #00D4AA, #3B82F6, #8B5CF6, #EC4899)",
                  boxShadow: "0 0 40px rgba(139,92,246,0.4)",
                }}
              >
                <span style={{ fontSize: "2rem" }}>✦</span>
              </div>
              <h2
                className="text-2xl font-semibold mb-2"
                style={{ fontFamily: "Cormorant Garamond, serif", color: "#E8EDF5" }}
              >
                All 7 Chakras Aligned
              </h2>
              <p className="text-sm" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                Your energy centers are balanced and activated. Carry this harmony into your day.
              </p>
            </div>

            {/* Completed chakras summary */}
            <div className="flex justify-center gap-2 mb-6">
              {CHAKRA_STEPS.map((step, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: `${step.color}25`, border: `2px solid ${step.color}` }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke={step.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDurationPicker(true); setIsComplete(false); setCompletedSteps([]); setCurrentStep(0); setElapsed(0); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.06)", color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}
              >
                Repeat
              </button>
              <button
                onClick={onClose}
                className="btn-teal flex-1 py-3 text-sm font-semibold"
              >
                Complete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
