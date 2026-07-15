import { z } from "zod";
import { publicProcedure, publicProcedure, router } from "../_core/trpc";
import { feedback, notifications } from "../../drizzle/schema";
import { getDb } from "../db";
import { notifyOwner } from "../_core/notification";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// 管理员权限检查
const adminProcedure = publicProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const feedbackRouter = router({
  // 提交反馈
  submit: publicProcedure
    .input(
      z.object({
        type: z.enum(["bug", "feature", "suggestion", "other"]),
        content: z.string().min(1).max(1000),
        contact: z.string().max(255).optional(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id || null;

      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }
      
      await db.insert(feedback).values({
        userId,
        type: input.type,
        content: input.content,
        contact: input.contact || null,
        userAgent: input.userAgent || null,
        status: "pending",
      });

      // 通知站长
      const typeLabels: Record<string, string> = {
        bug: "🐛 问题报告",
        feature: "💡 功能建议",
        suggestion: "👍 体验反馈",
        other: "📝 其他",
      };

      try {
        await notifyOwner({
          title: `[摸了么] 新用户反馈 - ${typeLabels[input.type]}`,
          content: `
**反馈类型**: ${typeLabels[input.type]}

**反馈内容**:
${input.content}

**联系方式**: ${input.contact || "未提供"}

**用户ID**: ${userId || "匿名用户"}

**提交时间**: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
          `.trim(),
        });
      } catch (e) {
        console.error("Failed to notify owner:", e);
      }

      return { success: true };
    }),

  // 获取反馈列表（管理员）
  list: adminProcedure
    .input(
      z.object({
        status: z.enum(["pending", "reviewed", "resolved", "closed"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      if (input?.status) {
        return await db.select().from(feedback).where(eq(feedback.status, input.status)).orderBy(desc(feedback.createdAt));
      }

      return await db.select().from(feedback).orderBy(desc(feedback.createdAt));
    }),

  // 更新反馈状态（管理员）
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "reviewed", "resolved", "closed"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      await db.update(feedback).set({ status: input.status }).where(eq(feedback.id, input.id));

      return { success: true };
    }),

  // 回复反馈（管理员）
  reply: adminProcedure
    .input(
      z.object({
        id: z.number(),
        reply: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // 获取反馈信息
      const [feedbackItem] = await db.select().from(feedback).where(eq(feedback.id, input.id)).limit(1);
      
      if (!feedbackItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feedback not found" });
      }

      // 更新反馈回复
      await db.update(feedback).set({
        adminReply: input.reply,
        repliedAt: new Date(),
        status: "resolved",
      }).where(eq(feedback.id, input.id));

      // 如果用户已登录，发送站内通知
      if (feedbackItem.userId) {
        await db.insert(notifications).values({
          userId: feedbackItem.userId,
          type: "feedback_reply",
          title: "您的反馈已收到回复",
          content: input.reply,
          relatedId: input.id,
          isRead: false,
        });
      }

      return { success: true };
    }),
});
