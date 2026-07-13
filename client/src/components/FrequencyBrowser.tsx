/**
 * FrequencyBrowser — Slide-out panel for browsing 100 healing frequencies
 *
 * Features:
 * - Slide-in from the right (fixed overlay)
 * - Search bar (name, hz, description)
 * - Category filter tabs + ★ Favorites tab
 * - Heart-toggle on every card (server-synced for auth users, localStorage for guests)
 * - Click any entry to load it into the Precision Player
 * - Premium entries show a lock badge; free entries load immediately
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { X, Search, Lock, Zap, ChevronRight, Heart } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import {
  HEALING_FREQUENCIES,
  HEALING_CATEGORIES,
  type HealingFrequency,
  type HealingCategory,
} from "@/data/healingFrequencies";

// ── Constants ─────────────────────────────────────────────────────────────────
const LS_KEY = "rih_browser_favorites";

// ── Category colour map ───────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<HealingCategory | "all" | "favorites", { bg: string; text: string; border: string }> = {
  all:          { bg: "rgba(255,255,255,0.06)", text: "#8FA3BF",  border: "rgba(255,255,255,0.10)" },
  favorites:    { bg: "rgba(236,72,153,0.12)",  text: "#F472B6",  border: "rgba(236,72,153,0.25)"  },
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

type ActiveTab = HealingCategory | "all" | "favorites";

// ── localStorage helpers ──────────────────────────────────────────────────────
function lsGetFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function lsSetFavorites(ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
  } catch {
    // storage full — ignore
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FrequencyBrowser({
  isOpen,
  onClose,
  onSelect,
  isPremiumUser,
  currentHz,
}: FrequencyBrowserProps) {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [localFavIds, setLocalFavIds] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Server favorites (authenticated users) ──────────────────────────────────
  const { data: serverFavs, refetch: refetchFavs } = trpc.healingFavorites.list.useQuery(
    undefined,
    { enabled: isAuthenticated && isOpen },
  );
  const toggleMutation = trpc.healingFavorites.toggle.useMutation({
    onSuccess: () => { void refetchFavs(); },
  });

  // Derive the active favorite IDs set
  const favIds: Set<string> = useMemo(() => {
    if (isAuthenticated && serverFavs) {
      return new Set(serverFavs.map((f) => f.frequencyId));
    }
    return localFavIds;
  }, [isAuthenticated, serverFavs, localFavIds]);

  // Load localStorage favorites on mount
  useEffect(() => {
    setLocalFavIds(lsGetFavorites());
  }, []);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 150);
    } else {
      setSearch("");
      setActiveTab("all");
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

  // ── Toggle favorite ─────────────────────────────────────────────────────────
  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent, freq: HealingFrequency) => {
      e.stopPropagation();
      const isFav = favIds.has(freq.id);

      if (isAuthenticated) {
        toggleMutation.mutate(
          { frequencyId: freq.id, hz: freq.hz, name: freq.name, category: freq.category },
          {
            onSuccess: (data) => {
              toast(data.isFavorited ? `Added to Favorites` : `Removed from Favorites`, {
                description: freq.name,
                duration: 1800,
              });
            },
          },
        );
      } else {
        // Guest — localStorage only
        const next = new Set(localFavIds);
        if (isFav) {
          next.delete(freq.id);
          toast("Removed from Favorites", { description: freq.name, duration: 1800 });
        } else {
          next.add(freq.id);
          toast("Added to Favorites", { description: freq.name, duration: 1800 });
        }
        setLocalFavIds(next);
        lsSetFavorites(next);
      }
    },
    [favIds, isAuthenticated, localFavIds, toggleMutation],
  );

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return HEALING_FREQUENCIES.filter((f) => {
      // Favorites tab
      if (activeTab === "favorites") {
        if (!favIds.has(f.id)) return false;
      } else if (activeTab !== "all") {
        if (f.category !== activeTab) return false;
      }
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.hz.toString().includes(q) ||
        f.category.toLowerCase().includes(q)
      );
    });
  }, [search, activeTab, favIds]);

  const handleSelect = useCallback(
    (freq: HealingFrequency) => {
      if (freq.isPremium && !isPremiumUser) return;
      onSelect(freq);
      onClose();
    },
    [isPremiumUser, onSelect, onClose],
  );

  // Build tab list: All + Favorites + categories
  const allTabs: Array<{ id: ActiveTab; label: string }> = [
    { id: "all", label: `All (${HEALING_FREQUENCIES.length})` },
    { id: "favorites", label: `★ Favorites${favIds.size > 0 ? ` (${favIds.size})` : ""}` },
    ...HEALING_CATEGORIES.filter((c) => c.id !== "all").map((c) => ({ id: c.id as ActiveTab, label: c.label })),
  ];

  const catColors = CATEGORY_COLORS[activeTab] ?? CATEGORY_COLORS.all;
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: isLight ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.55)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: "min(480px, 100vw)",
          background: isLight ? "linear-gradient(180deg, #FFFFFF 0%, #F5F6F9 100%)" : "linear-gradient(180deg, #0D0F1E 0%, #0A0B14 100%)",
          borderLeft: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.07)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.32s cubic-bezier(0.23, 1, 0.32, 1)",
          boxShadow: isOpen ? (isLight ? "-24px 0 60px rgba(0,0,0,0.12)" : "-24px 0 80px rgba(0,0,0,0.6)") : "none",
        }}
        role="dialog"
        aria-label="Frequency Browser"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <div className="flex items-center gap-2">
              <Zap size={16} style={{ color: "#00D4AA" }} />
              <span
                className="text-sm font-semibold tracking-wide"
                style={{ color: isLight ? "#1A1D2E" : "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}
              >
                Healing Frequency Browser
              </span>
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}
            >
              {HEALING_FREQUENCIES.length} frequencies · {favIds.size} saved
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-95"
            style={{
              background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)",
              border: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.08)",
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
                background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
                border: isLight ? "1px solid rgba(0,0,0,0.09)" : "1px solid rgba(255,255,255,0.08)",
                color: isLight ? "#1A1D2E" : "#E8EDF5",
                fontFamily: "DM Sans, sans-serif",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,212,170,0.35)";
                e.currentTarget.style.background = "rgba(0,212,170,0.04)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isLight ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.08)";
                e.currentTarget.style.background = isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)";
              }}
            />
          </div>
        </div>

        {/* Tab bar — horizontal scroll */}
        <div
          className="px-5 pb-3 shrink-0 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="flex gap-1.5 w-max">
            {allTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const colors = CATEGORY_COLORS[tab.id] ?? CATEGORY_COLORS.all;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
                          background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)",
                          color: "#4A5568",
                          border: isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.05)",
                          fontFamily: "DM Sans, sans-serif",
                        }
                  }
                >
                  {tab.label}
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
        <div
          className="flex-1 overflow-y-auto px-5 pb-6"
          style={{ scrollbarWidth: "thin", scrollbarColor: isLight ? "rgba(0,0,0,0.12) transparent" : "rgba(255,255,255,0.08) transparent" }}
        >
          {filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-40 gap-2"
              style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}
            >
              {activeTab === "favorites" ? (
                <>
                  <Heart size={28} style={{ opacity: 0.3 }} />
                  <span className="text-sm">No favorites yet</span>
                  <span className="text-xs opacity-60">Tap the heart on any frequency to save it here</span>
                </>
              ) : (
                <>
                  <Search size={28} style={{ opacity: 0.3 }} />
                  <span className="text-sm">No frequencies match your search</span>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((freq) => {
                const isLocked = freq.isPremium && !isPremiumUser;
                const isActive = currentHz === freq.hz;
                const isFav = favIds.has(freq.id);
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
                        : (isLight ? "rgba(0,0,0,0.025)" : "rgba(255,255,255,0.025)"),
                      border: isActive
                        ? "1px solid rgba(0,212,170,0.25)"
                        : (isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.05)"),
                      opacity: isLocked ? 0.55 : 1,
                      cursor: isLocked ? "default" : "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!isLocked) {
                        e.currentTarget.style.background = isActive
                          ? "rgba(0,212,170,0.12)"
                          : (isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)");
                        e.currentTarget.style.borderColor = isActive
                          ? "rgba(0,212,170,0.35)"
                          : (isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.10)");
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isActive
                        ? "rgba(0,212,170,0.08)"
                        : (isLight ? "rgba(0,0,0,0.025)" : "rgba(255,255,255,0.025)");
                      e.currentTarget.style.borderColor = isActive
                        ? "rgba(0,212,170,0.25)"
                        : (isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.05)");
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
                              color: isActive ? "#00D4AA" : (isLight ? "#1A1D2E" : "#E8EDF5"),
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

                      {/* Right side: heart + arrow */}
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        {/* Heart toggle — uses div+role to avoid nested <button> */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => handleToggleFavorite(e, freq)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleFavorite(e as any, freq); } }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer"
                          style={{
                              background: isFav
                              ? "rgba(236,72,153,0.15)"
                              : (isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)"),
                            border: isFav
                              ? "1px solid rgba(236,72,153,0.3)"
                              : (isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)"),
                          }}
                          aria-label={isFav ? `Remove ${freq.name} from favorites` : `Add ${freq.name} to favorites`}
                          title={isFav ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Heart
                            size={13}
                            style={{
                              color: isFav ? "#F472B6" : "#4A5568",
                              fill: isFav ? "#F472B6" : "none",
                              transition: "color 0.15s, fill 0.15s",
                            }}
                          />
                        </div>

                        {/* Load arrow */}
                        {!isLocked && (
                          <ChevronRight
                            size={14}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                            style={{ color: "#00D4AA" }}
                          />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isPremiumUser ? (
          <div
            className="px-5 py-3 shrink-0 flex items-center gap-3"
            style={{
              borderTop: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)",
              background: isLight ? "rgba(139,92,246,0.05)" : "rgba(139,92,246,0.06)",
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
        ) : !isAuthenticated ? (
          <div
            className="px-5 py-3 shrink-0 flex items-center gap-3"
            style={{
              borderTop: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)",
              background: isLight ? "rgba(0,212,170,0.04)" : "rgba(0,212,170,0.04)",
            }}
          >
            <Heart size={14} style={{ color: "#00D4AA", flexShrink: 0 }} />
            <span
              className="text-xs"
              style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}
            >
              Sign in to sync your favorites across devices
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
}
