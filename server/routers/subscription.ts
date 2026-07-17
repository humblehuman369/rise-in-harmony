/**
 * Subscription status, onboarding completion, and RevenueCat webhooks.
 * Mobile billing is owned by RevenueCat; web billing lives in billing.ts.
 * Both write users.subscriptionTier as the single entitlement source of truth.
 */
import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getUserById,
  hasProcessedExternalEvent,
  logSubscriptionEvent,
  reconcileExpiredSubscription,
  tryClaimFounderSeat,
  updateUserOnboarding,
  updateUserSubscription,
} from "../db";
import { sendWelcomeEmail } from "../email";
import { FOUNDER_SEAT_CAP } from "../stripe";
import { effectiveTier, isUserPremium } from "../lib/entitlements";
import { log } from "../lib/logger";

/** Constant-time comparison of bearer secrets (length-safe). */
function safeEqualSecret(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function assertRevenueCatWebhookAuth(authHeader: string | undefined): void {
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET ?? "";
  // Fail closed: missing secret means the endpoint must not process events.
  if (!webhookSecret) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "RevenueCat webhook is not configured",
    });
  }
  const expected = `Bearer ${webhookSecret}`;
  if (typeof authHeader !== "string" || !safeEqualSecret(authHeader, expected)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized webhook",
    });
  }
}

export const subscriptionRouter = router({
  // Get current user's subscription status (enforces expiry write-back)
  status: protectedProcedure.query(async ({ ctx }) => {
    const user =
      (await reconcileExpiredSubscription(ctx.user.id)) ??
      (await getUserById(ctx.user.id));
    return {
      tier: user ? effectiveTier(user) : "free",
      expiresAt: user?.subscriptionExpiresAt ?? null,
      isPremium: isUserPremium(user),
    };
  }),

  // Complete onboarding — save goal + quiz profile, mark done, send welcome email
  completeOnboarding: protectedProcedure
    .input(
      z.object({
        goal: z.string().min(1).max(64),
        profile: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateUserOnboarding(ctx.user.id, input.goal, input.profile);
      // Fire welcome email asynchronously (don't block response)
      if (ctx.user.email) {
        sendWelcomeEmail(ctx.user.email, ctx.user.name || "Friend", input.goal).catch(console.error);
      }
      return { success: true };
    }),

  // RevenueCat webhook — called by RevenueCat server, not the user
  // Protected by a shared secret in the Authorization header (fail-closed).
  revenuecatWebhook: publicProcedure
    .input(
      z.object({
        event: z.object({
          type: z.string(),
          app_user_id: z.string(),
          product_id: z.string().optional(),
          expiration_at_ms: z.number().optional(),
          // Set to "PROMOTIONAL" for entitlements granted via the RevenueCat
          // dashboard/API (comps) rather than store purchases
          store: z.string().optional(),
          period_type: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertRevenueCatWebhookAuth(
        typeof ctx.req.headers["authorization"] === "string"
          ? ctx.req.headers["authorization"]
          : undefined
      );

      const { type, app_user_id, product_id, expiration_at_ms, store, period_type } =
        input.event;

      // Stable id for retries (RC payloads vary; type+user+product+expiry is enough)
      const externalEventId = [
        "rc",
        type,
        app_user_id,
        product_id ?? "",
        expiration_at_ms ?? "",
        store ?? "",
      ].join(":");

      if (await hasProcessedExternalEvent(externalEventId)) {
        log.info("RevenueCat webhook duplicate ignored", { externalEventId });
        return { received: true, duplicate: true as const };
      }

      // Determine tier from event type. Unrecognized event types (e.g.
      // TRANSFER, SUBSCRIPTION_PAUSED, ordinary NON_RENEWING_PURCHASE) are
      // logged but must NOT touch the tier.
      let tier: "free" | "premium" | "lifetime" | null = null;
      let expiresAt: Date | null = null;

      // Promotional entitlements (granted via the RevenueCat dashboard/API)
      // arrive as NON_RENEWING_PURCHASE with store/period_type PROMOTIONAL
      const isPromotionalGrant =
        type === "NON_RENEWING_PURCHASE" &&
        (store === "PROMOTIONAL" || period_type === "PROMOTIONAL");

      if (
        type === "INITIAL_PURCHASE" ||
        type === "RENEWAL" ||
        type === "PRODUCT_CHANGE" ||
        type === "UNCANCELLATION" ||
        isPromotionalGrant
      ) {
        if (product_id?.includes("lifetime")) {
          tier = "lifetime";
        } else {
          tier = "premium";
          expiresAt = expiration_at_ms ? new Date(expiration_at_ms) : null;
        }
      } else if (
        type === "CANCELLATION" ||
        type === "EXPIRATION" ||
        type === "BILLING_ISSUE"
      ) {
        tier = "free";
      }

      // Find user by RevenueCat user ID (which we set to our user ID string)
      // RevenueCat app_user_id is set to the user's numeric ID as a string
      const userId = parseInt(app_user_id, 10);

      // Record first (unique externalEventId) so concurrent retries skip side effects
      const { inserted } = await logSubscriptionEvent({
        userId: isNaN(userId) ? undefined : userId,
        revenuecatUserId: app_user_id,
        eventType: type,
        productId: product_id,
        externalEventId,
        expiresAt: expiresAt ?? undefined,
        rawPayload: input.event,
      });
      if (!inserted) {
        return { received: true, duplicate: true as const };
      }

      if (!isNaN(userId) && tier !== null) {
        await updateUserSubscription(userId, tier, expiresAt, app_user_id);
        // A store-purchased lifetime (not a promotional comp) consumes one of
        // the capped founder seats
        if (tier === "lifetime" && !isPromotionalGrant) {
          const claimed = await tryClaimFounderSeat(userId, FOUNDER_SEAT_CAP);
          if (!claimed) {
            log.warn("Founder seat cap reached; lifetime grant without founder flag", {
              userId,
            });
          }
        }
      }

      return { received: true };
    }),
});
