import { getAuthHeaders } from "./soundUpload";

export type ConvertUploadResult = {
  key: string;
  url: string;
  filename: string;
  bytes: number;
  format: string;
};

const ACCEPTED_EXT = [".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac"];

export function isAcceptedConvertFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXT.some(ext => name.endsWith(ext));
}

export async function uploadConvertSource(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ConvertUploadResult> {
  if (!isAcceptedConvertFile(file)) {
    throw new Error("Supported formats: MP3, WAV, FLAC, M4A, OGG");
  }
  // Client-side soft cap; server enforces tier limit
  if (file.size > 100 * 1024 * 1024) {
    throw new Error("File too large (max 100 MB)");
  }

  onProgress?.(10);
  const buffer = await file.arrayBuffer();
  onProgress?.(40);

  const response = await fetch(
    `/api/convert/upload?filename=${encodeURIComponent(file.name)}`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": file.type || "application/octet-stream",
        "X-Filename": file.name,
      },
      body: buffer,
      credentials: "include",
    },
  );

  onProgress?.(90);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    const code = payload?.error ?? `Upload failed (${response.status})`;
    if (code === "TOO_LARGE") throw new Error("File too large for your plan");
    if (code === "BAD_FORMAT") throw new Error("Unsupported audio format");
    if (code === "PREMIUM_REQUIRED") throw new Error("Premium required");
    if (code === "FEATURE_DISABLED")
      throw new Error("Convert is temporarily unavailable");
    throw new Error(code);
  }

  onProgress?.(100);
  return response.json() as Promise<ConvertUploadResult>;
}
