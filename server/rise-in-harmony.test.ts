/**
 * Rise In Harmony — Server-side unit tests
 * Tests for sessions, alarms, and subscription routers
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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
  getUserAlarms: vi.fn().mockResolvedValue([]),
  setStripeCustomerId: vi.fn().mockResolvedValue(undefined),
  getUserByStripeCustomerId: vi.fn().mockResolvedValue(undefined),
  countLifetimeUsers: vi.fn().mockResolvedValue(0),
  updateAlarm: vi.fn().mockResolvedValue(undefined),
  deleteAlarm: vi.fn().mockResolvedValue(undefined),
  getPresetsByUser: vi.fn().mockResolvedValue([]),
  createPreset: vi.fn().mockResolvedValue({ id: 1 }),
  deletePreset: vi.fn().mockResolvedValue(undefined),
  getUserSounds: vi.fn().mockResolvedValue([]),
  getUserSoundById: vi.fn().mockResolvedValue(undefined),
  createUserSound: vi.fn().mockResolvedValue(1),
  renameUserSound: vi.fn().mockResolvedValue(true),
  deleteUserSound: vi.fn().mockResolvedValue(undefined),
  getUserUploadKeys: vi.fn().mockResolvedValue([]),
  updateUserOnboarding: vi.fn().mockResolvedValue(undefined),
  updateUserSubscription: vi.fn().mockResolvedValue(undefined),
  logSubscriptionEvent: vi.fn().mockResolvedValue(undefined),
  getAdminUserCounts: vi.fn().mockResolvedValue({ total: 10, active: 3, cancelled: 2, free: 7 }),
  listUsersForAdmin: vi.fn().mockResolvedValue({ users: [], total: 0 }),
}));

vi.mock("./revenuecat", () => ({
  isRevenueCatConfigured: vi.fn().mockReturnValue(true),
  grantPromotionalEntitlement: vi.fn().mockResolvedValue(true),
  revokePromotionalEntitlement: vi.fn().mockResolvedValue(true),
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

  it("blocks a second alarm for free-tier users", async () => {
    const { getUserAlarms } = await import("./db");
    vi.mocked(getUserAlarms).mockResolvedValueOnce([{ id: 1 } as never]);
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.alarms.create({
        label: "Second Alarm",
        hour: 8,
        minute: 0,
        days: [1],
        soundType: "frequency",
        fadeInMinutes: 5,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows unlimited alarms for premium users", async () => {
    const { getUserById, getUserAlarms } = await import("./db");
    vi.mocked(getUserById).mockResolvedValueOnce({
      id: 1,
      subscriptionTier: "premium",
    } as never);
    vi.mocked(getUserAlarms).mockResolvedValueOnce([{ id: 1 }, { id: 2 }] as never);
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.alarms.create({
      label: "Third Alarm",
      hour: 9,
      minute: 0,
      days: [1],
      soundType: "frequency",
      fadeInMinutes: 5,
    });
    expect(result).toHaveProperty("id");
  });
});

// ─── Billing tests ────────────────────────────────────────────────────────────
describe("billing", () => {
  it("reports billing disabled when Stripe is not configured", async () => {
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const config = await caller.billing.config();
    expect(config.enabled).toBe(false);
    expect(config.founderSeatCap).toBe(500);
  });

  it("rejects checkout when Stripe is not configured", async () => {
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.billing.createCheckoutSession({ tier: "annual" })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
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
    const { grantPromotionalEntitlement } = await import("./revenuecat");
    const ctx = makeAuthCtx({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.grantMembership({ userId: 1 });
    expect(result.tier).toBe("lifetime");
    expect(result.expiresAt).toBeNull();
    expect(result.revenueCatSynced).toBe(true);
    expect(updateUserSubscription).toHaveBeenCalledWith(1, "lifetime", null);
    // Lifetime grant → no end time passed to RevenueCat
    expect(grantPromotionalEntitlement).toHaveBeenCalledWith("1", undefined);
    expect(logSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "ADMIN_GRANT" })
    );
  });

  it("grants time-limited premium when days given", async () => {
    const { updateUserSubscription } = await import("./db");
    const { grantPromotionalEntitlement } = await import("./revenuecat");
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
    // Timed grant → exact end time forwarded to RevenueCat
    expect(grantPromotionalEntitlement).toHaveBeenCalledWith(
      "1",
      expect.any(Number)
    );
  });

  it("revokes membership back to free", async () => {
    const { updateUserSubscription, logSubscriptionEvent } = await import("./db");
    const { revokePromotionalEntitlement } = await import("./revenuecat");
    const ctx = makeAuthCtx({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.revokeMembership({ userId: 1 });
    expect(result.success).toBe(true);
    expect(updateUserSubscription).toHaveBeenCalledWith(1, "free", null);
    expect(revokePromotionalEntitlement).toHaveBeenCalledWith("1");
    expect(logSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "ADMIN_REVOKE" })
    );
  });
});

describe("revenuecatWebhook promotional grants", () => {
  let savedSecret: string | undefined;
  beforeEach(() => {
    savedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    delete process.env.REVENUECAT_WEBHOOK_SECRET;
  });
  afterEach(() => {
    if (savedSecret !== undefined) process.env.REVENUECAT_WEBHOOK_SECRET = savedSecret;
    else delete process.env.REVENUECAT_WEBHOOK_SECRET;
  });

  it("maps a PROMOTIONAL NON_RENEWING_PURCHASE to premium", async () => {
    const { updateUserSubscription } = await import("./db");
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const expiration = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const result = await caller.subscription.revenuecatWebhook({
      event: {
        type: "NON_RENEWING_PURCHASE",
        app_user_id: "1",
        product_id: "rc_promo_premium_monthly",
        expiration_at_ms: expiration,
        store: "PROMOTIONAL",
        period_type: "PROMOTIONAL",
      },
    });
    expect(result.received).toBe(true);
    expect(updateUserSubscription).toHaveBeenCalledWith(
      1,
      "premium",
      new Date(expiration),
      "1"
    );
  });

  it("maps a lifetime promotional grant to lifetime", async () => {
    const { updateUserSubscription } = await import("./db");
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.subscription.revenuecatWebhook({
      event: {
        type: "NON_RENEWING_PURCHASE",
        app_user_id: "1",
        product_id: "rc_promo_premium_lifetime",
        store: "PROMOTIONAL",
        period_type: "PROMOTIONAL",
      },
    });
    expect(updateUserSubscription).toHaveBeenCalledWith(1, "lifetime", null, "1");
  });

  it("does not touch the tier for non-promotional NON_RENEWING_PURCHASE", async () => {
    const { updateUserSubscription } = await import("./db");
    vi.mocked(updateUserSubscription).mockClear();
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscription.revenuecatWebhook({
      event: {
        type: "NON_RENEWING_PURCHASE",
        app_user_id: "1",
        product_id: "some_consumable",
        store: "APP_STORE",
        period_type: "NORMAL",
      },
    });
    // Event is acknowledged + logged, but an ordinary consumable purchase
    // must never downgrade (or upgrade) the subscription tier
    expect(result.received).toBe(true);
    expect(updateUserSubscription).not.toHaveBeenCalled();
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

describe("sounds router", () => {
  it("requires auth for list", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.sounds.list()).rejects.toThrow();
  });

  it("creates a sound for the authenticated user", async () => {
    const { createUserSound } = await import("./db");
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sounds.create({
      name: "528 + Rain",
      freqL: 528,
      waveform: "sine",
      mode: "mono",
      toneVolume: 0.7,
      backgroundType: "library",
      backgroundKey: "ambient-rain",
      backgroundVolume: 0.35,
    });
    expect(result.id).toBe(1);
    expect(createUserSound).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        name: "528 + Rain",
        freqL: 528,
        backgroundType: "library",
        backgroundKey: "ambient-rain",
      }),
    );
  });

  it("lists sounds for the authenticated user", async () => {
    const { getUserSounds } = await import("./db");
    vi.mocked(getUserSounds).mockResolvedValueOnce([
      {
        id: 5,
        userId: 1,
        name: "Test mix",
        freqL: 432,
        beatHz: null,
        isoRate: null,
        isoDuty: null,
        waveform: "sine",
        mode: "mono",
        toneVolume: 0.7,
        backgroundType: "none",
        backgroundKey: null,
        backgroundVolume: 0.35,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sounds.list();
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Test mix");
  });

  it("deletes only the caller's sound", async () => {
    const { deleteUserSound } = await import("./db");
    vi.mocked(deleteUserSound).mockResolvedValueOnce({
      id: 9,
      userId: 1,
      name: "Gone",
      freqL: 528,
      beatHz: null,
      isoRate: null,
      isoDuty: null,
      waveform: "sine",
      mode: "mono",
      toneVolume: 0.7,
      backgroundType: "none",
      backgroundKey: null,
      backgroundVolume: 0.35,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sounds.delete({ id: 9 });
    expect(result.success).toBe(true);
    expect(deleteUserSound).toHaveBeenCalledWith(9, 1);
  });

  it("returns NOT_FOUND when deleting a missing sound", async () => {
    const { deleteUserSound } = await import("./db");
    vi.mocked(deleteUserSound).mockResolvedValueOnce(undefined);
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.sounds.delete({ id: 404 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
