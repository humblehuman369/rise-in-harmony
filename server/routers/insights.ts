/**
 * Personal Resonance Insights — descriptive session analytics.
 */
import { protectedProcedure, router } from "../_core/trpc";
import {
  applyStreakFreeze,
  ensureMonthlyStreakFreeze,
  getUserById,
  getUserSessions,
  getUserStats,
} from "../db";
import { computeWeeklyInsights } from "../lib/insights";
import { formatDayKey } from "../lib/streak";
import { isUserPremium } from "../lib/entitlements";

export const insightsRouter = router({
  /** Weekly / 30-day resonance insights for the dashboard. */
  weekly: protectedProcedure.query(async ({ ctx }) => {
    const [sessions, user, stats] = await Promise.all([
      getUserSessions(ctx.user.id, 200),
      getUserById(ctx.user.id),
      getUserStats(ctx.user.id),
    ]);

    const prefs = (user?.preferences as Record<string, unknown> | null) ?? {};
    const timeZone =
      typeof prefs.timezone === "string" && prefs.timezone.length > 0
        ? prefs.timezone
        : "UTC";

    // Approximate streak days from recent sessions for mood comparison
    const streakDayKeys = new Set(
      sessions
        .slice(0, 60)
        .map(s => formatDayKey(new Date(s.startedAt), timeZone))
    );

    const insights = computeWeeklyInsights(sessions, {
      timeZone,
      streakDayKeys,
    });

    return {
      ...insights,
      currentStreak: stats?.currentStreak ?? 0,
      streakFreezesRemaining: stats?.streakFreezesRemaining ?? 0,
      isPremium: isUserPremium(user),
    };
  }),

  /** Spend one monthly freeze (premium). Inventory only — streak is still day-based. */
  useStreakFreeze: protectedProcedure.mutation(async ({ ctx }) => {
    await ensureMonthlyStreakFreeze(ctx.user.id);
    return applyStreakFreeze(ctx.user.id);
  }),
});
