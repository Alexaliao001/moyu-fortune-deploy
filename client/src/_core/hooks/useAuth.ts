import { getUserId, getUserName } from "@/lib/localStorage";
import { isFullBackend } from "@/lib/staticMode";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useRef } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(_options?: UseAuthOptions) {
  const full = isFullBackend();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: full,
    retry: 0,
    staleTime: 30_000,
  });

  const registerGuest = trpc.auth.registerGuest.useMutation({
    onSuccess: () => {
      void meQuery.refetch();
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      void meQuery.refetch();
    },
  });

  const booted = useRef(false);

  useEffect(() => {
    if (!full || booted.current || meQuery.isLoading || meQuery.data) return;
    booted.current = true;
    registerGuest.mutate({
      deviceId: getUserId(),
      name: getUserName(),
    });
  }, [full, meQuery.isLoading, meQuery.data, registerGuest]);

  const user = useMemo(() => {
    if (!full) {
      return {
        id: getUserId(),
        name: getUserName(),
        avatar: localStorage.getItem("moyu_user_avatar") || "🐱",
        role: "user" as const,
      };
    }
    const u = meQuery.data;
    if (!u) return null;
    return {
      id: String(u.id),
      name: u.name || getUserName(),
      avatar: localStorage.getItem("moyu_user_avatar") || "🐱",
      role: u.role,
      email: u.email ?? undefined,
    };
  }, [full, meQuery.data]);

  const refresh = useCallback(async () => {
    if (full) await meQuery.refetch();
  }, [full, meQuery]);

  const logout = useCallback(async () => {
    if (full) {
      await logoutMutation.mutateAsync();
    }
    return { success: true };
  }, [full, logoutMutation]);

  return {
    user,
    loading: full ? meQuery.isLoading || registerGuest.isPending : false,
    error: full ? meQuery.error : null,
    isAuthenticated: full ? Boolean(meQuery.data) : true,
    refresh,
    logout,
    registerGuest,
  };
}
