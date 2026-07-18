import type { Express, Request, Response } from "express";
import express from "express";
import { HttpError } from "@shared/_core/errors";
import { sdk } from "./sdk";
import { storagePut } from "../storage";
import { reconcileExpiredSubscription } from "../db";
import { isUserPremium } from "../lib/entitlements";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function isMp3Buffer(buf: Buffer): boolean {
  if (buf.length < 3) return false;
  // ID3 tag
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true;
  // MPEG frame sync (0xFFEx)
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true;
  return false;
}

function sanitizeFilename(raw: string): string {
  const base = raw.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
  const withExt = base.toLowerCase().endsWith(".mp3") ? base : `${base}.mp3`;
  return withExt || "upload.mp3";
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

export function registerSoundsUpload(app: Express) {
  app.post(
    "/api/sounds/upload",
    express.raw({
      type: ["audio/mpeg", "audio/mp3", "application/octet-stream"],
      limit: MAX_UPLOAD_BYTES,
    }),
    async (req: Request, res: Response) => {
      const user = await authenticateUpload(req);
      if (!user || user.id <= 0) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Custom background uploads are premium-gated server-side.
      const entitlementUser = await reconcileExpiredSubscription(user.id);
      if (!isUserPremium(entitlementUser ?? user)) {
        res.status(403).json({ error: "PREMIUM_REQUIRED" });
        return;
      }

      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        res.status(400).json({ error: "Empty upload body" });
        return;
      }

      if (body.length > MAX_UPLOAD_BYTES) {
        res.status(413).json({ error: "File too large (max 15 MB)" });
        return;
      }

      if (!isMp3Buffer(body)) {
        res.status(400).json({ error: "Only MP3 files are supported" });
        return;
      }

      const filenameHeader = req.headers["x-filename"];
      const filenameQuery = req.query.filename;
      const rawName =
        (typeof filenameHeader === "string" && filenameHeader) ||
        (typeof filenameQuery === "string" && filenameQuery) ||
        "upload.mp3";
      const filename = sanitizeFilename(rawName);
      const storageKey = `user-sounds/${user.id}/${filename}`;

      try {
        const result = await storagePut(storageKey, body, "audio/mpeg");
        res.json({ key: result.key, url: result.url });
      } catch (error) {
        console.error("[sounds/upload]", error);
        res.status(500).json({ error: "Upload failed" });
      }
    },
  );
}
