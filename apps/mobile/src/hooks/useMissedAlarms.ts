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
 * 4. If the alarm fires but no audio is playing (both FCM and the notification
 *    sound failed to start the audio session), play a bundled fallback tone
 *    via expo-audio to guarantee the user hears something.
 *
 * This covers the scenario where:
 * - FCM push was delayed/blocked by battery saver
 * - The local expo-notifications trigger was killed by the OS
 * - The user's phone was off and they turned it on after the alarm time
 * - Both FCM and the notification sound failed to wake the audio session
 *
 * Grace window: 10 minutes. An alarm set for 7:00 AM will fire if the user
 * opens the app any time between 7:00 and 7:10 AM.
 */

import { useEffect, useRef, useCallback } from "react";
import { AppState, type AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import type { Alarm } from "@rih/shared-types";

export const GRACE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const FIRED_TODAY_KEY = "rih_missed_alarms_fired_today";

// ─── Audio fallback (Layer 2b) ────────────────────────────────────────────────
// Bundled alarm sounds — same files used by the notification system.
// These are the solfeggio tones baked into the app bundle so they play
// with zero network dependency even if the CDN is unreachable.
const BUNDLED_ALARM_SOUNDS: Record<number, number> = {
  174: require("../../assets/sounds/alarm_174.wav"),
  285: require("../../assets/sounds/alarm_285.wav"),
  396: require("../../assets/sounds/alarm_396.wav"),
  417: require("../../assets/sounds/alarm_417.wav"),
  432: require("../../assets/sounds/alarm_432.wav"),
  528: require("../../assets/sounds/alarm_528.wav"),
  639: require("../../assets/sounds/alarm_639.wav"),
  741: require("../../assets/sounds/alarm_741.wav"),
  852: require("../../assets/sounds/alarm_852.wav"),
  963: require("../../assets/sounds/alarm_963.wav"),
};
const FALLBACK_HZ = 528; // Miracle Tone — default if alarm Hz not in bundle

/**
 * Play a bundled alarm sound as an audio fallback.
 * Called when the missed-alarm check fires an alarm but we detect that
 * no audio is currently playing (FCM + notification sound both failed).
 *
 * Returns the AudioPlayer so the caller can stop it when the alarm is dismissed.
 */
export async function playFallbackAudio(frequencyHz: number): Promise<AudioPlayer | null> {
  try {
    // Configure audio session for alarm playback
    await setAudioModeAsync({
      playsInSilentMode: true,      // play even in silent/vibrate mode
      shouldPlayInBackground: true, // keep playing if user locks screen
      interruptionMode: "doNotMix",
      interruptionModeAndroid: "doNotMix",
    });
    const soundAsset =
      BUNDLED_ALARM_SOUNDS[frequencyHz] ??
      BUNDLED_ALARM_SOUNDS[FALLBACK_HZ];
    const player = createAudioPlayer(soundAsset);
    player.loop = true;
    player.volume = 0.85; // Start at 85% — audible but not jarring
    player.play();
    return player;
  } catch {
    // Non-fatal — AlarmRingingScreen will start its own audio
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD in local time */
/** @internal exported for testing */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Load the set of alarm IDs already fired today */
/** @internal exported for testing */
export async function loadFiredToday(): Promise<Set<string>> {
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
/** @internal exported for testing */
export async function markFiredToday(alarmId: string | number): Promise<void> {
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
/** @internal exported for testing */
export function wasAlarmDueRecently(alarm: Alarm, now: Date): boolean {
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

export interface UseMissedAlarmsOptions {
  /** Pass true when the AlarmRingingScreen is already playing audio.
   * When false (default) and a missed alarm is found, the hook plays a
   * bundled fallback tone immediately so the user hears something even
   * before AlarmRingingScreen mounts and starts its own audio engine.
   * This covers the case where both FCM and the notification sound
   * failed to wake the audio session. */
  isAudioPlaying?: boolean;
  /** Called with the AudioPlayer when fallback audio starts, so the
   * caller can stop it when the alarm is dismissed. */
  onFallbackAudioStarted?: (player: AudioPlayer) => void;
}

export function useMissedAlarms(
  alarms: Alarm[],
  onAlarmFired: (alarm: Alarm) => void,
  options: UseMissedAlarmsOptions = {}
): void {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const alarmsRef = useRef<Alarm[]>(alarms);
  const onAlarmFiredRef = useRef(onAlarmFired);
  const optionsRef = useRef(options);

  // Keep refs current without re-subscribing AppState listener
  useEffect(() => { alarmsRef.current = alarms; }, [alarms]);
  useEffect(() => { onAlarmFiredRef.current = onAlarmFired; }, [onAlarmFired]);
  useEffect(() => { optionsRef.current = options; }, [options]);

  const checkMissedAlarms = useCallback(async () => {
    const now = new Date();
    const firedToday = await loadFiredToday();

    for (const alarm of alarmsRef.current) {
      const id = String(alarm.id);
      if (firedToday.has(id)) continue; // already fired/shown today
      if (!wasAlarmDueRecently(alarm, now)) continue;

      // Found a missed alarm — fire it and mark it
      await markFiredToday(id);

      // Layer 2b: if no audio is currently playing (FCM + notification both
      // failed to wake the audio session), start a bundled fallback tone
      // immediately so the user hears something before AlarmRingingScreen mounts.
      const { isAudioPlaying, onFallbackAudioStarted } = optionsRef.current;
      if (!isAudioPlaying) {
        const player = await playFallbackAudio(alarm.frequencyHz);
        if (player && onFallbackAudioStarted) {
          onFallbackAudioStarted(player);
        }
      }

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
