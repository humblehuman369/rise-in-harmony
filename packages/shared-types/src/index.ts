/**
 * @rih/shared-types
 *
 * TypeScript interfaces shared across all Rise In Harmony surfaces:
 * web app (apps/web), mobile app (apps/mobile), and API (apps/api).
 *
 * All types here must be platform-agnostic — no React, React Native,
 * or Node.js-specific imports allowed.
 */

// ─── User ─────────────────────────────────────────────────────────────────────

export type SubscriptionTier = "free" | "premium" | "lifetime";
export type UserRole = "user" | "admin";
export type OnboardingGoal =
  | "sleep"
  | "stress"
  | "focus"
  | "morning"
  | "spiritual"
  | "healing";

export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt: string | null; // ISO 8601 UTC
  onboardingGoal: OnboardingGoal | null;
  onboardingCompleted: boolean;
  createdAt: string; // ISO 8601 UTC
  lastSignedIn: string; // ISO 8601 UTC
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export type SessionType =
  | "single"
  | "chakra_sequence"
  | "studio_mix"
  | "sleep_timer";

export interface Session {
  id: number;
  userId: number;
  frequencyHz: number;
  frequencyName: string | null;
  sessionType: SessionType;
  studioPresetName: string | null;
  durationSeconds: number;
  moodRating: number | null; // 1–5
  journalNote: string | null;
  intention: string | null;
  startedAt: string; // ISO 8601 UTC
  endedAt: string | null; // ISO 8601 UTC
}

export interface SessionStats {
  totalSessions: number;
  totalMinutes: number;
  avgMoodRating: number;
  currentStreak: number;
  recentSessions: Session[];
  topFrequencies: Array<{
    frequencyName: string | null;
    frequencyHz: number;
    count: number;
  }>;
}

// ─── Alarms ───────────────────────────────────────────────────────────────────

export type AlarmDayOfWeek =
  | "Mon"
  | "Tue"
  | "Wed"
  | "Thu"
  | "Fri"
  | "Sat"
  | "Sun";

export interface Alarm {
  id: number;
  userId: number;
  label: string | null;
  hour: number; // 0–23
  minute: number; // 0–59
  days: AlarmDayOfWeek[];
  frequencyHz: number;
  frequencyName: string | null;
  studioMixName: string | null;
  fadeInMinutes: number;
  isActive: boolean;
  time: string; // HH:MM format (derived from hour + minute)
  createdAt: string; // ISO 8601 UTC
}

// ─── Frequencies ──────────────────────────────────────────────────────────────

export interface Frequency {
  id: string;
  hz: number;
  name: string;
  benefit: string;
  color: string;
  isPremium: boolean;
  category: "solfeggio" | "binaural";
  chakraPosition?: number; // 1 (Root) – 7 (Crown)
  chakraName?: string;
  pronunciation?: string;
  affirmation?: string;
}

// ─── Meditations ──────────────────────────────────────────────────────────────

export type MeditationCategory =
  | "morning"
  | "sleep"
  | "stress"
  | "focus"
  | "healing"
  | "spiritual";

export type NatureSoundscape =
  | "rain"
  | "ocean"
  | "forest"
  | "wind"
  | "fire"
  | "bowl"
  | "silence";

export type MusicMode = "ambient" | "drone" | "crystal" | "none";

export interface Meditation {
  id: string;
  title: string;
  subtitle: string;
  category: MeditationCategory;
  durationMinutes: number;
  description: string;
  benefit: string;
  /** Lucide icon name (web); mobile maps this to an emoji */
  icon: string;
  /** Accent color for the card */
  color: string;
  /** Secondary color for gradients */
  colorSecondary: string;
  /** Nature soundscape to layer underneath */
  soundscape: NatureSoundscape;
  /** Music mode to layer underneath (not yet supported on mobile) */
  musicMode: MusicMode;
  /** ID from the shared FREQUENCIES catalog — the recommended pairing */
  recommendedFrequencyId: string;
  /** Short label for the recommended frequency */
  recommendedFrequencyLabel: string;
  /** Why this frequency pairs well */
  frequencyRationale: string;
  /** Affirmation or intention for this meditation */
  affirmation: string;
  /** Step-by-step guidance script (shown as timed on-screen prompts) */
  guidance: string[];
  isPremium: boolean;
}

// ─── Studio Presets ───────────────────────────────────────────────────────────

export interface StudioPreset {
  id: number;
  userId: number;
  name: string;
  frequencyHz: number;
  frequencyName: string | null;
  musicTrack: string | null;
  natureSound: string | null;
  frequencyVolume: number; // 0–1
  musicVolume: number; // 0–1
  natureSoundVolume: number; // 0–1
  createdAt: string; // ISO 8601 UTC
}

// ─── Sound Studio (layered mixer) ────────────────────────────────────────────

export type StudioNatureSound = "rain" | "ocean" | "forest" | "wind" | "fire" | "none";
export type StudioMusicMode = MusicMode;

export interface StudioMixSettings {
  frequencyHz: number;
  musicMode: StudioMusicMode;
  natureSound: StudioNatureSound;
  frequencyVolume: number; // 0–1
  musicVolume: number; // 0–1
  natureVolume: number; // 0–1
  masterVolume?: number; // 0–1
}

export interface StudioBuiltinPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  settings: StudioMixSettings;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  expiresAt: string | null; // ISO 8601 UTC
  isPremium: boolean;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiSuccess<T = void> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T = void> = ApiSuccess<T> | ApiError;

// ─── PostHog Events ───────────────────────────────────────────────────────────

export interface SessionStartedEvent {
  frequency_hz: number;
  frequency_name?: string;
  session_type: SessionType;
  is_premium: boolean;
  source: "player" | "studio" | "alarm" | "chakra_sequence" | "precision";
}

export interface SessionEndedEvent {
  frequency_hz: number;
  duration_seconds: number;
  mood_rating?: number;
  had_journal_entry: boolean;
}

export interface PaywallViewedEvent {
  trigger: "locked_frequency" | "alarm_limit" | "sequence_end";
  placement: "player" | "library" | "studio" | "sequence_completion";
}

export interface ChakraSequenceCompletedEvent {
  total_duration_minutes: number;
  duration_per_chakra_minutes: number;
}

export interface OnboardingCompletedEvent {
  goal: OnboardingGoal | "skipped";
}
