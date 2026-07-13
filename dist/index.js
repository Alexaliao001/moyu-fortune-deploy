var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/apiOnlyEntry.ts
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
var ENV = {
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

// server/_core/notification.ts
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
import { TRPCError as TRPCError2 } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/trpc.ts
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

// server/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
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
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";
var userRoleEnum = pgEnum("user_role", ["user", "admin"]);
var subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "incomplete"
]);
var subscriptionPlanEnum = pgEnum("subscription_plan", [
  "monthly",
  "quarterly",
  "annual",
  "lifetime"
]);
var purchaseStatusEnum = pgEnum("purchase_status", [
  "pending",
  "completed",
  "failed"
]);
var feedbackTypeEnum = pgEnum("feedback_type", [
  "bug",
  "feature",
  "suggestion",
  "other"
]);
var feedbackStatusEnum = pgEnum("feedback_status", [
  "pending",
  "reviewed",
  "resolved",
  "closed"
]);
var notificationTypeEnum = pgEnum("notification_type", [
  "feedback_reply",
  "system",
  "reward"
]);
var users = pgTable("users", {
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
var subscriptions = pgTable("subscriptions", {
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
var purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  productType: varchar("productType", { length: 64 }).notNull(),
  status: purchaseStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var fortuneHistory = pgTable("fortune_history", {
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
var dailyDrawCount = pgTable("daily_draw_count", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  drawDate: date("drawDate").notNull(),
  count: integer("count").default(0).notNull()
});
var invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  inviterId: integer("inviterId").notNull(),
  inviteeId: integer("inviteeId").notNull(),
  rewardDays: integer("rewardDays").default(3).notNull(),
  rewardClaimed: boolean("rewardClaimed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var feedback = pgTable("feedback", {
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
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: notificationTypeEnum("type").default("system").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  relatedId: integer("relatedId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/db.ts
var _client = null;
var _db = null;
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

// server/_core/systemRouter.ts
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
import { z as z2 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";
import { eq as eq2 } from "drizzle-orm";

// server/_core/guestAuth.ts
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

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

// server/_core/guestAuth.ts
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

// server/_core/authRouter.ts
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

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  payload.max_tokens = 32768;
  payload.thinking = {
    "budget_tokens": 128
  };
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/routers/fortune.ts
var FALLBACK_MESSAGES_ZH = {
  \u5927\u5409: [
    // 原有金句
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
    // 反内卷系列
    "\u5377\u4E0D\u52A8\u4E86\uFF1F\u90A3\u5C31\u8EBA\u5E73\u5427\uFF0C\u5730\u7403\u4E0D\u4F1A\u56E0\u4E3A\u4F60\u591A\u52A0\u73ED\u800C\u8F6C\u5F97\u66F4\u5FEB\u3002",
    "\u5185\u5377\u7684\u5C3D\u5934\u662F\u6478\u9C7C\uFF0C\u4ECA\u5929\u6211\u5DF2\u7ECF\u5230\u8FBE\u7EC8\u70B9\u3002",
    "\u522B\u4EBA\u5728\u5377\uFF0C\u6211\u5728\u6478\uFF0C\u8FD9\u5C31\u662F\u4EBA\u751F\u7684\u53C2\u5DEE\u3002",
    "\u4ECA\u5929\u7684\u53CD\u5185\u5377\u5BA3\u8A00\uFF1A\u6211\u4E0D\u662F\u4E0D\u52AA\u529B\uFF0C\u6211\u662F\u5728\u4FDD\u62A4\u81EA\u5DF1\u3002",
    "\u5185\u5377\u662F\u522B\u4EBA\u7684\u4E8B\uFF0C\u6478\u9C7C\u662F\u6211\u7684\u4FEE\u884C\u3002",
    // 裁员焦虑系列
    "\u4ECA\u5929\u8FD8\u6CA1\u88AB\u88C1\uFF0C\u8BF4\u660E\u4F60\u8FD8\u6709\u4EF7\u503C\uFF0C\u53BB\u6478\u4E2A\u9C7C\u5956\u52B1\u81EA\u5DF1\u3002",
    "\u88C1\u5458\u540D\u5355\u4E0A\u6CA1\u6709\u6211\uFF0C\u4ECA\u5929\u53EF\u4EE5\u653E\u5FC3\u6478\u9C7C\u3002",
    "\u4E0E\u5176\u7126\u8651\u88AB\u88C1\uFF0C\u4E0D\u5982\u4EAB\u53D7\u5F53\u4E0B\u7684\u6478\u9C7C\u65F6\u5149\u3002",
    // 通缩幽默系列
    "\u5DE5\u8D44\u4E0D\u6DA8\u7269\u4EF7\u4E0D\u6DA8\uFF0C\u552F\u4E00\u6DA8\u7684\u662F\u6211\u7684\u6478\u9C7C\u6280\u80FD\u3002",
    "\u7ECF\u6D4E\u4E0B\u884C\uFF0C\u6478\u9C7C\u4E0A\u884C\uFF0C\u8FD9\u5C31\u662F\u5E73\u8861\u3002"
  ],
  \u4E2D\u5409: [
    // 原有金句
    "\u9700\u6C42\u53C8\u6539\u4E86\uFF1F\u6CA1\u4E8B\uFF0C\u6211\u7684\u5FC3\u5DF2\u7ECF\u548C\u4EE3\u7801\u4E00\u6837\uFF0C\u6B7B\u4E86\u3002",
    "\u4ECA\u5929\u9002\u5408\u7528\u300C\u5728\u5BF9\u9F50\u300D\u6765\u56DE\u590D\u6240\u6709\u6D88\u606F\u3002",
    "\u7075\u9B42\u5DF2\u7ECF\u4E0B\u73ED\uFF0C\u8089\u4F53\u8FD8\u5728\u5DE5\u4F4D\u3002",
    "\u4ECA\u5929\u7684\u6548\u7387\uFF1A\u75281\u5C0F\u65F6\u5B8C\u621010\u5206\u949F\u7684\u5DE5\u4F5C\u3002",
    "\u5EFA\u8BAE\u4ECA\u5929\u628A\u6240\u6709\u4F1A\u8BAE\u90FD\u6807\u8BB0\u4E3A\u300C\u53EF\u9009\u53C2\u52A0\u300D\u3002",
    "\u4E2D\u5409\u8FD0\u52BF\uFF0C\u4ECA\u5929\u6478\u9C7C\u6709\u4FDD\u969C\uFF0C\u4F46\u8981\u4F4E\u8C03\u3002",
    "\u4ECA\u5929\u9002\u5408\u6253\u5F00PPT\u5047\u88C5\u5728\u505A\u6C47\u62A5\u3002",
    "\u8FD0\u52BF\u4E0D\u9519\uFF0C\u53EF\u4EE5\u9002\u5F53\u5EF6\u957F\u5E26\u85AA\u62C9\u5C4E\u65F6\u95F4\u3002",
    "\u4ECA\u5929\u7684\u72B6\u6001\uFF1A\u4EBA\u5728\u5DE5\u4F4D\uFF0C\u5FC3\u5728\u5EA6\u5047\u3002",
    "\u4E2D\u5409\u52A0\u6301\uFF0C\u4ECA\u5929\u53EF\u4EE5\u5408\u7406\u6478\u9C7C2\u5C0F\u65F6\u3002",
    // 反内卷系列
    "\u8001\u677F\u7684\u997C\u753B\u5F97\u518D\u5927\uFF0C\u4E5F\u4E0D\u5982\u4F60\u7684\u5348\u89C9\u9999\u3002",
    "\u4ECA\u5929\u9002\u5408\u7528\u300C\u5728\u601D\u8003\u6218\u7565\u65B9\u5411\u300D\u6765\u63A9\u62A4\u6478\u9C7C\u3002",
    "\u5185\u5377\u662F\u4E00\u79CD\u75C5\uFF0C\u6478\u9C7C\u662F\u4E00\u79CD\u836F\u3002",
    "\u4ECA\u5929\u7684\u53CD\u5185\u5377\u7B56\u7565\uFF1A\u5047\u88C5\u5F88\u5FD9\uFF0C\u5B9E\u9645\u5F88\u95F2\u3002",
    "\u522B\u4EBA996\uFF0C\u6211965\uFF0C\u8FD9\u5C31\u662F\u751F\u6D3B\u7684\u667A\u6167\u3002",
    // 裁员焦虑系列
    "\u88AB\u88C1\u4E86\u6709N+1\uFF0C\u4E0D\u88AB\u88C1\u6709\u6478\u9C7C\uFF0C\u600E\u4E48\u90FD\u4E0D\u4E8F\u3002",
    "\u4ECA\u5929\u7684\u5B89\u5168\u611F\u6765\u81EA\uFF1A\u6211\u7684\u5DE5\u4F4D\u8FD8\u5728\u3002",
    // 通缩幽默系列
    "\u6D88\u8D39\u964D\u7EA7\uFF0C\u6478\u9C7C\u5347\u7EA7\uFF0C\u8FD9\u5C31\u662F\u6253\u5DE5\u4EBA\u7684\u81EA\u6211\u8C03\u8282\u3002",
    "\u7ECF\u6D4E\u4E0D\u597D\uFF0C\u5FC3\u60C5\u8981\u597D\uFF0C\u6478\u9C7C\u4E0D\u80FD\u5C11\u3002",
    "\u901A\u7F29\u65F6\u4EE3\uFF0C\u6478\u9C7C\u662F\u6700\u597D\u7684\u6295\u8D44\u3002"
  ],
  \u5C0F\u5409: [
    // 原有金句
    "\u5DE5\u4F5C\u91CF\u548C\u85AA\u6C34\u4E4B\u95F4\uFF0C\u603B\u6709\u4E00\u4E2A\u5728\u6478\u9C7C\u3002",
    "\u4ECA\u5929\u9002\u5408\u6253\u5F00Excel\u5047\u88C5\u5728\u505A\u6570\u636E\u5206\u6790\u3002",
    "\u5EFA\u8BAE\u4ECA\u5929\u7528\u300C\u7F51\u7EDC\u4E0D\u597D\u300D\u6765\u9003\u907F\u89C6\u9891\u4F1A\u8BAE\u3002",
    "\u4ECA\u5929\u53EF\u4EE5\u540D\u6B63\u8A00\u987A\u5730\u8BF4\u5728\u7B49\u9700\u6C42\u3002",
    "\u9002\u5408\u6234\u4E0A\u8033\u673A\u5047\u88C5\u5728\u5F00\u4F1A\u3002",
    "\u5C0F\u5409\u8FD0\u52BF\uFF0C\u4ECA\u5929\u6478\u9C7C\u8981\u89C1\u673A\u884C\u4E8B\u3002",
    "\u4ECA\u5929\u7684\u6478\u9C7C\u7B56\u7565\uFF1A\u5C0F\u6478\u6021\u60C5\uFF0C\u5927\u6478\u4F24\u8EAB\u3002",
    "\u8FD0\u52BF\u5C0F\u5409\uFF0C\u5EFA\u8BAE\u628A\u6478\u9C7C\u65F6\u95F4\u63A7\u5236\u57281\u5C0F\u65F6\u5185\u3002",
    "\u4ECA\u5929\u9002\u5408\u7528\u300C\u5728review\u4EE3\u7801\u300D\u6765\u4E89\u53D6\u6478\u9C7C\u65F6\u95F4\u3002",
    "\u5C0F\u5409\u52A0\u6301\uFF0C\u4ECA\u5929\u53EF\u4EE5\u9002\u5EA6\u5E26\u85AA\u53D1\u5446\u3002",
    // 反内卷系列
    "\u4ECA\u5929\u9002\u5408\u7528\u300C\u5728\u62C9\u901A\u5BF9\u9F50\u300D\u6765\u62D6\u5EF6\u5DE5\u4F5C\u3002",
    "\u5185\u5377\u4E0D\u662F\u6211\u7684\u9519\uFF0C\u662F\u8FD9\u4E2A\u65F6\u4EE3\u7684\u9519\u3002",
    "\u4ECA\u5929\u7684\u53CD\u5185\u5377\u59FF\u52BF\uFF1A\u5750\u7740\u6478\u9C7C\uFF0C\u8EBA\u7740\u601D\u8003\u3002",
    "\u5377\u738B\u4EEC\u5728\u51B2\u523A\uFF0C\u6211\u5728\u539F\u5730\u4F11\u606F\u3002",
    // 裁员焦虑系列
    "\u4ECA\u5929\u8FD8\u80FD\u6478\u9C7C\uFF0C\u8BF4\u660E\u516C\u53F8\u8FD8\u517B\u5F97\u8D77\u6211\u3002",
    "\u88C1\u5458\u6F6E\u4E2D\u7684\u5E78\u5B58\u8005\uFF0C\u4ECA\u5929\u503C\u5F97\u6478\u4E00\u6478\u3002",
    // 通缩幽默系列
    "\u5DE5\u8D44\u6CA1\u6DA8\uFF0C\u4F46\u6478\u9C7C\u6280\u80FD\u6DA8\u4E86\uFF0C\u8FD9\u4E5F\u662F\u4E00\u79CD\u589E\u503C\u3002",
    "\u7ECF\u6D4E\u5BD2\u51AC\uFF0C\u6478\u9C7C\u53D6\u6696\u3002",
    "\u7269\u4EF7\u4E0D\u6DA8\uFF0C\u6478\u9C7C\u4E0D\u6B62\u3002",
    "\u901A\u7F29\u65F6\u4EE3\u7684\u751F\u5B58\u6CD5\u5219\uFF1A\u5C11\u82B1\u94B1\uFF0C\u591A\u6478\u9C7C\u3002"
  ],
  \u672B\u5409: [
    // 原有金句
    "\u4ECA\u5929\u7684\u5DE5\u4F5C\u72B6\u6001\uFF1A\u4EBA\u5728\u5DE5\u4F4D\u5FC3\u5728\u5BB6\u3002",
    "\u9002\u5408\u7528\u300C\u6536\u5230\uFF0C\u7A0D\u540E\u5904\u7406\u300D\u62D6\u5230\u4E0B\u73ED\u3002",
    "\u4ECA\u5929\u9002\u5408\u7814\u7A76\u516C\u53F8\u96F6\u98DF\u67DC\u7684\u5E93\u5B58\u3002",
    "\u5EFA\u8BAE\u4ECA\u5929\u5F00\u4F1A\u65F6\u6253\u5F00\u6444\u50CF\u5934\u4F46\u5173\u95ED\u5927\u8111\u3002",
    "\u4ECA\u5929\u53EF\u4EE5\u591A\u559D\u51E0\u676F\u6C34\uFF0C\u987A\u4FBF\u591A\u4E0A\u51E0\u6B21\u5395\u6240\u3002",
    "\u672B\u5409\u8FD0\u52BF\uFF0C\u4ECA\u5929\u6478\u9C7C\u8981\u683C\u5916\u5C0F\u5FC3\u3002",
    "\u4ECA\u5929\u7684\u6478\u9C7C\u7B56\u7565\uFF1A\u6253\u6E38\u51FB\u6218\uFF0C\u901F\u6218\u901F\u51B3\u3002",
    "\u8FD0\u52BF\u672B\u5409\uFF0C\u5EFA\u8BAE\u628A\u6478\u9C7C\u65F6\u95F4\u63A7\u5236\u572830\u5206\u949F\u5185\u3002",
    "\u4ECA\u5929\u9002\u5408\u5047\u88C5\u5728\u6574\u7406\u684C\u9762\u6587\u4EF6\u3002",
    "\u672B\u5409\u52A0\u6301\uFF0C\u4ECA\u5929\u6478\u9C7C\u8981\u773C\u89C2\u516D\u8DEF\u8033\u542C\u516B\u65B9\u3002",
    // 反内卷系列
    "\u4ECA\u5929\u4E0D\u9002\u5408\u53CD\u5185\u5377\uFF0C\u5148\u82DF\u7740\u3002",
    "\u5185\u5377\u5927\u519B\u538B\u5883\uFF0C\u4ECA\u5929\u4F4E\u8C03\u884C\u4E8B\u3002",
    "\u4ECA\u5929\u7684\u7B56\u7565\uFF1A\u8868\u9762\u5185\u5377\uFF0C\u5185\u5FC3\u8EBA\u5E73\u3002",
    // 裁员焦虑系列
    "\u4ECA\u5929\u9002\u5408\u8868\u73B0\u5F97\u79EF\u6781\u4E00\u70B9\uFF0C\u6BD5\u7ADF\u88C1\u5458\u5B63\u8FD8\u6CA1\u8FC7\u3002",
    "\u672B\u5409\u8FD0\u52BF\uFF0C\u4ECA\u5929\u6700\u597D\u8BA9\u8001\u677F\u770B\u5230\u4F60\u5728\u5DE5\u4F5C\u3002",
    "\u88C1\u5458\u9634\u5F71\u4E0B\uFF0C\u4ECA\u5929\u6478\u9C7C\u8981\u8C28\u614E\u3002",
    // 通缩幽默系列
    "\u7ECF\u6D4E\u4E0D\u597D\uFF0C\u5DE5\u4F5C\u8981\u4FDD\uFF0C\u4ECA\u5929\u5C11\u6478\u4E00\u70B9\u3002",
    "\u901A\u7F29\u65F6\u4EE3\uFF0C\u996D\u7897\u8981\u7A33\uFF0C\u6478\u9C7C\u8981\u8F7B\u3002",
    "\u4ECA\u5929\u7684\u751F\u5B58\u6CD5\u5219\uFF1A\u5047\u88C5\u5F88\u5FD9\uFF0C\u5B9E\u9645\u5F88\u614C\u3002",
    "\u672B\u5409\u63D0\u9192\uFF1A\u6478\u9C7C\u6709\u98CE\u9669\uFF0C\u5165\u5751\u9700\u8C28\u614E\u3002"
  ],
  \u51F6: [
    // 原有金句
    "\u4ECA\u5929\u8001\u677F\u773C\u795E\u4E0D\u592A\u5BF9\uFF0C\u5EFA\u8BAE\u4F4E\u8C03\u884C\u4E8B\u3002",
    "\u6478\u9C7C\u9700\u8C28\u614E\uFF0C\u4ECA\u5929\u9002\u5408\u5047\u88C5\u5F88\u5FD9\u3002",
    "\u4ECA\u5929\u7684\u8FD0\u52BF\u63D0\u9192\u4F60\uFF1A\u6253\u5F00\u5DE5\u4F5C\u6587\u6863\uFF0C\u5047\u88C5\u5728\u601D\u8003\u3002",
    "\u5EFA\u8BAE\u4ECA\u5929\u628A\u6478\u9C7C\u65F6\u95F4\u63A7\u5236\u5728\u5395\u6240\u91CC\u3002",
    "\u4ECA\u5929\u9002\u5408\u5047\u88C5\u5728\u7B49\u9700\u6C42\uFF0C\u5B9E\u9645\u5728\u7B49\u4E0B\u73ED\u3002",
    "\u51F6\uFF01\u4ECA\u5929\u4E0D\u5B9C\u6478\u9C7C\uFF0C\u5EFA\u8BAE\u8BA4\u771F\u5DE5\u4F5C\u4E00\u5929\u3002",
    "\u8FD0\u52BF\u4E0D\u4F73\uFF0C\u4ECA\u5929\u6478\u9C7C\u5BB9\u6613\u88AB\u6293\u5305\u3002",
    "\u4ECA\u5929\u7684\u6478\u9C7C\u7B56\u7565\uFF1A\u80FD\u4E0D\u6478\u5C31\u4E0D\u6478\u3002",
    "\u51F6\u8FD0\u5F53\u5934\uFF0C\u5EFA\u8BAE\u4ECA\u5929\u628A\u5DE5\u4F5C\u5F53\u4E3B\u4E1A\u3002",
    "\u4ECA\u5929\u9002\u5408\u628A\u6478\u9C7C\u7684\u5FC3\u601D\u7528\u5728\u5DE5\u4F5C\u4E0A\u3002",
    // 反内卷系列
    "\u4ECA\u5929\u4E0D\u662F\u53CD\u5185\u5377\u7684\u65E5\u5B50\uFF0C\u5148\u5377\u4E00\u5377\u4FDD\u5E73\u5B89\u3002",
    "\u5185\u5377\u4E00\u5929\u4E0D\u4F1A\u6B7B\uFF0C\u4F46\u4ECA\u5929\u4E0D\u5377\u53EF\u80FD\u4F1A\u88AB\u76EF\u4E0A\u3002",
    "\u4ECA\u5929\u7684\u53CD\u5185\u5377\u7B56\u7565\uFF1A\u6682\u505C\uFF0C\u660E\u5929\u518D\u8BF4\u3002",
    // 裁员焦虑系列
    "\u51F6\u8FD0\u5F53\u5934\uFF0C\u4ECA\u5929\u6700\u597D\u8868\u73B0\u5F97\u50CF\u4E2A\u5377\u738B\u3002",
    "\u88C1\u5458\u540D\u5355\u53EF\u80FD\u6B63\u5728\u62DF\u5B9A\uFF0C\u4ECA\u5929\u522B\u6478\u4E86\u3002",
    "\u4ECA\u5929\u9002\u5408\u4E3B\u52A8\u6C47\u62A5\u5DE5\u4F5C\u8FDB\u5EA6\uFF0C\u5237\u5237\u5B58\u5728\u611F\u3002",
    // 通缩幽默系列
    "\u7ECF\u6D4E\u5BD2\u51AC+\u51F6\u8FD0\uFF0C\u4ECA\u5929\u8001\u8001\u5B9E\u5B9E\u5E72\u6D3B\u5427\u3002",
    "\u901A\u7F29\u65F6\u4EE3\u4FDD\u4F4F\u996D\u7897\u6700\u91CD\u8981\uFF0C\u4ECA\u5929\u522B\u4F5C\u6B7B\u3002",
    "\u4ECA\u5929\u7684\u751F\u5B58\u6CD5\u5219\uFF1A\u4F4E\u8C03\u505A\u4EBA\uFF0C\u9AD8\u8C03\u505A\u4E8B\u3002",
    "\u51F6\u8FD0\u63D0\u9192\uFF1A\u5DE5\u4F5C\u4E0D\u52AA\u529B\uFF0C\u660E\u5929\u627E\u5DE5\u4F5C\u3002"
  ]
};
var FALLBACK_MESSAGES_EN = {
  \u5927\u5409: [
    "Boss is MIA today, time to slack like a pro!",
    "Your slacking energy is off the charts today!",
    "Perfect day for a paid daydreaming session.",
    "Today's productivity: Looking busy while doing nothing.",
    "Your desk is now officially a relaxation station.",
    "Great luck! Time to master the art of looking busy.",
    "Today's KPI: Successfully avoid all actual work.",
    "Your slacking powers are at maximum capacity!",
    "Perfect day to let your soul clock out early.",
    "Today you can slack with zero consequences!",
    // Anti-hustle culture series
    "Hustle culture is dead, long live slack culture!",
    "They're grinding, I'm chilling. This is the way.",
    "Today's anti-hustle mantra: Work smarter, slack harder.",
    "The grind can wait, your mental health can't.",
    "Quiet quitting? I call it loud thriving.",
    // Layoff anxiety series
    "Still employed? Celebrate with some quality slacking!",
    "Not on the layoff list today = permission to slack.",
    // Economic humor series
    "Economy's down, slacking's up. Balance achieved.",
    "In this economy, slacking is self-care.",
    "Inflation can't touch my slacking skills."
  ],
  \u4E2D\u5409: [
    "Good luck today! Slack moderately and prosper.",
    "Your slacking window is open, use it wisely.",
    "Today's vibe: Body at desk, mind on vacation.",
    "Good fortune for strategic bathroom breaks.",
    "Time to perfect your 'deep in thought' face.",
    "Today you can slack with reasonable confidence.",
    "Your luck supports 2 hours of quality slacking.",
    "Good day to master the 'network issues' excuse.",
    "Today's efficiency: Maximum slack, minimum detection.",
    "Your slacking energy is well-balanced today.",
    // Anti-hustle culture series
    "Boss's promises are big, but your nap is bigger.",
    "Today's strategy: Look busy, stay chill.",
    "Hustle culture is a disease, slacking is the cure.",
    "Others are burning out, you're chilling out.",
    // Layoff anxiety series
    "Survived another round of layoffs? Time to slack!",
    "Your job security today = your slacking permit.",
    // Economic humor series
    "Recession-proof skill: Professional slacking.",
    "Economy's rough, but your slacking game is smooth.",
    "In tough times, slack is the best investment.",
    "Salary frozen, slacking skills on fire."
  ],
  \u5C0F\u5409: [
    "Fair luck today, slack with caution.",
    "Your slacking window is small but usable.",
    "Today's strategy: Quick slacks, fast recovery.",
    "Time to perfect the 'waiting for feedback' excuse.",
    "Fair fortune for brief mental vacations.",
    "Today you can slack, but stay alert.",
    "Your luck supports 1 hour of careful slacking.",
    "Good day to master the 'reviewing code' cover.",
    "Today's vibe: Slack when opportunity knocks.",
    "Your slacking energy needs strategic deployment.",
    // Anti-hustle culture series
    "Today's anti-hustle move: Strategic procrastination.",
    "The grind is real, but so is your need for rest.",
    "Hustle bros are sprinting, you're pacing yourself.",
    // Layoff anxiety series
    "Still here? That's worth a small celebration slack.",
    "Job market's tough, but you're tougher. Small slack earned.",
    // Economic humor series
    "Salary didn't grow, but slacking skills did.",
    "Economic winter calls for slacking warmth.",
    "Prices stable, slacking stable. Life is good.",
    "Downgrade spending, upgrade slacking.",
    "In deflation, slacking is the real currency."
  ],
  \u672B\u5409: [
    "Luck is thin today, slack at your own risk.",
    "Your slacking window is barely cracked open.",
    "Today's strategy: Quick glances, fast alt-tabs.",
    "Time to perfect the 'compiling code' excuse.",
    "Minimal fortune for very brief breaks.",
    "Today you should probably look busy.",
    "Your luck supports only 30 mins of slacking.",
    "Good day to actually pretend to work.",
    "Today's vibe: Stay vigilant, slack minimally.",
    "Your slacking energy is running low.",
    // Anti-hustle culture series
    "Today's not the day to fight hustle culture.",
    "Anti-hustle on pause, survival mode on.",
    "Look busy on the outside, chill on the inside.",
    // Layoff anxiety series
    "Layoff season vibes, better look productive today.",
    "Show some hustle today, slack tomorrow.",
    "Today's survival tip: Be visible, look valuable.",
    // Economic humor series
    "Tough times call for careful slacking.",
    "Economy's shaky, job's precious. Slack lightly.",
    "Today's motto: Fake busy, stay employed.",
    "Minor luck says: Work now, slack later."
  ],
  \u51F6: [
    "Bad luck! Today is not for slacking.",
    "Your slacking radar is completely offline.",
    "Today's strategy: Actually do some work.",
    "Time to look genuinely productive.",
    "No fortune for slacking today, sorry!",
    "Today you should definitely work hard.",
    "Your luck says: Zero slacking allowed.",
    "Bad day to test your boss's patience.",
    "Today's vibe: Head down, work mode on.",
    "Your slacking energy has been depleted.",
    // Anti-hustle culture series
    "Today's not anti-hustle day. Just hustle.",
    "One day of hustle won't kill you. Probably.",
    "Anti-hustle movement on hold. Resume tomorrow.",
    // Layoff anxiety series
    "Bad luck + layoff season = work hard today.",
    "Today's survival mode: Look like a top performer.",
    "The layoff list might be updating. Look busy!",
    // Economic humor series
    "Economic winter + bad luck = actually work.",
    "In this economy, keep your job. Work today.",
    "Today's rule: Low profile, high output.",
    "Bad fortune reminder: No job, no slack."
  ]
};
function extractSlogan(content, isEnglish) {
  if (content.length < 100) {
    return content.trim();
  }
  try {
    const jsonMatch = content.match(/\{[\s\S]*"slogan"\s*:\s*"([^"]+)"[\s\S]*\}/);
    if (jsonMatch && jsonMatch[1]) {
      return jsonMatch[1].trim();
    }
  } catch {
  }
  const finalChoiceMatch = content.match(/\*+Final Choice:?\*+\s*(.+?)(?:\s*\(|$)/i);
  if (finalChoiceMatch && finalChoiceMatch[1]) {
    return finalChoiceMatch[1].trim();
  }
  if (isEnglish) {
    const lines = content.split("\n").filter((line) => line.trim());
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.length >= 20 && line.length <= 80 && /[a-zA-Z]/.test(line)) {
        return line.replace(/^\*+|\*+$/g, "").replace(/^["']|["']$/g, "").trim();
      }
    }
  } else {
    const lines = content.split("\n").filter((line) => line.trim());
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      const chineseMatch = line.match(/[\u4e00-\u9fa5，。！？、]+/g);
      if (chineseMatch) {
        const chineseText = chineseMatch.join("");
        if (chineseText.length >= 15 && chineseText.length <= 60) {
          return line.replace(/^\*+|\*+$/g, "").replace(/^[「」【】]/g, "").trim();
        }
      }
    }
  }
  return content.slice(0, 50).trim();
}
var fortuneRouter = router({
  // 生成00后职场黑话风格文案
  generateSlogan: publicProcedure.input(
    z3.object({
      level: z3.string(),
      // 运势等级：大吉、中吉、小吉、末吉、凶
      percent: z3.number(),
      // 摸鱼指数百分比
      language: z3.enum(["zh", "en"]).optional().default("zh")
      // 语言
    })
  ).mutation(async ({ input }) => {
    const { level, percent, language } = input;
    const isEnglish = language === "en";
    const FALLBACK_MESSAGES = isEnglish ? FALLBACK_MESSAGES_EN : FALLBACK_MESSAGES_ZH;
    try {
      const systemPrompt = isEnglish ? `You are a witty office slacking fortune generator. Output ONLY one short, funny slogan (20-60 characters) about slacking at work.

Style: Use Gen-Z office humor, memes, corporate buzzwords mockery. Be sarcastic and relatable.
Themes to include: Anti-hustle culture, quiet quitting, layoff anxiety humor, economic downturn jokes, work-life balance rebellion.

Fortune mood:
- Great Luck (\u5927\u5409): Super happy, slack freely, no consequences
- Good Luck (\u4E2D\u5409): Nice, can slack moderately with confidence  
- Fair Luck (\u5C0F\u5409): Okay, slack carefully, stay alert
- Minor Luck (\u672B\u5409): Meh, be very careful, minimal slacking
- Bad Luck (\u51F6): Don't slack, actually work today` : `\u4F60\u662F\u6478\u9C7C\u91D1\u53E5\u751F\u6210\u5668\u3002\u53EA\u8F93\u51FA\u4E00\u53E520-40\u5B57\u768400\u540E\u804C\u573A\u9ED1\u8BDD\u98CE\u683C\u91D1\u53E5\uFF0C\u4E0D\u8981\u4EFB\u4F55\u89E3\u91CA\u3002

\u98CE\u683C\u8981\u6C42\uFF1A\u4F7F\u7528\u6446\u70C2\u3001\u8EBA\u5E73\u3001\u753B\u997C\u3001\u5E26\u85AA\u62C9\u5C4E\u3001\u7CBE\u795E\u79BB\u804C\u3001\u5DE5\u4F4D\u517B\u8001\u3001\u6574\u987F\u804C\u573A\u3001\u5BF9\u9F50\u9897\u7C92\u5EA6\u3001\u62C9\u901A\u5BF9\u9F50\u3001\u8D4B\u80FD\u3001\u6293\u624B\u7B49\u804C\u573A\u6897\u3002
\u4E3B\u9898\u65B9\u5411\uFF1A\u53CD\u5185\u5377\u3001\u88C1\u5458\u7126\u8651\u8C03\u4F83\u3001\u901A\u7F29\u5E7D\u9ED8\u3001\u6253\u5DE5\u4EBA\u81EA\u5632\u3001\u804C\u573A\u751F\u5B58\u667A\u6167\u3002

\u8FD0\u52BF\u60C5\u7EEA\uFF1A
- \u5927\u5409\uFF1A\u8D85\u5F00\u5FC3\uFF0C\u653E\u5FC3\u6478\uFF0C\u53EF\u4EE5\u8086\u65E0\u5FCC\u60EE
- \u4E2D\u5409\uFF1A\u4E0D\u9519\uFF0C\u6709\u4FDD\u969C\uFF0C\u53EF\u4EE5\u9002\u5EA6\u6478\u9C7C
- \u5C0F\u5409\uFF1A\u8FD8\u884C\uFF0C\u9002\u5EA6\u6478\uFF0C\u8981\u89C1\u673A\u884C\u4E8B
- \u672B\u5409\uFF1A\u4E00\u822C\uFF0C\u5C0F\u5FC3\u70B9\uFF0C\u8981\u683C\u5916\u8C28\u614E
- \u51F6\uFF1A\u4E0D\u884C\uFF0C\u8981\u4F4E\u8C03\uFF0C\u6700\u597D\u522B\u6478`;
      const levelMap = {
        "\u5927\u5409": "Great Luck",
        "\u4E2D\u5409": "Good Luck",
        "\u5C0F\u5409": "Fair Luck",
        "\u672B\u5409": "Minor Luck",
        "\u51F6": "Bad Luck"
      };
      const userPrompt = isEnglish ? `Fortune: ${levelMap[level] || level}, Index: ${percent}%. Output slogan:` : `\u8FD0\u52BF\uFF1A${level}\uFF0C\u6307\u6570${percent}%\u3002\u8F93\u51FA\u91D1\u53E5\uFF1A`;
      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });
      const content = result.choices[0]?.message?.content;
      if (typeof content === "string" && content.trim().length > 0) {
        const slogan = extractSlogan(content, isEnglish);
        if (slogan.length < 10 || slogan.length > 80) {
          const fallbacks2 = FALLBACK_MESSAGES[level] || FALLBACK_MESSAGES["\u5C0F\u5409"];
          const randomSlogan2 = fallbacks2[Math.floor(Math.random() * fallbacks2.length)];
          return {
            success: true,
            slogan: randomSlogan2,
            source: "fallback"
          };
        }
        return {
          success: true,
          slogan,
          source: "ai"
        };
      }
      const fallbacks = FALLBACK_MESSAGES[level] || FALLBACK_MESSAGES["\u5C0F\u5409"];
      const randomSlogan = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      return {
        success: true,
        slogan: randomSlogan,
        source: "fallback"
      };
    } catch (error) {
      console.error("LLM\u8C03\u7528\u5931\u8D25:", error);
      const fallbacks = FALLBACK_MESSAGES[level] || FALLBACK_MESSAGES["\u5C0F\u5409"];
      const randomSlogan = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      return {
        success: true,
        slogan: randomSlogan,
        source: "fallback"
      };
    }
  })
});

// server/stripe/router.ts
import { z as z4 } from "zod";
import { TRPCError as TRPCError4 } from "@trpc/server";
import { eq as eq4 } from "drizzle-orm";

// server/stripe/client.ts
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
  // 单次付费报告
  DETAILED_REPORT: {
    name: "\u6478\u9C7C\u8FD0\u52BF\u8BE6\u7EC6\u62A5\u544A",
    description: "AI\u751F\u6210\u7684\u4E2A\u6027\u5316\u6478\u9C7C\u6307\u5357\uFF0C\u5305\u542B\u6700\u4F73\u6478\u9C7C\u65F6\u6BB5\u3001\u672C\u5468\u8FD0\u52BF\u8D8B\u52BF\u3001\u804C\u573A\u751F\u5B58\u5EFA\u8BAE",
    priceInCents: 990,
    // ¥9.9
    currency: "cny",
    mode: "payment"
  },
  // 月度会员（一次性付款，支持支付宝/微信）
  MONTHLY_MEMBERSHIP: {
    name: "\u6478\u9C7C\u4F1A\u5458 - \u6708\u5361",
    description: "\u65E0\u9650\u62BD\u7B7E\u3001\u5386\u53F2\u8BB0\u5F55\u3001\u53BB\u5E7F\u544A\u3001\u4E13\u5C5E\u5934\u50CF\uFF0830\u5929\u6709\u6548\uFF09",
    priceInCents: 1990,
    // ¥19.9
    currency: "cny",
    mode: "payment",
    durationDays: 30
    // 会员有效期天数
  },
  // 季度会员（一次性付款，支持支付宝/微信）
  QUARTERLY_MEMBERSHIP: {
    name: "\u6478\u9C7C\u4F1A\u5458 - \u5B63\u5361",
    description: "\u65E0\u9650\u62BD\u7B7E\u3001\u5386\u53F2\u8BB0\u5F55\u3001\u53BB\u5E7F\u544A\u3001\u4E13\u5C5E\u5934\u50CF\u3001\u6BCF\u5468\u8FD0\u52BF\u62A5\u544A\uFF0890\u5929\u6709\u6548\uFF09",
    priceInCents: 4990,
    // ¥49.9
    currency: "cny",
    mode: "payment",
    durationDays: 90
    // 会员有效期天数
  },
  // 永久会员（一次性付款，支持支付宝/微信）
  LIFETIME_MEMBERSHIP: {
    name: "\u6478\u9C7C\u4F1A\u5458 - \u6C38\u4E45\u5361",
    description: "\u4E00\u6B21\u4ED8\u6B3E\uFF0C\u6C38\u4E45\u4EAB\u6709\u5168\u90E8\u4F1A\u5458\u6743\u76CA\uFF0C\u652F\u6301\u652F\u4ED8\u5B9D/\u5FAE\u4FE1\u652F\u4ED8",
    priceInCents: 4990,
    // ￥49.9
    currency: "cny",
    mode: "payment",
    durationDays: -1
    // -1 表示永久
  }
};

// server/stripe/activateCheckout.ts
import { eq as eq3 } from "drizzle-orm";
function getMembershipDuration(productKey) {
  const product = PRODUCTS[productKey];
  if (product && "durationDays" in product) {
    return product.durationDays;
  }
  return 0;
}
function getMembershipPlan(productKey) {
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
      productKey: z4.enum([
        "DETAILED_REPORT",
        "MONTHLY_MEMBERSHIP",
        "QUARTERLY_MEMBERSHIP",
        "ANNUAL_MEMBERSHIP",
        "LIFETIME_MEMBERSHIP"
      ])
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
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "db unavailable" });
    const userSubscription = await db.select().from(subscriptions).where(eq4(subscriptions.userId, ctx.user.id)).limit(1);
    if (userSubscription.length === 0) {
      throw new TRPCError4({ code: "NOT_FOUND", message: "No active subscription found" });
    }
    if (userSubscription[0].stripeSubscriptionId && ENV.stripeSecretKey) {
      try {
        await getStripe().subscriptions.update(userSubscription[0].stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      } catch {
      }
    }
    return { success: true };
  }),
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ENV.stripeSecretKey) {
      throw new TRPCError4({ code: "PRECONDITION_FAILED", message: "Stripe not configured" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "db unavailable" });
    const userSubscription = await db.select().from(subscriptions).where(eq4(subscriptions.userId, ctx.user.id)).limit(1);
    if (userSubscription.length === 0 || !userSubscription[0].stripeCustomerId) {
      throw new TRPCError4({ code: "NOT_FOUND", message: "No customer found" });
    }
    const origin = checkoutOrigin(ctx.req);
    const session = await getStripe().billingPortal.sessions.create({
      customer: userSubscription[0].stripeCustomerId,
      return_url: `${origin}/membership`
    });
    return { portalUrl: session.url };
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
import { eq as eq5, and, desc, sql } from "drizzle-orm";
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
var DAILY_DRAW_LIMIT = 3;
var INVITE_REWARD_DAYS = 3;
function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
var memberRouter = router({
  // 检查是否可以抽签
  checkDrawLimit: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { canDraw: true, remaining: DAILY_DRAW_LIMIT, isVip: false };
    }
    const userSubscription = await db.select().from(subscriptions).where(and(
      eq5(subscriptions.userId, ctx.user.id),
      eq5(subscriptions.status, "active")
    )).limit(1);
    const isVip = userSubscription.length > 0;
    if (isVip) {
      return { canDraw: true, remaining: -1, isVip: true };
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayCount = await db.select().from(dailyDrawCount).where(and(
      eq5(dailyDrawCount.userId, ctx.user.id),
      eq5(dailyDrawCount.drawDate, today)
    )).limit(1);
    const currentCount = todayCount.length > 0 ? todayCount[0].count : 0;
    const remaining = DAILY_DRAW_LIMIT - currentCount;
    return {
      canDraw: remaining > 0,
      remaining,
      isVip: false,
      limit: DAILY_DRAW_LIMIT
    };
  }),
  // 记录抽签（增加次数）
  recordDraw: protectedProcedure.input(z5.object({
    level: z5.string(),
    emoji: z5.string(),
    percent: z5.number(),
    message: z5.string().optional(),
    suggestedTime: z5.string().optional(),
    avatar: z5.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      return { success: true };
    }
    const userSubscription = await db.select().from(subscriptions).where(and(
      eq5(subscriptions.userId, ctx.user.id),
      eq5(subscriptions.status, "active")
    )).limit(1);
    const isVip = userSubscription.length > 0;
    if (!isVip) {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const todayCount = await db.select().from(dailyDrawCount).where(
        and(
          eq5(dailyDrawCount.userId, ctx.user.id),
          eq5(dailyDrawCount.drawDate, today)
        )
      ).limit(1);
      if (todayCount.length > 0) {
        if (todayCount[0].count >= DAILY_DRAW_LIMIT) {
          throw new TRPCError5({
            code: "FORBIDDEN",
            message: "\u4ECA\u65E5\u62BD\u7B7E\u6B21\u6570\u5DF2\u7528\u5B8C\uFF0C\u5347\u7EA7\u4F1A\u5458\u4EAB\u53D7\u65E0\u9650\u62BD\u7B7E"
          });
        }
        await db.update(dailyDrawCount).set({ count: todayCount[0].count + 1 }).where(eq5(dailyDrawCount.id, todayCount[0].id));
      } else {
        await db.insert(dailyDrawCount).values({
          userId: ctx.user.id,
          drawDate: today,
          count: 1
        });
      }
    }
    await db.insert(fortuneHistory).values({
      userId: ctx.user.id,
      level: input.level,
      emoji: input.emoji,
      percent: input.percent,
      message: input.message || null,
      suggestedTime: input.suggestedTime || null,
      avatar: input.avatar || null
    });
    return { success: true };
  }),
  // 获取抽签历史
  getHistory: protectedProcedure.input(z5.object({
    limit: z5.number().min(1).max(100).default(20),
    offset: z5.number().min(0).default(0)
  }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      return { history: [], total: 0 };
    }
    const limit = input?.limit || 20;
    const offset = input?.offset || 0;
    const history = await db.select().from(fortuneHistory).where(eq5(fortuneHistory.userId, ctx.user.id)).orderBy(desc(fortuneHistory.createdAt)).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql`count(*)` }).from(fortuneHistory).where(eq5(fortuneHistory.userId, ctx.user.id));
    return {
      history,
      total: countResult[0]?.count || 0
    };
  }),
  // 获取可用头像列表
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
    const userSubscription = await db.select().from(subscriptions).where(and(
      eq5(subscriptions.userId, ctx.user.id),
      eq5(subscriptions.status, "active")
    )).limit(1);
    const isVip = userSubscription.length > 0;
    const plan = userSubscription[0]?.plan || null;
    const user = await db.select().from(users).where(eq5(users.id, ctx.user.id)).limit(1);
    let unlockedAvatars = [];
    if (user[0]?.unlockedAvatars) {
      try {
        unlockedAvatars = JSON.parse(user[0].unlockedAvatars);
      } catch (e) {
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
  }),
  // 获取或生成邀请码
  getInviteCode: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { inviteCode: null };
    }
    const user = await db.select().from(users).where(eq5(users.id, ctx.user.id)).limit(1);
    if (user[0]?.inviteCode) {
      return { inviteCode: user[0].inviteCode };
    }
    let inviteCode3 = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.select().from(users).where(eq5(users.inviteCode, inviteCode3)).limit(1);
      if (existing.length === 0) break;
      inviteCode3 = generateInviteCode();
      attempts++;
    }
    await db.update(users).set({ inviteCode: inviteCode3 }).where(eq5(users.id, ctx.user.id));
    return { inviteCode: inviteCode3 };
  }),
  // 使用邀请码注册
  applyInviteCode: protectedProcedure.input(z5.object({ inviteCode: z5.string() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    }
    const currentUser = await db.select().from(users).where(eq5(users.id, ctx.user.id)).limit(1);
    if (currentUser[0]?.invitedBy) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u60A8\u5DF2\u4F7F\u7528\u8FC7\u9080\u8BF7\u7801" });
    }
    const inviter = await db.select().from(users).where(eq5(users.inviteCode, input.inviteCode.toUpperCase())).limit(1);
    if (inviter.length === 0) {
      throw new TRPCError5({ code: "NOT_FOUND", message: "\u9080\u8BF7\u7801\u65E0\u6548" });
    }
    if (inviter[0].id === ctx.user.id) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u4F7F\u7528\u81EA\u5DF1\u7684\u9080\u8BF7\u7801" });
    }
    await db.update(users).set({ invitedBy: inviter[0].id }).where(eq5(users.id, ctx.user.id));
    await db.insert(invitations).values({
      inviterId: inviter[0].id,
      inviteeId: ctx.user.id,
      rewardDays: INVITE_REWARD_DAYS,
      rewardClaimed: false
    });
    return { success: true, inviterName: inviter[0].name || "\u6478\u9C7C\u8FBE\u4EBA" };
  }),
  // 获取邀请统计
  getInviteStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { totalInvites: 0, claimedRewards: 0, pendingRewards: 0, inviteList: [] };
    }
    const inviteList = await db.select({
      id: invitations.id,
      inviteeId: invitations.inviteeId,
      rewardDays: invitations.rewardDays,
      rewardClaimed: invitations.rewardClaimed,
      createdAt: invitations.createdAt,
      inviteeName: users.name
    }).from(invitations).leftJoin(users, eq5(invitations.inviteeId, users.id)).where(eq5(invitations.inviterId, ctx.user.id)).orderBy(desc(invitations.createdAt));
    const totalInvites = inviteList.length;
    const claimedRewards = inviteList.filter((i) => i.rewardClaimed).reduce((sum, i) => sum + i.rewardDays, 0);
    const pendingRewards = inviteList.filter((i) => !i.rewardClaimed).reduce((sum, i) => sum + i.rewardDays, 0);
    return {
      totalInvites,
      claimedRewards,
      pendingRewards,
      inviteList: inviteList.map((i) => ({
        id: i.id,
        inviteeName: i.inviteeName || "\u6478\u9C7C\u65B0\u4EBA",
        rewardDays: i.rewardDays,
        rewardClaimed: i.rewardClaimed,
        createdAt: i.createdAt
      }))
    };
  }),
  // 领取邀请奖励
  claimInviteReward: protectedProcedure.input(z5.object({ invitationId: z5.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    }
    const invitation = await db.select().from(invitations).where(and(
      eq5(invitations.id, input.invitationId),
      eq5(invitations.inviterId, ctx.user.id)
    )).limit(1);
    if (invitation.length === 0) {
      throw new TRPCError5({ code: "NOT_FOUND", message: "\u9080\u8BF7\u8BB0\u5F55\u4E0D\u5B58\u5728" });
    }
    if (invitation[0].rewardClaimed) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u5956\u52B1\u5DF2\u9886\u53D6" });
    }
    await db.update(invitations).set({ rewardClaimed: true }).where(eq5(invitations.id, input.invitationId));
    const userSubscription = await db.select().from(subscriptions).where(eq5(subscriptions.userId, ctx.user.id)).limit(1);
    if (userSubscription.length > 0) {
      await db.update(subscriptions).set({
        bonusDays: (userSubscription[0].bonusDays || 0) + invitation[0].rewardDays
      }).where(eq5(subscriptions.id, userSubscription[0].id));
    } else {
      const endDate = /* @__PURE__ */ new Date();
      endDate.setDate(endDate.getDate() + invitation[0].rewardDays);
      await db.insert(subscriptions).values({
        userId: ctx.user.id,
        status: "active",
        plan: "monthly",
        currentPeriodEnd: endDate,
        bonusDays: 0
      });
    }
    return { success: true, rewardDays: invitation[0].rewardDays };
  })
});

