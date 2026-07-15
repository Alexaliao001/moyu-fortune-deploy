var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
      stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? ""
    };
  }
});

// shared/const.ts
var COOKIE_NAME, ONE_YEAR_MS, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG;
var init_const = __esm({
  "shared/const.ts"() {
    "use strict";
    COOKIE_NAME = "app_session_id";
    ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
    UNAUTHED_ERR_MSG = "Please login (10001)";
    NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
  }
});

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  analyticsEvents: () => analyticsEvents,
  dailyDrawCount: () => dailyDrawCount,
  feedback: () => feedback,
  feedbackStatusEnum: () => feedbackStatusEnum,
  feedbackTypeEnum: () => feedbackTypeEnum,
  fortuneHistory: () => fortuneHistory,
  invitations: () => invitations,
  notificationTypeEnum: () => notificationTypeEnum,
  notifications: () => notifications,
  purchaseStatusEnum: () => purchaseStatusEnum,
  purchases: () => purchases,
  subscriptionPlanEnum: () => subscriptionPlanEnum,
  subscriptionStatusEnum: () => subscriptionStatusEnum,
  subscriptions: () => subscriptions,
  userRoleEnum: () => userRoleEnum,
  users: () => users
});
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
  varchar
} from "drizzle-orm/pg-core";
var userRoleEnum, subscriptionStatusEnum, subscriptionPlanEnum, purchaseStatusEnum, feedbackTypeEnum, feedbackStatusEnum, notificationTypeEnum, analyticsEvents, users, subscriptions, purchases, fortuneHistory, dailyDrawCount, invitations, feedback, notifications;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    userRoleEnum = pgEnum("user_role", ["user", "admin"]);
    subscriptionStatusEnum = pgEnum("subscription_status", [
      "active",
      "canceled",
      "past_due",
      "trialing",
      "incomplete"
    ]);
    subscriptionPlanEnum = pgEnum("subscription_plan", [
      "monthly",
      "quarterly",
      "annual",
      "lifetime"
    ]);
    purchaseStatusEnum = pgEnum("purchase_status", [
      "pending",
      "completed",
      "failed"
    ]);
    feedbackTypeEnum = pgEnum("feedback_type", [
      "bug",
      "feature",
      "suggestion",
      "other"
    ]);
    feedbackStatusEnum = pgEnum("feedback_status", [
      "pending",
      "reviewed",
      "resolved",
      "closed"
    ]);
    notificationTypeEnum = pgEnum("notification_type", [
      "feedback_reply",
      "system",
      "reward"
    ]);
    analyticsEvents = pgTable(
      "analytics_events",
      {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        eventId: varchar("event_id", { length: 128 }).notNull(),
        event: varchar("event", { length: 32 }).notNull(),
        deviceId: varchar("device_id", { length: 128 }).notNull(),
        props: jsonb("props"),
        clientOccurredAt: timestamp("client_occurred_at", {
          withTimezone: true
        }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
      },
      (table) => [
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
        )
      ]
    );
    users = pgTable("users", {
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
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    subscriptions = pgTable("subscriptions", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
      stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
      status: subscriptionStatusEnum("status").default("incomplete").notNull(),
      plan: subscriptionPlanEnum("plan").notNull(),
      currentPeriodEnd: timestamp("currentPeriodEnd"),
      bonusDays: integer("bonusDays").default(0),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    purchases = pgTable("purchases", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
      productType: varchar("productType", { length: 64 }).notNull(),
      status: purchaseStatusEnum("status").default("pending").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    fortuneHistory = pgTable("fortune_history", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      level: varchar("level", { length: 16 }).notNull(),
      emoji: varchar("emoji", { length: 16 }).notNull(),
      percent: integer("percent").notNull(),
      message: text("message"),
      suggestedTime: varchar("suggestedTime", { length: 32 }),
      avatar: varchar("avatar", { length: 512 }),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    dailyDrawCount = pgTable("daily_draw_count", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      drawDate: date("drawDate").notNull(),
      count: integer("count").default(0).notNull()
    });
    invitations = pgTable("invitations", {
      id: serial("id").primaryKey(),
      inviterId: integer("inviterId").notNull(),
      inviteeId: integer("inviteeId").notNull(),
      rewardDays: integer("rewardDays").default(3).notNull(),
      rewardClaimed: boolean("rewardClaimed").default(false).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    feedback = pgTable("feedback", {
      id: serial("id").primaryKey(),
      userId: integer("userId"),
      type: feedbackTypeEnum("type").default("suggestion").notNull(),
      content: text("content").notNull(),
      contact: varchar("contact", { length: 255 }),
      status: feedbackStatusEnum("status").default("pending").notNull(),
      adminReply: text("adminReply"),
      repliedAt: timestamp("repliedAt"),
      userAgent: text("userAgent"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    notifications = pgTable("notifications", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      type: notificationTypeEnum("type").default("system").notNull(),
      title: varchar("title", { length: 255 }).notNull(),
      content: text("content").notNull(),
      relatedId: integer("relatedId"),
      isRead: boolean("isRead").default(false).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
  }
});

// server/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
async function getDb() {
  const url = process.env.DATABASE_URL || ENV.databaseUrl;
  if (!_db && url) {
    try {
      _client = postgres(url, {
        max: 5,
        idle_timeout: 20,
        connect_timeout: 15,
        ssl: url.includes("render.com") || url.includes("sslmode=require") ? "require" : void 0
      });
      _db = drizzle(_client, { schema: schema_exports });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId,
      lastSignedIn: user.lastSignedIn ?? /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (user.name !== void 0) values.name = user.name ?? null;
    if (user.email !== void 0) values.email = user.email ?? null;
    if (user.loginMethod !== void 0) values.loginMethod = user.loginMethod ?? null;
    if (user.passwordHash !== void 0) values.passwordHash = user.passwordHash ?? null;
    if (user.role !== void 0) {
      values.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
    }
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: {
        ...values.name !== void 0 ? { name: values.name } : {},
        ...values.email !== void 0 ? { email: values.email } : {},
        ...values.loginMethod !== void 0 ? { loginMethod: values.loginMethod } : {},
        ...values.passwordHash !== void 0 ? { passwordHash: values.passwordHash } : {},
        ...values.role !== void 0 ? { role: values.role } : {},
        lastSignedIn: values.lastSignedIn,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserById(id2) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id2)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
var _client, _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    init_schema();
    _client = null;
    _db = null;
  }
});

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req) || ENV_FORCE_SECURE();
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure
  };
}
function ENV_FORCE_SECURE() {
  return process.env.NODE_ENV === "production";
}
var init_cookies = __esm({
  "server/_core/cookies.ts"() {
    "use strict";
  }
});

// server/_core/guestAuth.ts
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
function sessionSecret() {
  const secret = ENV.cookieSecret || "moyu-dev-insecure-jwt-secret-change-me";
  return new TextEncoder().encode(secret);
}
async function signSession(payload, options = {}) {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
  return new SignJWT({
    openId: payload.openId,
    appId: payload.appId || ENV.appId || "moyu-fortune",
    name: payload.name || ""
  }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(sessionSecret());
}
async function verifySession(cookieValue) {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, sessionSecret(), {
      algorithms: ["HS256"]
    });
    const openId = payload.openId;
    const appId = payload.appId;
    const name = payload.name;
    if (typeof openId !== "string" || !openId || typeof appId !== "string" || typeof name !== "string") {
      return null;
    }
    return { openId, appId, name };
  } catch {
    return null;
  }
}
function parseCookies(cookieHeader) {
  const map = /* @__PURE__ */ new Map();
  if (!cookieHeader) return map;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    map.set(part.slice(0, idx).trim(), decodeURIComponent(part.slice(idx + 1).trim()));
  }
  return map;
}
async function authenticateRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.get(COOKIE_NAME);
  const session = await verifySession(sessionCookie);
  if (!session) return null;
  let user = await getUserByOpenId(session.openId);
  if (!user) return null;
  return user;
}
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, "hex");
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}
function guestOpenId(deviceId) {
  if (deviceId && /^[a-zA-Z0-9_-]{8,80}$/.test(deviceId)) {
    return `guest_${deviceId.slice(0, 48)}`;
  }
  return `guest_${randomBytes(16).toString("hex")}`;
}
function emailOpenId(email) {
  const dig = createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 24);
  return `email_${dig}`;
}
async function setSessionCookie(req, res, user) {
  const token = await signSession({
    openId: user.openId,
    appId: ENV.appId || "moyu-fortune",
    name: user.name || "\u6478\u9C7C\u8FBE\u4EBA"
  });
  const opts = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, token, {
    ...opts,
    maxAge: ONE_YEAR_MS
  });
}
function clearSessionCookie(req, res) {
  const opts = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...opts, maxAge: -1 });
}
var init_guestAuth = __esm({
  "server/_core/guestAuth.ts"() {
    "use strict";
    init_const();
    init_db();
    init_env();
    init_cookies();
  }
});

// server/_core/deviceUser.ts
var deviceUser_exports = {};
__export(deviceUser_exports, {
  deviceIdFromReq: () => deviceIdFromReq,
  ensureGuestUser: () => ensureGuestUser,
  normalizeDeviceId: () => normalizeDeviceId,
  resolveWriteUser: () => resolveWriteUser,
  shanghaiTodayKey: () => shanghaiTodayKey,
  upsertDailyDraw: () => upsertDailyDraw
});
import { eq as eq5, sql } from "drizzle-orm";
function inviteCode2() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
function shanghaiTodayKey(d = /* @__PURE__ */ new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}
function normalizeDeviceId(raw) {
  const id2 = String(raw || "").trim().slice(0, 80);
  if (!id2 || id2.length < 8) return "";
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(id2)) return "";
  return id2;
}
function deviceIdFromReq(req, bodyDeviceId) {
  const header = req.headers["x-device-id"];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  return normalizeDeviceId(bodyDeviceId) || normalizeDeviceId(fromHeader);
}
async function ensureGuestUser(deviceId, name) {
  const id2 = normalizeDeviceId(deviceId);
  if (!id2) throw new Error("deviceId required");
  const openId = guestOpenId(id2);
  await upsertUser({
    openId,
    name: (name || "\u6478\u9C7C\u8FBE\u4EBA").slice(0, 32),
    loginMethod: "guest",
    lastSignedIn: /* @__PURE__ */ new Date()
  });
  let user = await getUserByOpenId(openId);
  if (!user) throw new Error("failed to resolve guest user");
  if (!user.inviteCode) {
    const database = await getDb();
    if (database) {
      let code = inviteCode2();
      for (let i = 0; i < 8; i++) {
        const clash = await database.select().from(users).where(eq5(users.inviteCode, code)).limit(1);
        if (clash.length === 0) break;
        code = inviteCode2();
      }
      await database.update(users).set({ inviteCode: code, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(users.id, user.id));
      user = await getUserByOpenId(openId);
    }
  }
  return user;
}
async function resolveWriteUser(opts) {
  if (opts.cookieUser) return opts.cookieUser;
  const id2 = normalizeDeviceId(opts.deviceId);
  if (!id2) return null;
  return ensureGuestUser(id2, opts.name);
}
async function upsertDailyDraw(opts) {
  const database = await getDb();
  if (!database) return { ok: true, upserted: "insert" };
  const day = /^\d{4}-\d{2}-\d{2}$/.test(opts.date) ? opts.date : shanghaiTodayKey();
  const existing = await database.execute(sql`
    SELECT id FROM fortune_history
    WHERE "userId" = ${opts.userId}
      AND (
        ("createdAt")::date = ${day}::date
        OR (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai')::date = ${day}::date
      )
    ORDER BY "createdAt" DESC
    LIMIT 1
  `);
  const rows = Array.isArray(existing) ? existing : existing?.rows || [];
  const existingId = rows[0] ? Number(rows[0].id) : null;
  if (existingId) {
    await database.update(fortuneHistory).set({
      level: opts.level,
      emoji: opts.emoji,
      percent: opts.percent,
      message: opts.message || null,
      suggestedTime: opts.suggestedTime || null,
      avatar: opts.avatar || null
    }).where(eq5(fortuneHistory.id, existingId));
    return { ok: true, upserted: "update" };
  }
  await database.insert(fortuneHistory).values({
    userId: opts.userId,
    level: opts.level,
    emoji: opts.emoji,
    percent: opts.percent,
    message: opts.message || null,
    suggestedTime: opts.suggestedTime || null,
    avatar: opts.avatar || null
  });
  return { ok: true, upserted: "insert" };
}
var init_deviceUser = __esm({
  "server/_core/deviceUser.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_guestAuth();
  }
});

// server/_core/apiOnlyEntry.ts
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    return false;
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
init_const();
import { TRPCError as TRPCError2 } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }
  return next({ ctx });
});

// server/_core/systemRouter.ts
init_env();
init_db();
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0).optional()
    }).optional()
  ).query(async () => {
    const db = await getDb();
    return {
      ok: true,
      service: "moyu-fortune",
      version: "path-c-1.0",
      database: Boolean(db),
      stripe: Boolean(ENV.stripeSecretKey),
      stripeWebhook: Boolean(ENV.stripeWebhookSecret),
      llm: Boolean(ENV.forgeApiKey)
    };
  }),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/_core/authRouter.ts
init_const();
init_schema();
init_db();
init_guestAuth();
import { z as z2 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";
import { eq as eq2 } from "drizzle-orm";
function inviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
var authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),
  /** Create or resume a guest profile from deviceId + nickname. */
  registerGuest: publicProcedure.input(
    z2.object({
      name: z2.string().trim().min(1).max(32).default("\u6478\u9C7C\u8FBE\u4EBA"),
      deviceId: z2.string().trim().min(8).max(80).optional(),
      avatar: z2.string().max(64).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const openId = guestOpenId(input.deviceId);
    await upsertUser({
      openId,
      name: input.name,
      loginMethod: "guest",
      lastSignedIn: /* @__PURE__ */ new Date()
    });
    let user = await getUserByOpenId(openId);
    if (!user) {
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "failed to create user" });
    }
    if (!user.inviteCode) {
      const database = await getDb();
      if (database) {
        let code = inviteCode();
        for (let i = 0; i < 8; i++) {
          const clash = await database.select().from(users).where(eq2(users.inviteCode, code)).limit(1);
          if (clash.length === 0) break;
          code = inviteCode();
        }
        await database.update(users).set({ inviteCode: code, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(users.id, user.id));
        user = await getUserByOpenId(openId);
      }
    }
    if (input.avatar) {
      const database = await getDb();
      if (database) {
        let unlocked = [];
        try {
          unlocked = user.unlockedAvatars ? JSON.parse(user.unlockedAvatars) : [];
        } catch {
          unlocked = [];
        }
        if (!unlocked.includes(input.avatar)) unlocked.push(input.avatar);
        await database.update(users).set({
          unlockedAvatars: JSON.stringify(unlocked),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq2(users.id, user.id));
        user = await getUserByOpenId(openId);
      }
    }
    await setSessionCookie(ctx.req, ctx.res, user);
    return { user };
  }),
  /** Email + password register (optional). */
  register: publicProcedure.input(
    z2.object({
      email: z2.string().email().max(320),
      password: z2.string().min(6).max(72),
      name: z2.string().trim().min(1).max(32).default("\u6478\u9C7C\u8FBE\u4EBA")
    })
  ).mutation(async ({ ctx, input }) => {
    const email = input.email.toLowerCase();
    const existing = await getUserByEmail(email);
    if (existing) {
      throw new TRPCError3({ code: "CONFLICT", message: "email already registered" });
    }
    const openId = emailOpenId(email);
    await upsertUser({
      openId,
      email,
      name: input.name,
      passwordHash: hashPassword(input.password),
      loginMethod: "email",
      lastSignedIn: /* @__PURE__ */ new Date()
    });
    const user = await getUserByOpenId(openId);
    if (!user) {
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "failed to create user" });
    }
    await setSessionCookie(ctx.req, ctx.res, user);
    return { user };
  }),
  login: publicProcedure.input(
    z2.object({
      email: z2.string().email().max(320),
      password: z2.string().min(1).max(72)
    })
  ).mutation(async ({ ctx, input }) => {
    const email = input.email.toLowerCase();
    const user = await getUserByEmail(email);
    if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      throw new TRPCError3({ code: "UNAUTHORIZED", message: "invalid email or password" });
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: /* @__PURE__ */ new Date()
    });
    await setSessionCookie(ctx.req, ctx.res, user);
    return { user };
  }),
  updateProfile: protectedProcedure.input(
    z2.object({
      name: z2.string().trim().min(1).max(32).optional(),
      avatar: z2.string().max(64).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const database = await getDb();
    if (!database) {
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "database unavailable" });
    }
    const patch = { updatedAt: /* @__PURE__ */ new Date() };
    if (input.name) patch.name = input.name;
    if (input.avatar) {
      let unlocked = [];
      try {
        unlocked = ctx.user.unlockedAvatars ? JSON.parse(ctx.user.unlockedAvatars) : [];
      } catch {
        unlocked = [];
      }
      if (!unlocked.includes(input.avatar)) unlocked.push(input.avatar);
      patch.unlockedAvatars = JSON.stringify(unlocked);
    }
    await database.update(users).set(patch).where(eq2(users.id, ctx.user.id));
    const user = await getUserById(ctx.user.id);
    if (!user) {
      throw new TRPCError3({ code: "NOT_FOUND", message: "user not found" });
    }
    await setSessionCookie(ctx.req, ctx.res, user);
    return { user };
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    clearSessionCookie(ctx.req, ctx.res);
    return { success: true };
  }),
  /** Health-ish auth probe for UI status chip */
  status: publicProcedure.query(({ ctx }) => ({
    authenticated: Boolean(ctx.user),
    userId: ctx.user?.id ?? null,
    name: ctx.user?.name ?? null,
    cookie: COOKIE_NAME
  }))
});

