import { useEffect } from "react";
import PostHog from "posthog-react-native";
import Constants from "expo-constants";
import type {
  SessionStartedEvent,
  SessionEndedEvent,
  PaywallViewedEvent,
  ChakraSequenceCompletedEvent,
  OnboardingCompletedEvent,
} from "@rih/shared-types";
import { useAuthStore } from "@/store/authStore";

// Initialize PostHog once at module level
let posthog: PostHog | null = null;

// PostHog's constructor throws on an empty api key (even with disabled: true),
// which would crash the app at boot if the EXPO_PUBLIC_POSTHOG_KEY env var is
// ever missing from a build. Fall back to a no-op stub instead.
const noopPostHog = {
  identify: () => {},
  reset: () => {},
  capture: () => {},
} as unknown as PostHog;

function getPostHog(): PostHog {
  if (!posthog) {
    const key = Constants.expoConfig?.extra?.posthogKey ?? "";
    const host =
      Constants.expoConfig?.extra?.posthogHost ?? "https://us.i.posthog.com";
    if (!key) {
      posthog = noopPostHog;
    } else {
      try {
        posthog = new PostHog(key, { host, disabled: __DEV__ });
      } catch {
        posthog = noopPostHog;
      }
    }
  }
  return posthog;
}

export function useAnalytics() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      getPostHog().identify(String(user.id), {
        name: user.name,
        email: user.email,
        subscription_tier: user.subscriptionTier,
        onboarding_goal: user.onboardingGoal,
        platform: "mobile",
      });
    } else {
      getPostHog().reset();
    }
  }, [user?.id]);
}

// ─── Event Helpers ────────────────────────────────────────────────────────────

// PostHog's capture() expects an index-signature'd property bag. Our strongly
// typed event interfaces are structurally JSON but lack that index signature,
// so we funnel everything through this wrapper with a single localized cast.
type AnalyticsProps = Record<string, string | number | boolean | null>;
function capture(event: string, props: object) {
  getPostHog().capture(event, props as AnalyticsProps);
}

export function trackSessionStarted(props: SessionStartedEvent) {
  capture("session_started", props);
}

export function trackSessionEnded(props: SessionEndedEvent) {
  capture("session_ended", props);
}

export function trackPaywallViewed(props: PaywallViewedEvent) {
  capture("paywall_viewed", props);
}

export function trackChakraSequenceCompleted(
  props: ChakraSequenceCompletedEvent
) {
  capture("chakra_sequence_completed", props);
}

export function trackOnboardingCompleted(props: OnboardingCompletedEvent) {
  capture("onboarding_completed", props);
}

export function trackAlarmFired(props: {
  frequency_hz: number;
  time_of_day: string;
}) {
  capture("alarm_fired", props);
}

export function trackSubscriptionStarted(props: {
  product_id: string;
  price: number;
  platform: "ios" | "android";
}) {
  capture("subscription_started", props);
}

export function useFeatureFlag(flagKey: string): boolean {
  return getPostHog().isFeatureEnabled(flagKey) ?? false;
}
