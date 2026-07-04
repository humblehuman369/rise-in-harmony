/**
 * Session journal persistence — 1–5 mood check-ins with optional notes,
 * stored locally in AsyncStorage (newest first, capped at 90 entries).
 * Mirrors the web app's localStorage journal.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface JournalEntry {
  id: string;
  timestamp: number;
  mood: number; // 1–5
  note: string;
  frequencyHz: number;
  frequencyName: string;
  durationMinutes: number;
}

const JOURNAL_KEY = "rih_journal_entries";
const MAX_ENTRIES = 90;

export async function loadJournalEntries(): Promise<JournalEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(JOURNAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const entries = await loadJournalEntries();
  entries.unshift(entry);
  try {
    await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {}
}

/** Average mood over the last `days` days; null when no entries in range. */
export function averageMood(entries: JournalEntry[], days = 30): number | null {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = entries.filter((e) => e.timestamp >= cutoff);
  if (recent.length === 0) return null;
  const sum = recent.reduce((acc, e) => acc + e.mood, 0);
  return Math.round((sum / recent.length) * 10) / 10;
}
