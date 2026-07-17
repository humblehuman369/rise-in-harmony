import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Alarm,
  ConvertJob,
  InsertAlarm,
  InsertConvertJob,
  InsertSession,
  InsertStudioPreset,
  InsertUser,
  InsertUserSound,
  InsertUserProgram,
  InsertProgramDayCompletion,
  Session,
  StudioPreset,
  User,
  UserSound,
  UserProgram,
  ProgramDayCompletion,
  alarms,
  convertJobs,
  healingFavorites,
  programDayCompletions,
  sessions,
  studioPresets,
  subscriptionEvents,
  userPrograms,
  userSounds,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getMysqlPool } from "./lib/dbPool";
import { calculateStreakFromDates } from "./lib/streak";
import {
  calculateStreakWithFreezes,
  currentMonthKey,
} from "./lib/streakFreeze";
import { isUserPremium } from "./lib/entitlements";
import { log } from "./lib/logger";

/** Only write lastSignedIn if older than this (reduces write amplification). */
const LAST_SIGNED_IN_THROTTLE_MS = 15 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = getMysqlPool(process.env.DATABASE_URL);
      // mysql2 Pool type can conflict under pnpm; runtime is correct.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _db = drizzle(pool as any);
    } catch (error) {
      log.warn("Database pool init failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      _db = null;
    }
  }
  return _db as ReturnType<typeof drizzle> | null;
}

/**
 * Update lastSignedIn at most once per throttle window per user.
 * Returns true if a write was performed.
 */
export async function touchLastSignedIn(
  openId: string,
  at: Date = new Date()
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const threshold = new Date(at.getTime() - LAST_SIGNED_IN_THROTTLE_MS);
  const result = await db
    .update(users)
    .set({ lastSignedIn: at })
    .where(
      and(
        eq(users.openId, openId),
        sql`(${users.lastSignedIn} IS NULL OR ${users.lastSignedIn} < ${threshold})`
      )
    );
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * Upsert a user and return whether this is their first login.
 */
export async function upsertUser(user: InsertUser): Promise<{ isNewUser: boolean }> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return { isNewUser: false };

  // Check if user already exists before upserting
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.openId, user.openId)).limit(1);
  const isNewUser = existing.length === 0;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  values.lastSignedIn = new Date();
  updateSet.lastSignedIn = new Date();

  const isAdminEmail =
    typeof user.email === "string" &&
    ENV.adminEmails.includes(user.email.trim().toLowerCase());

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId || isAdminEmail) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  return { isNewUser };
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserProfile(
  userId: number,
  fields: { name?: string },
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(fields).where(eq(users.id, userId));
}

/** Set user role (admin | user). Used by the admin dashboard. */
export async function updateUserRole(
  userId: number,
  role: "user" | "admin"
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

export async function countAdminUsers(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, "admin"));
  return Number(rows[0]?.count ?? 0);
}

/**
 * Candidates for re-engagement: have email, had at least one session, last
 * session ≥ inactiveDays ago, and no re-engagement email within cooldownDays.
 */
export async function listUsersForReEngagement(options: {
  inactiveDays?: number;
  cooldownDays?: number;
  limit?: number;
} = {}): Promise<
  Array<{
    id: number;
    email: string;
    name: string | null;
    lastSessionAt: Date;
    daysSinceLast: number;
  }>
