/**
 * In-memory stand-in for AlarmDispatchRepository.
 *
 * This deliberately reimplements the *semantics* the SQL relies on rather than
 * returning canned values, because the properties worth testing — one lease
 * winner, one occurrence per local slot, a claim that only succeeds against an
 * expired lease — live in those conditions. A `vi.fn()` that always resolves
 * true would assert nothing about duplicate delivery.
 *
 * Modelled faithfully:
 *   - dispatcher_leases: conditional UPDATE (same holder, or lease expired)
 *   - alarm_delivery_attempts: UNIQUE (alarmId, scheduledLocalKey)
 *   - alarm_delivery_targets: UNIQUE (deliveryAttemptId, pushSubscriptionId)
 *   - the conditional claim UPDATE and expired-lease recovery
 */
import { findDueOccurrences } from "../recurrence";
import type {
  AlarmRecord,
  ClaimedTarget,
  DispatcherConfig,
  SubscriptionRecord,
  TargetStatus,
} from "../types";

export interface FakeAttempt {
  id: number;
  alarmId: number;
  userId: number;
  scheduledForUtc: Date;
  scheduledLocalKey: string;
  status: "pending" | "sent" | "terminal_failed" | "cancelled";
  completedAt: Date | null;
}

export interface FakeTarget {
  id: number;
  deliveryAttemptId: number;
  pushSubscriptionId: number | null;
  status: TargetStatus;
  attemptCount: number;
  nextAttemptAt: Date | null;
  claimedBy: string | null;
  leaseExpiresAt: Date | null;
  sentAt: Date | null;
  providerStatus: number | null;
  lastErrorCode: string | null;
}

export interface HeartbeatRecord {
  instanceId: string;
  releaseSha: string | null;
  at: Date;
  summary: Record<string, unknown>;
  errorSummary?: string | null;
}

/**
 * One shared database. Two FakeRepository instances pointed at the same store
 * behave like two dispatcher processes against one MySQL.
 */
export class FakeStore {
  alarms: AlarmRecord[] = [];
  subscriptions: SubscriptionRecord[] = [];
  attempts: FakeAttempt[] = [];
  targets: FakeTarget[] = [];
  lease: { holderId: string; leaseExpiresAt: Date } | null = null;
  heartbeats: HeartbeatRecord[] = [];

  private nextAttemptId = 1;
  private nextTargetId = 1;

  allocateAttemptId(): number {
    return this.nextAttemptId++;
  }

  allocateTargetId(): number {
    return this.nextTargetId++;
  }

  /** Sends actually recorded as delivered — the anti-duplicate assertion. */
  sentTargets(): FakeTarget[] {
    return this.targets.filter((target) => target.status === "sent");
  }
}

export class FakeRepository {
  constructor(private readonly store: FakeStore) {}

  async acquireLeaderLease(instanceId: string, now: Date, leaseMs: number): Promise<boolean> {
    const expiresAt = new Date(now.getTime() + leaseMs);
    const current = this.store.lease;

    // Mirrors: WHERE holderId = ? OR leaseExpiresAt < ?
    if (!current || current.holderId === instanceId || current.leaseExpiresAt < now) {
      this.store.lease = { holderId: instanceId, leaseExpiresAt: expiresAt };
      return true;
    }
    return false;
  }

  async releaseLeaderLease(instanceId: string, now: Date = new Date()): Promise<void> {
    if (this.store.lease?.holderId === instanceId) {
      this.store.lease = { holderId: instanceId, leaseExpiresAt: now };
    }
  }

  async recoverExpiredTargetClaims(now: Date): Promise<number> {
    let recovered = 0;
    for (const target of this.store.targets) {
      if (
        (target.status === "claimed" || target.status === "sending") &&
        target.leaseExpiresAt !== null &&
        target.leaseExpiresAt < now
      ) {
        target.status = "pending";
        target.claimedBy = null;
        target.leaseExpiresAt = null;
        recovered += 1;
      }
    }
    return recovered;
  }

  async countAlarmsWithNullTimezone(): Promise<{ nullTimezone: number; total: number }> {
    return {
      nullTimezone: this.store.alarms.filter((alarm) => alarm.timezone == null).length,
      total: this.store.alarms.length,
    };
  }

