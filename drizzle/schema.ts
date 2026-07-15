import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // 邀请码
  inviteCode: varchar("inviteCode", { length: 16 }).unique(),
  // 被谁邀请
  invitedBy: int("invitedBy"),
  // 已解锁的专属头像（JSON数组）
  unlockedAvatars: text("unlockedAvatars"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Stripe订阅信息表
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  status: mysqlEnum("status", ["active", "canceled", "past_due", "trialing", "incomplete"]).default("incomplete").notNull(),
  plan: mysqlEnum("plan", ["monthly", "quarterly", "annual", "lifetime"]).notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  // 额外赠送的会员天数（邀请奖励等）
  bonusDays: int("bonusDays").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// 单次购买记录表
export const purchases = mysqlTable("purchases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  productType: varchar("productType", { length: 64 }).notNull(), // detailed_report
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = typeof purchases.$inferInsert;

// 抽签历史记录表
export const fortuneHistory = mysqlTable("fortune_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  level: varchar("level", { length: 16 }).notNull(), // 大吉、中吉、小吉、末吉、凶
  emoji: varchar("emoji", { length: 16 }).notNull(),
  percent: int("percent").notNull(),
  message: text("message"),
  suggestedTime: varchar("suggestedTime", { length: 32 }),
  avatar: varchar("avatar", { length: 512 }), // 使用的头像（支持emoji或图片URL）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FortuneHistory = typeof fortuneHistory.$inferSelect;
export type InsertFortuneHistory = typeof fortuneHistory.$inferInsert;

// 每日抽签次数记录表
export const dailyDrawCount = mysqlTable("daily_draw_count", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  drawDate: date("drawDate").notNull(),
  count: int("count").default(0).notNull(),
});

export type DailyDrawCount = typeof dailyDrawCount.$inferSelect;
export type InsertDailyDrawCount = typeof dailyDrawCount.$inferInsert;

// 邀请记录表
export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  inviterId: int("inviterId").notNull(), // 邀请人
  inviteeId: int("inviteeId").notNull(), // 被邀请人
  rewardDays: int("rewardDays").default(3).notNull(), // 奖励天数
  rewardClaimed: boolean("rewardClaimed").default(false).notNull(), // 是否已领取奖励
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;

// 用户反馈表
export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // 可以为空（匿名反馈）
  type: mysqlEnum("type", ["bug", "feature", "suggestion", "other"]).default("suggestion").notNull(),
  content: text("content").notNull(),
  contact: varchar("contact", { length: 255 }), // 联系方式（可选）
  status: mysqlEnum("status", ["pending", "reviewed", "resolved", "closed"]).default("pending").notNull(),
  adminReply: text("adminReply"), // 管理员回复
  repliedAt: timestamp("repliedAt"), // 回复时间
  userAgent: text("userAgent"), // 浏览器信息
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;

// 用户通知表
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 接收通知的用户
  type: mysqlEnum("type", ["feedback_reply", "system", "reward"]).default("system").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  relatedId: int("relatedId"), // 关联的反馈ID等
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
