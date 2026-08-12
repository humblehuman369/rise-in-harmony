import type { PushProviderResult } from "./types";

export interface RetryDecision {
  status: "retryable_failed" | "terminal_failed";
  nextAttemptAt: Date | null;
  disableSubscription: boolean;
  errorCode: string;
  errorMessage: string;
}

/**
 * Decide what to do with a failed push.
 *
 * The distinction that matters: a *transient* failure (network, 5xx, 429) is
 * worth retrying with backoff, while a *terminal* one — most importantly 404 and
 * 410, meaning the browser dropped the subscription — must stop immediately and
 * take the dead subscription with it. Retrying a 410 forever is how a dispatcher
 * ends up hammering a push service for users who uninstalled months ago.
 */
export function classifyPushFailure(
  result: Extract<PushProviderResult, { ok: false }>,
  attemptCount: number,
  maxAttempts: number,
  now: Date,
): RetryDecision {
  const terminalStatusCodes = new Set([400, 401, 403, 404, 410]);
  const invalidSubscription =
    result.invalidSubscription || terminalStatusCodes.has(result.statusCode ?? 0);

  if (invalidSubscription) {
    return {
      status: "terminal_failed",
      nextAttemptAt: null,
      disableSubscription: true,
      errorCode: result.code || "invalid_subscription",
      errorMessage: result.message,
    };
  }

  if (!result.retryable || attemptCount >= maxAttempts) {
    return {
      status: "terminal_failed",
      nextAttemptAt: null,
      disableSubscription: false,
      errorCode: result.code || "push_terminal_failure",
      errorMessage: result.message,
    };
  }

  // 30s, 90s, 270s … capped at 15 minutes. Jitter keeps a provider outage from
  // producing a synchronized retry stampede when the whole batch failed at once.
  const baseDelayMs = Math.min(15 * 60_000, 30_000 * 3 ** Math.max(0, attemptCount - 1));
  const jitterMs = Math.floor(Math.random() * Math.min(15_000, baseDelayMs * 0.2));

  return {
    status: "retryable_failed",
    nextAttemptAt: new Date(now.getTime() + baseDelayMs + jitterMs),
    disableSubscription: false,
    errorCode: result.code || "push_retryable_failure",
    errorMessage: result.message,
  };
}
