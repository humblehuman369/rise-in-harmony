/**
 * FrequencyWizard — Personalized frequency finder
 * 3-step conversational wizard: Feeling → Context (time + headphones) → Recommendation
 * Maps user intention to frequencies from the learning content journeys.
 * Playback runs through the DDS engine (useFrequencyPlayer).
 * Bioluminescent Depth theme.
 */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  X, ChevronLeft, Play, Pause, AlarmClock, Moon, Brain, Heart, Zap, Sparkles, Waves,
  Headphones, Volume2, Clock, Lock,
} from "lucide-react";
import { useFrequencyPlayer } from "@/hooks/useFrequencyPlayer";
import { JOURNEYS, toPlayableFrequency, type JourneyEntry } from "@/data/learningContent";
import PremiumPaywall from "@/components/PremiumPaywall";

// ─── Intention definitions ────────────────────────────────────────────────────
interface Intention {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  /** Entry ids in priority order; binaural options listed first when relevant */
  entryIds: string[];
}

const INTENTIONS: Intention[] = [
  {
    id: "rest",
    label: "Deep Rest",
    description: "Unwind, fall asleep, and restore",
    icon: Moon,
    color: "#8B5CF6",
    entryIds: ["delta", "theta", "174"],
  },
  {
    id: "focus",
    label: "Clear Focus",
    description: "Concentrate and enter flow",
    icon: Brain,
    color: "#3B82F6",
    entryIds: ["alpha", "beta-focus", "planet-mercury", "alpha-isochronic"],
  },
  {
    id: "release",
    label: "Emotional Release",
    description: "Let go of fear, guilt, and tension",
    icon: Heart,
    color: "#00D4AA",
    entryIds: ["396", "417", "meridian-lung"],
  },
  {
    id: "energy",
    label: "Morning Energy",
    description: "Wake up bright and purposeful",
    icon: Zap,
    color: "#F59E0B",
    entryIds: ["528", "planet-sun", "gamma-insight"],
  },
  {
    id: "spiritual",
    label: "Spiritual Depth",
    description: "Meditate, expand, and connect",
    icon: Sparkles,
    color: "#EC4899",
    entryIds: ["963", "852", "schumann", "angel-111"],
  },
  {
    id: "grounding",
    label: "Grounding & Calm",
    description: "Settle anxiety and feel present",
    icon: Waves,
    color: "#22C55E",
    entryIds: ["schumann", "396", "meridian-stomach"],
  },
];

const TIME_OPTIONS = [
  { id: "short", label: "5–10 minutes", hint: "A quick reset" },
  { id: "medium", label: "15–30 minutes", hint: "A full session" },
  { id: "long", label: "Background listening", hint: "While I work or sleep" },
] as const;

type TimeOption = (typeof TIME_OPTIONS)[number]["id"];
type Step = "feeling" | "context" | "result";

// Flat lookup of all journey entries by id
const ALL_ENTRIES: Record<string, JourneyEntry> = Object.fromEntries(
  JOURNEYS.flatMap(j => j.entries).map(e => [e.id, e])
);

/** Pick up to 3 recommendations, respecting the headphones constraint. */
function recommend(intention: Intention, hasHeadphones: boolean): JourneyEntry[] {
  const picks: JourneyEntry[] = [];
  for (const id of intention.entryIds) {
    const entry = ALL_ENTRIES[id];
    if (!entry) continue;
    // Binaural beats need headphones; isochronic and pure tones do not
    const needsHeadphones = entry.binauralOffset !== undefined;
    if (needsHeadphones && !hasHeadphones) continue;
    picks.push(entry);
    if (picks.length === 3) break;
  }
  // Fallback: if headphone filtering removed everything, fill with speaker-safe tones
  if (picks.length === 0) {
    const speakerSafe = intention.entryIds
      .map(id => ALL_ENTRIES[id])
      .filter((e): e is JourneyEntry => e !== undefined && e.binauralOffset === undefined)
      .slice(0, 3);
    picks.push(...speakerSafe);
  }
  if (picks.length === 0) {
    const fallback = ALL_ENTRIES["396"];
    if (fallback) picks.push(fallback);
  }
  return picks;
}

interface FrequencyWizardProps {
  onClose: () => void;
}

