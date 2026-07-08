import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getUserById,
  logSubscriptionEvent,
  setFounder,
  updateUserOnboarding,
  updateUserSubscription,
} from "../db";
import { sendWelcomeEmail, sendReceiptEmail } from "../email";

export const subscriptionRouter = router({
  // Get current user's subscription status
  status: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    return {
      tier: user?.subscriptionTier ?? "free",
      expiresAt: user?.subscriptionExpiresAt ?? null,
      isPremium:
        user?.subscriptionTier === "premium" || user?.subscriptionTier === "lifetime",
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
  // Protected by a shared secret in the Authorization header
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
      // Validate webhook secret
      const authHeader = ctx.req.headers["authorization"] as string | undefined;
      const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
      if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
        throw new Error("Unauthorized webhook");
      }

      const { type, app_user_id, product_id, expiration_at_ms, store, period_type } =
        input.event;

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

      if (!isNaN(userId) && tier !== null) {
        await updateUserSubscription(userId, tier, expiresAt, app_user_id);
        // A store-purchased lifetime (not a promotional comp) consumes one of
        // the capped founder seats
        if (tier === "lifetime" && !isPromotionalGrant) {
          await setFounder(userId);
        }
      }

      await logSubscriptionEvent({
        userId: isNaN(userId) ? undefined : userId,
        revenuecatUserId: app_user_id,
        eventType: type,
        productId: product_id,
        expiresAt: expiresAt ?? undefined,
        rawPayload: input.event,
      });

      return { received: true };
    }),
});