// server/routers/fortune.ts
import { z as z3 } from "zod";

// shared/slogans.json
var slogans_default = {
  zh: {
    \u5927\u5409: [
      "\u4ECA\u5929\u753B\u7684\u997C\u591F\u6211\u6491\u5230\u4E0B\u4E2A\u4E16\u7EAA\u4E86\uFF0C\u5148\u6478\u4E3A\u656C\u3002",
      "\u8001\u677F\u4ECA\u5929\u4E0D\u5728\u7EBF\uFF0C\u6211\u7684\u6478\u9C7C\u65F6\u95F4\u65E0\u4E0A\u9650\uFF01",
      "\u4ECA\u5929\u9002\u5408\u5E26\u85AA\u53D1\u5446\uFF0C\u987A\u4FBF\u601D\u8003\u4EBA\u751F\u3002",
      "\u5DE5\u4F4D\u5C31\u662F\u6211\u7684\u517B\u8001\u9662\uFF0C\u4ECA\u5929\u7EE7\u7EED\u8EBA\u5E73\u3002",
      "\u4ECA\u5929\u7684KPI\u5C31\u662F\u4E0D\u88AB\u53D1\u73B0\u5728\u6478\u9C7C\u3002",
      "\u5927\u5409\u5927\u5229\uFF0C\u4ECA\u5929\u6478\u9C7C\uFF01\u8001\u677F\u770B\u4E0D\u89C1\u6211~",
      "\u8FD0\u52BF\u7206\u68DA\uFF0C\u4ECA\u5929\u53EF\u4EE5\u5149\u660E\u6B63\u5927\u5730\u5E26\u85AA\u62C9\u5C4E\u3002",
      "\u4ECA\u5929\u9002\u5408\u6574\u987F\u804C\u573A\uFF0C\u4ECE\u6478\u9C7C\u5F00\u59CB\u3002",
      "\u6478\u9C7C\u4F53\u529B\u69FD\u5DF2\u6EE1\uFF0C\u4ECA\u5929\u53EF\u4EE5\u8086\u65E0\u5FCC\u60EE\uFF01",
      "\u4ECA\u5929\u7684\u5DE5\u4F5C\u72B6\u6001\uFF1A\u5DF2\u8BFB\u4E0D\u56DE\uFF0C\u7CBE\u795E\u79BB\u804C\u3002",
      "\u5377\u4E0D\u52A8\u4E86\uFF1F\u90A3\u5C31\u8EBA\u5E73\u5427\uFF0C\u5730\u7403\u4E0D\u4F1A\u56E0\u4E3A\u4F60\u591A\u52A0\u73ED\u800C\u8F6C\u5F97\u66F4\u5FEB\u3002",
      "\u5185\u5377\u7684\u5C3D\u5934\u662F\u6478\u9C7C\uFF0C\u4ECA\u5929\u6211\u5DF2\u7ECF\u5230\u8FBE\u7EC8\u70B9\u3002",
      "\u522B\u4EBA\u5728\u5377\uFF0C\u6211\u5728\u6478\uFF0C\u8FD9\u5C31\u662F\u4EBA\u751F\u7684\u53C2\u5DEE\u3002",
      "\u4ECA\u5929\u7684\u53CD\u5185\u5377\u5BA3\u8A00\uFF1A\u6211\u4E0D\u662F\u4E0D\u52AA\u529B\uFF0C\u6211\u662F\u5728\u4FDD\u62A4\u81EA\u5DF1\u3002",
      "\u5185\u5377\u662F\u522B\u4EBA\u7684\u4E8B\uFF0C\u6478\u9C7C\u662F\u6211\u7684\u4FEE\u884C\u3002",
      "\u4ECA\u5929\u8FD8\u6CA1\u88AB\u88C1\uFF0C\u8BF4\u660E\u4F60\u8FD8\u6709\u4EF7\u503C\uFF0C\u53BB\u6478\u4E2A\u9C7C\u5956\u52B1\u81EA\u5DF1\u3002",
      "\u88C1\u5458\u540D\u5355\u4E0A\u6CA1\u6709\u6211\uFF0C\u4ECA\u5929\u53EF\u4EE5\u653E\u5FC3\u6478\u9C7C\u3002",
      "\u4E0E\u5176\u7126\u8651\u88AB\u88C1\uFF0C\u4E0D\u5982\u4EAB\u53D7\u5F53\u4E0B\u7684\u6478\u9C7C\u65F6\u5149\u3002",
      "\u5DE5\u8D44\u4E0D\u6DA8\u7269\u4EF7\u4E0D\u6DA8\uFF0C\u552F\u4E00\u6DA8\u7684\u662F\u6211\u7684\u6478\u9C7C\u6280\u80FD\u3002",
      "\u7ECF\u6D4E\u4E0B\u884C\uFF0C\u6478\u9C7C\u4E0A\u884C\uFF0C\u8FD9\u5C31\u662F\u5E73\u8861\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5077\u95F2\u4E8E\u5DE5\u4F4D\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5077\u95F2\u4E8E\u8336\u6C34\u95F4\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5077\u95F2\u4E8E\u536B\u751F\u95F4\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5077\u95F2\u4E8E\u4F1A\u8BAE\u5BA4\u89D2\u843D\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5077\u95F2\u4E8E\u7535\u68AF\u53E3\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5077\u95F2\u4E8E\u5929\u53F0\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5077\u95F2\u4E8E\u8D70\u5ECA\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5077\u95F2\u4E8E\u8033\u673A\u91CC\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u53D1\u5446\u4E8E\u5DE5\u4F4D\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u53D1\u5446\u4E8E\u8336\u6C34\u95F4\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u53D1\u5446\u4E8E\u536B\u751F\u95F4\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u53D1\u5446\u4E8E\u4F1A\u8BAE\u5BA4\u89D2\u843D\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u53D1\u5446\u4E8E\u7535\u68AF\u53E3\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u53D1\u5446\u4E8E\u5929\u53F0\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u53D1\u5446\u4E8E\u8D70\u5ECA\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u53D1\u5446\u4E8E\u8033\u673A\u91CC\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u8865\u89C9\u4E8E\u5DE5\u4F4D\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u8865\u89C9\u4E8E\u8336\u6C34\u95F4\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u8865\u89C9\u4E8E\u536B\u751F\u95F4\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u8865\u89C9\u4E8E\u4F1A\u8BAE\u5BA4\u89D2\u843D\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u8865\u89C9\u4E8E\u7535\u68AF\u53E3\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u8865\u89C9\u4E8E\u5929\u53F0\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u8865\u89C9\u4E8E\u8D70\u5ECA\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u8865\u89C9\u4E8E\u8033\u673A\u91CC\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5237\u653B\u7565\u4E8E\u5DE5\u4F4D\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5237\u653B\u7565\u4E8E\u8336\u6C34\u95F4\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5237\u653B\u7565\u4E8E\u536B\u751F\u95F4\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5237\u653B\u7565\u4E8E\u4F1A\u8BAE\u5BA4\u89D2\u843D\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5237\u653B\u7565\u4E8E\u7535\u68AF\u53E3\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5237\u653B\u7565\u4E8E\u5929\u53F0\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5237\u653B\u7565\u4E8E\u8D70\u5ECA\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u5237\u653B\u7565\u4E8E\u8033\u673A\u91CC\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u770B\u4E91\u4E8E\u5DE5\u4F4D\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u770B\u4E91\u4E8E\u8336\u6C34\u95F4\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002",
      "\u5927\u5409\uFF1A\u5B9C\u770B\u4E91\u4E8E\u536B\u751F\u95F4\uFF0C\u5FCC\u4E3B\u52A8\u52A0\u73ED\u3002"
    ],
    \u5409: [
      "\u9700\u6C42\u53C8\u6539\u4E86\uFF1F\u6CA1\u4E8B\uFF0C\u6211\u7684\u5FC3\u5DF2\u7ECF\u548C\u4EE3\u7801\u4E00\u6837\uFF0C\u6B7B\u4E86\u3002",
      "\u4ECA\u5929\u9002\u5408\u7528\u300C\u5728\u5BF9\u9F50\u300D\u6765\u56DE\u590D\u6240\u6709\u6D88\u606F\u3002",
      "\u7075\u9B42\u5DF2\u7ECF\u4E0B\u73ED\uFF0C\u8089\u4F53\u8FD8\u5728\u5DE5\u4F4D\u3002",
      "\u4ECA\u5929\u7684\u6548\u7387\uFF1A\u75281\u5C0F\u65F6\u5B8C\u621010\u5206\u949F\u7684\u5DE5\u4F5C\u3002",
      "\u5EFA\u8BAE\u4ECA\u5929\u628A\u6240\u6709\u4F1A\u8BAE\u90FD\u6807\u8BB0\u4E3A\u300C\u53EF\u9009\u53C2\u52A0\u300D\u3002",
      "\u4E2D\u5409\u8FD0\u52BF\uFF0C\u4ECA\u5929\u6478\u9C7C\u6709\u4FDD\u969C\uFF0C\u4F46\u8981\u4F4E\u8C03\u3002",
      "\u4ECA\u5929\u9002\u5408\u6253\u5F00PPT\u5047\u88C5\u5728\u505A\u6C47\u62A5\u3002",
      "\u8FD0\u52BF\u4E0D\u9519\uFF0C\u53EF\u4EE5\u9002\u5F53\u5EF6\u957F\u5E26\u85AA\u62C9\u5C4E\u65F6\u95F4\u3002",
      "\u4ECA\u5929\u7684\u72B6\u6001\uFF1A\u4EBA\u5728\u5DE5\u4F4D\uFF0C\u5FC3\u5728\u5EA6\u5047\u3002",
      "\u8001\u677F\u7684\u997C\u753B\u5F97\u518D\u5927\uFF0C\u4E5F\u4E0D\u5982\u4F60\u7684\u5348\u89C9\u9999\u3002",
      "\u4ECA\u5929\u9002\u5408\u7528\u300C\u5728\u601D\u8003\u6218\u7565\u65B9\u5411\u300D\u6765\u63A9\u62A4\u6478\u9C7C\u3002",
      "\u5185\u5377\u662F\u4E00\u79CD\u75C5\uFF0C\u6478\u9C7C\u662F\u4E00\u79CD\u836F\u3002",
      "\u4ECA\u5929\u7684\u53CD\u5185\u5377\u7B56\u7565\uFF1A\u5047\u88C5\u5F88\u5FD9\uFF0C\u5B9E\u9645\u5F88\u95F2\u3002",
      "\u522B\u4EBA996\uFF0C\u6211965\uFF0C\u8FD9\u5C31\u662F\u751F\u6D3B\u7684\u667A\u6167\u3002",
      "\u88AB\u88C1\u4E86\u6709N+1\uFF0C\u4E0D\u88AB\u88C1\u6709\u6478\u9C7C\uFF0C\u600E\u4E48\u90FD\u4E0D\u4E8F\u3002",
      "\u4ECA\u5929\u7684\u5B89\u5168\u611F\u6765\u81EA\uFF1A\u6211\u7684\u5DE5\u4F4D\u8FD8\u5728\u3002",
      "\u6D88\u8D39\u964D\u7EA7\uFF0C\u6478\u9C7C\u5347\u7EA7\uFF0C\u8FD9\u5C31\u662F\u6253\u5DE5\u4EBA\u7684\u81EA\u6211\u8C03\u8282\u3002",
      "\u7ECF\u6D4E\u4E0D\u597D\uFF0C\u5FC3\u60C5\u8981\u597D\uFF0C\u6478\u9C7C\u4E0D\u80FD\u5C11\u3002",
      "\u901A\u7F29\u65F6\u4EE3\uFF0C\u6478\u9C7C\u662F\u6700\u597D\u7684\u6295\u8D44\u3002",
      "\u5DE5\u4F5C\u91CF\u548C\u85AA\u6C34\u4E4B\u95F4\uFF0C\u603B\u6709\u4E00\u4E2A\u5728\u6478\u9C7C\u3002",
      "\u4ECA\u5929\u5B9C\u6478\u5341\u5206\u949F\uFF0C\u5FCC\u4E3B\u52A8\u627F\u62C5\u65B0\u9700\u6C42\u3002",
      "\u4ECA\u5929\u5B9C\u95ED\u76EE\u517B\u795E\uFF0C\u5FCC\u4E3B\u52A8\u627F\u62C5\u65B0\u9700\u6C42\u3002",
      "\u4ECA\u5929\u5B9C\u5237\u6C34\u679C\uFF0C\u5FCC\u4E3B\u52A8\u627F\u62C5\u65B0\u9700\u6C42\u3002",
      "\u4ECA\u5929\u5B9C\u8C03\u952E\u76D8\u706F\u5149\uFF0C\u5FCC\u4E3B\u52A8\u627F\u62C5\u65B0\u9700\u6C42\u3002",
      "\u4ECA\u5929\u5B9C\u6574\u7406\u684C\u9762\uFF08\u5305\u62EC\u6478\u9C7C\u6E05\u5355\uFF09\uFF0C\u5FCC\u4E3B\u52A8\u627F\u62C5\u65B0\u9700\u6C42\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C1\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C2\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C3\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C4\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C5\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C6\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C7\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C8\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C9\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C10\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C11\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C12\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C13\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C14\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C15\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C16\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C17\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C18\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C19\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C20\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C21\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C22\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C23\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C24\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C25\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C26\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C27\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C28\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C29\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002",
      "\u5409\u8C61\u663E\u73B0\uFF1A\u7B2C30\u6B21\u88C5\u4F5C\u8BA4\u771F\uFF0C\u5B9E\u9645\u4E0A\u5728\u795E\u6E38\u3002"
    ],
    \u5E73: [
      "\u4ECA\u5929\u9002\u5408\u6253\u5F00Excel\u5047\u88C5\u5728\u505A\u6570\u636E\u5206\u6790\u3002",
      "\u5EFA\u8BAE\u4ECA\u5929\u7528\u300C\u7F51\u7EDC\u4E0D\u597D\u300D\u6765\u9003\u907F\u89C6\u9891\u4F1A\u8BAE\u3002",
      "\u4ECA\u5929\u53EF\u4EE5\u540D\u6B63\u8A00\u987A\u5730\u8BF4\u5728\u7B49\u9700\u6C42\u3002",
      "\u9002\u5408\u6234\u4E0A\u8033\u673A\u5047\u88C5\u5728\u5F00\u4F1A\u3002",
      "\u5C0F\u5409\u8FD0\u52BF\uFF0C\u4ECA\u5929\u6478\u9C7C\u8981\u89C1\u673A\u884C\u4E8B\u3002",
      "\u4ECA\u5929\u7684\u6478\u9C7C\u7B56\u7565\uFF1A\u5C0F\u6478\u6021\u60C5\uFF0C\u5927\u6478\u4F24\u8EAB\u3002",
      "\u8FD0\u52BF\u5C0F\u5409\uFF0C\u5EFA\u8BAE\u628A\u6478\u9C7C\u65F6\u95F4\u63A7\u5236\u57281\u5C0F\u65F6\u5185\u3002",
      "\u4ECA\u5929\u9002\u5408\u7528\u300C\u5728review\u4EE3\u7801\u300D\u6765\u4E89\u53D6\u6478\u9C7C\u65F6\u95F4\u3002",
      "\u5C0F\u5409\u52A0\u6301\uFF0C\u4ECA\u5929\u53EF\u4EE5\u9002\u5EA6\u5E26\u85AA\u53D1\u5446\u3002",
      "\u4ECA\u5929\u9002\u5408\u7528\u300C\u5728\u62C9\u901A\u5BF9\u9F50\u300D\u6765\u62D6\u5EF6\u5DE5\u4F5C\u3002",
      "\u5185\u5377\u4E0D\u662F\u6211\u7684\u9519\uFF0C\u662F\u8FD9\u4E2A\u65F6\u4EE3\u7684\u9519\u3002",
      "\u4ECA\u5929\u7684\u53CD\u5185\u5377\u59FF\u52BF\uFF1A\u5750\u7740\u6478\u9C7C\uFF0C\u8EBA\u7740\u601D\u8003\u3002",
      "\u5377\u738B\u4EEC\u5728\u51B2\u523A\uFF0C\u6211\u5728\u539F\u5730\u4F11\u606F\u3002",
      "\u4ECA\u5929\u8FD8\u80FD\u6478\u9C7C\uFF0C\u8BF4\u660E\u516C\u53F8\u8FD8\u517B\u5F97\u8D77\u6211\u3002",
      "\u88C1\u5458\u6F6E\u4E2D\u7684\u5E78\u5B58\u8005\uFF0C\u4ECA\u5929\u503C\u5F97\u6478\u4E00\u6478\u3002",
      "\u672B\u5409\uFF1A\u80FD\u6478\u4E00\u70B9\u662F\u4E00\u70B9\uFF0C\u522B\u66B4\u9732\u3002",
      "\u5E73\u7B7E\uFF1A\u4E0D\u51F6\u4E0D\u5409\uFF0C\u9002\u5408\u4F4E\u8C03\u5077\u95F2\u3002",
      "\u4ECA\u5929\u7684\u6C14\u8FD0\uFF1A\u4E2D\u7B49\u504F\u61D2\u3002",
      "\u5E73\u5E73\u65E0\u5947\u7684\u4E00\u5929\uFF0C\u914D\u5E73\u5E73\u65E0\u5947\u7684\u6478\u9C7C\u3002",
      "\u522B\u6D6A\uFF0C\u7A33\u4F4F\uFF0C\u80FD\u6478\u4E94\u5206\u949F\u4E5F\u662F\u80DC\u5229\u3002",
      "\u5E73\u7B7E\u7B2C1\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C2\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C3\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C4\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C5\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C6\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C7\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C8\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C9\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C10\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C11\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C12\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C13\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C14\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C15\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C16\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C17\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C18\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C19\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C20\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C21\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C22\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C23\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C24\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C25\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C26\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C27\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C28\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C29\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C30\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C31\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C32\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C33\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C34\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002",
      "\u5E73\u7B7E\u7B2C35\u6761\uFF1A\u4FDD\u6301\u5DE5\u4F4D\u6709\u4EBA\u611F\uFF0C\u5FC3\u91CC\u5148\u4E0B\u73ED\u3002"
    ],
    \u51F6: [
      "\u4ECA\u5929\u4E0D\u5B9C\u6478\u9C7C\u3002",
      "\u8001\u677F\u96F7\u8FBE\u5DF2\u5F00\u542F\uFF0C\u6536\u655B\u4E00\u4E0B\u3002",
      "\u51F6\u8C61\uFF1A\u5C3D\u91CF\u522B\u88AB\u6293\u5230\u6478\u5C4F\u3002",
      "\u4ECA\u5929\u9002\u5408\u88C5\u5FD9\uFF0C\u4E0D\u9002\u5408\u771F\u5FD9\u3002",
      "\u5C0F\u5FC3\u4F1A\u8BAE\u5BA4\u7A81\u88AD\uFF0C\u9C7C\u5148\u6536\u4E86\u3002",
      "\u4ECA\u5929\u6478\u9C7C\u98CE\u9669\u504F\u9AD8\uFF0C\u63A8\u8350\u5395\u6240\u6218\u672F\u3002",
      "\u5B9C\uFF1A\u8865\u5751\uFF1B\u5FCC\uFF1A\u516C\u5F00\u6478\u9C7C\u3002",
      "\u6C14\u6C1B\u51DD\u91CD\uFF0C\u6478\u9C7C\u8BF7\u6539\u4E3A\u7CBE\u795E\u5185\u8017\u7248\u3002",
      "\u4ECA\u5929\u7684KPI\u6539\u6210\uFF1A\u522B\u7FFB\u8F66\u3002",
      "\u51F6\u65E5\u63D0\u9192\uFF1A\u90AE\u4EF6\u5FC5\u56DE\uFF0C\u8868\u60C5\u522B\u6D6A\u3002",
      "\u80FD\u5C11\u60F9\u4E8B\u5C31\u5C11\u60F9\uFF0C\u6478\u9C7C\u6539\u6210\u4EE5\u540E\u3002",
      "\u7A7A\u6C14\u91CC\u6709\u5BA1\u67E5\u5473\uFF0C\u4F4E\u8C03\u3002",
      "\u4ECA\u5929\u7684\u62A4\u8EAB\u7B26\u662F\u8BA4\u771F\u8138\u3002",
      "\u5EFA\u8BAE\u628A\u7F51\u9875\u6362\u6210\u5DE5\u4F5C\u6587\u6863\u63A9\u62A4\u3002",
      "\u51F6\u7B7E\uFF1A\u4ECA\u65E5\u5A31\u4E50\u9650\u989D\u4E3A\u96F6\u3002",
      "\u522B\u628A\u5934\u63A2\u51FA\u5DE5\u4F4D\u592A\u4E45\u3002",
      "\u8FD9\u5929\u6C14\u4E0D\u9002\u5408\u6478\u5927\u7684\u3002",
      "\u5148\u6D3B\u8FC7\u4ECA\u5929\uFF0C\u518D\u89C4\u5212\u6478\u9C7C\u5047\u671F\u3002",
      "\u51F6\u4E2D\u6709\u5E73\uFF1A\u5077\u5077\u559D\u53E3\u6C34\u4E5F\u7B97\u4F11\u6574\u3002",
      "\u628A\u91CE\u5FC3\u5148\u5B58\u7740\uFF0C\u6D3B\u4E0B\u53BB\u4F18\u5148\u3002",
      "\u51F6\u7B7E\u63D0\u793A1\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A2\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A3\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A4\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A5\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A6\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A7\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A8\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A9\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A10\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A11\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A12\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A13\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A14\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A15\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A16\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A17\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A18\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A19\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A20\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A21\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A22\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A23\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A24\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A25\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A26\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A27\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A28\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A29\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A30\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A31\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A32\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A33\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A34\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002",
      "\u51F6\u7B7E\u63D0\u793A35\uFF1A\u5148\u628A\u773C\u524D\u8FD9\u9505\u7AEF\u7A33\uFF0C\u518D\u8C08\u6478\u3002"
    ]
  },
  en: {
    \u5927\u5409: [
      "Lucky day to slack quietly #1",
      "Lucky day to slack quietly #2",
      "Lucky day to slack quietly #3",
      "Lucky day to slack quietly #4",
      "Lucky day to slack quietly #5",
      "Lucky day to slack quietly #6",
      "Lucky day to slack quietly #7",
      "Lucky day to slack quietly #8",
      "Lucky day to slack quietly #9",
      "Lucky day to slack quietly #10",
      "Lucky day to slack quietly #11",
      "Lucky day to slack quietly #12",
      "Lucky day to slack quietly #13",
      "Lucky day to slack quietly #14",
      "Lucky day to slack quietly #15",
      "Lucky day to slack quietly #16",
      "Lucky day to slack quietly #17",
      "Lucky day to slack quietly #18",
      "Lucky day to slack quietly #19",
      "Lucky day to slack quietly #20",
      "Lucky day to slack quietly #21",
      "Lucky day to slack quietly #22",
      "Lucky day to slack quietly #23",
      "Lucky day to slack quietly #24",
      "Lucky day to slack quietly #25",
      "Lucky day to slack quietly #26",
      "Lucky day to slack quietly #27",
      "Lucky day to slack quietly #28",
      "Lucky day to slack quietly #29",
      "Lucky day to slack quietly #30",
      "Lucky day to slack quietly #31",
      "Lucky day to slack quietly #32",
      "Lucky day to slack quietly #33",
      "Lucky day to slack quietly #34",
      "Lucky day to slack quietly #35",
      "Lucky day to slack quietly #36",
      "Lucky day to slack quietly #37",
      "Lucky day to slack quietly #38",
      "Lucky day to slack quietly #39",
      "Lucky day to slack quietly #40",
      "Lucky day to slack quietly #41",
      "Lucky day to slack quietly #42",
      "Lucky day to slack quietly #43",
      "Lucky day to slack quietly #44",
      "Lucky day to slack quietly #45",
      "Lucky day to slack quietly #46",
      "Lucky day to slack quietly #47",
      "Lucky day to slack quietly #48",
      "Lucky day to slack quietly #49",
      "Lucky day to slack quietly #50"
    ],
    \u5409: [
      "Mild luck: slack in moderation #1",
      "Mild luck: slack in moderation #2",
      "Mild luck: slack in moderation #3",
      "Mild luck: slack in moderation #4",
      "Mild luck: slack in moderation #5",
      "Mild luck: slack in moderation #6",
      "Mild luck: slack in moderation #7",
      "Mild luck: slack in moderation #8",
      "Mild luck: slack in moderation #9",
      "Mild luck: slack in moderation #10",
      "Mild luck: slack in moderation #11",
      "Mild luck: slack in moderation #12",
      "Mild luck: slack in moderation #13",
      "Mild luck: slack in moderation #14",
      "Mild luck: slack in moderation #15",
      "Mild luck: slack in moderation #16",
      "Mild luck: slack in moderation #17",
      "Mild luck: slack in moderation #18",
      "Mild luck: slack in moderation #19",
      "Mild luck: slack in moderation #20",
      "Mild luck: slack in moderation #21",
      "Mild luck: slack in moderation #22",
      "Mild luck: slack in moderation #23",
      "Mild luck: slack in moderation #24",
      "Mild luck: slack in moderation #25",
      "Mild luck: slack in moderation #26",
      "Mild luck: slack in moderation #27",
      "Mild luck: slack in moderation #28",
      "Mild luck: slack in moderation #29",
      "Mild luck: slack in moderation #30",
      "Mild luck: slack in moderation #31",
      "Mild luck: slack in moderation #32",
      "Mild luck: slack in moderation #33",
      "Mild luck: slack in moderation #34",
      "Mild luck: slack in moderation #35",
      "Mild luck: slack in moderation #36",
      "Mild luck: slack in moderation #37",
      "Mild luck: slack in moderation #38",
      "Mild luck: slack in moderation #39",
      "Mild luck: slack in moderation #40",
      "Mild luck: slack in moderation #41",
      "Mild luck: slack in moderation #42",
      "Mild luck: slack in moderation #43",
      "Mild luck: slack in moderation #44",
      "Mild luck: slack in moderation #45",
      "Mild luck: slack in moderation #46",
      "Mild luck: slack in moderation #47",
      "Mild luck: slack in moderation #48",
      "Mild luck: slack in moderation #49",
      "Mild luck: slack in moderation #50"
    ],
    \u5E73: [
      "Neutral day \u2014 keep your head down #1",
      "Neutral day \u2014 keep your head down #2",
      "Neutral day \u2014 keep your head down #3",
      "Neutral day \u2014 keep your head down #4",
      "Neutral day \u2014 keep your head down #5",
      "Neutral day \u2014 keep your head down #6",
      "Neutral day \u2014 keep your head down #7",
      "Neutral day \u2014 keep your head down #8",
      "Neutral day \u2014 keep your head down #9",
      "Neutral day \u2014 keep your head down #10",
      "Neutral day \u2014 keep your head down #11",
      "Neutral day \u2014 keep your head down #12",
      "Neutral day \u2014 keep your head down #13",
      "Neutral day \u2014 keep your head down #14",
      "Neutral day \u2014 keep your head down #15",
      "Neutral day \u2014 keep your head down #16",
      "Neutral day \u2014 keep your head down #17",
      "Neutral day \u2014 keep your head down #18",
      "Neutral day \u2014 keep your head down #19",
      "Neutral day \u2014 keep your head down #20",
      "Neutral day \u2014 keep your head down #21",
      "Neutral day \u2014 keep your head down #22",
      "Neutral day \u2014 keep your head down #23",
      "Neutral day \u2014 keep your head down #24",
      "Neutral day \u2014 keep your head down #25",
      "Neutral day \u2014 keep your head down #26",
      "Neutral day \u2014 keep your head down #27",
      "Neutral day \u2014 keep your head down #28",
      "Neutral day \u2014 keep your head down #29",
      "Neutral day \u2014 keep your head down #30",
      "Neutral day \u2014 keep your head down #31",
      "Neutral day \u2014 keep your head down #32",
      "Neutral day \u2014 keep your head down #33",
      "Neutral day \u2014 keep your head down #34",
      "Neutral day \u2014 keep your head down #35",
      "Neutral day \u2014 keep your head down #36",
      "Neutral day \u2014 keep your head down #37",
      "Neutral day \u2014 keep your head down #38",
      "Neutral day \u2014 keep your head down #39",
      "Neutral day \u2014 keep your head down #40",
      "Neutral day \u2014 keep your head down #41",
      "Neutral day \u2014 keep your head down #42",
      "Neutral day \u2014 keep your head down #43",
      "Neutral day \u2014 keep your head down #44",
      "Neutral day \u2014 keep your head down #45",
      "Neutral day \u2014 keep your head down #46",
      "Neutral day \u2014 keep your head down #47",
      "Neutral day \u2014 keep your head down #48",
      "Neutral day \u2014 keep your head down #49",
      "Neutral day \u2014 keep your head down #50"
    ],
    \u51F6: [
      "Rough day \u2014 look busy #1",
      "Rough day \u2014 look busy #2",
      "Rough day \u2014 look busy #3",
      "Rough day \u2014 look busy #4",
      "Rough day \u2014 look busy #5",
      "Rough day \u2014 look busy #6",
      "Rough day \u2014 look busy #7",
      "Rough day \u2014 look busy #8",
      "Rough day \u2014 look busy #9",
      "Rough day \u2014 look busy #10",
      "Rough day \u2014 look busy #11",
      "Rough day \u2014 look busy #12",
      "Rough day \u2014 look busy #13",
      "Rough day \u2014 look busy #14",
      "Rough day \u2014 look busy #15",
      "Rough day \u2014 look busy #16",
      "Rough day \u2014 look busy #17",
      "Rough day \u2014 look busy #18",
      "Rough day \u2014 look busy #19",
      "Rough day \u2014 look busy #20",
      "Rough day \u2014 look busy #21",
      "Rough day \u2014 look busy #22",
      "Rough day \u2014 look busy #23",
      "Rough day \u2014 look busy #24",
      "Rough day \u2014 look busy #25",
      "Rough day \u2014 look busy #26",
      "Rough day \u2014 look busy #27",
      "Rough day \u2014 look busy #28",
      "Rough day \u2014 look busy #29",
      "Rough day \u2014 look busy #30",
      "Rough day \u2014 look busy #31",
      "Rough day \u2014 look busy #32",
      "Rough day \u2014 look busy #33",
      "Rough day \u2014 look busy #34",
      "Rough day \u2014 look busy #35",
      "Rough day \u2014 look busy #36",
      "Rough day \u2014 look busy #37",
      "Rough day \u2014 look busy #38",
      "Rough day \u2014 look busy #39",
      "Rough day \u2014 look busy #40",
      "Rough day \u2014 look busy #41",
      "Rough day \u2014 look busy #42",
      "Rough day \u2014 look busy #43",
      "Rough day \u2014 look busy #44",
      "Rough day \u2014 look busy #45",
      "Rough day \u2014 look busy #46",
      "Rough day \u2014 look busy #47",
      "Rough day \u2014 look busy #48",
      "Rough day \u2014 look busy #49",
      "Rough day \u2014 look busy #50"
    ]
  }
};

