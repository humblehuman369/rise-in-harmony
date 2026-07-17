/**
 * Structured programs — enroll, progress, complete days.
 * Catalog is static in @rih/shared-utils; progress is per-user in MySQL.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  abandonProgram,
  completeProgramDay,
  enrollProgram,
  getUserProgram,
  listProgramCompletions,
  listUserPrograms,
  reconcileExpiredSubscription,
} from "../db";
import { isUserPremium } from "../lib/entitlements";
import {
  getProgramById,
  getProgramDay,
  isProgramDayPremium,
  PROGRAMS,
} from "../../packages/shared-utils/src/programs.ts";

export const programsRouter = router({
  /** Full static catalog (no auth). */
  catalog: publicProcedure.query(() => {
    return PROGRAMS.map(p => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      totalDays: p.totalDays,
      freeDays: p.freeDays,
      accentColor: p.accentColor,
      icon: p.icon,
    }));
  }),

  /** One program with day list. */
  get: publicProcedure
    .input(z.object({ programId: z.string().min(1).max(64) }))
    .query(({ input }) => {
      const program = getProgramById(input.programId);
      if (!program) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }
      return program;
    }),

  /** Current user's active enrollments + completion counts. */
  myPrograms: protectedProcedure.query(async ({ ctx }) => {
    const enrollments = await listUserPrograms(ctx.user.id);
    const detailed = await Promise.all(
      enrollments.map(async e => {
        const program = getProgramById(e.programId);
        const completions = await listProgramCompletions(ctx.user.id, e.programId);
        return {
          enrollment: e,
          program: program
            ? {
                id: program.id,
                name: program.name,
                tagline: program.tagline,
                totalDays: program.totalDays,
                freeDays: program.freeDays,
                accentColor: program.accentColor,
                icon: program.icon,
              }
            : null,
          completedDays: completions.map(c => c.dayNumber),
          progressPct: program
            ? Math.round((completions.length / program.totalDays) * 100)
            : 0,
        };
      })
    );
    return detailed;
  }),

  enroll: protectedProcedure
    .input(z.object({ programId: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const program = getProgramById(input.programId);
      if (!program) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }
      const id = await enrollProgram(ctx.user.id, input.programId);
      return { success: true, enrollmentId: id };
    }),

  abandon: protectedProcedure
    .input(z.object({ programId: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const ok = await abandonProgram(ctx.user.id, input.programId);
      if (!ok) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment not found" });
      }
      return { success: true };
    }),

  /** Today's recommended day for an enrollment. */
  today: protectedProcedure
    .input(z.object({ programId: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const program = getProgramById(input.programId);
      if (!program) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }
      const enrollment = await getUserProgram(ctx.user.id, input.programId);
      const completions = await listProgramCompletions(ctx.user.id, input.programId);
      const completedSet = new Set(completions.map(c => c.dayNumber));
      // First incomplete day
      let dayNumber = 1;
      for (let d = 1; d <= program.totalDays; d++) {
        if (!completedSet.has(d)) {
          dayNumber = d;
          break;
        }
        dayNumber = d;
      }
      if (completedSet.size >= program.totalDays) {
        dayNumber = program.totalDays;
      }
      const day = getProgramDay(input.programId, dayNumber)!;
      const user = await reconcileExpiredSubscription(ctx.user.id);
      const premium = isUserPremium(user);
      const locked = day.isPremium && !premium;

      return {
        enrollment,
        day,
        locked,
        completedDays: [...completedSet],
        allComplete: completedSet.size >= program.totalDays,
        requiresPremium: locked,
      };
    }),

  completeDay: protectedProcedure
    .input(
      z.object({
        programId: z.string().min(1).max(64),
        dayNumber: z.number().int().min(1).max(60),
        sessionId: z.number().int().positive().optional(),
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const program = getProgramById(input.programId);
      if (!program) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }
      const day = getProgramDay(input.programId, input.dayNumber);
      if (!day) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid day" });
      }

      if (isProgramDayPremium(input.programId, input.dayNumber)) {
        const user = await reconcileExpiredSubscription(ctx.user.id);
        if (!isUserPremium(user)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "PREMIUM_REQUIRED",
          });
        }
      }

      // Auto-enroll if needed
      let enrollment = await getUserProgram(ctx.user.id, input.programId);
      if (!enrollment) {
        await enrollProgram(ctx.user.id, input.programId);
        enrollment = await getUserProgram(ctx.user.id, input.programId);
      }

      const result = await completeProgramDay({
        userId: ctx.user.id,
        programId: input.programId,
        dayNumber: input.dayNumber,
        sessionId: input.sessionId,
        note: input.note,
        totalDays: program.totalDays,
      });

      return {
        success: true,
        ...result,
        nextDay:
          input.dayNumber < program.totalDays ? input.dayNumber + 1 : null,
        nextDayPremium:
          input.dayNumber + 1 <= program.totalDays
            ? isProgramDayPremium(input.programId, input.dayNumber + 1)
            : false,
      };
    }),
});
