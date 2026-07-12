import { getDb } from "../db";
import { users, notifications } from "../../drizzle/schema";
import { sql } from "drizzle-orm";

// 每日运势预告模板
const DAILY_TIPS_ZH = [
  "🐟 今日宜摸鱼，不宜加班。来抽一签看看运势如何？",
  "☕ 新的一天，新的摸鱼机会！快来看看今天的运势吧~",
  "🎰 今日份的摸鱼运势已更新，点击查看你的专属预测！",
  "🌟 据说今天抽到大吉的概率特别高，不来试试？",
  "🐱 办公室的猫都在等你来抽签了，快来摸鱼吧！",
  "💤 今天适合摸鱼的指数已刷新，来看看你能摸多久~",
  "🎯 每日一签，摸鱼有道。今天的运势等你来揭晓！",
  "🔮 今日摸鱼运势已生成，据说连续签到会有好运哦~",
  "🏖️ 工作再忙也要摸鱼！来看看今天的黄金摸鱼时段~",
  "🎪 新的一天，新的运势！连续签到可以上排行榜哦~",
];

const DAILY_TIPS_TITLES_ZH = [
  "🐟 今日摸鱼运势预告",
  "☀️ 早安！今日运势已更新",
  "🎰 每日一签，好运连连",
  "✨ 今天的摸鱼运势来了",
  "🌈 新的一天，新的运势",
];

/**
 * 发送每日运势推送通知给所有活跃用户
 * 活跃用户定义：最近7天内有登录的用户
 */
export async function sendDailyNotifications() {
  console.log("[DailyNotification] Starting daily notification job...");
  
  try {
    // 获取最近7天活跃的用户
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const activeUsers = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(sql`${users.lastSignedIn} >= ${sevenDaysAgo}`);

    if (activeUsers.length === 0) {
      console.log("[DailyNotification] No active users found, skipping.");
      return;
    }

    // 随机选择标题和内容
    const title = DAILY_TIPS_TITLES_ZH[Math.floor(Math.random() * DAILY_TIPS_TITLES_ZH.length)];
    const content = DAILY_TIPS_ZH[Math.floor(Math.random() * DAILY_TIPS_ZH.length)];

    // 批量插入通知
    const notificationRecords = activeUsers.map((user: { id: number; name: string | null }) => ({
      userId: user.id,
      type: "system" as const,
      title,
      content,
      isRead: false,
    }));

    // 分批插入，每批100条
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

/**
 * 启动定时任务
 * 每天早上9点（UTC+8 = UTC 1:00）发送通知
 */
export function startDailyNotificationCron() {
  const INTERVAL_MS = 60 * 1000; // 每分钟检查一次
  let lastRunDate = "";

  setInterval(() => {
    const now = new Date();
    // UTC+8 时间
    const utc8Hour = (now.getUTCHours() + 8) % 24;
    const utc8Date = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().split("T")[0];

    // 每天UTC+8 9:00-9:01 之间执行一次
    if (utc8Hour === 9 && now.getUTCMinutes() === 0 && lastRunDate !== utc8Date) {
      lastRunDate = utc8Date;
      sendDailyNotifications().catch(console.error);
    }
  }, INTERVAL_MS);

  console.log("[DailyNotification] Cron job registered. Will send at 9:00 AM UTC+8 daily.");
}
