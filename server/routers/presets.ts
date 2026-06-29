import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createPreset, deletePreset, getUserPresets } from "../db";

export const presetsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserPresets(ctx.user.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(128),
        frequencyHz: z.number(),
        frequencyVolume: z.number().min(0).max(1).default(0.7),
        musicStyle: z.string().optional(),
        musicVolume: z.number().min(0).max(1).default(0.4),
        natureSound: z.string().optional(),
        natureVolume: z.number().min(0).max(1).default(0.3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createPreset({
        userId: ctx.user.id,
        name: input.name,
        frequencyHz: input.frequencyHz,
        frequencyVolume: input.frequencyVolume,
        musicStyle: input.musicStyle,
        musicVolume: input.musicVolume,
        natureSound: input.natureSound,
        natureVolume: input.natureVolume,
      });
      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deletePreset(input.id, ctx.user.id);
      return { success: true };
    }),
});
