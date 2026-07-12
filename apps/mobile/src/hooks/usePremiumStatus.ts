/**
 * usePremiumStatus — Single source of truth for premium access in the mobile app.
 *
 * Combines TWO independent signals:
 *   1. Server-side `user.subscriptionTier` (from authStore, updated by webhook)
 *   2. RevenueCat SDK entitlements (local, updated immediately after purchase)
 *
 * A user is considered premium if EITHER source says so. This eliminates the
 * race condition where the RevenueCat webhook hasn't reached the server yet
 * but the user has already paid.
 *
 * Usage:
 *   const { isPremium, isLoading } = usePremiumStatus();
 */
import { useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import { usePurchases } from "./usePurchases";
import { isPremiumUser } from "@rih/shared-utils";

export function usePremiumStatus() {
  const { user } = useAuthStore();
  const { isPremium: rcPremium, isLoading: rcLoading } = usePurchases();

  const serverPremium = useMemo(
    () => isPremiumUser(user?.subscriptionTier ?? "free"),
    [user?.subscriptionTier]
  );

  // User is premium if EITHER the server or RevenueCat says so
  const isPremium = serverPremium || rcPremium;

  // Loading only while RevenueCat is still resolving (server data is instant)
  const isLoading = rcLoading;

  return { isPremium, isLoading, serverPremium, rcPremium };
}
