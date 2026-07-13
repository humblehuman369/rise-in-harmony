/**
 * Learn — Rise In Harmony Inspirational Learning Section
 * Four thematic "Journeys" derived from the 100 Frequencies For Healing guide:
 * The Foundation (Solfeggio), The Mind (Brainwaves), The Body (Traditional
 * Resonance), and The Cosmos (Planetary & Angelic).
 * All playback runs through the DDS engine via useFrequencyPlayer.
 * Bioluminescent Depth theme.
 */
import { useState } from "react";
import { Play, Pause, Lock, Sparkles, Brain, Activity, Compass, ChevronLeft, Wand2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useFrequencyPlayer, type Frequency } from "@/hooks/useFrequencyPlayer";
import { JOURNEYS, toPlayableFrequency, type Journey, type JourneyEntry } from "@/data/learningContent";
import PremiumPaywall from "@/components/PremiumPaywall";
import FrequencyWizard from "@/components/FrequencyWizard";

const ICONS = {
  sparkles: Sparkles,
  brain: Brain,
  activity: Activity,
  compass: Compass,
} as const;

// ─── Journey Card (grid view) ─────────────────────────────────────────────────
function JourneyCard({ journey, index, onOpen }: { journey: Journey; index: number; onOpen: () => void }) {
  const Icon = ICONS[journey.iconType];
  const freeCount = journey.entries.filter(e => !e.isPremium).length;
  return (
    <button
      onClick={onOpen}
      className="group text-left p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4"
      style={{
        background: '#12152A',
        border: `1px solid ${journey.themeColor}30`,
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'both',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px ${journey.themeColor}18, inset 0 0 24px ${journey.themeColor}08`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ background: `${journey.themeColor}15`, border: `1px solid ${journey.themeColor}40` }}>
        <Icon size={22} style={{ color: journey.themeColor }} />
      </div>
      <div className="text-xs font-semibold uppercase tracking-widest mb-1"
        style={{ color: journey.themeColor, fontFamily: 'DM Sans, sans-serif' }}>
        {journey.subtitle}
      </div>
      <h3 className="text-2xl mb-2" style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600, color: '#E8EDF5' }}>
        {journey.title}
      </h3>
      <p className="text-sm leading-relaxed mb-4" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
        {journey.description}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono-brand" style={{ color: '#4A5568' }}>
          {journey.entries.length} frequencies · {freeCount} free
        </span>
        <span className="text-xs font-medium transition-colors duration-200 group-hover:underline"
          style={{ color: journey.themeColor, fontFamily: 'DM Sans, sans-serif' }}>
          Begin Journey →
        </span>
      </div>
    </button>
  );
}

// ─── Frequency Entry Row (detail view) ────────────────────────────────────────
function EntryRow({
  entry,
  index,
  isActive,
  onPlay,
}: {
  entry: JourneyEntry;
  index: number;
  isActive: boolean;
  onPlay: () => void;
}) {
  return (
    <div
      className="flex items-start gap-4 p-5 rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
      style={{
        background: isActive ? `${entry.color}0D` : '#12152A',
        border: `1px solid ${isActive ? `${entry.color}50` : 'rgba(255,255,255,0.06)'}`,
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'both',
      }}>
      <button
        onClick={onPlay}
        aria-label={isActive ? `Stop ${entry.name}` : `Play ${entry.name}`}
        className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95"
        style={{
          background: isActive ? entry.color : entry.isPremium ? 'rgba(139,92,246,0.12)' : `${entry.color}18`,
          border: `1.5px solid ${isActive ? entry.color : entry.isPremium ? 'rgba(139,92,246,0.4)' : `${entry.color}50`}`,
          color: isActive ? '#0A0B14' : entry.isPremium ? '#8B5CF6' : entry.color,
        }}>
        {entry.isPremium && !isActive ? <Lock size={16} /> : isActive ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h4 className="text-base font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
            {entry.name}
          </h4>
          <span className="text-xs font-mono-brand" style={{ color: entry.color }}>
            {entry.binauralOffset ? `${entry.binauralOffset}Hz beat` : `${entry.hz}Hz`}
          </span>
          {entry.isPremium && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
              Premium
            </span>
          )}
        </div>
        <div className="text-xs mt-0.5 mb-1.5" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
          {entry.description}
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
          {entry.benefit}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Learn() {
  const { isPlaying, currentFrequency, togglePlay } = useFrequencyPlayer();
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [paywallEntry, setPaywallEntry] = useState<JourneyEntry | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const handlePlay = (entry: JourneyEntry) => {
    if (entry.isPremium) {
      setPaywallEntry(entry);
      return;
    }
    togglePlay(toPlayableFrequency(entry));
  };

  return (
    <Layout>
      <div className="min-h-screen pb-24" style={{ background: '#0A0B14' }}>
        {/* Header */}
        <div className="px-6 pt-8 pb-6 max-w-5xl mx-auto">
          {activeJourney ? (
            <button
              onClick={() => setActiveJourney(null)}
              className="flex items-center gap-1.5 text-sm mb-4 transition-colors duration-200"
              style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#00D4AA'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B7A99'; }}>
              <ChevronLeft size={16} /> All Journeys
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
              style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.25)' }}>
              <Sparkles size={13} style={{ color: '#00D4AA' }} />
              <span className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
                Learn
              </span>
            </div>
          )}
          <h1 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(2rem, 4.5vw, 2.8rem)',
            fontWeight: 600,
            color: '#E8EDF5',
            lineHeight: 1.15,
          }}>
            {activeJourney ? activeJourney.title : 'The Frequency Journeys'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            {activeJourney
              ? activeJourney.description
              : 'Explore the traditions behind healing sound. Each journey gathers frequencies by intention — grounding, cognition, body resonance, and cosmic archetypes — every tone rendered with double-precision DDS synthesis.'}
          </p>
          {!activeJourney && (
            <button
              onClick={() => setWizardOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #00D4AA, #8B5CF6)',
                color: '#0A0B14',
                fontFamily: 'DM Sans, sans-serif',
              }}>
              <Wand2 size={16} /> Find My Frequency
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 max-w-5xl mx-auto">
          {activeJourney ? (
            <div className="flex flex-col gap-3">
              {activeJourney.entries.map((entry, i) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  index={i}
                  isActive={isPlaying && currentFrequency?.id === entry.id}
                  onPlay={() => handlePlay(entry)}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {JOURNEYS.map((j, i) => (
                <JourneyCard key={j.id} journey={j} index={i} onOpen={() => setActiveJourney(j)} />
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <p className="mt-10 text-xs leading-relaxed max-w-3xl" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
            The descriptions in this section reflect traditional, historical, and symbolic associations from
            sound-healing practice. They are offered for relaxation, meditation, and inspiration — not as medical
            advice, diagnosis, or treatment. If you have a health concern, please consult a qualified professional.
          </p>
        </div>
      </div>

      {/* Paywall */}
      {paywallEntry && (
        <PremiumPaywall
          triggerFrequencyName={paywallEntry.name}
          triggerFrequencyHz={paywallEntry.hz}
          onClose={() => setPaywallEntry(null)}
        />
      )}

      {/* Wizard */}
      {wizardOpen && <FrequencyWizard onClose={() => setWizardOpen(false)} />}
    </Layout>
  );
}
