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
