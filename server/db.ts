import { and, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Alarm,
  InsertAlarm,
  InsertSession,
  InsertStudioPreset,
  InsertUser,
  InsertUserSound,
  Session,
  StudioPreset,
  User,
  UserSound,
  alarms,
  sessions,
  studioPresets,
  subscriptionEvents,
  userSounds,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
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

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
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

/** Count of lifetime subscribers, used to enforce the founder seat cap. */
export async function countLifetimeUsers(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.subscriptionTier, "lifetime"));
  return Number(rows[0]?.count ?? 0);
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

export async function endSession(
  sessionId: number,
  durationSeconds: number,
  moodRating?: number,
  journalNote?: string,
  intention?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(sessions)
    .set({
      endedAt: new Date(),
      durationSeconds,
      ...(moodRating !== undefined ? { moodRating } : {}),
      ...(journalNote !== undefined ? { journalNote } : {}),
      ...(intention !== undefined ? { intention } : {}),
    })
    .where(eq(sessions.id, sessionId));
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

  const [totalRows, recentRows, moodRows, topFreqRows, streakRows] = await Promise.all([
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
    // Fetch distinct session dates for streak calculation (last 60 days)
    db
      .select({
        day: sql<string>`DATE(startedAt)`,
      })
      .from(sessions)
      .where(and(
        eq(sessions.userId, userId),
        gte(sessions.startedAt, new Date(Date.now() - 60 * 24 * 60 * 60 * 1000))
      ))
      .groupBy(sql`DATE(startedAt)`)
      .orderBy(desc(sql`DATE(startedAt)`)),
  ]);

  // Compute streak: count consecutive days ending today or yesterday
  let currentStreak = 0;
  if (streakRows.length > 0) {
    const sessionDays = new Set(streakRows.map(r => r.day as string));
    const today = new Date();
    // Start from today; if today has no session, allow yesterday as the streak anchor
    let checkDate = new Date(today);
    const todayStr = checkDate.toISOString().slice(0, 10);
    if (!sessionDays.has(todayStr)) {
      // Shift back one day — streak may have ended yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    }
    for (let i = 0; i < 60; i++) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (sessionDays.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return {
    totalSessions: Number(totalRows[0]?.count ?? 0),
    totalMinutes: Math.round(Number(totalRows[0]?.totalSeconds ?? 0) / 60),
    avgMoodRating: Number(moodRows[0]?.avg ?? 0),
    currentStreak,
    recentSessions: recentRows,
    topFrequencies: topFreqRows,
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

export async function logSubscriptionEvent(data: {
  userId?: number;
  /** RevenueCat app_user_id for mobile events; omitted for Stripe web events */
  revenuecatUserId?: string;
  eventType: string;
  productId?: string;
  expiresAt?: Date;
  rawPayload?: unknown;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(subscriptionEvents).values({
    userId: data.userId,
    revenuecatUserId: data.revenuecatUserId,
    eventType: data.eventType,
    productId: data.productId,
    expiresAt: data.expiresAt,
    rawPayload: data.rawPayload,
  });
}
