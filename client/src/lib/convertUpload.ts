/**
 * Upload client for TrueHz Convert.
 *
 * Strategy:
 *   • Files ≤ 2 MB  → legacy single-shot POST to /api/convert/upload
 *   • Files  > 2 MB → EC2 upload relay (bypasses the Manus/Cloudflare ~3 MB
 *                     body-size limit that silently drops large uploads).
 *
 * The relay flow:
 *   1. Client calls trpc.convert.getRelayToken to get a short-lived HMAC token
 *      (the shared secret never leaves the server).
 *   2. Client POSTs the raw file directly to http://34.23.137.141:4567/upload
 *      with headers: x-auth-token, x-file-name, x-content-type.
 *   3. Relay presigns an S3 PUT via the Forge API, uploads the bytes, and
 *      returns { key, url } to the client.
 *   4. Client passes the returned key to trpc.convert.create as sourceKey.
 *
 * Supported formats: MP3, WAV, FLAC, M4A, OGG, AAC, MP4, MKV, MOV, AVI, WEBM
 */

export type ConvertUploadResult = {
  key: string;
  url: string;
  filename: string;
  bytes: number;
  format: string;
};

/** Rich progress info emitted during uploads. */
export type UploadProgress = {
  /** 0–100 overall percentage. */
  pct: number;
  /** Bytes sent so far (0 when unknown). */
  loadedBytes: number;
  /** Total bytes to send (0 when unknown). */
  totalBytes: number;
  /** Smoothed upload speed in bytes/second (null until measurable). */
  bytesPerSec: number | null;
  /** Estimated seconds remaining (null until measurable). */
  etaSec: number | null;
};

export type UploadProgressCallback = (progress: UploadProgress) => void;

/**
 * Tracks upload speed with exponential smoothing so the MB/s readout
 * doesn't jump around, and derives a stable ETA from it.
 */
function createSpeedTracker(totalBytes: number) {
  let lastTime = performance.now();
  let lastLoaded = 0;
  let smoothedBps: number | null = null;
  const ALPHA = 0.25; // smoothing factor — lower = smoother

  return (loaded: number): { bytesPerSec: number | null; etaSec: number | null } => {
    const now = performance.now();
    const dtMs = now - lastTime;
    // Sample at most every 300 ms to avoid noisy instantaneous readings
    if (dtMs < 300) {
      const etaSec =
        smoothedBps && smoothedBps > 0
          ? Math.max(0, (totalBytes - loaded) / smoothedBps)
          : null;
      return { bytesPerSec: smoothedBps, etaSec };
    }
    const dBytes = loaded - lastLoaded;
    const instantBps = (dBytes / dtMs) * 1000;
    smoothedBps =
      smoothedBps == null ? instantBps : smoothedBps + ALPHA * (instantBps - smoothedBps);
    lastTime = now;
    lastLoaded = loaded;
    const etaSec =
      smoothedBps > 0 ? Math.max(0, (totalBytes - loaded) / smoothedBps) : null;
    return { bytesPerSec: smoothedBps, etaSec };
  };
}

