/**
 * Admin router — user management for the admin dashboard.
 * Every procedure requires role === "admin" (enforced by adminProcedure).
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import {
  countAdminUsers,
  getAdminUserCounts,
  getUserById,
  listUsersForAdmin,
  logSubscriptionEvent,
  updateUserRole,
  updateUserSubscription,
} from "../db";
import {
  grantPromotionalEntitlement,
  isRevenueCatConfigured,
  revokePromotionalEntitlement,
} from "../revenuecat";
import { processReEngagementBatch } from "../lib/reEngagement";

export const adminRouter = router({
  /** Aggregate counts: total / active (paid) / cancelled / free */
  userStats: adminProcedure.query(async () => {
    const counts = await getAdminUserCounts();
    return counts ?? { total: 0, active: 0, cancelled: 0, free: 0 };
  }),

  /** Paged user list with subscription status */
  listUsers: adminProcedure
    .input(
      z.object({
        filter: z.enum(["all", "active", "cancelled", "free"]).default("all"),
        search: z.string().max(320).optional(),
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(100).default(25),
      })
    )
    .query(async ({ input }) => {
      return listUsersForAdmin({
        filter: input.filter,
        search: input.search?.trim() || undefined,
        limit: input.pageSize,
        offset: input.page * input.pageSize,
      });
    }),

  /**
   * Grant a user premium membership without payment (a "comp").
   * Optionally time-limited; omitting days grants lifetime.
   */
  grantMembership: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        /** Days of premium to grant; omit for lifetime */
        days: z.number().int().min(1).max(3650).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const target = await getUserById(input.userId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const tier = input.days === undefined ? "lifetime" : "premium";
      const expiresAt =
        input.days === undefined
          ? null
          : new Date(Date.now() + input.days * 24 * 60 * 60 * 1000);

      // Mirror the grant into RevenueCat as a promotional entitlement, so the
      // mobile SDK sees it and RevenueCat handles auto-expiry. RevenueCat app
      // user ids are our numeric user id as a string.
      const rcUserId = target.revenuecatUserId ?? String(input.userId);
      const revenueCatSynced = await grantPromotionalEntitlement(
        rcUserId,
        expiresAt?.getTime()
      );

      // Update our DB immediately (don't wait for the webhook round trip)
      await updateUserSubscription(input.userId, tier, expiresAt);
      // Audit trail in the same log the RevenueCat webhook writes to
      await logSubscriptionEvent({
        userId: input.userId,
        revenuecatUserId: rcUserId,
        eventType: "ADMIN_GRANT",
        productId: tier === "lifetime" ? "admin_comp_lifetime" : `admin_comp_${input.days}d`,
        expiresAt: expiresAt ?? undefined,
        rawPayload: {
          grantedByAdminId: ctx.user.id,
          days: input.days ?? null,
          revenueCatSynced,
        },
      });

      return {
        success: true,
        tier,
        expiresAt,
        revenueCatSynced,
        revenueCatConfigured: isRevenueCatConfigured(),
      };
    }),

  /** Revoke a previously granted (or paid) membership — back to free. */
  revokeMembership: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const target = await getUserById(input.userId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Revoke any promotional grants in RevenueCat (store purchases are
      // unaffected — those can only be cancelled through the store).
      const rcUserId = target.revenuecatUserId ?? String(input.userId);
      const revenueCatSynced = await revokePromotionalEntitlement(rcUserId);

      await updateUserSubscription(input.userId, "free", null);
      await logSubscriptionEvent({
        userId: input.userId,
        revenuecatUserId: rcUserId,
        eventType: "ADMIN_REVOKE",
        rawPayload: { revokedByAdminId: ctx.user.id, revenueCatSynced },
      });

      return {
        success: true,
        revenueCatSynced,
        revenueCatConfigured: isRevenueCatConfigured(),
      };
    }),

  /**
   * Promote or demote a user's admin role (DB-backed; no redeploy for RIH_ADMIN_EMAILS).
   * Guards: cannot demote yourself; cannot demote the last remaining admin.
   */
  setUserRole: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        role: z.enum(["user", "admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id && input.role === "user") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot demote yourself",
        });
      }

      const target = await getUserById(input.userId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (target.role === "admin" && input.role === "user") {
        const adminCount = await countAdminUsers();
        if (adminCount <= 1) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Cannot demote the last admin",
          });
        }
      }

      await updateUserRole(input.userId, input.role);
      await logSubscriptionEvent({
        userId: input.userId,
        eventType: input.role === "admin" ? "ADMIN_ROLE_GRANT" : "ADMIN_ROLE_REVOKE",
        rawPayload: {
          changedByAdminId: ctx.user.id,
          previousRole: target.role,
          newRole: input.role,
        },
      });

      return { success: true, role: input.role };
    }),

  /**
   * Manually run the re-engagement email batch (same logic as the cron job).
   * Useful for testing without waiting for the scheduler.
   */
  runReEngagementBatch: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).default(50) }).optional())
    .mutation(async ({ input }) => {
      return processReEngagementBatch({ limit: input?.limit ?? 50 });
    }),
});
