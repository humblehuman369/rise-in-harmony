import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { User } from "@rih/shared-types";

const TOKEN_KEY = "rih_jwt_token";
const REFRESH_KEY = "rih_refresh_token";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
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

  setUser: (user) =>
    set({ user, isAuthenticated: user !== null }),

  setTokens: async (access, refresh) => {
    await SecureStore.setItemAsync(TOKEN_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
    set({ accessToken: access });
  },

  clearTokens: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    set({ accessToken: null });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        set({ accessToken: token });
        // TODO: Validate token and fetch user profile from API
        // const user = await fetchCurrentUser(token);
        // set({ user, isAuthenticated: true });
      }
    } catch (error) {
      console.error("[AuthStore] Failed to restore session:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await get().clearTokens();
    set({ user: null, isAuthenticated: false, accessToken: null });
  },
}));
