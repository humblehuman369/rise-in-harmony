/**
 * useAlarmPush — Service Worker + Web Push subscription management
 *
 * This hook is the client-side half of the alarm push system.
 * It:
 *   1. Registers the service worker (sw.js) on mount
 *   2. Fetches the VAPID public key from the server
 *   3. Subscribes the device to Web Push (with user permission)
 *   4. Saves the subscription to the server via trpc.push.subscribe
 *   5. Listens for messages from the SW (alarm fire / snooze events)
 *
 * The service worker receives a push from the server at alarm time and
 * shows a notification even when the screen is off or the tab is closed.
 * When the user taps the notification, the SW posts a message to the app
 * which triggers the AlarmRinging screen.
 *
 * Usage:
 *   const { isSubscribed, subscribe, unsubscribe } = useAlarmPush({ onAlarmFire, onAlarmSnooze });
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

interface UseAlarmPushOptions {
  /** Called when the SW posts a RIH_ALARM_FIRE message */
  onAlarmFire?: (alarmId: number | null) => void;
  /** Called when the SW posts a RIH_ALARM_SNOOZE message */
  onAlarmSnooze?: (alarmId: number | null) => void;
}

interface UseAlarmPushReturn {
  /** Whether this device has an active push subscription */
  isSubscribed: boolean;
  /** Whether the service worker is registered and ready */
  isReady: boolean;
  /** Subscribe this device to alarm push notifications */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe this device */
  unsubscribe: () => Promise<void>;
  /** Whether push is supported in this browser */
  isSupported: boolean;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export function useAlarmPush({
  onAlarmFire,
  onAlarmSnooze,
}: UseAlarmPushOptions = {}): UseAlarmPushReturn {
  const { isAuthenticated } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  // Fetch VAPID public key
  const vapidQuery = trpc.push.vapidPublicKey.useQuery(undefined, {
    enabled: isAuthenticated && isSupported,
    staleTime: Infinity,
  });

  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();

  // ── Register service worker ────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        swRegistrationRef.current = registration;
        setIsReady(true);

        // Check if already subscribed
        return registration.pushManager.getSubscription();
      })
      .then((existingSub) => {
        if (existingSub) {
          setIsSubscribed(true);
        }
      })
      .catch((err) => {
        console.warn("[useAlarmPush] Service worker registration failed:", err);
      });
  }, [isSupported]);

  // ── Listen for messages from the service worker ───────────────────────────
  useEffect(() => {
    if (!isSupported) return;

    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === "RIH_ALARM_FIRE") {
        onAlarmFire?.(event.data.alarmId ?? null);
      } else if (event.data.type === "RIH_ALARM_SNOOZE") {
        onAlarmSnooze?.(event.data.alarmId ?? null);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [isSupported, onAlarmFire, onAlarmSnooze]);

  // ── Also handle URL params from notification tap (when app was closed) ────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const alarmId = params.get("alarm");
    const snooze = params.get("snooze");

    if (alarmId) {
      // Clean URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);

      if (snooze === "1") {
        onAlarmSnooze?.(parseInt(alarmId) || null);
      } else {
        onAlarmFire?.(parseInt(alarmId) || null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !isAuthenticated) return false;

    const vapidKey = vapidQuery.data?.publicKey;
    if (!vapidKey) {
      toast("Push notifications not configured — alarm will still work in-app");
      return false;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast("Notification permission denied — alarm will only work when the app is open");
        return false;
      }

      // Get or create SW registration
      let registration = swRegistrationRef.current;
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        swRegistrationRef.current = registration;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJson = subscription.toJSON();
      const p256dh = subJson.keys?.p256dh ?? "";
      const auth = subJson.keys?.auth ?? "";

      // Save to server
      await subscribeMutation.mutateAsync({
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        userAgent: navigator.userAgent.slice(0, 512),
      });

      setIsSubscribed(true);
      toast("✓ Alarm push enabled — your alarm will fire even when the screen is off");
      return true;
    } catch (err) {
      console.error("[useAlarmPush] Subscribe failed:", err);
      toast("Could not enable push notifications — alarm will still work in-app");
      return false;
    }
  }, [isSupported, isAuthenticated, vapidQuery.data, subscribeMutation]);

  // ── Unsubscribe ───────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!isSupported) return;

    try {
      const registration = swRegistrationRef.current;
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;

      await unsubscribeMutation.mutateAsync({ endpoint: subscription.endpoint });
      await subscription.unsubscribe();
      setIsSubscribed(false);
    } catch (err) {
      console.error("[useAlarmPush] Unsubscribe failed:", err);
    }
  }, [isSupported, unsubscribeMutation]);

  // ── Auto-subscribe when authenticated and SW is ready ────────────────────
  // Only auto-subscribe if permission was already granted (don't prompt on load)
  useEffect(() => {
    if (!isReady || !isAuthenticated || !isSupported) return;
    if (Notification.permission !== "granted") return;

    const vapidKey = vapidQuery.data?.publicKey;
    if (!vapidKey) return;

    // Check if already subscribed
    swRegistrationRef.current?.pushManager.getSubscription().then((sub) => {
      if (sub) {
        setIsSubscribed(true);
        // Refresh the subscription on the server (in case it expired)
        const subJson = sub.toJSON();
        subscribeMutation.mutateAsync({
          endpoint: sub.endpoint,
          p256dh: subJson.keys?.p256dh ?? "",
          auth: subJson.keys?.auth ?? "",
          userAgent: navigator.userAgent.slice(0, 512),
        }).catch(() => {});
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isAuthenticated, isSupported, vapidQuery.data]);

  return { isSubscribed, isReady, subscribe, unsubscribe, isSupported };
}
