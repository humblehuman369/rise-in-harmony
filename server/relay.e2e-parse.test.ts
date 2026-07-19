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
function clientParse(tokenJson: unknown): { token: string; relayUrl?: string } {
  const arr = tokenJson as [
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
  const payload = arr?.[0]?.result?.data?.json ?? arr?.[0]?.result?.data ?? {};
  const token = typeof payload.token === "string" ? payload.token : "";
  return { token, relayUrl: payload.relayUrl };
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

      const { token, relayUrl } = clientParse(wireBody);
      expect(token).not.toBe("undefined"); // the literal production bug value
      expect(token).toMatch(TOKEN_FORMAT);
      expect(relayUrl).toBe(RELAY_URL);
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
      const { token, relayUrl } = clientParse(wireBody);
      expect(token).toMatch(TOKEN_FORMAT);

      const res = await fetch(`${relayUrl ?? RELAY_URL}/upload`, {
        method: "POST",
        headers: {
          "x-auth-token": token,
          "x-file-name": "e2e-parse-test.txt",
          "x-content-type": "text/plain",
        },
        body: "e2e wire-parse upload test",
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { key?: string; url?: string };
      expect(body.key).toContain("convert-uploads/");
      expect(body.url).toContain("/manus-storage/");
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