// shared/slogans.ts
var DATA = slogans_default;
function levelToTier(level) {
  switch (level) {
    case "\u5927\u5409":
      return "\u5927\u5409";
    case "\u4E2D\u5409":
    case "\u5C0F\u5409":
    case "\u5409":
      return "\u5409";
    case "\u672B\u5409":
    case "\u5E73":
      return "\u5E73";
    case "\u51F6":
    case "\u5C0F\u51F6":
      return "\u51F6";
    default:
      return "\u5E73";
  }
}
function sloganPool(level, lang = "zh") {
  const tier = levelToTier(level);
  const pack = lang === "en" ? DATA.en : DATA.zh;
  return pack[tier] || pack["\u5E73"] || [];
}
function pickSlogan(level, lang = "zh", seed) {
  const pool = sloganPool(level, lang);
  if (!pool.length) return lang === "en" ? "Slack gently today." : "\u4ECA\u5929\u5148\u5598\u53E3\u6C14\u3002";
  if (seed == null || !Number.isFinite(seed)) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return pool[Math.abs(Math.floor(seed)) % pool.length];
}
function sloganStats() {
  return {
    zh: Object.fromEntries(
      Object.keys(DATA.zh).map((k) => [k, DATA.zh[k].length])
    ),
    en: Object.fromEntries(
      Object.keys(DATA.en).map((k) => [k, DATA.en[k].length])
    ),
    totalZh: Object.values(DATA.zh).reduce((s, a) => s + a.length, 0)
  };
}

