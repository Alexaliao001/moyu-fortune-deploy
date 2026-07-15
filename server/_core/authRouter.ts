import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import * as db from "../db";
import {
  clearSessionCookie,
  emailOpenId,
  guestOpenId,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "./guestAuth";
import { publicProcedure, protectedProcedure, router } from "./trpc";

function inviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),

  /** Create or resume a guest profile from deviceId + nickname. */
  registerGuest: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(32).default("摸鱼达人"),
        deviceId: z.string().trim().min(8).max(80).optional(),
        avatar: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const openId = guestOpenId(input.deviceId);
      await db.upsertUser({
        openId,
        name: input.name,
        loginMethod: "guest",
        lastSignedIn: new Date(),
      });
      let user = await db.getUserByOpenId(openId);
      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "failed to create user" });
      }

      // ensure invite code
      if (!user.inviteCode) {
        const database = await db.getDb();
        if (database) {
          let code = inviteCode();
          for (let i = 0; i < 8; i++) {
            const clash = await database
              .select()
              .from(users)
              .where(eq(users.inviteCode, code))
              .limit(1);
            if (clash.length === 0) break;
            code = inviteCode();
          }
          await database
            .update(users)
            .set({ inviteCode: code, updatedAt: new Date() })
            .where(eq(users.id, user.id));
          user = (await db.getUserByOpenId(openId))!;
        }
      }

      if (input.avatar) {
        const database = await db.getDb();
        if (database) {
          let unlocked: string[] = [];
          try {
            unlocked = user.unlockedAvatars
              ? (JSON.parse(user.unlockedAvatars) as string[])
              : [];
          } catch {
            unlocked = [];
          }
          if (!unlocked.includes(input.avatar)) unlocked.push(input.avatar);
          await database
            .update(users)
            .set({
              unlockedAvatars: JSON.stringify(unlocked),
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));
          user = (await db.getUserByOpenId(openId))!;
        }
      }

      await setSessionCookie(ctx.req, ctx.res, user);
      return { user };
    }),

  /** Email + password register (optional). */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email().max(320),
        password: z.string().min(6).max(72),
        name: z.string().trim().min(1).max(32).default("摸鱼达人"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const existing = await db.getUserByEmail(email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "email already registered" });
      }
      const openId = emailOpenId(email);
      await db.upsertUser({
        openId,
        email,
        name: input.name,
        passwordHash: hashPassword(input.password),
        loginMethod: "email",
        lastSignedIn: new Date(),
      });
      const user = await db.getUserByOpenId(openId);
      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "failed to create user" });
      }
      await setSessionCookie(ctx.req, ctx.res, user);
      return { user };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email().max(320),
        password: z.string().min(1).max(72),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const user = await db.getUserByEmail(email);
      if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "invalid email or password" });
      }
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: new Date(),
      });
      await setSessionCookie(ctx.req, ctx.res, user);
      return { user };
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(32).optional(),
        avatar: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "database unavailable" });
      }
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name) patch.name = input.name;
      if (input.avatar) {
        let unlocked: string[] = [];
        try {
          unlocked = ctx.user.unlockedAvatars
            ? (JSON.parse(ctx.user.unlockedAvatars) as string[])
            : [];
        } catch {
          unlocked = [];
        }
        if (!unlocked.includes(input.avatar)) unlocked.push(input.avatar);
        patch.unlockedAvatars = JSON.stringify(unlocked);
      }
      await database.update(users).set(patch).where(eq(users.id, ctx.user.id));
      const user = await db.getUserById(ctx.user.id);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "user not found" });
      }
      await setSessionCookie(ctx.req, ctx.res, user);
      return { user };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    clearSessionCookie(ctx.req, ctx.res);
    return { success: true } as const;
  }),

  /** Health-ish auth probe for UI status chip */
  status: publicProcedure.query(({ ctx }) => ({
    authenticated: Boolean(ctx.user),
    userId: ctx.user?.id ?? null,
    name: ctx.user?.name ?? null,
    cookie: COOKIE_NAME,
  })),
});