/** Format bytes/second as a human-readable speed, e.g. "3.2 MB/s". */
export function formatUploadSpeed(bytesPerSec: number | null): string {
  if (bytesPerSec == null || !isFinite(bytesPerSec) || bytesPerSec <= 0) return "—";
  if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${Math.round(bytesPerSec)} B/s`;
}

/** Format seconds remaining as "Xm Ys" / "Ys" / "<1s". */
export function formatEta(etaSec: number | null): string {
  if (etaSec == null || !isFinite(etaSec)) return "—";
  if (etaSec < 1) return "<1s";
  const s = Math.round(etaSec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const ACCEPTED_EXT = [
  ".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac",
  ".mp4", ".mkv", ".mov", ".avi", ".webm",
];

/** Threshold below which we use the simple single-shot route. */
const DIRECT_UPLOAD_THRESHOLD = 2 * 1024 * 1024; // 2 MB

/**
 * Known-good relay endpoint. Used as a hard fallback if the server ever
 * returns a missing/invalid relayUrl (e.g. a stale cached response from an
 * older deployment). Must stay in sync with RELAY_STABLE_URL on the server
 * and the CSP connect-src allowlist.
 */
const RELAY_FALLBACK_URL = "https://34-23-137-141.sslip.io";

/** Returns a validated absolute https URL for the relay, or the fallback. */
function sanitizeRelayUrl(raw: unknown): string {
  if (typeof raw === "string" && raw.length > 0) {
    try {
      const u = new URL(raw);
      if (u.protocol === "https:") return u.origin;
    } catch {
      /* fall through to fallback */
    }
  }
  return RELAY_FALLBACK_URL;
}

export function isAcceptedConvertFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXT.some(ext => name.endsWith(ext));
}

/** new URL() that can never throw — returns the raw string on failure. */
function safeHostname(raw: string): string {
  try {
    return new URL(raw).hostname;
  } catch {
    return raw || "(unknown)";
  }
}

function contentTypeForFile(file: File): string {
  if (file.type) return file.type;
  const n = file.name.toLowerCase();
  if (n.endsWith(".mp3")) return "audio/mpeg";
  if (n.endsWith(".wav")) return "audio/wav";
  if (n.endsWith(".flac")) return "audio/flac";
  if (n.endsWith(".m4a") || n.endsWith(".aac")) return "audio/mp4";
  if (n.endsWith(".ogg")) return "audio/ogg";
  if (n.endsWith(".mp4")) return "video/mp4";
  if (n.endsWith(".mkv")) return "video/x-matroska";
  if (n.endsWith(".mov")) return "video/quicktime";
  if (n.endsWith(".avi")) return "video/x-msvideo";
  if (n.endsWith(".webm")) return "video/webm";
  return "application/octet-stream";
}

function formatExt(file: File): string {
  const m = file.name.toLowerCase().match(/\.(mp3|wav|flac|m4a|ogg|aac|mp4|mkv|mov|avi|webm)$/);
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
        : "File too large for your plan (free 40 MB, Premium 500 MB)"
    );
    throw new Error(String(msg));
  }
  return res;
}

/**
 * Upload a file via the EC2 relay (no size limit from the proxy perspective).
 * The relay accepts up to 2 GB.
 */
async function uploadViaRelay(
  file: File,
  onProgress?: UploadProgressCallback,
): Promise<ConvertUploadResult> {
  const emit = (pct: number, loaded = 0, extras?: { bytesPerSec: number | null; etaSec: number | null }) =>
    onProgress?.({
      pct,
      loadedBytes: loaded,
      totalBytes: file.size,
      bytesPerSec: extras?.bytesPerSec ?? null,
      etaSec: extras?.etaSec ?? null,
    });

  emit(2);

  // Step 1: Get a short-lived HMAC token from the server.
  // We use a raw fetch here because the trpc client hook is React-only.
  // `cache: "no-store"` + a timestamp param guarantee the browser can never
  // serve a stale cached response from an older deployment (which previously
  // caused an invalid relayUrl to be used silently).
  const tokenRes = await apiFetch(
    `/api/trpc/convert.getRelayToken?batch=1&input=%7B%220%22%3A%7B%7D%7D&_ts=${Date.now()}`,
    { method: "GET", cache: "no-store" }
  );
  const tokenJson = await tokenRes.json() as [{ result: { data: { token: string; relayUrl: string } } }];
  const { token } = tokenJson[0].result.data;
  // Never trust the URL blindly: validate it and fall back to the known-good
  // endpoint if it is missing, relative, or non-https.
  const relayUrl = sanitizeRelayUrl(tokenJson[0].result.data.relayUrl);

  emit(4);

  // Step 1.5: Pre-flight the relay before pushing a large file.
  // Fails fast with a clear message instead of a mid-upload network error.
  // The response must be the relay's own JSON ({ ok: true }) — an HTML page
  // (e.g. the SPA served by our own origin) is rejected as an impostor.
  try {
    const healthRes = await fetch(`${relayUrl}/health`, {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!healthRes.ok) throw new Error(`health ${healthRes.status}`);
    const health = (await healthRes.json()) as { ok?: boolean };
    if (health?.ok !== true) throw new Error("health body not ok");
  } catch {
    throw new Error(
      `The upload server (${safeHostname(relayUrl)}) is not reachable from your browser. — If this persists, your network/DNS may be blocking it; try a different network or contact support.`,
    );
  }

  emit(5);

  // Step 2: POST the raw file directly to the relay
  // Use XMLHttpRequest so we can track upload progress.
  const speedTracker = createSpeedTracker(file.size);
  const { key, url } = await new Promise<{ key: string; url: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${relayUrl}/upload`, true);
    xhr.setRequestHeader("x-auth-token", token);
    xhr.setRequestHeader("x-file-name", file.name);
    xhr.setRequestHeader("x-content-type", contentTypeForFile(file));

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        // Map upload progress to 5%–95% range
        const pct = 5 + Math.round((e.loaded / e.total) * 90);
        const { bytesPerSec, etaSec } = speedTracker(e.loaded);
        emit(pct, e.loaded, { bytesPerSec, etaSec });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { key: string; url: string };
          resolve(data);
        } catch {
          reject(new Error("Invalid relay response"));
        }
      } else {
        let msg = `Relay HTTP ${xhr.status}`;
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string };
          if (data.error) msg = data.error;
        } catch { /* ignore */ }
        if (xhr.status === 401) reject(new Error("Upload token expired — please try again"));
        else reject(new Error(msg));
      }
    });

    xhr.addEventListener("error", () =>
      reject(
        new Error(
          `Network error while uploading to ${safeHostname(relayUrl)} — check your connection and try again`,
        ),
      ),
    );
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.send(file);
  });

  emit(100, file.size, { bytesPerSec: null, etaSec: 0 });

  return {
    key,
    url,
    filename: file.name,
    bytes: file.size,
    format: formatExt(file),
  };
}

/**
 * Upload a file for TrueHz Convert.
 *
 * Small files (≤ 2 MB) use the legacy single-shot route through the Manus proxy.
 * Larger files go directly to the EC2 relay to bypass the proxy body limit.
 */
export async function uploadConvertSource(
  file: File,
  onProgress?: UploadProgressCallback,
): Promise<ConvertUploadResult> {
  if (!isAcceptedConvertFile(file)) {
    throw new Error("Supported formats: MP3, WAV, FLAC, M4A, OGG, AAC, MP4, MKV, MOV, AVI, WEBM");
  }

  const contentType = contentTypeForFile(file);

  // ── Small file: single-shot legacy route (stays under proxy limit) ──────────
  if (file.size <= DIRECT_UPLOAD_THRESHOLD) {
    onProgress?.({ pct: 10, loadedBytes: 0, totalBytes: file.size, bytesPerSec: null, etaSec: null });
    const res = await apiFetch("/api/convert/upload", {
      method: "POST",
      headers: { "Content-Type": contentType, "x-filename": file.name },
      body: file,
    });
    onProgress?.({ pct: 100, loadedBytes: file.size, totalBytes: file.size, bytesPerSec: null, etaSec: 0 });
    const data = await res.json() as ConvertUploadResult;
    return data;
  }

  // ── Large file: EC2 relay (bypasses proxy body limit) ───────────────────────
  return uploadViaRelay(file, onProgress);
}