> {
  const inactiveDays = options.inactiveDays ?? 7;
  const cooldownDays = options.cooldownDays ?? 7;
  const limit = Math.min(options.limit ?? 100, 500);
  const db = await getDb();
  if (!db) return [];

  const inactiveCutoff = new Date(Date.now() - inactiveDays * 86_400_000);
  const cooldownCutoff = new Date(Date.now() - cooldownDays * 86_400_000);

  // Users with email whose most recent session is older than inactiveCutoff
  // and who haven't been re-engaged within cooldownCutoff.
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      lastReEngagementEmailAt: users.lastReEngagementEmailAt,
      lastSessionAt: sql<Date>`MAX(${sessions.startedAt})`,
    })
    .from(users)
    .innerJoin(sessions, eq(sessions.userId, users.id))
    .where(sql`${users.email} IS NOT NULL AND ${users.email} != ''`)
    .groupBy(
      users.id,
      users.email,
      users.name,
      users.lastReEngagementEmailAt
    )
    .having(sql`MAX(${sessions.startedAt}) < ${inactiveCutoff}`)
    .orderBy(sql`MAX(${sessions.startedAt}) ASC`)
    .limit(limit);

  const now = Date.now();
  return rows
    .filter(r => {
      if (!r.email) return false;
      if (
        r.lastReEngagementEmailAt &&
        r.lastReEngagementEmailAt.getTime() > cooldownCutoff.getTime()
      ) {
        return false;
      }
      return true;
    })
    .map(r => {
      const lastSessionAt = new Date(r.lastSessionAt);
      return {
        id: r.id,
        email: r.email as string,
        name: r.name,
        lastSessionAt,
        daysSinceLast: Math.floor(
          (now - lastSessionAt.getTime()) / 86_400_000
        ),
      };
    });
}

export async function updateUserPreferences(
  userId: number,
  prefs: Record<string, unknown>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getUserById(userId);
  const current = (existing?.preferences as Record<string, unknown>) ?? {};
  await db
    .update(users)
    .set({ preferences: { ...current, ...prefs } })
    .where(eq(users.id, userId));
}

export async function deleteUserAccount(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Cascades remove sessions, alarms, presets, sounds, favorites via FK.
  await db.delete(users).where(eq(users.id, userId));
}

/** Full GDPR-style data export for the account owner. */
export async function exportUserData(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const user = await getUserById(userId);
  if (!user) return null;

  const [sessionRows, alarmRows, presetRows, soundRows, favoriteRows, eventRows] =
    await Promise.all([
      getUserSessions(userId, 500),
      getUserAlarms(userId),
      getUserPresets(userId),
      getUserSounds(userId),
      db
        .select()
        .from(healingFavorites)
        .where(eq(healingFavorites.userId, userId)),
      db
        .select({
          eventType: subscriptionEvents.eventType,
          productId: subscriptionEvents.productId,
          expiresAt: subscriptionEvents.expiresAt,
          createdAt: subscriptionEvents.createdAt,
        })
        .from(subscriptionEvents)
        .where(eq(subscriptionEvents.userId, userId))
        .orderBy(desc(subscriptionEvents.createdAt))
        .limit(200),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      name: user.name,
      email: user.email,
      memberSince: user.createdAt,
      subscriptionTier: user.subscriptionTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      isFounder: user.isFounder,
      onboardingGoal: user.onboardingGoal,
      onboardingProfile: user.onboardingProfile,
      preferences: user.preferences,
      loginMethod: user.loginMethod,
    },
    sessions: sessionRows,
    alarms: alarmRows,
    studioPresets: presetRows,
    userSounds: soundRows.map(s => ({
      id: s.id,
      name: s.name,
      freqL: s.freqL,
      beatHz: s.beatHz,
      isoRate: s.isoRate,
      isoDuty: s.isoDuty,
      waveform: s.waveform,
      mode: s.mode,
      toneVolume: s.toneVolume,
      backgroundType: s.backgroundType,
      backgroundKey: s.backgroundKey,
      backgroundVolume: s.backgroundVolume,
      createdAt: s.createdAt,
    })),
    healingFavorites: favoriteRows,
    subscriptionEvents: eventRows,
  };
}

/**
 * If premium has expired, write-back to free and return the updated view.
 * Lifetime and free are left unchanged.
 */
export async function reconcileExpiredSubscription(
  userId: number
): Promise<User | undefined> {
  const user = await getUserById(userId);
  if (!user) return undefined;
  if (user.subscriptionTier !== "premium") return user;
  if (!user.subscriptionExpiresAt) return user;
  if (user.subscriptionExpiresAt.getTime() > Date.now()) return user;

  await updateUserSubscription(userId, "free", null);
  return { ...user, subscriptionTier: "free", subscriptionExpiresAt: null };
}

export async function updateUserOnboarding(
  userId: number,
  goal: string,
  profile?: Record<string, unknown>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({
      onboardingGoal: goal,
      onboardingCompleted: true,
      ...(profile ? { onboardingProfile: profile } : {}),
    })
    .where(eq(users.id, userId));
}

