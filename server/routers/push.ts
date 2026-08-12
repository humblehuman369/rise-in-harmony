/**
 * push.ts — Web Push subscription management
 *
 * Endpoints:
 *   push.vapidPublicKey   — returns the VAPID public key for client subscription
 *   push.subscribe        — saves a push subscription for the current user
 *   push.unsubscribe      — removes a push subscription
 *
 * This router owns subscriptions only. Alarm *delivery* moved to
 * server/alarm-dispatcher, which runs as its own Railway service
 * (rih-alarm-dispatcher) on a bounded 30-60s loop.
 *
 * The previous fireAlarmsNow() here matched alarms against the API container's
 * LOCAL clock (new Date().getHours()), so every user was effectively woken on
 * Railway time, and a duplicate or missed cron tick had no ledger to reconcile
 * against. The dispatcher schedules per-alarm IANA timezone with a durable
 * delivery ledger, leases and bounded retries instead.
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
import { pushSubscriptions } from "../../drizzle/schema";
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
