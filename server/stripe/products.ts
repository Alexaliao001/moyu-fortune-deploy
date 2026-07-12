/**
 * Stripe产品和价格配置
 * 摸鱼运势付费功能
 * 
 * 注意：为了支持支付宝/微信支付，所有会员产品都使用一次性付款模式
 * 会员到期时间由后端手动管理
 */

export const PRODUCTS = {
  // 单次付费报告
  DETAILED_REPORT: {
    name: "摸鱼运势详细报告",
    description: "AI生成的个性化摸鱼指南，包含最佳摸鱼时段、本周运势趋势、职场生存建议",
    priceInCents: 990, // ¥9.9
    currency: "cny",
    mode: "payment" as const,
  },

  // 月度会员（一次性付款，支持支付宝/微信）
  MONTHLY_MEMBERSHIP: {
    name: "摸鱼会员 - 月卡",
    description: "无限抽签、历史记录、去广告、专属头像（30天有效）",
    priceInCents: 1990, // ¥19.9
    currency: "cny",
    mode: "payment" as const,
    durationDays: 30, // 会员有效期天数
  },

  // 季度会员（一次性付款，支持支付宝/微信）
  QUARTERLY_MEMBERSHIP: {
    name: "摸鱼会员 - 季卡",
    description: "无限抽签、历史记录、去广告、专属头像、每周运势报告（90天有效）",
    priceInCents: 4990, // ¥49.9
    currency: "cny",
    mode: "payment" as const,
    durationDays: 90, // 会员有效期天数
  },

  // 永久会员（一次性付款，支持支付宝/微信）
  LIFETIME_MEMBERSHIP: {
    name: "摸鱼会员 - 永久卡",
    description: "一次付款，永久享有全部会员权益，支持支付宝/微信支付",
    priceInCents: 4990, // ￥49.9
    currency: "cny",
    mode: "payment" as const,
    durationDays: -1, // -1 表示永久
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
