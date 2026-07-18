/**
 * POST /api/convert/upload — multi-format source audio for TrueHz Convert.
 */
import type { Express, Request, Response } from "express";
import express from "express";
import { HttpError } from "@shared/_core/errors";
import { sdk } from "./sdk";
import { storagePut } from "../storage";
import { reconcileExpiredSubscription } from "../db";
import { isUserPremium } from "../lib/entitlements";
import {
  CONVERT_ERROR_CODES,
  isConvertEnabled,
  limitsForPremium,
} from "../lib/convert/limits";
import { nanoid } from "nanoid";

function isAudioBuffer(buf: Buffer): { ok: boolean; ext: string } {
  if (buf.length < 12) return { ok: false, ext: "" };
  // ID3 / MP3
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    return { ok: true, ext: "mp3" };
  }
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
    return { ok: true, ext: "mp3" };
  }
  // RIFF WAVE
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x41 &&
    buf[10] === 0x56 &&
    buf[11] === 0x45
  ) {
    return { ok: true, ext: "wav" };
  }
  // fLaC
  if (
    buf[0] === 0x66 &&
    buf[1] === 0x4c &&
    buf[2] === 0x61 &&
    buf[3] === 0x43
  ) {
    return { ok: true, ext: "flac" };
  }
  // M4A / MP4 ftyp
  if (
    buf[4] === 0x66 &&
    buf[5] === 0x74 &&
    buf[6] === 0x79 &&
    buf[7] === 0x70
  ) {
    return { ok: true, ext: "m4a" };
  }
  // Ogg
  if (
    buf[0] === 0x4f &&
    buf[1] === 0x67 &&
    buf[2] === 0x67 &&
    buf[3] === 0x53
  ) {
    return { ok: true, ext: "ogg" };
  }
  return { ok: false, ext: "" };
}

function sanitizeFilename(raw: string, ext: string): string {
  const base = raw.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
  const lower = base.toLowerCase();
  if (lower.endsWith(`.${ext}`)) return base;
  return `${base || "upload"}.${ext}`;
}

function contentTypeForExt(ext: string): string {
  switch (ext) {
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "flac":
      return "audio/flac";
    case "m4a":
      return "audio/mp4";
    case "ogg":
      return "audio/ogg";
    default:
      return "application/octet-stream";
  }
}

async function authenticateUpload(req: Request) {
  try {
    return await sdk.authenticateRequest(req);
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 403) {
      return null;
    }
    throw error;
  }
}

export function registerConvertUpload(app: Express) {
  // Generous limit; tier-specific max enforced after auth
  const rawLimit = 100 * 1024 * 1024;

  app.post(
    "/api/convert/upload",
    express.raw({
      type: [
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "audio/flac",
        "audio/mp4",
        "audio/x-m4a",
        "audio/m4a",
        "audio/ogg",
        "application/octet-stream",
      ],
      limit: rawLimit,
    }),
    async (req: Request, res: Response) => {
      if (!isConvertEnabled()) {
        res.status(403).json({ error: CONVERT_ERROR_CODES.FEATURE_DISABLED });
        return;
      }

      const user = await authenticateUpload(req);
      if (!user || user.id <= 0) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const entitlementUser = await reconcileExpiredSubscription(user.id);
      const premium = isUserPremium(entitlementUser ?? user);
      const limits = limitsForPremium(premium);

      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        res.status(400).json({ error: "Empty upload body" });
        return;
      }

      if (body.length > limits.maxFileBytes) {
        res.status(413).json({
          error: CONVERT_ERROR_CODES.TOO_LARGE,
          maxBytes: limits.maxFileBytes,
        });
        return;
      }

      const detected = isAudioBuffer(body);
      if (!detected.ok) {
        res.status(400).json({ error: CONVERT_ERROR_CODES.BAD_FORMAT });
        return;
      }

      const filenameHeader = req.headers["x-filename"];
      const filenameQuery = req.query.filename;
      const rawName =
        (typeof filenameHeader === "string" && filenameHeader) ||
        (typeof filenameQuery === "string" && filenameQuery) ||
        `upload.${detected.ext}`;
      const filename = sanitizeFilename(rawName, detected.ext);
      const uploadId = nanoid(12);
      const storageKey = `convert/${user.id}/${uploadId}/${filename}`;

      try {
        const result = await storagePut(
          storageKey,
          body,
          contentTypeForExt(detected.ext),
        );
        res.json({
          key: result.key,
          url: result.url,
          filename,
          bytes: body.length,
          format: detected.ext,
        });
      } catch (error) {
        console.error("[convert/upload]", error);
        res.status(500).json({ error: "Upload failed" });
      }
    },
  );
}
