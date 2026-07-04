/**
 * Rise In Harmony — Server-side unit tests
 * Tests for sessions, alarms, and subscription routers
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock the DB module so tests don't need a real database ──────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@example.com",
    subscriptionTier: "free",
    subscriptionStatus: "none",
    onboardingGoal: null,
    onboardingDone: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    role: "user",
    loginMethod: "manus",
  }),
  createSession: vi.fn().mockResolvedValue(1),
  endSession: vi.fn().mockResolvedValue(undefined),
  getUserSessions: vi.fn().mockResolvedValue([]),
  getUserStats: vi.fn().mockResolvedValue({
    totalSessions: 0,
    totalMinutes: 0,
    avgMoodRating: null,
    currentStreak: 0,
    topFrequencies: [],
    recentSessions: [],
  }),
  createAlarm: vi.fn().mockResolvedValue({ id: 1 }),
  getAlarmsByUser: vi.fn().mockResolvedValue([]),
  updateAlarm: vi.fn().mockResolvedValue(undefined),
  deleteAlarm: vi.fn().mockResolvedValue(undefined),
  getPresetsByUser: vi.fn().mockResolvedValue([]),
  createPreset: vi.fn().mockResolvedValue({ id: 1 }),
  deletePreset: vi.fn().mockResolvedValue(undefined),
  updateUserOnboarding: vi.fn().mockResolvedValue(undefined),
  updateUserSubscription: vi.fn().mockResolvedValue(undefined),
  logSubscriptionEvent: vi.fn().mockResolvedValue(undefined),
  getAdminUserCounts: vi.fn().mockResolvedValue({ total: 10, active: 3, cancelled: 2, free: 7 }),
  listUsersForAdmin: vi.fn().mockResolvedValue({ users: [], total: 0 }),
}));

vi.mock("./email", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendReceiptEmail: vi.fn().mockResolvedValue(undefined),
  sendTrialEndingEmail: vi.fn().mockResolvedValue(undefined),
  sendStreakMilestoneEmail: vi.fn().mockResolvedValue(undefined),
  sendReEngagementEmail: vi.fn().mockResolvedValue(undefined),
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────
function makeAuthCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────
describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result?.id).toBe(1);
    expect(result?.email).toBe("test@example.com");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and returns success", async () => {
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

// ─── Sessions tests ───────────────────────────────────────────────────────────
describe("sessions.start", () => {
  it("starts a valid session and returns a sessionId", async () => {
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sessions.start({
      frequencyHz: 528,
      frequencyName: "Love Frequency",
      sessionType: "studio_mix",
    });
    expect(result).toHaveProperty("sessionId");
  });
});

describe("sessions.end", () => {
  it("ends a session with mood rating", async () => {
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sessions.end({
      sessionId: 1,
      durationSeconds: 300,
      moodRating: 4,
      note: "Felt great",
    });
    expect(result).toHaveProperty("success");
  });
});

describe("sessions.stats", () => {
  it("returns stats for authenticated user", async () => {
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.sessions.stats();
    expect(stats).toHaveProperty("totalSessions");
    expect(stats).toHaveProperty("totalMinutes");
    expect(stats).toHaveProperty("currentStreak");
  });
});

// ─── Alarms tests ─────────────────────────────────────────────────────────────
describe("alarms.create", () => {
  it("creates a valid alarm and returns an id", async () => {
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.alarms.create({
      label: "Morning Rise",
      hour: 7,
      minute: 0,
      days: [1, 2, 3, 4, 5],
      soundType: "frequency",
      frequencyHz: 432,
      frequencyName: "Cosmic Tone",
      fadeInMinutes: 5,
    });
    expect(result).toHaveProperty("id");
  });

  it("rejects invalid hour values", async () => {
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.alarms.create({
        label: "Bad Alarm",
        hour: 25,
        minute: 0,
        days: [1],
        soundType: "frequency",
        fadeInMinutes: 5,
      })
    ).rejects.toThrow();
  });
});

// ─── Subscription tests ───────────────────────────────────────────────────────
describe("subscription.status", () => {
  it("returns subscription status for authenticated user", async () => {
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const status = await caller.subscription.status();
    expect(status).toHaveProperty("tier");
    expect(status).toHaveProperty("isPremium");
    expect(status.isPremium).toBe(false);
  });
});

// ─── Admin tests ──────────────────────────────────────────────────────────────
describe("admin router", () => {
  it("rejects non-admin users", async () => {
    const ctx = makeAuthCtx(); // role: "user"
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.userStats()).rejects.toThrow();
    await expect(
      caller.admin.grantMembership({ userId: 2 })
    ).rejects.toThrow();
  });

  it("returns user stats for admins", async () => {
    const ctx = makeAuthCtx({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.admin.userStats();
    expect(stats).toEqual({ total: 10, active: 3, cancelled: 2, free: 7 });
  });

  it("grants lifetime membership when no days given", async () => {
    const { updateUserSubscription, logSubscriptionEvent } = await import("./db");
    const ctx = makeAuthCtx({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.grantMembership({ userId: 1 });
    expect(result.tier).toBe("lifetime");
    expect(result.expiresAt).toBeNull();
    expect(updateUserSubscription).toHaveBeenCalledWith(1, "lifetime", null);
    expect(logSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "ADMIN_GRANT" })
    );
  });

  it("grants time-limited premium when days given", async () => {
    const { updateUserSubscription } = await import("./db");
    const ctx = makeAuthCtx({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.grantMembership({ userId: 1, days: 30 });
    expect(result.tier).toBe("premium");
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(updateUserSubscription).toHaveBeenCalledWith(
      1,
      "premium",
      expect.any(Date)
    );
  });

  it("revokes membership back to free", async () => {
    const { updateUserSubscription, logSubscriptionEvent } = await import("./db");
    const ctx = makeAuthCtx({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.revokeMembership({ userId: 1 });
    expect(result.success).toBe(true);
    expect(updateUserSubscription).toHaveBeenCalledWith(1, "free", null);
    expect(logSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "ADMIN_REVOKE" })
    );
  });
});

describe("subscription.completeOnboarding", () => {
  it("saves onboarding goal and triggers welcome email", async () => {
    const { sendWelcomeEmail } = await import("./email");
    const ctx = makeAuthCtx({ email: "test@example.com" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscription.completeOnboarding({ goal: "sleep" });
    expect(result.success).toBe(true);
    // Email is fired async; give it a tick
    await new Promise(r => setTimeout(r, 10));
    expect(sendWelcomeEmail).toHaveBeenCalledWith(
      "test@example.com",
      "Test User",
      "sleep"
    );
  });
});
