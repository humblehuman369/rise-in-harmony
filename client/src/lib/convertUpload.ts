/**
 * Chunked upload client for TrueHz Convert.
 *
 * Splits large audio files into 3 MB chunks and sends them sequentially
 * to bypass the Manus/Cloudflare reverse-proxy body-size limit that silently
 * drops connections for large single-shot POSTs.
 *
 * Protocol:
 *   POST /api/convert/upload/init      → { uploadId, chunkSize, maxChunks }
 *   POST /api/convert/upload/chunk     → { received }  (≤ 3 MB raw body)
 *   POST /api/convert/upload/finalize  → { key, url, filename, bytes, format }
 *
 * Small files (≤ 3 MB) still use the legacy single-shot route for simplicity.
 */

export type ConvertUploadResult = {
  key: string;
  url: string;
  filename: string;
  bytes: number;
  format: string;
};

const ACCEPTED_EXT = [".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac"];
const CHUNK_SIZE = 3 * 1024 * 1024; // 3 MB — must match server CHUNK_LIMIT

export function isAcceptedConvertFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXT.some(ext => name.endsWith(ext));
}

function contentTypeForFile(file: File): string {
  if (file.type) return file.type;
  const n = file.name.toLowerCase();
  if (n.endsWith(".mp3")) return "audio/mpeg";
  if (n.endsWith(".wav")) return "audio/wav";
  if (n.endsWith(".flac")) return "audio/flac";
  if (n.endsWith(".m4a") || n.endsWith(".aac")) return "audio/mp4";
  if (n.endsWith(".ogg")) return "audio/ogg";
  return "application/octet-stream";
}

function formatExt(file: File): string {
  const m = file.name.toLowerCase().match(/\.(mp3|wav|flac|m4a|ogg|aac)$/);
  return m?.[1] ?? "bin";
}

/** Fetch wrapper that throws a descriptive Error on non-2xx responses. */
async function apiFetch(url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.error ?? body?.message ?? msg;
    } catch {
      // ignore parse errors
    }
    if (res.status === 401) throw new Error("Please sign in again to upload");
    if (res.status === 413) throw new Error(
      typeof msg === "string" && msg.includes("MB")
        ? msg
        : "File too large for your plan (free 40 MB, Premium 100 MB)"
    );
    throw new Error(String(msg));
  }
  return res;
}

/**
 * Upload an audio file using the chunked protocol.
 * Falls back to single-shot for files ≤ CHUNK_SIZE.
 */
export async function uploadConvertSource(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ConvertUploadResult> {
  if (!isAcceptedConvertFile(file)) {
    throw new Error("Supported formats: MP3, WAV, FLAC, M4A, OGG");
  }
  if (file.size > 100 * 1024 * 1024) {
    throw new Error("File too large (max 100 MB)");
  }

  const contentType = contentTypeForFile(file);

  // ── Small file: single-shot legacy route ─────────────────────────────────
  if (file.size <= CHUNK_SIZE) {
    onProgress?.(10);
    const res = await apiFetch("/api/convert/upload", {
      method: "POST",
      headers: { "Content-Type": contentType, "x-filename": file.name },
      body: file,
    });
    onProgress?.(100);
    const data = await res.json() as ConvertUploadResult;
    return data;
  }

  // ── Large file: chunked protocol ─────────────────────────────────────────
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // 1) Init session
  onProgress?.(2);
  const initRes = await apiFetch("/api/convert/upload/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType,
      totalBytes: file.size,
      totalChunks,
    }),
  });
  const { uploadId } = await initRes.json() as { uploadId: string };

  // 2) Send chunks
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    await apiFetch("/api/convert/upload/chunk", {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        "x-upload-id": uploadId,
        "x-chunk-index": String(i),
      },
      body: chunk,
    });

    // Progress: 2% init + 88% for chunks + 10% finalize
    onProgress?.(2 + Math.round(((i + 1) / totalChunks) * 88));
  }

  // 3) Finalize
  const finalRes = await apiFetch("/api/convert/upload/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId }),
  });
  onProgress?.(100);

  const data = await finalRes.json() as ConvertUploadResult;
  return data;
}
