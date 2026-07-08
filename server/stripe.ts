/**
 * Stripe client + price resolution for web billing.
 *
 * Prices are resolved by lookup_key (set by scripts/setup-stripe.ts) so no
 * price IDs are hardcoded. Tiers mirror the RevenueCat mobile SKUs:
 *   rih_premium_monthly  — $7.99/mo subscription
 *   rih_premium_annual   — $49.99/yr subscription, 7-day trial (hero plan)
 *   rih_founder_lifetime — $149.99 one-time, capped at FOUNDER_SEAT_CAP
 */
import Stripe from "stripe";
import { ENV } from "./_core/env";

export const FOUNDER_SEAT_CAP = 500;

export type BillingTier = "monthly" | "annual" | "lifetime";

export const TIER_LOOKUP_KEYS: Record<BillingTier, string> = {
  monthly: "rih_premium_monthly",
  annual: "rih_premium_annual",
  lifetime: "rih_founder_lifetime",
};

let _stripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  // Read process.env directly (not the cached ENV object) so tests can stub it.
  return (process.env.RIH_STRIPE_SECRET_KEY ?? "").length > 0;
}

export function getStripe(): Stripe {
  const key = process.env.RIH_STRIPE_SECRET_KEY ?? ENV.stripeSecretKey;
  if (!key) {
    throw new Error("RIH_STRIPE_SECRET_KEY is not configured");
  }
  if (!_stripe) {
    _stripe = new Stripe(key);
  }
  return _stripe;
}

const priceCache = new Map<string, string>();

/** Resolve a price ID from its lookup key (cached per process). */
export async function getPriceId(tier: BillingTier): Promise<string> {
  const lookupKey = TIER_LOOKUP_KEYS[tier];
  const cached = priceCache.get(lookupKey);
  if (cached) return cached;

  const stripe = getStripe();
  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) {
    throw new Error(
      `No active Stripe price with lookup_key "${lookupKey}" — run scripts/setup-stripe.ts`,
    );
  }
  priceCache.set(lookupKey, price.id);
  return price.id;
}
