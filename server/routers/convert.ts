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
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  countActiveConvertJobs,
  createConvertJob,
  deleteConvertJob,
  getConvertJobByPublicId,
  listConvertJobs,
  reconcileExpiredSubscription,
  renameConvertJob,
} from "../db";
import { isUserPremium } from "../lib/entitlements";
import {
  CONVERT_ERROR_CODES,
  isConvertEnabled,
  limitsForPremium,
  type ConvertTierLimits,
} from "../lib/convert/limits";
import { detectConcertAFromWavFile } from "../lib/convert/pitchDetect";
import { which } from "../lib/convert/pipeline";
import { storageGet, storageGetSignedUrl, storagePresignPut } from "../storage";
import { spawn } from "node:child_process";

const pitchASchema = z.number().min(400).max(480);
const qualitySchema = z.enum(["standard", "high"]);

const jobCreateFields = z.object({
  sourceKey: z.string().min(1).max(512),
  sourceFilename: z.string().min(1).max(256),
  sourcePitchA: pitchASchema.default(440),
  targetPitchA: pitchASchema,
  quality: qualitySchema.default("standard"),
  hybridEnabled: z.boolean().default(false),
  hybridHz: z.number().min(1).max(22000).optional(),
  hybridGainDb: z.number().min(-48).max(0).default(-18),
  formantPreserve: z.boolean().default(false),
  sourceDurationSec: z.number().positive().max(3600).optional(),
});

type JobCreateInput = z.infer<typeof jobCreateFields>;

function assertConvertEnabled() {
  if (!isConvertEnabled()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: CONVERT_ERROR_CODES.FEATURE_DISABLED,
    });
  }
}

function assertSourceKey(userId: number, sourceKey: string) {
  const expectedPrefix = `convert/${userId}/`;
  if (!sourceKey.startsWith(expectedPrefix)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid sourceKey",
    });
  }
}

function assertPremiumOptions(
  input: Pick<
    JobCreateInput,
    "quality" | "hybridEnabled" | "formantPreserve"
  >,
  limits: ConvertTierLimits,
) {
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
}

