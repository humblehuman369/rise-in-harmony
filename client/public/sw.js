/**
 * Rise In Harmony — Service Worker
 *
 * Handles Web Push notifications for alarms so they fire even when:
 *   - The browser tab is closed
 *   - The phone screen is off / locked
 *   - The app is in the background
 *
 * The server sends a push at alarm time via VAPID Web Push.
 * This service worker receives it and shows a notification.
 * When the user taps the notification, the app opens and the
 * AlarmRinging screen launches automatically.
 *
 * Also handles: periodic background sync fallback (where supported).
 */

const CACHE_NAME = "rih-v1";
const APP_URL = self.location.origin;

// ── Install: skip waiting so new SW activates immediately ──────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// ── Activate: claim all clients immediately ────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Push: fired by server at alarm time ───────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Rise In Harmony", body: "Your healing alarm is ready." };
  }

  const title = data.title || "⏰ Rise In Harmony";
  const options = {
    body: data.body || "Your healing alarm is ringing.",
    icon: "/rih-logo.svg",
    badge: "/rih-logo.svg",
    tag: data.tag || "rih-alarm",
    // requireInteraction keeps the notification on screen until user taps it
    requireInteraction: true,
    // renotify: true re-shows even if same tag is already shown
    renotify: true,
    // vibrate pattern: 3 pulses — gentle but noticeable
    vibrate: [400, 200, 400, 200, 400],
    // data payload passed through to notificationclick
    data: {
      alarmId: data.alarmId || null,
      url: APP_URL + "/?alarm=" + (data.alarmId || ""),
      sound: data.sound || null,
    },
    // actions shown on the notification
    actions: [
      { action: "open", title: "Wake Up 🌅" },
      { action: "snooze", title: "Snooze 5 min 💤" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification click ─────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};

  if (action === "snooze") {
    // Tell the app to snooze — will be handled when the app opens
    const snoozeUrl = APP_URL + "/?alarm=" + (notifData.alarmId || "") + "&snooze=1";
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          if (client.url.startsWith(APP_URL)) {
            client.focus();
            client.postMessage({ type: "RIH_ALARM_SNOOZE", alarmId: notifData.alarmId });
            return;
          }
        }
        return self.clients.openWindow(snoozeUrl);
      })
    );
    return;
  }

  // Default: open app and fire alarm
  const targetUrl = notifData.url || APP_URL + "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.startsWith(APP_URL)) {
          client.focus();
          client.postMessage({
            type: "RIH_ALARM_FIRE",
            alarmId: notifData.alarmId,
            sound: notifData.sound,
          });
          return;
        }
      }
      // Open new tab
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ── Notification close (dismissed without tapping) ────────────────────────
self.addEventListener("notificationclose", (event) => {
  // Optionally track dismissals — for now just log
  console.log("[RIH SW] Alarm notification dismissed without action");
});

// ── Message from app ───────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
