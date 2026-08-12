export type AttemptStatus = "pending" | "sent" | "terminal_failed" | "cancelled";

export type TargetStatus =
  | "pending"
  | "claimed"
  | "sending"
  | "sent"
  | "retryable_failed"
  | "terminal_failed"
  | "cancelled";

export interface DispatcherConfig {
  instanceId: string;
  intervalMs: number;
  leaderLeaseMs: number;
  targetLeaseMs: number;
  reconciliationGraceMs: number;
  batchSize: number;
  concurrency: number;
  maxAttempts: number;
  shadowMode: boolean;
  defaultTimezone: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidEmail: string;
}

/** Mirrors the `alarms` table in drizzle/schema.ts. */
export interface AlarmRecord {
  id: number;
  userId: number;
  label: string | null;
  hour: number;
  minute: number;
  days: number[];
  timezone: string | null;
  isEnabled: boolean;
  kind: "wake" | "wind_down";
  soundType: "frequency" | "studio_mix" | "ambient" | "meditation";
  frequencyHz: number | null;
  frequencyName: string | null;
  studioMixName: string | null;
  ambientId: string | null;
  ambientLabel: string | null;
  meditationId: string | null;
  meditationLabel: string | null;
  wakeSequence: string | null;
  fadeInMinutes: number;
}

export interface SubscriptionRecord {
  id: number;
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface ClaimedTarget {
  targetId: number;
  attemptId: number;
  alarmId: number;
  userId: number;
  scheduledForUtc: Date;
  attemptCount: number;
  subscription: SubscriptionRecord;
  alarm: AlarmRecord;
}

export interface PushMessage {
  endpoint: string;
  p256dh: string;
  auth: string;
  payload: string;
}

export type PushProviderResult =
  | { ok: true; statusCode?: number; messageId?: string }
  | {
      ok: false;
      statusCode?: number;
      code: string;
      message: string;
      retryable: boolean;
      invalidSubscription: boolean;
    };

export interface PushGateway {
  send(message: PushMessage): Promise<PushProviderResult>;
}

export interface DispatchCycleSummary {
  skippedBecauseLeaderBusy: boolean;
  materializedAttempts: number;
  claimedTargets: number;
  sentTargets: number;
  retriedTargets: number;
  terminalFailures: number;
  cancelledTargets: number;
  recoveredTargets: number;
  durationMs: number;
}

export interface LoggerLike {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}
