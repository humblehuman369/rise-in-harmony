import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { User, SubscriptionTier } from "@rih/shared-types";
import { getCurrentUser } from "@/lib/api";

const TOKEN_KEY = "rih_jwt_token";
const REFRESH_KEY = "rih_refresh_token";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSubscriptionTier: (tier: SubscriptionTier) => void;
  setTokens: (access: string, refresh: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: user !== null }),

  /**
   * Optimistically update the local user's subscription tier without a server
   * round-trip. Used after a successful RevenueCat purchase so feature gates
   * unlock immediately — the webhook will eventually sync the DB.
   */
  setSubscriptionTier: (tier) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, subscriptionTier: tier } });
  },

  setTokens: async (access, refresh) => {
    await SecureStore.setItemAsync(TOKEN_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
    set({ accessToken: access });
  },

  clearTokens: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    set({ accessToken: null, user: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        set({ user: null, accessToken: null, isAuthenticated: false });
        return;
      }
      set({ accessToken: token });
      // Validate the token and hydrate the profile. `getCurrentUser` transparently
      // refreshes an expired access token via the refresh token on a 401.
      const res = await getCurrentUser();
      if (res.success) {
        set({ user: res.data, isAuthenticated: true });
      } else {
        // Token is invalid/expired and could not be refreshed — clear it.
        await get().clearTokens();
      }
    } catch (error: unknown) {
      console.error("[AuthStore] Failed to restore session:", error);
      // Leave current state intact on network errors — avoids logging out
      // users who are temporarily offline.
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await get().clearTokens();
  },
}));
