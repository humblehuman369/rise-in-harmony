import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createAlarm, deleteAlarm, getUserAlarms, updateAlarm } from "../db";

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

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteAlarm(input.id, ctx.user.id);
      return { success: true };
    }),
});
