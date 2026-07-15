import "dotenv/config";
import { appendFile } from "node:fs/promises";
import postgres from "postgres";
import {
  assertDateKey,
  computeMetrics,
  shanghaiDateKey,
} from "./metrics-7d-lib.mjs";

function parseArgs(argv) {
  const args = {};
  for (const token of argv) {
    if (!token.startsWith("--")) continue;
    const [key, ...rest] = token.slice(2).split("=");
    args[key] = rest.length ? rest.join("=") : true;
  }
  return args;
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function renderMarkdown(metrics) {
  const channelLines = Object.entries(
    metrics.attribution.channelFirstDrawDevices
  )
    .sort(([, a], [, b]) => b - a)
    .map(([source, count]) => `  - ${source}: ${count}`)
    .join("\n");
  const gate = value => (value ? "PASS" : "MISS");

  return [
    `## 7 天验证快照 · ${metrics.reportDay}`,
    `- 正式 cohort 起点：${metrics.launchDay}`,
    `- 排除设备：smoke-*、test-*`,
    `- 当日独立抽签设备：${metrics.daily.uniqueDrawDevices}`,
    `- 当日分享参与率：${percent(metrics.daily.shareParticipationRate)}（${metrics.daily.sharingDevices}/${metrics.daily.uniqueDrawDevices}）`,
    `- 当日分享动作率：${percent(metrics.daily.shareActionRate)}（${metrics.daily.shareActions} 次）`,
    `- 当日卡片保存率：${percent(metrics.daily.cardSaveRate)}（${metrics.daily.savingDevices} 台）`,
    `- 累计独立抽签设备：${metrics.period.uniqueDrawDevices}`,
    `- 累计分享参与率：${percent(metrics.period.shareParticipationRate)}`,
    `- 累计分享动作率：${percent(metrics.period.shareActionRate)}`,
    `- 累计卡片保存率：${percent(metrics.period.cardSaveRate)}`,
    `- 精确 D7：${metrics.d7.mature ? `${percent(metrics.d7.d7Rate)}（${metrics.d7.returnedD7}/${metrics.d7.firstDrawDevices}）` : "尚无成熟 cohort"}`,
    `- ref=card 带回首抽设备：${metrics.attribution.cardReferredFirstDrawDevices}`,
    `- 渠道首抽：`,
    channelLines || "  - 暂无",
    `- 门槛：设备 ${gate(metrics.gates.uniqueDrawDevices)} · 分享 ${gate(metrics.gates.shareParticipation)} · D7 ${gate(metrics.gates.d7)} · 回流 ${gate(metrics.gates.attributedFirstDraws)}`,
    `- 决策状态：${metrics.decisionReady ? (metrics.allGatesPassed ? "可进入品牌试点预售" : "进入矩阵诊断，只允许一次针对性迭代") : "等待 7 天窗口与成熟 cohort"}`,
  ].join("\n");
}

const args = parseArgs(process.argv.slice(2));
const databaseUrl = process.env.DATABASE_URL;
const launchDay = String(
  args.since || process.env.MOYU_METRICS_LAUNCH_DATE || ""
);
const reportDay = String(args.date || shanghaiDateKey());

if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
if (!launchDay) {
  console.error(
    "Launch date required: pnpm metrics:7d -- --since=YYYY-MM-DD"
  );
  process.exit(1);
}
assertDateKey(launchDay, "launch date");
assertDateKey(reportDay, "report date");

const db = postgres(databaseUrl, {
  max: 1,
  ssl:
    databaseUrl.includes("render.com") ||
    databaseUrl.includes("sslmode=require")
      ? "require"
      : undefined,
});

try {
  const eventRows = await db`
    SELECT
      event,
      device_id,
      props,
      client_occurred_at,
      TO_CHAR(
        client_occurred_at AT TIME ZONE 'Asia/Shanghai',
        'YYYY-MM-DD'
      ) AS day
    FROM analytics_events
    WHERE client_occurred_at >= (
      ${launchDay}::date::timestamp AT TIME ZONE 'Asia/Shanghai'
    )
      AND client_occurred_at < (
        (${reportDay}::date + 1)::timestamp AT TIME ZONE 'Asia/Shanghai'
      )
    ORDER BY client_occurred_at ASC
  `;
  const ledgerRows = await db`
    SELECT
      fh."userId" AS user_id,
      u."openId" AS open_id,
      TO_CHAR(
        (fh."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai',
        'YYYY-MM-DD'
      ) AS day
    FROM fortune_history fh
    JOIN users u ON u.id = fh."userId"
    WHERE fh."createdAt" < (
      (${reportDay}::date + 1)::timestamp AT TIME ZONE 'Asia/Shanghai'
    ) AT TIME ZONE 'UTC'
    GROUP BY fh."userId", u."openId", day
  `;

  const events = eventRows.map(row => ({
    event: row.event,
    deviceId: row.device_id,
    props: row.props || {},
    occurredAt: new Date(row.client_occurred_at).toISOString(),
    day: row.day,
  }));
  const ledger = ledgerRows.map(row => ({
    deviceId: row.open_id?.startsWith("guest_")
      ? row.open_id.slice("guest_".length)
      : `user-${row.user_id}`,
    day: row.day,
  }));
  const metrics = computeMetrics(events, ledger, launchDay, reportDay);
  const markdown = renderMarkdown(metrics);

  if (args.json) {
    console.log(JSON.stringify(metrics, null, 2));
  } else {
    console.log(markdown);
  }
  if (typeof args.append === "string") {
    await appendFile(args.append, `\n\n${markdown}\n`, "utf8");
  }
} finally {
  await db.end();
}
