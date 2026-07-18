/**
 * Subscription entitlement helpers — single place for "is this user premium?"
 * Always respects subscriptionExpiresAt so cancelled/expired tiers do not linger.
 */
import type { User } from "../../drizzle/schema";

export type EntitlementTier = "free" | "premium" | "lifetime";

export function isSubscriptionActive(
  tier: string | null | undefined,
  expiresAt: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (tier === "lifetime") return true;
  if (tier !== "premium") return false;
  if (!expiresAt) return true; // premium with no expiry (e.g. provisional) treated active
  return expiresAt.getTime() > now.getTime();
}

export function isUserPremium(
  user:
    | Pick<User, "subscriptionTier" | "subscriptionExpiresAt" | "role">
    | Pick<User, "subscriptionTier" | "subscriptionExpiresAt">
    | null
    | undefined,
  now: Date = new Date()
): boolean {
  if (!user) return false;
  // Admins get full product access (Convert Pro limits, hybrid, etc.)
  if ("role" in user && user.role === "admin") return true;
  return isSubscriptionActive(user.subscriptionTier, user.subscriptionExpiresAt, now);
}

/** Effective tier after applying expiry (does not write DB). */
export function effectiveTier(
  user: Pick<User, "subscriptionTier" | "subscriptionExpiresAt">,
  now: Date = new Date()
): EntitlementTier {
  if (user.subscriptionTier === "lifetime") return "lifetime";
  if (isSubscriptionActive(user.subscriptionTier, user.subscriptionExpiresAt, now)) {
    return "premium";
  }
  return "free";
}
