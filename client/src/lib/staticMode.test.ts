import { describe, it, expect } from "vitest";
import { pickFallbackSlogan } from "./staticMode";
import { sloganStats, pickSlogan, levelToTier } from "@shared/slogans";

describe("P1-2 slogan library", () => {
  it("has ≥50 per tier and ≥200 total (zh)", () => {
    const s = sloganStats();
    expect(s.zh["大吉"]).toBeGreaterThanOrEqual(50);
    expect(s.zh["吉"]).toBeGreaterThanOrEqual(50);
    expect(s.zh["平"]).toBeGreaterThanOrEqual(50);
    expect(s.zh["凶"]).toBeGreaterThanOrEqual(50);
    expect(s.totalZh).toBeGreaterThanOrEqual(200);
  });

  it("maps draw levels to tiers", () => {
    expect(levelToTier("大吉")).toBe("大吉");
    expect(levelToTier("中吉")).toBe("吉");
    expect(levelToTier("小吉")).toBe("吉");
    expect(levelToTier("末吉")).toBe("平");
    expect(levelToTier("凶")).toBe("凶");
  });

  it("pick is deterministic with seed", () => {
    expect(pickSlogan("大吉", "zh", 42)).toBe(pickSlogan("大吉", "zh", 42));
  });

  it("pickFallbackSlogan returns non-empty", () => {
    expect(pickFallbackSlogan(false, "小吉", 1).length).toBeGreaterThan(4);
    expect(pickFallbackSlogan(true, "凶", 2).length).toBeGreaterThan(4);
  });
});
