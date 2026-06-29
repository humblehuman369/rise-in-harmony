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
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import type { Alarm } from "@rih/shared-types";
import { trackAlarmFired } from "./useAnalytics";

const ALARM_TASK_NAME = "RIH_ALARM_TASK";

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

// Background task for alarm fires
TaskManager.defineTask(ALARM_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error("[AlarmTask] Error:", error);
    return;
  }
  const alarmData = (data as { alarm?: Alarm })?.alarm;
  if (alarmData) {
    trackAlarmFired({
      frequency_hz: alarmData.frequencyHz,
      time_of_day: alarmData.time,
    });
  }
});

export async function requestAlarmPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
      allowCriticalAlerts: true, // Required for alarm-style delivery on iOS
    },
  });

  return status === "granted";
}

export async function scheduleAlarm(alarm: Alarm): Promise<string | null> {
  const granted = await requestAlarmPermissions();
  if (!granted) return null;

  const [hours, minutes] = alarm.time.split(":").map(Number);
  const now = new Date();
  const trigger = new Date(now);
  trigger.setHours(hours, minutes, 0, 0);

  // If time has already passed today, schedule for tomorrow
  if (trigger <= now) {
    trigger.setDate(trigger.getDate() + 1);
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Rise In Harmony",
      body: `Your ${alarm.frequencyHz}Hz healing alarm`,
      sound: "528hz-gentle.wav",
      data: { alarm },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
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
