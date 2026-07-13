// server/light/entry.ts
import express from "express";
import { createServer } from "http";

// server/light/store.ts
import fs from "node:fs";
import path from "node:path";
var DATA_DIR = process.env.MOYU_DATA_DIR || path.join(process.cwd(), "data");
var DATA_FILE = path.join(DATA_DIR, "moyu-light.json");
var MAX_DRAWS = 5e3;
function empty() {
  return { draws: [] };
}
function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) return empty();
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.draws)) return empty();
    return parsed;
  } catch {
    return empty();
  }
}
function save(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data), "utf8");
  fs.renameSync(tmp, DATA_FILE);
}
var cache = null;
function getStore() {
  if (!cache) cache = load();
  return cache;
}
function persist() {
  if (cache) save(cache);
}
function lightHealth() {
  const s = getStore();
  return {
    ok: true,
    service: "moyu-light",
    version: "sx2b-1.0",
    draws: s.draws.length,
    ephemeral: true,
    note: "Render Free disk is ephemeral; GH Pages frontend stays on chillworks.ai"
  };
}
function recordDraw(input) {
  const deviceId = String(input.deviceId || "").slice(0, 80);
  if (!deviceId) throw new Error("deviceId required");
  const draw = {
    id: `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
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
  persist();
  return draw;
}
function getHistory(deviceId, limit = 30) {
  const id = String(deviceId || "").slice(0, 80);
  if (!id) return [];
  const lim = Math.max(1, Math.min(100, limit));
  return getStore().draws.filter((d) => d.deviceId === id).slice(0, lim);
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
function registerLightApi(app2) {
  app2.use(cors);
  app2.get("/health", (_req, res) => {
    res.json(lightHealth());
  });
  app2.get("/api/light/health", (_req, res) => {
    res.json(lightHealth());
  });
  app2.post(
    "/api/light/draw",
    rateLimit(6e4, 40),
    (req, res) => {
      try {
        const body = req.body || {};
        const deviceId = body.deviceId || req.headers["x-device-id"] || "";
        const draw = recordDraw({
          deviceId: String(deviceId),
          name: body.name || req.headers["x-device-name"],
          level: body.level,
          emoji: body.emoji,
          percent: body.percent,
          message: body.message,
          suggestedTime: body.suggestedTime,
          avatar: body.avatar
        });
        res.json({ ok: true, draw });
      } catch (e) {
        res.status(400).json({
          ok: false,
          error: e instanceof Error ? e.message : "bad_request"
        });
      }
    }
  );
  app2.get("/api/light/history", (req, res) => {
    const deviceId = String(
      req.query.deviceId || req.headers["x-device-id"] || ""
    );
    const limit = Number(req.query.limit || 30);
    const history = getHistory(deviceId, limit);
    res.json({ ok: true, history });
  });
  app2.get("/api/light/leaderboard", (req, res) => {
    const limit = Number(req.query.limit || 30);
    const board = getLeaderboard(limit);
    res.json({ ok: true, ...board });
  });
}

// server/light/entry.ts
var app = express();
app.use(express.json({ limit: "256kb" }));
registerLightApi(app);
app.get("/", (_req, res) => {
  res.type("text").send("moyu-light ok \u2014 API at /api/light/* \xB7 frontend https://chillworks.ai");
});
var port = Number(process.env.PORT || 3e3);
var host = process.env.HOST || "0.0.0.0";
createServer(app).listen(port, host, () => {
  console.log(`moyu-light listening on ${host}:${port}`);
});
