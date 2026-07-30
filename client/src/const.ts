export { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

// Key used to persist a pending checkout tier across the OAuth redirect.
export const PENDING_CHECKOUT_KEY = "__rih_pending_checkout";

// Start the Manus OAuth login. Call this from an event handler or effect at the
// moment you want to navigate, e.g. `onClick={() => startLogin()}`.
//
// Pass `pendingTier` when the user clicked a subscribe button before signing in
// — it will be stored in sessionStorage and automatically resumed after login.
export const startLogin = (pendingTier?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const nonce = crypto.randomUUID();
  // Store the CSRF nonce in sessionStorage. sessionStorage persists across
  // same-origin navigations (including the OAuth redirect back from manus.im)
  // and is far more reliable than SameSite=None cookies, which are blocked by
  // many browsers on cross-site top-level redirects.
  try {
    sessionStorage.setItem('__oauth_nonce', nonce);
    if (pendingTier) {
      sessionStorage.setItem(PENDING_CHECKOUT_KEY, pendingTier);
    } else {
      sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
    }
  } catch { /* private mode */ }
  const state = btoa(JSON.stringify({ redirectUri, nonce }));
  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  window.location.href = url.toString();
};

// Legacy helper kept for any remaining href usages — generates a URL without
// CSRF protection. Prefer startLogin() for all new sign-in triggers.
// @deprecated Use startLogin() instead.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(JSON.stringify({ redirectUri }));
  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
};
