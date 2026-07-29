/**
 * Frequency Prescription — AI-style intake quiz
 *
 * 4 questions → maps to a specific DDS session configuration → launches
 * Frequency Studio pre-configured with the recommended frequency, mode,
 * and nature layer.
 *
 * Bioluminescent Depth theme.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight, ChevronLeft, Sparkles, Moon, Zap, Brain, Heart, Waves, Wind, Leaf, Droplets } from "lucide-react";
import Layout from "@/components/Layout";
import { useTheme } from "@/contexts/ThemeContext";
import { trackSessionStart } from "@/hooks/useAnalytics";

// ─── Quiz data ────────────────────────────────────────────────────────────────

interface Option {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

interface Question {
  id: string;
  question: string;
  subtitle: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    id: "feeling",
    question: "How are you feeling right now?",
    subtitle: "Be honest — this shapes your prescription.",
    options: [
      { id: "anxious",   label: "Anxious or stressed",    icon: Wind,     color: "#EF4444" },
      { id: "tired",     label: "Tired or low energy",    icon: Moon,     color: "#8B5CF6" },
      { id: "scattered", label: "Scattered or unfocused", icon: Brain,    color: "#3B82F6" },
      { id: "good",      label: "Good — want to go deeper", icon: Sparkles, color: "#00D4AA" },
    ],
  },
  {
    id: "intention",
    question: "What do you want from this session?",
    subtitle: "Choose the outcome that matters most right now.",
    options: [
      { id: "calm",      label: "Find calm & release tension", icon: Waves,  color: "#00D4AA" },
      { id: "sleep",     label: "Prepare for deep sleep",      icon: Moon,   color: "#8B5CF6" },
      { id: "focus",     label: "Sharpen focus & clarity",     icon: Zap,    color: "#F59E0B" },
      { id: "heal",      label: "Support healing & recovery",  icon: Heart,  color: "#EC4899" },
    ],
  },
  {
    id: "duration",
    question: "How long do you have?",
    subtitle: "We'll match the session length to your schedule.",
    options: [
      { id: "5",  label: "5 minutes",  icon: Zap,  color: "#F59E0B" },
      { id: "15", label: "15 minutes", icon: Leaf,  color: "#10B981" },
      { id: "30", label: "30 minutes", icon: Waves, color: "#00D4AA" },
      { id: "60", label: "60 minutes", icon: Moon,  color: "#8B5CF6" },
    ],
  },
  {
    id: "headphones",
    question: "Are you using headphones?",
    subtitle: "Binaural beats require headphones for full effect.",
    options: [
      { id: "yes",      label: "Yes, headphones",    icon: Sparkles,  color: "#00D4AA" },
      { id: "no",       label: "No, speakers",       icon: Droplets,  color: "#6B7A99" },
    ],
  },
];

// ─── Prescription engine ──────────────────────────────────────────────────────

interface PrescriptionResult {
  hz: number;
  name: string;
  benefit: string;
  mode: "mono" | "binaural" | "isochronic";
  beatHz?: number;
  nature: string;
  color: string;
  rationale: string;
}

function computePrescription(answers: Record<string, string>): PrescriptionResult {
  const { feeling, intention, headphones } = answers;
  const useBinaural = headphones === "yes";

  // Stress / anxiety → 396 Hz Liberation or 528 Hz Repair
  if (feeling === "anxious" || intention === "calm") {
    return {
      hz: 396, name: "Liberation", color: "#EF4444",
      benefit: "Releases guilt, fear, and deeply held tension",
      mode: useBinaural ? "binaural" : "mono",
      beatHz: useBinaural ? 6 : undefined, // Theta 6 Hz beat
      nature: "rain",
      rationale: "396 Hz (Liberation) combined with a 6 Hz Theta binaural beat creates a powerful state for releasing emotional tension and anxiety.",
    };
  }

  // Sleep → 174 Hz Foundation or Delta binaural
  if (feeling === "tired" || intention === "sleep") {
    return {
      hz: useBinaural ? 200 : 174, name: useBinaural ? "Delta Sleep" : "Foundation", color: "#8B5CF6",
      benefit: "Guides the brain into deep, restorative Delta sleep states",
      mode: useBinaural ? "binaural" : "mono",
      beatHz: useBinaural ? 2 : undefined, // Delta 2 Hz beat
      nature: "ocean",
      rationale: "A 2 Hz Delta binaural beat at a 200 Hz carrier frequency mirrors the brain's natural sleep architecture, accelerating the transition to deep sleep.",
    };
  }

  // Focus → 40 Hz Gamma or 528 Hz
  if (feeling === "scattered" || intention === "focus") {
    return {
      hz: useBinaural ? 200 : 528, name: useBinaural ? "Gamma Focus" : "Transformation", color: "#F59E0B",
      benefit: "Enhances concentration, working memory, and cognitive clarity",
      mode: useBinaural ? "binaural" : "mono",
      beatHz: useBinaural ? 40 : undefined, // Gamma 40 Hz beat
      nature: "none",
      rationale: "40 Hz Gamma binaural beats are associated with heightened cognitive processing and are used in focus research. 528 Hz (Transformation) supports mental clarity via mono synthesis.",
    };
  }

  // Healing / spiritual → 528 Hz DNA Repair or 963 Hz Crown
  if (intention === "heal") {
    return {
      hz: 528, name: "Transformation", color: "#EC4899",
      benefit: "DNA repair frequency — promotes cellular healing and emotional transformation",
      mode: useBinaural ? "binaural" : "mono",
      beatHz: useBinaural ? 10 : undefined, // Alpha 10 Hz beat
      nature: "forest",
      rationale: "528 Hz is the most researched Solfeggio frequency, associated with DNA repair and transformation. An Alpha 10 Hz binaural beat promotes relaxed awareness ideal for healing.",
    };
  }

  // Default: 432 Hz Natural Harmony
  return {
    hz: 432, name: "Natural Harmony", color: "#00D4AA",
    benefit: "Aligns with nature's frequency — promotes calm and inner balance",
    mode: "mono",
    nature: "forest",
    rationale: "432 Hz is tuned to the natural harmonic series and is widely used for general wellness, stress reduction, and meditative states.",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Prescription() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PrescriptionResult | null>(null);
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const currentQ = QUESTIONS[questionIndex];
  const isLastQuestion = questionIndex === QUESTIONS.length - 1;

  const handleAnswer = (optionId: string) => {
    const newAnswers = { ...answers, [currentQ.id]: optionId };
    setAnswers(newAnswers);

    if (isLastQuestion) {
      const prescription = computePrescription(newAnswers);
      setResult(prescription);
      trackSessionStart({ frequencyHz: prescription.hz, sessionType: "single", isPremium: false });
    } else {
      setQuestionIndex(i => i + 1);
    }
  };

  const handleLaunchStudio = () => {
    if (!result) return;
    // Encode the prescription into URL params for the Frequency Studio
    const params = new URLSearchParams({
      hz: String(result.hz),
      mode: result.mode,
      ...(result.beatHz ? { beatHz: String(result.beatHz) } : {}),
      nature: result.nature,
      source: "prescription",
    });
    navigate(`/studio?${params.toString()}`);
  };

  const bg = isLight ? "#F5F6F9" : "#0A0B14";
  const card = isLight ? "rgba(255,255,255,0.9)" : "rgba(13,15,30,0.9)";
  const border = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const text = isLight ? "#1A1D2E" : "#E8EDF5";
  const muted = "#6B7A99";

  return (
    <Layout>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: bg }}>
        {/* Header */}
        <div className="text-center mb-8 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-semibold"
            style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.2)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}>
            <Sparkles size={12} />
            Frequency Prescription
          </div>
          <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: "Cormorant Garamond, serif", color: text }}>
            Find your frequency
          </h1>
          <p className="text-sm" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>
            Answer 4 questions and we'll prescribe the exact DDS session for your current state.
          </p>
        </div>

        {/* Quiz card */}
        {!result ? (
          <div className="w-full max-w-md rounded-3xl p-8" style={{ background: card, border: `1px solid ${border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            {/* Progress */}
            <div className="flex gap-1.5 mb-6">
              {QUESTIONS.map((_, i) => (
                <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{ background: i <= questionIndex ? "#00D4AA" : (isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)") }} />
              ))}
            </div>

            <p className="text-xs font-medium mb-1" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>
              Question {questionIndex + 1} of {QUESTIONS.length}
            </p>
            <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: "Cormorant Garamond, serif", color: text }}>
              {currentQ.question}
            </h2>
            <p className="text-sm mb-6" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>
              {currentQ.subtitle}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {currentQ.options.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleAnswer(opt.id)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl text-sm font-medium transition-all duration-200 active:scale-95"
                    style={{
                      background: isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)"}`,
                      color: text,
                      fontFamily: "DM Sans, sans-serif",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.border = `1px solid ${opt.color}50`;
                      (e.currentTarget as HTMLElement).style.background = `${opt.color}10`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.border = `1px solid ${isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)"}`;
                      (e.currentTarget as HTMLElement).style.background = isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.03)";
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${opt.color}15`, border: `1px solid ${opt.color}30` }}>
                      <Icon size={18} style={{ color: opt.color }} />
                    </div>
                    <span className="text-center leading-tight text-xs">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {questionIndex > 0 && (
              <button
                onClick={() => setQuestionIndex(i => i - 1)}
                className="mt-5 flex items-center gap-1 text-xs transition-opacity hover:opacity-100"
                style={{ color: muted, opacity: 0.7, fontFamily: "DM Sans, sans-serif" }}
              >
                <ChevronLeft size={14} />
                Back
              </button>
            )}
          </div>
        ) : (
          /* Result card */
          <div className="w-full max-w-md rounded-3xl p-8" style={{ background: card, border: `1px solid ${border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            <div className="text-center mb-6">
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>
                Your Prescription
              </div>
              <div
                className="w-24 h-24 rounded-full mx-auto flex flex-col items-center justify-center mb-4"
                style={{
                  background: `radial-gradient(circle, ${result.color}30 0%, ${result.color}08 100%)`,
                  border: `2px solid ${result.color}50`,
                  boxShadow: `0 0 40px ${result.color}30`,
                }}
              >
                <span className="text-2xl font-bold font-mono" style={{ color: result.color }}>{result.hz}</span>
                <span className="text-[10px]" style={{ color: result.color }}>Hz</span>
              </div>
              <h2 className="text-2xl font-semibold mb-1" style={{ fontFamily: "Cormorant Garamond, serif", color: text }}>
                {result.name}
              </h2>
              <p className="text-sm mb-4" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>
                {result.benefit}
              </p>
            </div>

            {/* Session details */}
            <div className="rounded-2xl p-4 mb-5 space-y-2" style={{ background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)", border: `1px solid ${border}` }}>
              <div className="flex justify-between text-xs" style={{ fontFamily: "DM Sans, sans-serif" }}>
                <span style={{ color: muted }}>Frequency</span>
                <span style={{ color: result.color, fontWeight: 600 }}>{result.hz} Hz</span>
              </div>
              <div className="flex justify-between text-xs" style={{ fontFamily: "DM Sans, sans-serif" }}>
                <span style={{ color: muted }}>Mode</span>
                <span style={{ color: text, fontWeight: 600 }}>{result.mode === "binaural" ? `Binaural · ${result.beatHz} Hz beat` : result.mode === "isochronic" ? "Isochronic" : "Mono"}</span>
              </div>
              {result.nature !== "none" && (
                <div className="flex justify-between text-xs" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  <span style={{ color: muted }}>Nature layer</span>
                  <span style={{ color: text, fontWeight: 600, textTransform: "capitalize" }}>{result.nature}</span>
                </div>
              )}
            </div>

            {/* Rationale */}
            <p className="text-xs leading-relaxed mb-6 italic" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>
              "{result.rationale}"
            </p>

            <button
              onClick={handleLaunchStudio}
              className="btn-teal w-full py-4 text-base font-semibold flex items-center justify-center gap-2 mb-3"
            >
              <Sparkles size={18} />
              Launch My Session
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => { setResult(null); setAnswers({}); setQuestionIndex(0); }}
              className="w-full py-2 text-xs transition-opacity hover:opacity-100"
              style={{ color: muted, opacity: 0.7, fontFamily: "DM Sans, sans-serif" }}
            >
              Retake the quiz
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
