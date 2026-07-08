import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createUserSound,
  deleteUserSound,
  getUserSoundById,
  getUserSounds,
  getUserUploadKeys,
  renameUserSound,
} from "../db";

const waveformSchema = z.enum(["sine", "square", "triangle", "sawtooth", "bowl"]);
const modeSchema = z.enum(["mono", "binaural", "isochronic"]);
const backgroundTypeSchema = z.enum(["none", "library", "upload"]);

const soundInputSchema = z.object({
  name: z.string().min(1).max(128),
  freqL: z.number().min(1).max(22000),
  beatHz: z.number().min(0.5).max(50).optional(),
  isoRate: z.number().min(0.5).max(40).optional(),
  isoDuty: z.number().min(0.1).max(0.9).optional(),
  waveform: waveformSchema,
  mode: modeSchema,
  toneVolume: z.number().min(0).max(1).default(0.7),
  backgroundType: backgroundTypeSchema.default("none"),
  backgroundKey: z.string().max(256).optional(),
  backgroundVolume: z.number().min(0).max(1).default(0.35),
});

function validateSoundInput(input: z.infer<typeof soundInputSchema>) {
  if (input.mode === "binaural" && input.beatHz === undefined) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "beatHz is required for binaural mode",
    });
  }
  if (input.mode === "isochronic") {
    if (input.isoRate === undefined || input.isoDuty === undefined) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "isoRate and isoDuty are required for isochronic mode",
      });
    }
  }
  if (input.backgroundType !== "none" && !input.backgroundKey) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "backgroundKey is required when backgroundType is set",
    });
  }
}

export const soundsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserSounds(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const sound = await getUserSoundById(input.id, ctx.user.id);
      if (!sound) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sound not found" });
      }
      return sound;
    }),

  listUploads: protectedProcedure.query(async ({ ctx }) => {
    return getUserUploadKeys(ctx.user.id);
  }),

  create: protectedProcedure
    .input(soundInputSchema)
    .mutation(async ({ ctx, input }) => {
      validateSoundInput(input);
      const id = await createUserSound({
        userId: ctx.user.id,
        name: input.name,
        freqL: input.freqL,
        beatHz: input.beatHz ?? null,
        isoRate: input.isoRate ?? null,
        isoDuty: input.isoDuty ?? null,
        waveform: input.waveform,
        mode: input.mode,
        toneVolume: input.toneVolume,
        backgroundType: input.backgroundType,
        backgroundKey:
          input.backgroundType === "none" ? null : (input.backgroundKey ?? null),
        backgroundVolume: input.backgroundVolume,
      });
      return { id };
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const updated = await renameUserSound(input.id, ctx.user.id, input.name);
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sound not found" });
      }
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteUserSound(input.id, ctx.user.id);
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sound not found" });
      }
      return { success: true };
    }),
});
