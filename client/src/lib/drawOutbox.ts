/**
 * Local outbox for daily draw ledger writes (AGENTS.md 铁律 2).
 * Mirror analytics.ts queue: enqueue always, flush when online.
 */
import { getUserId, getUserName } from "./localStorage";
import { todayKey } from "./dailyDraw";

const QUEUE_KEY = "moyu_draw_outbox";
const MAX_ITEMS = 30;

export type DrawOutboxItem = {
  deviceId: string;
  name: string;
  date: string;
  level: string;
  emoji: string;
  percent: number;
  message?: string;
  suggestedTime?: string;
  avatar?: string;
  t: number;
};

function apiBase(): string {
  const base = (import.meta.env.VITE_MOYU_API_BASE as string | undefined)?.trim();
  if (base && base !== "undefined") return base.replace(/\/$/, "");
  return "";
}

function readQueue(): DrawOutboxItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as DrawOutboxItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(q: DrawOutboxItem[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_ITEMS)));
  } catch {
    /* ignore */
  }
}

/** Upsert one logical day into local queue (same device+date replaces). */
export function enqueueDraw(
  item: Omit<DrawOutboxItem, "deviceId" | "name" | "date" | "t"> & {
    date?: string;
  }
): void {
  const deviceId = getUserId();
  const date = item.date || todayKey();
  const entry: DrawOutboxItem = {
    deviceId,
    name: getUserName(),
    date,
    level: item.level,
    emoji: item.emoji,
    percent: item.percent,
    message: item.message,
    suggestedTime: item.suggestedTime,
    avatar: item.avatar,
    t: Date.now(),
  };
  const q = readQueue().filter(
    x => !(x.deviceId === deviceId && x.date === date)
  );
  q.push(entry);
  writeQueue(q);
}

async function postRecordDraw(item: DrawOutboxItem): Promise<boolean> {
  const base = apiBase();
  if (!base) return false;

  // tRPC HTTP batch shape (matches client link: ?batch=1 + {"0":{json}})
  const url = `${base}/api/trpc/member.recordDraw?batch=1`;
  const body = {
    "0": {
      json: {
        deviceId: item.deviceId,
        name: item.name,
        date: item.date,
        level: item.level,
        emoji: item.emoji,
        percent: item.percent,
        message: item.message,
        suggestedTime: item.suggestedTime,
        avatar: item.avatar,
      },
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": item.deviceId,
        "X-Device-Name": item.name,
      },
      body: JSON.stringify(body),
      mode: "cors",
      credentials: "omit",
      keepalive: true,
    });
    if (!res.ok) return false;
    const json = (await res.json()) as
      | Array<{ error?: unknown; result?: unknown }>
      | { error?: unknown; result?: unknown };
    const item0 = Array.isArray(json) ? json[0] : json;
    return Boolean(item0 && !item0.error && item0.result);
  } catch {
    return false;
  }
}

export async function flushDrawOutbox(): Promise<void> {
  const q = readQueue();
  if (!q.length) return;

  const remaining: DrawOutboxItem[] = [];
  for (const item of q) {
    const ok = await postRecordDraw(item);
    if (!ok) remaining.push(item);
  }
  if (remaining.length) writeQueue(remaining);
  else {
    try {
      localStorage.removeItem(QUEUE_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Boot / online hook. */
export function initDrawOutbox(): void {
  void flushDrawOutbox();
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      void flushDrawOutbox();
    });
  }
}
