/**
 * OnboardingModal — Personalized first-visit onboarding flow
 * 4-step wizard: Welcome → Goal → Ritual (wake time + headphones) → Plan
 * Builds a "frequency profile", offers one-tap first-alarm setup, and
 * persists completion state in localStorage to show only once.
 * Bioluminescent Depth theme
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { X, ChevronRight, Moon, Zap, Brain, Sparkles, Heart, Waves, Headphones, AlarmClock } from "lucide-react";
import { toast } from "sonner";
import { trackOnboardingComplete, trackOnboardingStarted, trackFirstAlarmSet } from "@/hooks/useAnalytics";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import {
  GOAL_RECOMMENDED_FREQUENCY,
  SPEAKER_SAFE_FREQUENCY_SWAP,
} from "@rih/shared-utils";
import type { OnboardingGoal } from "@rih/shared-types";

const ONBOARDING_KEY = "rih_onboarding_complete";

interface Goal {
  id: OnboardingGoal;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  recommendedFreqId: string;
  recommendedHz: number;
  recommendedName: string;
  recommendedBenefit: string;
}

function goalFromShared(
  id: OnboardingGoal,
  label: string,
  description: string,
  icon: React.ElementType,
  color: string
): Goal {
  const rec = GOAL_RECOMMENDED_FREQUENCY[id];
  return {
    id,
    label,
    description,
    icon,
    color,
    recommendedFreqId: rec.frequencyId,
    recommendedHz: rec.hz,
    recommendedName: rec.name,
    recommendedBenefit: rec.benefit,
  };
}

/** UI chrome + copy; frequency recommendations come from shared-utils. */
const GOALS: Goal[] = [
  goalFromShared("sleep", "Better Sleep", "Fall asleep faster and wake up refreshed", Moon, "#8B5CF6"),
  goalFromShared("stress", "Reduce Stress", "Release tension and find inner calm", Heart, "#00D4AA"),
  goalFromShared("focus", "Sharpen Focus", "Enhance concentration and mental clarity", Brain, "#3B82F6"),
  goalFromShared("morning", "Energize Mornings", "Wake up gently and align your energy", Zap, "#F59E0B"),
  goalFromShared("spiritual", "Spiritual Growth", "Deepen meditation and expand consciousness", Sparkles, "#EC4899"),
  goalFromShared("healing", "Physical Healing", "Support physical and emotional recovery", Waves, "#EF4444"),
];

type Step = "welcome" | "goals" | "ritual" | "recommendation";

const WAKE_TIMES = ["5:30", "6:00", "6:30", "7:00", "7:30", "8:00"];

/** Speaker-safe swaps for headphone-dependent recommendations (shared catalog). */
const SPEAKER_SAFE_SWAP: Record<
  string,
  Pick<Goal, "recommendedFreqId" | "recommendedHz" | "recommendedName" | "recommendedBenefit">
> = Object.fromEntries(
  Object.entries(SPEAKER_SAFE_FREQUENCY_SWAP).map(([id, rec]) => [
    id,
    {
      recommendedFreqId: rec.frequencyId,
      recommendedHz: rec.hz,
      recommendedName: rec.name,
      recommendedBenefit: rec.benefit,
    },
  ])
);

