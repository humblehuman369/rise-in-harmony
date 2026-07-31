/**
 * Library — Rise In Harmony Frequency Library
 * Playable tones + Healing Directory (100 frequencies by Hz / benefit / category)
 * Bioluminescent Depth theme
 */
import { useState } from "react";
import { Play, Pause, Lock, Search, Filter, ChevronDown, ChevronUp, Volume2, BookOpen, Waves } from "lucide-react";
import Layout from "@/components/Layout";
import HealingDirectory from "@/components/HealingDirectory";
import { useFrequencyPlayer, FREQUENCIES, type Frequency } from "@/hooks/useFrequencyPlayer";
import { HEALING_FREQUENCIES } from "@/data/healingFrequencies";
import PremiumPaywall from "@/components/PremiumPaywall";

type LibraryView = "playable" | "directory";

function initialLibraryView(): LibraryView {
  if (typeof window === "undefined") return "directory";
  const param = new URLSearchParams(window.location.search).get("view");
  if (param === "playable") return "playable";
  if (param === "directory") return "directory";
  return "directory";
}

const CATEGORIES = ["all", "chakra", "solfeggio", "binaural", "recorded"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_INFO = {
  all: { label: "All Frequencies", description: "The complete healing frequency library" },
  solfeggio: { label: "Solfeggio Scale", description: "Ancient 6-tone scale with healing properties" },
  binaural: { label: "Binaural Beats", description: "Two-tone audio for brainwave entrainment" },
  chakra: { label: "Chakra Journey", description: "Seven energy center alignment frequencies · Root to Crown" },
  recorded: { label: "Recorded Sessions", description: "Studio-mixed Solfeggio + 7.83Hz Schumann binaural recordings · headphones required" },
};

// The 7 chakra frequencies in ascending order
const CHAKRA_HZ = [396, 417, 528, 639, 741, 852, 963];

const CHAKRA_COLORS: Record<number, string> = {
  1: "#EAB308", // Root — amber
  2: "#84CC16", // Sacral — lime
  3: "#06B6D4", // Solar Plexus — cyan
  4: "#3B82F6", // Heart — blue
  5: "#8B5CF6", // Throat — violet
  6: "#A855F7", // Third Eye — purple
  7: "#EC4899", // Crown — pink
};

function ChakraProgressionHeader() {
  const chakraFreqs = FREQUENCIES.filter(f => f.chakraPosition !== undefined)
    .sort((a, b) => (a.chakraPosition ?? 0) - (b.chakraPosition ?? 0));

  return (
    <div className="mx-6 mb-6 p-5 rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(0,212,170,0.05))',
        border: '1px solid rgba(139,92,246,0.18)',
      }}>
      <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8B5CF6', fontFamily: 'DM Sans, sans-serif' }}>
        The Seven Chakra Frequencies
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {chakraFreqs.map((f, i) => (
          <div key={f.id} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold font-mono-brand"
                style={{
                  background: `${f.color}20`,
                  border: `1.5px solid ${f.color}60`,
                  color: f.color,
                }}>
                {f.hz}
              </div>
              <div className="text-[8px] mt-0.5 text-center max-w-[40px] leading-tight"
                style={{ color: `${f.color}90`, fontFamily: 'DM Sans, sans-serif' }}>
                {f.pronunciation?.split(' · ')[0].split('ā')[0].split('ū')[0].split('ṭ')[0].split('ṣ')[0].slice(0, 6)}
              </div>
            </div>
            {i < chakraFreqs.length - 1 && (
              <div className="w-3 h-px mb-3" style={{ background: 'rgba(255,255,255,0.12)' }} />
            )}
          </div>
        ))}
      </div>
      <div className="text-xs mt-3 leading-relaxed" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
        Play them in sequence — Root to Crown — for a complete energetic alignment journey.
      </div>
    </div>
  );
}

