/**
 * useMissedAlarms — Layer 2 fallback: detect and fire alarms missed while
 * the app was killed or the phone was in deep sleep.
 *
 * How it works:
 * 1. On every app resume (background → foreground transition), check all
 *    enabled alarms to see if any were due in the last GRACE_WINDOW_MS.
 * 2. If a missed alarm is found AND it hasn't already been dismissed today,
 *    fire it immediately via onAlarmFired().
 * 3. Track which alarms have been fired today using AsyncStorage so we never
 *    double-fire (e.g. if the user backgrounds and foregrounds quickly).
 *
 * This covers the scenario where:
 * - FCM push was delayed/blocked by battery saver
 * - The local expo-notifications trigger was killed by the OS
 * - The user's phone was off and they turned it on after the alarm time
 *
 * Grace window: 10 minutes. An alarm set for 7:00 AM will fire if the user
 * opens the app any time between 7:00 and 7:10 AM.
 */

import { useEffect, useRef, useCallback } from "react";
import { AppState, type AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Alarm } from "@rih/shared-types";

const GRACE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const FIRED_TODAY_KEY = "rih_missed_alarms_fired_today";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD in local time */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Load the set of alarm IDs already fired today */
async function loadFiredToday(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(FIRED_TODAY_KEY);
    if (!raw) return new Set();
    const parsed: { date: string; ids: string[] } = JSON.parse(raw);
    // Reset if it's a new day
    if (parsed.date !== todayKey()) return new Set();
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

/** Mark an alarm ID as fired today so we don't double-fire */
async function markFiredToday(alarmId: string | number): Promise<void> {
  try {
    const existing = await loadFiredToday();
    existing.add(String(alarmId));
    await AsyncStorage.setItem(
      FIRED_TODAY_KEY,
      JSON.stringify({ date: todayKey(), ids: Array.from(existing) })
    );
  } catch {
    // Non-fatal — worst case we fire twice, which is acceptable
  }
}

/**
 * Check whether a given alarm was due within the grace window ending at `now`.
 * Handles both one-shot alarms (days=[]) and repeating alarms (days=[...]).
 */
function wasAlarmDueRecently(alarm: Alarm, now: Date): boolean {
  if (!alarm.isActive) return false;

  const todayDow = now.getDay(); // 0=Sun … 6=Sat
  const DOW_MAP: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  // Build a Date for today at alarm.hour:alarm.minute
  const alarmTime = new Date(now);
  alarmTime.setHours(alarm.hour, alarm.minute, 0, 0);

  const diffMs = now.getTime() - alarmTime.getTime();

  // Must be in the past (not future) and within the grace window
  if (diffMs < 0 || diffMs > GRACE_WINDOW_MS) return false;

  // One-shot alarm (no repeat days) — fires any day
  if (!alarm.days || alarm.days.length === 0) return true;

  // Repeating alarm — only fires on selected days
  return alarm.days.some((day) => DOW_MAP[day] === todayDow);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMissedAlarms(
  alarms: Alarm[],
  onAlarmFired: (alarm: Alarm) => void
): void {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const alarmsRef = useRef<Alarm[]>(alarms);
  const onAlarmFiredRef = useRef(onAlarmFired);

  // Keep refs current without re-subscribing AppState listener
  useEffect(() => { alarmsRef.current = alarms; }, [alarms]);
  useEffect(() => { onAlarmFiredRef.current = onAlarmFired; }, [onAlarmFired]);

  const checkMissedAlarms = useCallback(async () => {
    const now = new Date();
    const firedToday = await loadFiredToday();

    for (const alarm of alarmsRef.current) {
      const id = String(alarm.id);
      if (firedToday.has(id)) continue; // already fired/shown today
      if (!wasAlarmDueRecently(alarm, now)) continue;

      // Found a missed alarm — fire it and mark it
      await markFiredToday(id);
      onAlarmFiredRef.current(alarm);
      // Only fire the most recently missed alarm to avoid overwhelming the user
      break;
    }
  }, []);

  useEffect(() => {
    // Check immediately on mount in case the app was opened by tapping a
    // notification or the user opened the app manually after missing an alarm
    void checkMissedAlarms();

    // Also check every time the app comes back to the foreground
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        const prev = appStateRef.current;
        appStateRef.current = nextState;

        // Transition: background/inactive → active
        if (
          (prev === "background" || prev === "inactive") &&
          nextState === "active"
        ) {
          void checkMissedAlarms();
        }
      }
    );

    return () => subscription.remove();
  }, [checkMissedAlarms]);
}
