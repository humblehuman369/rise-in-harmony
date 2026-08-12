import { describe, expect, it } from "vitest";
import { classifyPushFailure } from "../retry-policy";
import { loadDispatcherConfig } from "../config";
import type { PushProviderResult } from "../types";

const NOW = new Date("2026-07-06T11:30:00Z");

function failure(
  overrides: Partial<Extract<PushProviderResult, { ok: false }>> = {},
): Extract<PushProviderResult, { ok: false }> {
  return {
    ok: false,
    statusCode: 503,
    code: "push_transient_failure",
    message: "Service Unavailable",
    retryable: true,
    invalidSubscription: false,
    ...overrides,
  };
}

describe("classifyPushFailure — transient", () => {
  it("retries a 503 with a future nextAttemptAt", () => {
    const decision = classifyPushFailure(failure(), 1, 3, NOW);

    expect(decision.status).toBe("retryable_failed");
    expect(decision.disableSubscription).toBe(false);
    expect(decision.nextAttemptAt!.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it.each([408, 429, 500, 502, 503, 504])("retries status %i", (statusCode) => {
    const decision = classifyPushFailure(failure({ statusCode }), 1, 3, NOW);
    expect(decision.status).toBe("retryable_failed");
  });

  it("backs off further on each successive attempt", () => {
    const first = classifyPushFailure(failure(), 1, 5, NOW);
    const third = classifyPushFailure(failure(), 3, 5, NOW);

    const firstDelay = first.nextAttemptAt!.getTime() - NOW.getTime();
    const thirdDelay = third.nextAttemptAt!.getTime() - NOW.getTime();

    expect(firstDelay).toBeGreaterThanOrEqual(30_000);
    expect(thirdDelay).toBeGreaterThan(firstDelay);
  });

  it("caps the backoff at 15 minutes plus jitter", () => {
    const decision = classifyPushFailure(failure(), 9, 20, NOW);
    const delay = decision.nextAttemptAt!.getTime() - NOW.getTime();

    // 15 min cap + up to 15s jitter.
    expect(delay).toBeLessThanOrEqual(15 * 60_000 + 15_000);
  });

  it("becomes terminal once attempts reach maxAttempts", () => {
    const decision = classifyPushFailure(failure(), 3, 3, NOW);

    expect(decision.status).toBe("terminal_failed");
    expect(decision.nextAttemptAt).toBeNull();
    // A worn-out retry budget is not evidence the subscription is dead.
    expect(decision.disableSubscription).toBe(false);
  });
});

describe("classifyPushFailure — terminal", () => {
  it.each([400, 401, 403, 404, 410])(
    "treats status %i as terminal and drops the subscription",
    (statusCode) => {
      const decision = classifyPushFailure(
        failure({ statusCode, retryable: true }),
        1,
        3,
        NOW,
      );

      expect(decision.status).toBe("terminal_failed");
      expect(decision.disableSubscription).toBe(true);
      expect(decision.nextAttemptAt).toBeNull();
    },
  );

  it("honours an explicit invalidSubscription flag even without a status code", () => {
    const decision = classifyPushFailure(
      failure({ statusCode: undefined, invalidSubscription: true, retryable: false }),
      1,
      3,
      NOW,
    );

    expect(decision.status).toBe("terminal_failed");
    expect(decision.disableSubscription).toBe(true);
  });

  it("does not retry a failure the gateway marked non-retryable", () => {
    const decision = classifyPushFailure(
      failure({ statusCode: 413, retryable: false, code: "push_provider_failure" }),
      1,
      3,
      NOW,
    );

    expect(decision.status).toBe("terminal_failed");
    // Payload too large is our bug, not a dead device — keep the subscription.
    expect(decision.disableSubscription).toBe(false);
  });
});

describe("loadDispatcherConfig", () => {
  const validEnv = {
    RIH_VAPID_PUBLIC_KEY: "public-key-test-value",
    RIH_VAPID_PRIVATE_KEY: "private-key-test-value",
    RIH_VAPID_EMAIL: "mailto:hello@example.test",
  } as NodeJS.ProcessEnv;

  it("defaults to shadow mode so a misconfigured deploy cannot send", () => {
    expect(loadDispatcherConfig(validEnv).shadowMode).toBe(true);
  });

  it("defaults the fallback zone to America/New_York", () => {
    expect(loadDispatcherConfig(validEnv).defaultTimezone).toBe("America/New_York");
  });

  it("rejects a leader lease shorter than the dispatch interval", () => {
    // A lease that expires between ticks would let a second worker claim work
    // the first is still doing.
    expect(() =>
      loadDispatcherConfig({
        ...validEnv,
        ALARM_DISPATCH_INTERVAL_MS: "60000",
        ALARM_DISPATCH_LEADER_LEASE_MS: "30000",
      }),
    ).toThrow(/LEADER_LEASE_MS must exceed/);
  });

  it("rejects a target lease shorter than the leader lease", () => {
    expect(() =>
      loadDispatcherConfig({
        ...validEnv,
        ALARM_DISPATCH_INTERVAL_MS: "30000",
        ALARM_DISPATCH_LEADER_LEASE_MS: "90000",
        ALARM_DISPATCH_TARGET_LEASE_MS: "60000",
      }),
    ).toThrow(/TARGET_LEASE_MS must be at least/);
  });

  it("rejects an invalid ALARM_DEFAULT_TIMEZONE at startup, not mid-cycle", () => {
    expect(() =>
      loadDispatcherConfig({ ...validEnv, ALARM_DEFAULT_TIMEZONE: "Not/AZone" }),
    ).toThrow(/not a valid IANA time zone/);
  });

  it("requires VAPID credentials", () => {
    expect(() => loadDispatcherConfig({} as NodeJS.ProcessEnv)).toThrow(
      /Invalid alarm-dispatcher configuration/,
    );
  });

  it("requires a mailto: VAPID subject", () => {
    expect(() =>
      loadDispatcherConfig({ ...validEnv, RIH_VAPID_EMAIL: "hello@example.test" }),
    ).toThrow(/RIH_VAPID_EMAIL/);
  });
});
