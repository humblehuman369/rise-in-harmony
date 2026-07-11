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

/**
 * Resolve a host-relative asset path (e.g. "/sounds/binaural-528.mp3") to an
 * absolute URL on the web host. Used for streamed audio assets.
 */
export function resolveAssetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

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

// ─── Precision Player Sounds API ─────────────────────────────────────────────
// These helpers call the tRPC sounds router via the batch endpoint.
// They are used by the Precision Player screen to sync favorites server-side.

export interface ServerSound {
  id: number;
  name: string;
  freqL: number;
  beatHz: number | null;
  isoRate: number | null;
  isoDuty: number | null;
  waveform: string;
  mode: string;
  toneVolume: number;
  backgroundType: string;
  backgroundKey: string | null;
  backgroundVolume: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSoundInput {
  name: string;
  freqL: number;
  beatHz?: number;
  waveform: string;
  mode: string;
  toneVolume?: number;
  backgroundType?: string;
  backgroundKey?: string;
  backgroundVolume?: number;
}

async function trpcQuery<T>(
  procedure: string,
  input?: unknown
): Promise<T | null> {
  try {
    const headers = await getAuthHeaders();
    const url = `${API_BASE_URL}/api/trpc/${procedure}${
      input !== undefined
        ? `?input=${encodeURIComponent(JSON.stringify({ "0": { json: input } }))}`
        : ""
    }`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", ...headers },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // tRPC batch response: [{ result: { data: { json: T } } }]
    return (json as Array<{ result: { data: { json: T } } }>)[0]?.result?.data
      ?.json ?? null;
  } catch {
    return null;
  }
}

async function trpcMutation<T>(
  procedure: string,
  input: unknown
): Promise<T | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/trpc/${procedure}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ "0": { json: input } }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json as Array<{ result: { data: { json: T } } }>)[0]?.result?.data
      ?.json ?? null;
  } catch {
    return null;
  }
}

export const soundsApi = {
  list: () => trpcQuery<ServerSound[]>("sounds.list"),
  create: (input: CreateSoundInput) =>
    trpcMutation<{ id: number }>("sounds.create", {
      ...input,
      toneVolume: input.toneVolume ?? 0.7,
      backgroundType: input.backgroundType ?? "none",
      backgroundVolume: input.backgroundVolume ?? 0.35,
    }),
  delete: (id: number) => trpcMutation<{ success: boolean }>("sounds.delete", { id }),
};
