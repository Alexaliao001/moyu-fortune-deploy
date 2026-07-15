/**
 * MoYu slogan library — AGENTS.md P1-2.
 * Tiers: 大吉 / 吉 / 平 / 凶 · each ≥50 · zh-first.
 */
import raw from "./slogans.json";

export type SloganTier = "大吉" | "吉" | "平" | "凶";

const DATA = raw as {
  zh: Record<SloganTier, string[]>;
  en: Record<SloganTier, string[]>;
};

/** Map product draw levels → slogan tiers. */
export function levelToTier(level: string): SloganTier {
  switch (level) {
    case "大吉":
      return "大吉";
    case "中吉":
    case "小吉":
    case "吉":
      return "吉";
    case "末吉":
    case "平":
      return "平";
    case "凶":
    case "小凶":
      return "凶";
    default:
      return "平";
  }
}

export function sloganPool(
  level: string,
  lang: "zh" | "en" = "zh"
): string[] {
  const tier = levelToTier(level);
  const pack = lang === "en" ? DATA.en : DATA.zh;
  return pack[tier] || pack["平"] || [];
}

/** Deterministic pick when seed provided; else random. */
export function pickSlogan(
  level: string,
  lang: "zh" | "en" = "zh",
  seed?: number
): string {
  const pool = sloganPool(level, lang);
  if (!pool.length) return lang === "en" ? "Slack gently today." : "今天先喘口气。";
  if (seed == null || !Number.isFinite(seed)) {
    return pool[Math.floor(Math.random() * pool.length)]!;
  }
  return pool[Math.abs(Math.floor(seed)) % pool.length]!;
}

export function sloganStats() {
  return {
    zh: Object.fromEntries(
      (Object.keys(DATA.zh) as SloganTier[]).map(k => [k, DATA.zh[k].length])
    ),
    en: Object.fromEntries(
      (Object.keys(DATA.en) as SloganTier[]).map(k => [k, DATA.en[k].length])
    ),
    totalZh: (Object.values(DATA.zh) as string[][]).reduce((s, a) => s + a.length, 0),
  };
}
