/**
 * TrueHz Convert — tRPC API for offline pitch-ratio jobs.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import {
  describeRetune,
  clampConcertA,
} from "../../packages/shared-utils/src/pitchMath.ts";
import { clampHz } from "../../packages/shared-utils/src/trueHzOffline.ts";
import { protectedProcedure, router } from "../_core/trpc";
import {
  countActiveConvertJobs,
  createConvertJob,
  deleteConvertJob,
  getConvertJobByPublicId,
  listConvertJobs,
  reconcileExpiredSubscription,
} from "../db";
import { isUserPremium } from "../lib/entitlements";
import {
  CONVERT_ERROR_CODES,
  isConvertEnabled,
  limitsForPremium,
} from "../lib/convert/limits";
import { storageGet, storageGetSignedUrl } from "../storage";

const pitchASchema = z.number().min(400).max(480);
const qualitySchema = z.enum(["standard", "high"]);

function jobDto(
  job: NonNullable<Awaited<ReturnType<typeof getConvertJobByPublicId>>>,
  opts?: { isPremium?: boolean },
) {
  const paid = opts?.isPremium ?? false;
  return {
    id: job.publicId,
    status: job.status,
    stage: job.stage,
    progressPct: job.progressPct,
    sourceFilename: job.sourceFilename,
    sourceDurationSec: job.sourceDurationSec,
    sourceFormat: job.sourceFormat,
    sourcePitchA: job.sourcePitchA,
    targetPitchA: job.targetPitchA,
    pitchRatio: job.pitchRatio,
    cents: job.cents,
    hybridEnabled: job.hybridEnabled,
    hybridHz: job.hybridHz,
    hybridGainDb: job.hybridGainDb,
    formantPreserve: job.formantPreserve,
    quality: job.quality,
    // Free tier only gets MP3 download surface
    hasWav: Boolean(job.outputWavKey) && paid,
    hasMp3: Boolean(job.outputMp3Key),
    /** Source is retained for A/B; client may also keep local File. */
    hasSource: Boolean(job.sourceKey),
    algorithmVersion: job.algorithmVersion,
    processingMs: job.processingMs,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    expiresAt: job.expiresAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export const convertRouter = router({
  /** Feature + limits for the current user (UI gate). */
  status: protectedProcedure.query(async ({ ctx }) => {
    const enabled = isConvertEnabled();
    const user = await reconcileExpiredSubscription(ctx.user.id);
    const premium = isUserPremium(user ?? ctx.user);
    const limits = limitsForPremium(premium);
    const active = await countActiveConvertJobs(ctx.user.id);
    return {
      enabled,
      isPremium: premium,
      limits,
      activeJobs: active,
    };
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    if (!isConvertEnabled()) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: CONVERT_ERROR_CODES.FEATURE_DISABLED,
      });
    }
    const user = await reconcileExpiredSubscription(ctx.user.id);
    const premium = isUserPremium(user ?? ctx.user);
    const jobs = await listConvertJobs(ctx.user.id);
    return jobs.map(j => jobDto(j, { isPremium: premium }));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(8).max(32) }))
    .query(async ({ ctx, input }) => {
      if (!isConvertEnabled()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: CONVERT_ERROR_CODES.FEATURE_DISABLED,
        });
      }
      const job = await getConvertJobByPublicId(input.id, ctx.user.id);
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: CONVERT_ERROR_CODES.NOT_FOUND,
        });
      }
      const user = await reconcileExpiredSubscription(ctx.user.id);
      const premium = isUserPremium(user ?? ctx.user);
      return jobDto(job, { isPremium: premium });
    }),

  /**
   * Create a job after the client has uploaded source audio via
   * POST /api/convert/upload (returns sourceKey).
   */
  createJob: protectedProcedure
    .input(
      z.object({
        sourceKey: z.string().min(1).max(512),
        sourceFilename: z.string().min(1).max(256),
        sourcePitchA: pitchASchema.default(440),
        targetPitchA: pitchASchema,
        quality: qualitySchema.default("standard"),
        hybridEnabled: z.boolean().default(false),
        hybridHz: z.number().min(1).max(22000).optional(),
        hybridGainDb: z.number().min(-48).max(0).default(-18),
        formantPreserve: z.boolean().default(false),
        /** Optional duration from client/ffprobe if known */
        sourceDurationSec: z.number().positive().max(3600).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isConvertEnabled()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: CONVERT_ERROR_CODES.FEATURE_DISABLED,
        });
      }

      const user = await reconcileExpiredSubscription(ctx.user.id);
      const premium = isUserPremium(user ?? ctx.user);
      const limits = limitsForPremium(premium);

      // Ownership: key must live under this user's convert prefix
      const expectedPrefix = `convert/${ctx.user.id}/`;
      if (!input.sourceKey.startsWith(expectedPrefix)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid sourceKey",
        });
      }

      if (input.quality === "high" && !limits.allowHighQuality) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: CONVERT_ERROR_CODES.PREMIUM_REQUIRED,
        });
      }
      if (input.hybridEnabled && !limits.allowHybrid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: CONVERT_ERROR_CODES.PREMIUM_REQUIRED,
        });
      }
      if (input.formantPreserve && !limits.allowFormant) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: CONVERT_ERROR_CODES.PREMIUM_REQUIRED,
        });
      }

      const active = await countActiveConvertJobs(ctx.user.id);
      if (active >= limits.maxConcurrent) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: CONVERT_ERROR_CODES.CONCURRENT_LIMIT,
        });
      }

      if (
        input.sourceDurationSec != null &&
        input.sourceDurationSec > limits.maxDurationSec
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: CONVERT_ERROR_CODES.TOO_LONG,
        });
      }

      const sourceA = clampConcertA(input.sourcePitchA);
      const targetA = clampConcertA(input.targetPitchA);
      const retune = describeRetune(sourceA, targetA);
      const publicId = nanoid(16);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + limits.retentionDays);

      const hybridOn = input.hybridEnabled && limits.allowHybrid;
      const hybridHz = hybridOn
        ? clampHz(input.hybridHz ?? 528)
        : null;

      const job = await createConvertJob({
        publicId,
        userId: ctx.user.id,
        status: "queued",
        stage: "queued",
        progressPct: 0,
        sourceKey: input.sourceKey,
        sourceFilename: input.sourceFilename.slice(0, 256),
        sourceDurationSec: input.sourceDurationSec ?? null,
        sourceFormat: null,
        sourcePitchA: sourceA,
        targetPitchA: targetA,
        pitchRatio: retune.ratio,
        cents: retune.cents,
        hybridEnabled: hybridOn,
        hybridHz,
        hybridGainDb: input.hybridGainDb,
        formantPreserve: input.formantPreserve && limits.allowFormant,
        quality: input.quality,
        expiresAt,
      });

      if (!job) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      }

      return jobDto(job, { isPremium: premium });
    }),

  getDownloadUrl: protectedProcedure
    .input(
      z.object({
        id: z.string().min(8).max(32),
        /** wav/mp3 = result; source = original upload for A/B preview */
        format: z.enum(["wav", "mp3", "source"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const job = await getConvertJobByPublicId(input.id, ctx.user.id);
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: CONVERT_ERROR_CODES.NOT_FOUND,
        });
      }

      if (input.format === "source") {
        try {
          const url = await storageGetSignedUrl(job.sourceKey);
          return { url, format: "source" as const };
        } catch {
          const { url } = await storageGet(job.sourceKey);
          return { url, format: "source" as const };
        }
      }

      if (job.status !== "completed") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: CONVERT_ERROR_CODES.NOT_FOUND,
        });
      }
      const user = await reconcileExpiredSubscription(ctx.user.id);
      const premium = isUserPremium(user ?? ctx.user);

      if (input.format === "wav") {
        if (!premium) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: CONVERT_ERROR_CODES.PREMIUM_REQUIRED,
          });
        }
        if (!job.outputWavKey) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: CONVERT_ERROR_CODES.NOT_FOUND,
          });
        }
        try {
          const url = await storageGetSignedUrl(job.outputWavKey);
          return { url, format: "wav" as const };
        } catch {
          const { url } = await storageGet(job.outputWavKey);
          return { url, format: "wav" as const };
        }
      }

      if (!job.outputMp3Key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: CONVERT_ERROR_CODES.NOT_FOUND,
        });
      }
      try {
        const url = await storageGetSignedUrl(job.outputMp3Key);
        return { url, format: "mp3" as const };
      } catch {
        const { url } = await storageGet(job.outputMp3Key);
        return { url, format: "mp3" as const };
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(8).max(32) }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteConvertJob(input.id, ctx.user.id);
      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: CONVERT_ERROR_CODES.NOT_FOUND,
        });
      }
      return { success: true as const };
    }),
});
