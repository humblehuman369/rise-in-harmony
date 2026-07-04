/**
 * RevenueCat REST API client — promotional ("granted") entitlements.
 *
 * Used by the admin dashboard so that comped memberships are authoritative in
 * RevenueCat, not just our database. RevenueCat then:
 *   - exposes the entitlement to the mobile SDK immediately
 *   - auto-revokes it when the granted period ends
 *   - fires a NON_RENEWING_PURCHASE webhook (store/period_type PROMOTIONAL)
 *     that our webhook handler maps back into the users table
 *
 * Requires REVENUECAT_SECRET_KEY (a secret `sk_` key — server-side only).
 * When the key is not configured, callers fall back to database-only grants.
 */

const API_BASE = "https://api.revenuecat.com/v1";

/** The entitlement identifier configured in RevenueCat. */
const ENTITLEMENT_ID = "premium";

function secretKey(): string | undefined {
  return process.env.REVENUECAT_SECRET_KEY || undefined;
}

export function isRevenueCatConfigured(): boolean {
  return Boolean(secretKey());
}

/**
 * Grant the premium entitlement to a RevenueCat app user.
 * Pass `endTimeMs` for a time-limited grant, or omit for lifetime.
 * Returns true on success, false on API failure (caller decides fallback).
 */
export async function grantPromotionalEntitlement(
  appUserId: string,
  endTimeMs?: number
): Promise<boolean> {
  const key = secretKey();
  if (!key) return false;

  const body = endTimeMs !== undefined ? { end_time_ms: endTimeMs } : { duration: "lifetime" };

  try {
    const res = await fetch(
      `${API_BASE}/subscribers/${encodeURIComponent(appUserId)}/entitlements/${ENTITLEMENT_ID}/promotional`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      console.error(
        `[RevenueCat] Grant failed for ${appUserId}: ${res.status} ${await res.text()}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[RevenueCat] Grant request error for ${appUserId}:`, error);
    return false;
  }
}

/**
 * Revoke all promotional grants of the premium entitlement for a user.
 * (Store purchases are unaffected — those can only be cancelled by the store.)
 */
export async function revokePromotionalEntitlement(appUserId: string): Promise<boolean> {
  const key = secretKey();
  if (!key) return false;

  try {
    const res = await fetch(
      `${API_BASE}/subscribers/${encodeURIComponent(appUserId)}/entitlements/${ENTITLEMENT_ID}/revoke_promotionals`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
      }
    );
    if (!res.ok) {
      console.error(
        `[RevenueCat] Revoke failed for ${appUserId}: ${res.status} ${await res.text()}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[RevenueCat] Revoke request error for ${appUserId}:`, error);
    return false;
  }
}
