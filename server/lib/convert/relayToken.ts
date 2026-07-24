/**
 * EC2 upload-relay auth tokens.
 *
 * v1 (legacy, still minted for zero-downtime): `{ts}.{hmac(ts)}`
 *   — accepted by the currently deployed relay.
 *
 * v2 (bound): `{ts}.{userId}.{maxBytes}.{hmac(ts:userId:keyPrefix:maxBytes)}`
 *   — binds the token to a user, destination prefix, and size cap. The client
 *   sends this as `x-auth-bound`; the relay should prefer it when present
 *   (see scripts/relay/verify-token-v2.snippet.js).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const RELAY_TOKEN_WINDOW_SEC = 300;

export function mintRelayTokenV1(secret: string, nowSec = Math.floor(Date.now() / 1000)): string {
  const ts = String(nowSec);
  const sig = createHmac("sha256", secret).update(ts).digest("hex");
  return `${ts}.${sig}`;
}

export function mintRelayTokenV2(opts: {
  secret: string;
  userId: number;
  keyPrefix: string;
  maxBytes: number;
  nowSec?: number;
}): string {
  const ts = String(opts.nowSec ?? Math.floor(Date.now() / 1000));
  const payload = `${ts}:${opts.userId}:${opts.keyPrefix}:${opts.maxBytes}`;
  const sig = createHmac("sha256", opts.secret).update(payload).digest("hex");
  return `${ts}.${opts.userId}.${opts.maxBytes}.${sig}`;
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length || ba.length === 0) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Unit-test / docs helper — mirrors the intended relay verify for v2. */
export function verifyRelayTokenV2(
  token: string,
  secret: string,
  keyPrefix: string,
  nowSec = Math.floor(Date.now() / 1000),
): { ok: true; userId: number; maxBytes: number } | { ok: false } {
  const parts = token.split(".");
  if (parts.length !== 4) return { ok: false };
  const [ts, userIdStr, maxBytesStr, sig] = parts;
  const tsNum = parseInt(ts ?? "", 10);
  const userId = parseInt(userIdStr ?? "", 10);
  const maxBytes = parseInt(maxBytesStr ?? "", 10);
  if (
    !sig ||
    !Number.isFinite(tsNum) ||
    !Number.isFinite(userId) ||
    !Number.isFinite(maxBytes) ||
    Math.abs(nowSec - tsNum) > RELAY_TOKEN_WINDOW_SEC
  ) {
    return { ok: false };
  }
  const expected = createHmac("sha256", secret)
    .update(`${ts}:${userId}:${keyPrefix}:${maxBytes}`)
    .digest("hex");
  if (!safeEqualHex(sig, expected)) return { ok: false };
  if (!keyPrefix.startsWith(`convert/${userId}/`)) return { ok: false };
  return { ok: true, userId, maxBytes };
}

export function verifyRelayTokenV1(
  token: string,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [ts, sig] = parts;
  const tsNum = parseInt(ts ?? "", 10);
  if (!sig || !Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > RELAY_TOKEN_WINDOW_SEC) {
    return false;
  }
  const expected = createHmac("sha256", secret).update(String(ts)).digest("hex");
  return safeEqualHex(sig, expected);
}
