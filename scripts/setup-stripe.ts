/**
 * One-time (idempotent) Stripe product/price setup for Rise In Harmony.
 *
 * Usage: RIH_STRIPE_SECRET_KEY=sk_... pnpm tsx scripts/setup-stripe.ts
 *
 * Creates (or verifies) three prices identified by lookup_key plus the
 * production webhook endpoint. Safe to re-run.
 *
 * NOTE: deliberately does NOT read STRIPE_SECRET_KEY — hosting platforms
 * (Manus) reserve that name and inject their own key, which would create
 * everything on the wrong Stripe account.
 */
import Stripe from "stripe";

const key = process.env.RIH_STRIPE_SECRET_KEY;
if (!key) {
  console.error("RIH_STRIPE_SECRET_KEY is required (STRIPE_SECRET_KEY is intentionally ignored)");
  process.exit(1);
}
const stripe = new Stripe(key);

// Fail loudly if this key doesn't belong to the Rise In Harmony account.
const EXPECTED_ACCOUNT = "acct_1TqyXfIxQ2pUcCoN";

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

const WEBHOOK_URL = "https://www.riseinharmony.com/api/stripe/webhook";
const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

async function ensureWebhook() {
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const found = existing.data.find(w => w.url === WEBHOOK_URL);
  if (found) {
    console.log(`✓ webhook already exists (${found.id})`);
    console.log("  (signing secret is only shown at creation — see the Stripe dashboard)");
    return;
  }
  const webhook = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: WEBHOOK_EVENTS,
    description: "Rise In Harmony web billing",
  });
  console.log(`+ created webhook ${webhook.id}`);
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  STRIPE_WEBHOOK_SECRET = ${webhook.secret}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Copy this into the Manus environment settings.");
}

async function main() {
  const account = await stripe.accounts.retrieve();
  console.log(`Connected to Stripe account: ${account.id} (${account.settings?.dashboard?.display_name ?? "unnamed"})`);
  if (account.id !== EXPECTED_ACCOUNT) {
    console.error(
      `ABORT: this key belongs to ${account.id}, not the Rise In Harmony account (${EXPECTED_ACCOUNT}).`,
    );
    process.exit(1);
  }
  for (const spec of SPECS) {
    await ensurePrice(spec);
  }
  await ensureWebhook();
  console.log("Stripe setup complete.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
