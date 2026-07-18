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

const ACCEPTED_EXT = [
  ".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac",
  ".mp4", ".mkv", ".mov", ".avi", ".webm",
];

/** Threshold below which we use the simple single-shot route. */
const DIRECT_UPLOAD_THRESHOLD = 2 * 1024 * 1024; // 2 MB

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
  onProgress?: (pct: number) => void,
): Promise<ConvertUploadResult> {
  onProgress?.(2);

  // Step 1: Get a short-lived HMAC token from the server
  // We use a raw fetch here because the trpc client hook is React-only.
  // The tRPC HTTP endpoint is at /api/trpc/convert.getRelayToken
  const tokenRes = await apiFetch(
    "/api/trpc/convert.getRelayToken?batch=1&input=%7B%220%22%3A%7B%7D%7D",
    { method: "GET" }
  );
  const tokenJson = await tokenRes.json() as [{ result: { data: { token: string; relayUrl: string } } }];
  const { token, relayUrl } = tokenJson[0].result.data;

  onProgress?.(5);

  // Step 2: POST the raw file directly to the relay
  // Use XMLHttpRequest so we can track upload progress.
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
        onProgress?.(pct);
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

    xhr.addEventListener("error", () => reject(new Error("Network error during upload — check your connection")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.send(file);
  });

  onProgress?.(100);

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
  onProgress?: (pct: number) => void,
): Promise<ConvertUploadResult> {
  if (!isAcceptedConvertFile(file)) {
    throw new Error("Supported formats: MP3, WAV, FLAC, M4A, OGG, AAC, MP4, MKV, MOV, AVI, WEBM");
  }

  const contentType = contentTypeForFile(file);

  // ── Small file: single-shot legacy route (stays under proxy limit) ──────────
  if (file.size <= DIRECT_UPLOAD_THRESHOLD) {
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

  // ── Large file: EC2 relay (bypasses proxy body limit) ───────────────────────
  return uploadViaRelay(file, onProgress);
}


