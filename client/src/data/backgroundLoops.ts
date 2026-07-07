export type BackgroundType = "none" | "library" | "upload";

export type BackgroundLoop = {
  id: string;
  label: string;
  category: "nature" | "music";
};

export const BACKGROUND_LOOPS: BackgroundLoop[] = [
  { id: "ambient-rain", label: "Rain", category: "nature" },
  { id: "ambient-ocean", label: "Ocean", category: "nature" },
  { id: "ambient-forest", label: "Forest", category: "nature" },
  { id: "ambient-wind", label: "Wind", category: "nature" },
  { id: "ambient-fire", label: "Fire", category: "nature" },
  { id: "ambient-river", label: "River", category: "nature" },
  { id: "ambient-night", label: "Night", category: "nature" },
  { id: "ambient-cave", label: "Cave", category: "nature" },
  { id: "ambient-bowl", label: "Singing Bowl", category: "nature" },
  { id: "music-ambient", label: "Ambient Bed", category: "music" },
  { id: "music-drone", label: "Drone Bed", category: "music" },
  { id: "music-crystal", label: "Crystal Bed", category: "music" },
];

const LOOP_LABELS = Object.fromEntries(
  BACKGROUND_LOOPS.map(loop => [loop.id, loop.label]),
) as Record<string, string>;

export function getLibraryLoopUrl(loopId: string): string {
  return `/sounds/${loopId}.mp3`;
}

export function getUploadLoopUrl(storageKey: string): string {
  return `/manus-storage/${storageKey.replace(/^\/+/, "")}`;
}

export function getBackgroundAudioUrl(
  type: BackgroundType,
  key: string | null | undefined,
): string | null {
  if (type === "none" || !key) return null;
  if (type === "library") return getLibraryLoopUrl(key);
  if (type === "upload") return getUploadLoopUrl(key);
  return null;
}

export function getBackgroundLabel(
  type: BackgroundType,
  key: string | null | undefined,
): string {
  if (type === "none" || !key) return "None";
  if (type === "library") return LOOP_LABELS[key] ?? key;
  if (type === "upload") {
    const parts = key.split("/");
    return parts[parts.length - 1]?.replace(/\.mp3$/i, "") ?? "My upload";
  }
  return "None";
}

export function formatSoundSummary(
  freqL: number,
  waveform: string,
  mode: string,
  backgroundType: BackgroundType,
  backgroundKey: string | null | undefined,
): string {
  const tone = `${freqL % 1 === 0 ? freqL.toFixed(0) : freqL.toFixed(2)} Hz ${waveform}`;
  const bg = getBackgroundLabel(backgroundType, backgroundKey);
  if (backgroundType === "none") return tone;
  return `${tone} + ${bg}`;
}
