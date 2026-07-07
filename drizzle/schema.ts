import {
  boolean,
  float,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Onboarding
  onboardingGoal: varchar("onboardingGoal", { length: 64 }),
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  // Subscription (mirrors RevenueCat entitlement)
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "premium", "lifetime"])
    .default("free")
    .notNull(),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt"),
  revenuecatUserId: varchar("revenuecatUserId", { length: 128 }),
  // Email deduplication timestamps
  welcomeEmailSentAt: timestamp("welcomeEmailSentAt"),
  lastStreakMilestoneEmailAt: timestamp("lastStreakMilestoneEmailAt"),
  lastStreakMilestoneDays: int("lastStreakMilestoneDays").default(0).notNull(),
  lastReEngagementEmailAt: timestamp("lastReEngagementEmailAt"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Healing Sessions ─────────────────────────────────────────────────────────

export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // What was played
  frequencyHz: float("frequencyHz").notNull(),
  frequencyName: varchar("frequencyName", { length: 128 }),
  sessionType: mysqlEnum("sessionType", [
    "single",
    "chakra_sequence",
    "studio_mix",
    "sleep_timer",
  ])
    .default("single")
    .notNull(),
  studioPresetName: varchar("studioPresetName", { length: 128 }),
  // Duration
  durationSeconds: int("durationSeconds").notNull().default(0),
  // Post-session journal
  moodRating: int("moodRating"), // 1–5
  journalNote: text("journalNote"),
  intention: text("intention"),
  // Timestamps
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

// ─── Alarms ───────────────────────────────────────────────────────────────────

export const alarms = mysqlTable("alarms", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 128 }),
  hour: int("hour").notNull(), // 0–23
  minute: int("minute").notNull(), // 0–59
  days: json("days").notNull(), // number[] — 0=Sun … 6=Sat
  isEnabled: boolean("isEnabled").default(true).notNull(),
  // Sound config
  soundType: mysqlEnum("soundType", ["frequency", "studio_mix"])
    .default("frequency")
    .notNull(),
  frequencyHz: float("frequencyHz"),
  frequencyName: varchar("frequencyName", { length: 128 }),
  studioMixName: varchar("studioMixName", { length: 128 }),
  // Wake sequence
  wakeSequence: varchar("wakeSequence", { length: 64 }).default("gentle"),
  fadeInMinutes: int("fadeInMinutes").default(5).notNull(),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
});

export type Alarm = typeof alarms.$inferSelect;
export type InsertAlarm = typeof alarms.$inferInsert;

// ─── Studio Presets ───────────────────────────────────────────────────────────

export const studioPresets = mysqlTable("studio_presets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  // Layer config stored as JSON
  frequencyHz: float("frequencyHz").notNull(),
  frequencyVolume: float("frequencyVolume").default(0.7).notNull(),
  musicStyle: varchar("musicStyle", { length: 64 }),
  musicVolume: float("musicVolume").default(0.4).notNull(),
  natureSound: varchar("natureSound", { length: 64 }),
  natureVolume: float("natureVolume").default(0.3).notNull(),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudioPreset = typeof studioPresets.$inferSelect;
export type InsertStudioPreset = typeof studioPresets.$inferInsert;

// ─── User Sounds (Precision Player saved recipes) ─────────────────────────────

export const userSounds = mysqlTable("user_sounds", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  // Tone layer
  freqL: float("freqL").notNull(),
  beatHz: float("beatHz"),
  isoRate: float("isoRate"),
  isoDuty: float("isoDuty"),
  waveform: varchar("waveform", { length: 32 }).notNull(),
  mode: varchar("mode", { length: 32 }).notNull(), // mono | binaural | isochronic
  toneVolume: float("toneVolume").default(0.7).notNull(),
  // Background layer
  backgroundType: varchar("backgroundType", { length: 32 }).default("none").notNull(), // none | library | upload
  backgroundKey: varchar("backgroundKey", { length: 256 }),
  backgroundVolume: float("backgroundVolume").default(0.35).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSound = typeof userSounds.$inferSelect;
export type InsertUserSound = typeof userSounds.$inferInsert;

// ─── Subscription Events (RevenueCat webhook log) ─────────────────────────────

export const subscriptionEvents = mysqlTable("subscription_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  revenuecatUserId: varchar("revenuecatUserId", { length: 128 }),
  eventType: varchar("eventType", { length: 64 }).notNull(), // e.g. "INITIAL_PURCHASE"
  productId: varchar("productId", { length: 128 }),
  expiresAt: timestamp("expiresAt"),
  rawPayload: json("rawPayload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
