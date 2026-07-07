import { COOKIE_NAME } from "@shared/const";

export function getAuthHeaders(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem("manus-cookie");
    if (raw) {
      const prefix = `${COOKIE_NAME}=`;
      const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
      const token = pair?.trim().slice(prefix.length);
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    }
  } catch {
    // sessionStorage unavailable
  }
  return {};
}

export async function uploadSoundMp3(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ key: string; url: string }> {
  if (!file.name.toLowerCase().endsWith(".mp3")) {
    throw new Error("Only MP3 files are supported");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("File too large (max 15 MB)");
  }

  onProgress?.(10);

  const buffer = await file.arrayBuffer();
  onProgress?.(40);

  const response = await fetch(
    `/api/sounds/upload?filename=${encodeURIComponent(file.name)}`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "audio/mpeg",
        "X-Filename": file.name,
      },
      body: buffer,
      credentials: "include",
    },
  );

  onProgress?.(90);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Upload failed (${response.status})`);
  }

  onProgress?.(100);
  return response.json() as Promise<{ key: string; url: string }>;
}
