/**
 * Offline pitch-ratio pipeline: ffprobe → rubberband (or ffmpeg fallback)
 * → optional TrueHz hybrid bed → peak limiter → encode.
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { describeRetune } from "../../../packages/shared-utils/src/pitchMath.ts";
import { CONVERT_ALGORITHM_VERSION } from "./limits";
import { applyHybridToWavFile, applyPeakLimiter } from "./hybridBridge";
import { readWavFile, writeWavFile } from "./wavCodec";

export type ProbeResult = {
  durationSec: number;
  format: string;
  sampleRate: number;
  channels: number;
};

export type PipelineInput = {
  sourcePath: string;
  workDir: string;
  sourcePitchA: number;
  targetPitchA: number;
  quality: "standard" | "high";
  /** Rubber Band formant preservation (vocals). */
  formantPreserve?: boolean;
  hybridEnabled?: boolean;
  hybridHz?: number | null;
  hybridGainDb?: number | null;
  /** When true, also produce MP3 next to WAV. */
  encodeMp3: boolean;
  onProgress?: (stage: string, pct: number) => void | Promise<void>;
};

export type PipelineResult = {
  wavPath: string;
  mp3Path: string | null;
  probe: ProbeResult;
  pitchRatio: number;
  cents: number;
  algorithmVersion: string;
  processingMs: number;
  hybridApplied: boolean;
  hybridHz: number | null;
  formantPreserve: boolean;
};

