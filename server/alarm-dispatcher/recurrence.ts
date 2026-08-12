import type { AlarmRecord } from "./types";
import { floorToUtcMinute } from "./utc";

const weekdayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface DueOccurrence {
  alarm: AlarmRecord;
  /** Canonical due instant, UTC. */
  scheduledForUtc: Date;
  /** `<timezone>:YYYY-MM-DDTHH:mm` — identifies the local wall-clock slot. */
  scheduledLocalKey: string;
}

function formatter(timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function partsAt(date: Date, timezone: string): Record<string, string> {
  return formatter(timezone)
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});
}

/**
 * Does `alarm` fall due at this exact UTC minute?
 *
 * The check runs forwards — take a real instant, ask what the user's wall clock
 * reads, and compare — rather than converting a local time to UTC. That makes
 * both DST edges fall out for free:
 *
 *   - Spring forward: 02:30 local never occurs, so no instant matches and the
 *     alarm is skipped that day.
 *   - Fall back: 01:30 local occurs twice; both instants match but they share a
 *     `scheduledLocalKey`, so the occurrence collapses to one (see
 *     `findDueOccurrences`, and the unique DB key that backs it).
 */
export function alarmIsDueAt(
  alarm: AlarmRecord,
  instant: Date,
  fallbackTimezone: string,
): DueOccurrence | null {
  const timezone = alarm.timezone || fallbackTimezone;
  let parts: Record<string, string>;
  try {
    parts = partsAt(instant, timezone);
  } catch {
    // An invalid saved IANA zone must never silently fall back to the Railway
    // process time zone — that would fire the alarm at the wrong hour.
    return null;
  }

  const weekday = weekdayMap[parts.weekday];
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  if (
    !Number.isInteger(weekday) ||
    hour !== alarm.hour ||
    minute !== alarm.minute ||
    !alarm.days.includes(weekday)
  ) {
    return null;
  }

  return {
    alarm,
    scheduledForUtc: floorToUtcMinute(instant),
    scheduledLocalKey: `${timezone}:${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`,
  };
}

/** Every whole UTC minute in `[startInclusive, endInclusive]`. */
export function enumerateMinuteInstants(startInclusive: Date, endInclusive: Date): Date[] {
  const start = floorToUtcMinute(startInclusive);
  const end = floorToUtcMinute(endInclusive);

  const instants: Date[] = [];
  for (
    let current = start;
    current <= end;
    current = new Date(current.getTime() + 60_000)
  ) {
    instants.push(new Date(current));
  }
  return instants;
}

/**
 * All occurrences due in the window, deduplicated by local slot.
 *
 * On a DST fall-back day the first matching instant wins, so an alarm set for
 * 01:30 fires at the first 01:30 rather than an hour later at the second.
 */
export function findDueOccurrences(
  alarms: AlarmRecord[],
  startInclusive: Date,
  endInclusive: Date,
  fallbackTimezone: string,
): DueOccurrence[] {
  const unique = new Map<string, DueOccurrence>();
  for (const instant of enumerateMinuteInstants(startInclusive, endInclusive)) {
    for (const alarm of alarms) {
      const occurrence = alarmIsDueAt(alarm, instant, fallbackTimezone);
      if (!occurrence) continue;
      const key = `${alarm.id}:${occurrence.scheduledLocalKey}`;
      if (!unique.has(key)) unique.set(key, occurrence);
    }
  }
  return [...unique.values()];
}
