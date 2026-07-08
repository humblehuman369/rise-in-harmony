/**
 * Web billing via Stripe Checkout + Customer Portal.
 *
 * Mobile billing stays on RevenueCat; both write users.subscriptionTier,
 * which is the single source of truth for entitlements everywhere.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { countFounderUsers, getUserById, setStripeCustomerId } from "../db";
import {
  FOUNDER_SEAT_CAP,
  getPriceId,
  getStripe,
  isStripeConfigured,
  type BillingTier,
} from "../stripe";

const tierSchema = z.enum(["monthly", "annual", "lifetime"]);

function appBaseUrl(req: { protocol: string; headers: Record<string, unknown> }): string {
  const host = (req.headers["x-forwarded-host"] ?? req.headers["host"]) as string;
  const proto = (req.headers["x-forwarded-proto"] as string) ?? req.protocol ?? "https";
  return `${proto}://${host}`;
}

async function getOrCreateCustomer(userId: number): Promise<string> {
  const user = await getUserById(userId);
  if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    metadata: { rihUserId: String(userId) },
  });
  await setStripeCustomerId(userId, customer.id);
  return customer.id;
}

export const billingRouter = router({
  /** Pricing/config state the paywall needs before rendering CTAs. */
  config: publicProcedure.query(async () => {
    const configured = isStripeConfigured();
    let founderSeatsRemaining: number | null = null;
    if (configured) {
      try {
        const sold = await countFounderUsers();
        founderSeatsRemaining = Math.max(0, FOUNDER_SEAT_CAP - sold);
      } catch {
        founderSeatsRemaining = null;
      }
    }
    return { enabled: configured, founderSeatCap: FOUNDER_SEAT_CAP, founderSeatsRemaining };
  }),

  createCheckoutSession: protectedProcedure
    .input(z.object({ tier: tierSchema }))
    .mutation(async ({ ctx, input }) => {
      if (!isStripeConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Billing is not configured yet",
        });
      }

      const tier = input.tier as BillingTier;

      // Enforce the founder cap server-side before creating a session
      if (tier === "lifetime") {
        const sold = await countFounderUsers();
        if (sold >= FOUNDER_SEAT_CAP) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "All founder lifetime seats have been claimed",
          });
        }
      }

      const stripe = getStripe();
      const customerId = await getOrCreateCustomer(ctx.user.id);
      const priceId = await getPriceId(tier);
      const base = appBaseUrl(ctx.req);

      const session = await stripe.checkout.sessions.create({
        mode: tier === "lifetime" ? "payment" : "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        ...(tier === "annual"
          ? { subscription_data: { trial_period_days: 7 } }
          : {}),
        allow_promotion_codes: true,
        client_reference_id: String(ctx.user.id),
        metadata: { rihUserId: String(ctx.user.id), tier },
        success_url: `${base}/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/library?billing=cancelled`,
      });

      return { url: session.url };
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    if (!isStripeConfigured()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Billing is not configured yet",
      });
    }
    const user = await getUserById(ctx.user.id);
    if (!user?.stripeCustomerId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No billing account on file",
      });
    }
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appBaseUrl(ctx.req)}/dashboard`,
    });
    return { url: session.url };
  }),
});
