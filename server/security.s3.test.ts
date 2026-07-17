/**
 * S3 polish tests — admin role rules, re-engagement batch wiring.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  getUserById: vi.fn(),
  updateUserRole: vi.fn().mockResolvedValue(true),
  countAdminUsers: vi.fn().mockResolvedValue(2),
  logSubscriptionEvent: vi.fn().mockResolvedValue({ inserted: true }),
  getAdminUserCounts: vi.fn(),
  listUsersForAdmin: vi.fn(),
  updateUserSubscription: vi.fn(),
}));

vi.mock("./revenuecat", () => ({
  isRevenueCatConfigured: vi.fn().mockReturnValue(false),
  grantPromotionalEntitlement: vi.fn(),
  revokePromotionalEntitlement: vi.fn(),
}));

vi.mock("./lib/reEngagement", () => ({
  processReEngagementBatch: vi.fn().mockResolvedValue({
    candidates: 3,
    sent: 2,
    skipped: 1,
    errors: 0,
    details: [],
  }),
  processUserReEngagement: vi.fn(),
}));

function adminCtx(id = 1): TrpcContext {
  return {
    user: {
      id,
      openId: "admin-1",
      name: "Admin",
      email: "admin@example.com",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("admin.setUserRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("promotes a user to admin", async () => {
    const { getUserById, updateUserRole } = await import("./db");
    vi.mocked(getUserById).mockResolvedValue({
      id: 2,
      role: "user",
    } as never);
    const caller = appRouter.createCaller(adminCtx(1));
    const result = await caller.admin.setUserRole({ userId: 2, role: "admin" });
    expect(result).toEqual({ success: true, role: "admin" });
    expect(updateUserRole).toHaveBeenCalledWith(2, "admin");
  });

  it("refuses self-demotion", async () => {
    const caller = appRouter.createCaller(adminCtx(1));
    await expect(
      caller.admin.setUserRole({ userId: 1, role: "user" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("refuses demoting the last admin", async () => {
    const { getUserById, countAdminUsers } = await import("./db");
    vi.mocked(getUserById).mockResolvedValue({
      id: 2,
      role: "admin",
    } as never);
    vi.mocked(countAdminUsers).mockResolvedValue(1);
    const caller = appRouter.createCaller(adminCtx(1));
    await expect(
      caller.admin.setUserRole({ userId: 2, role: "user" })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});

describe("admin.runReEngagementBatch", () => {
  it("returns batch stats for admins", async () => {
    const { processReEngagementBatch } = await import("./lib/reEngagement");
    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.admin.runReEngagementBatch({ limit: 25 });
    expect(result.sent).toBe(2);
    expect(processReEngagementBatch).toHaveBeenCalledWith({ limit: 25 });
  });

  it("rejects non-admins", async () => {
    const ctx = adminCtx();
    ctx.user = { ...ctx.user!, role: "user" };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.runReEngagementBatch()).rejects.toThrow();
  });
});

describe("system.health", () => {
  it("works without input", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    const result = await caller.system.health();
    expect(result.ok).toBe(true);
  });
});
