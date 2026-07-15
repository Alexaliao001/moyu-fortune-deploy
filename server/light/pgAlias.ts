/**
 * Path C thin alias — light REST ↔ same Postgres tables as tRPC.
 * deviceId → users.openId = guest_<deviceId> (guestOpenId).
 */
import { and, desc, eq, sql } from "drizzle-orm";
import {
  feedback,
  fortuneHistory,
  invitations,
  users,
} from "../../drizzle/schema";
import * as db from "../db";
import { guestOpenId } from "../_core/guestAuth";
import {
  ensureGuestUser,
  shanghaiTodayKey,
  upsertDailyDraw,
} from "../_core/deviceUser";
import type { LightDraw, LightFeedback, LightProfile } from "./store";

function asRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const nested = (result as { rows?: unknown })?.rows;
  if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  return [];
}

export async function pgAvailable(): Promise<boolean> {
  const database = await db.getDb();
  return Boolean(database);
}

export function pgHealth() {
  return {
    ok: true,
    service: "moyu-fortune",
    version: "path-c-1.0",
    persistence: "postgres",
    note: "light REST is a thin Postgres alias of tRPC (single track)",
  };
}

export async function recordDrawPg(input: {
  deviceId: string;
  name?: string;
  level: string;
  emoji: string;
  percent: number;
  message?: string;
  suggestedTime?: string;
  avatar?: string;
}): Promise<LightDraw> {
  const deviceId = String(input.deviceId || "").slice(0, 80);
  if (!deviceId) throw new Error("deviceId required");
  const user = await ensureGuestUser(deviceId, input.name);
  if (!(await db.getDb())) throw new Error("database unavailable");

  const level = String(input.level || "小吉").slice(0, 8);
  const emoji = String(input.emoji || "🐟").slice(0, 8);
  const percent = Math.max(0, Math.min(100, Number(input.percent) || 0));
  const message = String(input.message || "").slice(0, 240);
  const suggestedTime = String(input.suggestedTime || "").slice(0, 32);
  const avatar = String(input.avatar || "").slice(0, 64);
  const date = shanghaiTodayKey();

  await upsertDailyDraw({
    userId: user.id,
    date,
    level,
    emoji,
    percent,
    message,
    suggestedTime,
    avatar,
  });

  return {
    id: `${user.id}-${date}`,
    deviceId,
    name: user.name || "摸鱼达人",
    level,
    emoji,
    percent,
    message,
    suggestedTime,
    avatar,
    createdAt: new Date().toISOString(),
  };
}

