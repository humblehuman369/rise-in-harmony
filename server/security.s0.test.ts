/**
 * S0 security unit tests — env hardening helpers and pure guards.
 */
import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";

describe("S0 env hardening", () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  it("warns but does not throw for weak JWT in development", async () => {
    process.env.NODE_ENV = "development";
    process.env.JWT_SECRET = "too-short";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { assertCriticalEnv } = await import("./_core/env");
    expect(() => assertCriticalEnv()).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("throws for weak JWT in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "x".repeat(8);
    process.env.DATABASE_URL = "mysql://u:p@localhost/db";
    const { assertCriticalEnv } = await import("./_core/env");
    expect(() => assertCriticalEnv()).toThrow(/JWT_SECRET/);
  });

  it("throws when DATABASE_URL missing in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "x".repeat(40);
    delete process.env.DATABASE_URL;
    const { assertCriticalEnv } = await import("./_core/env");
    expect(() => assertCriticalEnv()).toThrow(/DATABASE_URL/);
  });

  it("accepts a strong JWT secret in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "x".repeat(40);
    process.env.DATABASE_URL = "mysql://u:p@localhost/db";
    process.env.REVENUECAT_WEBHOOK_SECRET = "rc-secret";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { assertCriticalEnv } = await import("./_core/env");
    expect(() => assertCriticalEnv()).not.toThrow();
    warn.mockRestore();
  });
});
