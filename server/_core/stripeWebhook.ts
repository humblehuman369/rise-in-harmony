/**
 * Stripe webhook — mirrors subscription state into users.subscriptionTier.
 *
 * Registered with a raw body parser because Stripe signature verification
 * requires the exact bytes. Handles:
 *   checkout.session.completed        → premium (sub) or lifetime (payment)
 *   customer.subscription.updated     → premium + expiry refresh
 *   customer.subscription.deleted     → free
 *   invoice.payment_failed            → logged only (Stripe retries/dunning)
 */
import type { Express, Request, Response } from "express";
import express from "express";
import type Stripe from "stripe";
import {
  getUserByStripeCustomerId,
  logSubscriptionEvent,
  updateUserSubscription,
} from "../db";
import { getStripe, isStripeConfigured } from "../stripe";
import { ENV } from "./env";
import { sendReceiptEmail } from "../email";

async function resolveUserId(
  event: { rihUserId?: string | null },
  customerId: string | null,
): Promise<number | null> {
  const fromMeta = event.rihUserId ? parseInt(event.rihUserId, 10) : NaN;
  if (!isNaN(fromMeta)) return fromMeta;
  if (customerId) {
    const user = await getUserByStripeCustomerId(customerId);
    if (user) return user.id;
  }
  return null;
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = await resolveUserId(
        { rihUserId: session.metadata?.rihUserId ?? session.client_reference_id },
        typeof session.customer === "string" ? session.customer : null,
      );
      if (userId === null) break;

      const tier = session.mode === "payment" ? "lifetime" : "premium";
      // Subscriptions get their real expiry from subscription.updated below;
      // set a provisional expiry so entitlement is instant after checkout.
      const expiresAt =
        tier === "lifetime"
          ? null
          : new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
      await updateUserSubscription(userId, tier, expiresAt);
      await logSubscriptionEvent({
        userId,
        eventType: `stripe.${event.type}`,
        productId: session.metadata?.tier ?? undefined,
        expiresAt: expiresAt ?? undefined,
        rawPayload: { id: session.id, mode: session.mode },
      });

      const email = session.customer_details?.email;
      if (email) {
        const label = tier === "lifetime" ? "Founder Lifetime" : "Premium";
        const name = session.customer_details?.name ?? "Friend";
        const amount = `$${((session.amount_total ?? 0) / 100).toFixed(2)}`;
        sendReceiptEmail(email, name, label, amount).catch(console.error);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      const userId = await resolveUserId(
        { rihUserId: sub.metadata?.rihUserId },
        typeof sub.customer === "string" ? sub.customer : null,
      );
      if (userId === null) break;

      const active = sub.status === "active" || sub.status === "trialing";
      const periodEnd = sub.items.data[0]?.current_period_end;
      const expiresAt = periodEnd ? new Date(periodEnd * 1000) : null;
      await updateUserSubscription(userId, active ? "premium" : "free", active ? expiresAt : null);
      await logSubscriptionEvent({
        userId,
        eventType: `stripe.${event.type}`,
        expiresAt: expiresAt ?? undefined,
        rawPayload: { id: sub.id, status: sub.status },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const userId = await resolveUserId(
        { rihUserId: sub.metadata?.rihUserId },
        typeof sub.customer === "string" ? sub.customer : null,
      );
      if (userId === null) break;
      await updateUserSubscription(userId, "free", null);
      await logSubscriptionEvent({
        userId,
        eventType: `stripe.${event.type}`,
        rawPayload: { id: sub.id },
      });
      break;
    }

    default: {
      // Ignore unhandled event types; Stripe only sends what we subscribe to.
      break;
    }
  }
}

export function registerStripeWebhook(app: Express) {
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      if (!isStripeConfigured() || !ENV.stripeWebhookSecret) {
        res.status(503).json({ error: "Stripe not configured" });
        return;
      }

      const signature = req.headers["stripe-signature"];
      if (typeof signature !== "string") {
        res.status(400).json({ error: "Missing signature" });
        return;
      }

      let event: Stripe.Event;
      try {
        event = getStripe().webhooks.constructEvent(
          req.body,
          signature,
          ENV.stripeWebhookSecret,
        );
      } catch (err) {
        console.error("[StripeWebhook] signature verification failed:", err);
        res.status(400).json({ error: "Invalid signature" });
        return;
      }

      try {
        await handleEvent(event);
        res.json({ received: true });
      } catch (err) {
        console.error("[StripeWebhook] handler error:", err);
        // 500 → Stripe retries with backoff
        res.status(500).json({ error: "Webhook handler failed" });
      }
    },
  );
}