interface OnboardingModalProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [wakeTime, setWakeTime] = useState<string | null>("6:30");
  const [hasHeadphones, setHasHeadphones] = useState<boolean>(true);
  const [alarmCreated, setAlarmCreated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const completeOnboarding = trpc.subscription.completeOnboarding.useMutation();
  const createAlarm = trpc.alarms.create.useMutation();

  useEffect(() => {
    trackOnboardingStarted();
    // Slight delay for entrance animation
    const t = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // The final recommendation, adjusted for speaker-only users
  const recommendation = (() => {
    if (!selectedGoal) return null;
    if (!hasHeadphones && SPEAKER_SAFE_SWAP[selectedGoal.recommendedFreqId]) {
      return { ...selectedGoal, ...SPEAKER_SAFE_SWAP[selectedGoal.recommendedFreqId] };
    }
    return selectedGoal;
  })();

  const persistProfile = (goalId: string) => {
    if (!user) return;
    completeOnboarding
      .mutateAsync({
        goal: goalId,
        profile: { wakeTime, hasHeadphones, source: "web-quiz-v2" },
      })
      .catch(() => {});
  };

  const finish = (destination?: string) => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    trackOnboardingComplete(selectedGoal?.id ?? "skipped");
    if (selectedGoal) persistProfile(selectedGoal.id);
    onComplete();
    if (destination) navigate(destination);
  };

  const handleComplete = () => finish();
  const handleGoToPlayer = () => finish("/player");

  const handleSetFirstAlarm = async () => {
    if (!recommendation || !wakeTime) return;
    const [hour, minute] = wakeTime.split(":").map(Number);
    if (user) {
      try {
        await createAlarm.mutateAsync({
          label: "Morning resonance",
          hour,
          minute,
          days: [1, 2, 3, 4, 5], // weekdays
          soundType: "frequency",
          frequencyHz: recommendation.recommendedHz,
          frequencyName: recommendation.recommendedName,
          fadeInMinutes: 5,
        });
        trackFirstAlarmSet(recommendation.recommendedHz, wakeTime);
        setAlarmCreated(true);
        toast.success(`Alarm set for ${wakeTime} with ${recommendation.recommendedName}`);
      } catch {
        toast.error("Could not create the alarm — you can set it on the Alarm page.");
      }
    } else {
      // Signed-out: stash the prefill and send them to the alarm page
      localStorage.setItem(
        "rih_alarm_prefill",
        JSON.stringify({ wakeTime, frequencyHz: recommendation.recommendedHz, frequencyName: recommendation.recommendedName }),
      );
      trackFirstAlarmSet(recommendation.recommendedHz, wakeTime);
      finish("/alarm");
    }
  };

  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: isLight ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.8)",
        backdropFilter: "blur(12px)",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden relative"
        style={{
          background: isLight ? "linear-gradient(160deg, #FFFFFF 0%, #F5F6F9 100%)" : "linear-gradient(160deg, #0D0F1E 0%, #12152A 100%)",
          border: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.08)",
          boxShadow: isLight ? "0 0 60px rgba(0,212,170,0.08), 0 24px 60px rgba(0,0,0,0.15)" : "0 0 80px rgba(0,212,170,0.12), 0 32px 80px rgba(0,0,0,0.7)",
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
          style={{ background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)", color: "#6B7A99" }}
        >
          <X size={14} />
        </button>

        {/* Step indicator */}
        <div className="relative flex justify-center gap-1.5 pt-6 pb-2">
          {(["welcome", "goals", "ritual", "recommendation"] as Step[]).map((s, i) => (
            <div
              key={s}
              className="h-1 rounded-full transition-all duration-400"
              style={{
                width: step === s ? "24px" : "8px",
                background: step === s ? "#00D4AA" : (isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"),
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
              style={{ fontFamily: "Cormorant Garamond, serif", color: isLight ? "#1A1D2E" : "#E8EDF5" }}
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
                { icon: "🎵", text: "25 Solfeggio, binaural & recorded healing sounds" },
                { icon: "⏰", text: "Smart alarm clock with gentle frequency fade-in" },
                { icon: "✦", text: "7-Chakra guided morning sequence" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)", border: isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                  <span className="text-sm" style={{ color: isLight ? "#4A5568" : "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
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
                style={{ fontFamily: "Cormorant Garamond, serif", color: isLight ? "#1A1D2E" : "#E8EDF5" }}
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
                    background: selectedGoal?.id === goal.id ? `${goal.color}15` : (isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)"),
                    border: `1px solid ${selectedGoal?.id === goal.id ? `${goal.color}50` : (isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)")}`,
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
                      color: selectedGoal?.id === goal.id ? (isLight ? "#1A1D2E" : "#E8EDF5") : "#8FA3BF",
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
              onClick={() => { if (selectedGoal) setStep("ritual"); }}
              disabled={!selectedGoal}
              className="btn-teal w-full py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 3: Ritual — wake time + headphones */}
        {step === "ritual" && (
          <div className="relative px-6 pt-4 pb-8">
            <div className="text-center mb-6">
              <h2
                className="text-2xl font-semibold mb-2"
                style={{ fontFamily: "Cormorant Garamond, serif", color: isLight ? "#1A1D2E" : "#E8EDF5" }}
              >
                Shape your ritual
              </h2>
              <p className="text-sm" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                Two quick questions to tune your plan.
              </p>
            </div>

            {/* Wake time */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlarmClock size={14} style={{ color: "#F59E0B" }} />
                <span className="text-sm font-medium" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
                  When do you want to wake up?
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {WAKE_TIMES.map(t => (
                  <button
                    key={t}
                    onClick={() => setWakeTime(t)}
                    className="py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: wakeTime === t ? "rgba(245,158,11,0.15)" : (isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)"),
                      border: `1px solid ${wakeTime === t ? "rgba(245,158,11,0.4)" : (isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)")}`,
                      color: wakeTime === t ? "#F59E0B" : "#6B7A99",
                      fontFamily: "DM Sans, sans-serif",
                    }}
                  >
                    {t} am
                  </button>
                ))}
              </div>
            </div>

            {/* Headphones */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Headphones size={14} style={{ color: "#8B5CF6" }} />
                <span className="text-sm font-medium" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
                  Do you usually listen with headphones?
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: true, label: "Yes, usually" },
                  { value: false, label: "No, speakers" },
                ].map(opt => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setHasHeadphones(opt.value)}
                    className="py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: hasHeadphones === opt.value ? "rgba(139,92,246,0.15)" : (isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)"),
                      border: `1px solid ${hasHeadphones === opt.value ? "rgba(139,92,246,0.4)" : (isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)")}`,
                      color: hasHeadphones === opt.value ? "#C084FC" : "#6B7A99",
                      fontFamily: "DM Sans, sans-serif",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] mt-2" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
                Binaural beats need headphones — if you use speakers we'll recommend speaker-safe tones instead.
              </p>
            </div>

            <button
              onClick={() => setStep("recommendation")}
              className="btn-teal w-full py-4 text-base font-semibold flex items-center justify-center gap-2"
            >
              Build My Plan
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 4: Recommendation */}
        {step === "recommendation" && recommendation && (
          <div className="relative px-8 pt-4 pb-8">
            <div className="text-center mb-6">
              <div
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}
              >
                Your frequency plan
              </div>
              <h2
                className="text-2xl font-semibold mb-1"
                style={{ fontFamily: "Cormorant Garamond, serif", color: isLight ? "#1A1D2E" : "#E8EDF5" }}
              >
                {recommendation.label}
              </h2>
            </div>

            {/* Frequency card */}
            <div
              className="rounded-2xl p-6 mb-5 text-center relative overflow-hidden"
              style={{
                background: isLight ? `linear-gradient(135deg, ${recommendation.color}10 0%, rgba(245,246,249,0.9) 100%)` : `linear-gradient(135deg, ${recommendation.color}12 0%, rgba(18,21,42,0.8) 100%)`,
                border: `1px solid ${recommendation.color}30`,
                boxShadow: `0 0 40px ${recommendation.color}15`,
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 50% 0%, ${recommendation.color}15 0%, transparent 60%)`,
                }}
              />
              <div className="relative">
                {/* Frequency orb */}
                <div
                  className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4"
                  style={{
                    background: `radial-gradient(circle, ${recommendation.color}30 0%, ${recommendation.color}08 100%)`,
                    border: `2px solid ${recommendation.color}40`,
                    boxShadow: `0 0 30px ${recommendation.color}30`,
                  }}
                >
                  <span
                    className="font-mono-brand text-2xl font-bold"
                    style={{ color: recommendation.color }}
                  >
                    {recommendation.recommendedHz}
                  </span>
                </div>

                <div
                  className="text-xl font-semibold mb-1"
                  style={{ fontFamily: "Cormorant Garamond, serif", color: isLight ? "#1A1D2E" : "#E8EDF5" }}
                >
                  {recommendation.recommendedName}
                </div>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}
                >
                  {recommendation.recommendedBenefit}
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              {wakeTime && !alarmCreated && (
                <button
                  onClick={handleSetFirstAlarm}
                  disabled={createAlarm.isPending}
                  className="w-full py-4 rounded-full text-base font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #F59E0B, #D97706)",
                    color: "#0A0B14",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  <AlarmClock size={18} />
                  {createAlarm.isPending ? "Setting alarm…" : `Set my ${wakeTime}am alarm`}
                </button>
              )}
              {alarmCreated && (
                <div
                  className="w-full py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.3)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
                >
                  ✓ Alarm set for {wakeTime}am, weekdays
                </div>
              )}
              <button
                onClick={handleGoToPlayer}
                className="btn-teal w-full py-4 text-base font-semibold flex items-center justify-center gap-2"
              >
                <Waves size={18} />
                Play {recommendation.recommendedName}
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

