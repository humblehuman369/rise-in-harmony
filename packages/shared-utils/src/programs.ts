/**
 * Structured programs catalog — static content, shared by web + mobile + API.
 * Days 1–7 free; day 8+ requires premium (enforced server-side).
 */

export type ProgramActivityType = "frequency" | "meditation" | "studio" | "breathing";

export interface ProgramDay {
  day: number;
  title: string;
  durationMinutes: number;
  activityType: ProgramActivityType;
  /** Frequency id from shared catalog, or meditation id, or studio preset name */
  activityRef: string;
  frequencyHz?: number;
  affirmation: string;
  /** Descriptive only — no medical claims */
  guidance: string;
  isPremium: boolean;
}

export interface ProgramDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  totalDays: number;
  freeDays: number;
  accentColor: string;
  icon: string;
  days: ProgramDay[];
}

function makeDays(
  freeDays: number,
  specs: Array<{
    day: number;
    title: string;
    durationMinutes: number;
    activityType: ProgramActivityType;
    activityRef: string;
    affirmation: string;
    guidance: string;
    frequencyHz?: number;
  }>
): ProgramDay[] {
  return specs.map(s => ({
    ...s,
    isPremium: s.day > freeDays,
  }));
}

/** 21 Days of Resonance — morning energy arc */
const RESONANCE_21: ProgramDefinition = {
  id: "21-days-resonance",
  name: "21 Days of Resonance",
  tagline: "A morning ritual that builds day by day",
  description:
    "Start each day with a short frequency session and a simple intention. Days 1–7 are free; continue with Premium for the full arc.",
  totalDays: 21,
  freeDays: 7,
  accentColor: "#00D4AA",
  icon: "🌅",
  days: makeDays(7, [
    { day: 1, title: "Arrive", durationMinutes: 8, activityType: "frequency", activityRef: "432", frequencyHz: 432, affirmation: "I begin gently.", guidance: "Play 432 Hz and breathe slowly for 8 minutes." },
    { day: 2, title: "Ground", durationMinutes: 10, activityType: "frequency", activityRef: "396", frequencyHz: 396, affirmation: "I am steady.", guidance: "Root yourself with 396 Hz while seated or standing." },
    { day: 3, title: "Open", durationMinutes: 10, activityType: "frequency", activityRef: "528", frequencyHz: 528, affirmation: "I welcome the day.", guidance: "Let 528 Hz fill the room as you set one intention." },
    { day: 4, title: "Focus", durationMinutes: 12, activityType: "frequency", activityRef: "alpha", frequencyHz: 200, affirmation: "I choose one clear task.", guidance: "Alpha pacing for a short focused block (headphones help)." },
    { day: 5, title: "Breathe", durationMinutes: 8, activityType: "breathing", activityRef: "calm-breath", affirmation: "My breath is enough.", guidance: "Use the Calm Breath pattern with a soft 432 Hz bed." },
    { day: 6, title: "Expand", durationMinutes: 12, activityType: "frequency", activityRef: "639", frequencyHz: 639, affirmation: "I open to connection.", guidance: "Heart-centered listening with 639 Hz." },
    { day: 7, title: "Reflect", durationMinutes: 10, activityType: "frequency", activityRef: "528", frequencyHz: 528, affirmation: "I notice what worked.", guidance: "Replay your favorite tone and log a mood (1–5)." },
    { day: 8, title: "Deepen", durationMinutes: 12, activityType: "frequency", activityRef: "741", frequencyHz: 741, affirmation: "I speak with clarity.", guidance: "Premium: Throat-center tone for expression practice." },
    { day: 9, title: "Still", durationMinutes: 15, activityType: "frequency", activityRef: "theta", frequencyHz: 200, affirmation: "I allow quiet.", guidance: "Premium: Theta pacing for restful alertness." },
    { day: 10, title: "Rise", durationMinutes: 10, activityType: "frequency", activityRef: "528", frequencyHz: 528, affirmation: "I move with ease.", guidance: "Premium: Morning 528 Hz walk or stretch." },
    { day: 11, title: "Align", durationMinutes: 12, activityType: "frequency", activityRef: "417", frequencyHz: 417, affirmation: "I release what I don't need.", guidance: "Premium: 417 Hz while journaling one line." },
    { day: 12, title: "Create", durationMinutes: 15, activityType: "studio", activityRef: "focus-flow", affirmation: "I make something small.", guidance: "Premium: Open Studio with a focus stack for 15 minutes." },
    { day: 13, title: "Restore", durationMinutes: 12, activityType: "frequency", activityRef: "174", frequencyHz: 174, affirmation: "I rest without guilt.", guidance: "Premium: Low foundation tone, eyes closed." },
    { day: 14, title: "Review", durationMinutes: 10, activityType: "frequency", activityRef: "432", frequencyHz: 432, affirmation: "I honor two weeks of practice.", guidance: "Premium: Gentle 432 Hz and a short journal note." },
    { day: 15, title: "Vision", durationMinutes: 12, activityType: "frequency", activityRef: "852", frequencyHz: 852, affirmation: "I trust my inner sense.", guidance: "Premium: Third-eye tone with soft breath." },
    { day: 16, title: "Power", durationMinutes: 10, activityType: "frequency", activityRef: "528", frequencyHz: 528, affirmation: "I act on one priority.", guidance: "Premium: 528 Hz before your most important task." },
    { day: 17, title: "Connect", durationMinutes: 12, activityType: "frequency", activityRef: "639", frequencyHz: 639, affirmation: "I reach out kindly.", guidance: "Premium: 639 Hz then send one thoughtful message." },
    { day: 18, title: "Integrate", durationMinutes: 15, activityType: "frequency", activityRef: "963", frequencyHz: 963, affirmation: "I move energy from root to crown.", guidance: "Premium: Ladder from 396→528→963 or a short chakra journey." },
    { day: 19, title: "Silence", durationMinutes: 10, activityType: "frequency", activityRef: "963", frequencyHz: 963, affirmation: "I need nothing extra.", guidance: "Premium: Highest Solfeggio tone, minimal movement." },
    { day: 20, title: "Celebrate", durationMinutes: 12, activityType: "frequency", activityRef: "528", frequencyHz: 528, affirmation: "I am proud of consistency.", guidance: "Premium: Favorite free tone + mood log." },
    { day: 21, title: "Continue", durationMinutes: 15, activityType: "frequency", activityRef: "432", frequencyHz: 432, affirmation: "This practice is mine to keep.", guidance: "Premium: Close the arc with 432 Hz and choose tomorrow's first step." },
  ]),
};

