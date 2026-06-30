/**
 * useFeatureFlag — PostHog feature flag hook for Rise In Harmony
 *
 * Returns the value of a PostHog feature flag for the current user.
 * Falls back to `defaultValue` when PostHog is not initialized (no API key)
 * or when the flag has not yet been fetched.
 *
 * Usage:
 *   const showNewPlayer = useFeatureFlag("new-player-ui", false);
 *   const pricingVariant = useFeatureFlag("pricing-test", "control");
 *
 * Flags are defined in the PostHog dashboard and can be:
 *   - Boolean flags:  true | false
 *   - Multivariate:   "control" | "variant-a" | "variant-b" | ...
 *
 * Current flags in use:
 *   - "new-player-ui"       (boolean)  — A/B test for redesigned Player page
 *   - "chakra-upsell-v2"   (boolean)  — Test new paywall copy at sequence completion
 *   - "pricing-test"        (string)   — "control" | "annual-first" | "lifetime-highlight"
 */
import posthog from "posthog-js";
import { useEffect, useState } from "react";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;

type FlagValue = boolean | string | undefined;

/**
 * Returns the current value of a PostHog feature flag.
 * Re-evaluates when the flag is loaded from the server.
 */
export function useFeatureFlag<T extends FlagValue = boolean>(
  flagKey: string,
  defaultValue: T
): T {
  const [value, setValue] = useState<T>(() => {
    if (!POSTHOG_KEY) return defaultValue;
    const raw = posthog.getFeatureFlag(flagKey);
    return (raw as T) ?? defaultValue;
  });

  useEffect(() => {
    if (!POSTHOG_KEY) return;

    // Evaluate immediately in case flags are already loaded
    const current = posthog.getFeatureFlag(flagKey);
    if (current !== undefined) {
      setValue((current as T) ?? defaultValue);
    }

    // Subscribe to flag reloads (e.g. after identify or manual reload)
    posthog.onFeatureFlags(() => {
      const updated = posthog.getFeatureFlag(flagKey);
      setValue((updated as T) ?? defaultValue);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagKey]);

  return value;
}

/**
 * Programmatically reload feature flags from PostHog.
 * Call after user login/identify to get personalized flags.
 */
export function reloadFeatureFlags() {
  if (!POSTHOG_KEY) return;
  posthog.reloadFeatureFlags();
}

/**
 * Returns true if the named boolean flag is enabled.
 * Convenience wrapper around useFeatureFlag for boolean flags.
 */
export function useFlag(flagKey: string): boolean {
  return useFeatureFlag<boolean>(flagKey, false);
}
