/**
 * FrequencyBrowser — Slide-out panel for browsing 100 healing frequencies
 *
 * Features:
 * - Slide-in from the right (fixed overlay)
 * - Search bar (name, hz, description)
 * - Category filter tabs
 * - Virtualised list (windowing via CSS, no extra deps) — renders all items but
 *   uses a scrollable container so it stays performant
 * - Click any entry to load it into the Precision Player
 * - Premium entries show a lock badge; free entries load immediately
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { X, Search, Lock, Zap, ChevronRight } from "lucide-react";
import {
  HEALING_FREQUENCIES,
  HEALING_CATEGORIES,
  type HealingFrequency,
  type HealingCategory,
} from "@/data/healingFrequencies";

// ── Category colour map ───────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<HealingCategory | "all", { bg: string; text: string; border: string }> = {
  all:          { bg: "rgba(255,255,255,0.06)", text: "#8FA3BF",  border: "rgba(255,255,255,0.10)" },
  solfeggio:    { bg: "rgba(0,212,170,0.12)",   text: "#00D4AA",  border: "rgba(0,212,170,0.25)"   },
  planetary:    { bg: "rgba(139,92,246,0.12)",  text: "#A78BFA",  border: "rgba(139,92,246,0.25)"  },
  brainwave:    { bg: "rgba(59,130,246,0.12)",  text: "#60A5FA",  border: "rgba(59,130,246,0.25)"  },
  chakra:       { bg: "rgba(245,158,11,0.12)",  text: "#FCD34D",  border: "rgba(245,158,11,0.25)"  },
  therapeutic:  { bg: "rgba(236,72,153,0.12)",  text: "#F472B6",  border: "rgba(236,72,153,0.25)"  },
  earth:        { bg: "rgba(34,197,94,0.12)",   text: "#4ADE80",  border: "rgba(34,197,94,0.25)"   },
  sacred:       { bg: "rgba(251,191,36,0.12)",  text: "#FDE68A",  border: "rgba(251,191,36,0.25)"  },
  sleep:        { bg: "rgba(99,102,241,0.12)",  text: "#818CF8",  border: "rgba(99,102,241,0.25)"  },
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface FrequencyBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (freq: HealingFrequency) => void;
  isPremiumUser: boolean;
  currentHz?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FrequencyBrowser({
  isOpen,
  onClose,
  onSelect,
  isPremiumUser,
  currentHz,
}: FrequencyBrowserProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<HealingCategory | "all">("all");
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 150);
    } else {
      setSearch("");
      setActiveCategory("all");
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return HEALING_FREQUENCIES.filter((f) => {
      const matchCat = activeCategory === "all" || f.category === activeCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.hz.toString().includes(q) ||
        f.category.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  const handleSelect = useCallback(
    (freq: HealingFrequency) => {
      if (freq.isPremium && !isPremiumUser) return;
      onSelect(freq);
      onClose();
    },
    [isPremiumUser, onSelect, onClose],
  );

  const catColors = CATEGORY_COLORS[activeCategory];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.55)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: "min(480px, 100vw)",
          background: "linear-gradient(180deg, #0D0F1E 0%, #0A0B14 100%)",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.32s cubic-bezier(0.23, 1, 0.32, 1)",
          boxShadow: isOpen ? "-24px 0 80px rgba(0,0,0,0.6)" : "none",
        }}
        role="dialog"
        aria-label="Frequency Browser"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <div className="flex items-center gap-2">
              <Zap size={16} style={{ color: "#00D4AA" }} />
              <span
                className="text-sm font-semibold tracking-wide"
                style={{ color: "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}
              >
                Healing Frequency Browser
              </span>
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}
            >
              {HEALING_FREQUENCIES.length} frequencies across{" "}
              {HEALING_CATEGORIES.length - 1} categories
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#6B7A99",
            }}
            aria-label="Close frequency browser"
          >
            <X size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-3 shrink-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "#4A5568" }}
            />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, Hz, or keyword…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-150"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#E8EDF5",
                fontFamily: "DM Sans, sans-serif",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,212,170,0.35)";
                e.currentTarget.style.background = "rgba(0,212,170,0.04)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
            />
          </div>
        </div>

        {/* Category tabs — horizontal scroll */}
        <div
          className="px-5 pb-3 shrink-0 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="flex gap-1.5 w-max">
            {HEALING_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              const colors = CATEGORY_COLORS[cat.id as HealingCategory | "all"];
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as HealingCategory | "all")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap active:scale-95"
                  style={
                    isActive
                      ? {
                          background: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                          fontFamily: "DM Sans, sans-serif",
                        }
                      : {
                          background: "rgba(255,255,255,0.03)",
                          color: "#4A5568",
                          border: "1px solid rgba(255,255,255,0.05)",
                          fontFamily: "DM Sans, sans-serif",
                        }
                  }
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results count */}
        <div
          className="px-5 pb-2 shrink-0 text-xs"
          style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}
        >
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          {search && ` for "${search}"`}
        </div>

        {/* Frequency list */}
        <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
          {filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-40 gap-2"
              style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}
            >
              <Search size={28} style={{ opacity: 0.3 }} />
              <span className="text-sm">No frequencies match your search</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((freq) => {
                const isLocked = freq.isPremium && !isPremiumUser;
                const isActive = currentHz === freq.hz;
                const catColor = CATEGORY_COLORS[freq.category];

                return (
                  <button
                    key={freq.id}
                    onClick={() => handleSelect(freq)}
                    disabled={isLocked}
                    className="w-full text-left rounded-xl p-3.5 transition-all duration-150 group"
                    style={{
                      background: isActive
                        ? "rgba(0,212,170,0.08)"
                        : "rgba(255,255,255,0.025)",
                      border: isActive
                        ? "1px solid rgba(0,212,170,0.25)"
                        : "1px solid rgba(255,255,255,0.05)",
                      opacity: isLocked ? 0.55 : 1,
                      cursor: isLocked ? "default" : "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!isLocked) {
                        e.currentTarget.style.background = isActive
                          ? "rgba(0,212,170,0.12)"
                          : "rgba(255,255,255,0.05)";
                        e.currentTarget.style.borderColor = isActive
                          ? "rgba(0,212,170,0.35)"
                          : "rgba(255,255,255,0.10)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isActive
                        ? "rgba(0,212,170,0.08)"
                        : "rgba(255,255,255,0.025)";
                      e.currentTarget.style.borderColor = isActive
                        ? "rgba(0,212,170,0.25)"
                        : "rgba(255,255,255,0.05)";
                    }}
                    aria-label={`Load ${freq.name} at ${freq.hz} Hz`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Hz badge */}
                      <div
                        className="shrink-0 rounded-lg px-2 py-1 text-center min-w-[56px]"
                        style={{
                          background: catColor.bg,
                          border: `1px solid ${catColor.border}`,
                        }}
                      >
                        <div
                          className="text-sm font-bold leading-tight"
                          style={{
                            color: catColor.text,
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {freq.hz < 1
                            ? freq.hz.toFixed(2)
                            : freq.hz % 1 === 0
                            ? freq.hz.toFixed(0)
                            : freq.hz.toFixed(2)}
                        </div>
                        <div
                          className="text-[9px] leading-tight"
                          style={{ color: catColor.text, opacity: 0.7 }}
                        >
                          Hz
                        </div>
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="text-sm font-semibold truncate"
                            style={{
                              color: isActive ? "#00D4AA" : "#E8EDF5",
                              fontFamily: "DM Sans, sans-serif",
                            }}
                          >
                            {freq.name}
                          </span>
                          {isLocked && (
                            <Lock
                              size={11}
                              className="shrink-0"
                              style={{ color: "#6B7A99" }}
                            />
                          )}
                          {freq.isPremium && isPremiumUser && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                              style={{
                                background: "rgba(139,92,246,0.15)",
                                color: "#A78BFA",
                                border: "1px solid rgba(139,92,246,0.25)",
                                fontFamily: "DM Sans, sans-serif",
                              }}
                            >
                              Premium
                            </span>
                          )}
                        </div>
                        <p
                          className="text-xs leading-relaxed line-clamp-2"
                          style={{
                            color: "#6B7A99",
                            fontFamily: "DM Sans, sans-serif",
                          }}
                        >
                          {freq.description}
                        </p>
                      </div>

                      {/* Arrow */}
                      {!isLocked && (
                        <ChevronRight
                          size={14}
                          className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          style={{ color: "#00D4AA" }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — premium upsell if not premium */}
        {!isPremiumUser && (
          <div
            className="px-5 py-3 shrink-0 flex items-center gap-3"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(139,92,246,0.06)",
            }}
          >
            <Lock size={14} style={{ color: "#A78BFA", flexShrink: 0 }} />
            <span
              className="text-xs"
              style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}
            >
              Unlock all 100 frequencies with{" "}
              <span style={{ color: "#A78BFA", fontWeight: 600 }}>Premium</span>
            </span>
          </div>
        )}
      </div>
    </>
  );
}
