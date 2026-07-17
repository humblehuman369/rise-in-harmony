/**
 * S1 unit tests — entitlements, HTML escape, cookie options.
 */
import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { escapeHtml } from "./lib/htmlEscape";
import {
  effectiveTier,
  isSubscriptionActive,
  isUserPremium,
} from "./lib/entitlements";

describe("escapeHtml", () => {
  it("escapes angle brackets and quotes", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });
});

describe("entitlements", () => {
  it("treats lifetime as always premium", () => {
    expect(
      isUserPremium({
        subscriptionTier: "lifetime",
        subscriptionExpiresAt: new Date(0),
      })
    ).toBe(true);
  });

  it("treats expired premium as free", () => {
    const expired = new Date(Date.now() - 60_000);
    expect(
      isSubscriptionActive("premium", expired)
    ).toBe(false);
    expect(
      effectiveTier({
        subscriptionTier: "premium",
        subscriptionExpiresAt: expired,
      })
    ).toBe("free");
  });

  it("treats future-dated premium as active", () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(isSubscriptionActive("premium", future)).toBe(true);
    expect(
      isUserPremium({
        subscriptionTier: "premium",
        subscriptionExpiresAt: future,
      })
    ).toBe(true);
  });
});

describe("session cookie options", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  it("uses SameSite=Lax and Secure in production", async () => {
    process.env.NODE_ENV = "production";
    vi.resetModules();
    const { getSessionCookieOptions } = await import("./_core/cookies");
    const opts = getSessionCookieOptions({
      protocol: "http",
      headers: {},
    } as never);
    expect(opts).toMatchObject({
      sameSite: "lax",
      secure: true,
      httpOnly: true,
      path: "/",
    });
  });

  it("allows SameSite=None on secure non-production requests", async () => {
    process.env.NODE_ENV = "development";
    vi.resetModules();
    const { getSessionCookieOptions } = await import("./_core/cookies");
    const opts = getSessionCookieOptions({
      protocol: "https",
      headers: {},
    } as never);
    expect(opts.sameSite).toBe("none");
    expect(opts.secure).toBe(true);
  });
});
