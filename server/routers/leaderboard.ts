import { z } from "zod";
import { publicProcedure, publicProcedure, router } from "../_core/trpc";
import { fortuneHistory, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

// 运势等级权重（用于排行）
const LEVEL_WEIGHT: Record<string, number> = {
  "大吉": 5,
  "中吉": 4,
  "小吉": 3,
  "末吉": 2,
  "凶": 1,
};

// 获取本周的起止时间（周一到周日）
function getWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const start = new Date(now);
  start.setDate(now.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

export const leaderboardRouter = router({
  // 连续签到天数排行榜
  streakRanking: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { rankings: [], myRank: null };
      }

      const limit = input?.limit ?? 20;

      // 获取所有用户的抽签日期（去重）
      // 使用SQL直接计算连续天数
      const result = await db.execute(sql`
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

      const rankings = (result as any)[0]?.map((row: any, index: number) => ({
        rank: index + 1,
        userId: row.userId,
        name: row.name || "摸鱼达人",
        streak: Number(row.streak),
        lastActive: row.lastActive,
      })) || [];

      return { rankings };
    }),

  // 本周最佳运势排行榜
  weeklyBestRanking: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { rankings: [], weekRange: null };
      }

      const limit = input?.limit ?? 20;
      const { start, end } = getWeekRange();

      // 本周每个用户的最佳运势 + 平均摸鱼指数
      const result = await db.execute(sql`
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

      const rankings = (result as any)[0]?.map((row: any, index: number) => ({
        rank: index + 1,
        userId: row.userId,
        name: row.name || "摸鱼达人",
        bestLevel: row.best_level,
        bestEmoji: row.best_emoji,
        bestPercent: Number(row.best_percent),
        avgPercent: Math.round(Number(row.avg_percent)),
        totalDraws: Number(row.total_draws),
      })) || [];

      return {
        rankings,
        weekRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      };
    }),

  // 获取我的排名信息
  myRanking: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { streak: 0, weeklyBest: null, totalDraws: 0 };
    }

    // 计算我的连续签到天数
    const streakResult = await db.execute(sql`
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

    const streak = Number((streakResult as any)[0]?.[0]?.streak || 0);

    // 本周最佳运势
    const { start, end } = getWeekRange();
    const weeklyBest = await db
      .select({
        level: fortuneHistory.level,
        percent: fortuneHistory.percent,
        emoji: fortuneHistory.emoji,
      })
      .from(fortuneHistory)
      .where(
        and(
          eq(fortuneHistory.userId, ctx.user.id),
          gte(fortuneHistory.createdAt, start),
          lte(fortuneHistory.createdAt, end)
        )
      )
      .orderBy(desc(fortuneHistory.percent))
      .limit(1);

    // 总抽签次数
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(fortuneHistory)
      .where(eq(fortuneHistory.userId, ctx.user.id));

    return {
      streak,
      weeklyBest: weeklyBest[0] || null,
      totalDraws: totalResult[0]?.count || 0,
    };
  }),

  // 全站统计
  globalStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return { totalUsers: 0, totalDraws: 0, todayDraws: 0, avgPercent: 0 };
    }

    const today = new Date().toISOString().split("T")[0];

    const stats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(DISTINCT id) FROM users) as totalUsers,
        (SELECT COUNT(*) FROM fortune_history) as totalDraws,
        (SELECT COUNT(*) FROM fortune_history WHERE DATE(createdAt) = ${today}) as todayDraws,
        (SELECT ROUND(AVG(percent)) FROM fortune_history) as avgPercent
    `);

    const row = (stats as any)[0]?.[0];
    return {
      totalUsers: Number(row?.totalUsers || 0),
      totalDraws: Number(row?.totalDraws || 0),
      todayDraws: Number(row?.todayDraws || 0),
      avgPercent: Number(row?.avgPercent || 0),
    };
  }),
});
