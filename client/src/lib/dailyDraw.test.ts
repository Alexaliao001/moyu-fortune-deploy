import { describe, expect, it } from "vitest";
import {
  hashSeed,
  percentInLevelRange,
  resolveDailyDraw,
  todayKey,
} from "./dailyDraw";

describe("dailyDraw", () => {
  it("is stable for same device+date", () => {
    const a = resolveDailyDraw("device-aaa-bbbb-cccc", "2026-07-14");
    const b = resolveDailyDraw("device-aaa-bbbb-cccc", "2026-07-14");
    expect(a).toEqual(b);
  });

  it("differs across dates", () => {
    const a = resolveDailyDraw("device-aaa-bbbb-cccc", "2026-07-14");
    const b = resolveDailyDraw("device-aaa-bbbb-cccc", "2026-07-15");
    expect(a.seed).not.toBe(b.seed);
  });

  it("differs across devices", () => {
    const a = resolveDailyDraw("device-aaa", "2026-07-14");
    const b = resolveDailyDraw("device-bbb", "2026-07-14");
    expect(a.seed).not.toBe(b.seed);
  });

  it("hashSeed is deterministic", () => {
    expect(hashSeed("x")).toBe(hashSeed("x"));
  });

  it("todayKey is YYYY-MM-DD", () => {
    expect(todayKey(new Date("2026-07-14T12:00:00"))).toBe("2026-07-14");
  });

  it("percent stays in level ranges and never 0", () => {
    for (let i = 0; i < 2000; i++) {
      const r = resolveDailyDraw(`device-${i}`, "2026-07-14");
      expect(r.percent).toBeGreaterThan(0);
      expect(percentInLevelRange(r.level, r.percent)).toBe(true);
    }
  });

  it("rejects 中吉 5% style outliers", () => {
    expect(percentInLevelRange("中吉", 5)).toBe(false);
    expect(percentInLevelRange("末吉", 40)).toBe(true);
  });
});