function PronunciationGuide({ freq }: { freq: Frequency }) {
  const [open, setOpen] = useState(false);
  if (!freq.pronunciation) return null;

  const [sanskritName, phonetic] = freq.pronunciation.split(' · ');
  const chakraLabel = freq.description.split('Chakra (')[0].split('— ')[1]?.trim() || '';

  return (
    <div className="mt-2">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="flex items-center gap-1.5 text-[10px] font-medium transition-all duration-150"
        style={{ color: open ? freq.color : '#4A5568', fontFamily: 'DM Sans, sans-serif' }}
      >
        <Volume2 size={10} />
        Pronunciation
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {open && (
        <div
          className="mt-1.5 px-3 py-2 rounded-lg text-xs"
          style={{
            background: `${freq.color}0A`,
            border: `1px solid ${freq.color}25`,
            fontFamily: 'DM Sans, sans-serif',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <span className="font-semibold" style={{ color: freq.color }}>{sanskritName}</span>
              <span className="mx-1.5" style={{ color: '#4A5568' }}>·</span>
              <span style={{ color: '#8FA3BF' }}>"{phonetic}"</span>
            </div>
          </div>
          {chakraLabel && (
            <div className="mt-1 text-[10px]" style={{ color: '#4A5568' }}>
              {chakraLabel} Chakra · Position {freq.chakraPosition} of 7
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FrequencyCard({ freq, isPlaying, onPlay, showChakraPosition }: {
  freq: Frequency;
  isPlaying: boolean;
  onPlay: (freq: Frequency) => void;
  showChakraPosition?: boolean;
}) {
  return (
    <div
      className="cursor-pointer group relative overflow-hidden"
      style={{
        background: isPlaying
          ? `linear-gradient(135deg, ${freq.color}12, ${freq.color}06)`
          : 'rgba(13,15,30,0.95)',
        border: `1px solid ${isPlaying ? `${freq.color}45` : 'rgba(0,212,170,0.12)'}`,
        borderRadius: '1.25rem',
        transition: 'all 300ms cubic-bezier(0.23, 1, 0.32, 1)',
        boxShadow: isPlaying
          ? `0 0 40px ${freq.color}20, 0 8px 32px rgba(0,0,0,0.5)`
          : '0 4px 20px rgba(0,0,0,0.3)',
      }}
      onClick={() => onPlay(freq)}
      onMouseEnter={e => {
        if (!isPlaying) {
          (e.currentTarget as HTMLElement).style.borderColor = `${freq.color}35`;
          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${freq.color}12, 0 8px 32px rgba(0,0,0,0.5)`;
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={e => {
        if (!isPlaying) {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,170,0.12)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }
      }}
    >
      {/* Subtle radial glow in top-left corner */}
      <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none" style={{
        background: `radial-gradient(ellipse at 0% 0%, ${freq.color}08 0%, transparent 70%)`,
      }} />

      <div className="p-4">
        {/* Top row: Hz number + play button */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-col">
            {showChakraPosition && freq.chakraPosition && (
              <div className="text-[9px] font-bold uppercase tracking-widest mb-1"
                style={{ color: freq.color, fontFamily: 'DM Sans, sans-serif', opacity: 0.7 }}>
                Chakra {freq.chakraPosition}
              </div>
            )}
            <div className="flex items-baseline gap-1">
              <span className="font-mono-brand text-3xl font-bold leading-none"
                style={{ color: freq.color, textShadow: `0 0 20px ${freq.color}40` }}>
                {freq.hz}
              </span>
              <span className="text-sm font-medium" style={{ color: `${freq.color}70` }}>Hz</span>
            </div>
          </div>
          {/* Play button */}
          <button
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: isPlaying
                ? freq.color
                : freq.isPremium
                  ? 'rgba(139,92,246,0.15)'
                  : `${freq.color}18`,
              border: `1px solid ${isPlaying ? freq.color : freq.isPremium ? 'rgba(139,92,246,0.3)' : `${freq.color}30`}`,
              color: isPlaying ? '#0A0B14' : freq.isPremium ? '#8B5CF6' : freq.color,
              boxShadow: isPlaying ? `0 0 20px ${freq.color}50` : 'none',
            }}
          >
            {freq.isPremium ? (
              <Lock size={14} />
            ) : isPlaying ? (
              <Pause size={14} fill="currentColor" />
            ) : (
              <Play size={14} fill="currentColor" style={{ marginLeft: '1px' }} />
            )}
          </button>
        </div>

        {/* Name + badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
          <span className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
            {freq.name}
          </span>
          {freq.isPremium && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', fontFamily: 'DM Sans, sans-serif' }}>
              <Lock size={7} /> PRO
            </span>
          )}
          {freq.audioUrl && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', fontFamily: 'DM Sans, sans-serif' }}>
              RECORDED
            </span>
          )}
        </div>

        {/* Description */}
        <div className="text-xs mb-1" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
          {freq.description}
        </div>
        <div className="text-xs leading-relaxed line-clamp-2" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
          {freq.benefit}
        </div>

        {freq.binauralOffset && (
          <div className="mt-2 text-[10px] px-2 py-1 rounded-md inline-block"
            style={{ background: 'rgba(139,92,246,0.08)', color: '#8B5CF6', fontFamily: 'DM Sans, sans-serif' }}>
            🎧 {freq.binauralOffset}Hz binaural beat
          </div>
        )}
        <PronunciationGuide freq={freq} />
      </div>
    </div>
  );
}

export default function Library() {
  const { isPlaying, currentFrequency, togglePlay } = useFrequencyPlayer();
  const [view, setView] = useState<LibraryView>(initialLibraryView);
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [paywallFreq, setPaywallFreq] = useState<Frequency | null>(null);

  const setLibraryView = (next: LibraryView) => {
    setView(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", next);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handlePlay = (freq: Frequency) => {
    if (freq.isPremium) {
      setPaywallFreq(freq);
      return;
    }
    togglePlay(freq);
  };

  const filtered = (() => {
    let list = FREQUENCIES.filter(f => {
      const matchesCategory = activeCategory === "all" || f.category === activeCategory;
      const matchesSearch = searchQuery === "" ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.hz.toString().includes(searchQuery) ||
        f.benefit.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    // When chakra category is selected, show only the 7 chakra frequencies sorted Root→Crown
    if (activeCategory === "chakra") {
      list = list
        .filter(f => CHAKRA_HZ.includes(f.hz))
        .sort((a, b) => (a.chakraPosition ?? 99) - (b.chakraPosition ?? 99));
    }

    return list;
  })();

  const freeCount = FREQUENCIES.filter(f => !f.isPremium).length;
  const premiumCount = FREQUENCIES.filter(f => f.isPremium).length;

  return (
    <Layout>
      <div className="min-h-screen relative" style={{ background: '#0A0B14' }}>
        {/* Bioluminescent background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute" style={{ top: '-10%', left: '-5%', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(0,212,170,0.04) 0%, transparent 70%)' }} />
          <div className="absolute" style={{ bottom: '10%', right: '-5%', width: '50%', height: '50%', background: 'radial-gradient(ellipse, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
        </div>
        <div className="relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="px-6 pt-8 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
            style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
            Frequency Library
          </div>
          <h1 className="mb-2" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.4rem', fontWeight: 600, color: '#E8EDF5', textShadow: '0 0 40px rgba(0,212,170,0.15)' }}>
            Healing Tones
          </h1>
          <div className="flex gap-4 text-sm mb-5 flex-wrap" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            {view === "playable" ? (
              <>
                <span style={{ color: '#00D4AA' }}>{freeCount} free</span>
                <span>·</span>
                <span style={{ color: '#8B5CF6' }}>{premiumCount} premium</span>
                <span>·</span>
                <span>{FREQUENCIES.length} playable</span>
              </>
            ) : (
              <>
                <span style={{ color: '#00D4AA' }}>{HEALING_FREQUENCIES.length} frequencies</span>
                <span>·</span>
                <span>sorted by Hz</span>
                <span>·</span>
                <span>search by benefit</span>
              </>
            )}
          </div>

          {/* View toggle: Healing Directory (default) vs Playable Tones */}
          <div
            className="flex p-1.5 rounded-2xl gap-1.5"
            style={{
              background: 'rgba(139,92,246,0.08)',
              border: '1px solid rgba(139,92,246,0.28)',
              boxShadow: '0 0 24px rgba(139,92,246,0.08)',
            }}
            role="tablist"
            aria-label="Library section"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "directory"}
              onClick={() => setLibraryView("directory")}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: view === "directory"
                  ? "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(0,212,170,0.18))"
                  : "transparent",
                color: view === "directory" ? "#E8EDF5" : "#8FA3BF",
                fontFamily: "DM Sans, sans-serif",
                boxShadow: view === "directory" ? "0 0 16px rgba(139,92,246,0.25)" : "none",
              }}
            >
              <BookOpen size={16} style={{ color: view === "directory" ? "#A78BFA" : "#6B7A99" }} />
              Healing Directory
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "playable"}
              onClick={() => setLibraryView("playable")}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: view === "playable"
                  ? "rgba(0,212,170,0.22)"
                  : "transparent",
                color: view === "playable" ? "#E8EDF5" : "#8FA3BF",
                fontFamily: "DM Sans, sans-serif",
                boxShadow: view === "playable" ? "0 0 16px rgba(0,212,170,0.2)" : "none",
              }}
            >
              <Waves size={16} style={{ color: view === "playable" ? "#00D4AA" : "#6B7A99" }} />
              Playable Tones
            </button>
          </div>
        </div>

        {view === "directory" ? (
          <HealingDirectory />
        ) : (
          <>
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
                      background: activeCategory === cat
                        ? cat === 'chakra' ? 'rgba(139,92,246,0.15)' : 'rgba(0,212,170,0.15)'
                        : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${activeCategory === cat
                        ? cat === 'chakra' ? 'rgba(139,92,246,0.35)' : 'rgba(0,212,170,0.35)'
                        : 'rgba(255,255,255,0.06)'}`,
                      color: activeCategory === cat
                        ? cat === 'chakra' ? '#8B5CF6' : '#00D4AA'
                        : '#6B7A99',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {cat === 'chakra' && '✦ '}{CATEGORY_INFO[cat].label}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
                {CATEGORY_INFO[activeCategory].description}
              </p>
            </div>

            {/* Chakra progression header — shown only when chakra category is active */}
            {activeCategory === 'chakra' && <ChakraProgressionHeader />}

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
            <div className="px-6 pb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      showChakraPosition={activeCategory === 'chakra'}
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
          </>
        )}
      </div>{/* /relative zIndex:1 */}
      </div>{/* /min-h-screen */}

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
