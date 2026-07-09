import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { createAlarm, deleteAlarm, getUserAlarms, getUserById, updateAlarm } from "../db";

/** Free tier includes exactly one alarm; Premium/Lifetime are unlimited. */
const FREE_ALARM_LIMIT = 1;

export const alarmsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserAlarms(ctx.user.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        label: z.string().max(128).optional(),
        hour: z.number().min(0).max(23),
        minute: z.number().min(0).max(59),
        days: z.array(z.number().min(0).max(6)),
        soundType: z.enum(["frequency", "studio_mix"]).default("frequency"),
        frequencyHz: z.number().optional(),
        frequencyName: z.string().optional(),
        studioMixName: z.string().optional(),
        wakeSequence: z.string().optional(),
        fadeInMinutes: z.number().min(1).max(30).default(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      const isPremium =
        user?.subscriptionTier === "premium" || user?.subscriptionTier === "lifetime";
      if (!isPremium) {
        const existing = await getUserAlarms(ctx.user.id);
        if (existing.length >= FREE_ALARM_LIMIT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "FREE_ALARM_LIMIT",
          });
        }
      }
      const id = await createAlarm({
        userId: ctx.user.id,
        label: input.label,
        hour: input.hour,
        minute: input.minute,
        days: input.days,
        soundType: input.soundType,
        frequencyHz: input.frequencyHz,
        frequencyName: input.frequencyName,
        studioMixName: input.studioMixName,
        wakeSequence: input.wakeSequence ?? "gentle",
        fadeInMinutes: input.fadeInMinutes,
        isEnabled: true,
      });
      return { id };
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), isEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await updateAlarm(input.id, ctx.user.id, { isEnabled: input.isEnabled });
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        label: z.string().max(128).optional(),
        hour: z.number().min(0).max(23),
        minute: z.number().min(0).max(59),
        days: z.array(z.number().min(0).max(6)),
        soundType: z.enum(["frequency", "studio_mix"]).default("frequency"),
        frequencyHz: z.number().optional(),
        frequencyName: z.string().optional(),
        studioMixName: z.string().optional(),
        wakeSequence: z.string().optional(),
        fadeInMinutes: z.number().min(1).max(30).default(5),
        isEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      await updateAlarm(id, ctx.user.id, {
        label: fields.label,
        hour: fields.hour,
        minute: fields.minute,
        days: fields.days as number[],
        soundType: fields.soundType,
        frequencyHz: fields.frequencyHz,
        frequencyName: fields.frequencyName,
        studioMixName: fields.studioMixName,
        wakeSequence: fields.wakeSequence ?? "gentle",
        fadeInMinutes: fields.fadeInMinutes,
        ...(fields.isEnabled !== undefined ? { isEnabled: fields.isEnabled } : {}),
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteAlarm(input.id, ctx.user.id);
      return { success: true };
    }),
});
