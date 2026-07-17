/**
 * Calendar-day streak helpers.
 * All day keys are YYYY-MM-DD in the given IANA timezone (default UTC).
 */

/** Format a Date as YYYY-MM-DD in the given timezone (default UTC). */
export function formatDayKey(date: Date, timeZone = "UTC"): string {
  try {
    // en-CA yields YYYY-MM-DD
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

/** Previous calendar day key (YYYY-MM-DD) in the same timezone. */
export function previousDayKey(dayKey: string, timeZone = "UTC"): string {
  if (timeZone === "UTC") {
    const d = new Date(`${dayKey}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  // Walk backward hour-by-hour from midday until the calendar day changes in-zone.
  let t = Date.parse(`${dayKey}T12:00:00.000Z`);
  for (let i = 0; i < 48; i++) {
    t -= 60 * 60 * 1000;
    const key = formatDayKey(new Date(t), timeZone);
    if (key !== dayKey) return key;
  }
  // Fallback
  const utc = new Date(`${dayKey}T12:00:00.000Z`);
  utc.setUTCDate(utc.getUTCDate() - 1);
  return utc.toISOString().slice(0, 10);
}

/**
 * Consecutive calendar-day streak ending today or yesterday (in timeZone).
 */
export function calculateStreakFromDates(
  sessionDates: Date[],
  options: { timeZone?: string; now?: Date } = {}
): number {
  const timeZone = options.timeZone || "UTC";
  const now = options.now ?? new Date();
  if (sessionDates.length === 0) return 0;

  const dayKeys = Array.from(
    new Set(sessionDates.map(d => formatDayKey(d, timeZone)))
  ).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)); // descending

  const todayKey = formatDayKey(now, timeZone);
  const yesterdayKey = previousDayKey(todayKey, timeZone);
  const set = new Set(dayKeys);

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
