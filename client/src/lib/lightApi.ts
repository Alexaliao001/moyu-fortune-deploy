import { isFullBackend } from "@/lib/staticMode";

/** Path B light API client — chillworks.ai → moyu-fortune.onrender.com */

export type LightDraw = {
  id: string;
  deviceId: string;
  name: string;
  level: string;
  emoji: string;
  percent: number;
  message: string;
  suggestedTime: string;
  avatar: string;
  createdAt: string;
};

export type LightFeedback = {
  id: string;
  deviceId: string;
  type: "bug" | "feature" | "suggestion" | "other";
  content: string;
  contact: string;
  userAgent: string;
  createdAt: string;
};

export type LightInviteBundle = {
  inviteCode: string;
  ownerDeviceId: string;
  createdAt: string;
  totalInvites: number;
  claimedRewards: number;
  pendingRewards: number;
  inviteList: Array<{
    id: string;
    inviteeName: string;
    rewardDays: number;
    rewardClaimed: boolean;
    createdAt: string;
  }>;
};

export type LightProfile = {
  deviceId: string;
  name: string;
  avatar: string;
  streak: number;
  lastDate: string;
  totalDraws: number;
  inviteCode: string | null;
};

export function getLightApiBase(): string | null {
  const raw = (import.meta.env.VITE_MOYU_API_BASE as string | undefined)?.trim();
  if (!raw || raw === "undefined") return null;
  return raw.replace(/\/$/, "");
}

export function hasLightApi(): boolean {
  // Path C full tRPC owns product APIs; keep light only for Path B static builds
  if (isFullBackend()) return false;
  return Boolean(getLightApiBase());
}

type LightResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function lightFetchRaw<T>(
  path: string,
  init?: RequestInit
): Promise<LightResult<T>> {
  const base = getLightApiBase();
  if (!base) return { ok: false, error: "no_api_base" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        ...(init?.headers || {}),
      },
    });
    const json = (await res.json().catch(() => null)) as
      | (T & { ok?: boolean; error?: string })
      | null;
    if (!res.ok || !json || json.ok === false) {
      return {
        ok: false,
        error: (json && json.error) || `http_${res.status}`,
      };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "network_error",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function lightFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T | null> {
  const result = await lightFetchRaw<T>(path, init);
  return result.ok ? result.data : null;
}

export async function lightRecordDraw(input: {
  deviceId: string;
  name?: string;
  level: string;
  emoji: string;
  percent: number;
  message?: string;
  suggestedTime?: string;
  avatar?: string;
}): Promise<LightDraw | null> {
  const data = await lightFetch<{ ok: boolean; draw: LightDraw }>(
    "/api/light/draw",
    {
      method: "POST",
      body: JSON.stringify(input),
      headers: {
        "X-Device-Id": input.deviceId,
        "X-Device-Name": input.name || "摸鱼达人",
      },
    }
  );
  return data?.ok ? data.draw : null;
}

export async function lightGetHistory(
  deviceId: string,
  limit = 30
): Promise<LightDraw[]> {
  const q = new URLSearchParams({
    deviceId,
    limit: String(limit),
  });
  const data = await lightFetch<{ ok: boolean; history: LightDraw[] }>(
    `/api/light/history?${q}`
  );
  return data?.ok ? data.history : [];
}

export async function lightGetLeaderboard(limit = 30): Promise<{
  streak: Array<{
    rank: number;
    deviceId: string;
    name: string;
    streak: number;
    lastDate: string;
  }>;
  weekly: Array<{
    rank: number;
    deviceId: string;
    name: string;
    bestPercent: number;
    level: string;
    emoji: string;
  }>;
  global: { totalDraws: number; uniqueDevices: number };
} | null> {
  const data = await lightFetch<{
    ok: boolean;
    streak: Array<{
      rank: number;
      deviceId: string;
      name: string;
      streak: number;
      lastDate: string;
    }>;
    weekly: Array<{
      rank: number;
      deviceId: string;
      name: string;
      bestPercent: number;
      level: string;
      emoji: string;
    }>;
    global: { totalDraws: number; uniqueDevices: number };
  }>(`/api/light/leaderboard?limit=${limit}`);
  return data?.ok
    ? { streak: data.streak, weekly: data.weekly, global: data.global }
    : null;
}

export async function lightSubmitFeedback(input: {
  deviceId?: string;
  type: "bug" | "feature" | "suggestion" | "other";
  content: string;
  contact?: string;
  userAgent?: string;
}): Promise<LightResult<LightFeedback>> {
  const result = await lightFetchRaw<{ ok: boolean; feedback: LightFeedback }>(
    "/api/light/feedback",
    {
      method: "POST",
      body: JSON.stringify(input),
      headers: input.deviceId ? { "X-Device-Id": input.deviceId } : {},
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.feedback };
}

export async function lightGetInvite(
  deviceId: string
): Promise<LightInviteBundle | null> {
  const q = new URLSearchParams({ deviceId });
  const data = await lightFetch<LightInviteBundle & { ok: boolean }>(
    `/api/light/invite?${q}`,
    { headers: { "X-Device-Id": deviceId } }
  );
  return data?.ok ? data : null;
}

export async function lightApplyInvite(input: {
  deviceId: string;
  inviteCode: string;
  name?: string;
}): Promise<LightResult<{ inviterName: string; rewardDays: number; invitationId: string }>> {
  const result = await lightFetchRaw<{
    ok: boolean;
    inviterName: string;
    rewardDays: number;
    invitationId: string;
  }>("/api/light/invite", {
    method: "POST",
    body: JSON.stringify({ action: "apply", ...input }),
    headers: { "X-Device-Id": input.deviceId },
  });
  if (!result.ok) return result;
  return {
    ok: true,
    data: {
      inviterName: result.data.inviterName,
      rewardDays: result.data.rewardDays,
      invitationId: result.data.invitationId,
    },
  };
}

export async function lightClaimInviteReward(input: {
  deviceId: string;
  invitationId: string;
}): Promise<LightResult<{ rewardDays: number }>> {
  const result = await lightFetchRaw<{ ok: boolean; rewardDays: number }>(
    "/api/light/invite",
    {
      method: "POST",
      body: JSON.stringify({ action: "claim", ...input }),
      headers: { "X-Device-Id": input.deviceId },
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: { rewardDays: result.data.rewardDays } };
}

export async function lightGetProfile(
  deviceId: string
): Promise<LightProfile | null> {
  const q = new URLSearchParams({ deviceId });
  const data = await lightFetch<{ ok: boolean; profile: LightProfile }>(
    `/api/light/profile?${q}`,
    { headers: { "X-Device-Id": deviceId } }
  );
  return data?.ok ? data.profile : null;
}