  async previewDueOccurrences(now: Date, config: DispatcherConfig) {
    const start = new Date(now.getTime() - config.reconciliationGraceMs);
    return findDueOccurrences(
      this.store.alarms.filter((alarm) => alarm.isEnabled),
      start,
      now,
      config.defaultTimezone,
    );
  }

  async materializeDueOccurrences(now: Date, config: DispatcherConfig): Promise<number> {
    const occurrences = await this.previewDueOccurrences(now, config);
    let inserted = 0;

    for (const occurrence of occurrences) {
      // UNIQUE (alarmId, scheduledLocalKey) — INSERT IGNORE.
      const exists = this.store.attempts.some(
        (attempt) =>
          attempt.alarmId === occurrence.alarm.id &&
          attempt.scheduledLocalKey === occurrence.scheduledLocalKey,
      );
      if (exists) continue;

      this.store.attempts.push({
        id: this.store.allocateAttemptId(),
        alarmId: occurrence.alarm.id,
        userId: occurrence.alarm.userId,
        scheduledForUtc: occurrence.scheduledForUtc,
        scheduledLocalKey: occurrence.scheduledLocalKey,
        status: "pending",
        completedAt: null,
      });
      inserted += 1;
    }

    // Fan out open occurrences to each of the user's subscriptions.
    for (const attempt of this.store.attempts.filter((a) => a.status === "pending")) {
      for (const subscription of this.store.subscriptions.filter(
        (s) => s.userId === attempt.userId,
      )) {
        const exists = this.store.targets.some(
          (target) =>
            target.deliveryAttemptId === attempt.id &&
            target.pushSubscriptionId === subscription.id,
        );
        if (exists) continue;

        this.store.targets.push({
          id: this.store.allocateTargetId(),
          deliveryAttemptId: attempt.id,
          pushSubscriptionId: subscription.id,
          status: "pending",
          attemptCount: 0,
          nextAttemptAt: null,
          claimedBy: null,
          leaseExpiresAt: null,
          sentAt: null,
          providerStatus: null,
          lastErrorCode: null,
        });
      }
    }
    return inserted;
  }

  async claimTargets(
    instanceId: string,
    now: Date,
    config: DispatcherConfig,
  ): Promise<ClaimedTarget[]> {
    const claimable = this.store.targets
      .filter(
        (target) =>
          (target.status === "pending" || target.status === "retryable_failed") &&
          (target.nextAttemptAt === null || target.nextAttemptAt <= now),
      )
      .slice(0, config.batchSize);

    const claimed: ClaimedTarget[] = [];
    for (const target of claimable) {
      // The conditional UPDATE: re-check under the same guard. Between the
      // shortlist and here, another instance may already have taken it.
      if (target.status !== "pending" && target.status !== "retryable_failed") continue;
      if (target.nextAttemptAt !== null && target.nextAttemptAt > now) continue;

      target.status = "claimed";
      target.claimedBy = instanceId;
      target.leaseExpiresAt = new Date(now.getTime() + config.targetLeaseMs);

      const attempt = this.store.attempts.find((a) => a.id === target.deliveryAttemptId);
      const subscription = this.store.subscriptions.find(
        (s) => s.id === target.pushSubscriptionId,
      );
      const alarm = this.store.alarms.find((a) => a.id === attempt?.alarmId);
      if (!attempt || !subscription || !alarm) continue;

      claimed.push({
        targetId: target.id,
        attemptId: attempt.id,
        alarmId: attempt.alarmId,
        userId: attempt.userId,
        scheduledForUtc: attempt.scheduledForUtc,
        attemptCount: target.attemptCount,
        subscription,
        alarm,
      });
    }
    return claimed;
  }

  async disableSubscription(subscriptionId: number): Promise<void> {
    this.store.subscriptions = this.store.subscriptions.filter((s) => s.id !== subscriptionId);
    // ON DELETE SET NULL keeps the delivery history.
    for (const target of this.store.targets) {
      if (target.pushSubscriptionId === subscriptionId) target.pushSubscriptionId = null;
    }
  }

