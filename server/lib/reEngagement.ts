/**
 * Re-engagement email batch logic — shared by:
 *   - per-user `sessions.checkReEngagement` (legacy)
 *   - bulk cron `/api/scheduled/re-engagement`
 *   - admin `admin.runReEngagementBatch`
 */
import {
  getUserById,
  getUserStats,
  listUsersForReEngagement,
  markReEngagementEmailSent,
} from "../db";
import { sendReEngagementEmail } from "../email";
import { log } from "./logger";

export type ReEngagementSingleResult = {
  sent: boolean;
  daysSinceLast?: number;
  reason?: string;
};

/** Per-user check (idempotent; respects 7-day email cooldown). */
export async function processUserReEngagement(
  userId: number
): Promise<ReEngagementSingleResult> {
  try {
    const [stats, user] = await Promise.all([
      getUserStats(userId),
      getUserById(userId),
    ]);
    if (!stats || !user?.email) {
      return { sent: false, reason: "no_email_or_stats" };
    }

    const recentSessions = stats.recentSessions;
    if (recentSessions.length === 0) {
      return { sent: false, reason: "no_sessions" };
    }

    const lastSession = recentSessions[0];
    const daysSinceLast = Math.floor(
      (Date.now() - new Date(lastSession.startedAt).getTime()) / 86_400_000
    );

    if (daysSinceLast < 7) {
      return { sent: false, daysSinceLast, reason: "still_active" };
    }

    const shouldSend = await markReEngagementEmailSent(userId);
    if (!shouldSend) {
      return { sent: false, daysSinceLast, reason: "cooldown" };
    }

    await sendReEngagementEmail(user.email, user.name || "friend");
    return { sent: true, daysSinceLast };
  } catch (err) {
    log.warn("Re-engagement single-user failed", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { sent: false, reason: "error" };
  }
}

export type ReEngagementBatchResult = {
  candidates: number;
  sent: number;
  skipped: number;
  errors: number;
  details: Array<{ userId: number; sent: boolean; reason?: string }>;
};

/** Bulk job for cron / admin — processes up to `limit` inactive users. */
export async function processReEngagementBatch(
  options: { limit?: number } = {}
): Promise<ReEngagementBatchResult> {
  const candidates = await listUsersForReEngagement({
    inactiveDays: 7,
    cooldownDays: 7,
    limit: options.limit ?? 100,
  });

  let sent = 0;
  let skipped = 0;
  let errors = 0;
  const details: ReEngagementBatchResult["details"] = [];

  for (const candidate of candidates) {
    try {
      const shouldSend = await markReEngagementEmailSent(candidate.id);
      if (!shouldSend) {
        skipped++;
        details.push({ userId: candidate.id, sent: false, reason: "cooldown" });
        continue;
      }
      await sendReEngagementEmail(
        candidate.email,
        candidate.name || "friend"
      );
      sent++;
      details.push({ userId: candidate.id, sent: true });
    } catch (err) {
      errors++;
      details.push({
        userId: candidate.id,
        sent: false,
        reason: err instanceof Error ? err.message : "error",
      });
      log.warn("Re-engagement batch item failed", {
        userId: candidate.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("Re-engagement batch complete", {
    candidates: candidates.length,
    sent,
    skipped,
    errors,
  });

  return {
    candidates: candidates.length,
    sent,
    skipped,
    errors,
    details,
  };
}
