/**
 * Resend email service for Rise In Harmony
 * Handles 6 transactional email templates from the development plan
 */
import { Resend } from "resend";
import { escapeHtml } from "./lib/htmlEscape";
import { log } from "./lib/logger";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "hello@riseinharmony.app";
const APP_URL = process.env.APP_URL || "https://riseinharmony.app";

// ─── Email Templates ──────────────────────────────────────────────────────────

/** Welcome email sent after first login / onboarding completion */
export async function sendWelcomeEmail(to: string, name: string, goal: string) {
  if (!resend) {
    log.info("Resend not configured — skipping welcome email");
    return;
  }
  const goalLabel: Record<string, string> = {
    sleep: "better sleep",
    stress: "stress relief",
    focus: "deep focus",
    morning: "morning energy",
    spiritual: "spiritual growth",
    healing: "physical healing",
  };
  const safeName = escapeHtml(name);
  const safeGoal = escapeHtml(goalLabel[goal] || goal);
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to Rise In Harmony 🎵",
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #0A0B14; color: #E8EDF5; padding: 40px 32px; border-radius: 12px;">
        <h1 style="font-family: Georgia, serif; font-size: 28px; color: #00D4AA; margin-bottom: 8px;">Welcome, ${safeName}.</h1>
        <p style="color: #8FA3BF; font-size: 16px; line-height: 1.6;">
          You've joined Rise In Harmony with a goal of <strong style="color: #E8EDF5;">${safeGoal}</strong>.
          Your first recommended frequency is ready to play.
        </p>
        <a href="${APP_URL}/player" style="display: inline-block; margin-top: 24px; padding: 14px 28px; background: #00D4AA; color: #0A0B14; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 15px;">
          Start Your First Session →
        </a>
        <p style="color: #4A5568; font-size: 12px; margin-top: 32px;">
          Rise In Harmony · Begin every morning in resonance.
        </p>
      </div>
    `,
  });
  log.info("Welcome email sent", { to });
}

/** Sent 2 days before a trial expires */
export async function sendTrialEndingEmail(to: string, name: string, expiresAt: Date) {
  if (!resend) {
    log.info("Resend not configured — skipping trial ending email");
    return;
  }
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86400000);
  const safeName = escapeHtml(name);
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your Rise In Harmony trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #0A0B14; color: #E8EDF5; padding: 40px 32px; border-radius: 12px;">
        <h1 style="font-family: Georgia, serif; font-size: 24px; color: #F59E0B;">Your trial ends soon.</h1>
        <p style="color: #8FA3BF; font-size: 16px; line-height: 1.6;">
          Hi ${safeName}, your Rise In Harmony premium trial expires in <strong style="color: #E8EDF5;">${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>.
          Keep access to the full frequency library, binaural beats, and the Sound Studio.
        </p>
        <a href="${APP_URL}/premium" style="display: inline-block; margin-top: 24px; padding: 14px 28px; background: #8B5CF6; color: #fff; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 15px;">
          Continue Premium — $7.99/mo →
        </a>
      </div>
    `,
  });
  log.info("Trial ending email sent", { to });
}

/** Sent when a subscription payment is confirmed */
export async function sendReceiptEmail(
  to: string,
  name: string,
  tier: string,
  amount: string
) {
  if (!resend) {
    log.info("Resend not configured — skipping receipt email");
    return;
  }
  const safeName = escapeHtml(name);
  const safeTier = escapeHtml(tier);
  const safeAmount = escapeHtml(amount);
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Your Rise In Harmony receipt",
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #0A0B14; color: #E8EDF5; padding: 40px 32px; border-radius: 12px;">
        <h1 style="font-family: Georgia, serif; font-size: 24px; color: #00D4AA;">Payment confirmed.</h1>
        <p style="color: #8FA3BF; font-size: 16px;">Hi ${safeName}, thank you for subscribing to Rise In Harmony ${safeTier}.</p>
        <div style="background: #12152A; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; color: #E8EDF5;">
            <span>Rise In Harmony ${safeTier}</span>
            <span style="color: #00D4AA; font-weight: 700;">${safeAmount}</span>
          </div>
        </div>
        <a href="${APP_URL}" style="display: inline-block; margin-top: 16px; padding: 14px 28px; background: #00D4AA; color: #0A0B14; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 15px;">
          Open App →
        </a>
      </div>
    `,
  });
  log.info("Receipt email sent", { to });
}

/** Sent when user reaches a 7-day streak milestone */
export async function sendStreakMilestoneEmail(
  to: string,
  name: string,
  streakDays: number
) {
  if (!resend) {
    log.info("Resend not configured — skipping streak email");
    return;
  }
  const safeName = escapeHtml(name);
  const days = Number.isFinite(streakDays) ? Math.floor(streakDays) : 0;
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `🔥 ${days}-day streak! You're rising in harmony.`,
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #0A0B14; color: #E8EDF5; padding: 40px 32px; border-radius: 12px;">
        <h1 style="font-family: Georgia, serif; font-size: 28px; color: #F59E0B;">🔥 ${days} days in a row.</h1>
        <p style="color: #8FA3BF; font-size: 16px; line-height: 1.6;">
          ${safeName}, you've maintained your wellness practice for ${days} consecutive days.
          Consistency is where lasting habits form.
        </p>
        <a href="${APP_URL}/dashboard" style="display: inline-block; margin-top: 24px; padding: 14px 28px; background: #F59E0B; color: #0A0B14; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 15px;">
          View Your Journey →
        </a>
      </div>
    `,
  });
  log.info("Streak milestone email sent", { to, streakDays: days });
}

/** Weekly resonance insight summary (descriptive only — no medical claims). */
export async function sendWeeklyInsightEmail(
  to: string,
  name: string,
  summary: {
    minutesThisWeek: number;
    topFrequencyLabel?: string;
    bestTimeOfDay?: string;
    coachingLine?: string;
  }
) {
  if (!resend) {
    log.info("Resend not configured — skipping weekly insight email");
    return;
  }
  const safeName = escapeHtml(name);
  const lines: string[] = [];
  lines.push(
    `You logged <strong style="color:#E8EDF5;">${summary.minutesThisWeek} minutes</strong> of listening this week.`
  );
  if (summary.topFrequencyLabel) {
    lines.push(escapeHtml(summary.topFrequencyLabel));
  }
  if (summary.bestTimeOfDay) {
    lines.push(escapeHtml(summary.bestTimeOfDay));
  }
  if (summary.coachingLine) {
    lines.push(escapeHtml(summary.coachingLine));
  }
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Your week in resonance",
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #0A0B14; color: #E8EDF5; padding: 40px 32px; border-radius: 12px;">
        <h1 style="font-family: Georgia, serif; font-size: 24px; color: #00D4AA;">Your Resonance, ${safeName}</h1>
        <p style="color: #8FA3BF; font-size: 16px; line-height: 1.6;">
          ${lines.join("</p><p style=\"color:#8FA3BF;font-size:16px;line-height:1.6;\">")}
        </p>
        <p style="color: #6B7A99; font-size: 13px; margin-top: 16px;">
          These numbers describe your logged sessions only — not medical advice.
        </p>
        <a href="${APP_URL}/dashboard" style="display: inline-block; margin-top: 24px; padding: 14px 28px; background: #00D4AA; color: #0A0B14; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 15px;">
          Open Dashboard →
        </a>
      </div>
    `,
  });
  log.info("Weekly insight email sent", { to });
}