export async function setStripeCustomerId(
  userId: number,
  stripeCustomerId: string,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
}

export async function getUserByStripeCustomerId(
  stripeCustomerId: string,
): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return rows[0];
}

/**
 * Count of PURCHASED founder lifetime seats (admin comps excluded),
 * used to enforce the 500-seat founder cap.
 */
export async function countFounderUsers(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.isFounder, true));
  return Number(rows[0]?.count ?? 0);
}

/** Mark a user as a purchased founder seat (non-atomic; prefer tryClaimFounderSeat). */
export async function setFounder(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isFounder: true }).where(eq(users.id, userId));
}

/**
 * Atomically claim a founder seat under the hard cap.
 * Returns true if this user now holds a founder seat (already held or newly claimed).
 * Returns false if the cap is full and the user is not already a founder.
 */
export async function tryClaimFounderSeat(
  userId: number,
  cap: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  return db.transaction(async tx => {
    const existing = await tx
      .select({ isFounder: users.isFounder })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!existing[0]) return false;
    if (existing[0].isFounder) return true;

    const countRows = await tx
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isFounder, true));
    const sold = Number(countRows[0]?.count ?? 0);
    if (sold >= cap) return false;

    await tx.update(users).set({ isFounder: true }).where(eq(users.id, userId));
    return true;
  });
}

export async function updateUserSubscription(
  userId: number,
  tier: "free" | "premium" | "lifetime",
  expiresAt: Date | null,
  revenuecatUserId?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({
      subscriptionTier: tier,
      subscriptionExpiresAt: expiresAt,
      ...(revenuecatUserId ? { revenuecatUserId } : {}),
    })
    .where(eq(users.id, userId));
}

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * "Cancelled" = currently free but has a CANCELLATION / EXPIRATION /
 * BILLING_ISSUE event in the RevenueCat webhook log (i.e. was once paid).
 */
const cancelledEventExists = sql`EXISTS (
  SELECT 1 FROM subscription_events se
  WHERE se.userId = ${users.id}
    AND se.eventType IN ('CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE')
)`;

export type AdminUserFilter = "all" | "active" | "cancelled" | "free";

