import { describe, it, expect } from "vitest";

/**
 * Verifies the relay's dynamic URL discovery chain:
 * 1. The relay VM's /tunnel-url endpoint reports the current HTTPS tunnel URL
 *    (quick-tunnel URLs rotate on restart, so nothing static can be trusted).
 * 2. The reported tunnel URL actually serves the relay (health returns ok).
 *
 * Mirrors resolveRelayUrl() in server/routers/convert.ts.
 */
const RELAY_DIRECT_URL = "http://34.23.137.141:4567";

describe("relay URL reachability", () => {
  it("relay /tunnel-url reports a live HTTPS tunnel whose health returns ok:true", async () => {
    const urlResp = await fetch(`${RELAY_DIRECT_URL}/tunnel-url`, {
      signal: AbortSignal.timeout(10_000),
    });
    expect(urlResp.ok).toBe(true);
    const { url } = (await urlResp.json()) as { url?: string };
    expect(url).toBeTruthy();
    expect(url!.startsWith("https://")).toBe(true);

    const healthResp = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(15_000),
    });
    expect(healthResp.ok).toBe(true);
    const body = (await healthResp.json()) as { ok: boolean; v?: number };
    expect(body.ok).toBe(true);
    // v2 = disk-streaming relay (v1 buffered in RAM and OOM-killed on large files)
    expect(body.v).toBe(2);
  }, 30_000);
});
