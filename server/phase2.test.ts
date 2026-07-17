/**
 * Phase 2 unit tests — insights compute, streak freezes, program catalog.
 */
import { describe, expect, it } from "vitest";
import { computeWeeklyInsights } from "./lib/insights";
import { calculateStreakWithFreezes } from "./lib/streakFreeze";
import {
  getProgramById,
  isProgramDayPremium,
  PROGRAMS,
} from "../packages/shared-utils/src/programs";
import type { Session } from "../drizzle/schema";

function session(
  partial: Partial<Session> & { frequencyHz: number; startedAt: Date }
): Session {
  return {
    id: 1,
    userId: 1,
    frequencyName: null,
    sessionType: "single",
    studioPresetName: null,
    durationSeconds: 600,
    moodRating: null,
    journalNote: null,
    intention: null,
    endedAt: null,
    ...partial,
    startedAt: partial.startedAt,
  } as Session;
}

describe("computeWeeklyInsights", () => {
  it("coaches when mood data is sparse", () => {
    const now = new Date("2026-07-14T12:00:00Z");
    const sessions = [
      session({
        frequencyHz: 528,
        startedAt: new Date("2026-07-13T10:00:00Z"),
        durationSeconds: 300,
      }),
    ];
    const result = computeWeeklyInsights(sessions, { now, timeZone: "UTC" });
    expect(result.ready).toBe(false);
    expect(result.coaching.some(c => c.includes("mood"))).toBe(true);
  });

  it("finds top mood frequency with ≥3 samples", () => {
    const now = new Date("2026-07-14T12:00:00Z");
    const sessions = [1, 2, 3].map(i =>
      session({
        id: i,
        frequencyHz: 528,
        frequencyName: "Miracle",
        moodRating: 5,
        startedAt: new Date(`2026-07-1${i}T10:00:00Z`),
      })
    );
    const result = computeWeeklyInsights(sessions, { now, timeZone: "UTC" });
    expect(result.topMoodFrequency?.frequencyHz).toBe(528);
    expect(result.topMoodFrequency?.avgMood).toBe(5);
  });

  it("computes minutes trend week over week", () => {
    const now = new Date("2026-07-14T12:00:00Z");
    const sessions = [
      session({
        frequencyHz: 432,
        durationSeconds: 600,
        startedAt: new Date("2026-07-12T10:00:00Z"),
      }),
      session({
        frequencyHz: 432,
        durationSeconds: 1200,
        startedAt: new Date("2026-07-05T10:00:00Z"),
      }),
    ];
    const result = computeWeeklyInsights(sessions, { now, timeZone: "UTC" });
    expect(result.minutesThisWeek).toBe(10);
    expect(result.minutesPrevWeek).toBe(20);
    expect(result.minutesTrendPct).toBe(-50);
  });
});

describe("calculateStreakWithFreezes", () => {
  it("bridges a single missed day when freezes available", () => {
    const now = new Date("2026-07-14T18:00:00Z");
    // Sessions on 14, 12 — missing 13
    const dates = [
      new Date("2026-07-14T10:00:00Z"),
      new Date("2026-07-12T10:00:00Z"),
    ];
    const withFreeze = calculateStreakWithFreezes(dates, {
      timeZone: "UTC",
      now,
      freezesAvailable: 1,
      consumeFreezes: true,
    });
    expect(withFreeze.freezesUsed).toBeGreaterThanOrEqual(1);
    expect(withFreeze.streak).toBeGreaterThanOrEqual(2);

    const noFreeze = calculateStreakWithFreezes(dates, {
      timeZone: "UTC",
      now,
      freezesAvailable: 0,
    });
    expect(noFreeze.streak).toBe(1);
  });
});

describe("programs catalog", () => {
  it("includes both launch programs", () => {
    expect(PROGRAMS.map(p => p.id)).toEqual(
      expect.arrayContaining(["21-days-resonance", "7-nights-sleep"])
    );
  });

  it("marks day 8+ of 21-day program as premium", () => {
    expect(isProgramDayPremium("21-days-resonance", 7)).toBe(false);
    expect(isProgramDayPremium("21-days-resonance", 8)).toBe(true);
  });

  it("keeps 7-night sleep fully free", () => {
    for (let d = 1; d <= 7; d++) {
      expect(isProgramDayPremium("7-nights-sleep", d)).toBe(false);
    }
  });

  it("returns day content", () => {
    const day = getProgramById("21-days-resonance")?.days[0];
    expect(day?.title).toBe("Arrive");
    expect(day?.guidance).toBeTruthy();
  });
});
