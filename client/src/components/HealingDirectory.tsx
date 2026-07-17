/**
 * HealingDirectory — Full catalog of healing frequencies for Library
 * Sorted by Hz · category filters · benefit chips · text search
 */
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Search, Filter, ExternalLink, Lock } from "lucide-react";
import {
  HEALING_BENEFIT_TAGS,
  HEALING_CATEGORIES,
  HEALING_FREQUENCIES,
  formatHz,
  frequencyMatchesBenefit,
  getBenefitsForFrequency,
  getCategoryAccent,
  getFrequenciesSortedByHz,
  type HealingCategory,
  type HealingFrequency,
} from "@/data/healingFrequencies";

type CategoryTab = HealingCategory | "all";

function DirectoryCard({
  freq,
  onOpen,
}: {
  freq: HealingFrequency;
  onOpen: (freq: HealingFrequency) => void;
}) {
  const accent = getCategoryAccent(freq.category);
  const benefits = getBenefitsForFrequency(freq).slice(0, 3);

  return (
    <button
      type="button"
      onClick={() => onOpen(freq)}
      className="glow-card w-full p-5 text-left group"
    >
      <div className="flex items-start gap-4">
        <div
          className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center"
          style={{
            background: `${accent}15`,
            border: `1px solid ${accent}30`,
          }}
        >
          <span
            className="font-mono-brand text-sm font-bold leading-tight"
            style={{ color: accent }}
          >
            {formatHz(freq.hz)}
          </span>
          <span className="font-mono-brand text-[10px]" style={{ color: `${accent}80` }}>
            Hz
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span
              className="text-sm font-semibold"
              style={{ color: "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}
            >
              {freq.name}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide"
              style={{
                background: `${accent}18`,
                color: accent,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {freq.category}
            </span>
            {freq.isPremium && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1"
                style={{
                  background: "rgba(139,92,246,0.15)",
                  color: "#8B5CF6",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                <Lock size={8} />
                PRO
              </span>
            )}
          </div>
          <p
            className="text-xs leading-relaxed mb-2"
            style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}
          >
            {freq.description}
          </p>
          {benefits.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {benefits.map(b => (
                <span
                  key={b.id}
                  className="text-[10px] px-2 py-0.5 rounded-md"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    color: "#8FA3BF",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <ExternalLink
          size={14}
          className="flex-shrink-0 mt-1 opacity-40 group-hover:opacity-80 transition-opacity"
          style={{ color: accent }}
        />
      </div>
    </button>
  );
}

export default function HealingDirectory() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryTab>("all");
  const [activeBenefit, setActiveBenefit] = useState<string | null>(null);

  const sorted = useMemo(() => getFrequenciesSortedByHz(), []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sorted.filter(freq => {
      if (activeCategory !== "all" && freq.category !== activeCategory) return false;
      if (activeBenefit && !frequencyMatchesBenefit(freq, activeBenefit)) return false;
      if (!q) return true;
      const benefits = getBenefitsForFrequency(freq)
        .map(b => b.label)
        .join(" ")
        .toLowerCase();
      return (
        freq.name.toLowerCase().includes(q) ||
        freq.description.toLowerCase().includes(q) ||
        formatHz(freq.hz).includes(q) ||
        freq.hz.toString().includes(q) ||
        freq.category.toLowerCase().includes(q) ||
        benefits.includes(q)
      );
    });
  }, [sorted, searchQuery, activeCategory, activeBenefit]);

  const categoryInfo =
    HEALING_CATEGORIES.find(c => c.id === activeCategory) ?? HEALING_CATEGORIES[0];

  const openInStudio = (freq: HealingFrequency) => {
    navigate(`/studio?hz=${encodeURIComponent(String(freq.hz))}`);
  };

  return (
    <div>
      <div className="px-6 mb-4">
        <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
          Healing Directory
        </div>
        <p className="text-sm leading-relaxed mb-1" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
          {HEALING_FREQUENCIES.length} frequencies in numerical order — search by benefit, category, or Hz.
        </p>
        <p className="text-xs" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
          Tap any entry to open it in Frequency Studio.
        </p>
      </div>

      <div className="px-6 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#6B7A99" }} />
          <input
            type="search"
            placeholder="Search by benefit, name, or Hz…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#E8EDF5",
              fontFamily: "DM Sans, sans-serif",
            }}
            aria-label="Search healing frequencies by benefit"
          />
        </div>
      </div>

      <div className="px-6 mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
          Categories
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {HEALING_CATEGORIES.map(cat => {
            const accent = getCategoryAccent(cat.id);
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className="flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200"
                style={{
                  background: active ? `${accent}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? `${accent}55` : "rgba(255,255,255,0.06)"}`,
                  color: active ? accent : "#6B7A99",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs mt-2" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
          {categoryInfo.description}
        </p>
      </div>

      <div className="px-6 mb-6">
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
          Find by benefit
        </div>
        <div className="flex gap-2 flex-wrap">
          {HEALING_BENEFIT_TAGS.map(tag => {
            const active = activeBenefit === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => setActiveBenefit(prev => (prev === tag.id ? null : tag.id))}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                style={{
                  background: active ? "rgba(0,212,170,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? "rgba(0,212,170,0.4)" : "rgba(255,255,255,0.06)"}`,
                  color: active ? "#00D4AA" : "#6B7A99",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 mb-3 flex items-center justify-between">
        <span className="text-xs" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
          {filtered.length} {filtered.length === 1 ? "frequency" : "frequencies"} · low → high Hz
        </span>
        {(searchQuery || activeBenefit || activeCategory !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setActiveBenefit(null);
              setActiveCategory("all");
            }}
            className="text-xs font-medium"
            style={{ color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="px-6 pb-8 space-y-3">
        {filtered.length === 0 ? (
          <div className="glow-card p-12 text-center">
            <Filter size={32} className="mx-auto mb-4" style={{ color: "#4A5568" }} />
            <div className="text-sm mb-1" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
              No frequencies match
            </div>
            <div className="text-xs" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
              Try another benefit, category, or search term
            </div>
          </div>
        ) : (
          filtered.map((freq, i) => (
            <div
              key={freq.id}
              style={{
                animation: "fade-up 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards",
                animationDelay: `${Math.min(i, 12) * 40}ms`,
                opacity: 0,
              }}
            >
              <DirectoryCard freq={freq} onOpen={openInStudio} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
