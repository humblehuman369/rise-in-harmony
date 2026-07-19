/**
 * End-to-end integration test for the FIXED token flow:
 *
 *   real getRelayToken tRPC HTTP response  →  client parsing logic
 *   →  x-auth-token header  →  live relay POST /upload  →  200
 *
 * getRelayToken is a protectedProcedure, so this test calls the router
 * directly with an owner context to obtain the EXACT superjson-serialized
 * HTTP body the browser would receive, then feeds it through the identical
 * parsing + validation pipeline the client uses, and finally performs a
 * real upload against the live relay with the parsed token.
 *
 * This is the test that would have caught the 2026-07-19 production
 * incident: the previous suite minted tokens directly and never exercised
 * the response-parsing path, so `result.data.token` (undefined) slipped
 * through to production as the literal header value "undefined".
 */
import { describe, expect, it } from "vitest";

import superjson from "superjson";
import { appRouter } from "./routers";

const RELAY_URL = "https://34-23-137-141.sslip.io";
const TOKEN_FORMAT = /^\d{9,12}\.[0-9a-f]{64}$/;

/** Mirror of the client parsing (keep in sync with convertUpload.ts) */
function clientParse(tokenJson: unknown): {
  token: string;
  relayUrl?: string;
  keyPrefix?: string;
} {
  type TokenPayload = { token?: string; relayUrl?: string; keyPrefix?: string };
  const arr = tokenJson as [
    { result: { data: { json?: TokenPayload } & TokenPayload } },
  ];
  const payload = arr?.[0]?.result?.data?.json ?? arr?.[0]?.result?.data ?? {};
  const token = typeof payload.token === "string" ? payload.token : "";
  return { token, relayUrl: payload.relayUrl, keyPrefix: payload.keyPrefix };
}

function makeOwnerCtx() {
  return {
    user: {
      id: 1,
      openId: process.env.OWNER_OPEN_ID ?? "test-owner",
      name: process.env.OWNER_NAME ?? "Test Owner",
      email: "owner@test.local",
      role: "admin" as const,
    },
    req: { headers: {} },
    res: {
      setHeader: () => {
        /* noop — mirrors Express API surface used by the procedure */
      },
    },
  } as never;
}

