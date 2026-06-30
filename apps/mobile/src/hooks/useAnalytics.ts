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

function getPostHog(): PostHog {
  if (!posthog) {
    const key = Constants.expoConfig?.extra?.posthogKey ?? "";
    posthog = new PostHog(key, {
      host: "https://app.posthog.com",
      disabled: !key || __DEV__,
    });
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

export function trackSessionStarted(props: SessionStartedEvent) {
  getPostHog().capture("session_started", props);
}

export function trackSessionEnded(props: SessionEndedEvent) {
  getPostHog().capture("session_ended", props);
}

export function trackPaywallViewed(props: PaywallViewedEvent) {
  getPostHog().capture("paywall_viewed", props);
}

export function trackChakraSequenceCompleted(
  props: ChakraSequenceCompletedEvent
) {
  getPostHog().capture("chakra_sequence_completed", props);
}

export function trackOnboardingCompleted(props: OnboardingCompletedEvent) {
  getPostHog().capture("onboarding_completed", props);
}

export function trackAlarmFired(props: {
  frequency_hz: number;
  time_of_day: string;
}) {
  getPostHog().capture("alarm_fired", props);
}

export function trackSubscriptionStarted(props: {
  product_id: string;
  price: number;
  platform: "ios" | "android";
}) {
  getPostHog().capture("subscription_started", props);
}

export function useFeatureFlag(flagKey: string): boolean {
  return getPostHog().isFeatureEnabled(flagKey) ?? false;
}
