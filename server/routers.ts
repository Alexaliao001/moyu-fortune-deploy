import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { authRouter } from "./_core/authRouter";
import { fortuneRouter } from "./routers/fortune";
import { stripeRouter } from "./stripe/router";
import { memberRouter } from "./routers/member";
import { feedbackRouter } from "./routers/feedback";
import { notificationRouter } from "./routers/notification";
import { leaderboardRouter } from "./routers/leaderboard";
import { router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  fortune: fortuneRouter,
  stripe: stripeRouter,
  member: memberRouter,
  feedback: feedbackRouter,
  notification: notificationRouter,
  leaderboard: leaderboardRouter,
});

export type AppRouter = typeof appRouter;