  async targetIsStillEligible(target: ClaimedTarget): Promise<boolean> {
    const alarm = this.store.alarms.find((a) => a.id === target.alarmId);
    const subscription = this.store.subscriptions.find((s) => s.id === target.subscription.id);
    return Boolean(alarm?.isEnabled && subscription && subscription.userId === alarm.userId);
  }

  async markSending(targetId: number, _now: Date): Promise<void> {
    const target = this.store.targets.find((t) => t.id === targetId);
    if (target && target.status === "claimed") target.status = "sending";
  }

  async completeTarget(input: {
    targetId: number;
    status: TargetStatus;
    attemptCount: number;
    now: Date;
    nextAttemptAt?: Date | null;
    providerStatus?: number | null;
    providerMessageId?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  }): Promise<void> {
    const target = this.store.targets.find((t) => t.id === input.targetId);
    if (!target) return;

    target.status = input.status;
    target.attemptCount = input.attemptCount;
    target.nextAttemptAt = input.nextAttemptAt ?? null;
    target.providerStatus = input.providerStatus ?? null;
    target.lastErrorCode = input.errorCode ?? null;
    target.claimedBy = null;
    target.leaseExpiresAt = null;
    if (input.status === "sent") target.sentAt = input.now;

    // Roll child states up to the parent occurrence.
    const siblings = this.store.targets.filter(
      (t) => t.deliveryAttemptId === target.deliveryAttemptId,
    );
    const attempt = this.store.attempts.find((a) => a.id === target.deliveryAttemptId);
    if (!attempt) return;

    const open = siblings.filter((t) =>
      ["pending", "claimed", "sending", "retryable_failed"].includes(t.status),
    ).length;

    if (open > 0) {
      attempt.status = "pending";
      attempt.completedAt = null;
      return;
    }
    attempt.completedAt = input.now;
    if (siblings.some((t) => t.status === "sent")) attempt.status = "sent";
    else if (siblings.some((t) => t.status === "terminal_failed")) attempt.status = "terminal_failed";
    else attempt.status = "cancelled";
  }

  async recordHeartbeat(input: {
    instanceId: string;
    releaseSha: string | null;
    now: Date;
    summary: Record<string, unknown>;
    errorSummary?: string | null;
  }): Promise<void> {
    this.store.heartbeats.push({
      instanceId: input.instanceId,
      releaseSha: input.releaseSha,
      at: input.now,
      summary: input.summary,
      errorSummary: input.errorSummary ?? null,
    });
  }
}

export function makeConfig(overrides: Partial<DispatcherConfig> = {}): DispatcherConfig {
  return {
    instanceId: "test-dispatcher-1",
    intervalMs: 30_000,
    leaderLeaseMs: 90_000,
    targetLeaseMs: 90_000,
    reconciliationGraceMs: 600_000,
    batchSize: 100,
    concurrency: 4,
    maxAttempts: 3,
    shadowMode: false,
    defaultTimezone: "America/New_York",
    vapidPublicKey: "public-key-test-value",
    vapidPrivateKey: "private-key-test-value",
    vapidEmail: "mailto:hello@example.test",
    ...overrides,
  };
}

export function makeAlarm(overrides: Partial<AlarmRecord> = {}): AlarmRecord {
  return {
    id: 9,
    userId: 8,
    label: "Morning",
    hour: 7,
    minute: 30,
    days: [0, 1, 2, 3, 4, 5, 6],
    timezone: "America/New_York",
    isEnabled: true,
    kind: "wake",
    soundType: "frequency",
    frequencyHz: 528,
    frequencyName: "Love",
    studioMixName: null,
    ambientId: null,
    ambientLabel: null,
    meditationId: null,
    meditationLabel: null,
    wakeSequence: "gentle",
    fadeInMinutes: 5,
    ...overrides,
  };
}

export function makeSubscription(overrides: Partial<SubscriptionRecord> = {}): SubscriptionRecord {
  return {
    id: 7,
    userId: 8,
    endpoint: "https://push.example.test/abc",
    p256dh: "p256dh-test",
    auth: "auth-test",
    ...overrides,
  };
}

export const silentLog = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
