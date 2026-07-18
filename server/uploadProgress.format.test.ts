/**
 * Tests for the upload speed / ETA display helpers used by the Convert
 * upload progress indicator (client/src/lib/convertUpload.ts).
 *
 * The helpers are pure functions, so we import them directly even though
 * they live in the client tree.
 */
import { describe, it, expect } from "vitest";
import { formatUploadSpeed, formatEta } from "../client/src/lib/convertUpload";

describe("formatUploadSpeed", () => {
  it("returns em dash for null / non-positive / non-finite", () => {
    expect(formatUploadSpeed(null)).toBe("—");
    expect(formatUploadSpeed(0)).toBe("—");
    expect(formatUploadSpeed(-5)).toBe("—");
    expect(formatUploadSpeed(Infinity)).toBe("—");
    expect(formatUploadSpeed(NaN)).toBe("—");
  });

  it("formats bytes per second below 1 KB/s", () => {
    expect(formatUploadSpeed(512)).toBe("512 B/s");
  });

  it("formats KB/s range", () => {
    expect(formatUploadSpeed(200 * 1024)).toBe("200 KB/s");
  });

  it("formats MB/s range with one decimal", () => {
    expect(formatUploadSpeed(3.25 * 1024 * 1024)).toBe("3.3 MB/s");
    expect(formatUploadSpeed(1024 * 1024)).toBe("1.0 MB/s");
  });
});

describe("formatEta", () => {
  it("returns em dash for null / non-finite", () => {
    expect(formatEta(null)).toBe("—");
    expect(formatEta(Infinity)).toBe("—");
    expect(formatEta(NaN)).toBe("—");
  });

  it("returns <1s for sub-second remainders", () => {
    expect(formatEta(0.4)).toBe("<1s");
  });

  it("formats seconds under a minute", () => {
    expect(formatEta(42)).toBe("42s");
  });

  it("formats minutes with remainder seconds", () => {
    expect(formatEta(95)).toBe("1m 35s");
    expect(formatEta(120)).toBe("2m");
  });

  it("formats hours", () => {
    expect(formatEta(3725)).toBe("1h 2m");
  });
});
