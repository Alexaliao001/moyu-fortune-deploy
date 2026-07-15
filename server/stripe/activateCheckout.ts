import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import type { getDb } from "../db";
import { purchases, subscriptions } from "../../drizzle/schema";
import { ProductKey, PRODUCTS } from "./products";

export function getMembershipDuration(productKey: string): number {
  const product = PRODUCTS[productKey as ProductKey];
  if (product && "durationDays" in product) {
    return product.durationDays;
  }
  return 0;
}

export function getMembershipPlan(
  productKey: string
): "monthly" | "quarterly" | "annual" | "lifetime" | null {
  return productKey === "LIFETIME_MEMBERSHIP" ? "lifetime" : null;
}

export async function activateCheckoutSession(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  session: Stripe.Checkout.Session
): Promise<{ ok: boolean; plan?: string | null; alreadyProcessed?: boolean }> {
  const userId = parseInt(session.metadata?.user_id || "0", 10);
  const productKey = session.metadata?.product_key || "";
  if (!userId || session.payment_status !== "paid") {
    return { ok: false };
  }

  if (session.mode !== "payment") {
    return { ok: false };
  }

  const paymentIntentId = String(session.payment_intent || "");
  const customerId = session.customer ? String(session.customer) : "";

  if (paymentIntentId) {
    const dup = await db
      .select({ id: purchases.id })
      .from(purchases)
      .where(eq(purchases.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    if (dup.length > 0) {
      const plan = getMembershipPlan(productKey);
      return { ok: true, plan, alreadyProcessed: true as const };
    }
  }

  await db.insert(purchases).values({
    userId,
    stripePaymentIntentId: paymentIntentId || null,
    productType: productKey || "detailed_report",
    status: "completed",
  });

  const plan = getMembershipPlan(productKey);
  if (!plan) {
    return { ok: true, plan: null };
  }

  const durationDays = getMembershipDuration(productKey);
  const existingSub = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  let periodEnd: Date;
  if (durationDays === -1) {
    periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 100);
  } else {
    const now = new Date();
    let startDate = now;
    if (
      existingSub.length > 0 &&
      existingSub[0].status === "active" &&
      existingSub[0].currentPeriodEnd &&
      new Date(existingSub[0].currentPeriodEnd) > now
    ) {
      startDate = new Date(existingSub[0].currentPeriodEnd);
    }
    periodEnd = new Date(startDate);
    periodEnd.setDate(periodEnd.getDate() + durationDays);
  }

  if (existingSub.length > 0) {
    await db
      .update(subscriptions)
      .set({
        stripeCustomerId: customerId || undefined,
        status: "active",
        plan,
        currentPeriodEnd: periodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId,
      stripeCustomerId: customerId || null,
      stripeSubscriptionId: null,
      status: "active",
      plan,
      currentPeriodEnd: periodEnd,
    });
  }

  return { ok: true, plan };
}
