/**
 * Rise In Harmony — Mobile API Client
 *
 * Thin wrapper around fetch that:
 * - Attaches the JWT Bearer token from the auth store
 * - Handles token refresh on 401
 * - Provides typed request/response helpers
 *
 * The API base URL is set via app.json extra.apiUrl and overridden
 * per build profile via EAS environment variables.
 */

import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import type { ApiResponse, User } from "@rih/shared-types";

const API_BASE_URL: string =
  Constants.expoConfig?.extra?.apiUrl ?? "https://www.riseinharmony.com";

const TOKEN_KEY = "rih_jwt_token";
const REFRESH_KEY = "rih_refresh_token";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!refresh) return null;

  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { accessToken?: string };
  if (data.accessToken) {
    await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
    return data.accessToken;
  }
  return null;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(options.headers ?? {}),
    },
  });

  // Attempt token refresh on 401
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryRes = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
          ...(options.headers ?? {}),
        },
      });
      const retryData = await retryRes.json();
      return retryData as ApiResponse<T>;
    }
    return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
  }

  const data = await res.json();
  return data as ApiResponse<T>;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};

/**
 * Fetch the currently authenticated user's profile. Relies on the Bearer token
 * attached by `apiRequest` (which also transparently refreshes on 401).
 * The path must match the backend auth route namespace (`/api/auth/*`).
 */
export function getCurrentUser() {
  return api.get<User>("/api/auth/me");
}
