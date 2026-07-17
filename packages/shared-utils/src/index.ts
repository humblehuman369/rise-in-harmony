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

export {
  STUDIO_FREQUENCIES,
  STUDIO_MUSIC_MODES,
  STUDIO_NATURE_SOUNDS,
  STUDIO_PRESETS,
  droneFreqs,
  ambientChordFreqs,
  bowlFreqs,
} from "./studio";

export {
  PROGRAMS,
  getProgramById,
  getProgramDay,
  isProgramDayPremium,
  type ProgramDefinition,
  type ProgramDay,
  type ProgramActivityType,
} from "./programs";

// ─── Frequency Catalog ────────────────────────────────────────────────────────

export const FREQUENCIES: Frequency[] = [
  // Solfeggio
  {
    id: "174",
    hz: 174,
    name: "Foundation",
    benefit: "Deep calm & security",
    color: "#6B7280",
    isPremium: false,
    category: "solfeggio",
  },
  {
    id: "285",
    hz: 285,
    name: "Quantum Cognition",
    benefit: "Renewal & restoration",
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
    benefit: "Love & transformation",
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
    benefit: "Unity & transcendence",
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
    hz: 3,
    name: "Delta Sleep",
    benefit: "Deep sleep & nightly reset",
    color: "#6366F1",
    isPremium: true,
    category: "binaural",
  },
  // Extended — isochronic & Earth resonance
  {
    id: "alpha-isochronic",
    hz: 10,
    name: "Alpha Isochronic",
    benefit: "Focused clarity — no headphones needed",
    color: "#F59E0B",
    isPremium: true,
    category: "isochronic",
  },
  {
    id: "schumann",
    hz: 7.83,
    name: "Schumann Resonance",
    benefit: "Earth's heartbeat — grounding & balance",
    color: "#22C55E",
    isPremium: true,
    category: "binaural",
  },
  // Recorded Schumann binaural sessions (Sinta Positivo — All Hertz Frequencies)
  // Pre-mixed studio recordings: Solfeggio carrier + 7.83Hz Schumann binaural
  // beat. Served from Manus storage (S3/CloudFront) via the /manus-storage
  // proxy on the web host; not synthesized. Headphones required.
  ...([
    { hz: 174, name: "Foundation", color: "#6B7280", isPremium: true, key: "binaural-174_7724fc00" },
    { hz: 285, name: "Quantum Cognition", color: "#10B981", isPremium: true, key: "binaural-285_6609f8ba" },
    { hz: 396, name: "Liberation", color: "#EF4444", isPremium: true, key: "binaural-396_e0297d89" },
    { hz: 417, name: "Transmutation", color: "#84CC16", isPremium: true, key: "binaural-417_8c90d437" },
    { hz: 432, name: "Natural Harmony", color: "#00D4AA", isPremium: false, key: "binaural-432_f5a497d0" },
    { hz: 528, name: "Miracle Tone", color: "#06B6D4", isPremium: false, key: "binaural-528_e2b21090" },
    { hz: 639, name: "Connection", color: "#3B82F6", isPremium: true, key: "binaural-639_22da3d79" },
    { hz: 741, name: "Awakening", color: "#8B5CF6", isPremium: true, key: "binaural-741_8aa6ae82" },
    { hz: 852, name: "Spiritual Order", color: "#A855F7", isPremium: true, key: "binaural-852_2d0302ae" },
    { hz: 963, name: "Divine Consciousness", color: "#EC4899", isPremium: true, key: "binaural-963_6aeda3b9" },
  ] as const).map(
    ({ hz, name, color, isPremium, key }): Frequency => ({
      id: `recorded-${hz}`,
      hz,
      name: `${name} · Schumann`,
      benefit: `Studio-mixed ${hz}Hz + 7.83Hz Schumann binaural — headphones required`,
      color,
      isPremium,
      category: "recorded",
      audioUrl: `/manus-storage/${key}.mp3`,
    })
  ),
];

export const CHAKRA_FREQUENCIES = FREQUENCIES.filter(
  (f) => f.category === "solfeggio" && f.chakraPosition !== undefined
).sort((a, b) => (a.chakraPosition ?? 0) - (b.chakraPosition ?? 0));

