import { afterEach, describe, expect, it } from "vitest";
import { floorToUtcMinute, fromUtcSql, toUtcSql, toUtcSqlOrNull, utcColumn } from "../utc";

const ORIGINAL_TZ = process.env.TZ;

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

describe("toUtcSql", () => {
  it("formats a MySQL DATETIME literal in UTC", () => {
    expect(toUtcSql(new Date("2026-07-06T11:30:00.000Z"))).toBe("2026-07-06 11:30:00");
  });

  it("drops sub-second precision", () => {
    expect(toUtcSql(new Date("2026-07-06T11:30:45.987Z"))).toBe("2026-07-06 11:30:45");
  });

  it("zero-pads every component", () => {
    expect(toUtcSql(new Date("2026-01-02T03:04:05.000Z"))).toBe("2026-01-02 03:04:05");
  });

  it("ignores the process time zone entirely", () => {
    // This is the whole point: the same instant must serialize identically no
    // matter what TZ the API or dispatcher container happens to run in.
    const instant = new Date("2026-07-06T11:30:00.000Z");
    const rendered: string[] = [];

    for (const zone of ["UTC", "America/Los_Angeles", "Asia/Tokyo", "Europe/London"]) {
      process.env.TZ = zone;
      rendered.push(toUtcSql(instant));
    }

    expect(new Set(rendered).size).toBe(1);
    expect(rendered[0]).toBe("2026-07-06 11:30:00");
  });

  it("rejects an invalid Date rather than writing garbage", () => {
    expect(() => toUtcSql(new Date("nonsense"))).toThrow(RangeError);
  });
});

describe("toUtcSqlOrNull", () => {
  it("passes null and undefined through", () => {
    expect(toUtcSqlOrNull(null)).toBeNull();
    expect(toUtcSqlOrNull(undefined)).toBeNull();
  });

  it("formats a real date", () => {
    expect(toUtcSqlOrNull(new Date("2026-07-06T11:30:00.000Z"))).toBe("2026-07-06 11:30:00");
  });
});

describe("fromUtcSql", () => {
  it("parses a MySQL DATETIME as UTC, not local time", () => {
    const parsed = fromUtcSql("2026-07-06 11:30:00");
    expect(parsed?.toISOString()).toBe("2026-07-06T11:30:00.000Z");
  });

  it("parses identically regardless of the process time zone", () => {
    const parsed: string[] = [];
    for (const zone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      parsed.push(fromUtcSql("2026-07-06 11:30:00")!.toISOString());
    }
    expect(new Set(parsed).size).toBe(1);
    expect(parsed[0]).toBe("2026-07-06T11:30:00.000Z");
  });

  it("accepts the ISO-style separator too", () => {
    expect(fromUtcSql("2026-07-06T11:30:00")?.toISOString()).toBe("2026-07-06T11:30:00.000Z");
  });

  it("passes null and undefined through", () => {
    expect(fromUtcSql(null)).toBeNull();
    expect(fromUtcSql(undefined)).toBeNull();
  });

  it("returns an already-parsed Date unchanged rather than shifting it twice", () => {
    const date = new Date("2026-07-06T11:30:00.000Z");
    expect(fromUtcSql(date)).toBe(date);
  });

  it("throws on unparseable text instead of yielding Invalid Date", () => {
    expect(() => fromUtcSql("not-a-datetime")).toThrow(RangeError);
  });

  it("round-trips through toUtcSql", () => {
    const original = new Date("2026-11-01T05:30:00.000Z");
    expect(fromUtcSql(toUtcSql(original))?.toISOString()).toBe(original.toISOString());
  });

  it("round-trips a post-2038 instant that TIMESTAMP could not store", () => {
    // The reason these columns are DATETIME: TIMESTAMP overflows 2038-01-19.
    const original = new Date("2045-06-15T08:00:00.000Z");
    expect(fromUtcSql(toUtcSql(original))?.toISOString()).toBe(original.toISOString());
  });
});

describe("utcColumn", () => {
  it("aliases to the bare column name by default", () => {
    expect(utcColumn("a.scheduledForUtc")).toBe(
      "DATE_FORMAT(a.scheduledForUtc, '%Y-%m-%d %H:%i:%s') AS `scheduledForUtc`",
    );
  });

  it("accepts an explicit alias", () => {
    expect(utcColumn("a.scheduledForUtc", "dueAt")).toBe(
      "DATE_FORMAT(a.scheduledForUtc, '%Y-%m-%d %H:%i:%s') AS `dueAt`",
    );
  });

  it("produces a format string fromUtcSql can parse", () => {
    // Guards the pairing: changing one side must break this test.
    expect(fromUtcSql("2026-07-06 11:30:00")?.toISOString()).toBe("2026-07-06T11:30:00.000Z");
  });
});

describe("floorToUtcMinute", () => {
  it("truncates seconds and milliseconds", () => {
    expect(floorToUtcMinute(new Date("2026-07-06T11:30:45.987Z")).toISOString()).toBe(
      "2026-07-06T11:30:00.000Z",
    );
  });

  it("does not mutate its argument", () => {
    const original = new Date("2026-07-06T11:30:45.987Z");
    floorToUtcMinute(original);
    expect(original.toISOString()).toBe("2026-07-06T11:30:45.987Z");
  });
});
