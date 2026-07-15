import Stripe from "stripe";
import { ENV } from "../_core/env";

/**
 * Stripe客户端实例
 * 使用环境变量中的密钥初始化
 */
export const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});
