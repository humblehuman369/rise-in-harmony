/**
 * Library — Rise In Harmony Frequency Library
 * Full catalog of all 13 healing frequencies with categories
 * Bioluminescent Depth theme
 */
import { useState } from "react";
import { Play, Pause, Lock, Search, Filter } from "lucide-react";
import Layout from "@/components/Layout";
import { useFrequencyPlayer, FREQUENCIES, type Frequency } from "@/hooks/useFrequencyPlayer";
import { toast } from "sonner";
import PremiumPaywall from "@/components/PremiumPaywall";

const CATEGORIES = ["all", "solfeggio", "binaural", "chakra"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_INFO = {
  all: { label: "All Frequencies", description: "The complete healing frequency library" },
  solfeggio: { label: "Solfeggio Scale", description: "Ancient 6-tone scale with healing properties" },
  binaural: { label: "Binaural Beats", description: "Two-tone audio for brainwave entrainment" },
  chakra: { label: "Chakra Tones", description: "Seven energy center alignment frequencies" },
};

function FrequencyCard({ freq, isPlaying, onPlay }: {
  freq: Frequency;
  isPlaying: boolean;
  onPlay: (freq: Frequency) => void;
}) {
  return (
    <div
      className="glow-card p-5 cursor-pointer group"
      onClick={() => onPlay(freq)}
    >
      <div className="flex items-start gap-4">
        {/* Hz badge */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center"
          style={{
            background: `${freq.color}15`,
            border: `1px solid ${freq.color}30`,
          }}>
          <span className="font-mono-brand text-sm font-bold leading-tight" style={{ color: freq.color }}>
            {freq.hz}
          </span>
          <span className="font-mono-brand text-[10px]" style={{ color: `${freq.color}80` }}>Hz</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
              {freq.name}
            </span>
            {freq.isPremium && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', fontFamily: 'DM Sans, sans-serif' }}>
                <Lock size={8} />
                PRO
              </span>
            )}
          </div>
          <div className="text-xs mb-2" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            {freq.description}
          </div>
          <div className="text-xs leading-relaxed" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
            {freq.benefit}
          </div>
          {freq.binauralOffset && (
            <div className="mt-2 text-[10px] px-2 py-1 rounded-md inline-block"
              style={{ background: 'rgba(139,92,246,0.08)', color: '#8B5CF6', fontFamily: 'DM Sans, sans-serif' }}>
              🎧 Binaural: {freq.hz}Hz + {freq.hz + freq.binauralOffset}Hz = {freq.binauralOffset}Hz beat
            </div>
          )}
        </div>

        {/* Play button */}
        <button
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            background: isPlaying
              ? `${freq.color}`
              : freq.isPremium
                ? 'rgba(139,92,246,0.15)'
                : `${freq.color}20`,
            color: isPlaying ? '#0A0B14' : freq.isPremium ? '#8B5CF6' : freq.color,
            boxShadow: isPlaying ? `0 0 20px ${freq.color}50` : 'none',
          }}
        >
          {freq.isPremium ? (
            <Lock size={16} />
          ) : isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" style={{ marginLeft: '1px' }} />
          )}
        </button>
      </div>
    </div>
  );
}