function run(
  cmd: string,
  args: string[],
  opts?: { timeoutMs?: number },
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer =
      opts?.timeoutMs && opts.timeoutMs > 0
        ? setTimeout(() => {
            child.kill("SIGKILL");
            reject(new Error(`${cmd} timed out after ${opts.timeoutMs}ms`));
          }, opts.timeoutMs)
        : null;
    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.on("error", err => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
    child.on("close", code => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

export async function which(bin: string): Promise<string | null> {
  try {
    const r = await run("which", [bin]);
    if (r.code === 0) {
      const p = r.stdout.trim().split("\n")[0];
      return p || null;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function ffprobe(filePath: string): Promise<ProbeResult> {
  const bin = (await which("ffprobe")) ?? "ffprobe";
  const r = await run(bin, [
    "-v",
    "error",
    "-show_entries",
    "format=duration,format_name:stream=sample_rate,channels,codec_type",
    "-of",
    "json",
    filePath,
  ]);
  if (r.code !== 0) {
    throw new Error(`ffprobe failed: ${r.stderr.slice(0, 400)}`);
  }
  const json = JSON.parse(r.stdout) as {
    format?: { duration?: string; format_name?: string };
    streams?: Array<{
      codec_type?: string;
      sample_rate?: string;
      channels?: number;
    }>;
  };
  const durationSec = parseFloat(json.format?.duration ?? "0");
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error("Could not determine audio duration");
  }
  const audio =
    json.streams?.find(s => s.codec_type === "audio") ?? json.streams?.[0];
  return {
    durationSec,
    format: (json.format?.format_name ?? "unknown").split(",")[0] ?? "unknown",
    sampleRate: parseInt(audio?.sample_rate ?? "48000", 10) || 48000,
    channels: audio?.channels ?? 2,
  };
}

async function decodeToWav(src: string, destWav: string): Promise<void> {
  const bin = (await which("ffmpeg")) ?? "ffmpeg";
  const r = await run(
    bin,
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      src,
      "-ac",
      "2",
      "-ar",
      "48000",
      destWav,
    ],
    { timeoutMs: 10 * 60 * 1000 },
  );
  if (r.code !== 0) {
    throw new Error(`ffmpeg decode failed: ${r.stderr.slice(0, 400)}`);
  }
}

async function pitchWithRubberband(
  inWav: string,
  outWav: string,
  ratio: number,
  quality: "standard" | "high",
  formantPreserve: boolean,
): Promise<string> {
  const bin = await which("rubberband");
  if (!bin) {
    throw new Error("rubberband not found");
  }
  const args: string[] = ["-f", ratio.toFixed(10)];
  if (formantPreserve) {
    args.push("-F");
  }
  if (quality === "high") {
    args.push("-3", "-c", "3");
  } else {
    args.push("-c", "2");
  }
  args.push(inWav, outWav);

  const r = await run(bin, args, { timeoutMs: 30 * 60 * 1000 });
  if (r.code !== 0) {
    // Retry without -3 if R3 engine missing
    if (quality === "high") {
      const fallback = ["-f", ratio.toFixed(10)];
      if (formantPreserve) fallback.push("-F");
      fallback.push("-c", "3", inWav, outWav);
      const r2 = await run(bin, fallback, { timeoutMs: 30 * 60 * 1000 });
      if (r2.code !== 0) {
        throw new Error(`rubberband failed: ${r2.stderr.slice(-400)}`);
      }
      return formantPreserve ? "rb-4.0-high-formant" : "rb-4.0-high";
    }
    throw new Error(`rubberband failed: ${r.stderr.slice(-400)}`);
  }
  const base =
    quality === "high" ? "rb-4.0-high" : CONVERT_ALGORITHM_VERSION;
  return formantPreserve ? `${base}-formant` : base;
}

async function pitchWithFfmpeg(
  inWav: string,
  outWav: string,
  ratio: number,
): Promise<string> {
  const bin = (await which("ffmpeg")) ?? "ffmpeg";
  const fsRate = 48000;
  const asetrate = fsRate * ratio;
  const atempo = 1 / ratio;
  const filter = `asetrate=${asetrate},aresample=${fsRate},atempo=${atempo.toFixed(10)}`;
  const r = await run(
    bin,
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inWav,
      "-af",
      filter,
      outWav,
    ],
    { timeoutMs: 30 * 60 * 1000 },
  );
  if (r.code !== 0) {
    throw new Error(`ffmpeg pitch failed: ${r.stderr.slice(0, 400)}`);
  }
  return "ffmpeg-asetrate-v1";
}

async function encodeMp3(inWav: string, outMp3: string): Promise<void> {
  const bin = (await which("ffmpeg")) ?? "ffmpeg";
  const r = await run(
    bin,
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inWav,
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "256k",
      outMp3,
    ],
    { timeoutMs: 10 * 60 * 1000 },
  );
  if (r.code !== 0) {
    throw new Error(`ffmpeg mp3 encode failed: ${r.stderr.slice(0, 400)}`);
  }
}

/** Peak-limit a WAV in place (when hybrid is off, still protect masters). */
async function peakLimitWavFile(wavPath: string): Promise<void> {
  const wav = await readWavFile(wavPath);
  applyPeakLimiter(wav.samples);
  await writeWavFile(wavPath, wav, 16);
}

/**
 * Full convert pipeline for a local source file.
 * Writes retuned (+ optional hybrid) WAV and optional MP3 under workDir.
 */
export async function runConvertPipeline(
  input: PipelineInput,
): Promise<PipelineResult> {
  const t0 = Date.now();
  const { ratio, cents } = describeRetune(
    input.sourcePitchA,
    input.targetPitchA,
  );
  const formantPreserve = Boolean(input.formantPreserve);
  const progress = async (stage: string, pct: number) => {
    await input.onProgress?.(stage, pct);
  };

  await progress("analyzing", 10);
  const probe = await ffprobe(input.sourcePath);

  await fs.mkdir(input.workDir, { recursive: true });
  const decoded = path.join(input.workDir, "decoded.wav");
  const retuned = path.join(input.workDir, "retuned.wav");
  const mastered = path.join(input.workDir, "mastered.wav");
  const outMp3 = path.join(input.workDir, "out.mp3");

  await progress("analyzing", 20);
  await decodeToWav(input.sourcePath, decoded);

  await progress("retuning", 40);
  let algorithmVersion: string;
  try {
    algorithmVersion = await pitchWithRubberband(
      decoded,
      retuned,
      ratio,
      input.quality,
      formantPreserve,
    );
  } catch {
    algorithmVersion = await pitchWithFfmpeg(decoded, retuned, ratio);
  }

  let finalWav = retuned;
  let hybridApplied = false;
  let hybridHz: number | null = null;

  const wantHybrid =
    Boolean(input.hybridEnabled) &&
    input.hybridHz != null &&
    Number.isFinite(input.hybridHz);

  if (wantHybrid) {
    await progress("hybrid", 65);
    hybridHz = input.hybridHz as number;
    await applyHybridToWavFile(retuned, mastered, {
      hybridHz,
      hybridGainDb: input.hybridGainDb ?? -18,
    });
    finalWav = mastered;
    hybridApplied = true;
    algorithmVersion = `${algorithmVersion}+truehz-bed`;
  } else {
    await progress("limiting", 70);
    await peakLimitWavFile(retuned);
    finalWav = retuned;
  }

  let mp3Path: string | null = null;
  if (input.encodeMp3) {
    await progress("encoding", 80);
    await encodeMp3(finalWav, outMp3);
    mp3Path = outMp3;
  }

  await progress("encoding", 90);
  await fs.unlink(decoded).catch(() => undefined);
  if (hybridApplied) {
    await fs.unlink(retuned).catch(() => undefined);
  }

  return {
    wavPath: finalWav,
    mp3Path,
    probe,
    pitchRatio: ratio,
    cents,
    algorithmVersion,
    processingMs: Date.now() - t0,
    hybridApplied,
    hybridHz,
    formantPreserve,
  };
}
