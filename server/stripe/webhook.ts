import { Request, Response, Router } from "express";
import { stripe } from "./client";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { subscriptions, purchases } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { PRODUCTS, ProductKey } from "./products";

const webhookRouter = Router();

// 根据产品key获取会员时长（天数）
function getMembershipDuration(productKey: string): number {
  const product = PRODUCTS[productKey as ProductKey];
  if (product && 'durationDays' in product) {
    return product.durationDays;
  }
  return 0;
}

// 根据产品key获取会员计划类型
function getMembershipPlan(productKey: string): "monthly" | "quarterly" | "annual" | "lifetime" | null {
  switch (productKey) {
    case "MONTHLY_MEMBERSHIP":
      return "monthly";
    case "QUARTERLY_MEMBERSHIP":
      return "quarterly";
    case "ANNUAL_MEMBERSHIP":
      return "annual";
    case "LIFETIME_MEMBERSHIP":
      return "lifetime";
    default:
      return null;
  }
}

// Webhook处理 - 必须使用raw body
webhookRouter.post(
  "/api/stripe/webhook",
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        ENV.stripeWebhookSecret
      );
    } catch (err: any) {
      console.error("[Webhook] Signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 处理测试事件
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      return res.json({
        verified: true,
      });
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
          const userId = parseInt(session.metadata?.user_id || "0");
          const productKey = session.metadata?.product_key || "";

          if (!userId) {
            console.error("[Webhook] No user_id in metadata");
            break;
          }

          // 所有会员产品现在都是一次性付款模式
          if (session.mode === "payment") {
            const paymentIntentId = session.payment_intent as string;
            const customerId = session.customer as string;

            // 记录购买
            await db.insert(purchases).values({
              userId,
              stripePaymentIntentId: paymentIntentId,
              productType: productKey || "detailed_report",
              status: "completed",
            });

            // 检查是否是会员产品
            const plan = getMembershipPlan(productKey);
            if (plan) {
              const durationDays = getMembershipDuration(productKey);
              
              // 检查是否已有订阅记录
              const existingSub = await db
                .select()
                .from(subscriptions)
                .where(eq(subscriptions.userId, userId))
                .limit(1);

              // 计算会员到期时间
              let periodEnd: Date;
              if (durationDays === -1) {
                // 永久会员：设置100年后
                periodEnd = new Date();
                periodEnd.setFullYear(periodEnd.getFullYear() + 100);
              } else {
                // 有期限会员：从当前时间或现有到期时间开始计算
                const now = new Date();
                let startDate = now;
                
                // 如果已有有效会员，从到期时间开始叠加
                if (existingSub.length > 0 && 
                    existingSub[0].status === "active" && 
                    existingSub[0].currentPeriodEnd &&
                    new Date(existingSub[0].currentPeriodEnd) > now) {
                  startDate = new Date(existingSub[0].currentPeriodEnd);
                }
                
                periodEnd = new Date(startDate);
                periodEnd.setDate(periodEnd.getDate() + durationDays);
              }

              if (existingSub.length > 0) {
                // 更新现有订阅
                await db
                  .update(subscriptions)
                  .set({
                    stripeCustomerId: customerId || undefined,
                    status: "active",
                    plan,
                    currentPeriodEnd: periodEnd,
                  })
                  .where(eq(subscriptions.userId, userId));
              } else {
                // 创建新订阅记录
                await db.insert(subscriptions).values({
                  userId,
                  stripeCustomerId: customerId || null,
                  stripeSubscriptionId: null,
                  status: "active",
                  plan,
                  currentPeriodEnd: periodEnd,
                });
              }

              console.log(`[Webhook] ${plan} membership activated for user ${userId}, expires: ${periodEnd.toISOString()}`);
            } else {
              console.log(`[Webhook] Purchase recorded for user ${userId}: ${productKey}`);
            }
          } else if (session.mode === "subscription") {
            // 保留对旧订阅模式的兼容
            const subscriptionId = session.subscription as string;
            const customerId = session.customer as string;

            const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

            let plan: "monthly" | "quarterly" | "annual" = "monthly";
            if (productKey === "QUARTERLY_MEMBERSHIP") {
              plan = "quarterly";
            } else if (productKey === "ANNUAL_MEMBERSHIP") {
              plan = "annual";
            }

            const existingSub = await db
              .select()
              .from(subscriptions)
              .where(eq(subscriptions.userId, userId))
              .limit(1);

            const periodEnd = (stripeSubscription as any).current_period_end 
              ? new Date((stripeSubscription as any).current_period_end * 1000)
              : new Date();

            if (existingSub.length > 0) {
              await db
                .update(subscriptions)
                .set({
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: subscriptionId,
                  status: "active",
                  plan,
                  currentPeriodEnd: periodEnd,
                })
                .where(eq(subscriptions.userId, userId));
            } else {
              await db.insert(subscriptions).values({
                userId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                status: "active",
                plan,
                currentPeriodEnd: periodEnd,
              });
            }

            console.log(`[Webhook] Subscription created for user ${userId}`);
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const subscriptionId = subscription.id;

          const status = subscription.status;
          const periodEnd = (subscription as any).current_period_end
            ? new Date((subscription as any).current_period_end * 1000)
            : new Date();

          let dbStatus: "active" | "canceled" | "past_due" = "active";
          if (status === "canceled") {
            dbStatus = "canceled";
          } else if (status === "past_due") {
            dbStatus = "past_due";
          }

          await db
            .update(subscriptions)
            .set({
              status: dbStatus,
              currentPeriodEnd: periodEnd,
            })
            .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

          console.log(`[Webhook] Subscription ${subscriptionId} updated to ${status}`);
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const subscriptionId = subscription.id;

          await db
            .update(subscriptions)
            .set({ status: "canceled" })
            .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

          console.log(`[Webhook] Subscription ${subscriptionId} canceled`);
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as any).subscription as string;

          if (subscriptionId) {
            await db
              .update(subscriptions)
              .set({ status: "past_due" })
              .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

            console.log(`[Webhook] Subscription ${subscriptionId} payment failed`);
          }
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
