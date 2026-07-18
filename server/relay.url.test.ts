import { describe, it, expect } from "vitest";
import https from "https";

describe("relay URL reachability", () => {
  it("tunnel health endpoint returns ok:true", async () => {
    const url = process.env.RIH_RELAY_URL ?? "https://vids-touch-distributed-newark.trycloudflare.com";
    const res = await fetch(`${url}/health`);
    expect(res.ok).toBe(true);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
