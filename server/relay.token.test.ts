/**
 * Validates relay token mint/verify helpers used by convert.getRelayToken.
 *
 * v1: `{seconds}.{hex_hmac(secret, ts)}` — live relay today
 * v2: bound to userId + keyPrefix + maxBytes
 */
import { describe, it, expect } from "vitest";
import {
  mintRelayTokenV1,
  mintRelayTokenV2,
  verifyRelayTokenV1,
  verifyRelayTokenV2,
} from "./lib/convert/relayToken";

const SECRET = process.env.RIH_RELAY_AUTH_SECRET || "unit-test-relay-secret";

describe("relay token v1", () => {
  it("generates a token that passes verification", () => {
    const token = mintRelayTokenV1(SECRET);
    expect(token).toMatch(/^\d+\.[a-f0-9]{64}$/);
    expect(verifyRelayTokenV1(token, SECRET)).toBe(true);
  });

  it("rejects a token with wrong secret", () => {
    const token = mintRelayTokenV1(SECRET);
    expect(verifyRelayTokenV1(token, "wrong-secret")).toBe(false);
  });

  it("rejects a token with tampered signature", () => {
    const token = mintRelayTokenV1(SECRET);
    const [ts] = token.split(".");
    const tampered = `${ts}.deadbeef${"0".repeat(56)}`;
    expect(verifyRelayTokenV1(tampered, SECRET)).toBe(false);
  });

  it("rejects an expired token (> 5 min old)", () => {
    const oldTs = Math.floor(Date.now() / 1000) - 400;
    const token = mintRelayTokenV1(SECRET, oldTs);
    expect(verifyRelayTokenV1(token, SECRET)).toBe(false);
  });
});

describe("relay token v2 (bound)", () => {
  const keyPrefix = "convert/42/abc123def456/";
  const maxBytes = 40 * 1024 * 1024;

  it("mints a bound token accepted for the matching keyPrefix", () => {
    const token = mintRelayTokenV2({
      secret: SECRET,
      userId: 42,
      keyPrefix,
      maxBytes,
    });
    expect(token).toMatch(/^\d+\.42\.\d+\.[a-f0-9]{64}$/);
    const result = verifyRelayTokenV2(token, SECRET, keyPrefix);
    expect(result).toEqual({ ok: true, userId: 42, maxBytes });
  });

  it("rejects a different keyPrefix (cross-user / prefix swap)", () => {
    const token = mintRelayTokenV2({
      secret: SECRET,
      userId: 42,
      keyPrefix,
      maxBytes,
    });
    const other = verifyRelayTokenV2(
      token,
      SECRET,
      "convert/99/abc123def456/",
    );
    expect(other).toEqual({ ok: false });
  });

  it("rejects wrong secret", () => {
    const token = mintRelayTokenV2({
      secret: SECRET,
      userId: 42,
      keyPrefix,
      maxBytes,
    });
    expect(verifyRelayTokenV2(token, "wrong", keyPrefix)).toEqual({ ok: false });
  });
});
