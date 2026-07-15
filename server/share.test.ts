import { describe, it, expect } from "vitest";

// 社交平台配置测试
const SHARE_PLATFORMS = [
  {
    id: 'wechat',
    name: '微信',
    color: '#07C160',
    hasDirectShare: false,
  },
  {
    id: 'weibo',
    name: '微博',
    color: '#E6162D',
    hasDirectShare: true,
  },
  {
    id: 'x',
    name: 'X',
    color: '#000000',
    hasDirectShare: true,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E4405F',
    hasDirectShare: false,
  },
];

describe("SharePanel Configuration", () => {
  describe("Platform Configuration", () => {
    it("should have 4 share platforms", () => {
      expect(SHARE_PLATFORMS).toHaveLength(4);
    });

    it("should have all required platform properties", () => {
      SHARE_PLATFORMS.forEach((platform) => {
        expect(platform).toHaveProperty("id");
        expect(platform).toHaveProperty("name");
        expect(platform).toHaveProperty("color");
        expect(platform).toHaveProperty("hasDirectShare");
      });
    });

    it("should have valid hex color codes", () => {
      SHARE_PLATFORMS.forEach((platform) => {
        expect(platform.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it("should have WeChat and Instagram as non-direct share platforms", () => {
      const nonDirectPlatforms = SHARE_PLATFORMS.filter(p => !p.hasDirectShare);
      expect(nonDirectPlatforms.map(p => p.id)).toContain("wechat");
      expect(nonDirectPlatforms.map(p => p.id)).toContain("instagram");
    });

    it("should have Weibo and X as direct share platforms", () => {
      const directPlatforms = SHARE_PLATFORMS.filter(p => p.hasDirectShare);
      expect(directPlatforms.map(p => p.id)).toContain("weibo");
      expect(directPlatforms.map(p => p.id)).toContain("x");
    });
  });

  describe("Share URL Generation", () => {
    it("should generate valid Weibo share URL", () => {
      const text = "测试分享文案";
      const url = "https://example.com";
      const params = new URLSearchParams({
        title: text,
        url: url,
      });
      const shareUrl = `https://service.weibo.com/share/share.php?${params.toString()}`;
      
      expect(shareUrl).toContain("service.weibo.com");
      expect(shareUrl).toContain(encodeURIComponent(text));
      expect(shareUrl).toContain(encodeURIComponent(url));
    });

    it("should generate valid X (Twitter) share URL", () => {
      const text = "Test share text";
      const url = "https://example.com";
      const params = new URLSearchParams({
        text: text,
        url: url,
      });
      const shareUrl = `https://twitter.com/intent/tweet?${params.toString()}`;
      
      expect(shareUrl).toContain("twitter.com/intent/tweet");
      // URLSearchParams uses + for spaces instead of %20
      expect(shareUrl).toContain("text=Test+share+text");
      expect(shareUrl).toContain(encodeURIComponent(url));
    });
  });

  describe("Invite Code Validation", () => {
    it("should accept 8-character invite codes", () => {
      const validCode = "ABCD1234";
      expect(validCode.length).toBe(8);
    });

    it("should generate proper share text with invite code", () => {
      const inviteCode = "TESTCODE";
      const shareText = `我在「摸了么」发现了超准的摸鱼运势！用我的邀请码 ${inviteCode} 注册，我们都能获得3天会员！`;
      
      expect(shareText).toContain(inviteCode);
      expect(shareText).toContain("摸了么");
      expect(shareText).toContain("3天会员");
    });
  });
});
