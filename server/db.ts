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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

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

  const [totalRows, recentRows, moodRows, topFreqRows] = await Promise.all([
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
  ]);

  return {
    totalSessions: Number(totalRows[0]?.count ?? 0),
    totalMinutes: Math.round(Number(totalRows[0]?.totalSeconds ?? 0) / 60),
    avgMoodRating: Number(moodRows[0]?.avg ?? 0),
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
