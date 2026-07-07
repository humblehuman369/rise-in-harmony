/**
 * useRecordedDownload — download state for a recorded catalog session
 *
 * States: "unavailable" (not a recorded entry) → "none" → "downloading" →
 * "downloaded". Premium gating is the caller's responsibility.
 */
import { useCallback, useEffect, useState } from "react";
import type { Frequency } from "@rih/shared-types";
import {
  downloadRecording,
  getDownloadedUri,
  removeRecording,
} from "@/lib/recordedDownloads";

export type DownloadStatus = "unavailable" | "none" | "downloading" | "downloaded";

export function useRecordedDownload(frequency: Frequency | null) {
  const [status, setStatus] = useState<DownloadStatus>("unavailable");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (!frequency?.audioUrl) {
      setStatus("unavailable");
      return;
    }
    setStatus(getDownloadedUri(frequency) ? "downloaded" : "none");
  }, [frequency?.id, frequency?.audioUrl]);

  const download = useCallback(async () => {
    if (!frequency?.audioUrl || status === "downloading") return;
    setStatus("downloading");
    setError(null);
    try {
      await downloadRecording(frequency);
      setStatus("downloaded");
    } catch {
      setStatus("none");
      setError("Download failed — check your connection and try again.");
    }
  }, [frequency, status]);

  const remove = useCallback(() => {
    if (!frequency) return;
    removeRecording(frequency);
    setStatus(frequency.audioUrl ? "none" : "unavailable");
  }, [frequency]);

  return { status, error, download, remove };
}
