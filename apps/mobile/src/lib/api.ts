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

  const data = (await res.json()) as {
    accessToken?: string;
    refreshToken?: string;
  };
  if (data.accessToken) {
    await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
    // Rotate refresh token when the server issues a new one
    if (data.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken);
    }
    return data.accessToken;
  }
  return null;
}

/**
 * Safely parse a fetch Response as JSON. Returns a typed error response
 * if the body is empty or not valid JSON (e.g., HTML error pages).
 */
async function safeJson<T>(res: globalThis.Response): Promise<ApiResponse<T>> {
  try {
    const text = await res.text();
    if (!text) return { success: false, error: "Empty response" };
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return { success: false, error: `Unexpected response (HTTP ${res.status})` };
  }
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
      return safeJson<T>(retryRes);
    }
    return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
  }

  return safeJson<T>(res);
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

/**
 * Unwrap tRPC HTTP response (superjson transformer).
 * Supports non-batch `{ result: { data: { json } } }` and legacy batch arrays.
 */
function unwrapTrpcData<T>(json: unknown): T | null {
  if (json == null) return null;
  if (Array.isArray(json)) {
    const first = json[0] as { result?: { data?: { json?: T } | T }; error?: unknown };
    if (first?.error) return null;
    const data = first?.result?.data;
    if (data && typeof data === "object" && data !== null && "json" in data) {
      return (data as { json: T }).json;
    }
    return (data as T) ?? null;
  }
  if (typeof json === "object" && json !== null && "result" in json) {
    const data = (json as { result?: { data?: { json?: T } | T }; error?: unknown })
      .result?.data;
    if (data && typeof data === "object" && data !== null && "json" in data) {
      return (data as { json: T }).json;
    }
    return (data as T) ?? null;
  }
  return null;
}

async function trpcFetch(
  procedure: string,
  options: { method: "GET" | "POST"; input?: unknown }
): Promise<Response> {
  const headers = await getAuthHeaders();
  if (options.method === "GET") {
    const qs =
      options.input !== undefined
        ? `?input=${encodeURIComponent(JSON.stringify({ json: options.input }))}`
        : "";
    return fetch(`${API_BASE_URL}/api/trpc/${procedure}${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", ...headers },
    });
  }
  return fetch(`${API_BASE_URL}/api/trpc/${procedure}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    // superjson wire format for a single procedure
    body: JSON.stringify({ json: options.input }),
  });
}

async function trpcQuery<T>(
  procedure: string,
  input?: unknown
): Promise<T | null> {
  try {
    let res = await trpcFetch(procedure, { method: "GET", input });
    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) return null;
      res = await trpcFetch(procedure, { method: "GET", input });
    }
    if (!res.ok) return null;
    return unwrapTrpcData<T>(await res.json());
  } catch {
    return null;
  }
}

async function trpcMutation<T>(
  procedure: string,
  input: unknown
): Promise<T | null> {
  try {
    let res = await trpcFetch(procedure, { method: "POST", input });
    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) return null;
      res = await trpcFetch(procedure, { method: "POST", input });
    }
    if (!res.ok) return null;
    return unwrapTrpcData<T>(await res.json());
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
