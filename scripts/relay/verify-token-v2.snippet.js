/**
 * Drop-in helpers for the EC2 upload relay (Node on the VM).
 *
 * Deploy notes:
 *  1. Copy these functions into the relay's auth module (or require this file).
 *  2. On POST /upload, prefer `x-auth-bound` when present; fall back to
 *     `x-auth-token` (v1) for older clients during rollout.
 *  3. When verifying v2, recompute keyPrefix as the directory of `x-file-key`
 *     (everything through the final `/`).
 *  4. Reject uploads when Content-Length / body size exceeds maxBytes from the token.
 *  5. Require x-file-key to start with `convert/{userId}/`.
 *
 * This file is not executed by the app server — it is ops documentation + a
 * paste-ready snippet for the VM.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const WINDOW_SEC = 300;

function safeEqualHex(a, b) {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length || ba.length === 0) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** v1: `{ts}.{hmac(ts)}` — currently deployed relay. */
export function verifyTokenV1(token, secret) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [ts, sig] = parts;
  const now = Math.floor(Date.now() / 1000);
  const tsNum = parseInt(ts, 10);
  if (isNaN(tsNum) || Math.abs(now - tsNum) > WINDOW_SEC) return false;
  const expected = createHmac("sha256", secret).update(`${ts}`).digest("hex");
  return safeEqualHex(sig, expected);
}

/**
 * v2: `{ts}.{userId}.{maxBytes}.{hmac(ts:userId:keyPrefix:maxBytes)}`
 * keyPrefix must match the directory of x-file-key.
 */
export function verifyTokenV2(token, secret, keyPrefix) {
  if (!token || !keyPrefix) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [ts, userIdStr, maxBytesStr, sig] = parts;
  const now = Math.floor(Date.now() / 1000);
  const tsNum = parseInt(ts, 10);
  const userId = parseInt(userIdStr, 10);
  const maxBytes = parseInt(maxBytesStr, 10);
  if (
    isNaN(tsNum) ||
    isNaN(userId) ||
    isNaN(maxBytes) ||
    Math.abs(now - tsNum) > WINDOW_SEC
  ) {
    return null;
  }
  const expected = createHmac("sha256", secret)
    .update(`${ts}:${userId}:${keyPrefix}:${maxBytes}`)
    .digest("hex");
  if (!safeEqualHex(sig, expected)) return null;
  if (!keyPrefix.startsWith(`convert/${userId}/`)) return null;
  return { userId, maxBytes };
}

/** Example request gate used inside POST /upload. */
export function authorizeUpload(req, secret) {
  const fileKey = String(req.headers["x-file-key"] || "");
  const slash = fileKey.lastIndexOf("/");
  const keyPrefix = slash >= 0 ? fileKey.slice(0, slash + 1) : "";
  const bound = String(req.headers["x-auth-bound"] || "");
  if (bound) {
    const claims = verifyTokenV2(bound, secret, keyPrefix);
    if (!claims) return { ok: false, status: 401, error: "invalid bound token" };
    if (!fileKey.startsWith(`convert/${claims.userId}/`)) {
      return { ok: false, status: 403, error: "key not owned by token user" };
    }
    const len = Number(req.headers["content-length"] || 0);
    if (len > 0 && len > claims.maxBytes) {
      return { ok: false, status: 413, error: "file exceeds plan limit" };
    }
    return { ok: true, claims };
  }
  const token = String(req.headers["x-auth-token"] || "");
  if (!verifyTokenV1(token, secret)) {
    return { ok: false, status: 401, error: "invalid token" };
  }
  // Legacy path: still restrict to convert/ and reject traversal in your
  // existing x-file-key validator.
  return { ok: true, claims: null };
}
