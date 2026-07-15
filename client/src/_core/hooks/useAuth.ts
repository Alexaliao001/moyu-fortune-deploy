import { getUserId, getUserName, getUserAvatar, getLocalUser } from "@/lib/localStorage";
import { useCallback, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  // 已移除OAuth，所有用户都直接从localStorage获取
  const user = useMemo(() => {
    return {
      id: getUserId(),
      name: getUserName(),
      avatar: getUserAvatar(),
      role: 'user' as const,
    };
  }, []);

  const logout = useCallback(async () => {
    // 无需登出操作，本地存储会保留
    return { success: true };
  }, []);

  const state = useMemo(() => {
    return {
      user,
      loading: false,
      error: null,
      isAuthenticated: true, // 总是已认证（本地用户）
    };
  }, [user]);

  return {
    ...state,
    refresh: () => Promise.resolve(),
    logout,
  };
}
