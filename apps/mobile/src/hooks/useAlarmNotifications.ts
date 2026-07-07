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
 * - Uses setAlarmClock() via expo-notifications for exact delivery
 * - Requires SCHEDULE_EXACT_ALARM permission (Android 12+)
 * - Requires RECEIVE_BOOT_COMPLETED to reschedule after device restart
 * - Request REQUEST_IGNORE_BATTERY_OPTIMIZATIONS for background reliability
 */

import { useEffect, useRef, useCallback } from "react";
import * as Notifications from "expo-notifications";
import type { Alarm } from "@rih/shared-types";
import { trackAlarmFired } from "./useAnalytics";

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

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Rise In Harmony",
      body: `Your ${alarm.frequencyHz}Hz healing alarm`,
      sound: alarmSoundForHz(alarm.frequencyHz),
      data: { alarm },
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
  const listenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    listenerRef.current = Notifications.addNotificationReceivedListener(
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

    return () => {
      listenerRef.current?.remove();
    };
  }, [onAlarmFired]);

  const schedule = useCallback(scheduleAlarm, []);
  const cancel = useCallback(cancelAlarm, []);
  const cancelAll = useCallback(cancelAllAlarms, []);

  return { schedule, cancel, cancelAll, requestPermissions: requestAlarmPermissions };
}
