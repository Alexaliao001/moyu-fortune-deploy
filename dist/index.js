// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, date } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var subscriptions = mysqlTable("subscriptions", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var purchases = mysqlTable("purchases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  productType: varchar("productType", { length: 64 }).notNull(),
  // detailed_report
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var fortuneHistory = mysqlTable("fortune_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  level: varchar("level", { length: 16 }).notNull(),
  // 大吉、中吉、小吉、末吉、凶
  emoji: varchar("emoji", { length: 16 }).notNull(),
  percent: int("percent").notNull(),
  message: text("message"),
  suggestedTime: varchar("suggestedTime", { length: 32 }),
  avatar: varchar("avatar", { length: 512 }),
  // 使用的头像（支持emoji或图片URL）
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var dailyDrawCount = mysqlTable("daily_draw_count", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  drawDate: date("drawDate").notNull(),
  count: int("count").default(0).notNull()
});
var invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  inviterId: int("inviterId").notNull(),
  // 邀请人
  inviteeId: int("inviteeId").notNull(),
  // 被邀请人
  rewardDays: int("rewardDays").default(3).notNull(),
  // 奖励天数
  rewardClaimed: boolean("rewardClaimed").default(false).notNull(),
  // 是否已领取奖励
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  // 可以为空（匿名反馈）
  type: mysqlEnum("type", ["bug", "feature", "suggestion", "other"]).default("suggestion").notNull(),
  content: text("content").notNull(),
  contact: varchar("contact", { length: 255 }),
  // 联系方式（可选）
  status: mysqlEnum("status", ["pending", "reviewed", "resolved", "closed"]).default("pending").notNull(),
  adminReply: text("adminReply"),
  // 管理员回复
  repliedAt: timestamp("repliedAt"),
  // 回复时间
  userAgent: text("userAgent"),
  // 浏览器信息
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 接收通知的用户
  type: mysqlEnum("type", ["feedback_reply", "system", "reward"]).default("system").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  relatedId: int("relatedId"),
  // 关联的反馈ID等
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

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

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
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

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
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
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
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
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var adminProcedure = publicProcedure;

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
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

