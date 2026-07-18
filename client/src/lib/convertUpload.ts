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

/**
 * Upload via presigned S3 PUT (preferred).
 * Avoids HTTP 413 from Manus/Cloudflare body limits on /api/convert/upload.
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

  onProgress?.(5);
  const contentType = contentTypeForFile(file);

  // 1) Small JSON request — get presigned PUT URL (no audio body through Manus)
  const presignRes = await fetch("/api/trpc/convert.createUploadUrl", {
    method: "POST",
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      json: {
        filename: file.name,
        contentType,
        byteSize: file.size,
      },
    }),
  });

  if (!presignRes.ok) {
    const errBody = await presignRes.json().catch(() => null);
    const msg =
      errBody?.error?.json?.message ??
      errBody?.error?.message ??
      `Could not start upload (${presignRes.status})`;
    if (String(msg).includes("TOO_LARGE") || presignRes.status === 413) {
      throw new Error(
        "File too large for your plan (free 25 MB, Premium 100 MB)",
      );
    }
    if (presignRes.status === 401) {
      throw new Error("Please sign in again to upload");
    }
    throw new Error(String(msg));
  }

  const presignJson = (await presignRes.json()) as {
    result?: {
      data?: {
        json?: {
          key: string;
          uploadUrl: string;
          publicUrl: string;
          filename: string;
        };
      };
    };
  };
  const presign = presignJson?.result?.data?.json;
  if (!presign?.uploadUrl || !presign?.key) {
    throw new Error("Upload URL missing from server response");
  }

  onProgress?.(20);

  // 2) PUT file directly to object storage (bypasses app body limit)
  const putRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(
      `Storage upload failed (${putRes.status}). Try a smaller file or retry.`,
    );
  }

  onProgress?.(100);

  return {
    key: presign.key,
    url: presign.publicUrl,
    filename: presign.filename || file.name,
    bytes: file.size,
    format: formatExt(file),
  };
}
