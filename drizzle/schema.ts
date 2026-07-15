import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "incomplete",
]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "monthly",
  "quarterly",
  "annual",
  "lifetime",
]);
export const purchaseStatusEnum = pgEnum("purchase_status", [
  "pending",
  "completed",
  "failed",
]);
export const feedbackTypeEnum = pgEnum("feedback_type", [
  "bug",
  "feature",
  "suggestion",
  "other",
]);
export const feedbackStatusEnum = pgEnum("feedback_status", [
  "pending",
  "reviewed",
  "resolved",
  "closed",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "feedback_reply",
  "system",
  "reward",
]);

/** First-party aggregate events; props are server-sanitized before insertion. */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventId: varchar("event_id", { length: 128 }).notNull(),
    event: varchar("event", { length: 32 }).notNull(),
    deviceId: varchar("device_id", { length: 128 }).notNull(),
    props: jsonb("props"),
    clientOccurredAt: timestamp("client_occurred_at", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    uniqueIndex("analytics_events_event_id_uidx").on(table.eventId),
    index("analytics_events_client_occurred_at_idx").on(
      table.clientOccurredAt
    ),
    index("analytics_events_event_occurred_idx").on(
      table.event,
      table.clientOccurredAt
    ),
    index("analytics_events_device_occurred_idx").on(
      table.deviceId,
      table.clientOccurredAt
    ),
  ]
);

export type AnalyticsEventRow = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

/**
 * Core user table — guest JWT sessions use openId = guest_<uuid> or email hash.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  /** scrypt hash for optional email/password login; null for guest-only */
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  inviteCode: varchar("inviteCode", { length: 16 }).unique(),
  invitedBy: integer("invitedBy"),
  unlockedAvatars: text("unlockedAvatars"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  status: subscriptionStatusEnum("status").default("incomplete").notNull(),
  plan: subscriptionPlanEnum("plan").notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  bonusDays: integer("bonusDays").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  productType: varchar("productType", { length: 64 }).notNull(),
  status: purchaseStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = typeof purchases.$inferInsert;

export const fortuneHistory = pgTable("fortune_history", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  level: varchar("level", { length: 16 }).notNull(),
  emoji: varchar("emoji", { length: 16 }).notNull(),
  percent: integer("percent").notNull(),
  message: text("message"),
  suggestedTime: varchar("suggestedTime", { length: 32 }),
  avatar: varchar("avatar", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FortuneHistory = typeof fortuneHistory.$inferSelect;
export type InsertFortuneHistory = typeof fortuneHistory.$inferInsert;

export const dailyDrawCount = pgTable("daily_draw_count", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  drawDate: date("drawDate").notNull(),
  count: integer("count").default(0).notNull(),
});

export type DailyDrawCount = typeof dailyDrawCount.$inferSelect;
export type InsertDailyDrawCount = typeof dailyDrawCount.$inferInsert;

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  inviterId: integer("inviterId").notNull(),
  inviteeId: integer("inviteeId").notNull(),
  rewardDays: integer("rewardDays").default(3).notNull(),
  rewardClaimed: boolean("rewardClaimed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  type: feedbackTypeEnum("type").default("suggestion").notNull(),
  content: text("content").notNull(),
  contact: varchar("contact", { length: 255 }),
  status: feedbackStatusEnum("status").default("pending").notNull(),
  adminReply: text("adminReply"),
  repliedAt: timestamp("repliedAt"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: notificationTypeEnum("type").default("system").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  relatedId: integer("relatedId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
