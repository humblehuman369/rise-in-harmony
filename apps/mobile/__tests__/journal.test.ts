/** Tests for the session journal mood-average logic. */
import { averageMood, type JournalEntry } from "../src/lib/journal";

const DAY_MS = 24 * 60 * 60 * 1000;
const entry = (mood: number, daysAgo: number): JournalEntry => ({
  id: `j_${mood}_${daysAgo}`,
  timestamp: Date.now() - daysAgo * DAY_MS,
  mood,
  note: "",
  frequencyHz: 432,
  frequencyName: "Test",
  durationMinutes: 5,
});

describe("averageMood", () => {
  it("returns null for no entries", () => {
    expect(averageMood([])).toBeNull();
  });

  it("averages entries within the window", () => {
    expect(averageMood([entry(4, 1), entry(5, 2), entry(3, 3)])).toBe(4);
  });

  it("ignores entries older than the window", () => {
    expect(averageMood([entry(5, 1), entry(1, 45)])).toBe(5);
  });

  it("returns null when all entries are outside the window", () => {
    expect(averageMood([entry(4, 40)])).toBeNull();
  });

  it("rounds to one decimal", () => {
    expect(averageMood([entry(4, 1), entry(5, 1), entry(5, 2)])).toBe(4.7);
  });
});
