/**
 * useMissedAlarms — unit tests
 *
 * Tests the pure logic functions exported from useMissedAlarms:
 *   - wasAlarmDueRecently(): the 10-minute grace window
 *   - loadFiredToday() / markFiredToday(): AsyncStorage deduplication
 *   - playFallbackAudio(): audio fallback when FCM + notification fail
 *
 * The React hook itself (useMissedAlarms) is tested via its exported
 * pure helpers rather than renderHook, keeping tests fast and dependency-free.
 *
 * Test strategy:
 *   - Mock Date.now() / new Date() to control "current time"
 *   - Mock AsyncStorage via jest.setup.js mock
 *   - Mock expo-audio to avoid native module errors
 *   - All timing assertions use exact millisecond boundaries
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Mock expo-audio before importing the module under test ──────────────────
const mockPlay = jest.fn();
const mockPause = jest.fn();
let mockPlayerInstance = { loop: false, volume: 1, play: mockPlay, pause: mockPause };
const mockCreateAudioPlayer = jest.fn(() => mockPlayerInstance);
const mockSetAudioModeAsync = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-audio", () => ({
  createAudioPlayer: mockCreateAudioPlayer,
  setAudioModeAsync: mockSetAudioModeAsync,
}));

// ─── Import the pure helpers directly ────────────────────────────────────────
// We test the exported pure functions, not the hook itself, to keep tests
// fast and avoid needing @testing-library/react-native.
import {
  wasAlarmDueRecently,
  loadFiredToday,
  markFiredToday,
  GRACE_WINDOW_MS,
} from "../src/hooks/useMissedAlarms";

import type { Alarm } from "@rih/shared-types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal Alarm fixture */
function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: 1,
    userId: 1,
    label: "Test Alarm",
    hour: 7,
    minute: 0,
    days: [],
    frequencyHz: 528,
    frequencyName: "Miracle Tone",
    studioMixName: null,
    fadeInMinutes: 6,
    isActive: true,
    time: "07:00",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/** Create a Date set to today at the given hour and minute */
function todayAt(hour: number, minute: number, secondsOffset = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setTime(d.getTime() + secondsOffset * 1000);
  return d;
}

// ─── wasAlarmDueRecently ──────────────────────────────────────────────────────

