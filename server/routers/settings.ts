/**
 * Settings router — account profile, preferences, and account deletion.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getUserById,
  updateUserProfile,
  updateUserPreferences,
  deleteUserAccount,
} from "../db";

const preferencesSchema = z.object({
  // Audio
  defaultFadeInMinutes: z.number().int().min(1).max(10).optional(),
  defaultVolume: z.number().min(0).max(1).optional(),
  // Notifications
  alarmRemindersEnabled: z.boolean().optional(),
  // Theme
  theme: z.enum(["dark", "light", "system"]).optional(),
});

export const settingsRouter = router({
  /** Get the current user's full profile + preferences */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
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

  /** Export all user data as a JSON blob */
  exportData: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    // Return safe subset — no internal IDs like stripeCustomerId
    return {
      exportedAt: new Date().toISOString(),
      profile: {
        name: user.name,
        email: user.email,
        memberSince: user.createdAt,
        subscriptionTier: user.subscriptionTier,
        onboardingGoal: user.onboardingGoal,
        onboardingProfile: user.onboardingProfile,
        preferences: user.preferences,
      },
    };
  }),

  /** Permanently delete the account — requires explicit confirmation */
  deleteAccount: protectedProcedure
    .input(z.object({ confirm: z.literal("DELETE MY ACCOUNT") }))
    .mutation(async ({ ctx }) => {
      await deleteUserAccount(ctx.user.id);
      return { success: true };
    }),
});
