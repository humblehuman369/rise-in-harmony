/**
 * One-time (idempotent) Stripe product/price setup for Rise In Harmony.
 *
 * Usage: STRIPE_SECRET_KEY=sk_... pnpm tsx scripts/setup-stripe.ts
 *
 * Creates (or verifies) three prices identified by lookup_key. Safe to re-run:
 * existing lookup_keys are left untouched.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is required");
  process.exit(1);
}
const stripe = new Stripe(key);

type PriceSpec = {
  lookupKey: string;
  productName: string;
  productDescription: string;
  unitAmount: number;
  recurring?: { interval: "month" | "year" };
};

const SPECS: PriceSpec[] = [
  {
    lookupKey: "rih_premium_monthly",
    productName: "Rise In Harmony Premium",
    productDescription:
      "All frequencies, meditations, programs, unlimited alarms, insights, and offline downloads.",
    unitAmount: 799,
    recurring: { interval: "month" },
  },
  {
    lookupKey: "rih_premium_annual",
    productName: "Rise In Harmony Premium",
    productDescription:
      "All frequencies, meditations, programs, unlimited alarms, insights, and offline downloads.",
    unitAmount: 4999,
    recurring: { interval: "year" },
  },
  {
    lookupKey: "rih_founder_lifetime",
    productName: "Rise In Harmony Founder Lifetime",
    productDescription:
      "Everything, forever — plus the founder badge and a roadmap vote. Limited to 500 seats.",
    unitAmount: 14999,
  },
];

async function ensurePrice(spec: PriceSpec) {
  const existing = await stripe.prices.list({
    lookup_keys: [spec.lookupKey],
    limit: 1,
  });
  if (existing.data.length > 0) {
    console.log(`✓ ${spec.lookupKey} already exists (${existing.data[0].id})`);
    return;
  }

  // Reuse the product when two prices share a name (monthly + annual)
  const products = await stripe.products.search({
    query: `name:"${spec.productName}" AND active:"true"`,
    limit: 1,
  });
  const product =
    products.data[0] ??
    (await stripe.products.create({
      name: spec.productName,
      description: spec.productDescription,
      metadata: { app: "rise-in-harmony" },
    }));

  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: spec.unitAmount,
    lookup_key: spec.lookupKey,
    ...(spec.recurring ? { recurring: spec.recurring } : {}),
  });
  console.log(`+ created ${spec.lookupKey} → ${price.id} (product ${product.id})`);
}

async function main() {
  for (const spec of SPECS) {
    await ensurePrice(spec);
  }
  console.log("Stripe setup complete.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
