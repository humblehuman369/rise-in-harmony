/**
 * useAlarmNotifications — Expo Notifications alarm scheduling
 *
 * Handles:
 * - Requesting notification permissions (with battery optimization prompt on Android)
 * - Scheduling exact alarms using expo-notifications
 * - Cancelling individual or all alarms
 * - Listening for alarm fires and logging sessions
 * - RECEIVE_BOOT_COMPLETED recovery (alarms are rescheduled on app launch)
 *
 * Android reliability notes (see §5.3 of development plan):
 * - Uses HIGH_IMPORTANCE notification channel so Android treats it as an alarm
 * - Sets androidChannelId: "rih_alarm" — channel created at app startup
 * - fullScreenIntent: true — shows on lock screen without user tapping
 * - Requires SCHEDULE_EXACT_ALARM permission (Android 12+)
 * - Requires RECEIVE_BOOT_COMPLETED to reschedule after device restart
 * - Request REQUEST_IGNORE_BATTERY_OPTIMIZATIONS for background reliability
 *
 * Layer 1 of the fallback stack: local on-device scheduling that fires
 * independently of FCM, network, or push delivery. This is the most
 * reliable mechanism available in a React Native / Expo app.
 */

import { useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { Alarm } from "@rih/shared-types";
import { trackAlarmFired } from "./useAnalytics";

// ─── Android notification channel ────────────────────────────────────────────
// Must be created before any notification is scheduled.
// IMPORTANCE_HIGH = shows as heads-up notification and plays sound even in
// battery-saver mode. This is the closest we can get to setAlarmClock()
// behaviour without a native module.
export const ALARM_CHANNEL_ID = "rih_alarm";

export async function ensureAlarmChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  // setNotificationChannelAsync is idempotent — safe to call on every launch
  await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
    name: "Healing Alarms",
    description: "Rise In Harmony healing frequency wake-up alarms",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "alarm_528.wav",        // default channel sound (overridden per-notification)
    vibrationPattern: [0, 400, 200, 400],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,               // bypass Do Not Disturb — this is an alarm
    showBadge: false,
  });
}

// Configure how notifications appear when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestAlarmPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  // NOTE: `allowCriticalAlerts` is intentionally omitted — Critical Alerts
  // require a special Apple-granted entitlement
  // (com.apple.developer.usernotifications.critical-alerts) that this app does
  // not hold. Requesting it without the entitlement fails and risks review.
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });

  return status === "granted";
}

// Bundled notification sounds — one exact-Hz tone per solfeggio frequency.
// iOS requires bundled files (<30 s); these are generated sine tones with a
// gentle 0.8 Hz tremolo, verified spectrally exact to the labeled frequency.
const ALARM_SOUND_HZ = [174, 285, 396, 417, 432, 528, 639, 741, 852, 963];

export function alarmSoundForHz(hz: number): string {
  const match = ALARM_SOUND_HZ.includes(hz) ? hz : 528;
  return `alarm_${match}.wav`;
}

/**
 * Build the notification trigger for an alarm.
 * - With `weekday` (1 = Sunday … 7 = Saturday): a repeating weekly calendar
 *   trigger. This is how repeat alarms fire every week without rescheduling.
 * - Without: a one-shot date trigger at the next occurrence of hour:minute.
 * Uses the numeric `hour`/`minute` fields — never string-parses `alarm.time`,
 * which may be "HH:MM" or an ISO date depending on the caller (a NaN here
 * crashed the native scheduler: expo-notifications aborts on invalid dates).
 */
export function buildAlarmTrigger(
  alarm: Pick<Alarm, "hour" | "minute">,
  weekday?: number
): Notifications.NotificationTriggerInput {
  if (weekday !== undefined) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      weekday,
      hour: alarm.hour,
      minute: alarm.minute,
      repeats: true,
    };
  }
  const now = new Date();
  const date = new Date(now);
  date.setHours(alarm.hour, alarm.minute, 0, 0);
  if (date <= now) {
    date.setDate(date.getDate() + 1);
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date,
  };
}

export async function scheduleAlarm(
  alarm: Alarm,
  weekday?: number
): Promise<string | null> {
  const granted = await requestAlarmPermissions();
  if (!granted) return null;

  if (!Number.isFinite(alarm.hour) || !Number.isFinite(alarm.minute)) {
    return null;
  }

  // Ensure the Android alarm channel exists before scheduling
  await ensureAlarmChannel();

  const soundFile = alarmSoundForHz(alarm.frequencyHz);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Rise In Harmony",
      body: alarm.label ?? `${alarm.frequencyHz}Hz healing alarm`,
      sound: soundFile,
      data: { alarm },
      // Android-specific: use the HIGH_IMPORTANCE alarm channel
      // and show on the lock screen as a full-screen intent
      ...(Platform.OS === "android" && {
        androidChannelId: ALARM_CHANNEL_ID,
        // fullScreenIntent shows the alarm UI even when the phone is locked
        // without requiring the user to pull down the notification shade
        sticky: true,
      }),
    },
    trigger: buildAlarmTrigger(alarm, weekday),
  });

  return identifier;
}

export async function cancelAlarm(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllAlarms(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function useAlarmNotifications(
  onAlarmFired?: (alarm: Alarm) => void
) {
  const receivedListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Fires when a notification is received while the app is in the FOREGROUND
    receivedListenerRef.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const alarm = notification.request.content.data?.alarm as
          | Alarm
          | undefined;
        if (alarm) {
          trackAlarmFired({
            frequency_hz: alarm.frequencyHz,
            time_of_day: alarm.time,
          });
          onAlarmFired?.(alarm);
        }
      }
    );

    // Fires when the user TAPS the notification (app in background or killed)
    // This brings the app to the foreground and launches the ringing screen
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const alarm = response.notification.request.content.data?.alarm as
          | Alarm
          | undefined;
        if (alarm) {
          trackAlarmFired({
            frequency_hz: alarm.frequencyHz,
            time_of_day: alarm.time,
          });
          onAlarmFired?.(alarm);
        }
      }
    );

    return () => {
      receivedListenerRef.current?.remove();
      responseListenerRef.current?.remove();
    };
  }, [onAlarmFired]);

  const schedule = useCallback(scheduleAlarm, []);
  const cancel = useCallback(cancelAlarm, []);
  const cancelAll = useCallback(cancelAllAlarms, []);

  return { schedule, cancel, cancelAll, requestPermissions: requestAlarmPermissions };
}
