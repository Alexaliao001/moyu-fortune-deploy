import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { fortuneRouter } from "./routers/fortune";
import { stripeRouter } from "./stripe/router";
import { memberRouter } from "./routers/member";
import { feedbackRouter } from "./routers/feedback";
import { notificationRouter } from "./routers/notification";
import { leaderboardRouter } from "./routers/leaderboard";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 摸鱼运势功能路由
  fortune: fortuneRouter,

  // Stripe支付路由
  stripe: stripeRouter,

  // 会员功能路由
  member: memberRouter,

  // 用户反馈路由
  feedback: feedbackRouter,

  // 用户通知路由
  notification: notificationRouter,

  // 排行榜路由
  leaderboard: leaderboardRouter,
});

export type AppRouter = typeof appRouter;
