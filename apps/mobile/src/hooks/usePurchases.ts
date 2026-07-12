/**
 * usePurchases — RevenueCat React Native SDK integration
 *
 * Wraps react-native-purchases to provide:
 * - Subscription status
 * - Available packages
 * - Purchase flow
 * - Restore purchases
 */

import { useEffect, useState, useCallback } from "react";
import Purchases, {
  type PurchasesPackage,
  type CustomerInfo,
  LOG_LEVEL,
} from "react-native-purchases";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { trackSubscriptionStarted } from "./useAnalytics";

const RC_API_KEY_IOS: string =
  Constants.expoConfig?.extra?.revenueCatApiKeyIos ?? "";
const RC_API_KEY_ANDROID: string =
  Constants.expoConfig?.extra?.revenueCatApiKeyAndroid ?? "";

let isConfigured = false;

function configureRevenueCat(userId?: string) {
  if (isConfigured) return;
  const apiKey =
    Platform.OS === "ios" ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  if (!apiKey) return;

  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey, appUserID: userId });
  isConfigured = true;
}

/** Centralized premium entitlement check — avoids drift between purchase/restore/load paths. */
function hasPremiumEntitlement(info: CustomerInfo): boolean {
  return (
    info.entitlements.active["premium"] !== undefined ||
    info.entitlements.active["lifetime"] !== undefined
  );
}

interface PurchasesState {
  customerInfo: CustomerInfo | null;
  packages: PurchasesPackage[];
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePurchases() {
  const { user } = useAuthStore();
  const [state, setState] = useState<PurchasesState>({
    customerInfo: null,
    packages: [],
    isPremium: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function initRC() {
      configureRevenueCat(user ? String(user.id) : undefined);
      // If RevenueCat was already configured and user just logged in,
      // call logIn() to link the anonymous ID to the authenticated user.
      // This ensures entitlements purchased on other devices or via web
      // are correctly associated with this user.
      if (isConfigured && user?.id) {
        try {
          const { customerInfo } = await Purchases.logIn(String(user.id));
          setState((prev) => ({
            ...prev,
            customerInfo,
            isPremium: hasPremiumEntitlement(customerInfo),
            isLoading: false,
          }));
          loadOfferings();
          return; // Already loaded customer info via logIn
        } catch {
          // logIn may fail if already logged in with same ID — fall through
        }
      }
      loadCustomerInfo();
      loadOfferings();
    }
    initRC();
  }, [user?.id]);

  const loadCustomerInfo = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      setState((prev) => ({
        ...prev,
        customerInfo: info,
        isPremium: hasPremiumEntitlement(info),
      }));
    } catch (err: unknown) {
      console.warn("[Purchases] Failed to load customer info:", err);
      setState((prev) => ({
        ...prev,
        error: "Failed to load subscription status",
      }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const loadOfferings = useCallback(async () => {
    try {
      const offerings = await Purchases.getOfferings();
      const pkgs = offerings.current?.availablePackages ?? [];
      setState((prev) => ({ ...prev, packages: pkgs }));
    } catch {
      // Silently fail — packages will be empty
    }
  }, []);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const isPremium = hasPremiumEntitlement(customerInfo);

        trackSubscriptionStarted({
          product_id: pkg.product.identifier,
          price: pkg.product.price,
          platform: Platform.OS as "ios" | "android",
        });

        setState((prev) => ({
          ...prev,
          customerInfo,
          isPremium,
          isLoading: false,
        }));
        return { success: true };
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Purchase failed";
        setState((prev) => ({
          ...prev,
          error: message,
          isLoading: false,
        }));
        return { success: false, error: message };
      }
    },
    []
  );

  const restorePurchases = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const info = await Purchases.restorePurchases();
      const isPremium = hasPremiumEntitlement(info);
      setState((prev) => ({
        ...prev,
        customerInfo: info,
        isPremium,
        isLoading: false,
      }));
      return { success: true, isPremium };
    } catch (err: unknown) {
      console.warn("[Purchases] Restore failed:", err);
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: false, isPremium: false };
    }
  }, []);

  return {
    ...state,
    purchasePackage,
    restorePurchases,
    reload: loadCustomerInfo,
  };
}
