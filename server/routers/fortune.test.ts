import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the LLM module
vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn(),
}));

import { fortuneRouter } from './fortune';
import { invokeLLM } from '../_core/llm';

describe('Fortune Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSlogan', () => {
    it('should return AI-generated slogan when LLM succeeds', async () => {
      const mockSlogan = '今天画的饼够我撑到下个世纪了，先摸为敬。';
      
      vi.mocked(invokeLLM).mockResolvedValueOnce({
        id: 'test-id',
        created: Date.now(),
        model: 'test-model',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: mockSlogan,
          },
          finish_reason: 'stop',
        }],
      });

      const caller = fortuneRouter.createCaller({} as any);
      const result = await caller.generateSlogan({
        level: '大吉',
        percent: 95,
      });

      expect(result.success).toBe(true);
      expect(result.slogan).toBe(mockSlogan);
      expect(result.source).toBe('ai');
    });

    it('should return fallback slogan when LLM returns empty content', async () => {
      vi.mocked(invokeLLM).mockResolvedValueOnce({
        id: 'test-id',
        created: Date.now(),
        model: 'test-model',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: '',
          },
          finish_reason: 'stop',
        }],
      });

      const caller = fortuneRouter.createCaller({} as any);
      const result = await caller.generateSlogan({
        level: '大吉',
        percent: 95,
      });

      expect(result.success).toBe(true);
      expect(result.slogan).toBeTruthy();
      expect(result.source).toBe('fallback');
    });

    it('should return fallback slogan when LLM throws error', async () => {
      vi.mocked(invokeLLM).mockRejectedValueOnce(new Error('LLM API Error'));

      const caller = fortuneRouter.createCaller({} as any);
      const result = await caller.generateSlogan({
        level: '中吉',
        percent: 75,
      });

      expect(result.success).toBe(true);
      expect(result.slogan).toBeTruthy();
      expect(result.source).toBe('fallback');
    });

    it('should handle all fortune levels', async () => {
      const levels = ['大吉', '中吉', '小吉', '末吉', '凶'];
      
      for (const level of levels) {
        vi.mocked(invokeLLM).mockRejectedValueOnce(new Error('Test fallback'));
        
        const caller = fortuneRouter.createCaller({} as any);
        const result = await caller.generateSlogan({
          level,
          percent: 50,
        });

        expect(result.success).toBe(true);
        expect(result.slogan).toBeTruthy();
        expect(typeof result.slogan).toBe('string');
      }
    });

    it('should use 小吉 fallback for unknown levels', async () => {
      vi.mocked(invokeLLM).mockRejectedValueOnce(new Error('Test fallback'));
      
      const caller = fortuneRouter.createCaller({} as any);
      const result = await caller.generateSlogan({
        level: '未知等级',
        percent: 50,
      });

      expect(result.success).toBe(true);
      expect(result.slogan).toBeTruthy();
      expect(result.source).toBe('fallback');
    });
  });
});
