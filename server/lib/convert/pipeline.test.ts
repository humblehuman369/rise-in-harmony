import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { runConvertPipeline, which } from "./pipeline";

function hasBin(name: string): boolean {
  const r = spawnSync("which", [name], { encoding: "utf8" });
  return r.status === 0 && Boolean(r.stdout.trim());
}

describe("convert pipeline", () => {
  it("detects tooling", async () => {
    const ff = await which("ffmpeg");
    // CI may lack tools; local dev has them after brew install
    if (hasBin("ffmpeg")) {
      expect(ff).toBeTruthy();
    }
  });

  it.skipIf(!hasBin("ffmpeg") || !hasBin("ffprobe"))(
    "retunes pure 440 Hz WAV toward 432 ratio",
    async () => {
      const work = await fs.mkdtemp(path.join(os.tmpdir(), "rih-pipe-"));
      const src = path.join(work, "src.wav");
      // 2s sine 440 Hz mono 48k
      const gen = spawnSync(
        "ffmpeg",
        [
          "-y",
          "-f",
          "lavfi",
          "-i",
          "sine=frequency=440:duration=2:sample_rate=48000",
          "-ac",
          "1",
          src,
        ],
        { encoding: "utf8" },
      );
      expect(gen.status).toBe(0);

      const result = await runConvertPipeline({
        sourcePath: src,
        workDir: path.join(work, "out"),
        sourcePitchA: 440,
        targetPitchA: 432,
        quality: "standard",
        encodeMp3: true,
      });

      expect(result.pitchRatio).toBeCloseTo(432 / 440, 8);
      expect(result.cents).toBeCloseTo(-31.77, 1);
      expect(result.probe.durationSec).toBeGreaterThan(1.5);
      expect(result.processingMs).toBeGreaterThan(0);
      expect(result.hybridApplied).toBe(false);
      await fs.access(result.wavPath);
      if (result.mp3Path) await fs.access(result.mp3Path);

      await fs.rm(work, { recursive: true, force: true });
    },
    60_000,
  );

  it.skipIf(!hasBin("ffmpeg") || !hasBin("ffprobe"))(
    "hybrid TrueHz bed path completes",
    async () => {
      const work = await fs.mkdtemp(path.join(os.tmpdir(), "rih-pipe-hy-"));
      const src = path.join(work, "src.wav");
      const gen = spawnSync(
        "ffmpeg",
        [
          "-y",
          "-f",
          "lavfi",
          "-i",
          "sine=frequency=440:duration=2:sample_rate=48000",
          "-ac",
          "2",
          src,
        ],
        { encoding: "utf8" },
      );
      expect(gen.status).toBe(0);

      const result = await runConvertPipeline({
        sourcePath: src,
        workDir: path.join(work, "out"),
        sourcePitchA: 440,
        targetPitchA: 432,
        quality: "standard",
        hybridEnabled: true,
        hybridHz: 528,
        hybridGainDb: -18,
        encodeMp3: false,
      });

      expect(result.hybridApplied).toBe(true);
      expect(result.hybridHz).toBe(528);
      expect(result.algorithmVersion).toMatch(/truehz-bed/);
      await fs.access(result.wavPath);
      await fs.rm(work, { recursive: true, force: true });
    },
    60_000,
  );
});
