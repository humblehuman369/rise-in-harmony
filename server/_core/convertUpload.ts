/**
 * Convert upload routes — chunked protocol to bypass Manus/Cloudflare proxy
 * body-size limits that silently drop connections for large audio files.
 *
 * Protocol:
 *   POST /api/convert/upload/init      → { uploadId, chunkSize, maxChunks }
 *   POST /api/convert/upload/chunk     → { received } (body: raw chunk ≤ CHUNK_LIMIT)
 *   POST /api/convert/upload/finalize  → { key, url, filename, bytes, format }
 *
 * Legacy single-shot route kept for small files (≤ CHUNK_LIMIT):
 *   POST /api/convert/upload           → { key, url, filename, bytes, format }
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

/** Each individual chunk must be ≤ this to stay under the ~3 MB proxy limit. */
const CHUNK_LIMIT = 2 * 1024 * 1024; // 2 MB — proxy silently drops bodies ≥ 3.5 MB

/** How long (ms) an incomplete upload session lives before being GC'd. */
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min

interface UploadSession {
  userId: number;
  isPremium: boolean;
  maxFileBytes: number;
  totalChunks: number;
  filename: string;
  contentType: string;
  chunks: Map<number, Buffer>;
  createdAt: number;
}

/** In-memory session store — fine for single-instance autoscale (serverless). */
const sessions = new Map<string, UploadSession>();

/** Periodically evict stale sessions to prevent memory leaks. */
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
}, 5 * 60 * 1000);

// ── Audio format detection ────────────────────────────────────────────────────

function isAudioBuffer(buf: Buffer): { ok: boolean; ext: string } {
  if (buf.length < 12) return { ok: false, ext: "" };
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return { ok: true, ext: "mp3" };
  if (buf[0] === 0xff && (buf[1]! & 0xe0) === 0xe0) return { ok: true, ext: "mp3" };
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x41 && buf[10] === 0x56 && buf[11] === 0x45)
    return { ok: true, ext: "wav" };
  if (buf[0] === 0x66 && buf[1] === 0x4c && buf[2] === 0x61 && buf[3] === 0x43)
    return { ok: true, ext: "flac" };
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70)
    return { ok: true, ext: "m4a" };
  if (buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53)
    return { ok: true, ext: "ogg" };
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
    case "mp3":  return "audio/mpeg";
    case "wav":  return "audio/wav";
    case "flac": return "audio/flac";
    case "m4a":  return "audio/mp4";
    case "ogg":  return "audio/ogg";
    default:     return "application/octet-stream";
  }
}

function contentTypeForFile(filename: string, mimeHint: string): string {
  if (mimeHint && mimeHint !== "application/octet-stream") return mimeHint;
  const n = filename.toLowerCase();
  if (n.endsWith(".mp3")) return "audio/mpeg";
  if (n.endsWith(".wav")) return "audio/wav";
  if (n.endsWith(".flac")) return "audio/flac";
  if (n.endsWith(".m4a") || n.endsWith(".aac")) return "audio/mp4";
  if (n.endsWith(".ogg")) return "audio/ogg";
  return "application/octet-stream";
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function authenticateUpload(req: Request) {
  try {
    return await sdk.authenticateRequest(req);
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 403) return null;
    throw error;
  }
}

// ── Route registration ────────────────────────────────────────────────────────

