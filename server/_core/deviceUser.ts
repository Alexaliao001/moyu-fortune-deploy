/**
 * Device-first identity for GH Pages → Render (no cross-site cookie).
 * openId = guest_<deviceId> — same mapping as light/pgAlias.
 */
import { eq, sql } from "drizzle-orm";
import { fortuneHistory, users, type User } from "../../drizzle/schema";
import * as db from "../db";
import { guestOpenId } from "./guestAuth";

function inviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/** Local calendar day in Asia/Shanghai (YYYY-MM-DD) — product TZ. */
export function shanghaiTodayKey(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function normalizeDeviceId(raw: unknown): string {
  const id = String(raw || "").trim().slice(0, 80);
  if (!id || id.length < 8) return "";
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(id)) return "";
  return id;
}

export function deviceIdFromReq(
  req: { headers: Record<string, unknown> },
  bodyDeviceId?: unknown
): string {
  const header = req.headers["x-device-id"];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  return (
    normalizeDeviceId(bodyDeviceId) ||
    normalizeDeviceId(fromHeader)
  );
}

export async function ensureGuestUser(
  deviceId: string,
  name?: string
): Promise<User> {
  const id = normalizeDeviceId(deviceId);
  if (!id) throw new Error("deviceId required");
  const openId = guestOpenId(id);
  await db.upsertUser({
    openId,
    name: (name || "摸鱼达人").slice(0, 32),
    loginMethod: "guest",
    lastSignedIn: new Date(),
  });
  let user = await db.getUserByOpenId(openId);
  if (!user) throw new Error("failed to resolve guest user");

  if (!user.inviteCode) {
    const database = await db.getDb();
    if (database) {
      let code = inviteCode();
      for (let i = 0; i < 8; i++) {
        const clash = await database
          .select()
          .from(users)
          .where(eq(users.inviteCode, code))
          .limit(1);
        if (clash.length === 0) break;
        code = inviteCode();
      }
      await database
        .update(users)
        .set({ inviteCode: code, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      user = (await db.getUserByOpenId(openId))!;
    }
  }
  return user;
}

/** Prefer cookie user; else resolve/create by deviceId. */
export async function resolveWriteUser(opts: {
  cookieUser: User | null;
  deviceId?: string;
  name?: string;
}): Promise<User | null> {
  if (opts.cookieUser) return opts.cookieUser;
  const id = normalizeDeviceId(opts.deviceId);
  if (!id) return null;
  return ensureGuestUser(id, opts.name);
}

export async function upsertDailyDraw(opts: {
  userId: number;
  date: string;
  level: string;
  emoji: string;
  percent: number;
  message?: string;
  suggestedTime?: string;
  avatar?: string;
}): Promise<{ ok: true; upserted: "insert" | "update" }> {
  const database = await db.getDb();
  if (!database) return { ok: true, upserted: "insert" };

  const day = /^\d{4}-\d{2}-\d{2}$/.test(opts.date)
    ? opts.date
    : shanghaiTodayKey();

  // Match logical draw day (client todayKey / Shanghai). Compare both
  // server-date cast and Shanghai wall-date for UTC Render hosts.
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
  const rows = Array.isArray(existing)
    ? existing
    : ((existing as { rows?: unknown })?.rows as unknown[]) || [];
  const existingId = rows[0]
    ? Number((rows[0] as { id?: number }).id)
    : null;

  if (existingId) {
    await database
      .update(fortuneHistory)
      .set({
        level: opts.level,
        emoji: opts.emoji,
        percent: opts.percent,
        message: opts.message || null,
        suggestedTime: opts.suggestedTime || null,
        avatar: opts.avatar || null,
      })
      .where(eq(fortuneHistory.id, existingId));
    return { ok: true, upserted: "update" };
  }

  await database.insert(fortuneHistory).values({
    userId: opts.userId,
    level: opts.level,
    emoji: opts.emoji,
    percent: opts.percent,
    message: opts.message || null,
    suggestedTime: opts.suggestedTime || null,
    avatar: opts.avatar || null,
  });
  return { ok: true, upserted: "insert" };
}