async function insertConvertJobForUser(
  userId: number,
  input: JobCreateInput,
  limits: ConvertTierLimits,
  premium: boolean,
) {
  assertSourceKey(userId, input.sourceKey);
  assertPremiumOptions(input, limits);

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
  const hybridHz = hybridOn ? clampHz(input.hybridHz ?? 528) : null;

  const job = await createConvertJob({
    publicId,
    userId,
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
}

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
   * Presign a direct-to-S3 PUT for Convert sources.
   * Avoids Manus/Cloudflare request-body 413 limits on /api/convert/upload.
   */
  createUploadUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(256),
        contentType: z.string().min(3).max(128).default("application/octet-stream"),
        byteSize: z.number().int().positive().max(100 * 1024 * 1024),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertConvertEnabled();
      const user = await reconcileExpiredSubscription(ctx.user.id);
      const premium = isUserPremium(user ?? ctx.user);
      const limits = limitsForPremium(premium);

      if (input.byteSize > limits.maxFileBytes) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: CONVERT_ERROR_CODES.TOO_LARGE,
        });
      }

      const ext =
        input.filename.toLowerCase().match(/\.(mp3|wav|flac|m4a|ogg|aac)$/)?.[1] ??
        "bin";
      const safeBase = input.filename
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 64);
      const filename = safeBase.toLowerCase().endsWith(`.${ext}`)
        ? safeBase
        : `${safeBase || "upload"}.${ext}`;
      const uploadId = nanoid(12);
      const relKey = `convert/${ctx.user.id}/${uploadId}/${filename}`;

      try {
        const { key, uploadUrl, publicUrl } = await storagePresignPut(relKey);
        return {
          key,
          uploadUrl,
          publicUrl,
          filename,
          contentType: input.contentType,
          maxBytes: limits.maxFileBytes,
        };
      } catch (err) {
        console.error("[convert.createUploadUrl]", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: CONVERT_ERROR_CODES.UPLOAD_FAILED,
        });
      }
    }),

  /**
   * Create a job after the client has uploaded source audio via
   * createUploadUrl (presigned S3) or POST /api/convert/upload.
   */
  createJob: protectedProcedure
    .input(jobCreateFields)
    .mutation(async ({ ctx, input }) => {
      assertConvertEnabled();
      const user = await reconcileExpiredSubscription(ctx.user.id);
      const premium = isUserPremium(user ?? ctx.user);
      const limits = limitsForPremium(premium);

      const active = await countActiveConvertJobs(ctx.user.id);
      if (active >= limits.maxConcurrent) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: CONVERT_ERROR_CODES.CONCURRENT_LIMIT,
        });
      }

      return insertConvertJobForUser(ctx.user.id, input, limits, premium);
    }),

  /**
   * Batch pack: one upload → multiple target concert pitches (e.g. 432 + 444).
   * Free: max 2 targets; Premium: max 5. Counts against concurrent limit.
   */
  createBatch: protectedProcedure
    .input(
      jobCreateFields
        .omit({ targetPitchA: true })
        .extend({
          targetPitchAs: z
            .array(pitchASchema)
            .min(1)
            .max(5),
        }),
    )
    .mutation(async ({ ctx, input }) => {
      assertConvertEnabled();
      const user = await reconcileExpiredSubscription(ctx.user.id);
      const premium = isUserPremium(user ?? ctx.user);
      const limits = limitsForPremium(premium);

      const maxTargets = premium ? 5 : 2;
      if (input.targetPitchAs.length > maxTargets) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: CONVERT_ERROR_CODES.PREMIUM_REQUIRED,
        });
      }

      // Dedupe targets
      const targets = Array.from(new Set(input.targetPitchAs.map(clampConcertA)));
      const active = await countActiveConvertJobs(ctx.user.id);
      if (active + targets.length > limits.maxConcurrent + (premium ? 3 : 0)) {
        // Allow batch to exceed concurrent slightly for paid packs, but not free spam
        if (!premium || active + targets.length > limits.maxConcurrent + 4) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: CONVERT_ERROR_CODES.CONCURRENT_LIMIT,
          });
        }
      }

      const jobs = [];
      for (const targetPitchA of targets) {
        const job = await insertConvertJobForUser(
          ctx.user.id,
          { ...input, targetPitchA },
          limits,
          premium,
        );
        jobs.push(job);
      }
      return { jobs, count: jobs.length };
    }),

  /**
   * Experimental: download source, decode snippet, estimate concert A.
   */
  detectPitch: protectedProcedure
    .input(z.object({ sourceKey: z.string().min(1).max(512) }))
    .mutation(async ({ ctx, input }) => {
      assertConvertEnabled();
      assertSourceKey(ctx.user.id, input.sourceKey);

      const ffmpeg = await which("ffmpeg");
      if (!ffmpeg) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: CONVERT_ERROR_CODES.TOOLING_MISSING,
        });
      }

      const workDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "rih-pitch-"),
      );
      try {
        let sourceUrl: string;
        try {
          sourceUrl = await storageGetSignedUrl(input.sourceKey);
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: CONVERT_ERROR_CODES.DOWNLOAD_FAILED,
          });
        }
        const srcPath = path.join(workDir, "src");
        const wavPath = path.join(workDir, "snip.wav");
        const dl = await fetch(sourceUrl);
        if (!dl.ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: CONVERT_ERROR_CODES.DOWNLOAD_FAILED,
          });
        }
        await fs.writeFile(srcPath, Buffer.from(await dl.arrayBuffer()));

        // First 8s mono 48k for analysis
        await new Promise<void>((resolve, reject) => {
          const child = spawn(
            ffmpeg,
            [
              "-y",
              "-hide_banner",
              "-loglevel",
              "error",
              "-t",
              "8",
              "-i",
              srcPath,
              "-ac",
              "1",
              "-ar",
              "48000",
              wavPath,
            ],
            { stdio: "ignore" },
          );
          child.on("error", reject);
          child.on("close", code =>
            code === 0
              ? resolve()
              : reject(new Error("ffmpeg snippet failed")),
          );
        });

        return detectConcertAFromWavFile(wavPath);
      } finally {
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
      }
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

  rename: protectedProcedure
    .input(
      z.object({
        id: z.string().min(8).max(32),
        name: z.string().min(1).max(256),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await renameConvertJob(
        input.id,
        ctx.user.id,
        input.name.trim(),
      );
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: CONVERT_ERROR_CODES.NOT_FOUND,
        });
      }
      return { success: true as const };
    }),
});
