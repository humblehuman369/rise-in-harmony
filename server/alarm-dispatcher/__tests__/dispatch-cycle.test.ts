import { describe, expect, it, vi } from "vitest";
import { runDispatchCycle } from "../dispatch-cycle";
import type { PushGateway, PushProviderResult } from "../types";
import {
  FakeRepository,
  FakeStore,
  makeAlarm,
  makeConfig,
  makeSubscription,
  silentLog,
} from "./fake-repository";

/** 07:30 America/New_York on Monday 2026-07-06. */
const DUE_AT = new Date("2026-07-06T11:30:00Z");

function seededStore() {
  const store = new FakeStore();
  store.alarms.push(makeAlarm({ id: 9, userId: 8, hour: 7, minute: 30 }));
  store.subscriptions.push(makeSubscription({ id: 7, userId: 8 }));
  return store;
}

function okGateway(): PushGateway & { send: ReturnType<typeof vi.fn> } {
  return { send: vi.fn().mockResolvedValue({ ok: true, statusCode: 201 }) };
}

function failingGateway(result: PushProviderResult) {
  return { send: vi.fn().mockResolvedValue(result) };
}

function cycle(store: FakeStore, push: PushGateway, overrides = {}, now: Date = DUE_AT) {
  const config = makeConfig(overrides);
  return runDispatchCycle({
    now: () => now,
    repo: new FakeRepository(store) as never,
    push,
    config,
    log: silentLog,
  });
}

describe("leader lease", () => {
  it("lets only one of two concurrent instances do the work", async () => {
    const store = seededStore();
    const push = okGateway();

    const [first, second] = await Promise.all([
      cycle(store, push, { instanceId: "worker-a" }),
      cycle(store, push, { instanceId: "worker-b" }),
    ]);

    const skipped = [first, second].filter((s) => s.skippedBecauseLeaderBusy);
    const ran = [first, second].filter((s) => !s.skippedBecauseLeaderBusy);

    expect(skipped).toHaveLength(1);
    expect(ran).toHaveLength(1);
    // One alarm, one device, one send — not two.
    expect(push.send).toHaveBeenCalledTimes(1);
    expect(store.sentTargets()).toHaveLength(1);
  });

  it("does not send at all when another instance holds the lease", async () => {
    const store = seededStore();
    store.lease = {
      holderId: "worker-a",
      leaseExpiresAt: new Date(DUE_AT.getTime() + 60_000),
    };
    const push = okGateway();

    const summary = await cycle(store, push, { instanceId: "worker-b" });

    expect(summary.skippedBecauseLeaderBusy).toBe(true);
    expect(push.send).not.toHaveBeenCalled();
  });

  it("takes over once the previous holder's lease has expired", async () => {
    const store = seededStore();
    store.lease = {
      holderId: "worker-a",
      leaseExpiresAt: new Date(DUE_AT.getTime() - 1_000), // already expired
    };
    const push = okGateway();

    const summary = await cycle(store, push, { instanceId: "worker-b" });

    expect(summary.skippedBecauseLeaderBusy).toBe(false);
    expect(store.lease?.holderId).toBe("worker-b");
  });
});