export function registerConvertUpload(app: Express) {
  const rawChunkParser = express.raw({
    type: [
      "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave",
      "audio/flac", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/ogg",
      "application/octet-stream",
    ],
    limit: CHUNK_LIMIT,
  });

  // ── 1. Init: create a session, return uploadId ──────────────────────────────
  app.post("/api/convert/upload/init", express.json({ limit: "8kb" }), async (req: Request, res: Response) => {
    if (!isConvertEnabled()) {
      res.status(403).json({ error: CONVERT_ERROR_CODES.FEATURE_DISABLED });
      return;
    }
    const user = await authenticateUpload(req);
    if (!user || user.id <= 0) { res.status(401).json({ error: "Unauthorized" }); return; }

    const entitlementUser = await reconcileExpiredSubscription(user.id);
    const premium = isUserPremium(entitlementUser ?? user);
    const limits = limitsForPremium(premium);

    const { filename = "upload", contentType = "application/octet-stream", totalBytes, totalChunks } = req.body ?? {};

    if (typeof totalBytes !== "number" || totalBytes <= 0) {
      res.status(400).json({ error: "totalBytes required" }); return;
    }
    if (totalBytes > limits.maxFileBytes) {
      res.status(413).json({ error: CONVERT_ERROR_CODES.TOO_LARGE, maxBytes: limits.maxFileBytes }); return;
    }
    if (typeof totalChunks !== "number" || totalChunks < 1 || totalChunks > 200) {
      res.status(400).json({ error: "totalChunks must be 1–200" }); return;
    }

    const uploadId = nanoid(20);
    sessions.set(uploadId, {
      userId: user.id,
      isPremium: premium,
      maxFileBytes: limits.maxFileBytes,
      totalChunks,
      filename: String(filename).slice(0, 256),
      contentType: contentTypeForFile(String(filename), String(contentType)),
      chunks: new Map(),
      createdAt: Date.now(),
    });

    res.json({ uploadId, chunkSize: CHUNK_LIMIT, maxChunks: 200 });
  });

  // ── 2. Chunk: receive one chunk ─────────────────────────────────────────────
  app.post("/api/convert/upload/chunk", rawChunkParser, async (req: Request, res: Response) => {
    if (!isConvertEnabled()) {
      res.status(403).json({ error: CONVERT_ERROR_CODES.FEATURE_DISABLED }); return;
    }
    const user = await authenticateUpload(req);
    if (!user || user.id <= 0) { res.status(401).json({ error: "Unauthorized" }); return; }

    const uploadId = (req.query["uploadId"] as string) || (req.headers["x-upload-id"] as string);
    const chunkIndexStr = (req.query["chunkIndex"] as string) || (req.headers["x-chunk-index"] as string);
    const chunkIndex = parseInt(chunkIndexStr ?? "", 10);

    if (!uploadId || isNaN(chunkIndex) || chunkIndex < 0) {
      res.status(400).json({ error: "uploadId and chunkIndex required (query string)" }); return;
    }

    const session = sessions.get(uploadId);
    if (!session) { res.status(404).json({ error: "Upload session not found or expired" }); return; }
    if (session.userId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ error: "Empty chunk body" }); return;
    }
    if (body.length > CHUNK_LIMIT) {
      res.status(413).json({ error: "Chunk too large" }); return;
    }

    session.chunks.set(chunkIndex, body);
    res.json({ received: chunkIndex, total: session.chunks.size });
  });

  // ── 3. Finalize: assemble + upload to S3 ───────────────────────────────────
  app.post("/api/convert/upload/finalize", express.json({ limit: "8kb" }), async (req: Request, res: Response) => {
    if (!isConvertEnabled()) {
      res.status(403).json({ error: CONVERT_ERROR_CODES.FEATURE_DISABLED }); return;
    }
    const user = await authenticateUpload(req);
    if (!user || user.id <= 0) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { uploadId } = req.body ?? {};
    if (!uploadId) { res.status(400).json({ error: "uploadId required" }); return; }

    const session = sessions.get(uploadId);
    if (!session) { res.status(404).json({ error: "Upload session not found or expired" }); return; }
    if (session.userId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

    // Verify all chunks arrived
    if (session.chunks.size !== session.totalChunks) {
      res.status(400).json({
        error: `Incomplete upload: received ${session.chunks.size}/${session.totalChunks} chunks`,
      });
      return;
    }

    // Assemble in order
    const ordered: Buffer[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      const chunk = session.chunks.get(i);
      if (!chunk) {
        res.status(400).json({ error: `Missing chunk ${i}` }); return;
      }
      ordered.push(chunk);
    }
    const assembled = Buffer.concat(ordered);
    sessions.delete(uploadId);

    // Validate total size
    if (assembled.length > session.maxFileBytes) {
      res.status(413).json({ error: CONVERT_ERROR_CODES.TOO_LARGE, maxBytes: session.maxFileBytes });
      return;
    }

    // Detect audio format from magic bytes
    const detected = isAudioBuffer(assembled);
    if (!detected.ok) {
      res.status(400).json({ error: CONVERT_ERROR_CODES.BAD_FORMAT }); return;
    }

    const filename = sanitizeFilename(session.filename, detected.ext);
    const uploadId2 = nanoid(12);
    const storageKey = `convert/${user.id}/${uploadId2}/${filename}`;

    try {
      const result = await storagePut(storageKey, assembled, contentTypeForExt(detected.ext));
      res.json({ key: result.key, url: result.url, filename, bytes: assembled.length, format: detected.ext });
    } catch (error) {
      console.error("[convert/upload/finalize]", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // ── Legacy single-shot route (small files ≤ CHUNK_LIMIT) ───────────────────
  app.post(
    "/api/convert/upload",
    express.raw({
      type: [
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave",
        "audio/flac", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/ogg",
        "application/octet-stream",
      ],
      limit: CHUNK_LIMIT,
    }),
    async (req: Request, res: Response) => {
      if (!isConvertEnabled()) {
        res.status(403).json({ error: CONVERT_ERROR_CODES.FEATURE_DISABLED }); return;
      }
      const user = await authenticateUpload(req);
      if (!user || user.id <= 0) { res.status(401).json({ error: "Unauthorized" }); return; }

      const entitlementUser = await reconcileExpiredSubscription(user.id);
      const premium = isUserPremium(entitlementUser ?? user);
      const limits = limitsForPremium(premium);

      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        res.status(400).json({ error: "Empty upload body" }); return;
      }
      if (body.length > limits.maxFileBytes) {
        res.status(413).json({ error: CONVERT_ERROR_CODES.TOO_LARGE, maxBytes: limits.maxFileBytes }); return;
      }

      const detected = isAudioBuffer(body);
      if (!detected.ok) { res.status(400).json({ error: CONVERT_ERROR_CODES.BAD_FORMAT }); return; }

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
        const result = await storagePut(storageKey, body, contentTypeForExt(detected.ext));
        res.json({ key: result.key, url: result.url, filename, bytes: body.length, format: detected.ext });
      } catch (error) {
        console.error("[convert/upload]", error);
        res.status(500).json({ error: "Upload failed" });
      }
    },
  );
}
