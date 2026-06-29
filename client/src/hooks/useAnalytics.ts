/**
 * PostHog analytics hook for Rise In Harmony
 * Tracks the 8 core product events from the development plan
 */
import posthog from "posthog-js";
import { useEffect } from "react";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

let initialized = false;

export function initAnalytics() {
  if (initialized || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST || "https://app.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false, // manual events only for precision
    persistence: "localStorage",
  });
  initialized = true;
}

export function useAnalytics(userId?: number, userEmail?: string) {
  useEffect(() => {
    initAnalytics();
    if (userId && POSTHOG_KEY) {
      posthog.identify(String(userId), { email: userEmail });
    }
  }, [userId, userEmail]);
}

// ─── Core Event Tracking Functions ───────────────────────────────────────────

/** Fired when a user completes onboarding and selects a goal */
export function trackOnboardingComplete(goal: string) {
  if (!POSTHOG_KEY) return;
  posthog.capture("onboarding_completed", { goal });
}

/** Fired when a frequency session starts */
export function trackSessionStart(props: {
  frequencyHz: number;
  frequencyName?: string;
  sessionType: string;
  isPremium: boolean;
}) {
  if (!POSTHOG_KEY) return;
  posthog.capture("session_started", props);
}

/** Fired when a session ends with duration */
export function trackSessionEnd(props: {
  frequencyHz: number;
  durationSeconds: number;
  moodRating?: number;
  hadJournalEntry: boolean;
}) {
  if (!POSTHOG_KEY) return;
  posthog.capture("session_ended", props);
}

/** Fired when user taps a premium-locked frequency */
export function trackPaywallShown(source: "player" | "library" | "studio") {
  if (!POSTHOG_KEY) return;
  posthog.capture("paywall_shown", { source });
}

/** Fired when user taps "Start Free Trial" or a pricing tier */
export function trackUpgradeTapped(tier: "monthly" | "yearly" | "lifetime") {
  if (!POSTHOG_KEY) return;
  posthog.capture("upgrade_tapped", { tier });
}

/** Fired when a healing alarm is created */
export function trackAlarmCreated(props: {
  soundType: string;
  fadeInMinutes: number;
  hasStudioMix: boolean;
}) {
  if (!POSTHOG_KEY) return;
  posthog.capture("alarm_created", props);
}

/** Fired when the 7-Chakra sequence is started */
export function trackChakraSequenceStarted(durationPerChakra: number) {
  if (!POSTHOG_KEY) return;
  posthog.capture("chakra_sequence_started", { durationPerChakra });
}

/** Fired when the sleep timer is activated */
export function trackSleepTimerStarted(durationMinutes: number) {
  if (!POSTHOG_KEY) return;
  posthog.capture("sleep_timer_started", { durationMinutes });
}
