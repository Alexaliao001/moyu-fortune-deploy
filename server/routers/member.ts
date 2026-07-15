import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, subscriptions, fortuneHistory } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { User } from "../../drizzle/schema";
import {
  deviceIdFromReq,
  ensureGuestUser,
  resolveWriteUser,
  shanghaiTodayKey,
  upsertDailyDraw,
} from "../_core/deviceUser";

export const VIP_AVATARS = [
  { emoji: "🦄", name: "独角兽", requiredLevel: "vip" },
  { emoji: "🐉", name: "神龙", requiredLevel: "vip" },
  { emoji: "🦋", name: "蝴蝶", requiredLevel: "vip" },
  { emoji: "🌟", name: "星星", requiredLevel: "vip" },
  { emoji: "🎭", name: "面具", requiredLevel: "annual" },
  { emoji: "👑", name: "皇冠", requiredLevel: "annual" },
  { emoji: "💎", name: "钻石", requiredLevel: "annual" },
  { emoji: "🔮", name: "水晶球", requiredLevel: "annual" },
];

export const FREE_AVATARS = ["🐱", "🐶", "🐼", "🦊", "🐨", "🐯", "🐸", "🐵"];

const deviceIdInput = z
  .string()
  .min(8)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);

async function userFromDeviceCtx(
  ctx: { user: User | null; req: { headers: Record<string, unknown> } },
  deviceId?: string,
  name?: string
) {
  const resolved = await resolveWriteUser({
    cookieUser: ctx.user,
    deviceId: deviceId || deviceIdFromReq(ctx.req),
    name,
  });
  if (!resolved) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "deviceId required",
    });
  }
  return resolved;
}

export const memberRouter = router({
  checkDrawLimit: publicProcedure
    .input(z.object({ deviceId: deviceIdInput.optional() }).optional())
    .query(async () => {
      return { canDraw: true, remaining: -1, isVip: false, limit: null as number | null };
    }),

  /** Device-first ledger write — no cross-site cookie required. */
  recordDraw: publicProcedure
    .input(
      z.object({
        deviceId: deviceIdInput.optional(),
        name: z.string().max(32).optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        level: z.string(),
        emoji: z.string(),
        percent: z.number(),
        message: z.string().optional(),
        suggestedTime: z.string().optional(),
        avatar: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await userFromDeviceCtx(ctx, input.deviceId, input.name);
      const date = input.date || shanghaiTodayKey();
      await upsertDailyDraw({
        userId: user.id,
        date,
        level: input.level,
        emoji: input.emoji,
        percent: input.percent,
        message: input.message,
        suggestedTime: input.suggestedTime,
        avatar: input.avatar,
      });
      return { success: true };
    }),

  getHistory: publicProcedure
    .input(
      z
        .object({
          deviceId: deviceIdInput.optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { history: [], total: 0 };
      }

      const user = await resolveWriteUser({
        cookieUser: ctx.user,
        deviceId: input?.deviceId || deviceIdFromReq(ctx.req),
      });
      if (!user) {
        return { history: [], total: 0 };
      }

      const limit = input?.limit || 20;
      const offset = input?.offset || 0;

      const history = await db
        .select()
        .from(fortuneHistory)
        .where(eq(fortuneHistory.userId, user.id))
        .orderBy(desc(fortuneHistory.createdAt))
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(fortuneHistory)
        .where(eq(fortuneHistory.userId, user.id));

      return {
        history,
        total: countResult[0]?.count || 0,
      };
    }),

  getAvatars: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return {
        freeAvatars: FREE_AVATARS,
        vipAvatars: VIP_AVATARS,
        unlockedAvatars: [],
        isVip: false,
        plan: null,
      };
    }

    const userSubscription = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, ctx.user.id),
          eq(subscriptions.status, "active")
        )
      )
      .limit(1);

    const isVip = userSubscription.length > 0;
    const plan = userSubscription[0]?.plan || null;

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    let unlockedAvatars: string[] = [];
    if (user[0]?.unlockedAvatars) {
      try {
        unlockedAvatars = JSON.parse(user[0].unlockedAvatars);
      } catch {
        unlockedAvatars = [];
      }
    }

    return {
      freeAvatars: FREE_AVATARS,
      vipAvatars: VIP_AVATARS,
      unlockedAvatars,
      isVip,
      plan,
    };
  }),
});

// keep ensureGuestUser re-export for tests if needed
export { ensureGuestUser };