/** 7 Nights of Deep Sleep — fully free */
const SLEEP_7: ProgramDefinition = {
  id: "7-nights-sleep",
  name: "7 Nights of Deep Sleep",
  tagline: "Wind down with the same gentle pattern each night",
  description:
    "A one-week evening arc: frequency, breath, and sleep-timer habits. Fully free so anyone can complete it.",
  totalDays: 7,
  freeDays: 7,
  accentColor: "#8B5CF6",
  icon: "🌙",
  days: makeDays(7, [
    { day: 1, title: "Dim the day", durationMinutes: 12, activityType: "frequency", activityRef: "432", frequencyHz: 432, affirmation: "I put the day down.", guidance: "Play 432 Hz with lights low for 12 minutes." },
    { day: 2, title: "Longer exhale", durationMinutes: 10, activityType: "breathing", activityRef: "4-7-8", affirmation: "My nervous system can soften.", guidance: "4-7-8 breath with optional soft rain layer." },
    { day: 3, title: "Delta drift", durationMinutes: 15, activityType: "frequency", activityRef: "delta", frequencyHz: 100, affirmation: "I allow sleepiness.", guidance: "Delta binaural pacing with headphones if available." },
    { day: 4, title: "Body scan", durationMinutes: 15, activityType: "meditation", activityRef: "full-body-scan", frequencyHz: 174, affirmation: "I notice without fixing.", guidance: "Guided body-scan meditation or self-guided with 174 Hz." },
    { day: 5, title: "Ocean bed", durationMinutes: 20, activityType: "studio", activityRef: "sleep-ocean", affirmation: "I have nowhere to be.", guidance: "Studio: ocean + low tone + sleep timer 20 min." },
    { day: 6, title: "Gratitude close", durationMinutes: 10, activityType: "frequency", activityRef: "528", frequencyHz: 528, affirmation: "One good thing was enough.", guidance: "528 Hz while naming one gentle highlight." },
    { day: 7, title: "Ritual sealed", durationMinutes: 15, activityType: "frequency", activityRef: "432", frequencyHz: 432, affirmation: "I know how to return here.", guidance: "Repeat your favorite night so far; set a wind-down alarm for tomorrow." },
  ]),
};

export const PROGRAMS: ProgramDefinition[] = [RESONANCE_21, SLEEP_7];

export function getProgramById(id: string): ProgramDefinition | undefined {
  return PROGRAMS.find(p => p.id === id);
}

export function getProgramDay(
  programId: string,
  dayNumber: number
): ProgramDay | undefined {
  const program = getProgramById(programId);
  return program?.days.find(d => d.day === dayNumber);
}

/** Whether a day requires premium for the given program. */
export function isProgramDayPremium(programId: string, dayNumber: number): boolean {
  const d = getProgramDay(programId, dayNumber);
  return d?.isPremium ?? dayNumber > 7;
}
