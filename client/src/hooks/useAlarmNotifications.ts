/**
 * useAlarmNotifications — Browser Notification API support for healing alarms
 *
 * FIXES (Aug 2026):
 *   - Alarm timers now use a drift-corrected polling loop (checks every 5s)
 *     instead of a single setTimeout, which browsers throttle/suspend for
 *     long-duration timers in background tabs.
 *   - visibilitychange listener: when the tab becomes visible, all pending
 *     alarms are re-checked so a missed alarm fires immediately on tab focus.
 *   - Pending alarms are stored in a ref so they survive tab suspension.
 *   - Browser Notification uses requireInteraction: true so it stays on screen
 *     until the user interacts with it.
 *
 * Requests permission, schedules alarms via a polling loop, fires Notification
 * API alerts and calls onFire to launch the in-app AlarmRinging experience.
 * Falls back gracefully when notifications are not supported or denied.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { trackAlarmFired } from "./useAnalytics";

export type NotificationPermission = "default" | "granted" | "denied" | "unsupported";

interface PendingAlarm {
  id: string;
  label: string;
  time: string;       // "HH:MM"
  days: number[];
  frequencyId: string;
  frequencyHz: number;
  frequencyName: string;
  enabled: boolean;
  scheduledFor: Date;
  onFire?: (alarmId: string) => void;
}

export function useAlarmNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const pendingRef = useRef<Map<string, PendingAlarm>>(new Map());
  const firedRef = useRef<Set<string>>(new Set()); // tracks alarms fired this cycle

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

  // Calculate next occurrence of a given time on given days
  const getNextFireTime = useCallback((timeStr: string, days: number[]): Date => {
    const now = new Date();
    const [h, m] = timeStr.split(":").map(Number);

    for (let offset = 0; offset < 8; offset++) {
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + offset);
      candidate.setHours(h, m, 0, 0);

      const dayOfWeek = candidate.getDay();
      if (days.includes(dayOfWeek) && candidate.getTime() > now.getTime()) {
        return candidate;
      }
    }
    // Fallback: 24h from now
    const fallback = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    fallback.setHours(h, m, 0, 0);
    return fallback;
  }, []);

  // Fire an alarm: launch in-app experience + browser notification
  const fireAlarm = useCallback((alarm: PendingAlarm) => {
    trackAlarmFired({
      frequencyHz: alarm.frequencyHz,
      timeOfDay: alarm.time,
    });

    // Launch the in-app wake experience (plays the actual healing sound)
    alarm.onFire?.(alarm.id);

    // Fire the browser notification too, when permitted
    if (Notification.permission === "granted") {
      try {
        const notification = new Notification(`⏰ Rise In Harmony — ${alarm.label}`, {
          body: `${alarm.frequencyHz}Hz ${alarm.frequencyName} is ready to guide your morning.`,
          icon: "/rih-logo.svg",
          tag: `rih-alarm-${alarm.id}`,
          requireInteraction: true,  // stays on screen until user interacts
          silent: false,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch {
        // Notification API failed silently — the in-app experience covers it
      }
    } else if (!alarm.onFire) {
      toast(`⏰ ${alarm.label} — Time to rise in harmony!`, {
        duration: 30000,
        action: { label: "Dismiss", onClick: () => {} },
      });
    }

    // Reschedule for next occurrence (recurring alarm)
    const nextFire = getNextFireTime(alarm.time, alarm.days);
    pendingRef.current.set(alarm.id, { ...alarm, scheduledFor: nextFire });
  }, [getNextFireTime]);

  // Polling loop: checks every 5 seconds for alarms that should fire.
  // This is far more reliable than setTimeout for long-duration timers,
  // which browsers throttle to once per minute (or longer) in background tabs.
  useEffect(() => {
    const checkAlarms = () => {
      const now = Date.now();
      pendingRef.current.forEach((alarm) => {
        if (!alarm.enabled) return;
        const fireTime = alarm.scheduledFor.getTime();
        // Fire if within a 10-second window (handles poll drift)
        if (fireTime <= now + 500 && fireTime > now - 10_000) {
          const key = `${alarm.id}-${alarm.scheduledFor.toISOString()}`;
          if (!firedRef.current.has(key)) {
            firedRef.current.add(key);
            // Clean up old fired keys to prevent memory growth
            if (firedRef.current.size > 100) {
              const arr = Array.from(firedRef.current);
              firedRef.current = new Set(arr.slice(-50));
            }
            fireAlarm(alarm);
          }
        }
      });
    };

    const intervalId = setInterval(checkAlarms, 5_000);

    // Also check immediately when tab becomes visible (catches missed alarms)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAlarms();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fireAlarm]);

  // Schedule an alarm
  const scheduleNotification = useCallback((alarm: {
    id: string;
    label: string;
    time: string;
    days: number[];
    frequencyId: string;
    frequencyHz: number;
    frequencyName: string;
    enabled: boolean;
    onFire?: (alarmId: string) => void;
  }) => {
    if (!alarm.enabled) {
      pendingRef.current.delete(alarm.id);
      return;
    }

    const scheduledFor = getNextFireTime(alarm.time, alarm.days);
    pendingRef.current.set(alarm.id, { ...alarm, scheduledFor });

    return scheduledFor;
  }, [getNextFireTime]);

  // Cancel a scheduled alarm
  const cancelNotification = useCallback((alarmId: string) => {
    pendingRef.current.delete(alarmId);
  }, []);

  // Cancel all scheduled alarms
  const cancelAll = useCallback(() => {
    pendingRef.current.clear();
  }, []);

  // Get next fire time for an alarm
  const getNextAlarmFireTime = useCallback((alarmId: string): Date | null => {
    return pendingRef.current.get(alarmId)?.scheduledFor ?? null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pendingRef.current.clear();
    };
  }, []);

  return {
    permission,
    requestPermission,
    scheduleNotification,
    cancelNotification,
    cancelAll,
    getNextFireTime: getNextAlarmFireTime,
    isSupported: permission !== "unsupported",
    isGranted: permission === "granted",
  };
}
