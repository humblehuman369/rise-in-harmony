import { describe, expect, it } from "vitest";

/**
 * Live infrastructure test for the upload relay.
 *
 * The relay is served directly over HTTPS by Caddy on the VM at the stable
 * hostname 34-23-137-141.sslip.io (Let's Encrypt cert, reverse proxy to the
 * Node relay on localhost:4567). This replaced the Cloudflare quick tunnel,
 * which throttled/dropped large request bodies (uploads died at ~95%).
 *
 * These tests hit the real endpoint so CI catches infra drift before users do.
 */
const RELAY_STABLE_URL = "https://34-23-137-141.sslip.io";

describe("upload relay stable HTTPS endpoint", () => {
  it("responds healthy at /health with a valid TLS certificate", async () => {
    const resp = await fetch(`${RELAY_STABLE_URL}/health`, {
      signal: AbortSignal.timeout(15_000),
    });
    expect(resp.ok).toBe(true);
    const body = (await resp.json()) as { ok?: boolean; v?: number };
    expect(body.ok).toBe(true);
    // v2 = disk-streaming relay (flat memory for large files)
    expect(body.v).toBe(2);
  }, 30_000);

  it("answers CORS preflight for the production origin", async () => {
    const resp = await fetch(`${RELAY_STABLE_URL}/upload`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://www.riseinharmony.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "x-auth-token,x-file-name,x-content-type",
      },
      signal: AbortSignal.timeout(15_000),
    });
    expect(resp.status).toBe(204);
    expect(resp.headers.get("access-control-allow-origin")).toBe(
      "https://www.riseinharmony.com",
    );
    expect(resp.headers.get("access-control-allow-methods")).toContain("POST");
  }, 30_000);

  it("rejects uploads without a valid auth token", async () => {
    const resp = await fetch(`${RELAY_STABLE_URL}/upload`, {
      method: "POST",
      headers: {
        Origin: "https://www.riseinharmony.com",
        "x-auth-token": "0.deadbeef",
        "x-file-name": "test.mp3",
        "x-content-type": "audio/mpeg",
      },
      body: "x",
      signal: AbortSignal.timeout(15_000),
    });
    expect(resp.status).toBe(401);
  }, 30_000);
});
