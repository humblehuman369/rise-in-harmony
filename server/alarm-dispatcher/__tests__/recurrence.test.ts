import { describe, expect, it } from "vitest";
import { alarmIsDueAt, findDueOccurrences } from "../recurrence";
import { makeAlarm } from "./fake-repository";

const DEFAULT_TZ = "America/New_York";

/** Whole-minute UTC window helper. */
function window(startIso: string, endIso: string): [Date, Date] {
  return [new Date(startIso), new Date(endIso)];
}

describe("alarmIsDueAt", () => {
  it("fires at the alarm's local wall-clock time, not the server's", () => {
    // 07:30 America/New_York on 2026-07-06 (EDT, UTC-4) === 11:30 UTC.
    const alarm = makeAlarm({ hour: 7, minute: 30, timezone: "America/New_York" });
    const occurrence = alarmIsDueAt(alarm, new Date("2026-07-06T11:30:00Z"), DEFAULT_TZ);

    expect(occurrence).not.toBeNull();
    expect(occurrence?.scheduledForUtc.toISOString()).toBe("2026-07-06T11:30:00.000Z");
    expect(occurrence?.scheduledLocalKey).toBe("America/New_York:2026-07-06T07:30");
  });

  it("does not fire an hour off in the same local slot", () => {
    const alarm = makeAlarm({ hour: 7, minute: 30, timezone: "America/New_York" });
    expect(alarmIsDueAt(alarm, new Date("2026-07-06T12:30:00Z"), DEFAULT_TZ)).toBeNull();
  });

  it("respects the alarm's day-of-week in local time", () => {
    // 2026-07-06 is a Monday in New York. An alarm limited to Sunday must not fire.
    const sundayOnly = makeAlarm({ hour: 7, minute: 30, days: [0] });
    expect(alarmIsDueAt(sundayOnly, new Date("2026-07-06T11:30:00Z"), DEFAULT_TZ)).toBeNull();
  });

  it("schedules two users in different zones at different instants", () => {
    const newYork = makeAlarm({ id: 1, hour: 7, minute: 30, timezone: "America/New_York" });
    const london = makeAlarm({ id: 2, hour: 7, minute: 30, timezone: "Europe/London" });
    const instant = new Date("2026-07-06T11:30:00Z");

    expect(alarmIsDueAt(newYork, instant, DEFAULT_TZ)).not.toBeNull();
    expect(alarmIsDueAt(london, instant, DEFAULT_TZ)).toBeNull(); // London is already 12:30
    expect(alarmIsDueAt(london, new Date("2026-07-06T06:30:00Z"), DEFAULT_TZ)).not.toBeNull();
  });

  describe("timezone fallback", () => {
    it("uses ALARM_DEFAULT_TIMEZONE when the alarm has no timezone", () => {
      // Legacy row created before alarms.timezone existed.
      const legacy = makeAlarm({ hour: 7, minute: 30, timezone: null });
      const occurrence = alarmIsDueAt(legacy, new Date("2026-07-06T11:30:00Z"), DEFAULT_TZ);

      expect(occurrence).not.toBeNull();
      expect(occurrence?.scheduledLocalKey).toBe("America/New_York:2026-07-06T07:30");
    });

    it("honours a different fallback zone for legacy rows", () => {
      const legacy = makeAlarm({ hour: 7, minute: 30, timezone: null });
      expect(alarmIsDueAt(legacy, new Date("2026-07-06T11:30:00Z"), "Europe/London")).toBeNull();
      expect(
        alarmIsDueAt(legacy, new Date("2026-07-06T06:30:00Z"), "Europe/London"),
      ).not.toBeNull();
    });

    it("skips an alarm whose stored timezone is invalid rather than guessing", () => {
      // Silently falling back to the process zone would fire at the wrong hour.
      const corrupt = makeAlarm({ hour: 7, minute: 30, timezone: "Not/AZone" });
      expect(alarmIsDueAt(corrupt, new Date("2026-07-06T11:30:00Z"), DEFAULT_TZ)).toBeNull();
    });
  });
});

describe("DST — fall back", () => {
  // 2026-11-01 America/New_York: clocks go 01:59 EDT -> 01:00 EST.
  // Local 01:30 happens twice: 05:30 UTC and 06:30 UTC.
  const alarm = makeAlarm({ hour: 1, minute: 30, timezone: "America/New_York" });

  it("matches both real instants of the repeated wall-clock minute", () => {
    const first = alarmIsDueAt(alarm, new Date("2026-11-01T05:30:00Z"), DEFAULT_TZ);
    const second = alarmIsDueAt(alarm, new Date("2026-11-01T06:30:00Z"), DEFAULT_TZ);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    // Same local slot, so the same idempotency key.
    expect(first?.scheduledLocalKey).toBe("America/New_York:2026-11-01T01:30");
    expect(second?.scheduledLocalKey).toBe(first?.scheduledLocalKey);
  });

  it("produces exactly one occurrence across the whole repeated hour", () => {
    const occurrences = findDueOccurrences(
      [alarm],
      ...window("2026-11-01T04:00:00Z", "2026-11-01T08:00:00Z"),
      DEFAULT_TZ,
    );

    expect(occurrences).toHaveLength(1);
    // The first 01:30 wins — the user is woken at the earlier of the two.
    expect(occurrences[0].scheduledForUtc.toISOString()).toBe("2026-11-01T05:30:00.000Z");
  });
});

describe("DST — spring forward", () => {
  // 2026-03-08 America/New_York: clocks go 01:59 EST -> 03:00 EDT.
  // Local 02:30 never occurs on this date.
  it("skips an alarm set inside the nonexistent hour", () => {
    const alarm = makeAlarm({ hour: 2, minute: 30, timezone: "America/New_York" });
    const occurrences = findDueOccurrences(
      [alarm],
      ...window("2026-03-08T05:00:00Z", "2026-03-08T09:00:00Z"),
      DEFAULT_TZ,
    );

    expect(occurrences).toHaveLength(0);
  });

  it("still fires an alarm just outside the skipped hour", () => {
    const alarm = makeAlarm({ hour: 3, minute: 30, timezone: "America/New_York" });
    const occurrences = findDueOccurrences(
      [alarm],
      ...window("2026-03-08T05:00:00Z", "2026-03-08T09:00:00Z"),
      DEFAULT_TZ,
    );

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].scheduledForUtc.toISOString()).toBe("2026-03-08T07:30:00.000Z");
  });
});

describe("findDueOccurrences", () => {
  it("reconciles a missed window without duplicating an occurrence", () => {
    const alarm = makeAlarm({ hour: 7, minute: 30 });
    // A worker that was down for 20 minutes rescans the whole gap.
    const occurrences = findDueOccurrences(
      [alarm],
      ...window("2026-07-06T11:20:00Z", "2026-07-06T11:40:00Z"),
      DEFAULT_TZ,
    );

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].scheduledForUtc.toISOString()).toBe("2026-07-06T11:30:00.000Z");
  });

  it("returns one occurrence per alarm when several are due together", () => {
    const alarms = [
      makeAlarm({ id: 1, userId: 1, hour: 7, minute: 30 }),
      makeAlarm({ id: 2, userId: 2, hour: 7, minute: 30 }),
    ];
    const occurrences = findDueOccurrences(
      alarms,
      ...window("2026-07-06T11:29:00Z", "2026-07-06T11:31:00Z"),
      DEFAULT_TZ,
    );

    expect(occurrences).toHaveLength(2);
    expect(occurrences.map((o) => o.alarm.id).sort()).toEqual([1, 2]);
  });
});
