import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { findDueOccurrences } from "./recurrence";
import type {
  AlarmRecord,
  ClaimedTarget,
  DispatcherConfig,
  SubscriptionRecord,
  TargetStatus,
} from "./types";
import { fromUtcSql, toUtcSql, toUtcSqlOrNull, utcColumn } from "./utc";

/** Columns of `alarms` the dispatcher needs, as a select list. */
const ALARM_COLUMNS = `id, userId, label, hour, minute, days, timezone, isEnabled, kind,
        soundType, frequencyHz, frequencyName, studioMixName, ambientId, ambientLabel,
        meditationId, meditationLabel, wakeSequence, fadeInMinutes`;

interface AlarmRow extends RowDataPacket {
  id: number;
  userId: number;
  label: string | null;
  hour: number;
  minute: number;
  days: number[] | string;
  timezone: string | null;
  isEnabled: number | boolean;
  kind: AlarmRecord["kind"];
  soundType: AlarmRecord["soundType"];
  frequencyHz: number | null;
  frequencyName: string | null;
  studioMixName: string | null;
  ambientId: string | null;
  ambientLabel: string | null;
  meditationId: string | null;
  meditationLabel: string | null;
  wakeSequence: string | null;
  fadeInMinutes: number | null;
}

interface CandidateRow extends AlarmRow {
  targetId: number;
  attemptId: number;
  alarmId: number;
  /** String, because it is selected through utcColumn(). */
  scheduledForUtc: string;
  attemptCount: number;
  subId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function asAlarm(row: AlarmRow): AlarmRecord {
  // `days` is a JSON column; mysql2 may hand back a parsed array or raw text
  // depending on driver/server version, so normalize both.
  const rawDays = typeof row.days === "string" ? JSON.parse(row.days) : row.days;
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    hour: row.hour,
    minute: row.minute,
    days: Array.isArray(rawDays) ? rawDays.map(Number) : [],
    timezone: row.timezone,
    isEnabled: Boolean(row.isEnabled),
    kind: row.kind,
    soundType: row.soundType,
    frequencyHz: row.frequencyHz,
    frequencyName: row.frequencyName,
    studioMixName: row.studioMixName,
    ambientId: row.ambientId,
    ambientLabel: row.ambientLabel,
    meditationId: row.meditationId,
    meditationLabel: row.meditationLabel,
    wakeSequence: row.wakeSequence,
    fadeInMinutes: row.fadeInMinutes ?? 5,
  };
}

function asSubscription(row: CandidateRow): SubscriptionRecord {
  return {
    id: row.subId,
    userId: row.userId,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
  };
}

/**
 * All database access for the alarm dispatcher.
 *
 * Every DATETIME value crossing this boundary goes through `toUtcSql` on write
 * and `utcColumn` + `fromUtcSql` on read, so stored instants never depend on the
 * connection's time zone. See ./utc.ts.
 */
