import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createSession,
  endSession,
  getUserById,
  getUserSessions,
  getUserStats,
  markStreakMilestoneEmailSent,
} from "../db";
import { sendStreakMilestoneEmail } from "../email";
import { processUserReEngagement } from "../lib/reEngagement";

// Streak milestones that trigger an email (days)
const STREAK_MILESTONES = new Set([7, 30]);

export const sessionsRouter = router({
  // Start a new healing session
  start: protectedProcedure
    .input(
      z.object({
        frequencyHz: z.number(),
        frequencyName: z.string().optional(),
        sessionType: z
          .enum(["single", "chakra_sequence", "studio_mix", "sleep_timer"])
          .default("single"),
        studioPresetName: z.string().optional(),
        intention: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sessionId = await createSession({
        userId: ctx.user.id,
        frequencyHz: input.frequencyHz,
        frequencyName: input.frequencyName,
        sessionType: input.sessionType,
        studioPresetName: input.studioPresetName,
        intention: input.intention,
        durationSeconds: 0,
      });
      return { sessionId };
    }),

  // End a session and optionally save journal entry
  end: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        durationSeconds: z.number().min(0).max(24 * 60 * 60),
        moodRating: z.number().min(1).max(5).optional(),
        journalNote: z.string().max(1000).optional(),
        intention: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await endSession(
        input.sessionId,
        ctx.user.id,
        input.durationSeconds,
        input.moodRating,
        input.journalNote,
        input.intention
      );
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      // Fire-and-forget: check streak milestones and send email if needed
      Promise.resolve().then(async () => {
        try {
          const [stats, user] = await Promise.all([
            getUserStats(ctx.user.id),
            getUserById(ctx.user.id),
          ]);
          if (!stats || !user?.email) return;

          const streak = stats.currentStreak;
          if (STREAK_MILESTONES.has(streak)) {
            // markStreakMilestoneEmailSent returns false if already sent for this milestone
            const shouldSend = await markStreakMilestoneEmailSent(ctx.user.id, streak);
            if (shouldSend) {
              await sendStreakMilestoneEmail(
                user.email,
                user.name || "friend",
                streak,
              );
            }
          }
        } catch (err) {
          console.warn("[Email] Streak milestone check failed:", err);
        }
      });

      return { success: true };
    }),

  // Get recent sessions for the current user
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      return getUserSessions(ctx.user.id, input.limit);
    }),

  // Get aggregated stats for the dashboard
  stats: protectedProcedure.query(async ({ ctx }) => {
    return getUserStats(ctx.user.id);
  }),

  /**
   * Bulk import sessions from localStorage (called once on first login).
   * Accepts up to 90 entries; deduplicates by timestamp.
   */
  bulkImport: protectedProcedure
    .input(
      z.object({
        entries: z.array(
          z.object({
            timestamp: z.number(),
            frequencyHz: z.number(),
            frequencyName: z.string().optional(),
            durationMinutes: z.number(),
            mood: z.number().min(1).max(5).optional(),
            note: z.string().max(1000).optional(),
          })
        ).max(90),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get existing session timestamps to avoid duplicates
      const existing = await getUserSessions(ctx.user.id, 200);
      const existingTimestamps = new Set(
        existing.map(s => new Date(s.startedAt).getTime())
      );

      let imported = 0;
      for (const entry of input.entries) {
        // Skip if a session already exists within 60 seconds of this timestamp
        const isDuplicate = Array.from(existingTimestamps).some(
          ts => Math.abs(ts - entry.timestamp) < 60_000
        );
        if (isDuplicate) continue;

        const durationSeconds = Math.round(entry.durationMinutes * 60);
        const startedAt = new Date(entry.timestamp);

        const sessionId = await createSession({
          userId: ctx.user.id,
          frequencyHz: entry.frequencyHz,
          frequencyName: entry.frequencyName,
          sessionType: "single",
          durationSeconds,
          startedAt,
        });

        await endSession(
          sessionId,
          ctx.user.id,
          durationSeconds,
          entry.mood,
          entry.note,
        );

        existingTimestamps.add(entry.timestamp);
        imported++;
      }

      return { imported };
    }),

  /**
   * Per-user re-engagement check (legacy / client-triggered).
   * Prefer the bulk cron: POST /api/scheduled/re-engagement
   * Safe to call repeatedly; email is only sent once per 7-day window.
   */
  checkReEngagement: protectedProcedure.mutation(async ({ ctx }) => {
    return processUserReEngagement(ctx.user.id);
  }),
});
