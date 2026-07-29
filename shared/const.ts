export const COOKIE_NAME = "app_session_id";

/** @deprecated Prefer SESSION_ACCESS_MS / SESSION_REFRESH_MS — kept for gradual migration. */
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

/** Access-token lifetime (web cookie + mobile access JWT). */
export const SESSION_ACCESS_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

/** Refresh-token lifetime (mobile re-issue only). */
export const SESSION_REFRESH_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = "Please login (10001)";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// One-time nonce cookie that binds an OAuth login to the browser that started
// it. The `__Host-` prefix forces the cookie host-only (Secure, Path=/, no
// Domain), so a sibling site cannot plant a matching value in a victim's browser.
export const OAUTH_STATE_COOKIE = "__Host-oauth_state";

// `state` carries the callback redirect URI (used at token exchange) plus the
// CSRF nonce. Defined here so the client encoder and server decoder never drift.
export type OAuthState = { redirectUri: string; nonce?: string };

export const encodeOAuthState = (state: OAuthState): string =>
  btoa(JSON.stringify(state));

export const decodeOAuthState = (state: string): OAuthState => {
  let decoded: string;
  try {
    decoded = atob(state);
  } catch {
    // Malformed base64 — return no nonce so the callback's CSRF guard rejects it.
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
    // Legacy links: `state` was a bare base64(redirectUri) with no nonce.
  }
  return { redirectUri: decoded };
};
