/**
 * TrueHz Convert free/paid limits (Phase 1 defaults from development plan).
 */

export const CONVERT_ALGORITHM_VERSION = "rb-4.0-v1";

export const CONVERT_LIMITS = {
  free: {
    maxDurationSec: 5 * 60,
    maxFileBytes: 25 * 1024 * 1024,
    maxConcurrent: 1,
    retentionDays: 7,
    allowHighQuality: false,
    allowHybrid: false,
    allowFormant: false,
    allowWavOutput: false,
  },
  paid: {
    maxDurationSec: 30 * 60,
    maxFileBytes: 100 * 1024 * 1024,
    maxConcurrent: 2,
    retentionDays: 90,
    allowHighQuality: true,
    allowHybrid: true,
    allowFormant: true,
    allowWavOutput: true,
  },
} as const;

export type ConvertTierLimits = {
  maxDurationSec: number;
  maxFileBytes: number;
  maxConcurrent: number;
  retentionDays: number;
  allowHighQuality: boolean;
  allowHybrid: boolean;
  allowFormant: boolean;
  allowWavOutput: boolean;
};

export function limitsForPremium(isPremium: boolean): ConvertTierLimits {
  return isPremium ? CONVERT_LIMITS.paid : CONVERT_LIMITS.free;
}

export const CONVERT_ERROR_CODES = {
  TOO_LARGE: "TOO_LARGE",
  TOO_LONG: "TOO_LONG",
  BAD_FORMAT: "BAD_FORMAT",
  CONCURRENT_LIMIT: "CONCURRENT_LIMIT",
  FEATURE_DISABLED: "FEATURE_DISABLED",
  TOOLING_MISSING: "TOOLING_MISSING",
  PROCESS_FAILED: "PROCESS_FAILED",
  TIMEOUT: "TIMEOUT",
  NOT_FOUND: "NOT_FOUND",
  PREMIUM_REQUIRED: "PREMIUM_REQUIRED",
  DOWNLOAD_FAILED: "DOWNLOAD_FAILED",
  UPLOAD_FAILED: "UPLOAD_FAILED",
} as const;

export type ConvertErrorCode =
  (typeof CONVERT_ERROR_CODES)[keyof typeof CONVERT_ERROR_CODES];

/** Feature flag: RIH_CONVERT_ENABLED=false disables Create/Upload. */
export function isConvertEnabled(): boolean {
  const v = process.env.RIH_CONVERT_ENABLED;
  if (v === undefined || v === "") return true;
  return v !== "0" && v.toLowerCase() !== "false" && v.toLowerCase() !== "off";
}
