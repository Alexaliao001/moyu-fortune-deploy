import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { fortuneHistory } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

function getWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const start = new Date(now);
  start.setDate(now.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/** drizzle-orm + postgres-js: execute() returns RowList (array-like of rows). */
function asRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const nested = (result as { rows?: unknown })?.rows;
  if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  return [];
}

export const leaderboardRouter = router({
  streakRanking: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { rankings: [], myRank: null };
      }

      const limit = input?.limit ?? 20;

      const result = await db.execute(sql`
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
          cs.streak_length AS streak,
          cs.last_date AS "lastActive"
        FROM current_streaks cs
        JOIN users u ON cs.user_id = u.id
        ORDER BY cs.streak_length DESC, cs.last_date DESC
        LIMIT ${limit}
      `);

      const rankings = asRows(result).map((row, index) => ({
        rank: index + 1,
        userId: Number(row.userId),
        name: (row.name as string) || "摸鱼达人",
        streak: Number(row.streak),
        lastActive: row.lastActive,
      }));

      return { rankings };
    }),

  weeklyBestRanking: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { rankings: [], weekRange: null };
      }

      const limit = input?.limit ?? 20;
      const { start, end } = getWeekRange();
      const startIso = start.toISOString();
      const endIso = end.toISOString();

      const result = await db.execute(sql`
        WITH weekly_fortune AS (
          SELECT
            fh."userId" AS user_id,
            u.name,
            fh.level,
            fh.percent,
            fh.emoji,
            fh."createdAt",
            CASE fh.level
              WHEN '大吉' THEN 5
              WHEN '中吉' THEN 4
              WHEN '小吉' THEN 3
              WHEN '末吉' THEN 2
              WHEN '凶' THEN 1
              ELSE 0
            END AS level_weight
          FROM fortune_history fh
          JOIN users u ON fh."userId" = u.id
          WHERE fh."createdAt" >= ${startIso}::timestamptz
            AND fh."createdAt" <= ${endIso}::timestamptz
        ),
        user_best AS (
          SELECT
            user_id,
            name,
            MAX(level_weight) AS best_level_weight,
            AVG(percent) AS avg_percent,
            COUNT(*)::int AS total_draws,
            MAX(percent) AS best_percent
          FROM weekly_fortune
          GROUP BY user_id, name
        ),
        user_best_detail AS (
          SELECT
            ub.user_id,
            ub.name,
            ub.best_level_weight,
            ub.avg_percent,
            ub.total_draws,
            ub.best_percent,
            (
              SELECT wf.level
              FROM weekly_fortune wf
              WHERE wf.user_id = ub.user_id AND wf.level_weight = ub.best_level_weight
              ORDER BY wf.percent DESC
              LIMIT 1
            ) AS best_level,
            (
              SELECT wf.emoji
              FROM weekly_fortune wf
              WHERE wf.user_id = ub.user_id AND wf.level_weight = ub.best_level_weight
              ORDER BY wf.percent DESC
              LIMIT 1
            ) AS best_emoji
          FROM user_best ub
        )
        SELECT
          user_id AS "userId",
          name,
          best_level,
          best_emoji,
          best_percent,
          avg_percent,
          total_draws
        FROM user_best_detail
        ORDER BY best_level_weight DESC, best_percent DESC, total_draws DESC
        LIMIT ${limit}
      `);

      const rankings = asRows(result).map((row, index) => ({
        rank: index + 1,
        userId: Number(row.userId),
        name: (row.name as string) || "摸鱼达人",
        bestLevel: row.best_level as string,
        bestEmoji: row.best_emoji as string,
        bestPercent: Number(row.best_percent),
        avgPercent: Math.round(Number(row.avg_percent)),
        totalDraws: Number(row.total_draws),
      }));

      return {
        rankings,
        weekRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      };
    }),

  myRanking: publicProcedure
    .input(
      z
        .object({
          deviceId: z
            .string()
            .min(8)
            .max(80)
            .regex(/^[a-zA-Z0-9_-]+$/)
            .optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { streak: 0, weeklyBest: null, totalDraws: 0 };
      }

      const { resolveWriteUser, deviceIdFromReq } = await import(
        "../_core/deviceUser"
      );
      const user = await resolveWriteUser({
        cookieUser: ctx.user,
        deviceId: input?.deviceId || deviceIdFromReq(ctx.req),
      });
      if (!user) {
        return { streak: 0, weeklyBest: null, totalDraws: 0 };
      }

      const streakResult = await db.execute(sql`
      WITH my_dates AS (
        SELECT ("createdAt")::date AS draw_date
        FROM fortune_history
        WHERE "userId" = ${user.id}
        GROUP BY ("createdAt")::date
      ),
      numbered AS (
        SELECT
          draw_date,
          draw_date - (ROW_NUMBER() OVER (ORDER BY draw_date DESC))::int AS streak_group
        FROM my_dates
      )
      SELECT COUNT(*)::int AS streak
      FROM numbered
      WHERE streak_group = (SELECT streak_group FROM numbered ORDER BY draw_date DESC LIMIT 1)
        AND draw_date >= CURRENT_DATE - INTERVAL '365 days'
    `);

      const streak = Number(asRows(streakResult)[0]?.streak || 0);

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
            eq(fortuneHistory.userId, user.id),
            gte(fortuneHistory.createdAt, start),
            lte(fortuneHistory.createdAt, end)
          )
        )
        .orderBy(desc(fortuneHistory.percent))
        .limit(1);

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(fortuneHistory)
        .where(eq(fortuneHistory.userId, user.id));

      return {
        streak,
        weeklyBest: weeklyBest[0] || null,
        totalDraws: Number(totalResult[0]?.count || 0),
      };
    }),

  globalStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        totalUsers: 0,
        drawers: 0,
        totalDraws: 0,
        todayDraws: 0,
        avgPercent: 0,
      };
    }

    // drawers = distinct users with ≥1 draw (align with light uniqueDevices)
    const stats = await db.execute(sql`
      SELECT
        (SELECT COUNT(DISTINCT "userId")::int FROM fortune_history) AS "drawers",
        (SELECT COUNT(*)::int FROM fortune_history) AS "totalDraws",
        (
          SELECT COUNT(*)::int
          FROM fortune_history
          WHERE ("createdAt")::date = CURRENT_DATE
             OR (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai')::date
                = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai')::date
        ) AS "todayDraws",
        (SELECT COALESCE(ROUND(AVG(percent)), 0)::int FROM fortune_history) AS "avgPercent"
    `);

    const row = asRows(stats)[0] || {};
    const drawers = Number(row.drawers || 0);
    return {
      /** @deprecated use drawers — kept so old clients still render something real */
      totalUsers: drawers,
      drawers,
      totalDraws: Number(row.totalDraws || 0),
      todayDraws: Number(row.todayDraws || 0),
      avgPercent: Number(row.avgPercent || 0),
    };
  }),

  /**
   * Real "beat X%" vs today's draws (P1-1).
   * Returns null when sample size is too small — never invent percentages.
   */
  beatPercent: publicProcedure
    .input(z.object({ percent: z.number().min(0).max(100) }))
    .query(async ({ input }) => {
      const MIN_SAMPLE = 20;
      const db = await getDb();
      if (!db) return { beatPercent: null as number | null, sampleSize: 0 };

      const result = await db.execute(sql`
        SELECT
          COUNT(*)::int AS "sampleSize",
          COUNT(*) FILTER (WHERE percent < ${input.percent})::int AS "below"
        FROM fortune_history
        WHERE ("createdAt")::date = CURRENT_DATE
      `);
      const row = asRows(result)[0] || {};
      const sampleSize = Number(row.sampleSize || 0);
      if (sampleSize < MIN_SAMPLE) {
        return { beatPercent: null as number | null, sampleSize };
      }
      const below = Number(row.below || 0);
      const beatPercent = Math.max(
        0,
        Math.min(99, Math.round((below / sampleSize) * 100))
      );
      return { beatPercent, sampleSize };
    }),
});
