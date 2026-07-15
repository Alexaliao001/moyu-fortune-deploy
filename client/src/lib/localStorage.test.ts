import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getUserId,
  getUserName,
  getUserAvatar,
  setUserName,
  setUserAvatar,
  getLocalUser,
  clearLocalUser,
} from './localStorage';

const memoryStore = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
  removeItem: (key: string) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
});

describe('localStorage User Management', () => {
  beforeEach(() => {
    // 清空localStorage
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should generate and store a UUID for new user', () => {
    const userId = getUserId();
    expect(userId).toBeDefined();
    expect(userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    
    // 第二次调用应该返回相同的ID
    const userId2 = getUserId();
    expect(userId2).toBe(userId);
  });

  it('should get default user name', () => {
    const name = getUserName();
    expect(name).toBe('Slacker Pro');
  });

  it('should set and get user name', () => {
    setUserName('Test User');
    expect(getUserName()).toBe('Test User');
  });

  it('should get default user avatar', () => {
    const avatar = getUserAvatar();
    expect(avatar).toBe('🐱');
  });

  it('should set and get user avatar', () => {
    setUserAvatar('🐶');
    expect(getUserAvatar()).toBe('🐶');
  });

  it('should return complete user object', () => {
    setUserName('Alice');
    setUserAvatar('🦊');
    
    const user = getLocalUser();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name', 'Alice');
    expect(user).toHaveProperty('avatar', '🦊');
  });

  it('should clear all user data', () => {
    setUserName('Bob');
    setUserAvatar('🐻');
    
    clearLocalUser();
    
    // 清空后应该生成新的ID
    const newUserId = getUserId();
    expect(newUserId).toBeDefined();
    
    // 名字和头像应该恢复默认值
    expect(getUserName()).toBe('Slacker Pro');
    expect(getUserAvatar()).toBe('🐱');
  });

  it('should persist user data across calls', () => {
    const originalId = getUserId();
    setUserName('Persistent User');
    setUserAvatar('🐸');
    
    // 模拟新的会话
    const newId = getUserId();
    expect(newId).toBe(originalId);
    expect(getUserName()).toBe('Persistent User');
    expect(getUserAvatar()).toBe('🐸');
  });
});
