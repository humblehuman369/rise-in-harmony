/**
 * Streak freeze helpers — premium users get 1 freeze per calendar month.
 * A freeze bridges a single missed calendar day in the streak chain.
 */
import { formatDayKey, previousDayKey } from "./streak";

/**
 * Compute streak with optional freezes for single-day gaps.
 * Mutates remaining freezes only when `consumeFreezes` is true (caller persists).
 */
export function calculateStreakWithFreezes(
  sessionDates: Date[],
  options: {
    timeZone?: string;
    now?: Date;
    freezesAvailable?: number;
    consumeFreezes?: boolean;
  } = {}
): { streak: number; freezesUsed: number; freezesRemaining: number } {
  const timeZone = options.timeZone || "UTC";
  const now = options.now ?? new Date();
  let freezesLeft = options.freezesAvailable ?? 0;
  const consume = options.consumeFreezes ?? false;

  if (sessionDates.length === 0) {
    return { streak: 0, freezesUsed: 0, freezesRemaining: freezesLeft };
  }

  const set = new Set(sessionDates.map(d => formatDayKey(d, timeZone)));
  const todayKey = formatDayKey(now, timeZone);
  const yesterdayKey = previousDayKey(todayKey, timeZone);

  let cursor: string | null = null;
  if (set.has(todayKey)) cursor = todayKey;
  else if (set.has(yesterdayKey)) cursor = yesterdayKey;
  else return { streak: 0, freezesUsed: 0, freezesRemaining: freezesLeft };

  let streak = 0;
  let freezesUsed = 0;

  // Walk back up to 60 days
  for (let i = 0; i < 60 && cursor; i++) {
    if (set.has(cursor)) {
      streak++;
      cursor = previousDayKey(cursor, timeZone);
      continue;
    }
    // Single-day gap: spend a freeze if available
    const prev = previousDayKey(cursor, timeZone);
    if (freezesLeft > 0 && set.has(prev)) {
      if (consume) freezesLeft--;
      freezesUsed++;
      // Count the freeze day as preserving the chain (not adding a session day)
      cursor = prev;
      continue;
    }
    break;
  }

  return {
    streak,
    freezesUsed,
    freezesRemaining: consume ? freezesLeft : (options.freezesAvailable ?? 0) - freezesUsed,
  };
}

export function currentMonthKey(now = new Date()): string {
  return now.toISOString().slice(0, 7); // YYYY-MM UTC
}
