/**
 * Convert job worker — multi-slot DB claim (horizontal-scale ready).
 *
 * Scale knobs:
 * - CONVERT_WORKER_CONCURRENCY (default 1, max 4) — parallel jobs per process
 * - Multiple app instances each poll/claim safely via optimistic status update
 * - Stale processing jobs reaped every tick cycle (default 30 min)
 *
 * Redis/BullMQ: optional future path when REDIS_URL is set (see docs).
 * Current design intentionally uses MySQL as the queue for zero new deps.
 */
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  claimNextQueuedConvertJob,
  failConvertJob,
  failStaleConvertJobs,
  getConvertJobById,
  getUserById,
  markConvertJobCompleted,
  reconcileExpiredSubscription,
  updateConvertJobProgress,
} from "../../db";
import { sendConvertJobReadyEmail } from "../../email";
import { storageGetSignedUrl, storagePut } from "../../storage";
import { isUserPremium } from "../entitlements";
import { log } from "../logger";
import { CONVERT_ERROR_CODES, limitsForPremium } from "./limits";
import { runConvertPipeline, which } from "./pipeline";

const POLL_MS = 1500;
const STALE_MINUTES = Number(process.env.CONVERT_STALE_MINUTES ?? 30) || 30;

function workerConcurrency(): number {
  const n = Number(process.env.CONVERT_WORKER_CONCURRENCY ?? 1);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(4, Math.floor(n));
}

let loopStarted = false;
/** In-flight job count for this process */
let activeSlots = 0;

async function downloadToFile(url: string, dest: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`download failed (${resp.status})`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  await fs.writeFile(dest, buf);
}

export async function processConvertJob(jobId: number): Promise<void> {
  const job = await getConvertJobById(jobId);
  if (!job) return;

  const workDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `rih-convert-${job.publicId}-`),
  );
  const sourcePath = path.join(workDir, "source");

  try {
    await updateConvertJobProgress(job.id, {
      stage: "downloading",
      progressPct: 5,
    });

    let sourceUrl: string;
    try {
      sourceUrl = await storageGetSignedUrl(job.sourceKey);
    } catch {
      throw Object.assign(new Error("Could not get signed URL for source"), {
        code: CONVERT_ERROR_CODES.DOWNLOAD_FAILED,
      });
    }

    await downloadToFile(sourceUrl, sourcePath);

    const user = await reconcileExpiredSubscription(job.userId);
    const premium = isUserPremium(user);
    const limits = limitsForPremium(premium);

    const result = await runConvertPipeline({
      sourcePath,
      workDir,
      sourcePitchA: job.sourcePitchA,
      targetPitchA: job.targetPitchA,
      quality: job.quality,
      formantPreserve: job.formantPreserve && limits.allowFormant,
      hybridEnabled: job.hybridEnabled && limits.allowHybrid,
      hybridHz: job.hybridHz,
      hybridGainDb: job.hybridGainDb ?? -18,
      encodeMp3: true,
      onProgress: async (stage, pct) => {
        await updateConvertJobProgress(job.id, { stage, progressPct: pct });
      },
    });

    if (result.probe.durationSec > limits.maxDurationSec + 0.5) {
      throw Object.assign(new Error("Source audio too long for your plan"), {
        code: CONVERT_ERROR_CODES.TOO_LONG,
      });
    }

    await updateConvertJobProgress(job.id, {
      stage: "uploading",
      progressPct: 92,
      sourceDurationSec: result.probe.durationSec,
      sourceFormat: result.probe.format,
    });

    const baseKey = `convert/${job.userId}/${job.publicId}`;
    const wavBuf = await fs.readFile(result.wavPath);
    const wavPut = await storagePut(
      `${baseKey}/out.wav`,
      wavBuf,
      "audio/wav",
    );
    let outputMp3Key: string | null = null;
    if (result.mp3Path) {
      const mp3Buf = await fs.readFile(result.mp3Path);
      const mp3Put = await storagePut(
        `${baseKey}/out.mp3`,
        mp3Buf,
        "audio/mpeg",
      );
      outputMp3Key = mp3Put.key;
    }

    await markConvertJobCompleted(job.id, {
      outputWavKey: wavPut.key,
      outputMp3Key,
      algorithmVersion: result.algorithmVersion,
      processingMs: result.processingMs,
      sourceDurationSec: result.probe.durationSec,
      sourceFormat: result.probe.format,
      pitchRatio: result.pitchRatio,
      cents: result.cents,
    });

    log.info("convert job completed", {
      jobId: job.publicId,
      processingMs: result.processingMs,
      algorithm: result.algorithmVersion,
    });

    try {
      const owner = await getUserById(job.userId);
      if (owner?.email) {
        await sendConvertJobReadyEmail(owner.email, owner.name || "friend", {
          filename: job.sourceFilename,
          sourcePitchA: job.sourcePitchA,
          targetPitchA: job.targetPitchA,
          cents: result.cents,
          hybridHz: result.hybridHz,
          jobId: job.publicId,
        });
      }
    } catch (mailErr) {
      log.warn("convert ready email failed", {
        jobId: job.publicId,
        error: mailErr instanceof Error ? mailErr.message : String(mailErr),
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : /rubberband|ffmpeg|ffprobe not found|ENOENT/i.test(message)
          ? CONVERT_ERROR_CODES.TOOLING_MISSING
          : /timed out/i.test(message)
            ? CONVERT_ERROR_CODES.TIMEOUT
            : CONVERT_ERROR_CODES.PROCESS_FAILED;

    await failConvertJob(job.id, code, message.slice(0, 500));
    log.warn("convert job failed", {
      jobId: job.publicId,
      code,
      error: message.slice(0, 200),
    });
  } finally {
    await fs
      .rm(workDir, { recursive: true, force: true })
      .catch(() => undefined);
  }
}

async function fillSlots(): Promise<void> {
  const max = workerConcurrency();
  while (activeSlots < max) {
    const job = await claimNextQueuedConvertJob();
    if (!job) break;
    activeSlots++;
    void processConvertJob(job.id).finally(() => {
      activeSlots--;
    });
  }
}

async function tick(): Promise<void> {
  try {
    const reaped = await failStaleConvertJobs(STALE_MINUTES);
    if (reaped > 0) {
      log.warn("convert stale jobs reaped", { count: reaped, staleMinutes: STALE_MINUTES });
    }
    await fillSlots();
  } catch (err) {
    log.warn("convert worker tick error", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Start background poll loop (idempotent). */
export function startConvertWorker(): void {
  if (loopStarted) return;
  loopStarted = true;
  const concurrency = workerConcurrency();

  void (async () => {
    const [rb, ff, fp] = await Promise.all([
      which("rubberband"),
      which("ffmpeg"),
      which("ffprobe"),
    ]);
    log.info("convert worker tooling", {
      rubberband: rb ?? "missing",
      ffmpeg: ff ?? "missing",
      ffprobe: fp ?? "missing",
      concurrency,
      staleMinutes: STALE_MINUTES,
    });
  })();

  setInterval(() => {
    void tick();
  }, POLL_MS);

  void tick();
  log.info("convert worker started", { pollMs: POLL_MS, concurrency });
}