export class AlarmDispatchRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Take (or extend) the scan lease. Returns false when another live instance
   * holds it, which is how a rolling deploy avoids two concurrent scanners.
   */
  async acquireLeaderLease(instanceId: string, now: Date, leaseMs: number): Promise<boolean> {
    const nowSql = toUtcSql(now);
    const expiresSql = toUtcSql(new Date(now.getTime() + leaseMs));

    await this.pool.execute(
      `INSERT IGNORE INTO dispatcher_leases (name, holderId, leaseExpiresAt, updatedAt)
       VALUES ('alarm-dispatcher', ?, ?, ?)`,
      [instanceId, expiresSql, nowSql],
    );
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE dispatcher_leases
       SET holderId = ?, leaseExpiresAt = ?, updatedAt = ?
       WHERE name = 'alarm-dispatcher'
         AND (holderId = ? OR leaseExpiresAt < ?)`,
      [instanceId, expiresSql, nowSql, instanceId, nowSql],
    );
    return result.affectedRows === 1;
  }

  /** Release on graceful shutdown so a replacement instance starts immediately. */
  async releaseLeaderLease(instanceId: string, now: Date = new Date()): Promise<void> {
    const nowSql = toUtcSql(now);
    await this.pool.execute(
      `UPDATE dispatcher_leases SET leaseExpiresAt = ?, updatedAt = ?
       WHERE name = 'alarm-dispatcher' AND holderId = ?`,
      [nowSql, nowSql, instanceId],
    );
  }

  /**
   * Return claimed/sending targets whose lease expired back to pending.
   * This is what makes a worker that died mid-send recoverable without letting
   * a second worker double-send while the first is merely slow.
   */
  async recoverExpiredTargetClaims(now: Date): Promise<number> {
    const nowSql = toUtcSql(now);
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE alarm_delivery_targets
       SET status = 'pending', claimedBy = NULL, leaseExpiresAt = NULL, updatedAt = CURRENT_TIMESTAMP
       WHERE status IN ('claimed', 'sending')
         AND leaseExpiresAt IS NOT NULL
         AND leaseExpiresAt < ?`,
      [nowSql],
    );
    return result.affectedRows;
  }

  /** How many alarms still have no device timezone. Watched during backfill. */
  async countAlarmsWithNullTimezone(): Promise<{ nullTimezone: number; total: number }> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total, SUM(timezone IS NULL) AS nullTimezone FROM alarms`,
    );
    const row = rows[0] ?? {};
    return {
      nullTimezone: Number(row.nullTimezone ?? 0),
      total: Number(row.total ?? 0),
    };
  }

  /**
   * Occurrences due in the reconciliation window. Read-only — this is exactly
   * what shadow mode reports, and what materializeDueOccurrences persists.
   */
  async previewDueOccurrences(now: Date, config: DispatcherConfig) {
    const start = new Date(now.getTime() - config.reconciliationGraceMs);
    const [rows] = await this.pool.query<AlarmRow[]>(
      `SELECT ${ALARM_COLUMNS} FROM alarms WHERE isEnabled = 1`,
    );
    return findDueOccurrences(rows.map(asAlarm), start, now, config.defaultTimezone);
  }

  /**
   * Persist due occurrences and fan them out to each of the user's devices.
   * Both inserts are INSERT IGNORE against a unique key, so re-running a tick —
   * or running two workers — adds nothing the first pass already recorded.
   */
  async materializeDueOccurrences(now: Date, config: DispatcherConfig): Promise<number> {
    const occurrences = await this.previewDueOccurrences(now, config);
    let inserted = 0;

    for (const occurrence of occurrences) {
      const [result] = await this.pool.execute<ResultSetHeader>(
        `INSERT IGNORE INTO alarm_delivery_attempts
          (alarmId, userId, scheduledForUtc, scheduledLocalKey, status, attemptCount)
         VALUES (?, ?, ?, ?, 'pending', 0)`,
        [
          occurrence.alarm.id,
          occurrence.alarm.userId,
          toUtcSql(occurrence.scheduledForUtc),
          occurrence.scheduledLocalKey,
        ],
      );
      inserted += result.affectedRows;
    }

    // Snapshot the user's currently active subscriptions against every still-open
    // occurrence. A device that subscribed after the occurrence was recorded but
    // before it was delivered still gets the alarm.
    await this.pool.execute(
      `INSERT IGNORE INTO alarm_delivery_targets
         (deliveryAttemptId, pushSubscriptionId, status, attemptCount)
       SELECT a.id, s.id, 'pending', 0
       FROM alarm_delivery_attempts a
       JOIN push_subscriptions s ON s.userId = a.userId
       WHERE a.status = 'pending'`,
    );
    return inserted;
  }

  /**
   * Atomically take ownership of deliverable targets.
   *
   * The select is only a shortlist; ownership comes from the conditional UPDATE,
   * which re-checks status and lease. If it affects zero rows another instance
   * won the race, and this one simply skips that target.
   */
  async claimTargets(
    instanceId: string,
    now: Date,
    config: DispatcherConfig,
  ): Promise<ClaimedTarget[]> {
    const nowSql = toUtcSql(now);
    const [candidates] = await this.pool.query<CandidateRow[]>(
      `SELECT t.id AS targetId, t.deliveryAttemptId AS attemptId, t.attemptCount,
              a.alarmId, a.userId, ${utcColumn("a.scheduledForUtc")},
              s.id AS subId, s.endpoint, s.p256dh, s.auth,
              al.id, al.label, al.hour, al.minute, al.days, al.timezone, al.isEnabled,
              al.kind, al.soundType, al.frequencyHz, al.frequencyName, al.studioMixName,
              al.ambientId, al.ambientLabel, al.meditationId, al.meditationLabel,
              al.wakeSequence, al.fadeInMinutes
       FROM alarm_delivery_targets t
       JOIN alarm_delivery_attempts a ON a.id = t.deliveryAttemptId
       JOIN alarms al ON al.id = a.alarmId
       JOIN push_subscriptions s ON s.id = t.pushSubscriptionId
       WHERE t.status IN ('pending', 'retryable_failed')
         AND (t.nextAttemptAt IS NULL OR t.nextAttemptAt <= ?)
       ORDER BY a.scheduledForUtc ASC, t.id ASC
       LIMIT ?`,
      [nowSql, config.batchSize],
    );

    const claimed: ClaimedTarget[] = [];
    const leaseSql = toUtcSql(new Date(now.getTime() + config.targetLeaseMs));

    for (const candidate of candidates) {
      const [result] = await this.pool.execute<ResultSetHeader>(
        `UPDATE alarm_delivery_targets
         SET status = 'claimed', claimedBy = ?, leaseExpiresAt = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?
           AND status IN ('pending', 'retryable_failed')
           AND (nextAttemptAt IS NULL OR nextAttemptAt <= ?)`,
        [instanceId, leaseSql, candidate.targetId, nowSql],
      );
      if (result.affectedRows !== 1) continue;

      claimed.push({
        targetId: candidate.targetId,
        attemptId: candidate.attemptId,
        alarmId: candidate.alarmId,
        userId: candidate.userId,
        scheduledForUtc: fromUtcSql(candidate.scheduledForUtc) as Date,
        attemptCount: candidate.attemptCount,
        subscription: asSubscription(candidate),
        alarm: asAlarm({ ...candidate, id: candidate.alarmId }),
      });
    }
    return claimed;
  }

  /**
   * Drop a subscription the push service has rejected as gone. The delivery
   * target keeps its history because the FK is ON DELETE SET NULL.
   */
  async disableSubscription(subscriptionId: number): Promise<void> {
    await this.pool.execute(`DELETE FROM push_subscriptions WHERE id = ?`, [subscriptionId]);
  }

  /**
   * Final pre-send check. An alarm disabled or deleted, or a subscription
   * removed, between claim and send must not produce a notification.
   */
  async targetIsStillEligible(target: ClaimedTarget): Promise<boolean> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT 1
       FROM alarms a
       JOIN push_subscriptions s ON s.id = ? AND s.userId = a.userId
       WHERE a.id = ? AND a.isEnabled = 1
       LIMIT 1`,
      [target.subscription.id, target.alarmId],
    );
    return rows.length === 1;
  }

  async markSending(targetId: number, _now: Date): Promise<void> {
    await this.pool.execute(
      `UPDATE alarm_delivery_targets SET status = 'sending', updatedAt = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'claimed'`,
      [targetId],
    );
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
    await this.pool.execute(
      `UPDATE alarm_delivery_targets
       SET status = ?, attemptCount = ?, nextAttemptAt = ?, providerStatus = ?, providerMessageId = ?,
           lastErrorCode = ?, lastErrorMessage = ?,
           sentAt = CASE WHEN ? = 'sent' THEN ? ELSE sentAt END,
           claimedBy = NULL, leaseExpiresAt = NULL, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        input.status,
        input.attemptCount,
        toUtcSqlOrNull(input.nextAttemptAt),
        input.providerStatus ?? null,
        input.providerMessageId ?? null,
        input.errorCode ?? null,
        input.errorMessage ?? null,
        input.status,
        toUtcSql(input.now),
        input.targetId,
      ],
    );
    await this.refreshParentAttempt(input.targetId, input.now);
  }

  /**
   * Roll the child targets' states up to the occurrence: still open while any
   * target is open, sent if any device got it, otherwise failed or cancelled.
   */
  private async refreshParentAttempt(targetId: number, now: Date): Promise<void> {
    await this.pool.execute(
      `UPDATE alarm_delivery_attempts a
       JOIN (
         SELECT t.deliveryAttemptId,
           SUM(t.status IN ('pending','claimed','sending','retryable_failed')) AS openTargets,
           SUM(t.status = 'sent') AS sentTargets,
           SUM(t.status = 'terminal_failed') AS failedTargets,
           SUM(t.status = 'cancelled') AS cancelledTargets
         FROM alarm_delivery_targets t
         WHERE t.deliveryAttemptId = (SELECT deliveryAttemptId FROM alarm_delivery_targets WHERE id = ?)
         GROUP BY t.deliveryAttemptId
       ) x ON x.deliveryAttemptId = a.id
       SET a.status = CASE
          WHEN x.openTargets > 0 THEN 'pending'
          WHEN x.sentTargets > 0 THEN 'sent'
          WHEN x.failedTargets > 0 THEN 'terminal_failed'
          ELSE 'cancelled'
       END,
       a.completedAt = CASE WHEN x.openTargets = 0 THEN ? ELSE NULL END,
       a.updatedAt = CURRENT_TIMESTAMP`,
      [targetId, toUtcSql(now)],
    );
  }

  async recordHeartbeat(input: {
    instanceId: string;
    releaseSha: string | null;
    now: Date;
    summary: Record<string, unknown>;
    errorSummary?: string | null;
  }): Promise<void> {
    const nowSql = toUtcSql(input.now);
    await this.pool.execute(
      `INSERT INTO dispatcher_heartbeats
        (serviceName, instanceId, releaseSha, lastStartedAt, lastSuccessAt, lastErrorAt, lastErrorSummary, summaryJson)
       VALUES ('alarm-dispatcher', ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         instanceId = VALUES(instanceId),
         releaseSha = VALUES(releaseSha),
         -- Keep the last *successful* cycle time when this heartbeat is an error,
         -- so monitoring can tell "failing now" from "never worked".
         lastSuccessAt = COALESCE(VALUES(lastSuccessAt), lastSuccessAt),
         lastErrorAt = COALESCE(VALUES(lastErrorAt), lastErrorAt),
         lastErrorSummary = VALUES(lastErrorSummary),
         summaryJson = VALUES(summaryJson),
         updatedAt = CURRENT_TIMESTAMP`,
      [
        input.instanceId,
        input.releaseSha,
        nowSql,
        input.errorSummary ? null : nowSql,
        input.errorSummary ? nowSql : null,
        input.errorSummary ?? null,
        JSON.stringify(input.summary),
      ],
    );
  }
}