export async function getHistoryPg(
  deviceId: string,
  limit = 30
): Promise<LightDraw[]> {
  const idKey = String(deviceId || "").slice(0, 80);
  if (!idKey) return [];
  const user = await db.getUserByOpenId(guestOpenId(idKey));
  if (!user) return [];
  const database = await db.getDb();
  if (!database) return [];
  const lim = Math.max(1, Math.min(100, limit));
  const rows = await database
    .select()
    .from(fortuneHistory)
    .where(eq(fortuneHistory.userId, user.id))
    .orderBy(desc(fortuneHistory.createdAt))
    .limit(lim);
  return rows.map(r => ({
    id: String(r.id),
    deviceId: idKey,
    name: user.name || "摸鱼达人",
    level: r.level,
    emoji: r.emoji,
    percent: r.percent,
    message: r.message || "",
    suggestedTime: r.suggestedTime || "",
    avatar: r.avatar || "",
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getLeaderboardPg(limit = 30): Promise<{
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
}> {
  const database = await db.getDb();
  if (!database) {
    return { streak: [], weekly: [], global: { totalDraws: 0, uniqueDevices: 0 } };
  }
  const lim = Math.max(1, Math.min(50, limit));

  const streakResult = await database.execute(sql`
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

  const streak = asRows(streakResult).map((row, index) => {
    const openId = String(row.openId || "");
    const deviceId = openId.startsWith("guest_") ? openId.slice(6) : openId;
    return {
      rank: index + 1,
      deviceId,
      name: (row.name as string) || "摸鱼达人",
      streak: Number(row.streak),
      lastDate: String(row.lastDate || "").slice(0, 10),
    };
  });

  const weeklyResult = await database.execute(sql`
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

  const weekly = asRows(weeklyResult)
    .sort((a, b) => Number(b.bestPercent) - Number(a.bestPercent))
    .slice(0, lim)
    .map((row, index) => {
      const openId = String(row.openId || "");
      const deviceId = openId.startsWith("guest_") ? openId.slice(6) : openId;
      return {
        rank: index + 1,
        deviceId,
        name: (row.name as string) || "摸鱼达人",
        bestPercent: Number(row.bestPercent),
        level: String(row.level || ""),
        emoji: String(row.emoji || ""),
      };
    });

  const globalResult = await database.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM fortune_history) AS "totalDraws",
      (SELECT COUNT(DISTINCT "userId")::int FROM fortune_history) AS "uniqueDevices"
  `);
  const g = asRows(globalResult)[0] || {};

  return {
    streak,
    weekly,
    global: {
      totalDraws: Number(g.totalDraws || 0),
      uniqueDevices: Number(g.uniqueDevices || 0),
    },
  };
}

export async function submitFeedbackPg(input: {
  deviceId?: string;
  type?: string;
  content: string;
  contact?: string;
  userAgent?: string;
}): Promise<LightFeedback> {
  const content = String(input.content || "").trim().slice(0, 1000);
  if (!content) throw new Error("content required");
  const typeRaw = String(input.type || "suggestion");
  const type = (
    ["bug", "feature", "suggestion", "other"].includes(typeRaw)
      ? typeRaw
      : "other"
  ) as LightFeedback["type"];

  let userId: number | null = null;
  const deviceId = String(input.deviceId || "").slice(0, 80);
  if (deviceId) {
    const user = await ensureGuestUser(deviceId);
    userId = user.id;
  }

  const database = await db.getDb();
  if (!database) throw new Error("database unavailable");

  const inserted = await database
    .insert(feedback)
    .values({
      userId,
      type,
      content,
      contact: String(input.contact || "").slice(0, 255) || null,
      userAgent: String(input.userAgent || "").slice(0, 500) || null,
    })
    .returning();

  const row = inserted[0];
  return {
    id: String(row?.id ?? ""),
    deviceId,
    type,
    content,
    contact: String(input.contact || ""),
    userAgent: String(input.userAgent || ""),
    createdAt: (row?.createdAt || new Date()).toISOString(),
  };
}

export async function listFeedbackPg(limit = 50): Promise<LightFeedback[]> {
  const database = await db.getDb();
  if (!database) return [];
  const lim = Math.max(1, Math.min(100, limit));
  const rows = await database
    .select()
    .from(feedback)
    .orderBy(desc(feedback.createdAt))
    .limit(lim);
  return rows.map(r => ({
    id: String(r.id),
    deviceId: "",
    type: r.type as LightFeedback["type"],
    content: r.content,
    contact: r.contact || "",
    userAgent: r.userAgent || "",
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getOrCreateInvitePg(deviceId: string) {
  const user = await ensureGuestUser(deviceId);
  return {
    code: user.inviteCode || "",
    ownerDeviceId: deviceId,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function getInviteStatsPg(deviceId: string) {
  const user = await db.getUserByOpenId(guestOpenId(deviceId));
  if (!user) {
    return { inviteCount: 0, claimedRewards: 0, pendingRewards: 0, uses: [] as unknown[] };
  }
  const database = await db.getDb();
  if (!database) {
    return { inviteCount: 0, claimedRewards: 0, pendingRewards: 0, uses: [] as unknown[] };
  }
  const rows = await database
    .select()
    .from(invitations)
    .where(eq(invitations.inviterId, user.id));
  const claimed = rows.filter(r => r.rewardClaimed).length;
  const pending = rows.filter(r => !r.rewardClaimed).length;
  return {
    inviteCount: rows.length,
    claimedRewards: claimed,
    pendingRewards: pending,
    uses: rows.map(r => ({
      id: String(r.id),
      inviteeId: r.inviteeId,
      rewardDays: r.rewardDays,
      rewardClaimed: r.rewardClaimed,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function applyInviteCodePg(input: {
  deviceId: string;
  inviteCode: string;
  name?: string;
}) {
  const code = String(input.inviteCode || "").trim().toUpperCase();
  if (!code) throw new Error("inviteCode required");
  const invitee = await ensureGuestUser(input.deviceId, input.name);
  const database = await db.getDb();
  if (!database) throw new Error("database unavailable");

  const owners = await database
    .select()
    .from(users)
    .where(eq(users.inviteCode, code))
    .limit(1);
  if (owners.length === 0) throw new Error("invalid_invite");
  const owner = owners[0]!;
  if (owner.id === invitee.id) throw new Error("self_invite");

  const existing = await database
    .select()
    .from(invitations)
    .where(eq(invitations.inviteeId, invitee.id))
    .limit(1);
  if (existing.length > 0) throw new Error("already_invited");

  await database.insert(invitations).values({
    inviterId: owner.id,
    inviteeId: invitee.id,
    rewardDays: 3,
    rewardClaimed: false,
  });
  await database
    .update(users)
    .set({ invitedBy: owner.id, updatedAt: new Date() })
    .where(eq(users.id, invitee.id));

  return { ok: true, inviterName: owner.name || "摸鱼达人" };
}

export async function claimInviteRewardPg(input: {
  deviceId: string;
  invitationId: string;
}) {
  const user = await ensureGuestUser(input.deviceId);
  const database = await db.getDb();
  if (!database) throw new Error("database unavailable");
  const id = Number(input.invitationId);
  if (!Number.isFinite(id)) throw new Error("invitationId required");

  const rows = await database
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.inviterId, user.id)))
    .limit(1);
  if (rows.length === 0) throw new Error("not_found");
  const row = rows[0]!;
  if (row.rewardClaimed) throw new Error("already_claimed");

  await database
    .update(invitations)
    .set({ rewardClaimed: true })
    .where(eq(invitations.id, row.id));

  // Cosmetics-only product: ledger claim without inventing VIP days here.
  return { ok: true, rewardDays: row.rewardDays, claimed: true };
}

export async function getProfilePg(deviceId: string): Promise<LightProfile> {
  const user = await ensureGuestUser(deviceId);
  let avatar = "";
  try {
    const unlocked = user.unlockedAvatars
      ? (JSON.parse(user.unlockedAvatars) as string[])
      : [];
    avatar = unlocked[0] || "";
  } catch {
    avatar = "";
  }
  return {
    deviceId,
    name: user.name || "摸鱼达人",
    avatar,
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function updateProfilePg(input: {
  deviceId: string;
  name?: string;
  avatar?: string;
}): Promise<LightProfile> {
  const user = await ensureGuestUser(input.deviceId, input.name);
  const database = await db.getDb();
  if (!database) throw new Error("database unavailable");

  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (input.name != null) patch.name = String(input.name).slice(0, 32);
  if (input.avatar != null) {
    let unlocked: string[] = [];
    try {
      unlocked = user.unlockedAvatars
        ? (JSON.parse(user.unlockedAvatars) as string[])
        : [];
    } catch {
      unlocked = [];
    }
    const av = String(input.avatar).slice(0, 64);
    if (av && !unlocked.includes(av)) unlocked.unshift(av);
    patch.unlockedAvatars = JSON.stringify(unlocked.slice(0, 50));
  }
  await database.update(users).set(patch).where(eq(users.id, user.id));
  return getProfilePg(input.deviceId);
}
