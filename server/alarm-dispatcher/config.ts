import { z } from "zod";
import type { DispatcherConfig } from "./types";

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  ALARM_DISPATCH_INSTANCE_ID: z.string().min(8).optional(),
  ALARM_DISPATCH_INTERVAL_MS: positiveInt(30_000),
  ALARM_DISPATCH_LEADER_LEASE_MS: positiveInt(90_000),
  ALARM_DISPATCH_TARGET_LEASE_MS: positiveInt(90_000),
  ALARM_DISPATCH_GRACE_MS: positiveInt(10 * 60_000),
  ALARM_DISPATCH_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(100),
  ALARM_DISPATCH_CONCURRENCY: z.coerce.number().int().min(1).max(25).default(8),
  ALARM_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  // Defaults to shadow: a misconfigured deploy must not start sending real pushes.
  ALARM_SHADOW_MODE: z.enum(["true", "false"]).default("true"),
  ALARM_DEFAULT_TIMEZONE: z.string().min(1).default("America/New_York"),
  RIH_VAPID_PUBLIC_KEY: z.string().min(16),
  RIH_VAPID_PRIVATE_KEY: z.string().min(16),
  RIH_VAPID_EMAIL: z.string().startsWith("mailto:"),
});

export function loadDispatcherConfig(env: NodeJS.ProcessEnv = process.env): DispatcherConfig {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid alarm-dispatcher configuration: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  const value = parsed.data;

  // Validate the IANA zone here rather than discovering it mid-cycle, where a
  // throw would look like a delivery failure.
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value.ALARM_DEFAULT_TIMEZONE });
  } catch {
    throw new Error(
      `ALARM_DEFAULT_TIMEZONE is not a valid IANA time zone: ${value.ALARM_DEFAULT_TIMEZONE}`,
    );
  }

  // A lease shorter than the interval would expire between ticks and let a
  // second instance claim work the first is still doing.
  if (value.ALARM_DISPATCH_LEADER_LEASE_MS <= value.ALARM_DISPATCH_INTERVAL_MS) {
    throw new Error("ALARM_DISPATCH_LEADER_LEASE_MS must exceed ALARM_DISPATCH_INTERVAL_MS");
  }
  if (value.ALARM_DISPATCH_TARGET_LEASE_MS < value.ALARM_DISPATCH_LEADER_LEASE_MS) {
    throw new Error("ALARM_DISPATCH_TARGET_LEASE_MS must be at least the leader lease duration");
  }

  const instanceId =
    value.ALARM_DISPATCH_INSTANCE_ID ??
    `alarm-dispatcher-${process.env.RAILWAY_DEPLOYMENT_ID ?? process.pid}-${crypto.randomUUID()}`;

  return {
    instanceId,
    intervalMs: value.ALARM_DISPATCH_INTERVAL_MS,
    leaderLeaseMs: value.ALARM_DISPATCH_LEADER_LEASE_MS,
    targetLeaseMs: value.ALARM_DISPATCH_TARGET_LEASE_MS,
    reconciliationGraceMs: value.ALARM_DISPATCH_GRACE_MS,
    batchSize: value.ALARM_DISPATCH_BATCH_SIZE,
    concurrency: value.ALARM_DISPATCH_CONCURRENCY,
    maxAttempts: value.ALARM_MAX_ATTEMPTS,
    shadowMode: value.ALARM_SHADOW_MODE === "true",
    defaultTimezone: value.ALARM_DEFAULT_TIMEZONE,
    vapidPublicKey: value.RIH_VAPID_PUBLIC_KEY,
    vapidPrivateKey: value.RIH_VAPID_PRIVATE_KEY,
    vapidEmail: value.RIH_VAPID_EMAIL,
  };
}