// server/routers/fortune.ts
var fortuneRouter = router({
  libraryStats: publicProcedure.query(() => sloganStats()),
  generateSlogan: publicProcedure.input(
    z3.object({
      level: z3.string(),
      percent: z3.number(),
      language: z3.enum(["zh", "en"]).optional().default("zh")
    })
  ).mutation(async ({ input }) => {
    const lang = input.language === "en" ? "en" : "zh";
    const seed = Math.floor(input.percent * 17 + input.level.length * 31);
    const slogan = pickSlogan(input.level, lang, seed);
    return {
      success: true,
      slogan,
      source: "library"
    };
  })
});

// server/stripe/router.ts
import { z as z4 } from "zod";
import { TRPCError as TRPCError4 } from "@trpc/server";
import { eq as eq4 } from "drizzle-orm";
init_env();

// server/stripe/client.ts
init_env();
import Stripe from "stripe";
var _stripe = null;
function getStripe() {
  if (!_stripe) {
    if (!ENV.stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    _stripe = new Stripe(ENV.stripeSecretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true
    });
  }
  return _stripe;
}
var stripe = new Proxy({}, {
  get(_target, prop) {
    return getStripe()[prop];
  }
});

// server/stripe/products.ts
var PRODUCTS = {
  LIFETIME_MEMBERSHIP: {
    name: "\u6478\u4E86\u4E48\u6C38\u4E45\u652F\u6301\u8BA1\u5212",
    description: "\u4E00\u6B21\u6027\u4E70\u65AD\uFF0C\u4E0D\u542B\u8BA2\u9605\uFF1B\u62BD\u7B7E\u3001\u7ED3\u679C\u4E0E\u7B7E\u6587\u5361\u7247\u59CB\u7EC8\u514D\u8D39",
    priceInCents: 4990,
    currency: "cny",
    mode: "payment",
    durationDays: -1
  }
};

// server/stripe/router.ts
init_db();
init_schema();

// server/stripe/activateCheckout.ts
init_schema();
import { eq as eq3 } from "drizzle-orm";
function getMembershipDuration(productKey) {
  const product = PRODUCTS[productKey];
  if (product && "durationDays" in product) {
    return product.durationDays;
  }
  return 0;
}
function getMembershipPlan(productKey) {
  return productKey === "LIFETIME_MEMBERSHIP" ? "lifetime" : null;
}
async function activateCheckoutSession(db, session) {
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
    const dup = await db.select({ id: purchases.id }).from(purchases).where(eq3(purchases.stripePaymentIntentId, paymentIntentId)).limit(1);
    if (dup.length > 0) {
      const plan2 = getMembershipPlan(productKey);
      return { ok: true, plan: plan2, alreadyProcessed: true };
    }
  }
  await db.insert(purchases).values({
    userId,
    stripePaymentIntentId: paymentIntentId || null,
    productType: productKey || "detailed_report",
    status: "completed"
  });
  const plan = getMembershipPlan(productKey);
  if (!plan) {
    return { ok: true, plan: null };
  }
  const durationDays = getMembershipDuration(productKey);
  const existingSub = await db.select().from(subscriptions).where(eq3(subscriptions.userId, userId)).limit(1);
  let periodEnd;
  if (durationDays === -1) {
    periodEnd = /* @__PURE__ */ new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 100);
  } else {
    const now = /* @__PURE__ */ new Date();
    let startDate = now;
    if (existingSub.length > 0 && existingSub[0].status === "active" && existingSub[0].currentPeriodEnd && new Date(existingSub[0].currentPeriodEnd) > now) {
      startDate = new Date(existingSub[0].currentPeriodEnd);
    }
    periodEnd = new Date(startDate);
    periodEnd.setDate(periodEnd.getDate() + durationDays);
  }
  if (existingSub.length > 0) {
    await db.update(subscriptions).set({
      stripeCustomerId: customerId || void 0,
      status: "active",
      plan,
      currentPeriodEnd: periodEnd,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId,
      stripeCustomerId: customerId || null,
      stripeSubscriptionId: null,
      status: "active",
      plan,
      currentPeriodEnd: periodEnd
    });
  }
  return { ok: true, plan };
}

// server/stripe/paymentMethods.ts
var EXPLICIT_METHODS = ["alipay", "wechat_pay", "paypal", "link"];
var cachedTypes = null;
var cachedStatus = null;
async function readPmc() {
  const stripe2 = getStripe();
  const { data } = await stripe2.paymentMethodConfigurations.list({ limit: 1 });
  return data[0];
}
function available(cfg, key) {
  const entry = cfg?.[key];
  return Boolean(entry?.available);
}
function preferenceOn(cfg, key) {
  const entry = cfg?.[key];
  const pref = entry?.display_preference;
  return pref?.value === "on" || pref?.preference === "on";
}
async function getCheckoutPaymentMethodTypes(currency) {
  const now = Date.now();
  if (cachedTypes && now - cachedTypes.at < 5 * 6e4) {
    return cachedTypes.methods;
  }
  const types = ["card"];
  const cur = currency.toLowerCase();
  try {
    const cfg = await readPmc();
    for (const method of EXPLICIT_METHODS) {
      if (!available(cfg, method)) continue;
      if ((method === "alipay" || method === "wechat_pay") && cur !== "cny") continue;
      if (method === "paypal" && cur === "cny") continue;
      types.push(method);
    }
  } catch (err) {
    console.warn("[Stripe] payment method config lookup failed:", err);
    if (cur === "cny") types.push("alipay");
  }
  cachedTypes = { at: now, methods: types };
  return types;
}
async function getPaymentMethodsStatus() {
  const now = Date.now();
  if (cachedStatus && now - cachedStatus.at < 5 * 6e4) {
    return cachedStatus.status;
  }
  const status = {
    card: true,
    alipay: false,
    wechatPay: false,
    applePay: false,
    googlePay: false,
    paypal: false,
    link: false
  };
  try {
    const cfg = await readPmc();
    status.alipay = available(cfg, "alipay");
    status.wechatPay = available(cfg, "wechat_pay");
    status.applePay = available(cfg, "apple_pay");
    status.googlePay = available(cfg, "google_pay");
    status.paypal = available(cfg, "paypal");
    status.link = preferenceOn(cfg, "link") || available(cfg, "link");
    status.card = available(cfg, "card") || true;
    if (!status.paypal) {
      status.note = "PayPal via Stripe is only for EU/UK accounts; this US account cannot enable it.";
    }
  } catch (err) {
    console.warn("[Stripe] payment methods status failed:", err);
    status.alipay = true;
  }
  cachedStatus = { at: now, status };
  return status;
}
function checkoutPaymentMethodOptions(types) {
  if (!types.includes("wechat_pay")) return void 0;
  return { wechat_pay: { client: "web" } };
}

