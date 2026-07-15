/**
 * MoYu Path B — guest/deviceId product store.
 * Default: local JSON (Render Free ephemeral).
 * Optional: Turso/libSQL blob when LIBSQL_URL + LIBSQL_AUTH_TOKEN are set.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";

export type LightDraw = {
  id: string;
  deviceId: string;
  name: string;
  level: string;
  emoji: string;
  percent: number;
  message: string;
  suggestedTime: string;
  avatar: string;
  createdAt: string;
};

export type LightFeedback = {
  id: string;
  deviceId: string;
  type: "bug" | "feature" | "suggestion" | "other";
  content: string;
  contact: string;
  userAgent: string;
  createdAt: string;
};

export type LightInvite = {
  code: string;
  ownerDeviceId: string;
  createdAt: string;
};

export type LightInviteUse = {
  id: string;
  code: string;
  inviterDeviceId: string;
  inviteeDeviceId: string;
  inviteeName: string;
  rewardDays: number;
  rewardClaimed: boolean;
  createdAt: string;
};

export type LightProfile = {
  deviceId: string;
  name: string;
  avatar: string;
  updatedAt: string;
};

type StoreFile = {
  draws: LightDraw[];
  feedback: LightFeedback[];
  invites: LightInvite[];
  inviteUses: LightInviteUse[];
  profiles: LightProfile[];
};

const DATA_DIR = process.env.MOYU_DATA_DIR || path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "moyu-light.json");
const MAX_DRAWS = 5000;
const MAX_FEEDBACK = 2000;
const INVITE_REWARD_DAYS = 3;
const VERSION = "sx2b2-1.0";

const LIBSQL_URL = (process.env.LIBSQL_URL || process.env.DATABASE_URL || "").trim();
const LIBSQL_TOKEN = (process.env.LIBSQL_AUTH_TOKEN || "").trim();
const useRemote =
  Boolean(LIBSQL_URL) &&
  Boolean(LIBSQL_TOKEN) &&
  (LIBSQL_URL.startsWith("libsql://") ||
    LIBSQL_URL.startsWith("https://") ||
    LIBSQL_URL.startsWith("http://"));

function empty(): StoreFile {
  return {
    draws: [],
    feedback: [],
    invites: [],
    inviteUses: [],
    profiles: [],
  };
}

function normalize(raw: Partial<StoreFile> | null | undefined): StoreFile {
  const base = empty();
  if (!raw || typeof raw !== "object") return base;
  return {
    draws: Array.isArray(raw.draws) ? raw.draws : [],
    feedback: Array.isArray(raw.feedback) ? raw.feedback : [],
    invites: Array.isArray(raw.invites) ? raw.invites : [],
    inviteUses: Array.isArray(raw.inviteUses) ? raw.inviteUses : [],
    profiles: Array.isArray(raw.profiles) ? raw.profiles : [],
  };
}

function loadLocal(): StoreFile {
  try {
    if (!fs.existsSync(DATA_FILE)) return empty();
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return normalize(JSON.parse(raw) as Partial<StoreFile>);
  } catch {
    return empty();
  }
}

function saveLocal(data: StoreFile): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data), "utf8");
  fs.renameSync(tmp, DATA_FILE);
}

function httpUrlFromLibsql(url: string): string {
  if (url.startsWith("libsql://")) {
    return `https://${url.slice("libsql://".length)}`;
  }
  return url.replace(/\/$/, "");
}

async function tursoExec(sql: string, args: Array<string | number> = []) {
  const base = httpUrlFromLibsql(LIBSQL_URL);
  const res = await fetch(`${base}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LIBSQL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          type: "execute",
          stmt: {
            sql,
            args: args.map(a => ({
              type: typeof a === "number" ? "integer" : "text",
              value: String(a),
            })),
          },
        },
        { type: "close" },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`turso_http_${res.status}:${text.slice(0, 120)}`);
  }
  return (await res.json()) as {
    results?: Array<{
      type?: string;
      response?: {
        result?: { rows?: Array<Array<{ type?: string; value?: string }>> };
      };
    }>;
  };
}

async function ensureRemoteSchema(): Promise<void> {
  await tursoExec(
    "CREATE TABLE IF NOT EXISTS moyu_light_blob (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at TEXT NOT NULL)"
  );
}

async function loadRemote(): Promise<StoreFile | null> {
  try {
    await ensureRemoteSchema();
    const out = await tursoExec("SELECT payload FROM moyu_light_blob WHERE id = 1");
    const row = out.results?.[0]?.response?.result?.rows?.[0]?.[0];
    const payload = row?.value;
    if (!payload) return null;
    return normalize(JSON.parse(payload) as Partial<StoreFile>);
  } catch (e) {
    console.warn("[moyu-light] remote load failed, using local", e);
    return null;
  }
}

async function saveRemote(data: StoreFile): Promise<void> {
  try {
    await ensureRemoteSchema();
    const payload = JSON.stringify(data);
    const now = new Date().toISOString();
    await tursoExec(
      "INSERT INTO moyu_light_blob (id, payload, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at",
      [payload, now]
    );
  } catch (e) {
    console.warn("[moyu-light] remote save failed", e);
  }
}

let cache: StoreFile | null = null;
let ready: Promise<void> | null = null;
let remoteOk = false;

export function ensureStoreReady(): Promise<void> {
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

function getStore(): StoreFile {
  if (!cache) cache = loadLocal();
  return cache;
}

function persist(): void {
  if (!cache) return;
  saveLocal(cache);
  if (useRemote) {
    void saveRemote(cache);
  }
}

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
}

function inviteCodeFor(deviceId: string): string {
  const hash = createHash("sha256").update(`moyu-invite:${deviceId}`).digest("hex");
  return hash.slice(0, 8).toUpperCase();
}

function upsertProfile(deviceId: string, name?: string, avatar?: string): void {
  const s = getStore();
  const existing = s.profiles.find(p => p.deviceId === deviceId);
  const nextName = String(name || existing?.name || "摸鱼达人").slice(0, 32);
  const nextAvatar = String(avatar || existing?.avatar || "").slice(0, 64);
  const updatedAt = new Date().toISOString();
  if (existing) {
    existing.name = nextName;
    existing.avatar = nextAvatar;
    existing.updatedAt = updatedAt;
  } else {
    s.profiles.push({ deviceId, name: nextName, avatar: nextAvatar, updatedAt });
  }
}

function deviceStreak(deviceId: string): { streak: number; lastDate: string; totalDraws: number } {
  const list = getStore().draws.filter(d => d.deviceId === deviceId);
  const days = new Set(list.map(d => d.createdAt.slice(0, 10)));
  const lastDate = Array.from(days).sort().reverse()[0] || "";
  if (!lastDate) return { streak: 0, lastDate: "", totalDraws: list.length };
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (lastDate !== today && lastDate !== yesterday) {
    return { streak: 0, lastDate, totalDraws: list.length };
  }
  let streak = 0;
  let cursor = new Date(`${lastDate}T12:00:00Z`);
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
    if (streak > 365) break;
  }
  return { streak, lastDate, totalDraws: list.length };
}

export function lightHealth() {
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
    note: remoteOk
      ? "Turso blob persistence enabled; GH Pages frontend on chillworks.ai"
      : "Render Free disk is ephemeral unless LIBSQL_URL+LIBSQL_AUTH_TOKEN set; frontend on chillworks.ai",
  };
}

export function recordDraw(input: {
  deviceId: string;
  name?: string;
  level: string;
  emoji: string;
  percent: number;
  message?: string;
  suggestedTime?: string;
  avatar?: string;
}): LightDraw {
  const deviceId = String(input.deviceId || "").slice(0, 80);
  if (!deviceId) throw new Error("deviceId required");
  const draw: LightDraw = {
    id: id("d"),
    deviceId,
    name: String(input.name || "摸鱼达人").slice(0, 32),
    level: String(input.level || "小吉").slice(0, 8),
    emoji: String(input.emoji || "🐟").slice(0, 8),
    percent: Math.max(0, Math.min(100, Number(input.percent) || 0)),
    message: String(input.message || "").slice(0, 240),
    suggestedTime: String(input.suggestedTime || "").slice(0, 32),
    avatar: String(input.avatar || "").slice(0, 64),
    createdAt: new Date().toISOString(),
  };
  const s = getStore();
  s.draws.unshift(draw);
  if (s.draws.length > MAX_DRAWS) s.draws.length = MAX_DRAWS;
  upsertProfile(deviceId, draw.name, draw.avatar);
  persist();
  return draw;
}

export function getHistory(deviceId: string, limit = 30): LightDraw[] {
  const idKey = String(deviceId || "").slice(0, 80);
  if (!idKey) return [];
  const lim = Math.max(1, Math.min(100, limit));
  return getStore().draws.filter(d => d.deviceId === idKey).slice(0, lim);
}

export function getLeaderboard(limit = 30): {
  streak: Array<{
    rank: number;
    deviceId: string;
    name: string;
    streak: number;
    lastDate: string;
  }>;
  weekly: Array<{
    rank: number;
    deviceId: string;
    name: string;
    bestPercent: number;
    level: string;
    emoji: string;
  }>;
  global: { totalDraws: number; uniqueDevices: number };
} {
  const lim = Math.max(1, Math.min(50, limit));
  const draws = getStore().draws;

  const byDevice = new Map<string, LightDraw[]>();
  for (const d of draws) {
    const list = byDevice.get(d.deviceId) || [];
    list.push(d);
    byDevice.set(d.deviceId, list);
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const streakRows: Array<{
    deviceId: string;
    name: string;
    streak: number;
    lastDate: string;
  }> = [];

  for (const [deviceId, list] of Array.from(byDevice.entries())) {
    const days = new Set(list.map((d: LightDraw) => d.createdAt.slice(0, 10)));
    const lastDate = Array.from(days).sort().reverse()[0] || "";
    if (lastDate !== today && lastDate !== yesterday) continue;
    let streak = 0;
    let cursor = new Date(`${lastDate}T12:00:00Z`);
    for (;;) {
      const key = cursor.toISOString().slice(0, 10);
      if (!days.has(key)) break;
      streak += 1;
      cursor = new Date(cursor.getTime() - 86400000);
      if (streak > 365) break;
    }
    streakRows.push({
      deviceId,
      name: list[0]?.name || "摸鱼达人",
      streak,
      lastDate,
    });
  }
  streakRows.sort((a, b) => b.streak - a.streak || b.lastDate.localeCompare(a.lastDate));

  const weekAgo = Date.now() - 7 * 86400000;
  const weeklyBest = new Map<
    string,
    { deviceId: string; name: string; bestPercent: number; level: string; emoji: string }
  >();
  for (const d of draws) {
    if (new Date(d.createdAt).getTime() < weekAgo) continue;
    const prev = weeklyBest.get(d.deviceId);
    if (!prev || d.percent > prev.bestPercent) {
      weeklyBest.set(d.deviceId, {
        deviceId: d.deviceId,
        name: d.name,
        bestPercent: d.percent,
        level: d.level,
        emoji: d.emoji,
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
      uniqueDevices: byDevice.size,
    },
  };
}

export function submitFeedback(input: {
  deviceId?: string;
  type?: string;
  content: string;
  contact?: string;
  userAgent?: string;
}): LightFeedback {
  const content = String(input.content || "").trim().slice(0, 1000);
  if (!content) throw new Error("content required");
  const typeRaw = String(input.type || "suggestion");
  const type = (["bug", "feature", "suggestion", "other"].includes(typeRaw)
    ? typeRaw
    : "other") as LightFeedback["type"];
  const item: LightFeedback = {
    id: id("fb"),
    deviceId: String(input.deviceId || "").slice(0, 80),
    type,
    content,
    contact: String(input.contact || "").slice(0, 255),
    userAgent: String(input.userAgent || "").slice(0, 240),
    createdAt: new Date().toISOString(),
  };
  const s = getStore();
  s.feedback.unshift(item);
  if (s.feedback.length > MAX_FEEDBACK) s.feedback.length = MAX_FEEDBACK;
  persist();
  return item;
}

export function listFeedback(limit = 50): LightFeedback[] {
  const lim = Math.max(1, Math.min(200, limit));
  return getStore().feedback.slice(0, lim);
}

export function getOrCreateInvite(deviceId: string): {
  inviteCode: string;
  ownerDeviceId: string;
  createdAt: string;
} {
  const idKey = String(deviceId || "").slice(0, 80);
  if (!idKey) throw new Error("deviceId required");
  const s = getStore();
  let row = s.invites.find(i => i.ownerDeviceId === idKey);
  if (!row) {
    let code = inviteCodeFor(idKey);
    // collision rare; bump until unique
    let n = 0;
    while (s.invites.some(i => i.code === code && i.ownerDeviceId !== idKey) && n < 5) {
      code = inviteCodeFor(`${idKey}:${n++}`);
    }
    row = { code, ownerDeviceId: idKey, createdAt: new Date().toISOString() };
    s.invites.push(row);
    persist();
  }
  return {
    inviteCode: row.code,
    ownerDeviceId: row.ownerDeviceId,
    createdAt: row.createdAt,
  };
}

export function getInviteStats(deviceId: string): {
  totalInvites: number;
  claimedRewards: number;
  pendingRewards: number;
  inviteList: Array<{
    id: string;
    inviteeName: string;
    rewardDays: number;
    rewardClaimed: boolean;
    createdAt: string;
  }>;
} {
  const idKey = String(deviceId || "").slice(0, 80);
  const mine = getStore().inviteUses.filter(u => u.inviterDeviceId === idKey);
  const claimedRewards = mine
    .filter(u => u.rewardClaimed)
    .reduce((sum, u) => sum + u.rewardDays, 0);
  const pendingRewards = mine
    .filter(u => !u.rewardClaimed)
    .reduce((sum, u) => sum + u.rewardDays, 0);
  return {
    totalInvites: mine.length,
    claimedRewards,
    pendingRewards,
    inviteList: mine.map(u => ({
      id: u.id,
      inviteeName: u.inviteeName,
      rewardDays: u.rewardDays,
      rewardClaimed: u.rewardClaimed,
      createdAt: u.createdAt,
    })),
  };
}

export function applyInviteCode(input: {
  deviceId: string;
  inviteCode: string;
  name?: string;
}): { inviterName: string; rewardDays: number; invitationId: string } {
  const inviteeDeviceId = String(input.deviceId || "").slice(0, 80);
  const code = String(input.inviteCode || "")
    .trim()
    .toUpperCase()
    .slice(0, 8);
  if (!inviteeDeviceId) throw new Error("deviceId required");
  if (code.length !== 8) throw new Error("invalid invite code");

  const s = getStore();
  const invite = s.invites.find(i => i.code === code);
  if (!invite) throw new Error("invite code not found");
  if (invite.ownerDeviceId === inviteeDeviceId) {
    throw new Error("cannot use your own invite code");
  }
  if (s.inviteUses.some(u => u.inviteeDeviceId === inviteeDeviceId)) {
    throw new Error("invite already applied");
  }

  const inviterProfile = s.profiles.find(p => p.deviceId === invite.ownerDeviceId);
  const inviteeName = String(input.name || "摸鱼达人").slice(0, 32);
  const use: LightInviteUse = {
    id: id("inv"),
    code,
    inviterDeviceId: invite.ownerDeviceId,
    inviteeDeviceId,
    inviteeName,
    rewardDays: INVITE_REWARD_DAYS,
    rewardClaimed: false,
    createdAt: new Date().toISOString(),
  };
  s.inviteUses.unshift(use);
  upsertProfile(inviteeDeviceId, inviteeName);
  persist();
  return {
    inviterName: inviterProfile?.name || "摸鱼达人",
    rewardDays: INVITE_REWARD_DAYS,
    invitationId: use.id,
  };
}

export function claimInviteReward(input: {
  deviceId: string;
  invitationId: string;
}): { rewardDays: number } {
  const deviceId = String(input.deviceId || "").slice(0, 80);
  const invitationId = String(input.invitationId || "").slice(0, 64);
  if (!deviceId || !invitationId) throw new Error("deviceId and invitationId required");
  const s = getStore();
  const row = s.inviteUses.find(u => u.id === invitationId);
  if (!row || row.inviterDeviceId !== deviceId) throw new Error("invitation not found");
  if (row.rewardClaimed) throw new Error("reward already claimed");
  row.rewardClaimed = true;
  persist();
  // Ledger only — no Stripe membership grant on Path B
  return { rewardDays: row.rewardDays };
}

export function getProfile(deviceId: string): {
  deviceId: string;
  name: string;
  avatar: string;
  streak: number;
  lastDate: string;
  totalDraws: number;
  inviteCode: string | null;
} {
  const idKey = String(deviceId || "").slice(0, 80);
  if (!idKey) throw new Error("deviceId required");
  const s = getStore();
  const profile = s.profiles.find(p => p.deviceId === idKey);
  const streak = deviceStreak(idKey);
  const invite = s.invites.find(i => i.ownerDeviceId === idKey);
  return {
    deviceId: idKey,
    name: profile?.name || "摸鱼达人",
    avatar: profile?.avatar || "",
    streak: streak.streak,
    lastDate: streak.lastDate,
    totalDraws: streak.totalDraws,
    inviteCode: invite?.code || null,
  };
}

export function updateProfile(input: {
  deviceId: string;
  name?: string;
  avatar?: string;
}): ReturnType<typeof getProfile> {
  const deviceId = String(input.deviceId || "").slice(0, 80);
  if (!deviceId) throw new Error("deviceId required");
  upsertProfile(deviceId, input.name, input.avatar);
  persist();
  return getProfile(deviceId);
}