// server/routers/feedback.ts
import { z as z6 } from "zod";
import { eq as eq6, desc as desc2 } from "drizzle-orm";
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
    await db.update(feedback).set({ status: input.status }).where(eq6(feedback.id, input.id));
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
    const rows = await db.select().from(feedback).where(eq6(feedback.id, input.id)).limit(1);
    const row = rows[0];
    if (!row) throw new TRPCError6({ code: "NOT_FOUND", message: "feedback not found" });
    await db.update(feedback).set({
      adminReply: input.reply,
      repliedAt: /* @__PURE__ */ new Date(),
      status: "resolved"
    }).where(eq6(feedback.id, input.id));
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
import { eq as eq7, desc as desc3, and as and2, sql as sql2 } from "drizzle-orm";
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
      return await db.select().from(notifications).where(and2(eq7(notifications.userId, ctx.user.id), eq7(notifications.isRead, false))).orderBy(desc3(notifications.createdAt)).limit(limit);
    }
    return await db.select().from(notifications).where(eq7(notifications.userId, ctx.user.id)).orderBy(desc3(notifications.createdAt)).limit(limit);
  }),
  // 获取未读通知数量
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const result = await db.select({ count: sql2`count(*)` }).from(notifications).where(and2(eq7(notifications.userId, ctx.user.id), eq7(notifications.isRead, false)));
    return { count: result[0]?.count ?? 0 };
  }),
  // 标记通知为已读
  markAsRead: protectedProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    await db.update(notifications).set({ isRead: true }).where(and2(eq7(notifications.id, input.id), eq7(notifications.userId, ctx.user.id)));
    return { success: true };
  }),
  // 标记所有通知为已读
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    await db.update(notifications).set({ isRead: true }).where(eq7(notifications.userId, ctx.user.id));
    return { success: true };
  })
});