/** Aggregate user counts for the admin dashboard. */
export async function getAdminUserCounts() {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when subscriptionTier IN ('premium','lifetime') then 1 else 0 end)`,
      cancelled: sql<number>`sum(case when subscriptionTier = 'free' AND ${cancelledEventExists} then 1 else 0 end)`,
      free: sql<number>`sum(case when subscriptionTier = 'free' then 1 else 0 end)`,
    })
    .from(users);

  const r = rows[0];
  return {
    total: Number(r?.total ?? 0),
    active: Number(r?.active ?? 0),
    cancelled: Number(r?.cancelled ?? 0),
    free: Number(r?.free ?? 0),
  };
}

/** Paged, filterable user list for the admin dashboard. */
export async function listUsersForAdmin(options: {
  filter: AdminUserFilter;
  search?: string;
  limit: number;
  offset: number;
}) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };

  const conditions: ReturnType<typeof sql>[] = [];
  if (options.filter === "active") {
    conditions.push(sql`subscriptionTier IN ('premium','lifetime')`);
  } else if (options.filter === "cancelled") {
    conditions.push(sql`subscriptionTier = 'free' AND ${cancelledEventExists}`);
  } else if (options.filter === "free") {
    conditions.push(sql`subscriptionTier = 'free'`);
  }
  if (options.search) {
    const like = `%${options.search}%`;
    conditions.push(sql`(name LIKE ${like} OR email LIKE ${like})`);
  }
  const where = conditions.length
    ? sql.join(conditions, sql` AND `)
    : sql`1=1`;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        subscriptionTier: users.subscriptionTier,
        subscriptionExpiresAt: users.subscriptionExpiresAt,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
        hasCancelled: sql<number>`case when ${cancelledEventExists} then 1 else 0 end`,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(options.limit)
      .offset(options.offset),
    db.select({ count: sql<number>`count(*)` }).from(users).where(where),
  ]);

  return {
    users: rows.map(r => ({ ...r, hasCancelled: Number(r.hasCancelled) === 1 })),
    total: Number(countRows[0]?.count ?? 0),
  };
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function createSession(data: InsertSession): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(sessions).values(data);
  return (result[0] as { insertId: number }).insertId;
}

/**
 * End a healing session. Ownership is enforced via userId — returns false
 * when the session does not exist or belongs to another user (IDOR guard).
 */
export async function endSession(
  sessionId: number,
  userId: number,
  durationSeconds: number,
  moodRating?: number,
  journalNote?: string,
  intention?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(sessions)
    .set({
      endedAt: new Date(),
      durationSeconds,
      ...(moodRating !== undefined ? { moodRating } : {}),
      ...(journalNote !== undefined ? { journalNote } : {}),
      ...(intention !== undefined ? { intention } : {}),
    })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

export async function getUserSessions(userId: number, limit = 50): Promise<Session[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.startedAt))
    .limit(limit);
}

export async function getUserStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const [totalRows, recentRows, moodRows, topFreqRows, streakSessionRows, userRow] =
    await Promise.all([
      db
        .select({
          count: sql<number>`count(*)`,
          totalSeconds: sql<number>`sum(durationSeconds)`,
        })
        .from(sessions)
        .where(eq(sessions.userId, userId)),
      db
        .select()
        .from(sessions)
        .where(and(eq(sessions.userId, userId), gte(sessions.startedAt, thirtyDaysAgo)))
        .orderBy(desc(sessions.startedAt)),
      db
        .select({ avg: sql<number>`avg(moodRating)`, count: sql<number>`count(*)` })
        .from(sessions)
        .where(and(eq(sessions.userId, userId), sql`moodRating IS NOT NULL`)),
      db
        .select({
          frequencyName: sessions.frequencyName,
          frequencyHz: sessions.frequencyHz,
          count: sql<number>`count(*) as count`,
        })
        .from(sessions)
        .where(eq(sessions.userId, userId))
        .groupBy(sessions.frequencyName, sessions.frequencyHz)
        .orderBy(desc(sql`count(*)`))
        .limit(5),
      // Raw startedAt timestamps — day boundaries computed in user timezone in JS
      db
        .select({ startedAt: sessions.startedAt })
        .from(sessions)
        .where(
          and(eq(sessions.userId, userId), gte(sessions.startedAt, sixtyDaysAgo))
        ),
      db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
    ]);

  const prefs = (userRow[0]?.preferences as Record<string, unknown> | null) ?? {};
  const timeZone =
    typeof prefs.timezone === "string" && prefs.timezone.length > 0
      ? prefs.timezone
      : "UTC";

  // Ensure premium monthly freeze grant (idempotent per YYYY-MM)
  const userFull = await getUserById(userId);
  let freezesRemaining = userFull?.streakFreezesRemaining ?? 0;
  if (userFull && isUserPremium(userFull)) {
    freezesRemaining = await ensureMonthlyStreakFreeze(userId);
  }

  const dates = streakSessionRows.map(r => new Date(r.startedAt));
  const streakResult = calculateStreakWithFreezes(dates, {
    timeZone,
    freezesAvailable: freezesRemaining,
    consumeFreezes: false, // display only; freezes are inventory, not auto-spent on view
  });

  // Also expose simple streak without freezes for debugging/coaching
  const rawStreak = calculateStreakFromDates(dates, { timeZone });

  return {
    totalSessions: Number(totalRows[0]?.count ?? 0),
    totalMinutes: Math.round(Number(totalRows[0]?.totalSeconds ?? 0) / 60),
    avgMoodRating: Number(moodRows[0]?.avg ?? 0),
    currentStreak: Math.max(streakResult.streak, rawStreak),
    rawStreak,
    streakFreezesRemaining: freezesRemaining,
    recentSessions: recentRows,
    topFrequencies: topFreqRows,
  };
}

/**
 * Grant 1 streak freeze per calendar month for premium/lifetime users.
 * Returns the user's freezes remaining after the check.
 */
export async function ensureMonthlyStreakFreeze(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const user = await getUserById(userId);
  if (!user || !isUserPremium(user)) {
    return user?.streakFreezesRemaining ?? 0;
  }
  const month = currentMonthKey();
  if (user.streakFreezeMonthKey === month) {
    return user.streakFreezesRemaining;
  }
  // New month: set freezes to 1 (premium monthly allotment)
  await db
    .update(users)
    .set({ streakFreezesRemaining: 1, streakFreezeMonthKey: month })
    .where(eq(users.id, userId));
  return 1;
}

export async function consumeStreakFreeze(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const user = await getUserById(userId);
  if (!user || user.streakFreezesRemaining <= 0) return false;
  await db
    .update(users)
    .set({ streakFreezesRemaining: user.streakFreezesRemaining - 1 })
    .where(eq(users.id, userId));
  return true;
}

/** Explicitly apply a freeze to bridge a one-day gap (user-initiated). */
export async function applyStreakFreeze(userId: number): Promise<{
  success: boolean;
  remaining: number;
  message?: string;
}> {
  const remaining = await ensureMonthlyStreakFreeze(userId);
  if (remaining <= 0) {
    return {
      success: false,
      remaining: 0,
      message: "No streak freezes remaining this month",
    };
  }
  const ok = await consumeStreakFreeze(userId);
  const user = await getUserById(userId);
  return {
    success: ok,
    remaining: user?.streakFreezesRemaining ?? 0,
  };
}

// ─── Alarms ───────────────────────────────────────────────────────────────────

export async function getUserAlarms(userId: number): Promise<Alarm[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(alarms)
    .where(eq(alarms.userId, userId))
    .orderBy(alarms.hour, alarms.minute);
}

export async function createAlarm(data: InsertAlarm): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(alarms).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateAlarm(
  alarmId: number,
  userId: number,
  data: Partial<InsertAlarm>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(alarms)
    .set(data)
    .where(and(eq(alarms.id, alarmId), eq(alarms.userId, userId)));
}

export async function deleteAlarm(alarmId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(alarms).where(and(eq(alarms.id, alarmId), eq(alarms.userId, userId)));
}

// ─── Studio Presets ───────────────────────────────────────────────────────────

export async function getUserPresets(userId: number): Promise<StudioPreset[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(studioPresets)
    .where(eq(studioPresets.userId, userId))
    .orderBy(desc(studioPresets.createdAt));
}

export async function createPreset(data: InsertStudioPreset): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(studioPresets).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function deletePreset(presetId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(studioPresets)
    .where(and(eq(studioPresets.id, presetId), eq(studioPresets.userId, userId)));
}

// ─── User Sounds ──────────────────────────────────────────────────────────────

export async function getUserSounds(userId: number): Promise<UserSound[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userSounds)
    .where(eq(userSounds.userId, userId))
    .orderBy(desc(userSounds.createdAt));
}

export async function getUserSoundById(
  soundId: number,
  userId: number,
): Promise<UserSound | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(userSounds)
    .where(and(eq(userSounds.id, soundId), eq(userSounds.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function createUserSound(data: InsertUserSound): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(userSounds).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function renameUserSound(
  soundId: number,
  userId: number,
  name: string,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(userSounds)
    .set({ name })
    .where(and(eq(userSounds.id, soundId), eq(userSounds.userId, userId)));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

export async function deleteUserSound(
  soundId: number,
  userId: number,
): Promise<UserSound | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await getUserSoundById(soundId, userId);
  if (!existing) return undefined;
  await db
    .delete(userSounds)
    .where(and(eq(userSounds.id, soundId), eq(userSounds.userId, userId)));
  return existing;
}

export async function getUserUploadKeys(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ backgroundKey: userSounds.backgroundKey })
    .from(userSounds)
    .where(
      and(eq(userSounds.userId, userId), eq(userSounds.backgroundType, "upload")),
    );
  const keys = rows
    .map(row => row.backgroundKey)
    .filter((key): key is string => typeof key === "string" && key.length > 0);
  return Array.from(new Set(keys));
}

// ─── Programs ─────────────────────────────────────────────────────────────────

export async function listUserPrograms(userId: number): Promise<UserProgram[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userPrograms)
    .where(and(eq(userPrograms.userId, userId), sql`${userPrograms.abandonedAt} IS NULL`))
    .orderBy(desc(userPrograms.startedAt));
}

export async function getUserProgram(
  userId: number,
  programId: string
): Promise<UserProgram | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(userPrograms)
    .where(
      and(
        eq(userPrograms.userId, userId),
        eq(userPrograms.programId, programId),
        sql`${userPrograms.abandonedAt} IS NULL`
      )
    )
    .limit(1);
  return rows[0];
}

export async function enrollProgram(
  userId: number,
  programId: string
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  // Reactivate abandoned enrollment or insert new
  const existing = await db
    .select()
    .from(userPrograms)
    .where(
      and(eq(userPrograms.userId, userId), eq(userPrograms.programId, programId))
    )
    .limit(1);
  if (existing[0]) {
    await db
      .update(userPrograms)
      .set({
        abandonedAt: null,
        completedAt: null,
        currentDay: existing[0].currentDay || 1,
        startedAt: existing[0].startedAt ?? new Date(),
      })
      .where(eq(userPrograms.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(userPrograms).values({
    userId,
    programId,
    currentDay: 1,
  } satisfies InsertUserProgram);
  return (result[0] as { insertId: number }).insertId;
}

export async function abandonProgram(
  userId: number,
  programId: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(userPrograms)
    .set({ abandonedAt: new Date() })
    .where(
      and(eq(userPrograms.userId, userId), eq(userPrograms.programId, programId))
    );
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

export async function listProgramCompletions(
  userId: number,
  programId: string
): Promise<ProgramDayCompletion[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(programDayCompletions)
    .where(
      and(
        eq(programDayCompletions.userId, userId),
        eq(programDayCompletions.programId, programId)
      )
    )
    .orderBy(programDayCompletions.dayNumber);
}

export async function completeProgramDay(data: {
  userId: number;
  programId: string;
  dayNumber: number;
  sessionId?: number;
  note?: string;
  totalDays: number;
}): Promise<{ completionId: number; programComplete: boolean }> {
  const db = await getDb();
  if (!db) return { completionId: 0, programComplete: false };

  // Idempotent: if already completed, return existing
  const existing = await db
    .select()
    .from(programDayCompletions)
    .where(
      and(
        eq(programDayCompletions.userId, data.userId),
        eq(programDayCompletions.programId, data.programId),
        eq(programDayCompletions.dayNumber, data.dayNumber)
      )
    )
    .limit(1);
  if (existing[0]) {
    const completions = await listProgramCompletions(data.userId, data.programId);
    return {
      completionId: existing[0].id,
      programComplete: completions.length >= data.totalDays,
    };
  }

  const result = await db.insert(programDayCompletions).values({
    userId: data.userId,
    programId: data.programId,
    dayNumber: data.dayNumber,
    sessionId: data.sessionId,
    note: data.note,
  } satisfies InsertProgramDayCompletion);
  const completionId = (result[0] as { insertId: number }).insertId;

  const nextDay = data.dayNumber + 1;
  const programComplete = data.dayNumber >= data.totalDays;
  await db
    .update(userPrograms)
    .set({
      currentDay: programComplete ? data.totalDays : Math.max(nextDay, data.dayNumber),
      ...(programComplete ? { completedAt: new Date() } : {}),
    })
    .where(
      and(
        eq(userPrograms.userId, data.userId),
        eq(userPrograms.programId, data.programId)
      )
    );

  return { completionId, programComplete };
}

export async function markWeeklyInsightEmailSent(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const user = await getUserById(userId);
  if (!user) return false;
  const last = user.lastWeeklyInsightEmailAt;
  if (last && Date.now() - last.getTime() < 6 * 86_400_000) return false;
  await db
    .update(users)
    .set({ lastWeeklyInsightEmailAt: new Date() })
    .where(eq(users.id, userId));
  return true;
}

export async function listUsersForWeeklyInsights(limit = 100): Promise<
  Array<{ id: number; email: string; name: string | null }>
> {
  const db = await getDb();
  if (!db) return [];
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      lastWeeklyInsightEmailAt: users.lastWeeklyInsightEmailAt,
    })
    .from(users)
    .where(sql`${users.email} IS NOT NULL AND ${users.email} != ''`)
    .limit(limit * 2);

  return rows
    .filter(r => {
      if (!r.email) return false;
      if (
        r.lastWeeklyInsightEmailAt &&
        r.lastWeeklyInsightEmailAt.getTime() > weekAgo.getTime()
      ) {
        return false;
      }
      return true;
    })
    .slice(0, limit)
    .map(r => ({ id: r.id, email: r.email as string, name: r.name }));
}

// ─── Email Deduplication Helpers ────────────────────────────────────────────

/** Mark that the welcome email was sent for a user */
export async function markWelcomeEmailSent(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ welcomeEmailSentAt: new Date() }).where(eq(users.id, userId));
}

/** Mark that a streak milestone email was sent. Returns false if already sent for this milestone. */
export async function markStreakMilestoneEmailSent(
  userId: number,
  streakDays: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const user = await db.select({ lastMilestone: users.lastStreakMilestoneDays }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0] || user[0].lastMilestone >= streakDays) return false; // already sent
  await db.update(users).set({
    lastStreakMilestoneEmailAt: new Date(),
    lastStreakMilestoneDays: streakDays,
  }).where(eq(users.id, userId));
  return true;
}

/** Mark that a re-engagement email was sent. Returns false if sent within the last 7 days. */
export async function markReEngagementEmailSent(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const user = await db.select({ lastSent: users.lastReEngagementEmailAt }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) return false;
  const lastSent = user[0].lastSent;
  if (lastSent && Date.now() - lastSent.getTime() < 7 * 86400000) return false; // sent within 7 days
  await db.update(users).set({ lastReEngagementEmailAt: new Date() }).where(eq(users.id, userId));
  return true;
}

// ─── Subscription Events ──────────────────────────────────────────────────────

/**
 * Returns true if this external event id was already recorded (idempotency).
 * Null/empty ids are treated as not-seen (caller should still process).
 */
export async function hasProcessedExternalEvent(
  externalEventId: string | null | undefined
): Promise<boolean> {
  if (!externalEventId) return false;
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: subscriptionEvents.id })
    .from(subscriptionEvents)
    .where(eq(subscriptionEvents.externalEventId, externalEventId))
    .limit(1);
  return rows.length > 0;
}

/**
 * Log a subscription webhook event. Returns false if externalEventId was a
 * duplicate (unique constraint / already present) so callers can skip side effects.
 */
export async function logSubscriptionEvent(data: {
  userId?: number;
  /** RevenueCat app_user_id for mobile events; omitted for Stripe web events */
  revenuecatUserId?: string;
  eventType: string;
  productId?: string;
  externalEventId?: string;
  expiresAt?: Date;
  rawPayload?: unknown;
}): Promise<{ inserted: boolean }> {
  const db = await getDb();
  if (!db) return { inserted: false };

  if (data.externalEventId) {
    const already = await hasProcessedExternalEvent(data.externalEventId);
    if (already) return { inserted: false };
  }

  try {
    await db.insert(subscriptionEvents).values({
      userId: data.userId,
      revenuecatUserId: data.revenuecatUserId,
      eventType: data.eventType,
      productId: data.productId,
      externalEventId: data.externalEventId,
      expiresAt: data.expiresAt,
      rawPayload: data.rawPayload,
    });
    return { inserted: true };
  } catch (err) {
    // Race: concurrent insert of same externalEventId
    const message = err instanceof Error ? err.message : String(err);
    if (data.externalEventId && /duplicate|unique/i.test(message)) {
      return { inserted: false };
    }
    throw err;
  }
}

// ─── TrueHz Convert jobs ──────────────────────────────────────────────────────

export async function createConvertJob(
  data: InsertConvertJob,
): Promise<ConvertJob | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(convertJobs).values(data);
  const insertId = (result[0] as { insertId: number }).insertId;
  const rows = await db
    .select()
    .from(convertJobs)
    .where(eq(convertJobs.id, insertId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getConvertJobByPublicId(
  publicId: string,
  userId: number,
): Promise<ConvertJob | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(convertJobs)
    .where(
      and(eq(convertJobs.publicId, publicId), eq(convertJobs.userId, userId)),
    )
    .limit(1);
  return rows[0];
}

export async function getConvertJobById(
  id: number,
): Promise<ConvertJob | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(convertJobs)
    .where(eq(convertJobs.id, id))
    .limit(1);
  return rows[0];
}

export async function listConvertJobs(
  userId: number,
  limit = 50,
): Promise<ConvertJob[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(convertJobs)
    .where(eq(convertJobs.userId, userId))
    .orderBy(desc(convertJobs.createdAt))
    .limit(limit);
}

export async function countActiveConvertJobs(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(convertJobs)
    .where(
      and(
        eq(convertJobs.userId, userId),
        inArray(convertJobs.status, ["queued", "processing"]),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

export async function updateConvertJobProgress(
  id: number,
  patch: {
    stage?: string;
    progressPct?: number;
    sourceDurationSec?: number;
    sourceFormat?: string;
  },
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(convertJobs).set(patch).where(eq(convertJobs.id, id));
}

export async function claimNextQueuedConvertJob(): Promise<ConvertJob | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(convertJobs)
    .where(eq(convertJobs.status, "queued"))
    .orderBy(asc(convertJobs.createdAt))
    .limit(1);
  const job = rows[0];
  if (!job) return null;
  // Optimistic claim — multi-instance safe when race loses (affectedRows 0)
  const result = await db
    .update(convertJobs)
    .set({ status: "processing", stage: "processing", progressPct: 1 })
    .where(
      and(eq(convertJobs.id, job.id), eq(convertJobs.status, "queued")),
    );
  const affected = (result[0] as { affectedRows: number }).affectedRows;
  if (affected === 0) return null;
  return { ...job, status: "processing", stage: "processing", progressPct: 1 };
}

/**
 * Fail jobs stuck in `processing` longer than `staleMinutes` (crashed worker recovery).
 * Returns number of jobs marked failed.
 */
export async function failStaleConvertJobs(
  staleMinutes = 30,
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);
  const result = await db
    .update(convertJobs)
    .set({
      status: "failed",
      stage: "error",
      progressPct: 0,
      errorCode: "TIMEOUT",
      errorMessage: `Stale processing job reaped after ${staleMinutes}m`,
    })
    .where(
      and(
        eq(convertJobs.status, "processing"),
        lt(convertJobs.updatedAt, cutoff),
      ),
    );
  return (result[0] as { affectedRows: number }).affectedRows ?? 0;
}

export async function markConvertJobCompleted(
  id: number,
  data: {
    outputWavKey: string | null;
    outputMp3Key: string | null;
    algorithmVersion: string;
    processingMs: number;
    sourceDurationSec: number;
    sourceFormat: string;
    pitchRatio: number;
    cents: number;
  },
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(convertJobs)
    .set({
      status: "completed",
      stage: "done",
      progressPct: 100,
      outputWavKey: data.outputWavKey,
      outputMp3Key: data.outputMp3Key,
      algorithmVersion: data.algorithmVersion,
      processingMs: data.processingMs,
      sourceDurationSec: data.sourceDurationSec,
      sourceFormat: data.sourceFormat,
      pitchRatio: data.pitchRatio,
      cents: data.cents,
      errorCode: null,
      errorMessage: null,
    })
    .where(eq(convertJobs.id, id));
}

export async function failConvertJob(
  id: number,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(convertJobs)
    .set({
      status: "failed",
      stage: "error",
      progressPct: 0,
      errorCode,
      errorMessage,
    })
    .where(eq(convertJobs.id, id));
}

export async function deleteConvertJob(
  publicId: string,
  userId: number,
): Promise<ConvertJob | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await getConvertJobByPublicId(publicId, userId);
  if (!existing) return undefined;
  await db
    .delete(convertJobs)
    .where(
      and(eq(convertJobs.publicId, publicId), eq(convertJobs.userId, userId)),
    );
  return existing;
}

export async function renameConvertJob(
  publicId: string,
  userId: number,
  sourceFilename: string,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(convertJobs)
    .set({ sourceFilename: sourceFilename.slice(0, 256) })
    .where(
      and(eq(convertJobs.publicId, publicId), eq(convertJobs.userId, userId)),
    );
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

/** Mark expired completed jobs (TTL). Returns count. */
export async function expireOldConvertJobs(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .update(convertJobs)
    .set({ status: "expired", stage: "expired" })
    .where(
      and(
        eq(convertJobs.status, "completed"),
        lt(convertJobs.expiresAt, sql`NOW()`),
      ),
    );
  return (result[0] as { affectedRows: number }).affectedRows ?? 0;
}
