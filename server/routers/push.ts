/**
 * push.ts — Web Push subscription management + alarm delivery
 *
 * Endpoints:
 *   push.vapidPublicKey   — returns the VAPID public key for client subscription
 *   push.subscribe        — saves a push subscription for the current user
 *   push.unsubscribe      — removes a push subscription
 *
 * Alarm delivery:
 *   fireAlarmsNow()       — called by the scheduled cron every minute.
 *                           Finds all alarms due in the next 60 seconds and
 *                           sends a Web Push to every subscribed device.
 *
 * Environment variables required:
 *   RIH_VAPID_PUBLIC_KEY  — VAPID public key (base64url)
 *   RIH_VAPID_PRIVATE_KEY — VAPID private key (base64url)
 *   RIH_VAPID_EMAIL       — mailto: contact for VAPID (e.g. mailto:hello@riseinharmony.com)
 */
import webpush from "web-push";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { pushSubscriptions, alarms, users } from "../../drizzle/schema";
import { log } from "../lib/logger";

// ── VAPID setup ───────────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = process.env.RIH_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.RIH_VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL = process.env.RIH_VAPID_EMAIL ?? "mailto:hello@riseinharmony.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ── Router ────────────────────────────────────────────────────────────────────
export const pushRouter = router({
  /** Returns the VAPID public key so the client can subscribe. */
  vapidPublicKey: publicProcedure.query(() => {
    return { publicKey: VAPID_PUBLIC_KEY };
  }),

  /** Save a Web Push subscription for the current user's device. */
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      // Upsert: if this endpoint already exists for this user, update it
      await db.execute(
        sql`INSERT INTO push_subscriptions (userId, endpoint, p256dh, auth, userAgent)
            VALUES (${ctx.user.id}, ${input.endpoint}, ${input.p256dh}, ${input.auth}, ${input.userAgent ?? null})
            ON DUPLICATE KEY UPDATE
              p256dh = VALUES(p256dh),
              auth = VALUES(auth),
              userAgent = VALUES(userAgent),
              updatedAt = NOW()`
      );

      log.info("[push] Subscription saved", { userId: ctx.user.id });
      return { success: true };
    }),

  /** Remove a push subscription (e.g. when user disables notifications). */
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      await db
        .delete(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.userId, ctx.user.id),
            sql`endpoint = ${input.endpoint}`
          )
        );

      log.info("[push] Subscription removed", { userId: ctx.user.id });
      return { success: true };
    }),
});

// ── Alarm fire logic ──────────────────────────────────────────────────────────

/**
 * Called by the scheduled cron every minute.
 * Finds all enabled alarms that are due within the next 60 seconds
 * (based on hour/minute and days-of-week) and sends a Web Push to
 * every subscribed device for that user.
 *
 * This is the ONLY reliable way to wake a sleeping phone from a web app.
 */
export async function fireAlarmsNow(): Promise<{ fired: number; errors: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    log.warn("[push] VAPID keys not configured — skipping alarm fire");
    return { fired: 0, errors: 0 };
  }

  const db = await getDb();
  if (!db) return { fired: 0, errors: 0 };

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay(); // 0=Sun … 6=Sat

  // Find all enabled alarms matching current hour:minute
  const dueAlarms = await db
    .select({
      alarmId: alarms.id,
      userId: alarms.userId,
      label: alarms.label,
      days: alarms.days,
      soundType: alarms.soundType,
      frequencyHz: alarms.frequencyHz,
      frequencyName: alarms.frequencyName,
      ambientId: alarms.ambientId,
      meditationId: alarms.meditationId,
      wakeSequence: alarms.wakeSequence,
    })
    .from(alarms)
    .where(
      and(
        eq(alarms.isEnabled, true),
        eq(alarms.hour, currentHour),
        eq(alarms.minute, currentMinute)
      )
    );

  let fired = 0;
  let errors = 0;

  for (const alarm of dueAlarms) {
    // Check if today is in the alarm's days array
    const days = Array.isArray(alarm.days) ? alarm.days : JSON.parse(alarm.days as string);
    if (!days.includes(currentDay)) continue;

    // Get all push subscriptions for this user
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, alarm.userId));

    if (subs.length === 0) continue;

    // Build notification payload
    const soundLabel =
      alarm.soundType === "ambient" ? (alarm.ambientId ?? "Nature Sound")
      : alarm.soundType === "meditation" ? (alarm.meditationId ?? "Meditation")
      : `${alarm.frequencyHz ?? 432}Hz ${alarm.frequencyName ?? ""}`.trim();

    const payload = JSON.stringify({
      title: `⏰ Rise In Harmony — ${alarm.label ?? "Morning Harmony"}`,
      body: `${soundLabel} is ready to guide your morning.`,
      tag: `rih-alarm-${alarm.alarmId}`,
      alarmId: alarm.alarmId,
      sound: {
        type: alarm.soundType,
        frequencyHz: alarm.frequencyHz,
        ambientId: alarm.ambientId,
        meditationId: alarm.meditationId,
      },
    });

    // Send to all subscribed devices
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          {
            urgency: "high",
            TTL: 300, // 5 minutes — if device is offline, retry for 5 min
          }
        );
        fired++;
        log.info("[push] Alarm fired", {
          alarmId: alarm.alarmId,
          userId: alarm.userId,
          endpoint: sub.endpoint.slice(0, 60) + "…",
        });
      } catch (err) {
        errors++;
        const msg = err instanceof Error ? err.message : String(err);
        // 410 Gone = subscription expired — remove it
        if (msg.includes("410") || msg.includes("Gone")) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id))
            .catch(() => {});
          log.info("[push] Removed expired subscription", { subId: sub.id });
        } else {
          log.warn("[push] Failed to send push", { alarmId: alarm.alarmId, error: msg });
        }
      }
    }
  }

  return { fired, errors };
}