export default function FrequencyWizard({ onClose }: FrequencyWizardProps) {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("feeling");
  const [intention, setIntention] = useState<Intention | null>(null);
  const [timeChoice, setTimeChoice] = useState<TimeOption>("medium");
  const [hasHeadphones, setHasHeadphones] = useState(true);
  const [paywallEntry, setPaywallEntry] = useState<JourneyEntry | null>(null);
  const { isPlaying, currentFrequency, togglePlay, stopAudio } = useFrequencyPlayer();

  const recommendations = useMemo(
    () => (intention ? recommend(intention, hasHeadphones) : []),
    [intention, hasHeadphones]
  );

  const handlePlay = (entry: JourneyEntry) => {
    if (entry.isPremium) {
      setPaywallEntry(entry);
      return;
    }
    togglePlay(toPlayableFrequency(entry));
  };

  const handleClose = () => {
    stopAudio();
    onClose();
  };

  const goToAlarm = (entry: JourneyEntry) => {
    stopAudio();
    onClose();
    setLocation(`/alarm?hz=${entry.hz}&name=${encodeURIComponent(entry.name)}`);
  };

  const stepIndex = step === "feeling" ? 0 : step === "context" ? 1 : 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,5,10,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8"
        style={{ background: '#12152A', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Close */}
        <button onClick={handleClose} aria-label="Close wizard"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
          style={{ color: '#6B7A99', background: 'rgba(255,255,255,0.04)' }}>
          <X size={16} />
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-1 rounded-full transition-all duration-500"
              style={{
                width: i === stepIndex ? 28 : 12,
                background: i <= stepIndex ? '#00D4AA' : 'rgba(255,255,255,0.1)',
              }} />
          ))}
        </div>

        {/* ── Step 1: Feeling ─────────────────────────────────────────────── */}
        {step === "feeling" && (
          <div className="animate-in fade-in duration-300">
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.75rem', fontWeight: 600, color: '#E8EDF5' }}>
              How do you want to feel?
            </h2>
            <p className="text-sm mt-1 mb-5" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
              Choose the intention that resonates right now.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {INTENTIONS.map(it => {
                const Icon = it.icon;
                return (
                  <button key={it.id}
                    onClick={() => { setIntention(it); setStep("context"); }}
                    className="text-left p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-95"
                    style={{ background: '#0A0B14', border: `1px solid ${it.color}30` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${it.color}70`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${it.color}30`; }}>
                    <Icon size={20} style={{ color: it.color }} className="mb-2" />
                    <div className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                      {it.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                      {it.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: Context ─────────────────────────────────────────────── */}
        {step === "context" && intention && (
          <div className="animate-in fade-in duration-300">
            <button onClick={() => setStep("feeling")}
              className="flex items-center gap-1 text-xs mb-3"
              style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
              <ChevronLeft size={14} /> Back
            </button>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.75rem', fontWeight: 600, color: '#E8EDF5' }}>
              Set your session
            </h2>
            <p className="text-sm mt-1 mb-5" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
              We'll tailor the recommendation to your listening setup.
            </p>

            <div className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5"
              style={{ color: intention.color, fontFamily: 'DM Sans, sans-serif' }}>
              <Clock size={12} /> How much time do you have?
            </div>
            <div className="flex flex-col gap-2 mb-6">
              {TIME_OPTIONS.map(t => (
                <button key={t.id} onClick={() => setTimeChoice(t.id)}
                  className="flex items-center justify-between p-3.5 rounded-xl transition-all duration-200 active:scale-[0.98]"
                  style={{
                    background: timeChoice === t.id ? `${intention.color}10` : '#0A0B14',
                    border: `1px solid ${timeChoice === t.id ? `${intention.color}60` : 'rgba(255,255,255,0.06)'}`,
                  }}>
                  <span className="text-sm font-medium" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                    {t.label}
                  </span>
                  <span className="text-xs" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                    {t.hint}
                  </span>
                </button>
              ))}
            </div>

            <div className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5"
              style={{ color: intention.color, fontFamily: 'DM Sans, sans-serif' }}>
              <Headphones size={12} /> Do you have headphones?
            </div>
            <div className="grid grid-cols-2 gap-2 mb-7">
              {[
                { v: true, label: "Yes", icon: Headphones, hint: "Unlocks binaural beats" },
                { v: false, label: "No", icon: Volume2, hint: "Speaker-safe tones only" },
              ].map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={String(opt.v)} onClick={() => setHasHeadphones(opt.v)}
                    className="p-3.5 rounded-xl text-left transition-all duration-200 active:scale-[0.98]"
                    style={{
                      background: hasHeadphones === opt.v ? `${intention.color}10` : '#0A0B14',
                      border: `1px solid ${hasHeadphones === opt.v ? `${intention.color}60` : 'rgba(255,255,255,0.06)'}`,
                    }}>
                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                      <Icon size={15} style={{ color: intention.color }} /> {opt.label}
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                      {opt.hint}
                    </div>
                  </button>
                );
              })}
            </div>

            <button onClick={() => setStep("result")}
              className="w-full py-3.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #00D4AA, #8B5CF6)',
                color: '#0A0B14',
                fontFamily: 'DM Sans, sans-serif',
              }}>
              Reveal My Frequencies
            </button>
          </div>
        )}

        {/* ── Step 3: Result ──────────────────────────────────────────────── */}
        {step === "result" && intention && (
          <div className="animate-in fade-in duration-300">
            <button onClick={() => setStep("context")}
              className="flex items-center gap-1 text-xs mb-3"
              style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
              <ChevronLeft size={14} /> Back
            </button>
            <div className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: intention.color, fontFamily: 'DM Sans, sans-serif' }}>
              {intention.label}
            </div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.75rem', fontWeight: 600, color: '#E8EDF5' }}>
              Your frequencies
            </h2>
            <p className="text-sm mt-1 mb-5" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
              {timeChoice === "long"
                ? "These tones are chosen for extended background listening."
                : timeChoice === "short"
                ? "Even a few minutes with these tones can shift your state."
                : "Settle in — these tones are matched to your intention."}
            </p>

            <div className="flex flex-col gap-3">
              {recommendations.map((entry, i) => {
                const isActive = isPlaying && currentFrequency?.id === entry.id;
                return (
                  <div key={entry.id}
                    className="p-4 rounded-2xl animate-in fade-in slide-in-from-bottom-4"
                    style={{
                      background: isActive ? `${entry.color}0D` : '#0A0B14',
                      border: `1px solid ${isActive ? `${entry.color}50` : i === 0 ? `${intention.color}40` : 'rgba(255,255,255,0.06)'}`,
                      animationDelay: `${i * 80}ms`,
                      animationFillMode: 'both',
                    }}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => handlePlay(entry)}
                        aria-label={isActive ? `Stop ${entry.name}` : `Play ${entry.name}`}
                        className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95"
                        style={{
                          background: isActive ? entry.color : entry.isPremium ? 'rgba(139,92,246,0.12)' : `${entry.color}18`,
                          border: `1.5px solid ${isActive ? entry.color : entry.isPremium ? 'rgba(139,92,246,0.4)' : `${entry.color}50`}`,
                          color: isActive ? '#0A0B14' : entry.isPremium ? '#8B5CF6' : entry.color,
                        }}>
                        {entry.isPremium && !isActive ? <Lock size={15} /> : isActive ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                            {entry.name}
                          </span>
                          <span className="text-xs font-mono-brand" style={{ color: entry.color }}>
                            {entry.binauralOffset ? `${entry.binauralOffset}Hz beat` : `${entry.hz}Hz`}
                          </span>
                          {i === 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                              style={{ background: `${intention.color}18`, color: intention.color }}>
                              Best Match
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                          {entry.benefit}
                        </p>
                      </div>
                    </div>
                    {intention.id === "energy" && (
                      <button onClick={() => goToAlarm(entry)}
                        className="mt-3 flex items-center gap-1.5 text-xs font-medium transition-colors duration-200"
                        style={{ color: '#F59E0B', fontFamily: 'DM Sans, sans-serif' }}>
                        <AlarmClock size={13} /> Wake up to this frequency
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={() => { setStep("feeling"); setIntention(null); stopAudio(); }}
              className="mt-5 w-full py-3 rounded-full text-sm font-medium transition-colors duration-200"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#6B7A99',
                fontFamily: 'DM Sans, sans-serif',
              }}>
              Start Over
            </button>
          </div>
        )}
      </div>

      {/* Paywall */}
      {paywallEntry && (
        <PremiumPaywall
          triggerFrequencyName={paywallEntry.name}
          triggerFrequencyHz={paywallEntry.hz}
          onClose={() => setPaywallEntry(null)}
        />
      )}
    </div>
  );
}
