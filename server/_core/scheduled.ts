/**
 * Scheduled (cron) HTTP handlers.
 *
 * Paths MUST start with `/api/scheduled/` for Manus Heartbeat jobs.
 * Auth: Manus cron session (`user.isCron`) OR `Authorization: Bearer $CRON_SECRET`.
 *
 * See references/periodic-updates.md.
 */
import type { Express, Request, Response } from "express";
import { createHash, timingSafeEqual } from "crypto";
import { sdk } from "./sdk";
import { processReEngagementBatch } from "../lib/reEngagement";
import {
  ensureMonthlyStreakFreeze,
  getDb,
  getUserSessions,
  listUsersForWeeklyInsights,
  markWeeklyInsightEmailSent,
} from "../db";
import { computeWeeklyInsights } from "../lib/insights";
import { sendWeeklyInsightEmail } from "../email";
import { log } from "../lib/logger";
import { sql } from "drizzle-orm";
import { users } from "../../drizzle/schema";

function safeEqualSecret(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

async function authorizeCron(req: Request): Promise<boolean> {
  // 1. Shared secret (works outside Manus platform)
  const cronSecret = process.env.CRON_SECRET ?? "";
  const authHeader = req.headers.authorization;
  if (
    cronSecret &&
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ") &&
    safeEqualSecret(authHeader.slice(7), cronSecret)
  ) {
    return true;
  }

  // 2. Manus Heartbeat / agent cron identity
  try {
    const user = await sdk.authenticateRequest(req);
    if (user.isCron && user.taskUid) return true;
  } catch {
    // fall through
  }

  return false;
}

export function registerScheduledRoutes(app: Express) {
  /**
   * Daily re-engagement batch.
   * Suggested cron: `0 0 15 * * *` (15:00 UTC) via Manus Heartbeat or external cron.
   */
  app.post("/api/scheduled/re-engagement", async (req: Request, res: Response) => {
    try {
      const ok = await authorizeCron(req);
      if (!ok) {
        res.status(403).json({ error: "cron-only" });
        return;
      }

      const limitRaw = req.body?.limit;
      const limit =
        typeof limitRaw === "number" && limitRaw > 0
          ? Math.min(limitRaw, 500)
          : 100;

      const result = await processReEngagementBatch({ limit });
      res.json({ ok: true, ...result });
    } catch (err) {
      log.error("Scheduled re-engagement failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({
        error: err instanceof Error ? err.message : "handler failed",
        stack: err instanceof Error ? err.stack : undefined,
        context: { url: req.originalUrl },
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * Weekly insight emails + monthly streak-freeze replenishment for premium users.
   * Suggested cron: `0 0 14 * * 1` (Monday 14:00 UTC).
   */
  app.post("/api/scheduled/weekly-insights", async (req: Request, res: Response) => {
    try {
      const ok = await authorizeCron(req);
      if (!ok) {
        res.status(403).json({ error: "cron-only" });
        return;
      }

      // Replenish freezes for premium users (idempotent per month)
      const db = await getDb();
      let freezesRefreshed = 0;
      if (db) {
        const premiumUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(sql`subscriptionTier IN ('premium','lifetime')`)
          .limit(500);
        for (const u of premiumUsers) {
          await ensureMonthlyStreakFreeze(u.id);
          freezesRefreshed++;
        }
      }

      const candidates = await listUsersForWeeklyInsights(80);
      let sent = 0;
      let skipped = 0;
      for (const c of candidates) {
        const sessions = await getUserSessions(c.id, 60);
        if (sessions.length < 2) {
          skipped++;
          continue;
        }
        const insights = computeWeeklyInsights(sessions);
        // Skip unless insights have enough signal AND at least one mood log
        // (ready can be true from session count alone with no mood analytics).
        if (!insights.ready || insights.moodLoggedCount < 1) {
          skipped++;
          continue;
        }
        const should = await markWeeklyInsightEmailSent(c.id);
        if (!should) {
          skipped++;
          continue;
        }
        const top = insights.topMoodFrequency
          ? `Your logged mood after ${insights.topMoodFrequency.frequencyHz} Hz averaged ${insights.topMoodFrequency.avgMood}/5.`
          : undefined;
        const time = insights.bestTimeOfDay
          ? `Your ${insights.bestTimeOfDay.bucket} sessions averaged mood ${insights.bestTimeOfDay.avgMood}/5.`
          : undefined;
        await sendWeeklyInsightEmail(c.email, c.name || "friend", {
          minutesThisWeek: insights.minutesThisWeek,
          topFrequencyLabel: top,
          bestTimeOfDay: time,
          coachingLine: insights.coaching.find(l => l.includes("averaged") || l.includes("minutes")),
        });
        sent++;
      }

      res.json({ ok: true, freezesRefreshed, sent, skipped, candidates: candidates.length });
    } catch (err) {
      log.error("Scheduled weekly-insights failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({
        error: err instanceof Error ? err.message : "handler failed",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
