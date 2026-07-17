/**
 * S2 unit tests — streak day keys, pool config.
 */
import { describe, expect, it } from "vitest";
import {
  calculateStreakFromDates,
  formatDayKey,
  previousDayKey,
} from "./lib/streak";
import { getPoolConfig } from "./lib/dbPool";

describe("streak day keys (UTC)", () => {
  it("formats UTC day keys as YYYY-MM-DD", () => {
    expect(formatDayKey(new Date("2026-07-14T23:30:00.000Z"), "UTC")).toBe(
      "2026-07-14"
    );
  });

  it("previousDayKey steps calendar days in UTC", () => {
    expect(previousDayKey("2026-07-14", "UTC")).toBe("2026-07-13");
    expect(previousDayKey("2026-03-01", "UTC")).toBe("2026-02-28");
  });

  it("counts consecutive days including today", () => {
    const now = new Date("2026-07-14T18:00:00.000Z");
    const dates = [
      new Date("2026-07-14T10:00:00.000Z"),
      new Date("2026-07-13T10:00:00.000Z"),
      new Date("2026-07-12T10:00:00.000Z"),
    ];
    expect(calculateStreakFromDates(dates, { timeZone: "UTC", now })).toBe(3);
  });

  it("allows streak anchored on yesterday when today is empty", () => {
    const now = new Date("2026-07-14T18:00:00.000Z");
    const dates = [
      new Date("2026-07-13T10:00:00.000Z"),
      new Date("2026-07-12T10:00:00.000Z"),
    ];
    expect(calculateStreakFromDates(dates, { timeZone: "UTC", now })).toBe(2);
  });

  it("returns 0 when last session is older than yesterday", () => {
    const now = new Date("2026-07-14T18:00:00.000Z");
    const dates = [new Date("2026-07-11T10:00:00.000Z")];
    expect(calculateStreakFromDates(dates, { timeZone: "UTC", now })).toBe(0);
  });

  it("does not mix DB DATE() with toISOString — uses timezone consistently", () => {
    // Session just after midnight UTC is still previous evening in LA
    const now = new Date("2026-07-15T07:00:00.000Z"); // 00:00 PDT July 15
    const lateNightLa = new Date("2026-07-15T06:30:00.000Z"); // 23:30 PDT July 14
    // In America/Los_Angeles this is still July 14, so with now=July 15 local, streak anchors yesterday
    const streak = calculateStreakFromDates([lateNightLa], {
      timeZone: "America/Los_Angeles",
      now,
    });
    expect(streak).toBe(1);
  });
});

describe("db pool config", () => {
  it("defaults connection limit to 10", () => {
    const prev = process.env.DB_POOL_SIZE;
    delete process.env.DB_POOL_SIZE;
    expect(getPoolConfig().connectionLimit).toBe(10);
    if (prev !== undefined) process.env.DB_POOL_SIZE = prev;
  });

  it("respects DB_POOL_SIZE env", () => {
    const prev = process.env.DB_POOL_SIZE;
    process.env.DB_POOL_SIZE = "25";
    expect(getPoolConfig().connectionLimit).toBe(25);
    if (prev === undefined) delete process.env.DB_POOL_SIZE;
    else process.env.DB_POOL_SIZE = prev;
  });
});