// server/routers/fortune.ts
import { z as z2 } from "zod";

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
    z2.object({
      level: z2.string(),
      // 运势等级：大吉、中吉、小吉、末吉、凶
      percent: z2.number(),
      // 摸鱼指数百分比
      language: z2.enum(["zh", "en"]).optional().default("zh")
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
import { z as z3 } from "zod";

// server/stripe/client.ts
import Stripe from "stripe";
var stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2025-12-15.clover",
  typescript: true
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

// server/stripe/router.ts
import { eq as eq2 } from "drizzle-orm";
var stripeRouter = router({
  // 创建Checkout Session（全部使用一次性付款模式以支持支付宝/微信）
  createCheckoutSession: publicProcedure.input(
    z3.object({
      productKey: z3.enum(["DETAILED_REPORT", "MONTHLY_MEMBERSHIP", "QUARTERLY_MEMBERSHIP", "ANNUAL_MEMBERSHIP", "LIFETIME_MEMBERSHIP"])
    })
  ).mutation(async ({ ctx, input }) => {
    const product = PRODUCTS[input.productKey];
    const user = ctx.user;
    const origin = ctx.req.headers.origin || "http://localhost:3000";
    const priceData = {
      currency: product.currency,
      unit_amount: product.priceInCents,
      product_data: {
        name: product.name,
        description: product.description
      }
    };
    const paymentMethodTypes = ["card", "alipay", "wechat_pay"];
    const sessionParams = {
      mode: "payment",
      // 全部使用一次性付款
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price_data: priceData,
          quantity: 1
        }
      ],
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel`,
      customer_email: user.email || void 0,
      client_reference_id: user.id.toString(),
      metadata: {
        user_id: user.id.toString(),
        customer_email: user.email || "",
        customer_name: user.name || "",
        product_key: input.productKey
      },
      allow_promotion_codes: true,
      payment_method_options: {
        wechat_pay: {
          client: "web"
        }
      }
    };
    const session = await stripe.checkout.sessions.create(sessionParams);
    return {
      checkoutUrl: session.url,
      sessionId: session.id
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
        currentPeriodEnd: null
      };
    }
    const userSubscription = await db.select().from(subscriptions).where(eq2(subscriptions.userId, String(ctx.user?.id || "guest"))).limit(1);
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
  // 获取用户购买历史
  getPurchaseHistory: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    const userPurchases = await db.select().from(purchases).where(eq2(purchases.userId, String(ctx.user?.id || "guest"))).orderBy(purchases.createdAt);
    return userPurchases;
  }),
  // 取消订阅（保留接口但现在只是标记状态）
  cancelSubscription: publicProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const userSubscription = await db.select().from(subscriptions).where(eq2(subscriptions.userId, String(ctx.user?.id || "guest"))).limit(1);
    if (userSubscription.length === 0) {
      throw new Error("No active subscription found");
    }
    if (userSubscription[0].stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(userSubscription[0].stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      } catch (e) {
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
    const userSubscription = await db.select().from(subscriptions).where(eq2(subscriptions.userId, String(ctx.user?.id || "guest"))).limit(1);
    if (userSubscription.length === 0 || !userSubscription[0].stripeCustomerId) {
      throw new Error("No customer found");
    }
    const origin = ctx.req.headers.origin || "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer: userSubscription[0].stripeCustomerId,
      return_url: `${origin}/membership`
    });
    return { portalUrl: session.url };
  })
});

// server/routers/member.ts
import { z as z4 } from "zod";
import { eq as eq3, and, desc, sql } from "drizzle-orm";
import { TRPCError as TRPCError2 } from "@trpc/server";
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
  checkDrawLimit: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { canDraw: true, remaining: DAILY_DRAW_LIMIT, isVip: false };
    }
    const userSubscription = await db.select().from(subscriptions).where(and(
      eq3(subscriptions.userId, ctx.user.id),
      eq3(subscriptions.status, "active")
    )).limit(1);
    const isVip = userSubscription.length > 0;
    if (isVip) {
      return { canDraw: true, remaining: -1, isVip: true };
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayCount = await db.select().from(dailyDrawCount).where(and(
      eq3(dailyDrawCount.userId, ctx.user.id),
      sql`DATE(${dailyDrawCount.drawDate}) = ${today}`
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
  recordDraw: publicProcedure.input(z4.object({
    level: z4.string(),
    emoji: z4.string(),
    percent: z4.number(),
    message: z4.string().optional(),
    suggestedTime: z4.string().optional(),
    avatar: z4.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      return { success: true };
    }
    const userSubscription = await db.select().from(subscriptions).where(and(
      eq3(subscriptions.userId, ctx.user.id),
      eq3(subscriptions.status, "active")
    )).limit(1);
    const isVip = userSubscription.length > 0;
    if (!isVip) {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const todayCount = await db.select().from(dailyDrawCount).where(and(
        eq3(dailyDrawCount.userId, ctx.user.id),
        sql`DATE(${dailyDrawCount.drawDate}) = ${today}`
      )).limit(1);
      if (todayCount.length > 0) {
        if (todayCount[0].count >= DAILY_DRAW_LIMIT) {
          throw new TRPCError2({
            code: "FORBIDDEN",
            message: "\u4ECA\u65E5\u62BD\u7B7E\u6B21\u6570\u5DF2\u7528\u5B8C\uFF0C\u5347\u7EA7\u4F1A\u5458\u4EAB\u53D7\u65E0\u9650\u62BD\u7B7E"
          });
        }
        await db.update(dailyDrawCount).set({ count: todayCount[0].count + 1 }).where(eq3(dailyDrawCount.id, todayCount[0].id));
      } else {
        await db.insert(dailyDrawCount).values({
          userId: ctx.user.id,
          drawDate: new Date(today),
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
  getHistory: publicProcedure.input(z4.object({
    limit: z4.number().min(1).max(100).default(20),
    offset: z4.number().min(0).default(0)
  }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      return { history: [], total: 0 };
    }
    const limit = input?.limit || 20;
    const offset = input?.offset || 0;
    const history = await db.select().from(fortuneHistory).where(eq3(fortuneHistory.userId, ctx.user.id)).orderBy(desc(fortuneHistory.createdAt)).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql`count(*)` }).from(fortuneHistory).where(eq3(fortuneHistory.userId, ctx.user.id));
    return {
      history,
      total: countResult[0]?.count || 0
    };
  }),
  // 获取可用头像列表
  getAvatars: publicProcedure.query(async ({ ctx }) => {
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
      eq3(subscriptions.userId, ctx.user.id),
      eq3(subscriptions.status, "active")
    )).limit(1);
    const isVip = userSubscription.length > 0;
    const plan = userSubscription[0]?.plan || null;
    const user = await db.select().from(users).where(eq3(users.id, ctx.user.id)).limit(1);
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
  getInviteCode: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { inviteCode: null };
    }
    const user = await db.select().from(users).where(eq3(users.id, ctx.user.id)).limit(1);
    if (user[0]?.inviteCode) {
      return { inviteCode: user[0].inviteCode };
    }
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.select().from(users).where(eq3(users.inviteCode, inviteCode)).limit(1);
      if (existing.length === 0) break;
      inviteCode = generateInviteCode();
      attempts++;
    }
    await db.update(users).set({ inviteCode }).where(eq3(users.id, ctx.user.id));
    return { inviteCode };
  }),
  // 使用邀请码注册
  applyInviteCode: publicProcedure.input(z4.object({ inviteCode: z4.string() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    }
    const currentUser = await db.select().from(users).where(eq3(users.id, ctx.user.id)).limit(1);
    if (currentUser[0]?.invitedBy) {
      throw new TRPCError2({ code: "BAD_REQUEST", message: "\u60A8\u5DF2\u4F7F\u7528\u8FC7\u9080\u8BF7\u7801" });
    }
    const inviter = await db.select().from(users).where(eq3(users.inviteCode, input.inviteCode.toUpperCase())).limit(1);
    if (inviter.length === 0) {
      throw new TRPCError2({ code: "NOT_FOUND", message: "\u9080\u8BF7\u7801\u65E0\u6548" });
    }
    if (inviter[0].id === ctx.user.id) {
      throw new TRPCError2({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u4F7F\u7528\u81EA\u5DF1\u7684\u9080\u8BF7\u7801" });
    }
    await db.update(users).set({ invitedBy: inviter[0].id }).where(eq3(users.id, ctx.user.id));
    await db.insert(invitations).values({
      inviterId: inviter[0].id,
      inviteeId: ctx.user.id,
      rewardDays: INVITE_REWARD_DAYS,
      rewardClaimed: false
    });
    return { success: true, inviterName: inviter[0].name || "\u6478\u9C7C\u8FBE\u4EBA" };
  }),
  // 获取邀请统计
  getInviteStats: publicProcedure.query(async ({ ctx }) => {
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
    }).from(invitations).leftJoin(users, eq3(invitations.inviteeId, users.id)).where(eq3(invitations.inviterId, ctx.user.id)).orderBy(desc(invitations.createdAt));
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
  claimInviteReward: publicProcedure.input(z4.object({ invitationId: z4.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: "\u6570\u636E\u5E93\u4E0D\u53EF\u7528" });
    }
    const invitation = await db.select().from(invitations).where(and(
      eq3(invitations.id, input.invitationId),
      eq3(invitations.inviterId, ctx.user.id)
    )).limit(1);
    if (invitation.length === 0) {
      throw new TRPCError2({ code: "NOT_FOUND", message: "\u9080\u8BF7\u8BB0\u5F55\u4E0D\u5B58\u5728" });
    }
    if (invitation[0].rewardClaimed) {
      throw new TRPCError2({ code: "BAD_REQUEST", message: "\u5956\u52B1\u5DF2\u9886\u53D6" });
    }
    await db.update(invitations).set({ rewardClaimed: true }).where(eq3(invitations.id, input.invitationId));
    const userSubscription = await db.select().from(subscriptions).where(eq3(subscriptions.userId, ctx.user.id)).limit(1);
    if (userSubscription.length > 0) {
      await db.update(subscriptions).set({
        bonusDays: (userSubscription[0].bonusDays || 0) + invitation[0].rewardDays
      }).where(eq3(subscriptions.id, userSubscription[0].id));
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
import { z as z5 } from "zod";
import { eq as eq4, desc as desc2 } from "drizzle-orm";
import { TRPCError as TRPCError3 } from "@trpc/server";
var adminProcedure2 = publicProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError3({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});
var feedbackRouter = router({
  // 提交反馈
  submit: publicProcedure.input(
    z5.object({
      type: z5.enum(["bug", "feature", "suggestion", "other"]),
      content: z5.string().min(1).max(1e3),
      contact: z5.string().max(255).optional(),
      userAgent: z5.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const userId = ctx.user?.id || null;
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    await db.insert(feedback).values({
      userId,
      type: input.type,
      content: input.content,
      contact: input.contact || null,
      userAgent: input.userAgent || null,
      status: "pending"
    });
    const typeLabels = {
      bug: "\u{1F41B} \u95EE\u9898\u62A5\u544A",
      feature: "\u{1F4A1} \u529F\u80FD\u5EFA\u8BAE",
      suggestion: "\u{1F44D} \u4F53\u9A8C\u53CD\u9988",
      other: "\u{1F4DD} \u5176\u4ED6"
    };
    try {
      await notifyOwner({
        title: `[\u6478\u4E86\u4E48] \u65B0\u7528\u6237\u53CD\u9988 - ${typeLabels[input.type]}`,
        content: `
**\u53CD\u9988\u7C7B\u578B**: ${typeLabels[input.type]}

**\u53CD\u9988\u5185\u5BB9**:
${input.content}

**\u8054\u7CFB\u65B9\u5F0F**: ${input.contact || "\u672A\u63D0\u4F9B"}

**\u7528\u6237ID**: ${userId || "\u533F\u540D\u7528\u6237"}

**\u63D0\u4EA4\u65F6\u95F4**: ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
          `.trim()
      });
    } catch (e) {
      console.error("Failed to notify owner:", e);
    }
    return { success: true };
  }),
  // 获取反馈列表（管理员）
  list: adminProcedure2.input(
    z5.object({
      status: z5.enum(["pending", "reviewed", "resolved", "closed"]).optional()
    }).optional()
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    if (input?.status) {
      return await db.select().from(feedback).where(eq4(feedback.status, input.status)).orderBy(desc2(feedback.createdAt));
    }
    return await db.select().from(feedback).orderBy(desc2(feedback.createdAt));
  }),
  // 更新反馈状态（管理员）
  updateStatus: adminProcedure2.input(
    z5.object({
      id: z5.number(),
      status: z5.enum(["pending", "reviewed", "resolved", "closed"])
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    await db.update(feedback).set({ status: input.status }).where(eq4(feedback.id, input.id));
    return { success: true };
  }),
  // 回复反馈（管理员）
  reply: adminProcedure2.input(
    z5.object({
      id: z5.number(),
      reply: z5.string().min(1).max(2e3)
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const [feedbackItem] = await db.select().from(feedback).where(eq4(feedback.id, input.id)).limit(1);
    if (!feedbackItem) {
      throw new TRPCError3({ code: "NOT_FOUND", message: "Feedback not found" });
    }
    await db.update(feedback).set({
      adminReply: input.reply,
      repliedAt: /* @__PURE__ */ new Date(),
      status: "resolved"
    }).where(eq4(feedback.id, input.id));
    if (feedbackItem.userId) {
      await db.insert(notifications).values({
        userId: feedbackItem.userId,
        type: "feedback_reply",
        title: "\u60A8\u7684\u53CD\u9988\u5DF2\u6536\u5230\u56DE\u590D",
        content: input.reply,
        relatedId: input.id,
        isRead: false
      });
    }
    return { success: true };
  })
});

// server/routers/notification.ts
import { z as z6 } from "zod";
import { eq as eq5, desc as desc3, and as and2, sql as sql2 } from "drizzle-orm";
var notificationRouter = router({
  // 获取用户通知列表
  list: publicProcedure.input(
    z6.object({
      limit: z6.number().min(1).max(50).default(20),
      unreadOnly: z6.boolean().default(false)
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const limit = input?.limit ?? 20;
    const unreadOnly = input?.unreadOnly ?? false;
    if (unreadOnly) {
      return await db.select().from(notifications).where(and2(eq5(notifications.userId, ctx.user.id), eq5(notifications.isRead, false))).orderBy(desc3(notifications.createdAt)).limit(limit);
    }
    return await db.select().from(notifications).where(eq5(notifications.userId, ctx.user.id)).orderBy(desc3(notifications.createdAt)).limit(limit);
  }),
  // 获取未读通知数量
  unreadCount: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const result = await db.select({ count: sql2`count(*)` }).from(notifications).where(and2(eq5(notifications.userId, ctx.user.id), eq5(notifications.isRead, false)));
    return { count: result[0]?.count ?? 0 };
  }),
  // 标记通知为已读
  markAsRead: publicProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    await db.update(notifications).set({ isRead: true }).where(and2(eq5(notifications.id, input.id), eq5(notifications.userId, ctx.user.id)));
    return { success: true };
  }),
  // 标记所有通知为已读
  markAllAsRead: publicProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    await db.update(notifications).set({ isRead: true }).where(eq5(notifications.userId, ctx.user.id));
    return { success: true };
  })
});

// server/routers/leaderboard.ts
import { z as z7 } from "zod";
import { eq as eq6, desc as desc4, sql as sql3, and as and3, gte, lte } from "drizzle-orm";
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
var leaderboardRouter = router({
  // 连续签到天数排行榜
  streakRanking: publicProcedure.input(
    z7.object({
      limit: z7.number().min(1).max(50).default(20)
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
            userId,
            DATE(createdAt) as draw_date
          FROM fortune_history
          GROUP BY userId, DATE(createdAt)
        ),
        user_streaks AS (
          SELECT 
            userId,
            draw_date,
            DATE_SUB(draw_date, INTERVAL ROW_NUMBER() OVER (PARTITION BY userId ORDER BY draw_date) DAY) as streak_group
          FROM user_dates
        ),
        streak_counts AS (
          SELECT 
            userId,
            streak_group,
            COUNT(*) as streak_length,
            MAX(draw_date) as last_date
          FROM user_streaks
          GROUP BY userId, streak_group
        ),
        current_streaks AS (
          SELECT 
            sc.userId,
            sc.streak_length,
            sc.last_date
          FROM streak_counts sc
          WHERE sc.last_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
          AND sc.streak_length = (
            SELECT MAX(sc2.streak_length) 
            FROM streak_counts sc2 
            WHERE sc2.userId = sc.userId 
            AND sc2.last_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
          )
        )
        SELECT 
          cs.userId,
          u.name,
          cs.streak_length as streak,
          cs.last_date as lastActive
        FROM current_streaks cs
        JOIN users u ON cs.userId = u.id
        ORDER BY cs.streak_length DESC, cs.last_date DESC
        LIMIT ${limit}
      `);
    const rankings = result[0]?.map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      name: row.name || "\u6478\u9C7C\u8FBE\u4EBA",
      streak: Number(row.streak),
      lastActive: row.lastActive
    })) || [];
    return { rankings };
  }),
  // 本周最佳运势排行榜
  weeklyBestRanking: publicProcedure.input(
    z7.object({
      limit: z7.number().min(1).max(50).default(20)
    }).optional()
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      return { rankings: [], weekRange: null };
    }
    const limit = input?.limit ?? 20;
    const { start, end } = getWeekRange();
    const result = await db.execute(sql3`
        WITH weekly_fortune AS (
          SELECT 
            fh.userId,
            u.name,
            fh.level,
            fh.percent,
            fh.emoji,
            fh.createdAt,
            CASE fh.level
              WHEN '大吉' THEN 5
              WHEN '中吉' THEN 4
              WHEN '小吉' THEN 3
              WHEN '末吉' THEN 2
              WHEN '凶' THEN 1
              ELSE 0
            END as level_weight
          FROM fortune_history fh
          JOIN users u ON fh.userId = u.id
          WHERE fh.createdAt >= ${start}
            AND fh.createdAt <= ${end}
        ),
        user_best AS (
          SELECT 
            userId,
            name,
            MAX(level_weight) as best_level_weight,
            AVG(percent) as avg_percent,
            COUNT(*) as total_draws,
            MAX(percent) as best_percent
          FROM weekly_fortune
          GROUP BY userId, name
        ),
        user_best_detail AS (
          SELECT 
            ub.userId,
            ub.name,
            ub.best_level_weight,
            ub.avg_percent,
            ub.total_draws,
            ub.best_percent,
            (SELECT wf.level FROM weekly_fortune wf WHERE wf.userId = ub.userId AND wf.level_weight = ub.best_level_weight LIMIT 1) as best_level,
            (SELECT wf.emoji FROM weekly_fortune wf WHERE wf.userId = ub.userId AND wf.level_weight = ub.best_level_weight LIMIT 1) as best_emoji
          FROM user_best ub
        )
        SELECT *
        FROM user_best_detail
        ORDER BY best_level_weight DESC, best_percent DESC, total_draws DESC
        LIMIT ${limit}
      `);
    const rankings = result[0]?.map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      name: row.name || "\u6478\u9C7C\u8FBE\u4EBA",
      bestLevel: row.best_level,
      bestEmoji: row.best_emoji,
      bestPercent: Number(row.best_percent),
      avgPercent: Math.round(Number(row.avg_percent)),
      totalDraws: Number(row.total_draws)
    })) || [];
    return {
      rankings,
      weekRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    };
  }),
  // 获取我的排名信息
  myRanking: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { streak: 0, weeklyBest: null, totalDraws: 0 };
    }
    const streakResult = await db.execute(sql3`
      WITH my_dates AS (
        SELECT DATE(createdAt) as draw_date
        FROM fortune_history
        WHERE userId = ${ctx.user.id}
        GROUP BY DATE(createdAt)
        ORDER BY draw_date DESC
      ),
      my_streaks AS (
        SELECT 
          draw_date,
          DATE_SUB(draw_date, INTERVAL ROW_NUMBER() OVER (ORDER BY draw_date DESC) DAY) as streak_group
        FROM my_dates
      )
      SELECT COUNT(*) as streak
      FROM my_streaks
      WHERE streak_group = (
        SELECT streak_group FROM my_streaks LIMIT 1
      )
      AND draw_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
    `);
    const streak = Number(streakResult[0]?.[0]?.streak || 0);
    const { start, end } = getWeekRange();
    const weeklyBest = await db.select({
      level: fortuneHistory.level,
      percent: fortuneHistory.percent,
      emoji: fortuneHistory.emoji
    }).from(fortuneHistory).where(
      and3(
        eq6(fortuneHistory.userId, ctx.user.id),
        gte(fortuneHistory.createdAt, start),
        lte(fortuneHistory.createdAt, end)
      )
    ).orderBy(desc4(fortuneHistory.percent)).limit(1);
    const totalResult = await db.select({ count: sql3`count(*)` }).from(fortuneHistory).where(eq6(fortuneHistory.userId, ctx.user.id));
    return {
      streak,
      weeklyBest: weeklyBest[0] || null,
      totalDraws: totalResult[0]?.count || 0
    };
  }),
  // 全站统计
  globalStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return { totalUsers: 0, totalDraws: 0, todayDraws: 0, avgPercent: 0 };
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const stats = await db.execute(sql3`
      SELECT 
        (SELECT COUNT(DISTINCT id) FROM users) as totalUsers,
        (SELECT COUNT(*) FROM fortune_history) as totalDraws,
        (SELECT COUNT(*) FROM fortune_history WHERE DATE(createdAt) = ${today}) as todayDraws,
        (SELECT ROUND(AVG(percent)) FROM fortune_history) as avgPercent
    `);
    const row = stats[0]?.[0];
    return {
      totalUsers: Number(row?.totalUsers || 0),
      totalDraws: Number(row?.totalDraws || 0),
      todayDraws: Number(row?.todayDraws || 0),
      avgPercent: Number(row?.avgPercent || 0)
    };
  })
});

