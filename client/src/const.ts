export { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

// Key used to persist a pending checkout tier across the OAuth redirect.
export const PENDING_CHECKOUT_KEY = "__rih_pending_checkout";

// Start the Manus OAuth login. Call this from an event handler or effect at the
// moment you want to navigate, e.g. `onClick={() => startLogin()}`.
//
// Pass `pendingTier` when the user clicked a subscribe button before signing in
// — it will be stored in sessionStorage and automatically resumed after login.
// Internal helper — builds the OAuth URL and navigates.
const _startOAuth = (type: "signIn" | "signUp", pendingTier?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const nonce = crypto.randomUUID();
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
  url.searchParams.set("type", type);
  window.location.href = url.toString();
};

// Start the Manus OAuth sign-IN flow (existing users).
// Call from event handlers: onClick={() => startLogin()}
export const startLogin = (pendingTier?: string) => _startOAuth("signIn", pendingTier);

// Start the Manus OAuth sign-UP flow (new users subscribing).
// Use this on all subscribe/join buttons so new users land on the registration
// page rather than the sign-in page. Pending tier is resumed after signup.
export const startSignup = (pendingTier?: string) => _startOAuth("signUp", pendingTier);

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
