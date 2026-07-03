/**
 * @rih/shared-utils
 *
 * Shared utility functions and the canonical frequency catalog.
 * Used by web app, mobile app, and API — no platform-specific imports.
 */

import type { Frequency, OnboardingGoal } from "@rih/shared-types";

export {
  MEDITATIONS,
  MEDITATION_CATEGORIES,
  FREE_MEDITATIONS,
} from "./meditations";

// ─── Frequency Catalog ────────────────────────────────────────────────────────

export const FREQUENCIES: Frequency[] = [
  // Solfeggio
  {
    id: "174",
    hz: 174,
    name: "Foundation",
    benefit: "Pain relief & security",
    color: "#6B7280",
    isPremium: false,
    category: "solfeggio",
  },
  {
    id: "285",
    hz: 285,
    name: "Quantum Cognition",
    benefit: "Tissue regeneration",
    color: "#10B981",
    isPremium: true,
    category: "solfeggio",
  },
  {
    id: "396",
    hz: 396,
    name: "Liberation",
    benefit: "Release guilt & fear",
    color: "#EF4444",
    isPremium: false,
    category: "solfeggio",
    chakraPosition: 1,
    chakraName: "Root Chakra",
    pronunciation: "Mūlādhāra · moo-LAH-dah-rah",
    affirmation: "I am grounded, safe, and secure.",
  },
  {
    id: "417",
    hz: 417,
    name: "Transmutation",
    benefit: "Undo negative situations",
    color: "#F97316",
    isPremium: true,
    category: "solfeggio",
    chakraPosition: 2,
    chakraName: "Sacral Chakra",
    pronunciation: "Svādhiṣṭhāna · svah-dees-THAH-nah",
    affirmation: "I embrace pleasure, creativity, and flow.",
  },
  {
    id: "432",
    hz: 432,
    name: "Universal Harmony",
    benefit: "Natural tuning & calm",
    color: "#3B82F6",
    isPremium: false,
    category: "solfeggio",
  },
  {
    id: "528",
    hz: 528,
    name: "Miracle Tone",
    benefit: "DNA repair & transformation",
    color: "#00D4AA",
    isPremium: false,
    category: "solfeggio",
    chakraPosition: 3,
    chakraName: "Solar Plexus Chakra",
    pronunciation: "Maṇipūra · mah-nee-POO-rah",
    affirmation: "I am confident, powerful, and worthy.",
  },
  {
    id: "639",
    hz: 639,
    name: "Connection",
    benefit: "Relationships & harmony",
    color: "#22C55E",
    isPremium: true,
    category: "solfeggio",
    chakraPosition: 4,
    chakraName: "Heart Chakra",
    pronunciation: "Anāhata · ah-NAH-ha-ta",
    affirmation: "I give and receive love freely.",
  },
  {
    id: "741",
    hz: 741,
    name: "Awakening",
    benefit: "Expression & solutions",
    color: "#3B82F6",
    isPremium: true,
    category: "solfeggio",
    chakraPosition: 5,
    chakraName: "Throat Chakra",
    pronunciation: "Viśuddha · vee-SHOO-dah",
    affirmation: "I speak my truth with clarity and grace.",
  },
  {
    id: "852",
    hz: 852,
    name: "Third Eye",
    benefit: "Intuition & inner strength",
    color: "#8B5CF6",
    isPremium: true,
    category: "solfeggio",
    chakraPosition: 6,
    chakraName: "Third Eye Chakra",
    pronunciation: "Ājñā · AHJ-nyah",
    affirmation: "I trust my intuition and inner wisdom.",
  },
  {
    id: "963",
    hz: 963,
    name: "Divine Consciousness",
    benefit: "Pineal activation & unity",
    color: "#A855F7",
    isPremium: true,
    category: "solfeggio",
    chakraPosition: 7,
    chakraName: "Crown Chakra",
    pronunciation: "Sahasrāra · sah-has-RAH-rah",
    affirmation: "I am connected to the divine and all that is.",
  },
  // Binaural
  {
    id: "alpha",
    hz: 10,
    name: "Alpha Focus",
    benefit: "Deep focus & flow state",
    color: "#F59E0B",
    isPremium: true,
    category: "binaural",
  },
  {
    id: "theta",
    hz: 6,
    name: "Theta Meditation",
    benefit: "Deep meditation & creativity",
    color: "#EC4899",
    isPremium: true,
    category: "binaural",
  },
  {
    id: "delta",
    hz: 2,
    name: "Delta Sleep",
    benefit: "Deep sleep & healing",
    color: "#6366F1",
    isPremium: true,
    category: "binaural",
  },
];

export const CHAKRA_FREQUENCIES = FREQUENCIES.filter(
  (f) => f.category === "solfeggio" && f.chakraPosition !== undefined
).sort((a, b) => (a.chakraPosition ?? 0) - (b.chakraPosition ?? 0));

export const FREE_FREQUENCIES = FREQUENCIES.filter((f) => !f.isPremium);

// ─── Streak Calculation ───────────────────────────────────────────────────────

/**
 * Calculate the current streak from a sorted list of session dates (UTC).
 * A streak is the number of consecutive calendar days (in UTC) ending today
 * or yesterday on which at least one session was completed.
 */
export function calculateStreak(sessionDatesUtc: Date[]): number {
  if (sessionDatesUtc.length === 0) return 0;

  const toDay = (d: Date) =>
    Math.floor(d.getTime() / (1000 * 60 * 60 * 24));

  const today = toDay(new Date());
  const uniqueDays = [
    ...new Set(sessionDatesUtc.map((d) => toDay(d))),
  ].sort((a, b) => b - a); // descending

  // Streak must include today or yesterday
  if (uniqueDays[0] < today - 1) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    if (uniqueDays[i - 1] - uniqueDays[i] === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export const ONBOARDING_GOALS: Array<{
  id: OnboardingGoal;
  label: string;
  description: string;
}> = [
  {
    id: "morning",
    label: "Morning Ritual",
    description: "Start each day with intention and energy",
  },
  {
    id: "sleep",
    label: "Better Sleep",
    description: "Wind down and drift into deep, restful sleep",
  },
  {
    id: "stress",
    label: "Stress Relief",
    description: "Release tension and find calm in the moment",
  },
  {
    id: "focus",
    label: "Deep Focus",
    description: "Enter flow state for work or study",
  },
  {
    id: "spiritual",
    label: "Spiritual Growth",
    description: "Deepen meditation and expand awareness",
  },
  {
    id: "healing",
    label: "Healing Journey",
    description: "Support physical and emotional recovery",
  },
];

// ─── Formatting Helpers ───────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function formatHz(hz: number): string {
  return `${hz}Hz`;
}

export function formatStreakLabel(days: number): string {
  if (days === 0) return "No streak yet";
  if (days === 1) return "1 day streak";
  return `${days} day streak`;
}

// ─── Subscription Helpers ─────────────────────────────────────────────────────

export function isPremiumUser(tier: string): boolean {
  return tier === "premium" || tier === "lifetime";
}

export function isFrequencyUnlocked(
  frequency: Frequency,
  tier: string
): boolean {
  if (!frequency.isPremium) return true;
  return isPremiumUser(tier);
}
