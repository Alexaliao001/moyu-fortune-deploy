import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { notifications } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, desc, and, sql } from "drizzle-orm";

export const notificationRouter = router({
  // 获取用户通知列表
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        unreadOnly: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const limit = input?.limit ?? 20;
      const unreadOnly = input?.unreadOnly ?? false;

      if (unreadOnly) {
        return await db
          .select()
          .from(notifications)
          .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)))
          .orderBy(desc(notifications.createdAt))
          .limit(limit);
      }

      return await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, ctx.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    }),

  // 获取未读通知数量
  unreadCount: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)));

    return { count: result[0]?.count ?? 0 };
  }),

  // 标记通知为已读
  markAsRead: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));

      return { success: true };
    }),

  // 标记所有通知为已读
  markAllAsRead: publicProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, ctx.user.id));

    return { success: true };
  }),
});
