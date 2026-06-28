/**
 * useAlarmNotifications — Browser Notification API support for healing alarms
 * Requests permission, schedules alarms via setTimeout, fires Notification API alerts
 * Falls back gracefully when notifications are not supported or denied
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

export type NotificationPermission = "default" | "granted" | "denied" | "unsupported";

interface ScheduledAlarm {
  id: string;
  label: string;
  frequencyHz: number;
  frequencyName: string;
  timeoutId: ReturnType<typeof setTimeout>;
  scheduledFor: Date;
}

export function useAlarmNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const scheduledRef = useRef<Map<string, ScheduledAlarm>>(new Map());

  // Check initial permission state
  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as NotificationPermission);
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast("Browser notifications are not supported in this browser.");
      return false;
    }
    if (Notification.permission === "granted") {
      setPermission("granted");
      return true;
    }
    if (Notification.permission === "denied") {
      toast("Notifications are blocked. Please enable them in your browser settings.");
      setPermission("denied");
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      if (result === "granted") {
        toast("✓ Notifications enabled — your healing alarms will fire on time");
        return true;
      } else {
        toast("Notifications declined — alarms will still show in-app");
        return false;
      }
    } catch {
      return false;
    }
  }, []);

  // Calculate milliseconds until next occurrence of a given time on given days
  const msUntilNextAlarm = useCallback((timeStr: string, days: number[]): number => {
    const now = new Date();
    const [h, m] = timeStr.split(":").map(Number);

    // Try each of the next 7 days
    for (let offset = 0; offset < 8; offset++) {
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + offset);
      candidate.setHours(h, m, 0, 0);

      const dayOfWeek = candidate.getDay();
      if (days.includes(dayOfWeek) && candidate.getTime() > now.getTime()) {
        return candidate.getTime() - now.getTime();
      }
    }
    // Fallback: 24h from now
    return 24 * 60 * 60 * 1000;
  }, []);

  // Schedule a browser notification for an alarm
  const scheduleNotification = useCallback((alarm: {
    id: string;
    label: string;
    time: string;
    days: number[];
    frequencyId: string;
    frequencyHz: number;
    frequencyName: string;
    enabled: boolean;
  }) => {
    if (!alarm.enabled) return;
    if (permission !== "granted") return;

    // Clear any existing timeout for this alarm
    const existing = scheduledRef.current.get(alarm.id);
    if (existing) {
      clearTimeout(existing.timeoutId);
      scheduledRef.current.delete(alarm.id);
    }

    const ms = msUntilNextAlarm(alarm.time, alarm.days);
    const scheduledFor = new Date(Date.now() + ms);

    const timeoutId = setTimeout(() => {
      // Fire the notification
      try {
        const notification = new Notification(`⏰ Rise In Harmony — ${alarm.label}`, {
          body: `${alarm.frequencyHz}Hz ${alarm.frequencyName} is ready to guide your morning.`,
          icon: "/favicon.ico",
          tag: `rih-alarm-${alarm.id}`,
          requireInteraction: true,
          silent: false,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch {
        // Notification API failed silently — in-app toast as fallback
        toast(`⏰ ${alarm.label} — Time to rise in harmony!`, {
          duration: 10000,
          action: { label: "Dismiss", onClick: () => {} },
        });
      }

      // Reschedule for next occurrence
      scheduledRef.current.delete(alarm.id);
      scheduleNotification(alarm);
    }, ms);

    scheduledRef.current.set(alarm.id, {
      id: alarm.id,
      label: alarm.label,
      frequencyHz: alarm.frequencyHz,
      frequencyName: alarm.frequencyName,
      timeoutId,
      scheduledFor,
    });

    return scheduledFor;
  }, [permission, msUntilNextAlarm]);

  // Cancel a scheduled notification
  const cancelNotification = useCallback((alarmId: string) => {
    const scheduled = scheduledRef.current.get(alarmId);
    if (scheduled) {
      clearTimeout(scheduled.timeoutId);
      scheduledRef.current.delete(alarmId);
    }
  }, []);

  // Cancel all scheduled notifications
  const cancelAll = useCallback(() => {
    scheduledRef.current.forEach(({ timeoutId }) => clearTimeout(timeoutId));
    scheduledRef.current.clear();
  }, []);

  // Get next fire time for an alarm
  const getNextFireTime = useCallback((alarmId: string): Date | null => {
    return scheduledRef.current.get(alarmId)?.scheduledFor ?? null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scheduledRef.current.forEach(({ timeoutId }) => clearTimeout(timeoutId));
    };
  }, []);

  return {
    permission,
    requestPermission,
    scheduleNotification,
    cancelNotification,
    cancelAll,
    getNextFireTime,
    isSupported: permission !== "unsupported",
    isGranted: permission === "granted",
  };
}
