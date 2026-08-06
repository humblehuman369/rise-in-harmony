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
  { id: "sleep-preparation", label: "Sleep Preparation", category: "nature" },
  { id: "deep-focus", label: "Deep Focus", category: "nature" },
  { id: "anxiety-reset", label: "Anxiety Reset", category: "nature" },
  { id: "chakra-dawn", label: "Chakra Dawn", category: "nature" },
  { id: "morning-breath", label: "Morning Breath", category: "nature" },
  { id: "reiki-432", label: "Reiki 432Hz", category: "nature" },
  { id: "calm-sleep-528", label: "Calm Sleep (528Hz)", category: "nature" },
  { id: "deep-serenity-444", label: "Deep Serenity (444Hz)", category: "nature" },
  { id: "nature-meditation-174", label: "Nature Meditation (174Hz)", category: "nature" },
  { id: "reiki-healing-garden-285", label: "Reiki Healing Garden (285Hz)", category: "nature" },
  { id: "spiritual-meditation-444", label: "Spiritual Meditation (444Hz)", category: "nature" },
  { id: "third-eye-activation-528", label: "Third Eye Activation (528Hz)", category: "nature" },
  { id: "deep-into-nature-60", label: "Deep Into Nature (60 min)", category: "nature" },
  { id: "inner-calling-60", label: "Inner Calling (60 min)", category: "nature" },
  { id: "peaceful-ocean-60", label: "Peaceful Ocean (60 min)", category: "nature" },
  { id: "music-ambient", label: "Ambient Bed", category: "music" },
  { id: "music-drone", label: "Drone Bed", category: "music" },
  { id: "music-crystal", label: "Crystal Bed", category: "music" },
  // ── TrueHz HQ Alarm Sounds — purpose-built wake tracks ─────────────────────────────────────────────
  { id: "alarm-birds-good-morning-444", label: "Birds Good Morning · 444Hz", category: "nature" },
  { id: "alarm-acoustic-inspiration-528", label: "Acoustic Inspiration · 528Hz", category: "nature" },
  { id: "alarm-rise-in-relaxation-432", label: "Rise in Relaxation · 432Hz", category: "nature" },
  { id: "alarm-harmony-alarm-528", label: "Harmony Alarm · 528Hz", category: "nature" },
  { id: "alarm-relaxing-wakeup-417", label: "Relaxing Wake Up · 417Hz", category: "nature" },
  { id: "alarm-high-energy-inspiration-639", label: "High Energy Inspiration · 639Hz", category: "nature" },
  { id: "alarm-morning-sunrise-639", label: "Morning Sunrise · 639Hz", category: "nature" },
  { id: "alarm-blissful-harmony-396", label: "Blissful Harmony · 396Hz", category: "nature" },
  { id: "alarm-beautiful-sunshine-444", label: "Beautiful Sunshine · 444Hz", category: "nature" },
  { id: "alarm-rise-with-clarity-528", label: "Rise with Clarity · 528Hz", category: "nature" },
];

const LOOP_LABELS = Object.fromEntries(
  BACKGROUND_LOOPS.map(loop => [loop.id, loop.label]),
) as Record<string, string>;

/**
 * Static public URLs under client/public/audio/ (bundled for deploy).
 * Prefer these over /manus-storage/* signed S3 paths — those 403 on new Manus projects.
 */
const LIBRARY_LOOP_URLS: Record<string, string> = {
  "ambient-bowl": "/audio/ambient-bowl.mp3",
  "ambient-cave": "/audio/ambient-cave.mp3",
  "ambient-fire": "/audio/ambient-fire.mp3",
  "ambient-forest": "/audio/ambient-forest.mp3",
  "ambient-night": "/audio/ambient-night.mp3",
  "ambient-ocean": "/audio/ambient-ocean.mp3",
  "ambient-rain": "/audio/ambient-rain.mp3",
  "ambient-river": "/audio/ambient-river.mp3",
  "ambient-wind": "/audio/ambient-wind.mp3",
  "sleep-preparation": "/audio/sleep-preparation.mp3",
  "deep-focus": "/audio/deep-focus.mp3",
  "anxiety-reset": "/audio/anxiety-reset.mp3",
  "chakra-dawn": "/audio/chakra-dawn.mp3",
  "morning-breath": "/audio/morning-breath.mp3",
  "reiki-432": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/EyknnrbApNwsjQOZ.mp3",
  // TrueHz HQ meditation masters (full-length) — hosted on Manus CDN (permanent)
  "deep-into-nature-60": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/WKmRGyioQaoQKeeJ.mp3",
  "inner-calling-60": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/ktyVgoowVIAMSvwT.mp3",
  "peaceful-ocean-60": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/gjiHzXouliJdAAeH.mp3",
  "calm-sleep-528": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/IYQghxoiyPtmxTWZ.mp3",
  "deep-serenity-444": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/XrswIdGeuQpsHQZo.mp3",
  "nature-meditation-174": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/ySLrOnBvjVJpOcpp.mp3",
  "reiki-healing-garden-285": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/JMfdCoiZFkPyxCYD.mp3",
  "spiritual-meditation-444": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/GtKAQCHgteBuniTF.mp3",
  "third-eye-activation-528": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/fsamjpcaHNeOwiPp.mp3",
  "binaural-174": "/audio/binaural-174.mp3",
  "binaural-285": "/audio/binaural-285.mp3",
  "binaural-396": "/audio/binaural-396.mp3",
  "binaural-417": "/audio/binaural-417.mp3",
  "binaural-432": "/audio/binaural-432.mp3",
  "binaural-528": "/audio/binaural-528.mp3",
  "binaural-639": "/audio/binaural-639.mp3",
  "binaural-741": "/audio/binaural-741.mp3",
  "binaural-852": "/audio/binaural-852.mp3",
  "binaural-963": "/audio/binaural-963.mp3",
  "music-ambient": "/audio/music-ambient.mp3",
  "music-crystal": "/audio/music-crystal.mp3",
  "music-drone": "/audio/music-drone.mp3",
  // ── TrueHz HQ Alarm Sounds (Manus CDN, permanent) ──────────────────────────────────────────────────────────────
  "alarm-birds-good-morning-444": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/jNDSkiXhLpIfeRsc.mp3",
  "alarm-acoustic-inspiration-528": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/EtaamAWZVGQVUlNS.mp3",
  "alarm-rise-in-relaxation-432": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/PsKhiBxYIrKyrOao.mp3",
  "alarm-harmony-alarm-528": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/ehKnkgqKIVtYTMIK.mp3",
  "alarm-relaxing-wakeup-417": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/JboGdwWxkqAXXCGB.mp3",
  "alarm-high-energy-inspiration-639": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/XaQSFIqwcAdYXdKY.mp3",
  "alarm-morning-sunrise-639": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/JPNwuluEFJFDzbaR.mp3",
  "alarm-blissful-harmony-396": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/QRgGTFwLuJzEQUyT.mp3",
  "alarm-beautiful-sunshine-444": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/BuoDcjBgDfeZUaIc.mp3",
  "alarm-rise-with-clarity-528": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/PVuBTziwJCdleKop.mp3",
};

export function getLibraryLoopUrl(loopId: string): string {
  return LIBRARY_LOOP_URLS[loopId] ?? `/audio/${loopId}.mp3`;
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
