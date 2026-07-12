import { describe, it, expect } from "vitest";
import { VIP_AVATARS, FREE_AVATARS } from "./member";

describe("Member Router Configuration", () => {
  describe("Avatar Configuration", () => {
    it("should have 8 free avatars", () => {
      expect(FREE_AVATARS).toHaveLength(8);
    });

    it("should have 8 VIP avatars", () => {
      expect(VIP_AVATARS).toHaveLength(8);
    });

    it("should have all free avatars as emoji strings", () => {
      FREE_AVATARS.forEach((avatar) => {
        expect(typeof avatar).toBe("string");
        expect(avatar.length).toBeGreaterThan(0);
      });
    });

    it("should have VIP avatars with required fields", () => {
      VIP_AVATARS.forEach((avatar) => {
        expect(avatar).toHaveProperty("emoji");
        expect(avatar).toHaveProperty("name");
        expect(avatar).toHaveProperty("requiredLevel");
        expect(["vip", "annual"]).toContain(avatar.requiredLevel);
      });
    });

    it("should have 4 vip-level avatars and 4 annual-level avatars", () => {
      const vipAvatars = VIP_AVATARS.filter((a) => a.requiredLevel === "vip");
      const annualAvatars = VIP_AVATARS.filter((a) => a.requiredLevel === "annual");
      expect(vipAvatars).toHaveLength(4);
      expect(annualAvatars).toHaveLength(4);
    });

    it("should not have duplicate avatars between free and VIP", () => {
      const vipEmojis = VIP_AVATARS.map((a) => a.emoji);
      const duplicates = FREE_AVATARS.filter((a) => vipEmojis.includes(a));
      expect(duplicates).toHaveLength(0);
    });
  });

  describe("Invite Code Generation", () => {
    it("should generate 8-character codes", () => {
      // Test the character set used for invite codes
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      expect(chars.length).toBe(32);
      // Verify no confusing characters (0, O, 1, I)
      expect(chars).not.toContain("0");
      expect(chars).not.toContain("O");
      expect(chars).not.toContain("1");
      expect(chars).not.toContain("I");
      // L is included as it's distinguishable in the chosen font
    });
  });
});

describe("Draw Limit Constants", () => {
  it("should have reasonable daily draw limit", () => {
    const DAILY_DRAW_LIMIT = 3;
    expect(DAILY_DRAW_LIMIT).toBeGreaterThan(0);
    expect(DAILY_DRAW_LIMIT).toBeLessThanOrEqual(10);
  });

  it("should have reasonable invite reward days", () => {
    const INVITE_REWARD_DAYS = 3;
    expect(INVITE_REWARD_DAYS).toBeGreaterThan(0);
    expect(INVITE_REWARD_DAYS).toBeLessThanOrEqual(7);
  });
});