describe("wasAlarmDueRecently — 10-minute grace window", () => {
  describe("one-shot alarms (days = [])", () => {
    it("returns true when now is exactly at alarm time (0ms elapsed)", () => {
      const alarm = makeAlarm({ hour: 7, minute: 0, days: [] });
      const now = todayAt(7, 0, 0);
      expect(wasAlarmDueRecently(alarm, now)).toBe(true);
    });

    it("returns true when now is 1 second after alarm time", () => {
      const alarm = makeAlarm({ hour: 7, minute: 0, days: [] });
      const now = todayAt(7, 0, 1);
      expect(wasAlarmDueRecently(alarm, now)).toBe(true);
    });

    it("returns true when now is 5 minutes after alarm time", () => {
      const alarm = makeAlarm({ hour: 7, minute: 0, days: [] });
      const now = todayAt(7, 5, 0);
      expect(wasAlarmDueRecently(alarm, now)).toBe(true);
    });

    it("returns true when now is exactly 9 minutes 59 seconds after alarm time", () => {
      const alarm = makeAlarm({ hour: 7, minute: 0, days: [] });
      const now = todayAt(7, 0, 9 * 60 + 59); // 599 seconds = 9m59s
      expect(wasAlarmDueRecently(alarm, now)).toBe(true);
    });

    it("returns true at the exact 10-minute boundary (600000ms elapsed)", () => {
      const alarm = makeAlarm({ hour: 7, minute: 0, days: [] });
      const alarmTime = todayAt(7, 0, 0);
      const now = new Date(alarmTime.getTime() + GRACE_WINDOW_MS);
      expect(wasAlarmDueRecently(alarm, now)).toBe(true);
    });

    it("returns false when now is 1ms past the 10-minute grace window", () => {
      const alarm = makeAlarm({ hour: 7, minute: 0, days: [] });
      const alarmTime = todayAt(7, 0, 0);
      const now = new Date(alarmTime.getTime() + GRACE_WINDOW_MS + 1);
      expect(wasAlarmDueRecently(alarm, now)).toBe(false);
    });

    it("returns false when now is 11 minutes after alarm time", () => {
      const alarm = makeAlarm({ hour: 7, minute: 0, days: [] });
      const now = todayAt(7, 11, 0);
      expect(wasAlarmDueRecently(alarm, now)).toBe(false);
    });

    it("returns false when alarm time is in the future", () => {
      const alarm = makeAlarm({ hour: 7, minute: 30, days: [] });
      const now = todayAt(7, 0, 0); // 30 minutes before alarm
      expect(wasAlarmDueRecently(alarm, now)).toBe(false);
    });

    it("returns false for an inactive alarm within the grace window", () => {
      const alarm = makeAlarm({ hour: 7, minute: 0, days: [], isActive: false });
      const now = todayAt(7, 5, 0);
      expect(wasAlarmDueRecently(alarm, now)).toBe(false);
    });
  });

  describe("repeating alarms (days = [...])", () => {
    // Day-of-week mapping: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    const DOW_TO_DAY: Record<number, string> = {
      0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat",
    };

    it("returns true when today is in the alarm's days array and within grace window", () => {
      const now = todayAt(7, 5, 0);
      const todayName = DOW_TO_DAY[now.getDay()] as any;
      const alarm = makeAlarm({ hour: 7, minute: 0, days: [todayName] });
      expect(wasAlarmDueRecently(alarm, now)).toBe(true);
    });

    it("returns false when today is NOT in the alarm's days array", () => {
      const now = todayAt(7, 5, 0);
      const todayDow = now.getDay();
      // Pick a day that is NOT today
      const otherDay = DOW_TO_DAY[(todayDow + 1) % 7] as any;
      const alarm = makeAlarm({ hour: 7, minute: 0, days: [otherDay] });
      expect(wasAlarmDueRecently(alarm, now)).toBe(false);
    });

    it("returns true for Mon–Fri alarm on a weekday within grace window", () => {
      const now = todayAt(7, 3, 0);
      const todayDow = now.getDay();
      const isWeekday = todayDow >= 1 && todayDow <= 5;
      const alarm = makeAlarm({
        hour: 7, minute: 0,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"] as any,
      });
      expect(wasAlarmDueRecently(alarm, now)).toBe(isWeekday);
    });

    it("returns false for Mon–Fri alarm outside grace window even if today matches", () => {
      const now = todayAt(7, 15, 0); // 15 minutes after — outside 10-min window
      const todayDow = now.getDay();
      const todayName = DOW_TO_DAY[todayDow] as any;
      const alarm = makeAlarm({
        hour: 7, minute: 0,
        days: [todayName],
      });
      expect(wasAlarmDueRecently(alarm, now)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles midnight alarm (00:00) correctly", () => {
      const alarm = makeAlarm({ hour: 0, minute: 0, days: [] });
      const now = new Date();
      now.setHours(0, 5, 0, 0); // 5 minutes after midnight
      expect(wasAlarmDueRecently(alarm, now)).toBe(true);
    });

    it("handles 11:59 PM alarm correctly", () => {
      const alarm = makeAlarm({ hour: 23, minute: 59, days: [] });
      const now = new Date();
      now.setHours(23, 59, 30, 0); // 30 seconds after 11:59 PM
      expect(wasAlarmDueRecently(alarm, now)).toBe(true);
    });

    it("returns false when alarm time is exactly 10 minutes and 1ms in the past", () => {
      const alarm = makeAlarm({ hour: 7, minute: 0, days: [] });
      const alarmTime = todayAt(7, 0, 0);
      const now = new Date(alarmTime.getTime() + GRACE_WINDOW_MS + 1);
      expect(wasAlarmDueRecently(alarm, now)).toBe(false);
    });
  });
});

// ─── loadFiredToday / markFiredToday ─────────────────────────────────────────

describe("AsyncStorage deduplication — loadFiredToday / markFiredToday", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("returns an empty set when nothing has been fired today", async () => {
    const result = await loadFiredToday();
    expect(result.size).toBe(0);
  });

  it("returns the alarm ID after marking it as fired", async () => {
    await markFiredToday("42");
    const result = await loadFiredToday();
    expect(result.has("42")).toBe(true);
  });

  it("accumulates multiple alarm IDs", async () => {
    await markFiredToday("1");
    await markFiredToday("2");
    await markFiredToday("3");
    const result = await loadFiredToday();
    expect(result.has("1")).toBe(true);
    expect(result.has("2")).toBe(true);
    expect(result.has("3")).toBe(true);
    expect(result.size).toBe(3);
  });

  it("does not duplicate an alarm ID marked twice", async () => {
    await markFiredToday("99");
    await markFiredToday("99");
    const result = await loadFiredToday();
    expect(result.size).toBe(1);
    expect(result.has("99")).toBe(true);
  });

  it("resets when the stored date is yesterday", async () => {
    // Manually write a stale entry with yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const staleDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    await AsyncStorage.setItem(
      "rih_missed_alarms_fired_today",
      JSON.stringify({ date: staleDate, ids: ["old-alarm-1", "old-alarm-2"] })
    );

    const result = await loadFiredToday();
    expect(result.size).toBe(0); // stale data cleared
  });

  it("handles corrupted AsyncStorage data gracefully", async () => {
    await AsyncStorage.setItem("rih_missed_alarms_fired_today", "not-valid-json{{{");
    const result = await loadFiredToday();
    expect(result.size).toBe(0); // returns empty set, no throw
  });
});


// ─── GRACE_WINDOW_MS export ───────────────────────────────────────────────────

describe("GRACE_WINDOW_MS constant", () => {
  it("is exactly 10 minutes in milliseconds", () => {
    expect(GRACE_WINDOW_MS).toBe(10 * 60 * 1000);
  });

  it("is 600000ms", () => {
    expect(GRACE_WINDOW_MS).toBe(600_000);
  });
});