describe("relay token E2E: real procedure output → client parsing → live relay upload", () => {
  const hasSecret = Boolean(process.env.RIH_RELAY_AUTH_SECRET);

  it.skipIf(!hasSecret)(
    "the exact wire payload a browser receives parses to a valid token",
    async () => {
      const caller = appRouter.createCaller(makeOwnerCtx());
      const raw = await caller.convert.getRelayToken();

      // Reproduce the exact HTTP wire format: superjson-serialize the
      // procedure output and wrap it in the tRPC batch envelope, byte-for-byte
      // what the browser's `tokenRes.json()` would produce.
      const wireBody = JSON.parse(
        JSON.stringify([{ result: { data: superjson.serialize(raw) } }]),
      );

      const { token, relayUrl, keyPrefix } = clientParse(wireBody);
      expect(token).not.toBe("undefined"); // the literal production bug value
      expect(token).toMatch(TOKEN_FORMAT);
      expect(relayUrl).toBe(RELAY_URL);
      // Per-user destination prefix (2026-07-19 fix): must satisfy the
      // assertSourceKey contract `convert/{userId}/...` for job creation.
      expect(keyPrefix).toMatch(/^convert\/1\/[A-Za-z0-9_-]{12}\/$/);
    },
  );

  it.skipIf(!hasSecret)(
    "the parsed token completes a real upload against the live relay",
    async () => {
      const caller = appRouter.createCaller(makeOwnerCtx());
      const raw = await caller.convert.getRelayToken();
      const wireBody = JSON.parse(
        JSON.stringify([{ result: { data: superjson.serialize(raw) } }]),
      );
      const { token, relayUrl, keyPrefix } = clientParse(wireBody);
      expect(token).toMatch(TOKEN_FORMAT);
      expect(keyPrefix).toBeTruthy();

      // Mirror the client: build the per-user destination key and send it
      // via x-file-key so the stored key passes assertSourceKey.
      const fileKey = `${keyPrefix}e2e-parse-test.txt`;
      const res = await fetch(`${relayUrl ?? RELAY_URL}/upload`, {
        method: "POST",
        headers: {
          "x-auth-token": token,
          "x-file-name": "e2e-parse-test.txt",
          "x-content-type": "text/plain",
          "x-file-key": fileKey,
        },
        body: "e2e wire-parse upload test",
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { key?: string; url?: string };
      // The relay must store at EXACTLY the requested per-user key —
      // this is the assertSourceKey contract that job creation enforces.
      expect(body.key).toBe(fileKey);
      expect(body.key).toMatch(/^convert\/1\//);
      expect(body.url).toContain("/manus-storage/");

      // The stored key must pass the same validation createJob applies
      // (`convert/{userId}/` prefix) — the 2026-07-19 "audio disappeared"
      // incident was caused by the relay storing under convert-uploads/.
      expect(body.key!.startsWith("convert/1/")).toBe(true);
    },
    30_000,
  );

  it.skipIf(!hasSecret)(
    "legacy fallback: uploads without x-file-key still store under convert-uploads/",
    async () => {
      const caller = appRouter.createCaller(makeOwnerCtx());
      const raw = await caller.convert.getRelayToken();
      const wireBody = JSON.parse(
        JSON.stringify([{ result: { data: superjson.serialize(raw) } }]),
      );
      const { token, relayUrl } = clientParse(wireBody);

      const res = await fetch(`${relayUrl ?? RELAY_URL}/upload`, {
        method: "POST",
        headers: {
          "x-auth-token": token,
          "x-file-name": "e2e-legacy-test.txt",
          "x-content-type": "text/plain",
        },
        body: "legacy path upload test",
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { key?: string };
      expect(body.key).toContain("convert-uploads/");
    },
    30_000,
  );

  it.skipIf(!hasSecret)(
    "security: relay rejects traversal and non-convert x-file-key values (falls back to legacy)",
    async () => {
      const caller = appRouter.createCaller(makeOwnerCtx());
      const raw = await caller.convert.getRelayToken();
      const wireBody = JSON.parse(
        JSON.stringify([{ result: { data: superjson.serialize(raw) } }]),
      );
      const { token, relayUrl } = clientParse(wireBody);

      for (const badKey of [
        "convert/1/../../etc/passwd",
        "secrets/steal.txt",
        "convert//double/slash.txt",
      ]) {
        const res = await fetch(`${relayUrl ?? RELAY_URL}/upload`, {
          method: "POST",
          headers: {
            "x-auth-token": token,
            "x-file-name": "bad.txt",
            "x-content-type": "text/plain",
            "x-file-key": badKey,
          },
          body: "x",
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { key?: string };
        // Never stored at the malicious key — always the safe legacy scheme.
        expect(body.key).not.toBe(badKey);
        expect(body.key).toContain("convert-uploads/");
      }
    },
    30_000,
  );

  it.skipIf(!hasSecret)(
    "regression guard: the buggy pre-fix parsing yields no usable token from the real wire payload",
    async () => {
      const caller = appRouter.createCaller(makeOwnerCtx());
      const raw = await caller.convert.getRelayToken();
      const wireBody = JSON.parse(
        JSON.stringify([{ result: { data: superjson.serialize(raw) } }]),
      ) as [{ result: { data: { token?: string } } }];

      // This is what the client did BEFORE the fix:
      const buggyToken = wireBody[0].result.data.token;
      expect(buggyToken).toBeUndefined();
      // …and what the header became after string coercion:
      expect(String(buggyToken)).toBe("undefined");
      expect(TOKEN_FORMAT.test(String(buggyToken))).toBe(false);
    },
  );
});
