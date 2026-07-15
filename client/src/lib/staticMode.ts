/** Path A/C static & backend mode helpers */
import { pickSlogan } from "@shared/slogans";

export function isFullBackend(): boolean {
  if (import.meta.env.VITE_FULL_BACKEND === "true") return true;
  const base = (import.meta.env.VITE_MOYU_API_BASE as string | undefined)?.trim();
  return Boolean(base && base !== "undefined");
}

export function isStaticMode(): boolean {
  if (isFullBackend()) return false;
  if (import.meta.env.VITE_STATIC_MODE === "true") return true;
  const portal = import.meta.env.VITE_OAUTH_PORTAL_URL;
  if (!portal || portal === "undefined") return true;
  return false;
}

/** @deprecated Prefer pickSlogan from @shared/slogans — kept for tests */
export const FALLBACK_MESSAGES_ZH = [] as string[];
export const FALLBACK_MESSAGES_EN = [] as string[];

export function pickFallbackSlogan(isEnglish: boolean, level = "小吉", seed?: number): string {
  return pickSlogan(level, isEnglish ? "en" : "zh", seed);
}
