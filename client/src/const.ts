export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** True only when OAuth portal + app id are real build-time values. */
export function isOAuthConfigured(): boolean {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  if (!oauthPortalUrl || !appId) return false;
  if (String(oauthPortalUrl) === "undefined" || String(appId) === "undefined") return false;
  if (!String(oauthPortalUrl).startsWith("http")) return false;
  return true;
}

/**
 * Login URL for legacy Manus/OAuth portal.
 * Returns null when not configured — **never** throws `new URL("undefined/…")`.
 * Path A (static): always null; callers must show honest degrade UX.
 */
export const getLoginUrl = (): string | null => {
  if (!isOAuthConfigured()) return null;

  const oauthPortalUrl = String(import.meta.env.VITE_OAUTH_PORTAL_URL);
  const appId = String(import.meta.env.VITE_APP_ID);
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  try {
    const url = new URL(`${oauthPortalUrl.replace(/\/$/, "")}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch {
    return null;
  }
};
