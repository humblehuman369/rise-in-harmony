/**
 * In-process convert job worker — claims queued jobs and runs the DSP pipeline.
 * Single-instance safe; multi-instance would need Redis/FOR UPDATE SKIP LOCKED.
 */
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  claimNextQueuedConvertJob,
  failConvertJob,
  getConvertJobById,
  markConvertJobCompleted,
  reconcileExpiredSubscription,
  updateConvertJobProgress,
} from "../../db";
import { storageGetSignedUrl, storagePut } from "../../storage";
import { isUserPremium } from "../entitlements";
import { log } from "../logger";
import { CONVERT_ERROR_CODES, limitsForPremium } from "./limits";
import { runConvertPipeline, which } from "./pipeline";

const POLL_MS = 2000;
let loopStarted = false;
let running = false;

async function downloadToFile(url: string, dest: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`download failed (${resp.status})`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  await fs.writeFile(dest, buf);
}

async function processJob(jobId: number): Promise<void> {
  const job = await getConvertJobById(jobId);
  if (!job) return;

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `rih-convert-${job.publicId}-`));
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
      // Local/dev fallback: manus-storage paths may be absolute URL via ENV — try public path
      throw Object.assign(new Error("Could not get signed URL for source"), {
        code: CONVERT_ERROR_CODES.DOWNLOAD_FAILED,
      });
    }

    await downloadToFile(sourceUrl, sourcePath);

    const user = await reconcileExpiredSubscription(job.userId);
    const premium = isUserPremium(user);
    const limits = limitsForPremium(premium);

    const encodeMp3 = true;
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
      encodeMp3,
      onProgress: async (stage, pct) => {
        await updateConvertJobProgress(job.id, { stage, progressPct: pct });
      },
    });

    // Enforce duration limit post-probe (upload may not have known duration)
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
    let outputWavKey: string | null = null;
    let outputMp3Key: string | null = null;

    // Always keep WAV server-side for quality; free tier may only expose MP3 in API
    const wavBuf = await fs.readFile(result.wavPath);
    const wavPut = await storagePut(
      `${baseKey}/out.wav`,
      wavBuf,
      "audio/wav",
    );
    outputWavKey = wavPut.key;

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
      outputWavKey,
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
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const job = await claimNextQueuedConvertJob();
    if (job) {
      await processJob(job.id);
    }
  } catch (err) {
    log.warn("convert worker tick error", {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    running = false;
  }
}

/** Start background poll loop (idempotent). */
export function startConvertWorker(): void {
  if (loopStarted) return;
  loopStarted = true;

  // Warm check tooling once
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
    });
  })();

  setInterval(() => {
    void tick();
  }, POLL_MS);

  // Immediate first tick
  void tick();
  log.info("convert worker started", { pollMs: POLL_MS });
}
