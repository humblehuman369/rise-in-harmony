/**
 * Contract tests for the client-side relay URL sanitization logic
 * (client/src/lib/convertUpload.ts → sanitizeRelayUrl).
 *
 * Mirrors the implementation to lock the behavior: any missing, relative,
 * or non-https relayUrl must fall back to the known-good stable endpoint,
 * because a stale cached token response from an older deployment previously
 * caused the browser to fetch `/health` against its OWN origin (the SPA
 * returned 200 HTML, falsely passing the pre-flight) and then crash in the
 * XHR error handler with "Failed to construct 'URL'".
 */
import { describe, expect, it } from "vitest";

const RELAY_FALLBACK_URL = "https://34-23-137-141.sslip.io";

// Mirror of the client implementation (keep in sync with convertUpload.ts)
function sanitizeRelayUrl(raw: unknown): string {
  if (typeof raw === "string" && raw.length > 0) {
    try {
      const u = new URL(raw);
      if (u.protocol === "https:") return u.origin;
    } catch {
      /* fall through to fallback */
    }
  }
  return RELAY_FALLBACK_URL;
}

describe("relay URL sanitization contract", () => {
  it("accepts the stable https endpoint unchanged", () => {
    expect(sanitizeRelayUrl("https://34-23-137-141.sslip.io")).toBe(
      "https://34-23-137-141.sslip.io",
    );
  });

  it("normalizes to origin (strips trailing path/slash)", () => {
    expect(sanitizeRelayUrl("https://34-23-137-141.sslip.io/")).toBe(
      "https://34-23-137-141.sslip.io",
    );
    expect(sanitizeRelayUrl("https://34-23-137-141.sslip.io/upload")).toBe(
      "https://34-23-137-141.sslip.io",
    );
  });

  it("falls back for empty string", () => {
    expect(sanitizeRelayUrl("")).toBe(RELAY_FALLBACK_URL);
  });

  it("falls back for undefined/null/non-string", () => {
    expect(sanitizeRelayUrl(undefined)).toBe(RELAY_FALLBACK_URL);
    expect(sanitizeRelayUrl(null)).toBe(RELAY_FALLBACK_URL);
    expect(sanitizeRelayUrl(42)).toBe(RELAY_FALLBACK_URL);
  });

  it("falls back for relative or garbage URLs", () => {
    expect(sanitizeRelayUrl("/health")).toBe(RELAY_FALLBACK_URL);
    expect(sanitizeRelayUrl("not a url")).toBe(RELAY_FALLBACK_URL);
  });

  it("falls back for non-https schemes (mixed content would be blocked)", () => {
    expect(sanitizeRelayUrl("http://34.23.137.141:4567")).toBe(RELAY_FALLBACK_URL);
    expect(sanitizeRelayUrl("ftp://example.com")).toBe(RELAY_FALLBACK_URL);
  });

  it("keeps other valid https origins intact (e.g. future custom domain)", () => {
    expect(sanitizeRelayUrl("https://relay.riseinharmony.com")).toBe(
      "https://relay.riseinharmony.com",
    );
  });

  it("the client fallback matches the live client source", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../client/src/lib/convertUpload.ts", import.meta.url),
      "utf8",
    );
    expect(src).toContain(`const RELAY_FALLBACK_URL = "${RELAY_FALLBACK_URL}"`);
    expect(src).toContain("sanitizeRelayUrl(");
    // Crash-proof error handler must be present
    expect(src).toContain("safeHostname(");
    // Impostor-proof health check must verify the JSON body
    expect(src).toContain("health?.ok !== true");
    // Token fetch must bypass browser caching
    expect(src).toContain('cache: "no-store"');
  });
});
