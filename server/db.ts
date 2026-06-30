import { and, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Alarm,
  InsertAlarm,
  InsertSession,
  InsertStudioPreset,
  InsertUser,
  Session,
  StudioPreset,
  alarms,
  sessions,
  studioPresets,
  subscriptionEvents,
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

export async function updateUserOnboarding(userId: number, goal: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ onboardingGoal: goal, onboardingCompleted: true })
    .where(eq(users.id, userId));
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
  revenuecatUserId: string;
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
