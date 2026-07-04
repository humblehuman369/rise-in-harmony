/**
 * Unit tests for the pure business logic in @rih/shared-utils.
 * These functions power streak tracking and premium gating, so they are the
 * highest-value logic to protect with tests.
 *
 * Imported via relative path (not the @rih/* alias) so the test runs without
 * extra Jest moduleNameMapper configuration.
 */
import {
  calculateStreak,
  isPremiumUser,
  isFrequencyUnlocked,
  formatStreakLabel,
} from "../../../packages/shared-utils/src";
import type { Frequency } from "../../../packages/shared-types/src";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);

describe("calculateStreak", () => {
  it("returns 0 for no sessions", () => {
    expect(calculateStreak([])).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(calculateStreak([daysAgo(0), daysAgo(1), daysAgo(2)])).toBe(3);
  });

  it("allows the streak to end yesterday", () => {
    expect(calculateStreak([daysAgo(1), daysAgo(2)])).toBe(2);
  });

  it("returns 0 when the most recent session is older than yesterday", () => {
    expect(calculateStreak([daysAgo(3), daysAgo(4)])).toBe(0);
  });

  it("stops counting at the first gap", () => {
    expect(calculateStreak([daysAgo(0), daysAgo(1), daysAgo(3)])).toBe(2);
  });

  it("dedupes multiple sessions on the same calendar day", () => {
    expect(calculateStreak([daysAgo(0), daysAgo(0), daysAgo(1)])).toBe(2);
  });
});

describe("subscription gating", () => {
  const freeFreq: Frequency = {
    id: "432",
    hz: 432,
    name: "Universal Harmony",
    benefit: "Natural tuning & calm",
    color: "#3B82F6",
    isPremium: false,
    category: "solfeggio",
  };
  const premiumFreq: Frequency = {
    id: "963",
    hz: 963,
    name: "Divine Consciousness",
    benefit: "Pineal activation & unity",
    color: "#A855F7",
    isPremium: true,
    category: "solfeggio",
  };

  it("treats premium and lifetime tiers as premium", () => {
    expect(isPremiumUser("premium")).toBe(true);
    expect(isPremiumUser("lifetime")).toBe(true);
    expect(isPremiumUser("free")).toBe(false);
  });

  it("always unlocks free frequencies", () => {
    expect(isFrequencyUnlocked(freeFreq, "free")).toBe(true);
  });

  it("locks premium frequencies for free users", () => {
    expect(isFrequencyUnlocked(premiumFreq, "free")).toBe(false);
    expect(isFrequencyUnlocked(premiumFreq, "premium")).toBe(true);
  });
});

describe("formatStreakLabel", () => {
  it("formats zero, singular, and plural", () => {
    expect(formatStreakLabel(0)).toBe("No streak yet");
    expect(formatStreakLabel(1)).toBe("1 day streak");
    expect(formatStreakLabel(5)).toBe("5 day streak");
  });
});
