/**
 * 本地存储用户管理
 * 用UUID替代Manus OAuth的用户ID
 */

import { v4 as uuidv4 } from 'uuid';

const USER_ID_KEY = 'moyu_user_id';
const USER_NAME_KEY = 'moyu_user_name';
const USER_AVATAR_KEY = 'moyu_user_avatar';

/**
 * 获取或创建用户ID
 */
export function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

/**
 * 获取用户名
 */
export function getUserName(): string {
  return localStorage.getItem(USER_NAME_KEY) || 'Slacker Pro';
}

/**
 * 设置用户名
 */
export function setUserName(name: string): void {
  localStorage.setItem(USER_NAME_KEY, name);
}

/**
 * 获取用户头像
 */
export function getUserAvatar(): string {
  return localStorage.getItem(USER_AVATAR_KEY) || '🐱';
}

/**
 * 设置用户头像
 */
export function setUserAvatar(avatar: string): void {
  localStorage.setItem(USER_AVATAR_KEY, avatar);
}

/**
 * 获取完整用户对象（模拟ctx.user）
 */
export function getLocalUser() {
  return {
    id: getUserId(),
    name: getUserName(),
    avatar: getUserAvatar(),
  };
}

/**
 * 清除本地用户数据
 */
export function clearLocalUser(): void {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(USER_AVATAR_KEY);
}
