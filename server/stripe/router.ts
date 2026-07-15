import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { getStripe } from "./client";
import { PRODUCTS, ProductKey } from "./products";
import { getDb } from "../db";
import { subscriptions, purchases } from "../../drizzle/schema";
import { activateCheckoutSession } from "./activateCheckout";
import {
  checkoutPaymentMethodOptions,
  getCheckoutPaymentMethodTypes,
  getPaymentMethodsStatus,
} from "./paymentMethods";

function checkoutOrigin(req: { headers: { origin?: string; referer?: string } }) {
  return (
    req.headers.origin ||
    (req.headers.referer
      ? new URL(req.headers.referer).origin
      : "https://chillworks.ai")
  );
}

export const stripeRouter = router({
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        productKey: z.literal("LIFETIME_MEMBERSHIP"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ENV.stripeSecretKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe not configured",
        });
      }
      const product = PRODUCTS[input.productKey as ProductKey];
      const user = ctx.user;
      const origin = checkoutOrigin(ctx.req);
      const stripe = getStripe();
      const paymentMethodTypes = await getCheckoutPaymentMethodTypes(product.currency);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: paymentMethodTypes,
        line_items: [
          {
            price_data: {
              currency: product.currency,
              unit_amount: product.priceInCents,
              product_data: {
                name: product.name,
                description: product.description,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/payment/cancel`,
        customer_email: user.email || undefined,
        client_reference_id: String(user.id),
        metadata: {
          user_id: String(user.id),
          customer_email: user.email || "",
          customer_name: user.name || "",
          product_key: input.productKey,
        },
        allow_promotion_codes: true,
        payment_method_options: checkoutPaymentMethodOptions(paymentMethodTypes),
      });

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    }),

  getPaymentMethods: publicProcedure.query(async () => {
    if (!ENV.stripeSecretKey) {
      return {
        card: true,
        alipay: false,
        wechatPay: false,
        applePay: false,
        googlePay: false,
        paypal: false,
        link: false,
      };
    }
    return getPaymentMethodsStatus();
  }),

  getSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return {
        hasSubscription: false,
        status: null,
        plan: null,
        currentPeriodEnd: null,
      };
    }

    const userSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    if (userSubscription.length === 0) {
      return {
        hasSubscription: false,
        status: null,
        plan: null,
        currentPeriodEnd: null,
      };
    }

    const sub = userSubscription[0];
    const isExpired =
      sub.plan !== "lifetime" &&
      sub.currentPeriodEnd &&
      new Date(sub.currentPeriodEnd) < new Date();

    return {
      hasSubscription: sub.status === "active" && !isExpired,
      status: isExpired ? "expired" : sub.status,
      plan: sub.plan,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  }),

  getPurchaseHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(purchases)
      .where(eq(purchases.userId, ctx.user.id))
      .orderBy(purchases.createdAt);
  }),

  /** Fallback when webhook not configured — call from /payment/success */
  confirmCheckoutSession: protectedProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!ENV.stripeSecretKey) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe not configured" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "db unavailable" });

      const session = await getStripe().checkout.sessions.retrieve(input.sessionId);
      const metaUserId = parseInt(session.metadata?.user_id || "0", 10);
      if (metaUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "session user mismatch" });
      }
      const result = await activateCheckoutSession(db, session);
      return result;
    }),
});
