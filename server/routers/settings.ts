/**
 * Settings router — account profile, preferences, export, and account deletion.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { protectedProcedure, router } from "../_core/trpc";
import {
  deleteUserAccount,
  exportUserData,
  getUserById,
  getUserUploadKeys,
  reconcileExpiredSubscription,
  updateUserPreferences,
  updateUserProfile,
} from "../db";
import { getSessionCookieOptions } from "../_core/cookies";
import { effectiveTier, isUserPremium } from "../lib/entitlements";
import { log } from "../lib/logger";
import { isStripeConfigured, getStripe } from "../stripe";
import {
  isRevenueCatConfigured,
  revokePromotionalEntitlement,
} from "../revenuecat";

const preferencesSchema = z.object({
  // Audio
  defaultFadeInMinutes: z.number().int().min(1).max(10).optional(),
  defaultVolume: z.number().min(0).max(1).optional(),
  // Notifications
  alarmRemindersEnabled: z.boolean().optional(),
  // Theme
  theme: z.enum(["dark", "light", "system"]).optional(),
  // IANA timezone for streak / local-day analytics (e.g. "America/Los_Angeles")
  timezone: z.string().min(1).max(64).optional(),
});

async function cancelStripeSubscriptions(customerId: string): Promise<void> {
  if (!isStripeConfigured()) return;
  try {
    const stripe = getStripe();
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });
    for (const sub of subs.data) {
      if (sub.status === "canceled") continue;
      try {
        await stripe.subscriptions.cancel(sub.id);
      } catch (err) {
        log.warn("Failed to cancel Stripe subscription on account delete", {
          subscriptionId: sub.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } catch (err) {
    log.warn("Stripe cleanup failed during account delete", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export const settingsRouter = router({
  /** Get the current user's full profile + preferences */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user =
      (await reconcileExpiredSubscription(ctx.user.id)) ??
      (await getUserById(ctx.user.id));
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      subscriptionTier: effectiveTier(user),
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      isPremium: isUserPremium(user),
      isFounder: user.isFounder,
      createdAt: user.createdAt,
      preferences: (user.preferences as Record<string, unknown>) ?? {},
    };
  }),

  /** Update display name */
  updateProfile: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      await updateUserProfile(ctx.user.id, { name: input.name });
      return { success: true };
    }),

  /** Update one or more preferences */
  updatePreferences: protectedProcedure
    .input(preferencesSchema)
    .mutation(async ({ ctx, input }) => {
      await updateUserPreferences(ctx.user.id, input as Record<string, unknown>);
      return { success: true };
    }),

  /** Export all user data as a JSON blob (GDPR portability) */
  exportData: protectedProcedure.query(async ({ ctx }) => {
    const data = await exportUserData(ctx.user.id);
    if (!data) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }
    return data;
  }),

  /**
   * Permanently delete the account — cancels billing, revokes promo entitlements,
   * removes DB rows (cascade), and clears the session cookie.
   */
  deleteAccount: protectedProcedure
    .input(z.object({ confirm: z.literal("DELETE MY ACCOUNT") }))
    .mutation(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // 1. Cancel active Stripe subscriptions
      if (user.stripeCustomerId) {
        await cancelStripeSubscriptions(user.stripeCustomerId);
      }

      // 2. Revoke RevenueCat promotional entitlements
      if (isRevenueCatConfigured()) {
        const rcId = user.revenuecatUserId ?? String(user.id);
        await revokePromotionalEntitlement(rcId);
      }

      // 3. Best-effort note of upload keys (Forge may not support delete API)
      try {
        const keys = await getUserUploadKeys(user.id);
        if (keys.length > 0) {
          log.info("Account delete: user upload keys orphaned (no storage delete API)", {
            userId: user.id,
            keyCount: keys.length,
          });
        }
      } catch (err) {
        log.warn("Account delete: failed listing upload keys", {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // 4. Delete user row (FK cascades clean child tables)
      await deleteUserAccount(user.id);

      // 5. Clear session cookie so the browser cannot keep calling as this user
      try {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      } catch {
        // non-fatal
      }

      log.info("Account deleted", { userId: user.id });
      return { success: true };
    }),
});
