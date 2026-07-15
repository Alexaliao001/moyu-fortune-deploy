import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { pickSlogan, sloganStats } from "@shared/slogans";

/**
 * Fortune slogans — P1-2 local library (≥200, tiered).
 * No LLM required (AGENTS.md 铁律 8 / P1-2).
 */
export const fortuneRouter = router({
  libraryStats: publicProcedure.query(() => sloganStats()),

  generateSlogan: publicProcedure
    .input(
      z.object({
        level: z.string(),
        percent: z.number(),
        language: z.enum(["zh", "en"]).optional().default("zh"),
      })
    )
    .mutation(async ({ input }) => {
      const lang = input.language === "en" ? "en" : "zh";
      // Mild deterministic flavor from percent so same draw→same-ish slogan feel
      const seed = Math.floor(input.percent * 17 + input.level.length * 31);
      const slogan = pickSlogan(input.level, lang, seed);
      return {
        success: true as const,
        slogan,
        source: "library" as const,
      };
    }),
});
