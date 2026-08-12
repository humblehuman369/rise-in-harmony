import { buildAlarmPayload } from "./payload";
import { classifyPushFailure } from "./retry-policy";
import type { AlarmDispatchRepository } from "./repository";
import type {
  ClaimedTarget,
  DispatchCycleSummary,
  DispatcherConfig,
  LoggerLike,
  PushGateway,
} from "./types";

async function mapWithConcurrency<T>(
  values: T[],
  limit: number,
  work: (value: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      await work(values[index]);
    }
  });
  await Promise.all(workers);
}

export interface DispatchCycleInput {
  now: () => Date;
  repo: AlarmDispatchRepository;
  push: PushGateway;
  config: DispatcherConfig;
  log: LoggerLike;
  releaseSha?: string;
}

/**
 * One bounded pass: reclaim, materialize, claim, deliver, record.
 *
 * Safe to run twice concurrently and safe to interrupt at any point. A tick is
 * never the source of truth — the ledger is — so a missed tick is reconciled by
 * the next one within the configured grace window.
 *
 * Shared by the worker loop and the authenticated break-glass HTTP route, so
 * there is exactly one delivery path in the system.
 */
export async function runDispatchCycle(input: DispatchCycleInput): Promise<DispatchCycleSummary> {
  const startedAt = input.now();
  const summary: DispatchCycleSummary = {
    skippedBecauseLeaderBusy: false,
    materializedAttempts: 0,
    claimedTargets: 0,
    sentTargets: 0,
    retriedTargets: 0,
    terminalFailures: 0,
    cancelledTargets: 0,
    recoveredTargets: 0,
    durationMs: 0,
  };

  const ownsLeaderLease = await input.repo.acquireLeaderLease(
    input.config.instanceId,
    startedAt,
    input.config.leaderLeaseMs,
  );
  if (!ownsLeaderLease) {
    summary.skippedBecauseLeaderBusy = true;
    summary.durationMs = input.now().getTime() - startedAt.getTime();
    input.log.info("[alarm-dispatcher] skipped cycle; another instance owns leader lease", {
      instanceId: input.config.instanceId,
    });
    return summary;
  }

  try {
    if (input.config.shadowMode) {
      // Shadow mode makes no ledger writes at all. That is deliberate: turning
      // shadow off must not replay a backlog of occurrences recorded while we
      // were only observing.
      const shadow = await input.repo.previewDueOccurrences(startedAt, input.config);
      input.log.info("[alarm-dispatcher] shadow due-occurrence preview", {
        count: shadow.length,
        occurrences: shadow.map((item) => ({
          alarmId: item.alarm.id,
          userId: item.alarm.userId,
          timezone: item.alarm.timezone ?? `${input.config.defaultTimezone} (default)`,
          scheduledForUtc: item.scheduledForUtc.toISOString(),
          scheduledLocalKey: item.scheduledLocalKey,
        })),
      });
      summary.durationMs = input.now().getTime() - startedAt.getTime();
      await input.repo.recordHeartbeat({
        instanceId: input.config.instanceId,
        releaseSha: input.releaseSha ?? null,
        now: input.now(),
        summary: { ...summary, shadowCandidates: shadow.length, shadowMode: true },
      });
      return summary;
    }

    summary.recoveredTargets = await input.repo.recoverExpiredTargetClaims(startedAt);
    summary.materializedAttempts = await input.repo.materializeDueOccurrences(
      startedAt,
      input.config,
    );
    const targets = await input.repo.claimTargets(input.config.instanceId, startedAt, input.config);
    summary.claimedTargets = targets.length;

    await mapWithConcurrency(targets, input.config.concurrency, async (target) => {
      await deliverOneTarget(target, input, summary);
    });

    summary.durationMs = input.now().getTime() - startedAt.getTime();
    await input.repo.recordHeartbeat({
      instanceId: input.config.instanceId,
      releaseSha: input.releaseSha ?? null,
      now: input.now(),
      summary: { ...summary, shadowMode: false },
    });
    input.log.info("[alarm-dispatcher] completed cycle", { ...summary });
    return summary;
  } catch (error) {
    summary.durationMs = input.now().getTime() - startedAt.getTime();
    const errorSummary = error instanceof Error ? error.message : String(error);
    await input.repo
      .recordHeartbeat({
        instanceId: input.config.instanceId,
        releaseSha: input.releaseSha ?? null,
        now: input.now(),
        summary: { ...summary },
        errorSummary,
      })
      .catch(() => undefined);
    input.log.error("[alarm-dispatcher] cycle failed", { error: errorSummary, ...summary });
    throw error;
  }
}

async function deliverOneTarget(
  target: ClaimedTarget,
  input: DispatchCycleInput,
  summary: DispatchCycleSummary,
): Promise<void> {
  const now = input.now();

  // Re-check after the claim: the alarm may have been disabled or deleted, or
  // the subscription removed, while this target sat in the batch.
  const eligible = await input.repo.targetIsStillEligible(target);
  if (!eligible) {
    await input.repo.completeTarget({
      targetId: target.targetId,
      status: "cancelled",
      attemptCount: target.attemptCount,
      now,
      errorCode: "alarm_or_subscription_no_longer_eligible",
      errorMessage:
        "Alarm was disabled/deleted or the push subscription was removed before delivery.",
    });
    summary.cancelledTargets += 1;
    return;
  }

  await input.repo.markSending(target.targetId, now);
  const result = await input.push.send({
    endpoint: target.subscription.endpoint,
    p256dh: target.subscription.p256dh,
    auth: target.subscription.auth,
    payload: buildAlarmPayload(target.alarm),
  });
  const attemptCount = target.attemptCount + 1;

  if (result.ok) {
    await input.repo.completeTarget({
      targetId: target.targetId,
      status: "sent",
      attemptCount,
      now: input.now(),
      providerStatus: result.statusCode ?? null,
      providerMessageId: result.messageId ?? null,
    });
    summary.sentTargets += 1;
    return;
  }

  const decision = classifyPushFailure(result, attemptCount, input.config.maxAttempts, input.now());
  if (decision.disableSubscription) {
    await input.repo.disableSubscription(target.subscription.id);
  }
  await input.repo.completeTarget({
    targetId: target.targetId,
    status: decision.status,
    attemptCount,
    now: input.now(),
    nextAttemptAt: decision.nextAttemptAt,
    providerStatus: result.statusCode ?? null,
    errorCode: decision.errorCode,
    errorMessage: decision.errorMessage,
  });

  if (decision.status === "retryable_failed") summary.retriedTargets += 1;
  else summary.terminalFailures += 1;
}
