/**
 * recordedDownloads — offline cache for recorded (streamed) catalog sessions
 *
 * Downloads live in the document directory (safe from OS cache eviction):
 *   <documents>/recorded/binaural-<hz>.mp3
 *
 * Premium gating happens at the UI layer; this module only manages files.
 */
import { Directory, File, Paths } from "expo-file-system";
import type { Frequency } from "@rih/shared-types";
import { resolveAssetUrl } from "@/lib/api";

const DOWNLOADS_DIR_NAME = "recorded";

function downloadsDir(): Directory {
  return new Directory(Paths.document, DOWNLOADS_DIR_NAME);
}

/** Filename for a recorded frequency, derived from its audioUrl (e.g. "binaural-528.mp3"). */
export function recordedFileName(freq: Frequency): string | null {
  if (!freq.audioUrl) return null;
  const base = freq.audioUrl.split("/").pop();
  return base && base.length > 0 ? base : null;
}

/** Local file reference for a recorded frequency (may or may not exist on disk). */
export function localFileFor(freq: Frequency): File | null {
  const name = recordedFileName(freq);
  if (!name) return null;
  return new File(downloadsDir(), name);
}

/** URI of the downloaded copy, or null if it hasn't been downloaded. */
export function getDownloadedUri(freq: Frequency): string | null {
  try {
    const file = localFileFor(freq);
    return file?.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/** Download a recorded session for offline playback. Resolves to the local URI. */
export async function downloadRecording(freq: Frequency): Promise<string> {
  if (!freq.audioUrl) {
    throw new Error("This frequency has no downloadable recording");
  }
  const dir = downloadsDir();
  if (!dir.exists) dir.create({ intermediates: true });

  const target = localFileFor(freq);
  if (!target) throw new Error("This frequency has no downloadable recording");
  if (target.exists) return target.uri;

  const downloaded = await File.downloadFileAsync(resolveAssetUrl(freq.audioUrl), target);
  return downloaded.uri;
}

/** Delete the offline copy. No-op if it doesn't exist. */
export function removeRecording(freq: Frequency): void {
  try {
    const file = localFileFor(freq);
    if (file?.exists) file.delete();
  } catch {
    // already gone
  }
}
