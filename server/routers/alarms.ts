import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createAlarm,
  deleteAlarm,
  getUserAlarms,
  reconcileExpiredSubscription,
  updateAlarm,
} from "../db";
import { isUserPremium } from "../lib/entitlements";

/** Free tier: 1 wake + 1 wind_down; Premium unlimited. */
const FREE_PER_KIND_LIMIT = 1;

const kindSchema = z.enum(["wake", "wind_down"]).default("wake");

export const alarmsRouter = router({
  list: protectedProcedure
    .input(z.object({ kind: z.enum(["wake", "wind_down"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const all = await getUserAlarms(ctx.user.id);
      if (!input?.kind) return all;
      // Treat missing kind as wake for legacy rows
      return all.filter(a => (a.kind ?? "wake") === input.kind);
    }),

  create: protectedProcedure
    .input(
      z.object({
        label: z.string().max(128).optional(),
        hour: z.number().min(0).max(23),
        minute: z.number().min(0).max(59),
        days: z.array(z.number().min(0).max(6)),
        kind: kindSchema,
        soundType: z.enum(["frequency", "studio_mix"]).default("frequency"),
        frequencyHz: z.number().optional(),
        frequencyName: z.string().optional(),
        studioMixName: z.string().optional(),
        wakeSequence: z.string().optional(),
        fadeInMinutes: z.number().min(1).max(30).default(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const kind = input.kind ?? "wake";
      const user = await reconcileExpiredSubscription(ctx.user.id);
      const isPremium = isUserPremium(user);
      if (!isPremium) {
        const existing = await getUserAlarms(ctx.user.id);
        const sameKind = existing.filter(a => (a.kind ?? "wake") === kind);
        if (sameKind.length >= FREE_PER_KIND_LIMIT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: kind === "wind_down" ? "FREE_WIND_DOWN_LIMIT" : "FREE_ALARM_LIMIT",
          });
        }
      }
      const id = await createAlarm({
        userId: ctx.user.id,
        label:
          input.label ??
          (kind === "wind_down" ? "Evening wind-down" : "Morning rise"),
        hour: input.hour,
        minute: input.minute,
        days: input.days,
        kind,
        soundType: input.soundType,
        frequencyHz: input.frequencyHz,
        frequencyName: input.frequencyName,
        studioMixName: input.studioMixName,
        wakeSequence: input.wakeSequence ?? (kind === "wind_down" ? "sleep" : "gentle"),
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
        kind: z.enum(["wake", "wind_down"]).optional(),
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
        ...(fields.kind ? { kind: fields.kind } : {}),
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
