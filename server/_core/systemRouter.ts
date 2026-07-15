import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { ENV } from "./env";
import { getDb } from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z
        .object({
          timestamp: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async () => {
      const db = await getDb();
      return {
        ok: true,
        service: "moyu-fortune",
        version: "path-c-1.0",
        database: Boolean(db),
        stripe: Boolean(ENV.stripeSecretKey),
        stripeWebhook: Boolean(ENV.stripeWebhookSecret),
        llm: Boolean(ENV.forgeApiKey),
      };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
