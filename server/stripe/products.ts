/** The only allowed SKU: a one-time lifetime purchase (no subscription). */
export const PRODUCTS = {
  LIFETIME_MEMBERSHIP: {
    name: "摸了么永久支持计划",
    description: "一次性买断，不含订阅；抽签、结果与签文卡片始终免费",
    priceInCents: 4990,
    currency: "cny",
    mode: "payment" as const,
    durationDays: -1,
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
