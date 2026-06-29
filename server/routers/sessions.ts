import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createSession,
  endSession,
  getUserSessions,
  getUserStats,
} from "../db";

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
        durationSeconds: z.number(),
        moodRating: z.number().min(1).max(5).optional(),
        journalNote: z.string().max(1000).optional(),
        intention: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await endSession(
        input.sessionId,
        input.durationSeconds,
        input.moodRating,
        input.journalNote,
        input.intention
      );
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
});
