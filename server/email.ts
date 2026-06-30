/**
 * Resend email service for Rise In Harmony
 * Handles 6 transactional email templates from the development plan
 */
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "hello@riseinharmony.app";
const APP_URL = process.env.APP_URL || "https://riseinharmony.app";

function log(msg: string) {
  console.log(`[Email] ${msg}`);
}

// ─── Email Templates ──────────────────────────────────────────────────────────

/** Welcome email sent after first login / onboarding completion */
export async function sendWelcomeEmail(to: string, name: string, goal: string) {
  if (!resend) { log("Resend not configured — skipping welcome email"); return; }
  const goalLabel: Record<string, string> = {
    sleep: "better sleep",
    stress: "stress relief",
    focus: "deep focus",
    morning: "morning energy",
    spiritual: "spiritual growth",
    healing: "physical healing",
  };
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to Rise In Harmony 🎵",
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #0A0B14; color: #E8EDF5; padding: 40px 32px; border-radius: 12px;">
        <h1 style="font-family: Georgia, serif; font-size: 28px; color: #00D4AA; margin-bottom: 8px;">Welcome, ${name}.</h1>
        <p style="color: #8FA3BF; font-size: 16px; line-height: 1.6;">
          You've joined Rise In Harmony with a goal of <strong style="color: #E8EDF5;">${goalLabel[goal] || goal}</strong>.
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
  log(`Welcome email sent to ${to}`);
}

/** Sent 2 days before a trial expires */
export async function sendTrialEndingEmail(to: string, name: string, expiresAt: Date) {
  if (!resend) { log("Resend not configured — skipping trial ending email"); return; }
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86400000);
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your Rise In Harmony trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #0A0B14; color: #E8EDF5; padding: 40px 32px; border-radius: 12px;">
        <h1 style="font-family: Georgia, serif; font-size: 24px; color: #F59E0B;">Your trial ends soon.</h1>
        <p style="color: #8FA3BF; font-size: 16px; line-height: 1.6;">
          Hi ${name}, your Rise In Harmony premium trial expires in <strong style="color: #E8EDF5;">${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>.
          Keep access to all 13 healing frequencies, binaural beats, and the full Sound Studio.
        </p>
        <a href="${APP_URL}/premium" style="display: inline-block; margin-top: 24px; padding: 14px 28px; background: #8B5CF6; color: #fff; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 15px;">
          Continue Premium — $7.99/mo →
        </a>
      </div>
    `,
  });
  log(`Trial ending email sent to ${to}`);
}

/** Sent when a subscription payment is confirmed */
export async function sendReceiptEmail(
  to: string,
  name: string,
  tier: string,
  amount: string
) {
  if (!resend) { log("Resend not configured — skipping receipt email"); return; }
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Your Rise In Harmony receipt",
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #0A0B14; color: #E8EDF5; padding: 40px 32px; border-radius: 12px;">
        <h1 style="font-family: Georgia, serif; font-size: 24px; color: #00D4AA;">Payment confirmed.</h1>
        <p style="color: #8FA3BF; font-size: 16px;">Hi ${name}, thank you for subscribing to Rise In Harmony ${tier}.</p>
        <div style="background: #12152A; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; color: #E8EDF5;">
            <span>Rise In Harmony ${tier}</span>
            <span style="color: #00D4AA; font-weight: 700;">${amount}</span>
          </div>
        </div>
        <a href="${APP_URL}" style="display: inline-block; margin-top: 16px; padding: 14px 28px; background: #00D4AA; color: #0A0B14; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 15px;">
          Open App →
        </a>
      </div>
    `,
  });
  log(`Receipt email sent to ${to}`);
}

/** Sent when user reaches a 7-day streak milestone */
export async function sendStreakMilestoneEmail(
  to: string,
  name: string,
  streakDays: number
) {
  if (!resend) { log("Resend not configured — skipping streak email"); return; }
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `🔥 ${streakDays}-day streak! You're rising in harmony.`,
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #0A0B14; color: #E8EDF5; padding: 40px 32px; border-radius: 12px;">
        <h1 style="font-family: Georgia, serif; font-size: 28px; color: #F59E0B;">🔥 ${streakDays} days in a row.</h1>
        <p style="color: #8FA3BF; font-size: 16px; line-height: 1.6;">
          ${name}, you've maintained your healing practice for ${streakDays} consecutive days.
          This consistency is where transformation happens.
        </p>
        <a href="${APP_URL}/dashboard" style="display: inline-block; margin-top: 24px; padding: 14px 28px; background: #F59E0B; color: #0A0B14; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 15px;">
          View Your Journey →
        </a>
      </div>
    `,
  });
  log(`Streak milestone email (${streakDays} days) sent to ${to}`);
}

/** Re-engagement email sent after 7 days of inactivity */
export async function sendReEngagementEmail(to: string, name: string) {
  if (!resend) { log("Resend not configured — skipping re-engagement email"); return; }
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Your frequencies are waiting, " + name,
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #0A0B14; color: #E8EDF5; padding: 40px 32px; border-radius: 12px;">
        <h1 style="font-family: Georgia, serif; font-size: 24px; color: #8B5CF6;">We miss you, ${name}.</h1>
        <p style="color: #8FA3BF; font-size: 16px; line-height: 1.6;">
          It's been a few days since your last healing session. Even 5 minutes of 528Hz
          can shift your energy. Your frequencies are ready when you are.
        </p>
        <a href="${APP_URL}/player" style="display: inline-block; margin-top: 24px; padding: 14px 28px; background: #8B5CF6; color: #fff; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 15px;">
          Return to Harmony →
        </a>
      </div>
    `,
  });
  log(`Re-engagement email sent to ${to}`);
}
