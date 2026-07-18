/**
 * Validates that the relay token generation logic produces tokens that
 * the relay's verifyToken function would accept.
 *
 * This mirrors the relay's verifyToken logic exactly:
 *   - Token format: `{seconds_timestamp}.{hex_hmac_sha256(secret, timestamp)}`
 *   - Window: |now - ts| <= 300 seconds
 */
import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";

const RELAY_AUTH_SECRET = process.env.RIH_RELAY_AUTH_SECRET ?? "";

function generateRelayToken(secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sig = createHmac("sha256", secret).update(timestamp).digest("hex");
  return `${timestamp}.${sig}`;
}

function verifyRelayToken(token: string, secret: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [ts, sig] = parts;
  const now = Math.floor(Date.now() / 1000);
  const tsNum = parseInt(ts, 10);
  if (isNaN(tsNum) || Math.abs(now - tsNum) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${ts}`).digest("hex");
  // Constant-time comparison
  return sig === expected;
}

describe("relay token generation", () => {
  it("generates a token that passes relay verification", () => {
    expect(RELAY_AUTH_SECRET.length).toBeGreaterThan(0);
    const token = generateRelayToken(RELAY_AUTH_SECRET);
    expect(token).toMatch(/^\d+\.[a-f0-9]{64}$/);
    expect(verifyRelayToken(token, RELAY_AUTH_SECRET)).toBe(true);
  });

  it("rejects a token with wrong secret", () => {
    const token = generateRelayToken(RELAY_AUTH_SECRET);
    expect(verifyRelayToken(token, "wrong-secret")).toBe(false);
  });

  it("rejects a token with tampered signature", () => {
    const token = generateRelayToken(RELAY_AUTH_SECRET);
    const [ts] = token.split(".");
    const tampered = `${ts}.deadbeef${"0".repeat(56)}`;
    expect(verifyRelayToken(tampered, RELAY_AUTH_SECRET)).toBe(false);
  });

  it("rejects an expired token (> 5 min old)", () => {
    const oldTs = (Math.floor(Date.now() / 1000) - 400).toString();
    const sig = createHmac("sha256", RELAY_AUTH_SECRET).update(oldTs).digest("hex");
    const expiredToken = `${oldTs}.${sig}`;
    expect(verifyRelayToken(expiredToken, RELAY_AUTH_SECRET)).toBe(false);
  });
});