// server/stripe/router.ts
function checkoutOrigin(req) {
  return req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : "https://chillworks.ai");
}
var stripeRouter = router({
  createCheckoutSession: protectedProcedure.input(
    z4.object({
      productKey: z4.literal("LIFETIME_MEMBERSHIP")
    })
  ).mutation(async ({ ctx, input }) => {
    if (!ENV.stripeSecretKey) {
      throw new TRPCError4({
        code: "PRECONDITION_FAILED",
        message: "Stripe not configured"
      });
    }
    const product = PRODUCTS[input.productKey];
    const user = ctx.user;
    const origin = checkoutOrigin(ctx.req);
    const stripe2 = getStripe();
    const paymentMethodTypes = await getCheckoutPaymentMethodTypes(product.currency);
    const session = await stripe2.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price_data: {
            currency: product.currency,
            unit_amount: product.priceInCents,
            product_data: {
              name: product.name,
              description: product.description
            }
          },
          quantity: 1
        }
      ],
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel`,
      customer_email: user.email || void 0,
      client_reference_id: String(user.id),
      metadata: {
        user_id: String(user.id),
        customer_email: user.email || "",
        customer_name: user.name || "",
        product_key: input.productKey
      },
      allow_promotion_codes: true,
      payment_method_options: checkoutPaymentMethodOptions(paymentMethodTypes)
    });
    return {
      checkoutUrl: session.url,
      sessionId: session.id
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
        link: false
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
        currentPeriodEnd: null
      };
    }
    const userSubscription = await db.select().from(subscriptions).where(eq4(subscriptions.userId, ctx.user.id)).limit(1);
    if (userSubscription.length === 0) {
      return {
        hasSubscription: false,
        status: null,
        plan: null,
        currentPeriodEnd: null
      };
    }
    const sub = userSubscription[0];
    const isExpired = sub.plan !== "lifetime" && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < /* @__PURE__ */ new Date();
    return {
      hasSubscription: sub.status === "active" && !isExpired,
      status: isExpired ? "expired" : sub.status,
      plan: sub.plan,
      currentPeriodEnd: sub.currentPeriodEnd
    };
  }),
  getPurchaseHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(purchases).where(eq4(purchases.userId, ctx.user.id)).orderBy(purchases.createdAt);
  }),
  /** Fallback when webhook not configured — call from /payment/success */
  confirmCheckoutSession: protectedProcedure.input(z4.object({ sessionId: z4.string().min(1) })).mutation(async ({ ctx, input }) => {
    if (!ENV.stripeSecretKey) {
      throw new TRPCError4({ code: "PRECONDITION_FAILED", message: "Stripe not configured" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "db unavailable" });
    const session = await getStripe().checkout.sessions.retrieve(input.sessionId);
    const metaUserId = parseInt(session.metadata?.user_id || "0", 10);
    if (metaUserId !== ctx.user.id) {
      throw new TRPCError4({ code: "FORBIDDEN", message: "session user mismatch" });
    }
    const result = await activateCheckoutSession(db, session);
    return result;
  })
});

// server/routers/member.ts
import { z as z5 } from "zod";
init_db();
init_schema();
init_deviceUser();
import { eq as eq6, and, desc, sql as sql2 } from "drizzle-orm";
import { TRPCError as TRPCError5 } from "@trpc/server";
var VIP_AVATARS = [
  { emoji: "\u{1F984}", name: "\u72EC\u89D2\u517D", requiredLevel: "vip" },
  { emoji: "\u{1F409}", name: "\u795E\u9F99", requiredLevel: "vip" },
  { emoji: "\u{1F98B}", name: "\u8774\u8776", requiredLevel: "vip" },
  { emoji: "\u{1F31F}", name: "\u661F\u661F", requiredLevel: "vip" },
  { emoji: "\u{1F3AD}", name: "\u9762\u5177", requiredLevel: "annual" },
  { emoji: "\u{1F451}", name: "\u7687\u51A0", requiredLevel: "annual" },
  { emoji: "\u{1F48E}", name: "\u94BB\u77F3", requiredLevel: "annual" },
  { emoji: "\u{1F52E}", name: "\u6C34\u6676\u7403", requiredLevel: "annual" }
];
var FREE_AVATARS = ["\u{1F431}", "\u{1F436}", "\u{1F43C}", "\u{1F98A}", "\u{1F428}", "\u{1F42F}", "\u{1F438}", "\u{1F435}"];
var deviceIdInput = z5.string().min(8).max(80).regex(/^[a-zA-Z0-9_-]+$/);
async function userFromDeviceCtx(ctx, deviceId, name) {
  const resolved = await resolveWriteUser({
    cookieUser: ctx.user,
    deviceId: deviceId || deviceIdFromReq(ctx.req),
    name
  });
  if (!resolved) {
    throw new TRPCError5({
      code: "BAD_REQUEST",
      message: "deviceId required"
    });
  }
  return resolved;
}
var memberRouter = router({
  checkDrawLimit: publicProcedure.input(z5.object({ deviceId: deviceIdInput.optional() }).optional()).query(async () => {
    return { canDraw: true, remaining: -1, isVip: false, limit: null };
  }),
  /** Device-first ledger write — no cross-site cookie required. */
  recordDraw: publicProcedure.input(
    z5.object({
      deviceId: deviceIdInput.optional(),
      name: z5.string().max(32).optional(),
      date: z5.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      level: z5.string(),
      emoji: z5.string(),
      percent: z5.number(),
      message: z5.string().optional(),
      suggestedTime: z5.string().optional(),
      avatar: z5.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const user = await userFromDeviceCtx(ctx, input.deviceId, input.name);
    const date2 = input.date || shanghaiTodayKey();
    await upsertDailyDraw({
      userId: user.id,
      date: date2,
      level: input.level,
      emoji: input.emoji,
      percent: input.percent,
      message: input.message,
      suggestedTime: input.suggestedTime,
      avatar: input.avatar
    });
    return { success: true };
  }),
  getHistory: publicProcedure.input(
    z5.object({
      deviceId: deviceIdInput.optional(),
      limit: z5.number().min(1).max(100).default(20),
      offset: z5.number().min(0).default(0)
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      return { history: [], total: 0 };
    }
    const user = await resolveWriteUser({
      cookieUser: ctx.user,
      deviceId: input?.deviceId || deviceIdFromReq(ctx.req)
    });
    if (!user) {
      return { history: [], total: 0 };
    }
    const limit = input?.limit || 20;
    const offset = input?.offset || 0;
    const history = await db.select().from(fortuneHistory).where(eq6(fortuneHistory.userId, user.id)).orderBy(desc(fortuneHistory.createdAt)).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql2`count(*)` }).from(fortuneHistory).where(eq6(fortuneHistory.userId, user.id));
    return {
      history,
      total: countResult[0]?.count || 0
    };
  }),
  getAvatars: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return {
        freeAvatars: FREE_AVATARS,
        vipAvatars: VIP_AVATARS,
        unlockedAvatars: [],
        isVip: false,
        plan: null
      };
    }
    const userSubscription = await db.select().from(subscriptions).where(
      and(
        eq6(subscriptions.userId, ctx.user.id),
        eq6(subscriptions.status, "active")
      )
    ).limit(1);
    const isVip = userSubscription.length > 0;
    const plan = userSubscription[0]?.plan || null;
    const user = await db.select().from(users).where(eq6(users.id, ctx.user.id)).limit(1);
    let unlockedAvatars = [];
    if (user[0]?.unlockedAvatars) {
      try {
        unlockedAvatars = JSON.parse(user[0].unlockedAvatars);
      } catch {
        unlockedAvatars = [];
      }
    }
    return {
      freeAvatars: FREE_AVATARS,
      vipAvatars: VIP_AVATARS,
      unlockedAvatars,
      isVip,
      plan
    };
  })
});

// server/routers/feedback.ts
import { z as z6 } from "zod";
init_schema();
init_db();
import { eq as eq7, desc as desc2 } from "drizzle-orm";
import { TRPCError as TRPCError6 } from "@trpc/server";
var feedbackRouter = router({
  submit: publicProcedure.input(
    z6.object({
      type: z6.enum(["bug", "feature", "suggestion", "other"]),
      content: z6.string().min(1).max(1e3),
      contact: z6.string().max(255).optional(),
      userAgent: z6.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    }
    await db.insert(feedback).values({
      userId: ctx.user?.id ?? null,
      type: input.type,
      content: input.content,
      contact: input.contact || null,
      userAgent: input.userAgent || null
    });
    try {
      await notifyOwner({
        title: `MoYu feedback: ${input.type}`,
        content: input.content.slice(0, 500)
      });
    } catch (err) {
      console.warn("[feedback] notifyOwner skipped:", err);
    }
    return { success: true };
  }),
  list: adminProcedure.input(
    z6.object({
      status: z6.enum(["pending", "reviewed", "resolved", "closed"]).optional()
    }).optional()
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(feedback).orderBy(desc2(feedback.createdAt));
    if (input?.status) {
      return rows.filter((r) => r.status === input.status);
    }
    return rows;
  }),
  updateStatus: adminProcedure.input(
    z6.object({
      id: z6.number(),
      status: z6.enum(["pending", "reviewed", "resolved", "closed"])
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "db unavailable" });
    await db.update(feedback).set({ status: input.status }).where(eq7(feedback.id, input.id));
    return { success: true };
  }),
  reply: adminProcedure.input(
    z6.object({
      id: z6.number(),
      reply: z6.string().min(1).max(2e3)
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "db unavailable" });
    const rows = await db.select().from(feedback).where(eq7(feedback.id, input.id)).limit(1);
    const row = rows[0];
    if (!row) throw new TRPCError6({ code: "NOT_FOUND", message: "feedback not found" });
    await db.update(feedback).set({
      adminReply: input.reply,
      repliedAt: /* @__PURE__ */ new Date(),
      status: "resolved"
    }).where(eq7(feedback.id, input.id));
    if (row.userId) {
      await db.insert(notifications).values({
        userId: row.userId,
        type: "feedback_reply",
        title: "\u53CD\u9988\u56DE\u590D",
        content: input.reply,
        relatedId: row.id
      });
    }
    return { success: true };
  })
});

// server/routers/notification.ts
import { z as z7 } from "zod";
init_schema();
init_db();
import { eq as eq8, desc as desc3, and as and2, sql as sql3 } from "drizzle-orm";
var notificationRouter = router({
  // 获取用户通知列表
  list: protectedProcedure.input(
    z7.object({
      limit: z7.number().min(1).max(50).default(20),
      unreadOnly: z7.boolean().default(false)
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const limit = input?.limit ?? 20;
    const unreadOnly = input?.unreadOnly ?? false;
    if (unreadOnly) {
      return await db.select().from(notifications).where(and2(eq8(notifications.userId, ctx.user.id), eq8(notifications.isRead, false))).orderBy(desc3(notifications.createdAt)).limit(limit);
    }
    return await db.select().from(notifications).where(eq8(notifications.userId, ctx.user.id)).orderBy(desc3(notifications.createdAt)).limit(limit);
  }),
  // 获取未读通知数量
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const result = await db.select({ count: sql3`count(*)` }).from(notifications).where(and2(eq8(notifications.userId, ctx.user.id), eq8(notifications.isRead, false)));
    return { count: result[0]?.count ?? 0 };
  }),
  // 标记通知为已读
  markAsRead: protectedProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    await db.update(notifications).set({ isRead: true }).where(and2(eq8(notifications.id, input.id), eq8(notifications.userId, ctx.user.id)));
    return { success: true };
  }),
  // 标记所有通知为已读
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    await db.update(notifications).set({ isRead: true }).where(eq8(notifications.userId, ctx.user.id));
    return { success: true };
  })
});

// server/routers/leaderboard.ts
import { z as z8 } from "zod";
init_schema();
init_db();
import { eq as eq9, desc as desc4, sql as sql4, and as and3, gte, lte } from "drizzle-orm";
function getWeekRange() {
  const now = /* @__PURE__ */ new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
function asRows(result) {
  if (Array.isArray(result)) return result;
  const nested = result?.rows;
  if (Array.isArray(nested)) return nested;
  return [];
}
var leaderboardRouter = router({
  streakRanking: publicProcedure.input(
    z8.object({
      limit: z8.number().min(1).max(50).default(20)
    }).optional()
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      return { rankings: [], myRank: null };
    }
    const limit = input?.limit ?? 20;
    const result = await db.execute(sql4`
        WITH user_dates AS (
          SELECT
            "userId" AS user_id,
            ("createdAt")::date AS draw_date
          FROM fortune_history
          GROUP BY "userId", ("createdAt")::date
        ),
        numbered AS (
          SELECT
            user_id,
            draw_date,
            draw_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY draw_date))::int AS streak_group
          FROM user_dates
        ),
        streak_counts AS (
          SELECT
            user_id,
            streak_group,
            COUNT(*)::int AS streak_length,
            MAX(draw_date) AS last_date
          FROM numbered
          GROUP BY user_id, streak_group
        ),
        current_streaks AS (
          SELECT DISTINCT ON (sc.user_id)
            sc.user_id,
            sc.streak_length,
            sc.last_date
          FROM streak_counts sc
          WHERE sc.last_date >= CURRENT_DATE - INTERVAL '1 day'
          ORDER BY sc.user_id, sc.streak_length DESC, sc.last_date DESC
        )
        SELECT
          cs.user_id AS "userId",
          u.name,
          cs.streak_length AS streak,
          cs.last_date AS "lastActive"
        FROM current_streaks cs
        JOIN users u ON cs.user_id = u.id
        ORDER BY cs.streak_length DESC, cs.last_date DESC
        LIMIT ${limit}
      `);
    const rankings = asRows(result).map((row, index2) => ({
      rank: index2 + 1,
      userId: Number(row.userId),
      name: row.name || "\u6478\u9C7C\u8FBE\u4EBA",
      streak: Number(row.streak),
      lastActive: row.lastActive
    }));
    return { rankings };
  }),
  weeklyBestRanking: publicProcedure.input(
    z8.object({
      limit: z8.number().min(1).max(50).default(20)
    }).optional()
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      return { rankings: [], weekRange: null };
    }
    const limit = input?.limit ?? 20;
    const { start, end } = getWeekRange();
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const result = await db.execute(sql4`
        WITH weekly_fortune AS (
          SELECT
            fh."userId" AS user_id,
            u.name,
            fh.level,
            fh.percent,
            fh.emoji,
            fh."createdAt",
            CASE fh.level
              WHEN '大吉' THEN 5
              WHEN '中吉' THEN 4
              WHEN '小吉' THEN 3
              WHEN '末吉' THEN 2
              WHEN '凶' THEN 1
              ELSE 0
            END AS level_weight
          FROM fortune_history fh
          JOIN users u ON fh."userId" = u.id
          WHERE fh."createdAt" >= ${startIso}::timestamptz
            AND fh."createdAt" <= ${endIso}::timestamptz
        ),
        user_best AS (
          SELECT
            user_id,
            name,
            MAX(level_weight) AS best_level_weight,
            AVG(percent) AS avg_percent,
            COUNT(*)::int AS total_draws,
            MAX(percent) AS best_percent
          FROM weekly_fortune
          GROUP BY user_id, name
        ),
        user_best_detail AS (
          SELECT
            ub.user_id,
            ub.name,
            ub.best_level_weight,
            ub.avg_percent,
            ub.total_draws,
            ub.best_percent,
            (
              SELECT wf.level
              FROM weekly_fortune wf
              WHERE wf.user_id = ub.user_id AND wf.level_weight = ub.best_level_weight
              ORDER BY wf.percent DESC
              LIMIT 1
            ) AS best_level,
            (
              SELECT wf.emoji
              FROM weekly_fortune wf
              WHERE wf.user_id = ub.user_id AND wf.level_weight = ub.best_level_weight
              ORDER BY wf.percent DESC
              LIMIT 1
            ) AS best_emoji
          FROM user_best ub
        )
        SELECT
          user_id AS "userId",
          name,
          best_level,
          best_emoji,
          best_percent,
          avg_percent,
          total_draws
        FROM user_best_detail
        ORDER BY best_level_weight DESC, best_percent DESC, total_draws DESC
        LIMIT ${limit}
      `);
    const rankings = asRows(result).map((row, index2) => ({
      rank: index2 + 1,
      userId: Number(row.userId),
      name: row.name || "\u6478\u9C7C\u8FBE\u4EBA",
      bestLevel: row.best_level,
      bestEmoji: row.best_emoji,
      bestPercent: Number(row.best_percent),
      avgPercent: Math.round(Number(row.avg_percent)),
      totalDraws: Number(row.total_draws)
    }));
    return {
      rankings,
      weekRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    };
  }),
  myRanking: publicProcedure.input(
    z8.object({
      deviceId: z8.string().min(8).max(80).regex(/^[a-zA-Z0-9_-]+$/).optional()
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      return { streak: 0, weeklyBest: null, totalDraws: 0 };
    }
    const { resolveWriteUser: resolveWriteUser2, deviceIdFromReq: deviceIdFromReq2 } = await Promise.resolve().then(() => (init_deviceUser(), deviceUser_exports));
    const user = await resolveWriteUser2({
      cookieUser: ctx.user,
      deviceId: input?.deviceId || deviceIdFromReq2(ctx.req)
    });
    if (!user) {
      return { streak: 0, weeklyBest: null, totalDraws: 0 };
    }
    const streakResult = await db.execute(sql4`
      WITH my_dates AS (
        SELECT ("createdAt")::date AS draw_date
        FROM fortune_history
        WHERE "userId" = ${user.id}
        GROUP BY ("createdAt")::date
      ),
      numbered AS (
        SELECT
          draw_date,
          draw_date - (ROW_NUMBER() OVER (ORDER BY draw_date DESC))::int AS streak_group
        FROM my_dates
      )
      SELECT COUNT(*)::int AS streak
      FROM numbered
      WHERE streak_group = (SELECT streak_group FROM numbered ORDER BY draw_date DESC LIMIT 1)
        AND draw_date >= CURRENT_DATE - INTERVAL '365 days'
    `);
    const streak = Number(asRows(streakResult)[0]?.streak || 0);
    const { start, end } = getWeekRange();
    const weeklyBest = await db.select({
      level: fortuneHistory.level,
      percent: fortuneHistory.percent,
      emoji: fortuneHistory.emoji
    }).from(fortuneHistory).where(
      and3(
        eq9(fortuneHistory.userId, user.id),
        gte(fortuneHistory.createdAt, start),
        lte(fortuneHistory.createdAt, end)
      )
    ).orderBy(desc4(fortuneHistory.percent)).limit(1);
    const totalResult = await db.select({ count: sql4`count(*)` }).from(fortuneHistory).where(eq9(fortuneHistory.userId, user.id));
    return {
      streak,
      weeklyBest: weeklyBest[0] || null,
      totalDraws: Number(totalResult[0]?.count || 0)
    };
  }),
  globalStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        totalUsers: 0,
        drawers: 0,
        totalDraws: 0,
        todayDraws: 0,
        avgPercent: 0
      };
    }
    const stats = await db.execute(sql4`
      SELECT
        (SELECT COUNT(DISTINCT "userId")::int FROM fortune_history) AS "drawers",
        (SELECT COUNT(*)::int FROM fortune_history) AS "totalDraws",
        (
          SELECT COUNT(*)::int
          FROM fortune_history
          WHERE ("createdAt")::date = CURRENT_DATE
             OR (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai')::date
                = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai')::date
        ) AS "todayDraws",
        (SELECT COALESCE(ROUND(AVG(percent)), 0)::int FROM fortune_history) AS "avgPercent"
    `);
    const row = asRows(stats)[0] || {};
    const drawers = Number(row.drawers || 0);
    return {
      /** @deprecated use drawers — kept so old clients still render something real */
      totalUsers: drawers,
      drawers,
      totalDraws: Number(row.totalDraws || 0),
      todayDraws: Number(row.todayDraws || 0),
      avgPercent: Number(row.avgPercent || 0)
    };
  }),
  /**
   * Real "beat X%" vs today's draws (P1-1).
   * Returns null when sample size is too small — never invent percentages.
   */
  beatPercent: publicProcedure.input(z8.object({ percent: z8.number().min(0).max(100) })).query(async ({ input }) => {
    const MIN_SAMPLE = 20;
    const db = await getDb();
    if (!db) return { beatPercent: null, sampleSize: 0 };
    const result = await db.execute(sql4`
        SELECT
          COUNT(*)::int AS "sampleSize",
          COUNT(*) FILTER (WHERE percent < ${input.percent})::int AS "below"
        FROM fortune_history
        WHERE ("createdAt")::date = CURRENT_DATE
      `);
    const row = asRows(result)[0] || {};
    const sampleSize = Number(row.sampleSize || 0);
    if (sampleSize < MIN_SAMPLE) {
      return { beatPercent: null, sampleSize };
    }
    const below = Number(row.below || 0);
    const beatPercent = Math.max(
      0,
      Math.min(99, Math.round(below / sampleSize * 100))
    );
    return { beatPercent, sampleSize };
  })
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: authRouter,
  fortune: fortuneRouter,
  stripe: stripeRouter,
  member: memberRouter,
  feedback: feedbackRouter,
  notification: notificationRouter,
  leaderboard: leaderboardRouter
});

// server/_core/context.ts
init_guestAuth();
async function createContext(opts) {
  let user = null;
  try {
    user = await authenticateRequest(opts.req);
  } catch {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/stripe/webhook.ts
import { Router } from "express";
init_env();
init_db();
var webhookRouter = Router();
webhookRouter.post(
  "/api/stripe/webhook",
  async (req, res) => {
    if (!ENV.stripeWebhookSecret) {
      console.error("[Webhook] STRIPE_WEBHOOK_SECRET not configured");
      return res.status(503).send("Webhook secret not configured");
    }
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = getStripe().webhooks.constructEvent(
        req.body,
        sig,
        ENV.stripeWebhookSecret
      );
    } catch (err) {
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
          const session = event.data.object;
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

// server/cron/dailyNotification.ts
init_db();
init_schema();
import { sql as sql5 } from "drizzle-orm";
var DAILY_TIPS_ZH = [
  "\u{1F41F} \u4ECA\u65E5\u5B9C\u6478\u9C7C\uFF0C\u4E0D\u5B9C\u52A0\u73ED\u3002\u6765\u62BD\u4E00\u7B7E\u770B\u770B\u8FD0\u52BF\u5982\u4F55\uFF1F",
  "\u2615 \u65B0\u7684\u4E00\u5929\uFF0C\u65B0\u7684\u6478\u9C7C\u673A\u4F1A\uFF01\u5FEB\u6765\u770B\u770B\u4ECA\u5929\u7684\u8FD0\u52BF\u5427~",
  "\u{1F3B0} \u4ECA\u65E5\u4EFD\u7684\u6478\u9C7C\u8FD0\u52BF\u5DF2\u66F4\u65B0\uFF0C\u70B9\u51FB\u67E5\u770B\u4F60\u7684\u4E13\u5C5E\u9884\u6D4B\uFF01",
  "\u{1F31F} \u636E\u8BF4\u4ECA\u5929\u62BD\u5230\u5927\u5409\u7684\u6982\u7387\u7279\u522B\u9AD8\uFF0C\u4E0D\u6765\u8BD5\u8BD5\uFF1F",
  "\u{1F431} \u529E\u516C\u5BA4\u7684\u732B\u90FD\u5728\u7B49\u4F60\u6765\u62BD\u7B7E\u4E86\uFF0C\u5FEB\u6765\u6478\u9C7C\u5427\uFF01",
  "\u{1F4A4} \u4ECA\u5929\u9002\u5408\u6478\u9C7C\u7684\u6307\u6570\u5DF2\u5237\u65B0\uFF0C\u6765\u770B\u770B\u4F60\u80FD\u6478\u591A\u4E45~",
  "\u{1F3AF} \u6BCF\u65E5\u4E00\u7B7E\uFF0C\u6478\u9C7C\u6709\u9053\u3002\u4ECA\u5929\u7684\u8FD0\u52BF\u7B49\u4F60\u6765\u63ED\u6653\uFF01",
  "\u{1F52E} \u4ECA\u65E5\u6478\u9C7C\u8FD0\u52BF\u5DF2\u751F\u6210\uFF0C\u636E\u8BF4\u8FDE\u7EED\u7B7E\u5230\u4F1A\u6709\u597D\u8FD0\u54E6~",
  "\u{1F3D6}\uFE0F \u5DE5\u4F5C\u518D\u5FD9\u4E5F\u8981\u6478\u9C7C\uFF01\u6765\u770B\u770B\u4ECA\u5929\u7684\u9EC4\u91D1\u6478\u9C7C\u65F6\u6BB5~",
  "\u{1F3AA} \u65B0\u7684\u4E00\u5929\uFF0C\u65B0\u7684\u8FD0\u52BF\uFF01\u8FDE\u7EED\u7B7E\u5230\u53EF\u4EE5\u4E0A\u6392\u884C\u699C\u54E6~"
];
var DAILY_TIPS_TITLES_ZH = [
  "\u{1F41F} \u4ECA\u65E5\u6478\u9C7C\u8FD0\u52BF\u9884\u544A",
  "\u2600\uFE0F \u65E9\u5B89\uFF01\u4ECA\u65E5\u8FD0\u52BF\u5DF2\u66F4\u65B0",
  "\u{1F3B0} \u6BCF\u65E5\u4E00\u7B7E\uFF0C\u597D\u8FD0\u8FDE\u8FDE",
  "\u2728 \u4ECA\u5929\u7684\u6478\u9C7C\u8FD0\u52BF\u6765\u4E86",
  "\u{1F308} \u65B0\u7684\u4E00\u5929\uFF0C\u65B0\u7684\u8FD0\u52BF"
];
async function sendDailyNotifications() {
  console.log("[DailyNotification] Starting daily notification job...");
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const activeUsers = await db.select({ id: users.id, name: users.name }).from(users).where(sql5`${users.lastSignedIn} >= ${sevenDaysAgo}`);
    if (activeUsers.length === 0) {
      console.log("[DailyNotification] No active users found, skipping.");
      return;
    }
    const title = DAILY_TIPS_TITLES_ZH[Math.floor(Math.random() * DAILY_TIPS_TITLES_ZH.length)];
    const content = DAILY_TIPS_ZH[Math.floor(Math.random() * DAILY_TIPS_ZH.length)];
    const notificationRecords = activeUsers.map((user) => ({
      userId: user.id,
      type: "system",
      title,
      content,
      isRead: false
    }));
    const batchSize = 100;
    for (let i = 0; i < notificationRecords.length; i += batchSize) {
      const batch = notificationRecords.slice(i, i + batchSize);
      await db.insert(notifications).values(batch);
    }
    console.log(`[DailyNotification] Sent ${notificationRecords.length} notifications to active users.`);
  } catch (error) {
    console.error("[DailyNotification] Error sending daily notifications:", error);
  }
}
function startDailyNotificationCron() {
  const INTERVAL_MS = 60 * 1e3;
  let lastRunDate = "";
  setInterval(() => {
    const now = /* @__PURE__ */ new Date();
    const utc8Hour = (now.getUTCHours() + 8) % 24;
    const utc8Date = new Date(now.getTime() + 8 * 60 * 60 * 1e3).toISOString().split("T")[0];
    if (utc8Hour === 9 && now.getUTCMinutes() === 0 && lastRunDate !== utc8Date) {
      lastRunDate = utc8Date;
      sendDailyNotifications().catch(console.error);
    }
  }, INTERVAL_MS);
  console.log("[DailyNotification] Cron job registered. Will send at 9:00 AM UTC+8 daily.");
}

// server/_core/adminOverview.ts
init_db();
init_deviceUser();
import { timingSafeEqual as timingSafeEqual2 } from "node:crypto";
import { sql as sql6 } from "drizzle-orm";
var EXCLUDED_DEVICE_SQL = "^(smoke|test)-";
var EXCLUDED_OPENID_SQL = "^guest_(smoke|test)-";
function adminTokenOk(provided, expected = process.env.MOYU_ADMIN_TOKEN) {
  if (!expected || typeof provided !== "string" || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual2(a, b);
}
function requestToken(req) {
  const q = req.query.token;
  if (typeof q === "string" && q) return q;
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return "";
}
function asRows2(result) {
  if (Array.isArray(result)) return result;
  const nested = result?.rows;
  if (Array.isArray(nested)) return nested;
  return [];
}
function launchDay() {
  return process.env.MOYU_METRICS_LAUNCH_DATE || "2026-07-15";
}
async function buildAdminOverview() {
  const db = await getDb();
  if (!db) return null;
  const day = shanghaiTodayKey();
  const ledgerToday = asRows2(
    await db.execute(sql6`
      SELECT
        COUNT(*)::int AS draws,
        COUNT(DISTINCT fh."userId")::int AS draw_devices
      FROM fortune_history fh
      JOIN users u ON u.id = fh."userId"
      WHERE u."openId" !~* ${EXCLUDED_OPENID_SQL}
        AND ((fh."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai')::date
            = ${day}::date
    `)
  )[0];
  const newDevices = asRows2(
    await db.execute(sql6`
      SELECT COUNT(*)::int AS n
      FROM users u
      WHERE u."openId" !~* ${EXCLUDED_OPENID_SQL}
        AND ((u."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai')::date
            = ${day}::date
    `)
  )[0];
  const eventsToday = asRows2(
    await db.execute(sql6`
      SELECT
        COUNT(*) FILTER (WHERE event = 'share_click')::int AS share_clicks,
        COUNT(DISTINCT device_id) FILTER (WHERE event = 'share_click')::int AS share_devices,
        COUNT(*) FILTER (WHERE event = 'card_saved')::int AS card_saves,
        COUNT(*) FILTER (WHERE event = 'membership_view')::int AS membership_views
      FROM analytics_events
      WHERE device_id !~* ${EXCLUDED_DEVICE_SQL}
        AND (client_occurred_at AT TIME ZONE 'Asia/Shanghai')::date = ${day}::date
    `)
  )[0];
  const totals = asRows2(
    await db.execute(sql6`
      SELECT
        (SELECT COUNT(*)::int FROM fortune_history fh JOIN users u ON u.id = fh."userId"
          WHERE u."openId" !~* ${EXCLUDED_OPENID_SQL}) AS draws,
        (SELECT COUNT(DISTINCT fh."userId")::int FROM fortune_history fh JOIN users u ON u.id = fh."userId"
          WHERE u."openId" !~* ${EXCLUDED_OPENID_SQL}) AS draw_devices,
        (SELECT COUNT(*)::int FROM feedback) AS feedback
    `)
  )[0];
  const firstDraws = asRows2(
    await db.execute(sql6`
      SELECT DISTINCT ON (device_id)
        device_id,
        props ->> 'utm_source' AS source
      FROM analytics_events
      WHERE event = 'draw'
        AND device_id !~* ${EXCLUDED_DEVICE_SQL}
        AND (client_occurred_at AT TIME ZONE 'Asia/Shanghai')::date >= ${launchDay()}::date
      ORDER BY device_id, client_occurred_at ASC
    `)
  );
  const channelFirstDraws = {};
  for (const row of firstDraws) {
    const source = String(row.source || "").trim();
    if (!source) continue;
    channelFirstDraws[source] = (channelFirstDraws[source] || 0) + 1;
  }
  const recentDraws = asRows2(
    await db.execute(sql6`
      SELECT
        TO_CHAR((fh."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai',
                'MM-DD HH24:MI') AS at,
        u."openId" AS open_id,
        u.name,
        fh.level,
        fh.percent
      FROM fortune_history fh
      JOIN users u ON u.id = fh."userId"
      ORDER BY fh."createdAt" DESC
      LIMIT 20
    `)
  ).map((row) => {
    const openId = String(row.open_id || "");
    const deviceId = openId.startsWith("guest_") ? openId.slice(6) : openId;
    return {
      at: String(row.at || ""),
      deviceId: deviceId.slice(0, 12),
      name: String(row.name || "\u6478\u9C7C\u8FBE\u4EBA"),
      level: String(row.level || ""),
      percent: Number(row.percent || 0)
    };
  });
  const recentFeedback = asRows2(
    await db.execute(sql6`
      SELECT
        TO_CHAR((f."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai',
                'MM-DD HH24:MI') AS at,
        f.type,
        f.content,
        f.contact
      FROM feedback f
      ORDER BY f."createdAt" DESC
      LIMIT 10
    `)
  ).map((row) => ({
    at: String(row.at || ""),
    type: String(row.type || ""),
    content: String(row.content || ""),
    contact: String(row.contact || "")
  }));
  return {
    ok: true,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    day,
    launchDay: launchDay(),
    today: {
      draws: Number(ledgerToday?.draws || 0),
      drawDevices: Number(ledgerToday?.draw_devices || 0),
      newDevices: Number(newDevices?.n || 0),
      shareClicks: Number(eventsToday?.share_clicks || 0),
      shareDevices: Number(eventsToday?.share_devices || 0),
      cardSaves: Number(eventsToday?.card_saves || 0),
      membershipViews: Number(eventsToday?.membership_views || 0)
    },
    total: {
      draws: Number(totals?.draws || 0),
      drawDevices: Number(totals?.draw_devices || 0),
      feedback: Number(totals?.feedback || 0)
    },
    channelFirstDraws,
    recentDraws,
    recentFeedback
  };
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function renderHtml(data) {
  const stat = (label, value) => `<div class="stat"><div class="v">${value}</div><div class="l">${label}</div></div>`;
  const channels = Object.entries(data.channelFirstDraws).sort(([, a], [, b]) => b - a).map(([source, count]) => `<tr><td>${escapeHtml(source)}</td><td>${count}</td></tr>`).join("");
  const draws = data.recentDraws.map(
    (row) => `<tr><td>${row.at}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(
      row.deviceId
    )}\u2026</td><td>${escapeHtml(row.level)} ${row.percent}%</td></tr>`
  ).join("");
  const feedback2 = data.recentFeedback.map(
    (row) => `<tr><td>${row.at}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(
      row.content.slice(0, 120)
    )}</td><td>${escapeHtml(row.contact)}</td></tr>`
  ).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta http-equiv="refresh" content="300">
<title>\u6478\u4E86\u4E48 \xB7 \u8FD0\u8425\u603B\u89C8</title>
<style>
body{margin:0;padding:20px;background:#140b05;color:#f3e2c7;font:14px/1.5 -apple-system,"PingFang SC",sans-serif}
h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;color:#d9a94f;margin:22px 0 8px}
.sub{color:#8d7a5e;font-size:12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(105px,1fr));gap:8px;margin-top:14px}
.stat{background:rgba(255,180,50,.07);border:1px solid rgba(255,180,50,.18);border-radius:12px;padding:10px}
.stat .v{font-size:22px;font-weight:700;color:#ffd54f}.stat .l{font-size:11px;color:#a98f66;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:12px}
td{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.06);vertical-align:top}
tr td:first-child{white-space:nowrap;color:#8d7a5e}
.empty{color:#6b5a42;font-size:12px;padding:8px 0}
</style></head><body>
<h1>\u6478\u4E86\u4E48 \xB7 \u8FD0\u8425\u603B\u89C8</h1>
<div class="sub">\u4E0A\u6D77\u65F6\u95F4 ${data.day} \xB7 \u751F\u6210\u4E8E ${escapeHtml(data.generatedAt)} \xB7 \u6BCF 5 \u5206\u949F\u81EA\u52A8\u5237\u65B0 \xB7 smoke-*/test-* \u5DF2\u6392\u9664</div>
<h2>\u4ECA\u5929</h2>
<div class="grid">
${stat("\u62BD\u7B7E\u6B21\u6570", data.today.draws)}
${stat("\u62BD\u7B7E\u8BBE\u5907", data.today.drawDevices)}
${stat("\u65B0\u8BBE\u5907", data.today.newDevices)}
${stat("\u5206\u4EAB\u70B9\u51FB", data.today.shareClicks)}
${stat("\u5206\u4EAB\u8BBE\u5907", data.today.shareDevices)}
${stat("\u5361\u7247\u4FDD\u5B58", data.today.cardSaves)}
${stat("\u4F1A\u5458\u9875\u6D4F\u89C8", data.today.membershipViews)}
</div>
<h2>\u7D2F\u8BA1</h2>
<div class="grid">
${stat("\u603B\u62BD\u7B7E", data.total.draws)}
${stat("\u603B\u8BBE\u5907", data.total.drawDevices)}
${stat("\u53CD\u9988\u6761\u6570", data.total.feedback)}
</div>
<h2>\u6E20\u9053\u9996\u62BD\uFF08${data.launchDay} \u8D77\uFF09</h2>
${channels ? `<table>${channels}</table>` : `<div class="empty">\u6682\u65E0\u6E20\u9053\u6570\u636E \u2014 \u53D1\u5E16\u540E\u8FD9\u91CC\u4F1A\u51FA\u73B0 jike / xiaohongshu / v2ex / twitter_zh</div>`}
<h2>\u6700\u8FD1 20 \u6B21\u62BD\u7B7E</h2>
${draws ? `<table>${draws}</table>` : `<div class="empty">\u6682\u65E0\u62BD\u7B7E</div>`}
<h2>\u6700\u8FD1\u53CD\u9988</h2>
${feedback2 ? `<table>${feedback2}</table>` : `<div class="empty">\u6682\u65E0\u53CD\u9988</div>`}
</body></html>`;
}
function registerAdminApi(app) {
  app.get("/api/admin/overview", async (req, res) => {
    if (!process.env.MOYU_ADMIN_TOKEN) {
      return res.status(503).json({ ok: false, error: "admin_disabled" });
    }
    if (!adminTokenOk(requestToken(req))) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    try {
      const data = await buildAdminOverview();
      if (!data) return res.status(503).json({ ok: false, error: "no_db" });
      if (req.query.format === "json") return res.json(data);
      return res.type("html").send(renderHtml(data));
    } catch (error) {
      console.warn("[admin overview]", error);
      return res.status(500).json({ ok: false });
    }
  });
}

// server/light/store.ts
import fs from "node:fs";
import path from "node:path";
import { createHash as createHash2, randomBytes as randomBytes2 } from "node:crypto";
var DATA_DIR = process.env.MOYU_DATA_DIR || path.join(process.cwd(), "data");
var DATA_FILE = path.join(DATA_DIR, "moyu-light.json");
var MAX_DRAWS = 5e3;
var MAX_FEEDBACK = 2e3;
var VERSION = "sx2b2-1.0";
var LIBSQL_URL = (process.env.LIBSQL_URL || process.env.DATABASE_URL || "").trim();
var LIBSQL_TOKEN = (process.env.LIBSQL_AUTH_TOKEN || "").trim();
var useRemote = Boolean(LIBSQL_URL) && Boolean(LIBSQL_TOKEN) && (LIBSQL_URL.startsWith("libsql://") || LIBSQL_URL.startsWith("https://") || LIBSQL_URL.startsWith("http://"));
function empty() {
  return {
    draws: [],
    feedback: [],
    invites: [],
    inviteUses: [],
    profiles: []
  };
}
function normalize(raw) {
  const base = empty();
  if (!raw || typeof raw !== "object") return base;
  return {
    draws: Array.isArray(raw.draws) ? raw.draws : [],
    feedback: Array.isArray(raw.feedback) ? raw.feedback : [],
    invites: Array.isArray(raw.invites) ? raw.invites : [],
    inviteUses: Array.isArray(raw.inviteUses) ? raw.inviteUses : [],
    profiles: Array.isArray(raw.profiles) ? raw.profiles : []
  };
}
function loadLocal() {
  try {
    if (!fs.existsSync(DATA_FILE)) return empty();
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return normalize(JSON.parse(raw));
  } catch {
    return empty();
  }
}
function saveLocal(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data), "utf8");
  fs.renameSync(tmp, DATA_FILE);
}
function httpUrlFromLibsql(url) {
  if (url.startsWith("libsql://")) {
    return `https://${url.slice("libsql://".length)}`;
  }
  return url.replace(/\/$/, "");
}
async function tursoExec(sql9, args = []) {
  const base = httpUrlFromLibsql(LIBSQL_URL);
  const res = await fetch(`${base}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LIBSQL_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requests: [
        {
          type: "execute",
          stmt: {
            sql: sql9,
            args: args.map((a) => ({
              type: typeof a === "number" ? "integer" : "text",
              value: String(a)
            }))
          }
        },
        { type: "close" }
      ]
    })
  });
  if (!res.ok) {
    const text2 = await res.text().catch(() => "");
    throw new Error(`turso_http_${res.status}:${text2.slice(0, 120)}`);
  }
  return await res.json();
}
async function ensureRemoteSchema() {
  await tursoExec(
    "CREATE TABLE IF NOT EXISTS moyu_light_blob (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at TEXT NOT NULL)"
  );
}
async function loadRemote() {
  try {
    await ensureRemoteSchema();
    const out = await tursoExec("SELECT payload FROM moyu_light_blob WHERE id = 1");
    const row = out.results?.[0]?.response?.result?.rows?.[0]?.[0];
    const payload = row?.value;
    if (!payload) return null;
    return normalize(JSON.parse(payload));
  } catch (e) {
    console.warn("[moyu-light] remote load failed, using local", e);
    return null;
  }
}
async function saveRemote(data) {
  try {
    await ensureRemoteSchema();
    const payload = JSON.stringify(data);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await tursoExec(
      "INSERT INTO moyu_light_blob (id, payload, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at",
      [payload, now]
    );
  } catch (e) {
    console.warn("[moyu-light] remote save failed", e);
  }
}
var cache = null;
var ready = null;
var remoteOk = false;
function ensureStoreReady() {
  if (!ready) {
    ready = (async () => {
      if (useRemote) {
        const remote = await loadRemote();
        if (remote) {
          cache = remote;
          remoteOk = true;
          saveLocal(remote);
          return;
        }
      }
      cache = loadLocal();
      if (useRemote) {
        await saveRemote(cache);
        remoteOk = true;
      }
    })();
  }
  return ready;
}
function getStore() {
  if (!cache) cache = loadLocal();
  return cache;
}
function persist() {
  if (!cache) return;
  saveLocal(cache);
  if (useRemote) {
    void saveRemote(cache);
  }
}
function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes2(3).toString("hex")}`;
}
function upsertProfile(deviceId, name, avatar) {
  const s = getStore();
  const existing = s.profiles.find((p) => p.deviceId === deviceId);
  const nextName = String(name || existing?.name || "\u6478\u9C7C\u8FBE\u4EBA").slice(0, 32);
  const nextAvatar = String(avatar || existing?.avatar || "").slice(0, 64);
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (existing) {
    existing.name = nextName;
    existing.avatar = nextAvatar;
    existing.updatedAt = updatedAt;
  } else {
    s.profiles.push({ deviceId, name: nextName, avatar: nextAvatar, updatedAt });
  }
}
function deviceStreak(deviceId) {
  const list = getStore().draws.filter((d) => d.deviceId === deviceId);
  const days = new Set(list.map((d) => d.createdAt.slice(0, 10)));
  const lastDate = Array.from(days).sort().reverse()[0] || "";
  if (!lastDate) return { streak: 0, lastDate: "", totalDraws: list.length };
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  if (lastDate !== today && lastDate !== yesterday) {
    return { streak: 0, lastDate, totalDraws: list.length };
  }
  let streak = 0;
  let cursor = /* @__PURE__ */ new Date(`${lastDate}T12:00:00Z`);
  for (; ; ) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor = new Date(cursor.getTime() - 864e5);
    if (streak > 365) break;
  }
  return { streak, lastDate, totalDraws: list.length };
}
function lightHealth() {
  const s = getStore();
  return {
    ok: true,
    service: "moyu-light",
    version: VERSION,
    draws: s.draws.length,
    feedback: s.feedback.length,
    invites: s.invites.length,
    inviteUses: s.inviteUses.length,
    profiles: s.profiles.length,
    ephemeral: !remoteOk,
    persistence: remoteOk ? "turso" : "json",
    note: remoteOk ? "Turso blob persistence enabled; GH Pages frontend on chillworks.ai" : "Render Free disk is ephemeral unless LIBSQL_URL+LIBSQL_AUTH_TOKEN set; frontend on chillworks.ai"
  };
}
function recordDraw(input) {
  const deviceId = String(input.deviceId || "").slice(0, 80);
  if (!deviceId) throw new Error("deviceId required");
  const draw = {
    id: id("d"),
    deviceId,
    name: String(input.name || "\u6478\u9C7C\u8FBE\u4EBA").slice(0, 32),
    level: String(input.level || "\u5C0F\u5409").slice(0, 8),
    emoji: String(input.emoji || "\u{1F41F}").slice(0, 8),
    percent: Math.max(0, Math.min(100, Number(input.percent) || 0)),
    message: String(input.message || "").slice(0, 240),
    suggestedTime: String(input.suggestedTime || "").slice(0, 32),
    avatar: String(input.avatar || "").slice(0, 64),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const s = getStore();
  s.draws.unshift(draw);
  if (s.draws.length > MAX_DRAWS) s.draws.length = MAX_DRAWS;
  upsertProfile(deviceId, draw.name, draw.avatar);
  persist();
  return draw;
}
function getHistory(deviceId, limit = 30) {
  const idKey = String(deviceId || "").slice(0, 80);
  if (!idKey) return [];
  const lim = Math.max(1, Math.min(100, limit));
  return getStore().draws.filter((d) => d.deviceId === idKey).slice(0, lim);
}
function getLeaderboard(limit = 30) {
  const lim = Math.max(1, Math.min(50, limit));
  const draws = getStore().draws;
  const byDevice = /* @__PURE__ */ new Map();
  for (const d of draws) {
    const list = byDevice.get(d.deviceId) || [];
    list.push(d);
    byDevice.set(d.deviceId, list);
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const streakRows = [];
  for (const [deviceId, list] of Array.from(byDevice.entries())) {
    const days = new Set(list.map((d) => d.createdAt.slice(0, 10)));
    const lastDate = Array.from(days).sort().reverse()[0] || "";
    if (lastDate !== today && lastDate !== yesterday) continue;
    let streak = 0;
    let cursor = /* @__PURE__ */ new Date(`${lastDate}T12:00:00Z`);
    for (; ; ) {
      const key = cursor.toISOString().slice(0, 10);
      if (!days.has(key)) break;
      streak += 1;
      cursor = new Date(cursor.getTime() - 864e5);
      if (streak > 365) break;
    }
    streakRows.push({
      deviceId,
      name: list[0]?.name || "\u6478\u9C7C\u8FBE\u4EBA",
      streak,
      lastDate
    });
  }
  streakRows.sort((a, b) => b.streak - a.streak || b.lastDate.localeCompare(a.lastDate));
  const weekAgo = Date.now() - 7 * 864e5;
  const weeklyBest = /* @__PURE__ */ new Map();
  for (const d of draws) {
    if (new Date(d.createdAt).getTime() < weekAgo) continue;
    const prev = weeklyBest.get(d.deviceId);
    if (!prev || d.percent > prev.bestPercent) {
      weeklyBest.set(d.deviceId, {
        deviceId: d.deviceId,
        name: d.name,
        bestPercent: d.percent,
        level: d.level,
        emoji: d.emoji
      });
    }
  }
  const weeklyRows = Array.from(weeklyBest.values()).sort(
    (a, b) => b.bestPercent - a.bestPercent
  );
  return {
    streak: streakRows.slice(0, lim).map((r, i) => ({ rank: i + 1, ...r })),
    weekly: weeklyRows.slice(0, lim).map((r, i) => ({ rank: i + 1, ...r })),
    global: {
      totalDraws: draws.length,
      uniqueDevices: byDevice.size
    }
  };
}
function submitFeedback(input) {
  const content = String(input.content || "").trim().slice(0, 1e3);
  if (!content) throw new Error("content required");
  const typeRaw = String(input.type || "suggestion");
  const type = ["bug", "feature", "suggestion", "other"].includes(typeRaw) ? typeRaw : "other";
  const item = {
    id: id("fb"),
    deviceId: String(input.deviceId || "").slice(0, 80),
    type,
    content,
    contact: String(input.contact || "").slice(0, 255),
    userAgent: String(input.userAgent || "").slice(0, 240),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const s = getStore();
  s.feedback.unshift(item);
  if (s.feedback.length > MAX_FEEDBACK) s.feedback.length = MAX_FEEDBACK;
  persist();
  return item;
}
function listFeedback(limit = 50) {
  const lim = Math.max(1, Math.min(200, limit));
  return getStore().feedback.slice(0, lim);
}
function getProfile(deviceId) {
  const idKey = String(deviceId || "").slice(0, 80);
  if (!idKey) throw new Error("deviceId required");
  const s = getStore();
  const profile = s.profiles.find((p) => p.deviceId === idKey);
  const streak = deviceStreak(idKey);
  const invite = s.invites.find((i) => i.ownerDeviceId === idKey);
  return {
    deviceId: idKey,
    name: profile?.name || "\u6478\u9C7C\u8FBE\u4EBA",
    avatar: profile?.avatar || "",
    streak: streak.streak,
    lastDate: streak.lastDate,
    totalDraws: streak.totalDraws,
    inviteCode: invite?.code || null
  };
}
function updateProfile(input) {
  const deviceId = String(input.deviceId || "").slice(0, 80);
  if (!deviceId) throw new Error("deviceId required");
  upsertProfile(deviceId, input.name, input.avatar);
  persist();
  return getProfile(deviceId);
}

// server/light/pgAlias.ts
init_schema();
init_db();
init_guestAuth();
init_deviceUser();
import { and as and4, desc as desc5, eq as eq10, sql as sql7 } from "drizzle-orm";
function asRows3(result) {
  if (Array.isArray(result)) return result;
  const nested = result?.rows;
  if (Array.isArray(nested)) return nested;
  return [];
}
async function pgAvailable() {
  const database = await getDb();
  return Boolean(database);
}
function pgHealth() {
  return {
    ok: true,
    service: "moyu-fortune",
    version: "path-c-1.0",
    persistence: "postgres",
    note: "light REST is a thin Postgres alias of tRPC (single track)"
  };
}
async function recordDrawPg(input) {
  const deviceId = String(input.deviceId || "").slice(0, 80);
  if (!deviceId) throw new Error("deviceId required");
  const user = await ensureGuestUser(deviceId, input.name);
  if (!await getDb()) throw new Error("database unavailable");
  const level = String(input.level || "\u5C0F\u5409").slice(0, 8);
  const emoji = String(input.emoji || "\u{1F41F}").slice(0, 8);
  const percent = Math.max(0, Math.min(100, Number(input.percent) || 0));
  const message = String(input.message || "").slice(0, 240);
  const suggestedTime = String(input.suggestedTime || "").slice(0, 32);
  const avatar = String(input.avatar || "").slice(0, 64);
  const date2 = shanghaiTodayKey();
  await upsertDailyDraw({
    userId: user.id,
    date: date2,
    level,
    emoji,
    percent,
    message,
    suggestedTime,
    avatar
  });
  return {
    id: `${user.id}-${date2}`,
    deviceId,
    name: user.name || "\u6478\u9C7C\u8FBE\u4EBA",
    level,
    emoji,
    percent,
    message,
    suggestedTime,
    avatar,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function getHistoryPg(deviceId, limit = 30) {
  const idKey = String(deviceId || "").slice(0, 80);
  if (!idKey) return [];
  const user = await getUserByOpenId(guestOpenId(idKey));
  if (!user) return [];
  const database = await getDb();
  if (!database) return [];
  const lim = Math.max(1, Math.min(100, limit));
  const rows = await database.select().from(fortuneHistory).where(eq10(fortuneHistory.userId, user.id)).orderBy(desc5(fortuneHistory.createdAt)).limit(lim);
  return rows.map((r) => ({
    id: String(r.id),
    deviceId: idKey,
    name: user.name || "\u6478\u9C7C\u8FBE\u4EBA",
    level: r.level,
    emoji: r.emoji,
    percent: r.percent,
    message: r.message || "",
    suggestedTime: r.suggestedTime || "",
    avatar: r.avatar || "",
    createdAt: r.createdAt.toISOString()
  }));
}
async function getLeaderboardPg(limit = 30) {
  const database = await getDb();
  if (!database) {
    return { streak: [], weekly: [], global: { totalDraws: 0, uniqueDevices: 0 } };
  }
  const lim = Math.max(1, Math.min(50, limit));
  const streakResult = await database.execute(sql7`
    WITH user_dates AS (
      SELECT
        "userId" AS user_id,
        ("createdAt")::date AS draw_date
      FROM fortune_history
      GROUP BY "userId", ("createdAt")::date
    ),
    numbered AS (
      SELECT
        user_id,
        draw_date,
        draw_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY draw_date))::int AS streak_group
      FROM user_dates
    ),
    streak_counts AS (
      SELECT
        user_id,
        streak_group,
        COUNT(*)::int AS streak_length,
        MAX(draw_date) AS last_date
      FROM numbered
      GROUP BY user_id, streak_group
    ),
    current_streaks AS (
      SELECT DISTINCT ON (sc.user_id)
        sc.user_id,
        sc.streak_length,
        sc.last_date
      FROM streak_counts sc
      WHERE sc.last_date >= CURRENT_DATE - INTERVAL '1 day'
      ORDER BY sc.user_id, sc.streak_length DESC, sc.last_date DESC
    )
    SELECT
      cs.user_id AS "userId",
      u.name,
      u."openId",
      cs.streak_length AS streak,
      cs.last_date AS "lastDate"
    FROM current_streaks cs
    JOIN users u ON cs.user_id = u.id
    ORDER BY cs.streak_length DESC, cs.last_date DESC
    LIMIT ${lim}
  `);
  const streak = asRows3(streakResult).map((row, index2) => {
    const openId = String(row.openId || "");
    const deviceId = openId.startsWith("guest_") ? openId.slice(6) : openId;
    return {
      rank: index2 + 1,
      deviceId,
      name: row.name || "\u6478\u9C7C\u8FBE\u4EBA",
      streak: Number(row.streak),
      lastDate: String(row.lastDate || "").slice(0, 10)
    };
  });
  const weeklyResult = await database.execute(sql7`
    SELECT DISTINCT ON (fh."userId")
      fh."userId" AS "userId",
      u.name,
      u."openId",
      fh.percent AS "bestPercent",
      fh.level,
      fh.emoji
    FROM fortune_history fh
    JOIN users u ON u.id = fh."userId"
    WHERE fh."createdAt" >= NOW() - INTERVAL '7 days'
    ORDER BY fh."userId", fh.percent DESC, fh."createdAt" DESC
  `);
  const weekly = asRows3(weeklyResult).sort((a, b) => Number(b.bestPercent) - Number(a.bestPercent)).slice(0, lim).map((row, index2) => {
    const openId = String(row.openId || "");
    const deviceId = openId.startsWith("guest_") ? openId.slice(6) : openId;
    return {
      rank: index2 + 1,
      deviceId,
      name: row.name || "\u6478\u9C7C\u8FBE\u4EBA",
      bestPercent: Number(row.bestPercent),
      level: String(row.level || ""),
      emoji: String(row.emoji || "")
    };
  });
  const globalResult = await database.execute(sql7`
    SELECT
      (SELECT COUNT(*)::int FROM fortune_history) AS "totalDraws",
      (SELECT COUNT(DISTINCT "userId")::int FROM fortune_history) AS "uniqueDevices"
  `);
  const g = asRows3(globalResult)[0] || {};
  return {
    streak,
    weekly,
    global: {
      totalDraws: Number(g.totalDraws || 0),
      uniqueDevices: Number(g.uniqueDevices || 0)
    }
  };
}
async function submitFeedbackPg(input) {
  const content = String(input.content || "").trim().slice(0, 1e3);
  if (!content) throw new Error("content required");
  const typeRaw = String(input.type || "suggestion");
  const type = ["bug", "feature", "suggestion", "other"].includes(typeRaw) ? typeRaw : "other";
  let userId = null;
  const deviceId = String(input.deviceId || "").slice(0, 80);
  if (deviceId) {
    const user = await ensureGuestUser(deviceId);
    userId = user.id;
  }
  const database = await getDb();
  if (!database) throw new Error("database unavailable");
  const inserted = await database.insert(feedback).values({
    userId,
    type,
    content,
    contact: String(input.contact || "").slice(0, 255) || null,
    userAgent: String(input.userAgent || "").slice(0, 500) || null
  }).returning();
  const row = inserted[0];
  return {
    id: String(row?.id ?? ""),
    deviceId,
    type,
    content,
    contact: String(input.contact || ""),
    userAgent: String(input.userAgent || ""),
    createdAt: (row?.createdAt || /* @__PURE__ */ new Date()).toISOString()
  };
}
async function listFeedbackPg(limit = 50) {
  const database = await getDb();
  if (!database) return [];
  const lim = Math.max(1, Math.min(100, limit));
  const rows = await database.select().from(feedback).orderBy(desc5(feedback.createdAt)).limit(lim);
  return rows.map((r) => ({
    id: String(r.id),
    deviceId: "",
    type: r.type,
    content: r.content,
    contact: r.contact || "",
    userAgent: r.userAgent || "",
    createdAt: r.createdAt.toISOString()
  }));
}
async function getProfilePg(deviceId) {
  const user = await ensureGuestUser(deviceId);
  let avatar = "";
  try {
    const unlocked = user.unlockedAvatars ? JSON.parse(user.unlockedAvatars) : [];
    avatar = unlocked[0] || "";
  } catch {
    avatar = "";
  }
  return {
    deviceId,
    name: user.name || "\u6478\u9C7C\u8FBE\u4EBA",
    avatar,
    updatedAt: user.updatedAt.toISOString()
  };
}
async function updateProfilePg(input) {
  const user = await ensureGuestUser(input.deviceId, input.name);
  const database = await getDb();
  if (!database) throw new Error("database unavailable");
  const patch = { updatedAt: /* @__PURE__ */ new Date() };
  if (input.name != null) patch.name = String(input.name).slice(0, 32);
  if (input.avatar != null) {
    let unlocked = [];
    try {
      unlocked = user.unlockedAvatars ? JSON.parse(user.unlockedAvatars) : [];
    } catch {
      unlocked = [];
    }
    const av = String(input.avatar).slice(0, 64);
    if (av && !unlocked.includes(av)) unlocked.unshift(av);
    patch.unlockedAvatars = JSON.stringify(unlocked.slice(0, 50));
  }
  await database.update(users).set(patch).where(eq10(users.id, user.id));
  return getProfilePg(input.deviceId);
}

// server/light/routes.ts
var ALLOWED_ORIGINS = new Set(
  (process.env.MOYU_CORS_ORIGINS || "https://chillworks.ai,https://www.chillworks.ai,http://localhost:3000,http://127.0.0.1:3000").split(",").map((s) => s.trim()).filter(Boolean)
);
function cors(req, res, next) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, X-Device-Id, X-Device-Name"
    );
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
}
function rateLimit(windowMs, max) {
  const hits = /* @__PURE__ */ new Map();
  return (req, res, next) => {
    const key = String(req.headers["x-device-id"] || "") || req.ip || req.socket.remoteAddress || "anon";
    const now = Date.now();
    const cur = hits.get(key);
    if (!cur || now > cur.reset) {
      hits.set(key, { n: 1, reset: now + windowMs });
      next();
      return;
    }
    cur.n += 1;
    if (cur.n > max) {
      res.status(429).json({ ok: false, error: "rate_limited" });
      return;
    }
    next();
  };
}
function deviceIdOf(req, body) {
  return String(
    body && body.deviceId || req.query.deviceId || req.headers["x-device-id"] || ""
  );
}
async function usePostgres() {
  if (process.env.MOYU_LIGHT_ONLY === "1") return false;
  return pgAvailable();
}
function registerLightApi(app) {
  app.use(cors);
  app.use(async (_req, _res, next) => {
    try {
      if (!await usePostgres()) {
        await ensureStoreReady();
      }
      next();
    } catch (e) {
      next(e);
    }
  });
  app.get("/health", async (_req, res) => {
    res.json(await usePostgres() ? pgHealth() : lightHealth());
  });
  app.get("/api/light/health", async (_req, res) => {
    res.json(await usePostgres() ? pgHealth() : lightHealth());
  });
  app.post("/api/light/draw", rateLimit(6e4, 40), async (req, res) => {
    try {
      const body = req.body || {};
      const payload = {
        deviceId: deviceIdOf(req, body),
        name: String(body.name || req.headers["x-device-name"] || ""),
        level: String(body.level || ""),
        emoji: String(body.emoji || ""),
        percent: Number(body.percent),
        message: body.message != null ? String(body.message) : void 0,
        suggestedTime: body.suggestedTime != null ? String(body.suggestedTime) : void 0,
        avatar: body.avatar != null ? String(body.avatar) : void 0
      };
      const draw = await usePostgres() ? await recordDrawPg(payload) : recordDraw(payload);
      res.json({ ok: true, draw });
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: e instanceof Error ? e.message : "bad_request"
      });
    }
  });
  app.get("/api/light/history", async (req, res) => {
    const deviceId = deviceIdOf(req);
    const limit = Number(req.query.limit || 30);
    const history = await usePostgres() ? await getHistoryPg(deviceId, limit) : getHistory(deviceId, limit);
    res.json({ ok: true, history });
  });
  app.get("/api/light/leaderboard", async (req, res) => {
    const limit = Number(req.query.limit || 30);
    const board = await usePostgres() ? await getLeaderboardPg(limit) : getLeaderboard(limit);
    res.json({ ok: true, ...board });
  });
  app.post("/api/light/feedback", rateLimit(6e4, 20), async (req, res) => {
    try {
      const body = req.body || {};
      const payload = {
        deviceId: deviceIdOf(req, body),
        type: body.type != null ? String(body.type) : void 0,
        content: String(body.content || ""),
        contact: body.contact != null ? String(body.contact) : void 0,
        userAgent: body.userAgent != null ? String(body.userAgent) : String(req.headers["user-agent"] || "")
      };
      const item = await usePostgres() ? await submitFeedbackPg(payload) : submitFeedback(payload);
      res.json({ ok: true, feedback: item });
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: e instanceof Error ? e.message : "bad_request"
      });
    }
  });
  app.get("/api/light/feedback", async (req, res) => {
    if (!adminTokenOk(requestToken(req))) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    const limit = Number(req.query.limit || 50);
    const list = await usePostgres() ? await listFeedbackPg(limit) : listFeedback(limit);
    res.json({ ok: true, feedback: list });
  });
  app.get("/api/light/profile", async (req, res) => {
    try {
      const deviceId = deviceIdOf(req);
      const profile = await usePostgres() ? await getProfilePg(deviceId) : getProfile(deviceId);
      res.json({ ok: true, profile });
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: e instanceof Error ? e.message : "bad_request"
      });
    }
  });
  app.post("/api/light/profile", rateLimit(6e4, 30), async (req, res) => {
    try {
      const body = req.body || {};
      const profile = await usePostgres() ? await updateProfilePg({
        deviceId: deviceIdOf(req, body),
        name: body.name != null ? String(body.name) : void 0,
        avatar: body.avatar != null ? String(body.avatar) : void 0
      }) : updateProfile({
        deviceId: deviceIdOf(req, body),
        name: body.name != null ? String(body.name) : void 0,
        avatar: body.avatar != null ? String(body.avatar) : void 0
      });
      res.json({ ok: true, profile });
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: e instanceof Error ? e.message : "bad_request"
      });
    }
  });
}