export const FREE_FREQUENCIES = FREQUENCIES.filter((f) => !f.isPremium);

// ─── Streak Calculation ───────────────────────────────────────────────────────

/** Format a Date as YYYY-MM-DD in the given IANA timezone (default UTC). */
export function formatDayKey(date: Date, timeZone = "UTC"): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function previousDayKey(dayKey: string, timeZone = "UTC"): string {
  if (timeZone === "UTC") {
    const d = new Date(`${dayKey}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  let t = Date.parse(`${dayKey}T12:00:00.000Z`);
  for (let i = 0; i < 48; i++) {
    t -= 60 * 60 * 1000;
    const key = formatDayKey(new Date(t), timeZone);
    if (key !== dayKey) return key;
  }
  const utc = new Date(`${dayKey}T12:00:00.000Z`);
  utc.setUTCDate(utc.getUTCDate() - 1);
  return utc.toISOString().slice(0, 10);
}

/**
 * Calculate the current streak from session timestamps.
 * Consecutive calendar days in `timeZone` ending today or yesterday.
 */
export function calculateStreak(
  sessionDates: Date[],
  options: { timeZone?: string; now?: Date } = {}
): number {
  const timeZone = options.timeZone || "UTC";
  const now = options.now ?? new Date();
  if (sessionDates.length === 0) return 0;

  const set = new Set(sessionDates.map(d => formatDayKey(d, timeZone)));
  const todayKey = formatDayKey(now, timeZone);
  const yesterdayKey = previousDayKey(todayKey, timeZone);

  let cursor: string | null = null;
  if (set.has(todayKey)) cursor = todayKey;
  else if (set.has(yesterdayKey)) cursor = yesterdayKey;
  else return 0;

  let streak = 0;
  while (cursor && set.has(cursor)) {
    streak++;
    cursor = previousDayKey(cursor, timeZone);
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

/**
 * Canonical goal → frequency id mapping (web + mobile must stay aligned).
 * Frequency ids match the shared FREQUENCIES catalog.
 */
export const GOAL_RECOMMENDED_FREQUENCY: Record<
  OnboardingGoal,
  { frequencyId: string; hz: number; name: string; benefit: string }
> = {
  morning: {
    frequencyId: "528",
    hz: 528,
    name: "Miracle Tone",
    benefit:
      "528Hz — the Miracle Tone — is a popular morning frequency for energy and intention.",
  },
  sleep: {
    frequencyId: "delta",
    hz: 200,
    name: "Delta Waves",
    benefit:
      "Delta-range binaural pacing is commonly used for deep rest and sleep support (headphones recommended).",
  },
  stress: {
    frequencyId: "432",
    hz: 432,
    name: "Universal Harmony",
    benefit:
      "432Hz is widely used for calm, grounded listening sessions without requiring headphones.",
  },
  focus: {
    frequencyId: "alpha",
    hz: 200,
    name: "Alpha Waves",
    benefit:
      "Alpha binaural pacing is often used for relaxed focus and creative flow (headphones recommended).",
  },
  spiritual: {
    frequencyId: "963",
    hz: 963,
    name: "Divine Consciousness",
    benefit:
      "963Hz is traditionally associated with meditative and contemplative practice.",
  },
  healing: {
    frequencyId: "174",
    hz: 174,
    name: "Foundation",
    benefit:
      "174Hz is the deepest Solfeggio tone in our catalog — many people use it for grounding and body-scan rest.",
  },
};

/** Speaker-safe alternatives when the primary recommendation needs headphones. */
export const SPEAKER_SAFE_FREQUENCY_SWAP: Record<
  string,
  { frequencyId: string; hz: number; name: string; benefit: string }
> = {
  delta: {
    frequencyId: "432",
    hz: 432,
    name: "Universal Harmony",
    benefit:
      "432Hz for calm evenings — works on any speaker, no headphones needed.",
  },
  theta: {
    frequencyId: "432",
    hz: 432,
    name: "Universal Harmony",
    benefit:
      "432Hz for calm evenings — works on any speaker, no headphones needed.",
  },
  alpha: {
    frequencyId: "alpha-isochronic",
    hz: 10,
    name: "Alpha Isochronic",
    benefit:
      "10Hz isochronic pulses for focus — works on speakers without headphones.",
  },
};

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