// server/routers.ts
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  // 摸鱼运势功能路由
  fortune: fortuneRouter,
  // Stripe支付路由
  stripe: stripeRouter,
  // 会员功能路由
  member: memberRouter,
  // 用户反馈路由
  feedback: feedbackRouter,
  // 用户通知路由
  notification: notificationRouter,
  // 排行榜路由
  leaderboard: leaderboardRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // 性能优化配置
    target: "es2020",
    minify: "esbuild",
    rollupOptions: {
      output: {
        // 代码分割策略 - 将大依赖从主chunk中分离
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom")) return "vendor-react-dom";
            if (id.includes("/react/")) return "vendor-react";
            if (id.includes("gsap")) return "vendor-animation";
            if (id.includes("i18next")) return "vendor-i18n";
            if (id.includes("@trpc") || id.includes("superjson")) return "vendor-trpc";
            if (id.includes("@radix-ui")) return "vendor-ui";
            if (id.includes("@stripe")) return "vendor-stripe";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("sonner")) return "vendor-toast";
            if (id.includes("wouter")) return "vendor-router";
          }
        },
        // 资源文件命名
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]"
      }
    },
    // 压缩阈值警告
    chunkSizeWarningLimit: 500,
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 启用源码映射（生产环境可关闭）
    sourcemap: false
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/stripe/webhook.ts
import { Router } from "express";
import { eq as eq7 } from "drizzle-orm";
var webhookRouter = Router();
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
webhookRouter.post(
  "/api/stripe/webhook",
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        ENV.stripeWebhookSecret
      );
    } catch (err) {
      console.error("[Webhook] Signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      return res.json({
        verified: true
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
          const session = event.data.object;
          const userId = parseInt(session.metadata?.user_id || "0");
          const productKey = session.metadata?.product_key || "";
          if (!userId) {
            console.error("[Webhook] No user_id in metadata");
            break;
          }
          if (session.mode === "payment") {
            const paymentIntentId = session.payment_intent;
            const customerId = session.customer;
            await db.insert(purchases).values({
              userId,
              stripePaymentIntentId: paymentIntentId,
              productType: productKey || "detailed_report",
              status: "completed"
            });
            const plan = getMembershipPlan(productKey);
            if (plan) {
              const durationDays = getMembershipDuration(productKey);
              const existingSub = await db.select().from(subscriptions).where(eq7(subscriptions.userId, userId)).limit(1);
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
                  currentPeriodEnd: periodEnd
                }).where(eq7(subscriptions.userId, userId));
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
              console.log(`[Webhook] ${plan} membership activated for user ${userId}, expires: ${periodEnd.toISOString()}`);
            } else {
              console.log(`[Webhook] Purchase recorded for user ${userId}: ${productKey}`);
            }
          } else if (session.mode === "subscription") {
            const subscriptionId = session.subscription;
            const customerId = session.customer;
            const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
            let plan = "monthly";
            if (productKey === "QUARTERLY_MEMBERSHIP") {
              plan = "quarterly";
            } else if (productKey === "ANNUAL_MEMBERSHIP") {
              plan = "annual";
            }
            const existingSub = await db.select().from(subscriptions).where(eq7(subscriptions.userId, userId)).limit(1);
            const periodEnd = stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1e3) : /* @__PURE__ */ new Date();
            if (existingSub.length > 0) {
              await db.update(subscriptions).set({
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                status: "active",
                plan,
                currentPeriodEnd: periodEnd
              }).where(eq7(subscriptions.userId, userId));
            } else {
              await db.insert(subscriptions).values({
                userId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                status: "active",
                plan,
                currentPeriodEnd: periodEnd
              });
            }
            console.log(`[Webhook] Subscription created for user ${userId}`);
          }
          break;
        }
        case "customer.subscription.updated": {
          const subscription = event.data.object;
          const subscriptionId = subscription.id;
          const status = subscription.status;
          const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1e3) : /* @__PURE__ */ new Date();
          let dbStatus = "active";
          if (status === "canceled") {
            dbStatus = "canceled";
          } else if (status === "past_due") {
            dbStatus = "past_due";
          }
          await db.update(subscriptions).set({
            status: dbStatus,
            currentPeriodEnd: periodEnd
          }).where(eq7(subscriptions.stripeSubscriptionId, subscriptionId));
          console.log(`[Webhook] Subscription ${subscriptionId} updated to ${status}`);
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          const subscriptionId = subscription.id;
          await db.update(subscriptions).set({ status: "canceled" }).where(eq7(subscriptions.stripeSubscriptionId, subscriptionId));
          console.log(`[Webhook] Subscription ${subscriptionId} canceled`);
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object;
          const subscriptionId = invoice.subscription;
          if (subscriptionId) {
            await db.update(subscriptions).set({ status: "past_due" }).where(eq7(subscriptions.stripeSubscriptionId, subscriptionId));
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

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    const host = process.env.HOST || "0.0.0.0";
    server.listen(port, host, () => {
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
  const app = express2();
  const server = createServer(app);
  app.use("/api/stripe/webhook", express2.raw({ type: "application/json" }));
  app.use(webhookRouter);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    startDailyNotificationCron();
  });
}
startServer().catch(console.error);