// server/_core/statusPage.ts
init_env();
function renderApiStatusPage() {
  const db = Boolean(ENV.databaseUrl);
  const stripe2 = Boolean(ENV.stripeSecretKey);
  const webhook = Boolean(ENV.stripeWebhookSecret);
  const llm = Boolean(ENV.forgeApiKey);
  const pill = (on, label) => `<span class="pill ${on ? "on" : "off"}">${on ? "\u25CF" : "\u25CB"} ${label}</span>`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>\u6478\u4E86\u4E48 \xB7 moyu-fortune API</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&family=Noto+Sans+SC:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
:root{--bg0:#1a0f08;--bg1:#2a1810;--copper:#e67a2e;--gold:#ffb32c;--glass:rgba(255,255,255,0.06);--line:rgba(255,180,50,0.22);--text:#fff8f0;--muted:rgba(255,248,240,0.55)}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;color:var(--text);font-family:"Noto Sans SC",system-ui,sans-serif;background:radial-gradient(1200px 600px at 10% -10%,rgba(255,140,40,0.28),transparent 55%),radial-gradient(900px 500px at 90% 0%,rgba(255,200,80,0.16),transparent 50%),linear-gradient(165deg,var(--bg0),var(--bg1) 55%,#120b07)}
.wrap{max-width:44rem;margin:0 auto;padding:2.5rem 1.25rem 3rem}
.brand{font-family:"ZCOOL KuaiLe",sans-serif;font-size:clamp(2rem,6vw,2.75rem;background:linear-gradient(135deg,var(--gold),var(--copper));-webkit-background-clip:text;background-clip:text;color:transparent;margin:0 0 .35rem}
.sub{color:var(--muted);margin:0 0 1.25rem;line-height:1.6;font-size:.95rem}
.card{background:var(--glass);border:1px solid var(--line);border-radius:1.25rem;padding:1.15rem 1.25rem;backdrop-filter:blur(16px);box-shadow:0 12px 40px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.06);margin-bottom:1rem}
.ok{display:inline-flex;align-items:center;gap:.5rem;font-weight:700;color:#6ee7a8;margin:0 0 .75rem}
.ok i{width:.55rem;height:.55rem;border-radius:50%;background:#34d399;box-shadow:0 0 12px #34d399}
.pills{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0 1rem}
.pill{font-size:.78rem;padding:.35rem .65rem;border-radius:999px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.2)}
.pill.on{color:#6ee7a8;border-color:rgba(52,211,153,0.35)}
.pill.off{color:var(--muted)}
ul{list-style:none;padding:0;margin:0;display:grid;gap:.55rem}
li{display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:.7rem .85rem;border-radius:.85rem;background:rgba(0,0,0,0.22);border:1px solid rgba(255,255,255,0.06);font-size:.88rem}
code{font-family:ui-monospace,Menlo,monospace;color:#ffd089;font-size:.82rem}
a{color:var(--gold);text-decoration:none}a:hover{text-decoration:underline}
.cta{display:inline-block;margin-top:1rem;padding:.85rem 1.2rem;border-radius:999px;background:linear-gradient(135deg,var(--gold),var(--copper));color:#1a0800;font-weight:700;box-shadow:0 8px 28px rgba(230,122,46,0.35)}
.note{margin-top:1rem;color:var(--muted);font-size:.8rem;line-height:1.5}
</style>
</head>
<body>
<main class="wrap">
  <h1 class="brand">\u6478\u4E86\u4E48 \xB7 \u5168\u91CF\u540E\u7AEF</h1>
  <p class="sub">Path C API \xB7 \u524D\u7AEF\u5728 <a href="https://chillworks.ai">chillworks.ai</a>\uFF0C\u672C\u57DF\u53EA\u63D0\u4F9B tRPC + Stripe + Postgres\u3002</p>
  <section class="card">
    <p class="ok"><i></i>moyu-fortune \xB7 path-c-1.0 \xB7 online</p>
    <div class="pills">
      ${pill(db, "Postgres")}
      ${pill(stripe2, "Stripe")}
      ${pill(webhook, "Webhook")}
      ${pill(llm, "LLM")}
    </div>
    <ul>
      <li><span>\u5065\u5EB7\u68C0\u67E5</span><a href="/health"><code>GET /health</code></a></li>
      <li><span>\u7CFB\u7EDF\u72B6\u6001</span><code>GET /api/trpc/system.health</code></li>
      <li><span>\u8BBF\u5BA2\u767B\u5F55</span><code>POST /api/trpc/auth.registerGuest</code></li>
      <li><span>\u4F1A\u5458 / Stripe</span><code>POST /api/trpc/stripe.createCheckoutSession</code></li>
      <li><span>\u8F7B\u91CF API</span><a href="/api/light/health"><code>/api/light/*</code></a></li>
    </ul>
    <a class="cta" href="https://chillworks.ai/membership">\u6253\u5F00\u4F1A\u5458\u9875 \u2192</a>
    <p class="note">Render Free \u4F11\u7720\u540E\u9996\u6B21\u6253\u5F00\u53EF\u80FD\u8981\u7B49 30\u201360 \u79D2\u3002\u82E5\u7A7A\u767D\uFF0C\u5237\u65B0\u6216\u5148\u8BBF\u95EE <a href="/health">/health</a> \u5524\u9192\u3002</p>
  </section>
</main>
</body>
</html>`;
}

// server/_core/analytics.ts
init_schema();
init_db();
init_deviceUser();
import { createHash as createHash3 } from "node:crypto";
import { sql as sql8 } from "drizzle-orm";
var ALLOWED_EVENTS = /* @__PURE__ */ new Set([
  "draw",
  "share_click",
  "card_saved",
  "membership_view"
]);
var ALLOWED_PROP_KEYS = /* @__PURE__ */ new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "ref",
  "channel",
  "source",
  "via",
  "level",
  "percent",
  "streak",
  "restored"
]);
var MAX_BATCH = 50;
var MAX_CLIENT_AGE_MS = 31 * 24 * 60 * 60 * 1e3;
var MAX_CLOCK_SKEW_MS = 5 * 60 * 1e3;
function normalizeEventId(value) {
  if (typeof value !== "string") return null;
  const eventId = value.trim();
  return /^[a-zA-Z0-9._:-]{8,128}$/.test(eventId) ? eventId : null;
}
function fallbackAnalyticsEventId(input) {
  const sortedProps = input.props ? Object.fromEntries(
    Object.entries(input.props).sort(
      ([left], [right]) => left.localeCompare(right)
    )
  ) : null;
  const digest = createHash3("sha256").update(
    JSON.stringify([input.deviceId, input.event, input.t ?? "", sortedProps])
  ).digest("hex");
  return `legacy-${digest}`;
}
function sanitizeProps(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!ALLOWED_PROP_KEYS.has(key)) continue;
    if (typeof raw === "string") {
      const text2 = raw.trim().slice(0, 80);
      if (text2) result[key] = text2;
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      result[key] = raw;
    } else if (typeof raw === "boolean") {
      result[key] = raw;
    }
  }
  return Object.keys(result).length ? result : null;
}
function validatedClientTime(value, now = Date.now()) {
  const timestamp2 = typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(timestamp2) || timestamp2 < now - MAX_CLIENT_AGE_MS || timestamp2 > now + MAX_CLOCK_SKEW_MS) {
    return new Date(now);
  }
  return new Date(timestamp2);
}
async function ensureAnalyticsSchema() {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql8`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id BIGSERIAL PRIMARY KEY,
      event_id VARCHAR(128) NOT NULL,
      event VARCHAR(32) NOT NULL,
      device_id VARCHAR(128) NOT NULL,
      props JSONB,
      client_occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql8`
    ALTER TABLE analytics_events
    ADD COLUMN IF NOT EXISTS event_id VARCHAR(128)
  `);
  await db.execute(sql8`
    UPDATE analytics_events
    SET event_id = 'legacy-' || id::text
    WHERE event_id IS NULL
  `);
  await db.execute(sql8`
    ALTER TABLE analytics_events
    ALTER COLUMN event_id SET NOT NULL
  `);
  await db.execute(sql8`
    ALTER TABLE analytics_events
    ADD COLUMN IF NOT EXISTS client_occurred_at TIMESTAMPTZ
  `);
  await db.execute(sql8`
    UPDATE analytics_events
    SET client_occurred_at = created_at
    WHERE client_occurred_at IS NULL
  `);
  await db.execute(sql8`
    ALTER TABLE analytics_events
    ALTER COLUMN client_occurred_at SET DEFAULT NOW()
  `);
  await db.execute(sql8`
    ALTER TABLE analytics_events
    ALTER COLUMN client_occurred_at SET NOT NULL
  `);
  await db.execute(sql8`
    CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_event_id_uidx
    ON analytics_events (event_id)
  `);
  await db.execute(sql8`
    CREATE INDEX IF NOT EXISTS analytics_events_client_occurred_at_idx
    ON analytics_events (client_occurred_at)
  `);
  await db.execute(sql8`
    CREATE INDEX IF NOT EXISTS analytics_events_event_occurred_idx
    ON analytics_events (event, client_occurred_at)
  `);
  await db.execute(sql8`
    CREATE INDEX IF NOT EXISTS analytics_events_device_occurred_idx
    ON analytics_events (device_id, client_occurred_at)
  `);
}
function registerAnalyticsApi(app) {
  app.post("/api/events", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ ok: false, error: "no_db" });
      const body = req.body || {};
      const rawEvents = Array.isArray(body.events) ? body.events.slice(0, MAX_BATCH) : [];
      const values = rawEvents.flatMap((event) => {
        if (!event || typeof event !== "object") return [];
        const item = event;
        const eventName = typeof item.event === "string" ? item.event : "";
        const deviceId = normalizeDeviceId(item.deviceId);
        if (!ALLOWED_EVENTS.has(eventName) || !deviceId) return [];
        const props = sanitizeProps(item.props);
        const eventId = normalizeEventId(item.eventId) || fallbackAnalyticsEventId({
          event: eventName,
          deviceId,
          t: item.t,
          props
        });
        return [
          {
            eventId,
            event: eventName,
            deviceId,
            props,
            clientOccurredAt: validatedClientTime(item.t)
          }
        ];
      });
      const inserted = values.length ? await db.insert(analyticsEvents).values(values).onConflictDoNothing({ target: analyticsEvents.eventId }).returning({ eventId: analyticsEvents.eventId }) : [];
      return res.json({
        ok: true,
        accepted: inserted.length,
        duplicates: values.length - inserted.length
      });
    } catch (error) {
      console.warn("[analytics]", error);
      return res.status(500).json({ ok: false });
    }
  });
}

// server/_core/apiOnlyEntry.ts
var ALLOWED_ORIGINS2 = new Set(
  (process.env.MOYU_CORS_ORIGINS || "https://chillworks.ai,https://www.chillworks.ai,http://localhost:3000,http://127.0.0.1:3000").split(",").map((s) => s.trim()).filter(Boolean)
);
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS2.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Device-Id, X-Device-Name, trpc-batch-mode"
    );
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
}
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(corsMiddleware);
  app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
  app.use(webhookRouter);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  await ensureAnalyticsSchema().catch((error) => {
    console.warn("[analytics] schema initialization failed", error);
  });
  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "moyu-fortune",
      version: "path-c-1.0",
      mode: "api"
    });
  });
  registerLightApi(app);
  registerAnalyticsApi(app);
  registerAdminApi(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  app.get("/", (_req, res) => {
    res.type("html").send(renderApiStatusPage());
  });
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, "0.0.0.0", () => {
    console.log(`moyu-fortune API on http://0.0.0.0:${port}/`);
    startDailyNotificationCron();
  });
}
startServer().catch(console.error);
