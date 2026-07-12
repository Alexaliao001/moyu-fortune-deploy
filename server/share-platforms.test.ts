import { describe, it, expect } from 'vitest';

/**
 * 测试分享渠道按语言/地区的分配逻辑
 * 验证中文版只显示国内App，英文版只显示海外App
 */

// 模拟前端的分享平台配置逻辑
const SHARE_PLATFORMS_ZH = [
  { id: 'wechat', color: '#07C160' },
  { id: 'weibo', color: '#E6162D' },
  { id: 'qq', color: '#12B7F5' },
];

const SHARE_PLATFORMS_EN = [
  { id: 'x', color: '#fff' },
  { id: 'whatsapp', color: '#25D366' },
  { id: 'telegram', color: '#2AABEE' },
];

function getPlatforms(language: string) {
  const isEnglish = language === 'en' || language.startsWith('en');
  return isEnglish ? SHARE_PLATFORMS_EN : SHARE_PLATFORMS_ZH;
}

// 中文版不应出现的海外平台
const BLOCKED_IN_ZH = ['x', 'whatsapp', 'telegram', 'reddit', 'facebook'];
// 英文版不应出现的国内平台
const BLOCKED_IN_EN = ['wechat', 'weibo', 'qq', 'douyin'];

describe('Share Platforms by Language', () => {
  it('中文版只显示国内常用App', () => {
    const platforms = getPlatforms('zh');
    const ids = platforms.map(p => p.id);
    
    expect(ids).toContain('wechat');
    expect(ids).toContain('weibo');
    expect(ids).toContain('qq');
    
    for (const blocked of BLOCKED_IN_ZH) {
      expect(ids).not.toContain(blocked);
    }
  });

  it('英文版优先显示海外常用App', () => {
    const platforms = getPlatforms('en');
    const ids = platforms.map(p => p.id);
    
    expect(ids).toContain('x');
    expect(ids).toContain('whatsapp');
    expect(ids).toContain('telegram');
    
    for (const blocked of BLOCKED_IN_EN) {
      expect(ids).not.toContain(blocked);
    }
  });

  it('英文版X/Twitter排在第一位', () => {
    const platforms = getPlatforms('en');
    expect(platforms[0].id).toBe('x');
  });

  it('中文版微信排在第一位', () => {
    const platforms = getPlatforms('zh');
    expect(platforms[0].id).toBe('wechat');
  });

  it('en-US等英文变体也走英文渠道', () => {
    const platforms = getPlatforms('en-US');
    const ids = platforms.map(p => p.id);
    expect(ids).toContain('x');
    expect(ids).not.toContain('wechat');
  });

  it('zh-CN走中文渠道', () => {
    const platforms = getPlatforms('zh-CN');
    const ids = platforms.map(p => p.id);
    expect(ids).toContain('wechat');
    expect(ids).not.toContain('x');
  });

  it('每个语言版本恰好3个分享渠道', () => {
    expect(getPlatforms('zh').length).toBe(3);
    expect(getPlatforms('en').length).toBe(3);
  });
});
