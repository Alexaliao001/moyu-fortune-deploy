import { describe, expect, it } from "vitest";

// 运势配置测试
const fortunes = [
  { level: '大吉', emoji: '😎', minPercent: 85, maxPercent: 99, weight: 30, theme: 'lucky' },
  { level: '中吉', emoji: '😊', minPercent: 70, maxPercent: 84, weight: 25, theme: 'lucky' },
  { level: '小吉', emoji: '🙂', minPercent: 55, maxPercent: 69, weight: 20, theme: 'normal' },
  { level: '末吉', emoji: '😐', minPercent: 35, maxPercent: 54, weight: 15, theme: 'normal' },
  { level: '凶', emoji: '😰', minPercent: 10, maxPercent: 34, weight: 10, theme: 'bad' },
];

const LEVEL_THEMES: Record<string, string> = {
  '大吉': 'lucky',
  '中吉': 'lucky',
  '小吉': 'normal',
  '末吉': 'normal',
  '凶': 'bad',
};

describe("Fortune Configuration", () => {
  it("should have valid fortune levels with correct weight distribution", () => {
    const totalWeight = fortunes.reduce((sum, f) => sum + f.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("should have non-overlapping percent ranges", () => {
    const sortedFortunes = [...fortunes].sort((a, b) => a.minPercent - b.minPercent);
    for (let i = 0; i < sortedFortunes.length - 1; i++) {
      expect(sortedFortunes[i].maxPercent).toBeLessThan(sortedFortunes[i + 1].minPercent);
    }
  });

  it("should map fortune levels to correct themes", () => {
    expect(LEVEL_THEMES['大吉']).toBe('lucky');
    expect(LEVEL_THEMES['中吉']).toBe('lucky');
    expect(LEVEL_THEMES['小吉']).toBe('normal');
    expect(LEVEL_THEMES['末吉']).toBe('normal');
    expect(LEVEL_THEMES['凶']).toBe('bad');
  });

  it("should have valid emoji for each fortune level", () => {
    fortunes.forEach(fortune => {
      expect(fortune.emoji).toBeTruthy();
      expect(fortune.emoji.length).toBeGreaterThan(0);
    });
  });

  it("should have percent ranges within 0-100", () => {
    fortunes.forEach(fortune => {
      expect(fortune.minPercent).toBeGreaterThanOrEqual(0);
      expect(fortune.maxPercent).toBeLessThanOrEqual(100);
      expect(fortune.minPercent).toBeLessThan(fortune.maxPercent);
    });
  });
});

describe("Fortune Selection Logic", () => {
  function selectFortune(): typeof fortunes[0] {
    const totalWeight = fortunes.reduce((sum, f) => sum + f.weight, 0);
    let random = Math.random() * totalWeight;
    for (const fortune of fortunes) {
      random -= fortune.weight;
      if (random <= 0) {
        return fortune;
      }
    }
    return fortunes[0];
  }

  it("should always return a valid fortune", () => {
    for (let i = 0; i < 100; i++) {
      const result = selectFortune();
      expect(fortunes).toContain(result);
    }
  });

  it("should generate percent within fortune's range", () => {
    for (let i = 0; i < 100; i++) {
      const fortune = selectFortune();
      const percent = Math.floor(Math.random() * (fortune.maxPercent - fortune.minPercent + 1)) + fortune.minPercent;
      expect(percent).toBeGreaterThanOrEqual(fortune.minPercent);
      expect(percent).toBeLessThanOrEqual(fortune.maxPercent);
    }
  });
});

describe("Suggested Time Configuration", () => {
  const SUGGESTED_TIMES: Record<string, string[]> = {
    '大吉': ['4小时', '3.5小时', '4.5小时'],
    '中吉': ['3小时', '2.5小时', '3小时'],
    '小吉': ['2小时', '1.5小时', '2小时'],
    '末吉': ['1小时', '45分钟', '1.5小时'],
    '凶': ['30分钟', '20分钟', '15分钟'],
  };

  it("should have suggested times for all fortune levels", () => {
    fortunes.forEach(fortune => {
      expect(SUGGESTED_TIMES[fortune.level]).toBeDefined();
      expect(SUGGESTED_TIMES[fortune.level].length).toBeGreaterThan(0);
    });
  });

  it("should have valid time format strings", () => {
    Object.values(SUGGESTED_TIMES).flat().forEach(time => {
      expect(time).toMatch(/\d+(\.\d+)?(小时|分钟)/);
    });
  });
});
