import { z } from "zod";
import { publicProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, subscriptions, fortuneHistory, dailyDrawCount, invitations } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// 专属头像配置
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

// 普通头像（所有人可用）
export const FREE_AVATARS = ["🐱", "🐶", "🐼", "🦊", "🐨", "🐯", "🐸", "🐵"];

// 非会员每日抽签限制
const DAILY_DRAW_LIMIT = 3;

// 邀请奖励天数
const INVITE_REWARD_DAYS = 3;

// 生成邀请码
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const memberRouter = router({
  // 检查是否可以抽签
  checkDrawLimit: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { canDraw: true, remaining: DAILY_DRAW_LIMIT, isVip: false };
    }

    // 检查是否是会员
    const userSubscription = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, ctx.user.id),
        eq(subscriptions.status, "active")
      ))
      .limit(1);

    const isVip = userSubscription.length > 0;

    // 会员无限抽签
    if (isVip) {
      return { canDraw: true, remaining: -1, isVip: true };
    }

    // 非会员检查今日抽签次数
    const today = new Date().toISOString().split("T")[0];
    const todayCount = await db
      .select()
      .from(dailyDrawCount)
      .where(and(
        eq(dailyDrawCount.userId, ctx.user.id),
        sql`DATE(${dailyDrawCount.drawDate}) = ${today}`
      ))
      .limit(1);

    const currentCount = todayCount.length > 0 ? todayCount[0].count : 0;
    const remaining = DAILY_DRAW_LIMIT - currentCount;

    return {
      canDraw: remaining > 0,
      remaining,
      isVip: false,
      limit: DAILY_DRAW_LIMIT,
    };
  }),

  // 记录抽签（增加次数）
  recordDraw: publicProcedure
    .input(z.object({
      level: z.string(),
      emoji: z.string(),
      percent: z.number(),
      message: z.string().optional(),
      suggestedTime: z.string().optional(),
      avatar: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { success: true };
      }

      // 检查是否是会员
      const userSubscription = await db
        .select()
        .from(subscriptions)
        .where(and(
          eq(subscriptions.userId, ctx.user.id),
          eq(subscriptions.status, "active")
        ))
        .limit(1);

      const isVip = userSubscription.length > 0;

      // 非会员需要检查和更新抽签次数
      if (!isVip) {
        const today = new Date().toISOString().split("T")[0];
        const todayCount = await db
          .select()
          .from(dailyDrawCount)
          .where(and(
            eq(dailyDrawCount.userId, ctx.user.id),
            sql`DATE(${dailyDrawCount.drawDate}) = ${today}`
          ))
          .limit(1);

        if (todayCount.length > 0) {
          if (todayCount[0].count >= DAILY_DRAW_LIMIT) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "今日抽签次数已用完，升级会员享受无限抽签",
            });
          }
          await db
            .update(dailyDrawCount)
            .set({ count: todayCount[0].count + 1 })
            .where(eq(dailyDrawCount.id, todayCount[0].id));
        } else {
          await db.insert(dailyDrawCount).values({
            userId: ctx.user.id,
            drawDate: new Date(today),
            count: 1,
          });
        }
      }

      // 记录抽签历史
      await db.insert(fortuneHistory).values({
        userId: ctx.user.id,
        level: input.level,
        emoji: input.emoji,
        percent: input.percent,
        message: input.message || null,
        suggestedTime: input.suggestedTime || null,
        avatar: input.avatar || null,
      });

      return { success: true };
    }),

  // 获取抽签历史
  getHistory: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { history: [], total: 0 };
      }

      const limit = input?.limit || 20;
      const offset = input?.offset || 0;

      const history = await db
        .select()
        .from(fortuneHistory)
        .where(eq(fortuneHistory.userId, ctx.user.id))
        .orderBy(desc(fortuneHistory.createdAt))
        .limit(limit)
        .offset(offset);

      // 获取总数
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(fortuneHistory)
        .where(eq(fortuneHistory.userId, ctx.user.id));

      return {
        history,
        total: countResult[0]?.count || 0,
      };
    }),

  // 获取可用头像列表
  getAvatars: publicProcedure.query(async ({ ctx }) => {
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

    // 检查会员状态
    const userSubscription = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, ctx.user.id),
        eq(subscriptions.status, "active")
      ))
      .limit(1);

    const isVip = userSubscription.length > 0;
    const plan = userSubscription[0]?.plan || null;

    // 获取用户已解锁的头像
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    let unlockedAvatars: string[] = [];
    if (user[0]?.unlockedAvatars) {
      try {
        unlockedAvatars = JSON.parse(user[0].unlockedAvatars);
      } catch (e) {
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

  // 获取或生成邀请码
  getInviteCode: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { inviteCode: null };
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (user[0]?.inviteCode) {
      return { inviteCode: user[0].inviteCode };
    }

    // 生成新邀请码
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.inviteCode, inviteCode))
        .limit(1);

      if (existing.length === 0) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    await db
      .update(users)
      .set({ inviteCode })
      .where(eq(users.id, ctx.user.id));

    return { inviteCode };
  }),

  // 使用邀请码注册
  applyInviteCode: publicProcedure
    .input(z.object({ inviteCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      }

      // 检查用户是否已被邀请
      const currentUser = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (currentUser[0]?.invitedBy) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "您已使用过邀请码" });
      }

      // 查找邀请人
      const inviter = await db
        .select()
        .from(users)
        .where(eq(users.inviteCode, input.inviteCode.toUpperCase()))
        .limit(1);

      if (inviter.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "邀请码无效" });
      }

      if (inviter[0].id === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "不能使用自己的邀请码" });
      }

      // 记录邀请关系
      await db
        .update(users)
        .set({ invitedBy: inviter[0].id })
        .where(eq(users.id, ctx.user.id));

      // 创建邀请记录
      await db.insert(invitations).values({
        inviterId: inviter[0].id,
        inviteeId: ctx.user.id,
        rewardDays: INVITE_REWARD_DAYS,
        rewardClaimed: false,
      });

      return { success: true, inviterName: inviter[0].name || "摸鱼达人" };
    }),

  // 获取邀请统计
  getInviteStats: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { totalInvites: 0, claimedRewards: 0, pendingRewards: 0, inviteList: [] };
    }

    const inviteList = await db
      .select({
        id: invitations.id,
        inviteeId: invitations.inviteeId,
        rewardDays: invitations.rewardDays,
        rewardClaimed: invitations.rewardClaimed,
        createdAt: invitations.createdAt,
        inviteeName: users.name,
      })
      .from(invitations)
      .leftJoin(users, eq(invitations.inviteeId, users.id))
      .where(eq(invitations.inviterId, ctx.user.id))
      .orderBy(desc(invitations.createdAt));

    const totalInvites = inviteList.length;
    const claimedRewards = inviteList.filter(i => i.rewardClaimed).reduce((sum, i) => sum + i.rewardDays, 0);
    const pendingRewards = inviteList.filter(i => !i.rewardClaimed).reduce((sum, i) => sum + i.rewardDays, 0);

    return {
      totalInvites,
      claimedRewards,
      pendingRewards,
      inviteList: inviteList.map(i => ({
        id: i.id,
        inviteeName: i.inviteeName || "摸鱼新人",
        rewardDays: i.rewardDays,
        rewardClaimed: i.rewardClaimed,
        createdAt: i.createdAt,
      })),
    };
  }),

  // 领取邀请奖励
  claimInviteReward: publicProcedure
    .input(z.object({ invitationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });
      }

      // 查找邀请记录
      const invitation = await db
        .select()
        .from(invitations)
        .where(and(
          eq(invitations.id, input.invitationId),
          eq(invitations.inviterId, ctx.user.id)
        ))
        .limit(1);

      if (invitation.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "邀请记录不存在" });
      }

      if (invitation[0].rewardClaimed) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "奖励已领取" });
      }

      // 标记奖励已领取
      await db
        .update(invitations)
        .set({ rewardClaimed: true })
        .where(eq(invitations.id, input.invitationId));

      // 给用户增加会员天数
      const userSubscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      if (userSubscription.length > 0) {
        // 已有订阅，增加bonusDays
        await db
          .update(subscriptions)
          .set({
            bonusDays: (userSubscription[0].bonusDays || 0) + invitation[0].rewardDays,
          })
          .where(eq(subscriptions.id, userSubscription[0].id));
      } else {
        // 没有订阅，创建一个临时的会员记录
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + invitation[0].rewardDays);

        await db.insert(subscriptions).values({
          userId: ctx.user.id,
          status: "active",
          plan: "monthly",
          currentPeriodEnd: endDate,
          bonusDays: 0,
        });
      }

      return { success: true, rewardDays: invitation[0].rewardDays };
    }),
});
