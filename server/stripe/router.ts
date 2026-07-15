import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { stripe } from "./client";
import { PRODUCTS, ProductKey } from "./products";
import { getDb } from "../db";
import { subscriptions, purchases } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const stripeRouter = router({
  // 创建Checkout Session（全部使用一次性付款模式以支持支付宝/微信）
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        productKey: z.enum(["DETAILED_REPORT", "MONTHLY_MEMBERSHIP", "QUARTERLY_MEMBERSHIP", "ANNUAL_MEMBERSHIP", "LIFETIME_MEMBERSHIP"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const product = PRODUCTS[input.productKey as ProductKey];
      const user = ctx.user;
      const origin = ctx.req.headers.origin || "http://localhost:3000";

      // 创建Stripe产品和价格
      const priceData: any = {
        currency: product.currency,
        unit_amount: product.priceInCents,
        product_data: {
          name: product.name,
          description: product.description,
        },
      };

      // 全部使用一次性付款模式，支持支付宝/微信/银行卡
      const paymentMethodTypes = ["card", "alipay", "wechat_pay"];

      const sessionParams: any = {
        mode: "payment", // 全部使用一次性付款
        payment_method_types: paymentMethodTypes,
        line_items: [
          {
            price_data: priceData,
            quantity: 1,
          },
        ],
        success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/payment/cancel`,
        customer_email: user.email || undefined,
        client_reference_id: user.id.toString(),
        metadata: {
          user_id: user.id.toString(),
          customer_email: user.email || "",
          customer_name: user.name || "",
          product_key: input.productKey,
        },
        allow_promotion_codes: true,
        payment_method_options: {
          wechat_pay: {
            client: "web",
          },
        },
      };

      const session = await stripe.checkout.sessions.create(sessionParams);

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    }),

  // 获取用户订阅状态
  getSubscriptionStatus: publicProcedure.query(async ({ ctx }) => {
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
      .where(eq(subscriptions.userId, String(ctx.user?.id || 'guest')))
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
    
    // 检查会员是否过期（永久会员不会过期）
    const isExpired = sub.plan !== "lifetime" && 
      sub.currentPeriodEnd && 
      new Date(sub.currentPeriodEnd) < new Date();
    
    return {
      hasSubscription: sub.status === "active" && !isExpired,
      status: isExpired ? "expired" : sub.status,
      plan: sub.plan,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  }),

  // 获取用户购买历史
  getPurchaseHistory: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return [];
    }

    const userPurchases = await db
      .select()
      .from(purchases)
      .where(eq(purchases.userId, String(ctx.user?.id || 'guest')))
      .orderBy(purchases.createdAt);

    return userPurchases;
  }),

  // 取消订阅（保留接口但现在只是标记状态）
  cancelSubscription: publicProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const userSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, String(ctx.user?.id || 'guest')))
      .limit(1);

    if (userSubscription.length === 0) {
      throw new Error("No active subscription found");
    }

    // 如果有Stripe订阅ID，尝试取消
    if (userSubscription[0].stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(userSubscription[0].stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      } catch (e) {
        // 忽略错误，可能是旧的订阅模式
        console.log("No Stripe subscription to cancel");
      }
    }

    return { success: true };
  }),

  // 创建客户门户会话（管理订阅）
  createPortalSession: publicProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const userSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, String(ctx.user?.id || 'guest')))
      .limit(1);

    if (userSubscription.length === 0 || !userSubscription[0].stripeCustomerId) {
      throw new Error("No customer found");
    }

    const origin = ctx.req.headers.origin || "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer: userSubscription[0].stripeCustomerId,
      return_url: `${origin}/membership`,
    });

    return { portalUrl: session.url };
  }),
});
