/**
 * Regression tests for the getRelayToken response-shape bug.
 *
 * PRODUCTION INCIDENT (2026-07-19): the server uses the superjson transformer,
 * so tRPC HTTP responses nest the payload under `result.data.json`. The
 * client's raw-fetch upload path read `result.data.token` (one level too
 * shallow), got `undefined`, string-coerced it into the literal header value
 * "undefined", and the relay rejected it with 401 — surfaced to users as
 * "Upload token expired". Relay log evidence: `401: malformed token (1 parts,
 * len 9)`; Caddy access log: `X-Auth-Token: ['undefined']`.
 *
 * These tests lock down:
 *  1. The parsing logic handles BOTH shapes (superjson envelope and plain).
 *  2. A malformed/missing token can never be sent (format gate).
 *  3. The live client source contains the fixed parsing + validation.
 *  4. The dev server's real HTTP response for a superjson router procedure
 *     actually uses the `result.data.json` envelope (contract with the wire).
 */
import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

// ── Mirrors of the client implementation (keep in sync with convertUpload.ts) ──

type TokenResponse = [
  {
    result: {
      data: {
        json?: { token?: string; relayUrl?: string };
        token?: string;
        relayUrl?: string;
      };
    };
  },
];

function parseTokenPayload(tokenJson: TokenResponse): { token: string; relayUrl?: string } {
  const payload = tokenJson?.[0]?.result?.data?.json ?? tokenJson?.[0]?.result?.data ?? {};
  const token = typeof payload.token === "string" ? payload.token : "";
  return { token, relayUrl: payload.relayUrl };
}

const TOKEN_FORMAT = /^\d{9,12}\.[0-9a-f]{64}$/;

function makeValidToken(secret = "test-secret"): string {
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = createHmac("sha256", secret).update(ts).digest("hex");
  return `${ts}.${sig}`;
}

describe("getRelayToken response-shape parsing (superjson envelope)", () => {
  it("reads the token from the superjson `result.data.json` envelope", () => {
    const token = makeValidToken();
    const resp: TokenResponse = [
      { result: { data: { json: { token, relayUrl: "https://34-23-137-141.sslip.io" } } } },
    ];
    const parsed = parseTokenPayload(resp);
    expect(parsed.token).toBe(token);
    expect(parsed.relayUrl).toBe("https://34-23-137-141.sslip.io");
  });

  it("still reads a plain `result.data` shape (no transformer)", () => {
    const token = makeValidToken();
    const resp: TokenResponse = [
      { result: { data: { token, relayUrl: "https://34-23-137-141.sslip.io" } } },
    ];
    expect(parseTokenPayload(resp).token).toBe(token);
  });

  it("returns empty string (NOT the string 'undefined') when token is absent", () => {
    const resp = [{ result: { data: { json: {} } } }] as TokenResponse;
    const parsed = parseTokenPayload(resp);
    expect(parsed.token).toBe("");
    // The exact production bug: `String(undefined)` === "undefined" (9 chars)
    expect(parsed.token).not.toBe("undefined");
  });

  it("format gate rejects the values that caused the production 401", () => {
    expect(TOKEN_FORMAT.test("undefined")).toBe(false); // the literal bug value
    expect(TOKEN_FORMAT.test("")).toBe(false);
    expect(TOKEN_FORMAT.test("null")).toBe(false);
    expect(TOKEN_FORMAT.test("[object Object]")).toBe(false);
    expect(TOKEN_FORMAT.test("12345.zzzz")).toBe(false);
  });

  it("format gate accepts a real HMAC token", () => {
    expect(TOKEN_FORMAT.test(makeValidToken())).toBe(true);
  });

  it("the live client source contains the fixed parsing and validation", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../client/src/lib/convertUpload.ts", import.meta.url),
      "utf8",
    );
    // Must read the superjson envelope level
    expect(src).toContain("result?.data?.json");
    // Must gate the token format before sending
    expect(src).toContain("\\d{9,12}");
    // Must never index result.data.token directly without the json fallback
    expect(src).not.toContain("tokenJson[0].result.data.token");
  });

  it("dev server wire contract: superjson responses nest payload under result.data.json", async () => {
    // auth.me is public and uses the same router/transformer as getRelayToken.
    const port = process.env.PORT || "3000";
    const res = await fetch(
      `http://localhost:${port}/api/trpc/auth.me?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D`,
    );
    expect(res.ok).toBe(true);
    const body = (await res.json()) as [{ result: { data: Record<string, unknown> } }];
    // The envelope key must be `json` — if this ever fails, the client parsing
    // in convertUpload.ts must be revisited.
    expect(body[0].result.data).toHaveProperty("json");
  });
});
