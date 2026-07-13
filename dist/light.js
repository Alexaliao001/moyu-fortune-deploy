// server/light/entry.ts
import express from "express";
import { createServer } from "http";

// server/light/store.ts
import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
var DATA_DIR = process.env.MOYU_DATA_DIR || path.join(process.cwd(), "data");
var DATA_FILE = path.join(DATA_DIR, "moyu-light.json");
var MAX_DRAWS = 5e3;
var MAX_FEEDBACK = 2e3;
var INVITE_REWARD_DAYS = 3;
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
async function tursoExec(sql, args = []) {
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
            sql,
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
    const text = await res.text().catch(() => "");
    throw new Error(`turso_http_${res.status}:${text.slice(0, 120)}`);
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
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
}
function inviteCodeFor(deviceId) {
  const hash = createHash("sha256").update(`moyu-invite:${deviceId}`).digest("hex");
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
    rewardDays: INVITE_REWARD_DAYS,
    rewardClaimed: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  s.inviteUses.unshift(use);
  upsertProfile(inviteeDeviceId, inviteeName);
  persist();
  return {
    inviterName: inviterProfile?.name || "\u6478\u9C7C\u8FBE\u4EBA",
    rewardDays: INVITE_REWARD_DAYS,
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
function registerLightApi(app2) {
  app2.use(cors);
  app2.use(async (_req, _res, next) => {
    try {
      await ensureStoreReady();
      next();
    } catch (e) {
      next(e);
    }
  });
  app2.get("/health", (_req, res) => {
    res.json(lightHealth());
  });
  app2.get("/api/light/health", (_req, res) => {
    res.json(lightHealth());
  });
  app2.post("/api/light/draw", rateLimit(6e4, 40), (req, res) => {
    try {
      const body = req.body || {};
      const draw = recordDraw({
        deviceId: deviceIdOf(req, body),
        name: String(body.name || req.headers["x-device-name"] || ""),
        level: String(body.level || ""),
        emoji: String(body.emoji || ""),
        percent: Number(body.percent),
        message: body.message != null ? String(body.message) : void 0,
        suggestedTime: body.suggestedTime != null ? String(body.suggestedTime) : void 0,
        avatar: body.avatar != null ? String(body.avatar) : void 0
      });
      res.json({ ok: true, draw });
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: e instanceof Error ? e.message : "bad_request"
      });
    }
  });
  app2.get("/api/light/history", (req, res) => {
    const deviceId = deviceIdOf(req);
    const limit = Number(req.query.limit || 30);
    const history = getHistory(deviceId, limit);
    res.json({ ok: true, history });
  });
  app2.get("/api/light/leaderboard", (req, res) => {
    const limit = Number(req.query.limit || 30);
    const board = getLeaderboard(limit);
    res.json({ ok: true, ...board });
  });
  app2.post("/api/light/feedback", rateLimit(6e4, 20), (req, res) => {
    try {
      const body = req.body || {};
      const item = submitFeedback({
        deviceId: deviceIdOf(req, body),
        type: body.type != null ? String(body.type) : void 0,
        content: String(body.content || ""),
        contact: body.contact != null ? String(body.contact) : void 0,
        userAgent: body.userAgent != null ? String(body.userAgent) : String(req.headers["user-agent"] || "")
      });
      res.json({ ok: true, feedback: item });
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: e instanceof Error ? e.message : "bad_request"
      });
    }
  });
  app2.get("/api/light/feedback", (req, res) => {
    const limit = Number(req.query.limit || 50);
    res.json({ ok: true, feedback: listFeedback(limit) });
  });
  app2.get("/api/light/invite", (req, res) => {
    try {
      const deviceId = deviceIdOf(req);
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
  app2.post("/api/light/invite", rateLimit(6e4, 30), (req, res) => {
    try {
      const body = req.body || {};
      const action = String(body.action || "apply");
      const deviceId = deviceIdOf(req, body);
      if (action === "claim") {
        const result2 = claimInviteReward({
          deviceId,
          invitationId: String(body.invitationId || "")
        });
        res.json({ ok: true, ...result2 });
        return;
      }
      if (action === "ensure") {
        const invite = getOrCreateInvite(deviceId);
        const stats = getInviteStats(deviceId);
        res.json({ ok: true, ...invite, ...stats });
        return;
      }
      const result = applyInviteCode({
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
  app2.get("/api/light/profile", (req, res) => {
    try {
      const deviceId = deviceIdOf(req);
      res.json({ ok: true, profile: getProfile(deviceId) });
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: e instanceof Error ? e.message : "bad_request"
      });
    }
  });
  app2.post("/api/light/profile", rateLimit(6e4, 30), (req, res) => {
    try {
      const body = req.body || {};
      const profile = updateProfile({
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

// server/light/entry.ts
var app = express();
app.use(express.json({ limit: "256kb" }));
registerLightApi(app);
var STATUS_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>\u6478\u4E86\u4E48 \xB7 moyu-light</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&family=Noto+Sans+SC:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
:root{
  --bg0:#1a0f08;--bg1:#2a1810;--copper:#e67a2e;--gold:#ffb32c;--glass:rgba(255,255,255,0.06);
  --line:rgba(255,180,50,0.22);--text:#fff8f0;--muted:rgba(255,248,240,0.55);
}
*{box-sizing:border-box}
body{
  margin:0;min-height:100vh;color:var(--text);
  font-family:"Noto Sans SC",system-ui,sans-serif;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(255,140,40,0.28), transparent 55%),
    radial-gradient(900px 500px at 90% 0%, rgba(255,200,80,0.16), transparent 50%),
    linear-gradient(165deg,var(--bg0),var(--bg1) 55%,#120b07);
}
.wrap{max-width:42rem;margin:0 auto;padding:2.5rem 1.25rem 3rem}
.brand{
  font-family:"ZCOOL KuaiLe","Noto Sans SC",sans-serif;
  font-size:clamp(2rem,6vw,2.75rem);letter-spacing:0.04em;
  background:linear-gradient(135deg,var(--gold),var(--copper));
  -webkit-background-clip:text;background-clip:text;color:transparent;
  margin:0 0 .35rem;
}
.sub{color:var(--muted);margin:0 0 1.5rem;line-height:1.6;font-size:.95rem}
.card{
  background:var(--glass);border:1px solid var(--line);border-radius:1.25rem;
  padding:1.15rem 1.25rem;backdrop-filter:blur(16px);
  box-shadow:0 12px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06);
}
.ok{display:inline-flex;align-items:center;gap:.5rem;font-weight:700;color:#6ee7a8;margin:0 0 .75rem}
.ok i{width:.55rem;height:.55rem;border-radius:50%;background:#34d399;box-shadow:0 0 12px #34d399;display:inline-block}
ul{list-style:none;padding:0;margin:1rem 0 0;display:grid;gap:.55rem}
li{
  display:flex;justify-content:space-between;gap:1rem;align-items:center;
  padding:.7rem .85rem;border-radius:.85rem;background:rgba(0,0,0,0.22);
  border:1px solid rgba(255,255,255,0.06);font-size:.88rem
}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#ffd089;font-size:.82rem}
a{color:var(--gold);text-decoration:none}
a:hover{text-decoration:underline}
.cta{
  display:inline-block;margin-top:1.25rem;padding:.85rem 1.2rem;border-radius:999px;
  background:linear-gradient(135deg,var(--gold),var(--copper));color:#1a0800;font-weight:700;
  box-shadow:0 8px 28px rgba(230,122,46,0.35)
}
.note{margin-top:1rem;color:var(--muted);font-size:.8rem;line-height:1.5}
</style>
</head>
<body>
<main class="wrap">
  <h1 class="brand">\u6478\u4E86\u4E48</h1>
  <p class="sub">\u8F7B\u540E\u7AEF API \xB7 \u94DC\u6A59\u73BB\u7483\u540C\u6B3E\u72B6\u6001\u9875\u3002\u4EA7\u54C1\u7AD9\u5728
    <a href="https://chillworks.ai">chillworks.ai</a>\uFF0C\u8FD9\u91CC\u53EA\u63D0\u4F9B guest/deviceId \u4E91\u7AEF\u540C\u6B65\u3002</p>
  <section class="card">
    <p class="ok"><i></i>moyu-light \xB7 online</p>
    <ul>
      <li><span>\u5065\u5EB7\u68C0\u67E5</span><a href="/health"><code>/health</code></a></li>
      <li><span>\u62BD\u7B7E\u540C\u6B65</span><code>POST /api/light/draw</code></li>
      <li><span>\u5386\u53F2</span><code>GET /api/light/history</code></li>
      <li><span>\u6392\u884C\u699C</span><code>GET /api/light/leaderboard</code></li>
      <li><span>\u53CD\u9988</span><code>POST /api/light/feedback</code></li>
      <li><span>\u9080\u8BF7</span><code>GET/POST /api/light/invite</code></li>
      <li><span>\u6863\u6848</span><code>GET/POST /api/light/profile</code></li>
    </ul>
    <a class="cta" href="https://chillworks.ai">\u6253\u5F00 chillworks.ai \u2192</a>
    <p class="note">Render Free \u4F11\u7720\u540E\u9996\u6B21\u8BF7\u6C42\u53EF\u80FD\u8981\u7B49 30\u201360 \u79D2\u3002\u53EF\u9009 <code>LIBSQL_URL</code> + <code>LIBSQL_AUTH_TOKEN</code> \u5F00\u542F Turso \u6301\u4E45\u5316\u3002</p>
  </section>
</main>
</body>
</html>`;
app.get("/", (_req, res) => {
  res.type("html").send(STATUS_HTML);
});
var port = Number(process.env.PORT || 3e3);
var host = process.env.HOST || "0.0.0.0";
ensureStoreReady().catch((err) => console.warn("[moyu-light] store ready warn", err)).finally(() => {
  createServer(app).listen(port, host, () => {
    console.log(`moyu-light listening on ${host}:${port}`);
  });
});
