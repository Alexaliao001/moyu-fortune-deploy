import { describe, it, expect } from "vitest";
import { fortuneRouter } from "./fortune";
import { sloganStats } from "@shared/slogans";

describe("Fortune Router (P1-2 library)", () => {
  const caller = fortuneRouter.createCaller({} as never);

  it("libraryStats meets AGENTS thresholds", async () => {
    const stats = await caller.libraryStats();
    expect(stats.totalZh).toBeGreaterThanOrEqual(200);
    expect(stats.zh["大吉"]).toBeGreaterThanOrEqual(50);
    expect(stats.zh["吉"]).toBeGreaterThanOrEqual(50);
    expect(stats.zh["平"]).toBeGreaterThanOrEqual(50);
    expect(stats.zh["凶"]).toBeGreaterThanOrEqual(50);
  });

  it("generateSlogan returns library slogan", async () => {
    const result = await caller.generateSlogan({
      level: "大吉",
      percent: 95,
      language: "zh",
    });
    expect(result.success).toBe(true);
    expect(result.source).toBe("library");
    expect(result.slogan.length).toBeGreaterThan(4);
  });

  it("is deterministic for same level+percent", async () => {
    const a = await caller.generateSlogan({ level: "凶", percent: 20, language: "zh" });
    const b = await caller.generateSlogan({ level: "凶", percent: 20, language: "zh" });
    expect(a.slogan).toBe(b.slogan);
  });

  it("shared stats match", () => {
    expect(sloganStats().totalZh).toBeGreaterThanOrEqual(200);
  });
});