describe("idempotent occurrences", () => {
  it("records one occurrence and one send across repeated ticks", async () => {
    const store = seededStore();
    const push = okGateway();

    // Same instance, three ticks inside the same reconciliation window.
    await cycle(store, push, { instanceId: "worker-a" });
    await cycle(store, push, { instanceId: "worker-a" }, new Date(DUE_AT.getTime() + 30_000));
    await cycle(store, push, { instanceId: "worker-a" }, new Date(DUE_AT.getTime() + 60_000));

    expect(store.attempts).toHaveLength(1);
    expect(push.send).toHaveBeenCalledTimes(1);
    expect(store.sentTargets()).toHaveLength(1);
  });

  it("reconciles a missed tick without re-sending an already-delivered alarm", async () => {
    const store = seededStore();
    const push = okGateway();

    await cycle(store, push, { instanceId: "worker-a" });
    expect(push.send).toHaveBeenCalledTimes(1);

    // The worker was down for 9 minutes; the next tick rescans the whole gap.
    await cycle(
      store,
      push,
      { instanceId: "worker-a", reconciliationGraceMs: 600_000 },
      new Date(DUE_AT.getTime() + 9 * 60_000),
    );

    expect(store.attempts).toHaveLength(1);
    expect(push.send).toHaveBeenCalledTimes(1);
  });

  it("delivers a late occurrence that no tick had yet recorded", async () => {
    const store = seededStore();
    const push = okGateway();

    // First run happens 9 minutes after the alarm was due — nothing ran at the time.
    await cycle(
      store,
      push,
      { instanceId: "worker-a", reconciliationGraceMs: 600_000 },
      new Date(DUE_AT.getTime() + 9 * 60_000),
    );

    expect(store.attempts).toHaveLength(1);
    expect(store.attempts[0].scheduledForUtc.toISOString()).toBe("2026-07-06T11:30:00.000Z");
    expect(push.send).toHaveBeenCalledTimes(1);
  });

  it("fans one occurrence out to every device, exactly once each", async () => {
    const store = seededStore();
    store.subscriptions.push(
      makeSubscription({ id: 8, userId: 8, endpoint: "https://push.example.test/second" }),
    );
    const push = okGateway();

    await cycle(store, push, { instanceId: "worker-a" });
    await cycle(store, push, { instanceId: "worker-a" }, new Date(DUE_AT.getTime() + 30_000));

    expect(store.attempts).toHaveLength(1);
    expect(store.targets).toHaveLength(2);
    expect(push.send).toHaveBeenCalledTimes(2);
  });
});

describe("worker restart mid-send", () => {
  it("reclaims an expired lease and does not double-send", async () => {
    const store = seededStore();

    // Worker A claims and dies before recording a result: the target is stuck
    // in 'sending' with a lease that will expire.
    const stalledPush: PushGateway = {
      send: vi.fn().mockImplementation(() => new Promise(() => {})), // never settles
    };
    void cycle(store, stalledPush, { instanceId: "worker-a" });
    await vi.waitFor(() => expect(store.targets.some((t) => t.status === "sending")).toBe(true));

    const stalled = store.targets.find((t) => t.status === "sending");
    expect(stalled?.claimedBy).toBe("worker-a");

    // Worker B starts after the lease (90s) has expired.
    const laterNow = new Date(DUE_AT.getTime() + 120_000);
    const push = okGateway();
    const summary = await cycle(store, push, { instanceId: "worker-b" }, laterNow);

    expect(summary.recoveredTargets).toBe(1);
    // Recovered and delivered once — not a second occurrence, not a second row.
    expect(store.attempts).toHaveLength(1);
    expect(store.targets).toHaveLength(1);
    expect(push.send).toHaveBeenCalledTimes(1);
    expect(store.sentTargets()).toHaveLength(1);
  });

  it("does not reclaim a target whose lease is still valid", async () => {
    const store = seededStore();
    const stalledPush: PushGateway = { send: vi.fn().mockImplementation(() => new Promise(() => {})) };
    void cycle(store, stalledPush, { instanceId: "worker-a" });
    await vi.waitFor(() => expect(store.targets.some((t) => t.status === "sending")).toBe(true));

    // Only 30s later: worker A's 90s lease is still live.
    const push = okGateway();
    const summary = await cycle(
      store,
      push,
      { instanceId: "worker-b" },
      new Date(DUE_AT.getTime() + 30_000),
    );

    expect(summary.recoveredTargets).toBe(0);
    expect(push.send).not.toHaveBeenCalled();
  });
});

