import {
  boolean,
  float,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
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
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  // True only for PURCHASED lifetime (founder) seats — admin comps stay false
  // so they never consume the capped founder allotment.
  isFounder: boolean("isFounder").default(false).notNull(),
  // JSON blob from the onboarding quiz (goal, wake time, experience, headphones)
  onboardingProfile: json("onboardingProfile"),
  // Email deduplication timestamps
  welcomeEmailSentAt: timestamp("welcomeEmailSentAt"),
  lastStreakMilestoneEmailAt: timestamp("lastStreakMilestoneEmailAt"),
  lastStreakMilestoneDays: int("lastStreakMilestoneDays").default(0).notNull(),
  lastReEngagementEmailAt: timestamp("lastReEngagementEmailAt"),
  lastWeeklyInsightEmailAt: timestamp("lastWeeklyInsightEmailAt"),
  // Streak freezes (premium: 1/month replenished by cron)
  streakFreezesRemaining: int("streakFreezesRemaining").default(0).notNull(),
  streakFreezeMonthKey: varchar("streakFreezeMonthKey", { length: 7 }), // "YYYY-MM"
  // User preferences (audio, notifications, theme, timezone)
  preferences: json("preferences"),
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
  /** wake = morning alarm; wind_down = evening bedtime ritual */
  kind: mysqlEnum("kind", ["wake", "wind_down"]).default("wake").notNull(),
  // Sound config
  soundType: mysqlEnum("soundType", ["frequency", "studio_mix"])
    .default("frequency")
    .notNull(),
  frequencyHz: float("frequencyHz"),
  frequencyName: varchar("frequencyName", { length: 128 }),
  studioMixName: varchar("studioMixName", { length: 128 }),
  // Wake / wind-down sequence
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

// ─── Healing Frequency Browser Favorites ────────────────────────────────────

export const healingFavorites = mysqlTable(
  "healing_favorites",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    frequencyId: varchar("frequencyId", { length: 64 }).notNull(),
    hz: float("hz").notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.frequencyId)],
);
export type HealingFavorite = typeof healingFavorites.$inferSelect;
export type InsertHealingFavorite = typeof healingFavorites.$inferInsert;

// ─── Subscription Events (RevenueCat webhook log) ─────────────────────────────

export const subscriptionEvents = mysqlTable("subscription_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  revenuecatUserId: varchar("revenuecatUserId", { length: 128 }),
  eventType: varchar("eventType", { length: 64 }).notNull(), // e.g. "INITIAL_PURCHASE"
  productId: varchar("productId", { length: 128 }),
  /** Provider event id for idempotent webhook handling (Stripe evt_… / RC id). */
  externalEventId: varchar("externalEventId", { length: 191 }),
  expiresAt: timestamp("expiresAt"),
  rawPayload: json("rawPayload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;

// ─── Structured Programs ──────────────────────────────────────────────────────

export const userPrograms = mysqlTable(
  "user_programs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Catalog id e.g. "21-days-resonance" | "7-nights-sleep" */
    programId: varchar("programId", { length: 64 }).notNull(),
    currentDay: int("currentDay").default(1).notNull(),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
    abandonedAt: timestamp("abandonedAt"),
  },
  t => [unique().on(t.userId, t.programId)],
);

export type UserProgram = typeof userPrograms.$inferSelect;
export type InsertUserProgram = typeof userPrograms.$inferInsert;

export const programDayCompletions = mysqlTable(
  "program_day_completions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    programId: varchar("programId", { length: 64 }).notNull(),
    dayNumber: int("dayNumber").notNull(),
    completedAt: timestamp("completedAt").defaultNow().notNull(),
    sessionId: int("sessionId"),
    note: text("note"),
  },
  t => [unique().on(t.userId, t.programId, t.dayNumber)],
);

export type ProgramDayCompletion = typeof programDayCompletions.$inferSelect;
export type InsertProgramDayCompletion = typeof programDayCompletions.$inferInsert;

// ─── TrueHz Convert (offline pitch-ratio jobs) ────────────────────────────────

export const convertJobs = mysqlTable("convert_jobs", {
  id: int("id").autoincrement().primaryKey(),
  /** Public job id for API/UI (nanoid). */
  publicId: varchar("publicId", { length: 32 }).notNull().unique(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", [
    "queued",
    "processing",
    "completed",
    "failed",
    "expired",
  ])
    .default("queued")
    .notNull(),
  /** Fine-grained stage for progress UI: queued|downloading|analyzing|retuning|encoding|uploading|done|error */
  stage: varchar("stage", { length: 64 }).default("queued").notNull(),
  progressPct: int("progressPct").default(0).notNull(),
  sourceKey: varchar("sourceKey", { length: 512 }).notNull(),
  sourceFilename: varchar("sourceFilename", { length: 256 }).notNull(),
  sourceDurationSec: float("sourceDurationSec"),
  sourceFormat: varchar("sourceFormat", { length: 32 }),
  sourcePitchA: float("sourcePitchA").default(440).notNull(),
  targetPitchA: float("targetPitchA").notNull(),
  pitchRatio: float("pitchRatio").notNull(),
  cents: float("cents").notNull(),
  hybridEnabled: boolean("hybridEnabled").default(false).notNull(),
  hybridHz: float("hybridHz"),
  hybridGainDb: float("hybridGainDb").default(-18),
  /** Rubber Band formant preservation when pitch-shifting (premium / vocal). */
  formantPreserve: boolean("formantPreserve").default(false).notNull(),
  quality: mysqlEnum("quality", ["standard", "high"]).default("standard").notNull(),
  outputWavKey: varchar("outputWavKey", { length: 512 }),
  outputMp3Key: varchar("outputMp3Key", { length: 512 }),
  errorCode: varchar("errorCode", { length: 64 }),
  errorMessage: text("errorMessage"),
  algorithmVersion: varchar("algorithmVersion", { length: 64 }),
  processingMs: int("processingMs"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConvertJob = typeof convertJobs.$inferSelect;
export type InsertConvertJob = typeof convertJobs.$inferInsert;
