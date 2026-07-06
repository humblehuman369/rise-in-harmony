/**
 * OnboardingModal — Personalized first-visit onboarding flow
 * 3-step wizard: Welcome → Goal selection → Recommended frequency
 * Persists completion state in localStorage to show only once
 * Bioluminescent Depth theme
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { X, ChevronRight, Moon, Zap, Brain, Sparkles, Heart, Waves } from "lucide-react";
import { trackOnboardingComplete } from "@/hooks/useAnalytics";

const ONBOARDING_KEY = "rih_onboarding_complete";

interface Goal {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  recommendedFreqId: string;
  recommendedHz: number;
  recommendedName: string;
  recommendedBenefit: string;
}

const GOALS: Goal[] = [
  {
    id: "sleep",
    label: "Better Sleep",
    description: "Fall asleep faster and wake up refreshed",
    icon: Moon,
    color: "#8B5CF6",
    recommendedFreqId: "binaural-theta",
    recommendedHz: 200,
    recommendedName: "Theta Waves",
    recommendedBenefit: "6Hz binaural beat guides your brain into deep, restorative sleep states.",
  },
  {
    id: "stress",
    label: "Reduce Stress",
    description: "Release tension and find inner calm",
    icon: Heart,
    color: "#00D4AA",
    recommendedFreqId: "432hz",
    recommendedHz: 432,
    recommendedName: "Natural Harmony",
    recommendedBenefit: "432Hz aligns with nature's own frequency, dissolving anxiety and promoting deep calm.",
  },
  {
    id: "focus",
    label: "Sharpen Focus",
    description: "Enhance concentration and mental clarity",
    icon: Brain,
    color: "#3B82F6",
    recommendedFreqId: "binaural-alpha",
    recommendedHz: 200,
    recommendedName: "Alpha Waves",
    recommendedBenefit: "10Hz alpha binaural beat puts your brain in the ideal zone for creative flow and focus.",
  },
  {
    id: "morning",
    label: "Energize Mornings",
    description: "Wake up gently and align your energy",
    icon: Zap,
    color: "#F59E0B",
    recommendedFreqId: "528hz",
    recommendedHz: 528,
    recommendedName: "Miracle Tone",
    recommendedBenefit: "528Hz — the Miracle Tone — is the perfect morning frequency for energy and intention.",
  },
  {
    id: "spiritual",
    label: "Spiritual Growth",
    description: "Deepen meditation and expand consciousness",
    icon: Sparkles,
    color: "#EC4899",
    recommendedFreqId: "963hz",
    recommendedHz: 963,
    recommendedName: "Divine Consciousness",
    recommendedBenefit: "963Hz — the highest Solfeggio tone — is traditionally used to connect with higher states of awareness.",
  },
  {
    id: "healing",
    label: "Physical Healing",
    description: "Support your body's natural recovery",
    icon: Waves,
    color: "#EF4444",
    recommendedFreqId: "174hz",
    recommendedHz: 174,
    recommendedName: "Foundation",
    recommendedBenefit: "174Hz is the deepest Solfeggio tone — it reduces pain and promotes cellular healing.",
  },
];

type Step = "welcome" | "goals" | "recommendation";

interface OnboardingModalProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    // Slight delay for entrance animation
    const t = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    // Always fire the analytics event; use 'skipped' when user closes without selecting a goal
    trackOnboardingComplete(selectedGoal?.id ?? "skipped");
    onComplete();
  };

  const handleGoToPlayer = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    if (selectedGoal) trackOnboardingComplete(selectedGoal.id);
    onComplete();
    navigate("/player");
  };

  const handleGoToChakra = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    if (selectedGoal) trackOnboardingComplete(selectedGoal.id);
    onComplete();
    navigate("/player");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(12px)",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden relative"
        style={{
          background: "linear-gradient(160deg, #0D0F1E 0%, #12152A 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 0 80px rgba(0,212,170,0.12), 0 32px 80px rgba(0,0,0,0.7)",
          transform: isVisible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
          transition: "transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% -10%, rgba(0,212,170,0.12) 0%, transparent 60%)",
          }}
        />

        {/* Skip button */}
        <button
          onClick={handleComplete}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
          style={{ background: "rgba(255,255,255,0.06)", color: "#6B7A99" }}
        >
          <X size={14} />
        </button>

        {/* Step indicator */}
        <div className="relative flex justify-center gap-1.5 pt-6 pb-2">
          {(["welcome", "goals", "recommendation"] as Step[]).map((s, i) => (
            <div
              key={s}
              className="h-1 rounded-full transition-all duration-400"
              style={{
                width: step === s ? "24px" : "8px",
                background: step === s ? "#00D4AA" : "rgba(255,255,255,0.12)",
              }}
            />
          ))}
        </div>

        {/* STEP 1: Welcome */}
        {step === "welcome" && (
          <div className="relative px-8 pt-4 pb-8">
            {/* Logo mark */}
            <div className="flex justify-center mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(0,212,170,0.2), rgba(139,92,246,0.2))",
                  border: "1px solid rgba(0,212,170,0.3)",
                  boxShadow: "0 0 30px rgba(0,212,170,0.2)",
                }}
              >
                <span style={{ fontSize: "1.8rem" }}>✦</span>
              </div>
            </div>

            <h2
              className="text-center text-3xl font-semibold mb-3"
              style={{ fontFamily: "Cormorant Garamond, serif", color: "#E8EDF5" }}
            >
              Welcome to<br />
              <span style={{ background: "linear-gradient(135deg, #00D4AA, #8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Rise In Harmony
              </span>
            </h2>

            <p
              className="text-center text-sm leading-relaxed mb-8"
              style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}
            >
              Healing frequencies that replace your jarring alarm — waking you gently and aligning your energy for the day ahead.
            </p>

            {/* Feature highlights */}
            <div className="space-y-3 mb-8">
              {[
                { icon: "🎵", text: "12+ Solfeggio & binaural healing frequencies" },
                { icon: "⏰", text: "Smart alarm clock with gentle frequency fade-in" },
                { icon: "✦", text: "7-Chakra guided morning sequence" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                  <span className="text-sm" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep("goals")}
              className="btn-teal w-full py-4 text-base font-semibold flex items-center justify-center gap-2"
            >
              Get Started
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 2: Goal Selection */}
        {step === "goals" && (
          <div className="relative px-6 pt-4 pb-8">
            <div className="text-center mb-6">
              <h2
                className="text-2xl font-semibold mb-2"
                style={{ fontFamily: "Cormorant Garamond, serif", color: "#E8EDF5" }}
              >
                What brings you here?
              </h2>
              <p className="text-sm" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                We'll recommend your perfect starting frequency.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {GOALS.map(goal => (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal)}
                  className="p-4 rounded-2xl text-left transition-all duration-200 relative overflow-hidden"
                  style={{
                    background: selectedGoal?.id === goal.id ? `${goal.color}15` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedGoal?.id === goal.id ? `${goal.color}50` : "rgba(255,255,255,0.06)"}`,
                    transform: selectedGoal?.id === goal.id ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  {selectedGoal?.id === goal.id && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: `radial-gradient(circle at 30% 30%, ${goal.color}10 0%, transparent 70%)` }}
                    />
                  )}
                  <goal.icon
                    size={20}
                    className="mb-2"
                    style={{ color: selectedGoal?.id === goal.id ? goal.color : "#6B7A99" }}
                  />
                  <div
                    className="text-sm font-semibold mb-0.5"
                    style={{
                      color: selectedGoal?.id === goal.id ? "#E8EDF5" : "#8FA3BF",
                      fontFamily: "DM Sans, sans-serif",
                    }}
                  >
                    {goal.label}
                  </div>
                  <div
                    className="text-[11px] leading-tight"
                    style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}
                  >
                    {goal.description}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => { if (selectedGoal) setStep("recommendation"); }}
              disabled={!selectedGoal}
              className="btn-teal w-full py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              See My Recommendation
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 3: Recommendation */}
        {step === "recommendation" && selectedGoal && (
          <div className="relative px-8 pt-4 pb-8">
            <div className="text-center mb-6">
              <div
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}
              >
                Your personalized frequency
              </div>
              <h2
                className="text-2xl font-semibold mb-1"
                style={{ fontFamily: "Cormorant Garamond, serif", color: "#E8EDF5" }}
              >
                {selectedGoal.label}
              </h2>
            </div>

            {/* Frequency card */}
            <div
              className="rounded-2xl p-6 mb-6 text-center relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${selectedGoal.color}12 0%, rgba(18,21,42,0.8) 100%)`,
                border: `1px solid ${selectedGoal.color}30`,
                boxShadow: `0 0 40px ${selectedGoal.color}15`,
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 50% 0%, ${selectedGoal.color}15 0%, transparent 60%)`,
                }}
              />
              <div className="relative">
                {/* Frequency orb */}
                <div
                  className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4"
                  style={{
                    background: `radial-gradient(circle, ${selectedGoal.color}30 0%, ${selectedGoal.color}08 100%)`,
                    border: `2px solid ${selectedGoal.color}40`,
                    boxShadow: `0 0 30px ${selectedGoal.color}30`,
                  }}
                >
                  <span
                    className="font-mono-brand text-2xl font-bold"
                    style={{ color: selectedGoal.color }}
                  >
                    {selectedGoal.recommendedHz}
                  </span>
                </div>

                <div
                  className="text-xl font-semibold mb-1"
                  style={{ fontFamily: "Cormorant Garamond, serif", color: "#E8EDF5" }}
                >
                  {selectedGoal.recommendedName}
                </div>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}
                >
                  {selectedGoal.recommendedBenefit}
                </div>
              </div>
            </div>

            {/* Affirmation */}
            <div
              className="text-center text-sm italic mb-6 px-4"
              style={{ color: "#6B7A99", fontFamily: "Cormorant Garamond, serif", fontSize: "1rem" }}
            >
              "Your healing journey begins with a single tone."
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <button
                onClick={handleGoToPlayer}
                className="btn-teal w-full py-4 text-base font-semibold flex items-center justify-center gap-2"
              >
                <Waves size={18} />
                Play {selectedGoal.recommendedName}
              </button>
              <button
                onClick={handleGoToChakra}
                className="w-full py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200"
                style={{
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  color: "#C084FC",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                <Zap size={15} />
                Try the 7-Chakra Journey
              </button>
              <button
                onClick={handleComplete}
                className="w-full py-2 text-xs transition-colors duration-200"
                style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}
              >
                Explore on my own
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

