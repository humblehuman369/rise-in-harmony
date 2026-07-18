/**
 * Central environment configuration.
 *
 * Call `assertCriticalEnv()` once at process start (before accepting traffic)
 * so misconfigured production deploys fail fast instead of running insecurely.
 */

// Platform-injected secrets are base64url-encoded and cryptographically strong
// even at shorter lengths (22 chars ≈ 130 bits entropy). Guard against truly
// empty or trivially short values only.
const MIN_JWT_SECRET_LENGTH = 16;

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  /** Prefer live NODE_ENV so boot checks and tests stay accurate. */
  get isProduction() {
    return isProductionEnv();
  },
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  // RIH_-prefixed on purpose: the Manus platform reserves STRIPE_SECRET_KEY /
  // STRIPE_WEBHOOK_SECRET and injects its own values, which would silently
  // route payments to the wrong Stripe account. No fallback by design.
  stripeSecretKey: process.env.RIH_STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.RIH_STRIPE_WEBHOOK_SECRET ?? "",
  revenuecatWebhookSecret: process.env.REVENUECAT_WEBHOOK_SECRET ?? "",
  /**
   * Comma-separated emails promoted to admin on sign-in — a reliable
   * alternative to OWNER_OPEN_ID (which the platform may not inject).
   */
  adminEmails: (process.env.RIH_ADMIN_EMAILS ?? "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean),
  /** Optional shared secret for POST /api/scheduled/* outside Manus cron. */
  cronSecret: process.env.CRON_SECRET ?? "",
};

/**
 * Fail fast when secrets required for safe operation are missing/weak.
 * In development we warn so local work is not blocked; in production we throw.
 */
export function assertCriticalEnv(): void {
  const production = isProductionEnv();
  const warnings: string[] = [];
  const fatals: string[] = [];

  const secret = process.env.JWT_SECRET ?? "";
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    const message =
      `JWT_SECRET must be set to a strong secret (≥${MIN_JWT_SECRET_LENGTH} characters). ` +
      "Empty or short secrets allow session forgery.";
    if (production) fatals.push(message);
    else warnings.push(message);
  }

  if (!process.env.DATABASE_URL) {
    if (production) fatals.push("DATABASE_URL is required in production");
    else warnings.push("DATABASE_URL is not set — DB features will no-op");
  }

  // Billing webhooks fail closed at the handler, but warn at boot so ops notices.
  if (!process.env.REVENUECAT_WEBHOOK_SECRET) {
    warnings.push(
      "REVENUECAT_WEBHOOK_SECRET is not set — RevenueCat webhooks will be rejected"
    );
  }
  if (production && process.env.RIH_STRIPE_SECRET_KEY && !process.env.RIH_STRIPE_WEBHOOK_SECRET) {
    warnings.push(
      "RIH_STRIPE_SECRET_KEY is set but RIH_STRIPE_WEBHOOK_SECRET is missing — web billing webhooks will fail"
    );
  }

  for (const w of warnings) {
    console.warn(`[Env] WARNING: ${w}`);
  }
  if (fatals.length > 0) {
    throw new Error(`[Env] ${fatals.join(" | ")}`);
  }
}
