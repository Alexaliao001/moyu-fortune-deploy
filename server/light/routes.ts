import type { Express, Request, Response, NextFunction } from "express";
import { adminTokenOk, requestToken } from "../_core/adminOverview";
import {
  ensureStoreReady,
  getHistory,
  getLeaderboard,
  getProfile,
  lightHealth,
  listFeedback,
  recordDraw,
  submitFeedback,
  updateProfile,
} from "./store";
import {
  getHistoryPg,
  getLeaderboardPg,
  getProfilePg,
  listFeedbackPg,
  pgAvailable,
  pgHealth,
  recordDrawPg,
  submitFeedbackPg,
  updateProfilePg,
} from "./pgAlias";

const ALLOWED_ORIGINS = new Set(
  (process.env.MOYU_CORS_ORIGINS ||
    "https://chillworks.ai,https://www.chillworks.ai,http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
);

function cors(req: Request, res: Response, next: NextFunction) {
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

function rateLimit(windowMs: number, max: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key =
      String(req.headers["x-device-id"] || "") ||
      req.ip ||
      req.socket.remoteAddress ||
      "anon";
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

function deviceIdOf(req: Request, body?: Record<string, unknown>): string {
  return String(
    (body && body.deviceId) ||
      req.query.deviceId ||
      req.headers["x-device-id"] ||
      ""
  );
}

async function usePostgres(): Promise<boolean> {
  // Prefer single-track Postgres whenever DATABASE_URL is wired (Path C).
  // JSON/Turso light store is only for MOYU_LIGHT_ONLY emergency mode.
  if (process.env.MOYU_LIGHT_ONLY === "1") return false;
  return pgAvailable();
}

/** Mount light REST under /api/light — thin alias of tRPC/Postgres when available. */
export function registerLightApi(app: Express) {
  app.use(cors);

  app.use(async (_req, _res, next) => {
    try {
      if (!(await usePostgres())) {
        await ensureStoreReady();
      }
      next();
    } catch (e) {
      next(e);
    }
  });

  app.get("/health", async (_req, res) => {
    res.json((await usePostgres()) ? pgHealth() : lightHealth());
  });

  app.get("/api/light/health", async (_req, res) => {
    res.json((await usePostgres()) ? pgHealth() : lightHealth());
  });

  app.post("/api/light/draw", rateLimit(60_000, 40), async (req, res) => {
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const payload = {
        deviceId: deviceIdOf(req, body),
        name: String(body.name || req.headers["x-device-name"] || ""),
        level: String(body.level || ""),
        emoji: String(body.emoji || ""),
        percent: Number(body.percent),
        message: body.message != null ? String(body.message) : undefined,
        suggestedTime:
          body.suggestedTime != null ? String(body.suggestedTime) : undefined,
        avatar: body.avatar != null ? String(body.avatar) : undefined,
      };
      const draw = (await usePostgres())
        ? await recordDrawPg(payload)
        : recordDraw(payload);
      res.json({ ok: true, draw });
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: e instanceof Error ? e.message : "bad_request",
      });
    }
  });

  app.get("/api/light/history", async (req, res) => {
    const deviceId = deviceIdOf(req);
    const limit = Number(req.query.limit || 30);
    const history = (await usePostgres())
      ? await getHistoryPg(deviceId, limit)
      : getHistory(deviceId, limit);
    res.json({ ok: true, history });
  });

  app.get("/api/light/leaderboard", async (req, res) => {
    const limit = Number(req.query.limit || 30);
    const board = (await usePostgres())
      ? await getLeaderboardPg(limit)
      : getLeaderboard(limit);
    res.json({ ok: true, ...board });
  });

  app.post("/api/light/feedback", rateLimit(60_000, 20), async (req, res) => {
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const payload = {
        deviceId: deviceIdOf(req, body),
        type: body.type != null ? String(body.type) : undefined,
        content: String(body.content || ""),
        contact: body.contact != null ? String(body.contact) : undefined,
        userAgent:
          body.userAgent != null
            ? String(body.userAgent)
            : String(req.headers["user-agent"] || ""),
      };
      const item = (await usePostgres())
        ? await submitFeedbackPg(payload)
        : submitFeedback(payload);
      res.json({ ok: true, feedback: item });
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: e instanceof Error ? e.message : "bad_request",
      });
    }
  });

  // Feedback rows contain user contact info — owner-token only, never public.
  app.get("/api/light/feedback", async (req, res) => {
    if (!adminTokenOk(requestToken(req))) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    const limit = Number(req.query.limit || 50);
    const list = (await usePostgres())
      ? await listFeedbackPg(limit)
      : listFeedback(limit);
    res.json({ ok: true, feedback: list });
  });

  app.get("/api/light/profile", async (req, res) => {
    try {
      const deviceId = deviceIdOf(req);
      const profile = (await usePostgres())
        ? await getProfilePg(deviceId)
        : getProfile(deviceId);
      res.json({ ok: true, profile });
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: e instanceof Error ? e.message : "bad_request",
      });
    }
  });

  app.post("/api/light/profile", rateLimit(60_000, 30), async (req, res) => {
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const profile = (await usePostgres())
        ? await updateProfilePg({
            deviceId: deviceIdOf(req, body),
            name: body.name != null ? String(body.name) : undefined,
            avatar: body.avatar != null ? String(body.avatar) : undefined,
          })
        : updateProfile({
            deviceId: deviceIdOf(req, body),
            name: body.name != null ? String(body.name) : undefined,
            avatar: body.avatar != null ? String(body.avatar) : undefined,
          });
      res.json({ ok: true, profile });
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: e instanceof Error ? e.message : "bad_request",
      });
    }
  });
}