/** TrueHz Convert — job finished and ready to download */
export async function sendConvertJobReadyEmail(
  to: string,
  name: string,
  details: {
    filename: string;
    sourcePitchA: number;
    targetPitchA: number;
    cents: number;
    hybridHz?: number | null;
    jobId: string;
  },
) {
  if (!resend) {
    log.info("Resend not configured — skipping convert ready email");
    return;
  }
  const safeName = escapeHtml(name);
  const safeFile = escapeHtml(details.filename);
  const cents =
    details.cents > 0
      ? `+${details.cents.toFixed(2)}`
      : details.cents.toFixed(2);
  const hybridLine =
    details.hybridHz != null
      ? `<p style="color:#8FA3BF;font-size:14px;line-height:1.5;">TrueHz™ pure-tone bed: <strong style="color:#E8EDF5;">${Number(details.hybridHz).toFixed(2)} Hz</strong> (exact layer only).</p>`
      : "";
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your track is ready — ${details.filename.slice(0, 60)}`,
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #0A0B14; color: #E8EDF5; padding: 40px 32px; border-radius: 12px;">
        <h1 style="font-family: Georgia, serif; font-size: 24px; color: #00D4AA;">Convert complete.</h1>
        <p style="color: #8FA3BF; font-size: 16px; line-height: 1.6;">
          Hi ${safeName}, <strong style="color:#E8EDF5;">${safeFile}</strong> has been retuned
          from A=${details.sourcePitchA} to A=${details.targetPitchA}
          (<strong style="color:#E8EDF5;">${escapeHtml(cents)} ¢</strong>).
        </p>
        ${hybridLine}
        <p style="color: #6B7A99; font-size: 13px; line-height: 1.5;">
          This is a pitch-ratio retune of your upload — not a claim that the whole mix is a pure TrueHz tone.
        </p>
        <a href="${APP_URL}/convert?job=${encodeURIComponent(details.jobId)}" style="display: inline-block; margin-top: 24px; padding: 14px 28px; background: #00D4AA; color: #0A0B14; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 15px;">
          Open Convert library →
        </a>
        <p style="color: #4A5568; font-size: 12px; margin-top: 32px;">
          Rise In Harmony · TrueHz Convert
        </p>
      </div>
    `,
  });
  log.info("Convert ready email sent", { to, jobId: details.jobId });
}

/** Re-engagement email sent after 7 days of inactivity */
export async function sendReEngagementEmail(to: string, name: string) {
  if (!resend) {
    log.info("Resend not configured — skipping re-engagement email");
    return;
  }
  const safeName = escapeHtml(name);
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Your frequencies are waiting, " + name.replace(/[\r\n]/g, " ").slice(0, 80),
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #0A0B14; color: #E8EDF5; padding: 40px 32px; border-radius: 12px;">
        <h1 style="font-family: Georgia, serif; font-size: 24px; color: #8B5CF6;">We miss you, ${safeName}.</h1>
        <p style="color: #8FA3BF; font-size: 16px; line-height: 1.6;">
          It's been a few days since your last session. Even 5 minutes of 528Hz
          can help you reset. Your frequencies are ready when you are.
        </p>
        <a href="${APP_URL}/player" style="display: inline-block; margin-top: 24px; padding: 14px 28px; background: #8B5CF6; color: #fff; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 15px;">
          Return to Harmony →
        </a>
      </div>
    `,
  });
  log.info("Re-engagement email sent", { to });
}
