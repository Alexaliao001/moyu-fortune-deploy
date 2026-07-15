import { z } from "zod";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { feedback, notifications } from "../../drizzle/schema";
import { getDb } from "../db";
import { notifyOwner } from "../_core/notification";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const feedbackRouter = router({
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
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      await db.insert(feedback).values({
        userId: ctx.user?.id ?? null,
        type: input.type,
        content: input.content,
        contact: input.contact || null,
        userAgent: input.userAgent || null,
      });

      // Owner notify is optional — never block feedback persistence
      try {
        await notifyOwner({
          title: `MoYu feedback: ${input.type}`,
          content: input.content.slice(0, 500),
        });
      } catch (err) {
        console.warn("[feedback] notifyOwner skipped:", err);
      }

      return { success: true };
    }),

  list: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "reviewed", "resolved", "closed"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt));
      if (input?.status) {
        return rows.filter(r => r.status === input.status);
      }
      return rows;
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "reviewed", "resolved", "closed"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "db unavailable" });
      await db.update(feedback).set({ status: input.status }).where(eq(feedback.id, input.id));
      return { success: true };
    }),

  reply: adminProcedure
    .input(
      z.object({
        id: z.number(),
        reply: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "db unavailable" });

      const rows = await db.select().from(feedback).where(eq(feedback.id, input.id)).limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "feedback not found" });

      await db
        .update(feedback)
        .set({
          adminReply: input.reply,
          repliedAt: new Date(),
          status: "resolved",
        })
        .where(eq(feedback.id, input.id));

      if (row.userId) {
        await db.insert(notifications).values({
          userId: row.userId,
          type: "feedback_reply",
          title: "反馈回复",
          content: input.reply,
          relatedId: row.id,
        });
      }

      return { success: true };
    }),
});
