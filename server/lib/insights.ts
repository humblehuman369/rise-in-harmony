/**
 * Personal Resonance Insights — descriptive analytics only (no medical claims).
 */
import type { Session } from "../../drizzle/schema";

export type TimeBucket = "morning" | "afternoon" | "evening" | "night";

export interface WeeklyInsights {
  windowDays: number;
  sessionCount: number;
  moodLoggedCount: number;
  totalMinutes: number;
  minutesThisWeek: number;
  minutesPrevWeek: number;
  minutesTrendPct: number | null;
  topMoodFrequency: {
    frequencyHz: number;
    frequencyName: string | null;
    avgMood: number;
    sampleSize: number;
  } | null;
  bestTimeOfDay: {
    bucket: TimeBucket;
    avgMood: number;
    sampleSize: number;
  } | null;
  streakMood: {
    avgOnStreakDays: number | null;
    avgOffStreakDays: number | null;
    sampleOn: number;
    sampleOff: number;
  };
  coaching: string[];
  ready: boolean;
}

function timeBucket(date: Date, timeZone = "UTC"): TimeBucket {
  let hour: number;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).formatToParts(date);
    hour = parseInt(parts.find(p => p.type === "hour")?.value ?? "12", 10);
  } catch {
    hour = date.getUTCHours();
  }
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function dayKey(d: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Compute weekly insights from recent sessions.
 * `streakDayKeys` optional set of YYYY-MM-DD days that count as streak days.
 */
export function computeWeeklyInsights(
  sessions: Session[],
  options: { timeZone?: string; now?: Date; streakDayKeys?: Set<string> } = {}
): WeeklyInsights {
  const timeZone = options.timeZone || "UTC";
  const now = options.now ?? new Date();
  const weekMs = 7 * 86_400_000;
  const thisWeekStart = new Date(now.getTime() - weekMs);
  const prevWeekStart = new Date(now.getTime() - 2 * weekMs);

  const thisWeek = sessions.filter(
    s => new Date(s.startedAt).getTime() >= thisWeekStart.getTime()
  );
  const prevWeek = sessions.filter(s => {
    const t = new Date(s.startedAt).getTime();
    return t >= prevWeekStart.getTime() && t < thisWeekStart.getTime();
  });

  const minutesThisWeek = Math.round(
    thisWeek.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60
  );
  const minutesPrevWeek = Math.round(
    prevWeek.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60
  );
  const minutesTrendPct =
    minutesPrevWeek > 0
      ? Math.round(((minutesThisWeek - minutesPrevWeek) / minutesPrevWeek) * 100)
      : minutesThisWeek > 0
        ? 100
        : null;

  // Top mood frequency (min 3 mood samples)
  const moodByHz = new Map<
    number,
    { name: string | null; moods: number[] }
  >();
  for (const s of sessions) {
    if (s.moodRating == null) continue;
    const entry = moodByHz.get(s.frequencyHz) ?? {
      name: s.frequencyName,
      moods: [],
    };
    entry.moods.push(s.moodRating);
    if (!entry.name && s.frequencyName) entry.name = s.frequencyName;
    moodByHz.set(s.frequencyHz, entry);
  }
  let topMoodFrequency: WeeklyInsights["topMoodFrequency"] = null;
  for (const [hz, data] of moodByHz) {
    if (data.moods.length < 3) continue;
    const a = avg(data.moods);
    if (!topMoodFrequency || a > topMoodFrequency.avgMood) {
      topMoodFrequency = {
        frequencyHz: hz,
        frequencyName: data.name,
        avgMood: Math.round(a * 10) / 10,
        sampleSize: data.moods.length,
      };
    }
  }

  // Best time of day by avg mood (min 2 samples)
  const byBucket = new Map<TimeBucket, number[]>();
  for (const s of sessions) {
    if (s.moodRating == null) continue;
    const b = timeBucket(new Date(s.startedAt), timeZone);
    const arr = byBucket.get(b) ?? [];
    arr.push(s.moodRating);
    byBucket.set(b, arr);
  }
  let bestTimeOfDay: WeeklyInsights["bestTimeOfDay"] = null;
  for (const [bucket, moods] of byBucket) {
    if (moods.length < 2) continue;
    const a = avg(moods);
    if (!bestTimeOfDay || a > bestTimeOfDay.avgMood) {
      bestTimeOfDay = {
        bucket,
        avgMood: Math.round(a * 10) / 10,
        sampleSize: moods.length,
      };
    }
  }

  // Streak-day vs off-day mood
  const on: number[] = [];
  const off: number[] = [];
  const streakDays = options.streakDayKeys;
  for (const s of sessions) {
    if (s.moodRating == null) continue;
    const key = dayKey(new Date(s.startedAt), timeZone);
    if (streakDays && streakDays.size > 0) {
      if (streakDays.has(key)) on.push(s.moodRating);
      else off.push(s.moodRating);
    }
  }

  const moodLoggedCount = sessions.filter(s => s.moodRating != null).length;
  const totalMinutes = Math.round(
    sessions.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60
  );

  const coaching: string[] = [];
  if (sessions.length === 0) {
    coaching.push("Complete a short session to start building your Resonance view.");
  } else if (moodLoggedCount < 3) {
    coaching.push(
      `Log ${3 - moodLoggedCount} more mood rating${3 - moodLoggedCount === 1 ? "" : "s"} after sessions to unlock your top frequency insight.`
    );
  }
  if (minutesThisWeek === 0 && sessions.length > 0) {
    coaching.push("No sessions this week yet — even 5 minutes keeps the streak door open.");
  }
  if (topMoodFrequency) {
    coaching.push(
      `Your logged mood after ${topMoodFrequency.frequencyHz} Hz averaged ${topMoodFrequency.avgMood}/5 across ${topMoodFrequency.sampleSize} sessions.`
    );
  }
  if (bestTimeOfDay) {
    coaching.push(
      `Sessions in the ${bestTimeOfDay.bucket} averaged mood ${bestTimeOfDay.avgMood}/5 (${bestTimeOfDay.sampleSize} logs).`
    );
  }
  if (minutesTrendPct != null && minutesPrevWeek > 0) {
    const dir = minutesTrendPct >= 0 ? "up" : "down";
    coaching.push(
      `Listening time is ${dir} ${Math.abs(minutesTrendPct)}% vs last week (${minutesThisWeek} min vs ${minutesPrevWeek} min).`
    );
  }

  const ready = moodLoggedCount >= 3 || thisWeek.length >= 3;

  return {
    windowDays: 30,
    sessionCount: sessions.length,
    moodLoggedCount,
    totalMinutes,
    minutesThisWeek,
    minutesPrevWeek,
    minutesTrendPct,
    topMoodFrequency,
    bestTimeOfDay,
    streakMood: {
      avgOnStreakDays: on.length ? Math.round(avg(on) * 10) / 10 : null,
      avgOffStreakDays: off.length ? Math.round(avg(off) * 10) / 10 : null,
      sampleOn: on.length,
      sampleOff: off.length,
    },
    coaching,
    ready,
  };
}