// server/routers/leaderboard.ts
import { z as z8 } from "zod";
import { eq as eq8, desc as desc4, sql as sql3, and as and3, gte, lte } from "drizzle-orm";
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
    const result = await db.execute(sql3`
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
    const rankings = asRows(result).map((row, index) => ({
      rank: index + 1,
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
    const result = await db.execute(sql3`
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
    const rankings = asRows(result).map((row, index) => ({
      rank: index + 1,
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
  myRanking: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { streak: 0, weeklyBest: null, totalDraws: 0 };
    }
    const streakResult = await db.execute(sql3`
      WITH my_dates AS (
        SELECT ("createdAt")::date AS draw_date
        FROM fortune_history
        WHERE "userId" = ${ctx.user.id}
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
        eq8(fortuneHistory.userId, ctx.user.id),
        gte(fortuneHistory.createdAt, start),
        lte(fortuneHistory.createdAt, end)
      )
    ).orderBy(desc4(fortuneHistory.percent)).limit(1);
    const totalResult = await db.select({ count: sql3`count(*)` }).from(fortuneHistory).where(eq8(fortuneHistory.userId, ctx.user.id));
    return {
      streak,
      weeklyBest: weeklyBest[0] || null,
      totalDraws: Number(totalResult[0]?.count || 0)
    };
  }),
  globalStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return { totalUsers: 0, totalDraws: 0, todayDraws: 0, avgPercent: 0 };
    }
    const stats = await db.execute(sql3`
      SELECT
        (SELECT COUNT(DISTINCT id)::int FROM users) AS "totalUsers",
        (SELECT COUNT(*)::int FROM fortune_history) AS "totalDraws",
        (
          SELECT COUNT(*)::int
          FROM fortune_history
          WHERE ("createdAt")::date = CURRENT_DATE
        ) AS "todayDraws",
        (SELECT COALESCE(ROUND(AVG(percent)), 0)::int FROM fortune_history) AS "avgPercent"
    `);
    const row = asRows(stats)[0] || {};
    return {
      totalUsers: Number(row.totalUsers || 0),
      totalDraws: Number(row.totalDraws || 0),
      todayDraws: Number(row.todayDraws || 0),
      avgPercent: Number(row.avgPercent || 0)
    };
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
import { eq as eq9 } from "drizzle-orm";
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
        case "customer.subscription.updated": {
          const subscription = event.data.object;
          const subscriptionId = subscription.id;
          const status = subscription.status;
          const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1e3) : /* @__PURE__ */ new Date();
          let dbStatus = "active";
          if (status === "canceled") dbStatus = "canceled";
          else if (status === "past_due") dbStatus = "past_due";
          await db.update(subscriptions).set({ status: dbStatus, currentPeriodEnd: periodEnd }).where(eq9(subscriptions.stripeSubscriptionId, subscriptionId));
          console.log(`[Webhook] Subscription ${subscriptionId} updated to ${status}`);
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          await db.update(subscriptions).set({ status: "canceled" }).where(eq9(subscriptions.stripeSubscriptionId, subscription.id));
          console.log(`[Webhook] Subscription ${subscription.id} canceled`);
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object;
          const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
          if (subscriptionId) {
            await db.update(subscriptions).set({ status: "past_due" }).where(eq9(subscriptions.stripeSubscriptionId, subscriptionId));
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

// server/cron/dailyNotification.ts
import { sql as sql4 } from "drizzle-orm";
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
    const activeUsers = await db.select({ id: users.id, name: users.name }).from(users).where(sql4`${users.lastSignedIn} >= ${sevenDaysAgo}`);
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

// server/light/store.ts
import fs from "node:fs";
import path from "node:path";
import { createHash as createHash2, randomBytes as randomBytes2 } from "node:crypto";
var DATA_DIR = process.env.MOYU_DATA_DIR || path.join(process.cwd(), "data");
var DATA_FILE = path.join(DATA_DIR, "moyu-light.json");
var MAX_DRAWS = 5e3;
var MAX_FEEDBACK = 2e3;
var INVITE_REWARD_DAYS2 = 3;
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
async function tursoExec(sql6, args = []) {
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
            sql: sql6,
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
function inviteCodeFor(deviceId) {
  const hash = createHash2("sha256").update(`moyu-invite:${deviceId}`).digest("hex");
  return hash.slice(0, 8).toUpperCase();
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
function getOrCreateInvite(deviceId) {
  const idKey = String(deviceId || "").slice(0, 80);
  if (!idKey) throw new Error("deviceId required");
  const s = getStore();
  let row = s.invites.find((i) => i.ownerDeviceId === idKey);
  if (!row) {
    let code = inviteCodeFor(idKey);
    let n = 0;
    while (s.invites.some((i) => i.code === code && i.ownerDeviceId !== idKey) && n < 5) {
      code = inviteCodeFor(`${idKey}:${n++}`);
    }
    row = { code, ownerDeviceId: idKey, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    s.invites.push(row);
    persist();
  }
  return {
    inviteCode: row.code,
    ownerDeviceId: row.ownerDeviceId,
    createdAt: row.createdAt
  };
}
function getInviteStats(deviceId) {
  const idKey = String(deviceId || "").slice(0, 80);
  const mine = getStore().inviteUses.filter((u) => u.inviterDeviceId === idKey);
  const claimedRewards = mine.filter((u) => u.rewardClaimed).reduce((sum, u) => sum + u.rewardDays, 0);
  const pendingRewards = mine.filter((u) => !u.rewardClaimed).reduce((sum, u) => sum + u.rewardDays, 0);
  return {
    totalInvites: mine.length,
    claimedRewards,
    pendingRewards,
    inviteList: mine.map((u) => ({
      id: u.id,
      inviteeName: u.inviteeName,
      rewardDays: u.rewardDays,
      rewardClaimed: u.rewardClaimed,
      createdAt: u.createdAt
    }))
  };
}
function applyInviteCode(input) {
  const inviteeDeviceId = String(input.deviceId || "").slice(0, 80);
  const code = String(input.inviteCode || "").trim().toUpperCase().slice(0, 8);
  if (!inviteeDeviceId) throw new Error("deviceId required");
  if (code.length !== 8) throw new Error("invalid invite code");
  const s = getStore();
  const invite = s.invites.find((i) => i.code === code);
  if (!invite) throw new Error("invite code not found");
  if (invite.ownerDeviceId === inviteeDeviceId) {
    throw new Error("cannot use your own invite code");
  }
  if (s.inviteUses.some((u) => u.inviteeDeviceId === inviteeDeviceId)) {
    throw new Error("invite already applied");
  }
  const inviterProfile = s.profiles.find((p) => p.deviceId === invite.ownerDeviceId);
  const inviteeName = String(input.name || "\u6478\u9C7C\u8FBE\u4EBA").slice(0, 32);
  const use = {
    id: id("inv"),
    code,
    inviterDeviceId: invite.ownerDeviceId,
    inviteeDeviceId,
    inviteeName,
    rewardDays: INVITE_REWARD_DAYS2,
    rewardClaimed: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  s.inviteUses.unshift(use);
  upsertProfile(inviteeDeviceId, inviteeName);
  persist();
  return {
    inviterName: inviterProfile?.name || "\u6478\u9C7C\u8FBE\u4EBA",
    rewardDays: INVITE_REWARD_DAYS2,
    invitationId: use.id
  };
}
function claimInviteReward(input) {
  const deviceId = String(input.deviceId || "").slice(0, 80);
  const invitationId = String(input.invitationId || "").slice(0, 64);
  if (!deviceId || !invitationId) throw new Error("deviceId and invitationId required");
  const s = getStore();
  const row = s.inviteUses.find((u) => u.id === invitationId);
  if (!row || row.inviterDeviceId !== deviceId) throw new Error("invitation not found");
  if (row.rewardClaimed) throw new Error("reward already claimed");
  row.rewardClaimed = true;
  persist();
  return { rewardDays: row.rewardDays };
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
import { and as and4, desc as desc5, eq as eq10, sql as sql5 } from "drizzle-orm";
function asRows2(result) {
  if (Array.isArray(result)) return result;
  const nested = result?.rows;
  if (Array.isArray(nested)) return nested;
  return [];
}
function inviteCode2() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
async function ensureGuestUser(deviceId, name) {
  const openId = guestOpenId(deviceId);
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
        const clash = await database.select().from(users).where(eq10(users.inviteCode, code)).limit(1);
        if (clash.length === 0) break;
        code = inviteCode2();
      }
      await database.update(users).set({ inviteCode: code, updatedAt: /* @__PURE__ */ new Date() }).where(eq10(users.id, user.id));
      user = await getUserByOpenId(openId);
    }
  }
  return user;
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
  const database = await getDb();
  if (!database) throw new Error("database unavailable");
  const level = String(input.level || "\u5C0F\u5409").slice(0, 8);
  const emoji = String(input.emoji || "\u{1F41F}").slice(0, 8);
  const percent = Math.max(0, Math.min(100, Number(input.percent) || 0));
  const message = String(input.message || "").slice(0, 240);
  const suggestedTime = String(input.suggestedTime || "").slice(0, 32);
  const avatar = String(input.avatar || "").slice(0, 64);
  const inserted = await database.insert(fortuneHistory).values({
    userId: user.id,
    level,
    emoji,
    percent,
    message: message || null,
    suggestedTime: suggestedTime || null,
    avatar: avatar || null
  }).returning();
  const row = inserted[0];
  return {
    id: String(row?.id ?? ""),
    deviceId,
    name: user.name || "\u6478\u9C7C\u8FBE\u4EBA",
    level,
    emoji,
    percent,
    message,
    suggestedTime,
    avatar,
    createdAt: (row?.createdAt || /* @__PURE__ */ new Date()).toISOString()
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
  const streakResult = await database.execute(sql5`
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
  const streak = asRows2(streakResult).map((row, index) => {
    const openId = String(row.openId || "");
    const deviceId = openId.startsWith("guest_") ? openId.slice(6) : openId;
    return {
      rank: index + 1,
      deviceId,
      name: row.name || "\u6478\u9C7C\u8FBE\u4EBA",
      streak: Number(row.streak),
      lastDate: String(row.lastDate || "").slice(0, 10)
    };
  });
  const weeklyResult = await database.execute(sql5`
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
  const weekly = asRows2(weeklyResult).sort((a, b) => Number(b.bestPercent) - Number(a.bestPercent)).slice(0, lim).map((row, index) => {
    const openId = String(row.openId || "");
    const deviceId = openId.startsWith("guest_") ? openId.slice(6) : openId;
    return {
      rank: index + 1,
      deviceId,
      name: row.name || "\u6478\u9C7C\u8FBE\u4EBA",
      bestPercent: Number(row.bestPercent),
      level: String(row.level || ""),
      emoji: String(row.emoji || "")
    };
  });
  const globalResult = await database.execute(sql5`
    SELECT
      (SELECT COUNT(*)::int FROM fortune_history) AS "totalDraws",
      (SELECT COUNT(DISTINCT "userId")::int FROM fortune_history) AS "uniqueDevices"
  `);
  const g = asRows2(globalResult)[0] || {};
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
async function getOrCreateInvitePg(deviceId) {
  const user = await ensureGuestUser(deviceId);
  return {
    code: user.inviteCode || "",
    ownerDeviceId: deviceId,
    createdAt: user.createdAt.toISOString()
  };
}
async function getInviteStatsPg(deviceId) {
  const user = await getUserByOpenId(guestOpenId(deviceId));
  if (!user) {
    return { inviteCount: 0, claimedRewards: 0, pendingRewards: 0, uses: [] };
  }
  const database = await getDb();
  if (!database) {
    return { inviteCount: 0, claimedRewards: 0, pendingRewards: 0, uses: [] };
  }
  const rows = await database.select().from(invitations).where(eq10(invitations.inviterId, user.id));
  const claimed = rows.filter((r) => r.rewardClaimed).length;
  const pending = rows.filter((r) => !r.rewardClaimed).length;
  return {
    inviteCount: rows.length,
    claimedRewards: claimed,
    pendingRewards: pending,
    uses: rows.map((r) => ({
      id: String(r.id),
      inviteeId: r.inviteeId,
      rewardDays: r.rewardDays,
      rewardClaimed: r.rewardClaimed,
      createdAt: r.createdAt.toISOString()
    }))
  };
}
async function applyInviteCodePg(input) {
  const code = String(input.inviteCode || "").trim().toUpperCase();
  if (!code) throw new Error("inviteCode required");
  const invitee = await ensureGuestUser(input.deviceId, input.name);
  const database = await getDb();
  if (!database) throw new Error("database unavailable");
  const owners = await database.select().from(users).where(eq10(users.inviteCode, code)).limit(1);
  if (owners.length === 0) throw new Error("invalid_invite");
  const owner = owners[0];
  if (owner.id === invitee.id) throw new Error("self_invite");
  const existing = await database.select().from(invitations).where(eq10(invitations.inviteeId, invitee.id)).limit(1);
  if (existing.length > 0) throw new Error("already_invited");
  await database.insert(invitations).values({
    inviterId: owner.id,
    inviteeId: invitee.id,
    rewardDays: 3,
    rewardClaimed: false
  });
  await database.update(users).set({ invitedBy: owner.id, updatedAt: /* @__PURE__ */ new Date() }).where(eq10(users.id, invitee.id));
  return { ok: true, inviterName: owner.name || "\u6478\u9C7C\u8FBE\u4EBA" };
}
async function claimInviteRewardPg(input) {
  const user = await ensureGuestUser(input.deviceId);
  const database = await getDb();
  if (!database) throw new Error("database unavailable");
  const id2 = Number(input.invitationId);
  if (!Number.isFinite(id2)) throw new Error("invitationId required");
  const rows = await database.select().from(invitations).where(and4(eq10(invitations.id, id2), eq10(invitations.inviterId, user.id))).limit(1);
  if (rows.length === 0) throw new Error("not_found");
  const row = rows[0];
  if (row.rewardClaimed) throw new Error("already_claimed");
  await database.update(invitations).set({ rewardClaimed: true }).where(eq10(invitations.id, row.id));
  return { ok: true, rewardDays: row.rewardDays, claimed: true };
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
    const limit = Number(req.query.limit || 50);
    const list = await usePostgres() ? await listFeedbackPg(limit) : listFeedback(limit);
    res.json({ ok: true, feedback: list });
  });
  app.get("/api/light/invite", async (req, res) => {
    try {
      const deviceId = deviceIdOf(req);
      if (await usePostgres()) {
        const invite2 = await getOrCreateInvitePg(deviceId);
        const stats2 = await getInviteStatsPg(deviceId);
        res.json({ ok: true, ...invite2, ...stats2 });
        return;
      }
      const invite = getOrCreateInvite(deviceId);
      const stats = getInviteStats(deviceId);
      res.json({ ok: true, ...invite, ...stats });
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: e instanceof Error ? e.message : "bad_request"
      });
    }
  });
  app.post("/api/light/invite", rateLimit(6e4, 30), async (req, res) => {
    try {
      const body = req.body || {};
      const action = String(body.action || "apply");
      const deviceId = deviceIdOf(req, body);
      const pg = await usePostgres();
      if (action === "claim") {
        const result2 = pg ? await claimInviteRewardPg({
          deviceId,
          invitationId: String(body.invitationId || "")
        }) : claimInviteReward({
          deviceId,
          invitationId: String(body.invitationId || "")
        });
        res.json({ ok: true, ...result2 });
        return;
      }
      if (action === "ensure") {
        if (pg) {
          const invite2 = await getOrCreateInvitePg(deviceId);
          const stats2 = await getInviteStatsPg(deviceId);
          res.json({ ok: true, ...invite2, ...stats2 });
          return;
        }
        const invite = getOrCreateInvite(deviceId);
        const stats = getInviteStats(deviceId);
        res.json({ ok: true, ...invite, ...stats });
        return;
      }
      const result = pg ? await applyInviteCodePg({
        deviceId,
        inviteCode: String(body.inviteCode || body.code || ""),
        name: body.name != null ? String(body.name) : void 0
      }) : applyInviteCode({
        deviceId,
        inviteCode: String(body.inviteCode || body.code || ""),
        name: body.name != null ? String(body.name) : void 0
      });
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: e instanceof Error ? e.message : "bad_request"
      });
    }
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
  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "moyu-fortune",
      version: "path-c-1.0",
      mode: "api"
    });
  });
  registerLightApi(app);
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
