import { Request, Response, Router } from "express";
import { getStripe } from "./client";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import Stripe from "stripe";
import { activateCheckoutSession } from "./activateCheckout";

const webhookRouter = Router();

webhookRouter.post(
  "/api/stripe/webhook",
  async (req: Request, res: Response) => {
    if (!ENV.stripeWebhookSecret) {
      console.error("[Webhook] STRIPE_WEBHOOK_SECRET not configured");
      return res.status(503).send("Webhook secret not configured");
    }

    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(
        req.body,
        sig,
        ENV.stripeWebhookSecret
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Webhook] Signature verification failed:", message);
      return res.status(400).send(`Webhook Error: ${message}`);
    }

    if (event.id.startsWith("evt_test_")) {
      return res.json({ verified: true });
    }

    console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

    const db = await getDb();
    if (!db) {
      console.error("[Webhook] Database not available");
      return res.status(500).send("Database not available");
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const result = await activateCheckoutSession(db, session);
          console.log(
            `[Webhook] checkout.session.completed user=${session.metadata?.user_id} ok=${result.ok} plan=${result.plan ?? "none"}`
          );
          break;
        }

        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("[Webhook] Error processing event:", error);
      res.status(500).send("Webhook processing error");
    }
  }
);

export { webhookRouter };
