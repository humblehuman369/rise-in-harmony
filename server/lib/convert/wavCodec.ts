/**
 * Minimal PCM16 WAV read/write for convert hybrid mixing.
 */
import { promises as fs } from "node:fs";

export type WavData = {
  sampleRate: number;
  channels: number;
  /** Interleaved float samples −1…1 */
  samples: Float32Array;
  frameCount: number;
};

function readU32(buf: Buffer, o: number): number {
  return buf.readUInt32LE(o);
}
function readU16(buf: Buffer, o: number): number {
  return buf.readUInt16LE(o);
}

export async function readWavFile(path: string): Promise<WavData> {
  const buf = await fs.readFile(path);
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error("Not a RIFF WAV file");
  }
  let offset = 12;
  let fmtFound = false;
  let sampleRate = 48000;
  let channels = 2;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = readU32(buf, offset + 4);
    const chunkStart = offset + 8;
    if (id === "fmt ") {
      const audioFormat = readU16(buf, chunkStart);
      channels = readU16(buf, chunkStart + 2);
      sampleRate = readU32(buf, chunkStart + 4);
      bitsPerSample = readU16(buf, chunkStart + 14);
      if (audioFormat !== 1 && audioFormat !== 3) {
        throw new Error(`Unsupported WAV format ${audioFormat} (need PCM)`);
      }
      fmtFound = true;
    } else if (id === "data") {
      dataOffset = chunkStart;
      dataSize = size;
      break;
    }
    offset = chunkStart + size + (size % 2);
  }

  if (!fmtFound || dataOffset < 0) {
    throw new Error("Invalid WAV: missing fmt/data");
  }
  if (bitsPerSample !== 16 && bitsPerSample !== 32) {
    throw new Error(`Unsupported bitsPerSample ${bitsPerSample}`);
  }

  const frameCount = Math.floor(
    dataSize / (channels * (bitsPerSample / 8)),
  );
  const samples = new Float32Array(frameCount * channels);

  if (bitsPerSample === 16) {
    for (let i = 0; i < frameCount * channels; i++) {
      const s = buf.readInt16LE(dataOffset + i * 2);
      samples[i] = s / 32768;
    }
  } else {
    // IEEE float32
    for (let i = 0; i < frameCount * channels; i++) {
      samples[i] = buf.readFloatLE(dataOffset + i * 4);
    }
  }

  return { sampleRate, channels, samples, frameCount };
}

export async function writeWavFile(
  path: string,
  data: WavData,
  bitsPerSample: 16 | 32 = 16,
): Promise<void> {
  const { sampleRate, channels, samples, frameCount } = data;
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = frameCount * blockAlign;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(bitsPerSample === 32 ? 3 : 1, 20); // IEEE float or PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);

  if (bitsPerSample === 16) {
    for (let i = 0; i < frameCount * channels; i++) {
      const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
      buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
    }
  } else {
    for (let i = 0; i < frameCount * channels; i++) {
      buf.writeFloatLE(samples[i] ?? 0, 44 + i * 4);
    }
  }

  await fs.writeFile(path, buf);
}
