/**
 * useLocalSessionImport — one-time bulk import of localStorage sessions to the server.
 *
 * Runs once per user account (keyed by user ID) immediately after login.
 * Reads the `rih_journal_entries` localStorage key, maps entries to the
 * server's bulkImport input shape, and fires the mutation.
 *
 * A flag `rih_imported_<userId>` is written to localStorage after a successful
 * import so the procedure is never called twice for the same account.
 */
import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { loadJournalEntries } from "@/components/SessionJournal";

const IMPORT_FLAG_PREFIX = "rih_imported_";

export function useLocalSessionImport(userId: number | undefined) {
  const utils = trpc.useUtils();
  const bulkImport = trpc.sessions.bulkImport.useMutation({
    onSuccess: (data) => {
      if (data.imported > 0) {
        // Refresh stats so Dashboard reflects the imported sessions
        utils.sessions.stats.invalidate();
        utils.sessions.list.invalidate();
        console.info(`[Import] Synced ${data.imported} local sessions to server.`);
      }
    },
    onError: (err) => {
      console.warn("[Import] Local session import failed:", err.message);
    },
  });

  // Use a ref to avoid stale closure issues
  const hasRun = useRef(false);

  useEffect(() => {
    if (!userId) return;
    if (hasRun.current) return;

    const flagKey = `${IMPORT_FLAG_PREFIX}${userId}`;
    if (localStorage.getItem(flagKey)) return; // already imported for this account

    const entries = loadJournalEntries();
    if (entries.length === 0) {
      // Nothing to import — mark as done so we don't check again
      localStorage.setItem(flagKey, "1");
      return;
    }

    hasRun.current = true;

    const payload = entries.slice(0, 90).map((e) => ({
      timestamp: e.timestamp,
      frequencyHz: e.frequencyHz,
      frequencyName: e.frequencyName,
      durationMinutes: e.durationMinutes,
      mood: e.mood,
      note: e.note || undefined,
    }));

    bulkImport.mutate(
      { entries: payload },
      {
        onSuccess: () => {
          localStorage.setItem(flagKey, "1");
        },
        onError: () => {
          // Reset so it retries next time
          hasRun.current = false;
        },
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
