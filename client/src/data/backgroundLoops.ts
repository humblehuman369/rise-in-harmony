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

const LIBRARY_LOOP_URLS: Record<string, string> = {
  "ambient-bowl": "/manus-storage/ambient-bowl_00102738.mp3",
  "ambient-cave": "/manus-storage/ambient-cave_0324704a.mp3",
  "ambient-fire": "/manus-storage/ambient-fire_6df359cd.mp3",
  "ambient-forest": "/manus-storage/ambient-forest_53a00773.mp3",
  "ambient-night": "/manus-storage/ambient-night_9b821166.mp3",
  "ambient-ocean": "/manus-storage/ambient-ocean_b2f980a6.mp3",
  "ambient-rain": "/manus-storage/ambient-rain_8f17a71c.mp3",
  "ambient-river": "/manus-storage/ambient-river_ae7c454f.mp3",
  "ambient-wind": "/manus-storage/ambient-wind_04459c9b.mp3",
  "binaural-174": "/manus-storage/binaural-174_7724fc00.mp3",
  "binaural-285": "/manus-storage/binaural-285_6609f8ba.mp3",
  "binaural-396": "/manus-storage/binaural-396_e0297d89.mp3",
  "binaural-417": "/manus-storage/binaural-417_8c90d437.mp3",
  "binaural-432": "/manus-storage/binaural-432_f5a497d0.mp3",
  "binaural-528": "/manus-storage/binaural-528_e2b21090.mp3",
  "binaural-639": "/manus-storage/binaural-639_22da3d79.mp3",
  "binaural-741": "/manus-storage/binaural-741_8aa6ae82.mp3",
  "binaural-852": "/manus-storage/binaural-852_2d0302ae.mp3",
  "binaural-963": "/manus-storage/binaural-963_6aeda3b9.mp3",
  "music-ambient": "/manus-storage/music-ambient_72199388.mp3",
  "music-crystal": "/manus-storage/music-crystal_d7d02c7b.mp3",
  "music-drone": "/manus-storage/music-drone_23e62b00.mp3",
};

export function getLibraryLoopUrl(loopId: string): string {
  return LIBRARY_LOOP_URLS[loopId] ?? `/manus-storage/${loopId}.mp3`;
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