export default function Library() {
  const { isPlaying, currentFrequency, togglePlay } = useFrequencyPlayer();
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [paywallFreq, setPaywallFreq] = useState<Frequency | null>(null);

  const handlePlay = (freq: Frequency) => {
    if (freq.isPremium) {
      setPaywallFreq(freq);
      return;
    }
    togglePlay(freq);
  };

  const filtered = FREQUENCIES.filter(f => {
    const matchesCategory = activeCategory === "all" || f.category === activeCategory;
    const matchesSearch = searchQuery === "" ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.hz.toString().includes(searchQuery) ||
      f.benefit.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const freeCount = FREQUENCIES.filter(f => !f.isPremium).length;
  const premiumCount = FREQUENCIES.filter(f => f.isPremium).length;

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: '#0A0B14' }}>
        {/* Header */}
        <div className="px-6 pt-8 pb-6">
          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            Frequency Library
          </div>
          <h1 className="mb-2" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 600, color: '#E8EDF5' }}>
            Healing Tones
          </h1>
          <div className="flex gap-4 text-sm" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            <span style={{ color: '#00D4AA' }}>{freeCount} free</span>
            <span>·</span>
            <span style={{ color: '#8B5CF6' }}>{premiumCount} premium</span>
            <span>·</span>
            <span>{FREQUENCIES.length} total</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6B7A99' }} />
            <input
              type="text"
              placeholder="Search frequencies, benefits..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#E8EDF5',
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-6 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                style={{
                  background: activeCategory === cat ? 'rgba(0,212,170,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${activeCategory === cat ? 'rgba(0,212,170,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  color: activeCategory === cat ? '#00D4AA' : '#6B7A99',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {CATEGORY_INFO[cat].label}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
            {CATEGORY_INFO[activeCategory].description}
          </p>
        </div>

        {/* Currently playing banner */}
        {isPlaying && currentFrequency && (
          <div className="mx-6 mb-4 p-4 rounded-xl flex items-center gap-3"
            style={{
              background: `${currentFrequency.color}12`,
              border: `1px solid ${currentFrequency.color}30`,
            }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: currentFrequency.color }} />
            <div className="flex-1">
              <span className="text-sm font-semibold" style={{ color: currentFrequency.color, fontFamily: 'DM Sans, sans-serif' }}>
                Now Playing: {currentFrequency.hz}Hz — {currentFrequency.name}
              </span>
            </div>
            <button
              onClick={() => togglePlay(currentFrequency)}
              className="text-xs px-3 py-1 rounded-full"
              style={{ background: `${currentFrequency.color}20`, color: currentFrequency.color, fontFamily: 'DM Sans, sans-serif' }}>
              Stop
            </button>
          </div>
        )}

        {/* Frequency grid */}
        <div className="px-6 pb-8 space-y-3">
          {filtered.length === 0 ? (
            <div className="glow-card p-12 text-center">
              <Filter size={32} className="mx-auto mb-4" style={{ color: '#4A5568' }} />
              <div className="text-sm" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                No frequencies match your search
              </div>
            </div>
          ) : (
            filtered.map((freq, i) => (
              <div
                key={freq.id}
                style={{
                  animation: 'fade-up 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards',
                  animationDelay: `${i * 50}ms`,
                  opacity: 0,
                }}
              >
                <FrequencyCard
                  freq={freq}
                  isPlaying={isPlaying && currentFrequency?.id === freq.id}
                  onPlay={handlePlay}
                />
              </div>
            ))
          )}
        </div>

        {/* Premium CTA */}
        <div className="mx-6 mb-8 p-6 rounded-2xl" style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(0,212,170,0.06))',
          border: '1px solid rgba(139,92,246,0.2)',
        }}>
          <div className="text-sm font-semibold mb-1" style={{ color: '#8B5CF6', fontFamily: 'DM Sans, sans-serif' }}>
            ✦ Unlock the Full Library
          </div>
          <div className="text-xs leading-relaxed mb-4" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            Get access to all {premiumCount} premium frequencies, unlimited alarms, offline downloads, and Chakra awakening sequences.
          </div>
          <button
            onClick={() => setPaywallFreq({ id: 'cta', hz: 0, name: 'Full Library', isPremium: true } as Frequency)}
            className="text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
              color: '#fff',
              fontFamily: 'DM Sans, sans-serif',
            }}>
            Upgrade to Premium — $7.99/mo
          </button>
        </div>
      </div>

      {/* Premium Paywall Modal */}
      {paywallFreq && (
        <PremiumPaywall
          triggerFrequencyHz={paywallFreq.hz || undefined}
          triggerFrequencyName={paywallFreq.name}
          onClose={() => setPaywallFreq(null)}
        />
      )}
    </Layout>
  );
}
