/**
 * Owner observability — GET /api/admin/overview?token=<MOYU_ADMIN_TOKEN>
 * Real-time "who is using the site" view backed by the same Postgres tables.
 * HTML by default (bookmark on a phone), ?format=json for scripts.
 * Disabled unless MOYU_ADMIN_TOKEN is configured.
 */
import { timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { shanghaiTodayKey } from "./deviceUser";

/** Same exclusion convention as scripts/metrics-7d-lib.mjs. */
const EXCLUDED_DEVICE_SQL = "^(smoke|test)-";

export function adminTokenOk(
  provided: unknown,
  expected = process.env.MOYU_ADMIN_TOKEN
): boolean {
  if (!expected || typeof provided !== "string" || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function requestToken(req: Request): string {
  const q = req.query.token;
  if (typeof q === "string" && q) return q;
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return "";
}

function asRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const nested = (result as { rows?: unknown })?.rows;
  if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  return [];
}

function launchDay(): string {
  return process.env.MOYU_METRICS_LAUNCH_DATE || "2026-07-15";
}

export interface AdminOverview {
  ok: true;
  generatedAt: string;
  day: string;
  launchDay: string;
  today: {
    draws: number;
    drawDevices: number;
    newDevices: number;
    shareClicks: number;
    shareDevices: number;
    cardSaves: number;
    membershipViews: number;
  };
  total: {
    draws: number;
    drawDevices: number;
    feedback: number;
  };
  channelFirstDraws: Record<string, number>;
  recentDraws: Array<{
    at: string;
    deviceId: string;
    name: string;
    level: string;
    percent: number;
  }>;
  recentFeedback: Array<{
    at: string;
    type: string;
    content: string;
    contact: string;
  }>;
}

export async function buildAdminOverview(): Promise<AdminOverview | null> {
  const db = await getDb();
  if (!db) return null;
  const day = shanghaiTodayKey();

  const ledgerToday = asRows(
    await db.execute(sql`
      SELECT
        COUNT(*)::int AS draws,
        COUNT(DISTINCT fh."userId")::int AS draw_devices
      FROM fortune_history fh
      JOIN users u ON u.id = fh."userId"
      WHERE u."openId" !~* ${"^guest_" + EXCLUDED_DEVICE_SQL}
        AND ((fh."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai')::date
            = ${day}::date
    `)
  )[0];

  const newDevices = asRows(
    await db.execute(sql`
      SELECT COUNT(*)::int AS n
      FROM users u
      WHERE u."openId" !~* ${"^guest_" + EXCLUDED_DEVICE_SQL}
        AND ((u."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai')::date
            = ${day}::date
    `)
  )[0];

  const eventsToday = asRows(
    await db.execute(sql`
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

  const totals = asRows(
    await db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM fortune_history fh JOIN users u ON u.id = fh."userId"
          WHERE u."openId" !~* ${"^guest_" + EXCLUDED_DEVICE_SQL}) AS draws,
        (SELECT COUNT(DISTINCT fh."userId")::int FROM fortune_history fh JOIN users u ON u.id = fh."userId"
          WHERE u."openId" !~* ${"^guest_" + EXCLUDED_DEVICE_SQL}) AS draw_devices,
        (SELECT COUNT(*)::int FROM feedback) AS feedback
    `)
  )[0];

  const firstDraws = asRows(
    await db.execute(sql`
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
  const channelFirstDraws: Record<string, number> = {};
  for (const row of firstDraws) {
    const source = String(row.source || "").trim();
    if (!source) continue;
    channelFirstDraws[source] = (channelFirstDraws[source] || 0) + 1;
  }

  const recentDraws = asRows(
    await db.execute(sql`
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
  ).map(row => {
    const openId = String(row.open_id || "");
    const deviceId = openId.startsWith("guest_") ? openId.slice(6) : openId;
    return {
      at: String(row.at || ""),
      deviceId: deviceId.slice(0, 12),
      name: String(row.name || "摸鱼达人"),
      level: String(row.level || ""),
      percent: Number(row.percent || 0),
    };
  });

  const recentFeedback = asRows(
    await db.execute(sql`
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
  ).map(row => ({
    at: String(row.at || ""),
    type: String(row.type || ""),
    content: String(row.content || ""),
    contact: String(row.contact || ""),
  }));

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    day,
    launchDay: launchDay(),
    today: {
      draws: Number(ledgerToday?.draws || 0),
      drawDevices: Number(ledgerToday?.draw_devices || 0),
      newDevices: Number(newDevices?.n || 0),
      shareClicks: Number(eventsToday?.share_clicks || 0),
      shareDevices: Number(eventsToday?.share_devices || 0),
      cardSaves: Number(eventsToday?.card_saves || 0),
      membershipViews: Number(eventsToday?.membership_views || 0),
    },
    total: {
      draws: Number(totals?.draws || 0),
      drawDevices: Number(totals?.draw_devices || 0),
      feedback: Number(totals?.feedback || 0),
    },
    channelFirstDraws,
    recentDraws,
    recentFeedback,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(data: AdminOverview): string {
  const stat = (label: string, value: number | string) =>
    `<div class="stat"><div class="v">${value}</div><div class="l">${label}</div></div>`;
  const channels = Object.entries(data.channelFirstDraws)
    .sort(([, a], [, b]) => b - a)
    .map(([source, count]) => `<tr><td>${escapeHtml(source)}</td><td>${count}</td></tr>`)
    .join("");
  const draws = data.recentDraws
    .map(
      row =>
        `<tr><td>${row.at}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(
          row.deviceId
        )}…</td><td>${escapeHtml(row.level)} ${row.percent}%</td></tr>`
    )
    .join("");
  const feedback = data.recentFeedback
    .map(
      row =>
        `<tr><td>${row.at}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(
          row.content.slice(0, 120)
        )}</td><td>${escapeHtml(row.contact)}</td></tr>`
    )
    .join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta http-equiv="refresh" content="300">
<title>摸了么 · 运营总览</title>
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
<h1>摸了么 · 运营总览</h1>
<div class="sub">上海时间 ${data.day} · 生成于 ${escapeHtml(data.generatedAt)} · 每 5 分钟自动刷新 · smoke-*/test-* 已排除</div>
<h2>今天</h2>
<div class="grid">
${stat("抽签次数", data.today.draws)}
${stat("抽签设备", data.today.drawDevices)}
${stat("新设备", data.today.newDevices)}
${stat("分享点击", data.today.shareClicks)}
${stat("分享设备", data.today.shareDevices)}
${stat("卡片保存", data.today.cardSaves)}
${stat("会员页浏览", data.today.membershipViews)}
</div>
<h2>累计</h2>
<div class="grid">
${stat("总抽签", data.total.draws)}
${stat("总设备", data.total.drawDevices)}
${stat("反馈条数", data.total.feedback)}
</div>
<h2>渠道首抽（${data.launchDay} 起）</h2>
${channels ? `<table>${channels}</table>` : `<div class="empty">暂无渠道数据 — 发帖后这里会出现 jike / xiaohongshu / v2ex / twitter_zh</div>`}
<h2>最近 20 次抽签</h2>
${draws ? `<table>${draws}</table>` : `<div class="empty">暂无抽签</div>`}
<h2>最近反馈</h2>
${feedback ? `<table>${feedback}</table>` : `<div class="empty">暂无反馈</div>`}
</body></html>`;
}

/** Mount admin observability under /api/admin/*. */
export function registerAdminApi(app: Express) {
  app.get("/api/admin/overview", async (req: Request, res: Response) => {
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