describe("provider failures", () => {
  it("schedules a bounded retry for a transient failure", async () => {
    const store = seededStore();
    const push = failingGateway({
      ok: false,
      statusCode: 503,
      code: "push_transient_failure",
      message: "Service Unavailable",
      retryable: true,
      invalidSubscription: false,
    });

    const summary = await cycle(store, push, { instanceId: "worker-a" });

    expect(summary.retriedTargets).toBe(1);
    expect(summary.terminalFailures).toBe(0);
    const target = store.targets[0];
    expect(target.status).toBe("retryable_failed");
    expect(target.attemptCount).toBe(1);
    expect(target.nextAttemptAt).toBeInstanceOf(Date);
    // The subscription survives a transient error.
    expect(store.subscriptions).toHaveLength(1);
  });

  it("stops retrying and drops the subscription on a 410 Gone", async () => {
    const store = seededStore();
    const push = failingGateway({
      ok: false,
      statusCode: 410,
      code: "invalid_subscription",
      message: "Gone",
      retryable: false,
      invalidSubscription: true,
    });

    const summary = await cycle(store, push, { instanceId: "worker-a" });

    expect(summary.terminalFailures).toBe(1);
    expect(summary.retriedTargets).toBe(0);
    expect(store.targets[0].status).toBe("terminal_failed");
    expect(store.targets[0].nextAttemptAt).toBeNull();
    // Dead subscription removed, but its delivery history is retained.
    expect(store.subscriptions).toHaveLength(0);
    expect(store.targets).toHaveLength(1);
    expect(store.targets[0].pushSubscriptionId).toBeNull();
  });

  it("gives up after maxAttempts of transient failures", async () => {
    const store = seededStore();
    const push = failingGateway({
      ok: false,
      statusCode: 500,
      code: "push_transient_failure",
      message: "Internal Error",
      retryable: true,
      invalidSubscription: false,
    });
    const config = { instanceId: "worker-a", maxAttempts: 2 };

    await cycle(store, push, config);
    expect(store.targets[0].status).toBe("retryable_failed");

    // Second attempt reaches maxAttempts and becomes terminal.
    store.targets[0].nextAttemptAt = null; // backoff elapsed
    await cycle(store, push, config, new Date(DUE_AT.getTime() + 120_000));

    expect(store.targets[0].status).toBe("terminal_failed");
    expect(store.targets[0].attemptCount).toBe(2);
  });
});

describe("eligibility revalidation", () => {
  it("cancels instead of sending when the alarm was disabled after the claim", async () => {
    const store = seededStore();
    const push: PushGateway = {
      send: vi.fn().mockResolvedValue({ ok: true, statusCode: 201 }),
    };

    // Disable between materialize and deliver.
    const repo = new FakeRepository(store);
    const originalEligible = repo.targetIsStillEligible.bind(repo);
    vi.spyOn(repo, "targetIsStillEligible").mockImplementation(async (target) => {
      store.alarms[0].isEnabled = false;
      return originalEligible(target);
    });

    const summary = await runDispatchCycle({
      now: () => DUE_AT,
      repo: repo as never,
      push,
      config: makeConfig({ instanceId: "worker-a" }),
      log: silentLog,
    });

    expect(summary.cancelledTargets).toBe(1);
    expect(push.send).not.toHaveBeenCalled();
    expect(store.targets[0].status).toBe("cancelled");
  });
});

describe("shadow mode", () => {
  it("reports candidates but writes no ledger rows and sends nothing", async () => {
    const store = seededStore();
    const push = okGateway();

    const summary = await cycle(store, push, { instanceId: "worker-a", shadowMode: true });

    expect(push.send).not.toHaveBeenCalled();
    expect(store.attempts).toHaveLength(0);
    expect(store.targets).toHaveLength(0);
    expect(summary.materializedAttempts).toBe(0);

    // The heartbeat still records what it *would* have delivered.
    const heartbeat = store.heartbeats.at(-1);
    expect(heartbeat?.summary.shadowMode).toBe(true);
    expect(heartbeat?.summary.shadowCandidates).toBe(1);
  });

  it("leaves nothing to replay when shadow mode is turned off", async () => {
    const store = seededStore();
    const push = okGateway();

    await cycle(store, push, { instanceId: "worker-a", shadowMode: true });
    // Flip to active on a later tick, outside the alarm's window.
    await cycle(
      store,
      push,
      { instanceId: "worker-a", shadowMode: false, reconciliationGraceMs: 60_000 },
      new Date(DUE_AT.getTime() + 30 * 60_000),
    );

    // No backlog of shadow-era occurrences was replayed.
    expect(store.attempts).toHaveLength(0);
    expect(push.send).not.toHaveBeenCalled();
  });
});

describe("heartbeat", () => {
  it("records a failure summary and rethrows when a cycle breaks", async () => {
    const store = seededStore();
    const repo = new FakeRepository(store);
    vi.spyOn(repo, "materializeDueOccurrences").mockRejectedValue(new Error("db exploded"));

    await expect(
      runDispatchCycle({
        now: () => DUE_AT,
        repo: repo as never,
        push: okGateway(),
        config: makeConfig({ instanceId: "worker-a" }),
        log: silentLog,
        releaseSha: "abc123",
      }),
    ).rejects.toThrow("db exploded");

    const heartbeat = store.heartbeats.at(-1);
    expect(heartbeat?.errorSummary).toBe("db exploded");
    expect(heartbeat?.releaseSha).toBe("abc123");
  });
});
