/**
 * Deterministic daily draw — AGENTS.md 铁律 2/3.
 * seed = hash(deviceId + YYYY-MM-DD); same device+day → same result.
 */

export type DailyDrawResult = {
  level: string;
  emoji: string;
  percent: number;
  date: string;
  seed: number;
};

const FORTUNES = [
  { level: "大吉", emoji: "✨", minPercent: 85, maxPercent: 99, weight: 5 },
  { level: "中吉", emoji: "🌟", minPercent: 70, maxPercent: 84, weight: 20 },
  { level: "小吉", emoji: "🐟", minPercent: 55, maxPercent: 69, weight: 35 },
  { level: "末吉", emoji: "🍃", minPercent: 35, maxPercent: 54, weight: 25 },
  { level: "凶", emoji: "💨", minPercent: 10, maxPercent: 34, weight: 15 },
] as const;

/** Sign-level percent ranges — for UI + §7 smoke assertions. */
export const LEVEL_PERCENT_RANGES: Record<string, { min: number; max: number }> =
  Object.fromEntries(
    FORTUNES.map(f => [f.level, { min: f.minPercent, max: f.maxPercent }])
  );

export function yesterdayKey(d = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return todayKey(y);
}

export function percentInLevelRange(level: string, percent: number): boolean {
  const r = LEVEL_PERCENT_RANGES[level];
  if (!r) return percent > 0 && percent <= 100;
  return percent >= r.min && percent <= r.max;
}

/** FNV-1a 32-bit — sync, no crypto deps, stable across browsers. */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Mulberry32 PRNG from seed. */
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function resolveDailyDraw(deviceId: string, date = todayKey()): DailyDrawResult {
  const seed = hashSeed(`${deviceId}|${date}`);
  const rand = rng(seed);

  const totalWeight = FORTUNES.reduce((s, f) => s + f.weight, 0);
  let pick = rand() * totalWeight;
  let selected: (typeof FORTUNES)[number] = FORTUNES[0]!;
  for (const f of FORTUNES) {
    pick -= f.weight;
    if (pick <= 0) {
      selected = f;
      break;
    }
  }

  const span = selected.maxPercent - selected.minPercent + 1;
  const percent = selected.minPercent + Math.floor(rand() * span);

  return {
    level: selected.level,
    emoji: selected.emoji,
    percent,
    date,
    seed,
  };
}

/** Warm backend without blocking UI (铁律 2). */
export function warmupBackend(baseUrl?: string): void {
  const base =
    baseUrl ||
    (typeof import.meta !== "undefined" &&
      (import.meta.env.VITE_MOYU_API_BASE as string | undefined)?.trim()) ||
    "";
  if (!base || base === "undefined") return;
  const url = `${base.replace(/\/$/, "")}/health`;
  try {
    void fetch(url, { method: "GET", mode: "cors", cache: "no-store" }).catch(
      () => undefined
    );
  } catch {
    /* ignore */
  }
}
