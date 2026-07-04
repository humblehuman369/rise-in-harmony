/**
 * Sound Studio shared catalog — built-in presets and layer option lists.
 * Ported from the web app's useSoundStudio.ts so web and mobile stay in sync.
 */
import type { StudioBuiltinPreset, StudioMusicMode, StudioNatureSound } from "@rih/shared-types";

export const STUDIO_FREQUENCIES: { hz: number; name: string; color: string }[] = [
  { hz: 174, name: "Foundation", color: "#EF4444" },
  { hz: 285, name: "Quantum", color: "#F97316" },
  { hz: 396, name: "Liberation", color: "#EAB308" },
  { hz: 417, name: "Transmutation", color: "#84CC16" },
  { hz: 432, name: "Natural Harmony", color: "#00D4AA" },
  { hz: 528, name: "Miracle Tone", color: "#3B82F6" },
  { hz: 639, name: "Connection", color: "#8B5CF6" },
  { hz: 741, name: "Awakening", color: "#A855F7" },
  { hz: 852, name: "Spiritual", color: "#EC4899" },
  { hz: 963, name: "Divine", color: "#F472B6" },
];

export const STUDIO_MUSIC_MODES: {
  id: StudioMusicMode;
  label: string;
  desc: string;
  icon: string;
}[] = [
  { id: "none", label: "Off", desc: "Pure frequency only", icon: "—" },
  { id: "ambient", label: "Ambient", desc: "Evolving pentatonic chords", icon: "♪" },
  { id: "drone", label: "Drone", desc: "Deep resonant harmonics", icon: "〰" },
  { id: "crystal", label: "Crystal", desc: "Singing bowl tones", icon: "◇" },
];

export const STUDIO_NATURE_SOUNDS: {
  id: StudioNatureSound;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { id: "none", label: "Off", emoji: "—", color: "#4A5568" },
  { id: "rain", label: "Rain", emoji: "🌧️", color: "#3B82F6" },
  { id: "ocean", label: "Ocean", emoji: "🌊", color: "#00D4AA" },
  { id: "forest", label: "Forest", emoji: "🌲", color: "#22C55E" },
  { id: "wind", label: "Wind", emoji: "🌬️", color: "#94A3B8" },
  { id: "fire", label: "Fire", emoji: "🔥", color: "#F97316" },
];

export const STUDIO_PRESETS: StudioBuiltinPreset[] = [
  {
    id: "deep-sleep",
    name: "Deep Sleep",
    description: "174Hz + ocean + drone for profound rest",
    icon: "🌙",
    color: "#8B5CF6",
    settings: {
      frequencyHz: 174,
      musicMode: "drone",
      natureSound: "ocean",
      frequencyVolume: 0.5,
      musicVolume: 0.3,
      natureVolume: 0.5,
    },
  },
  {
    id: "morning-rise",
    name: "Morning Rise",
    description: "528Hz miracle tone + forest + crystal bowls",
    icon: "🌅",
    color: "#F59E0B",
    settings: {
      frequencyHz: 528,
      musicMode: "crystal",
      natureSound: "forest",
      frequencyVolume: 0.7,
      musicVolume: 0.5,
      natureVolume: 0.3,
    },
  },
  {
    id: "deep-focus",
    name: "Deep Focus",
    description: "432Hz + rain + ambient for flow state",
    icon: "🧠",
    color: "#3B82F6",
    settings: {
      frequencyHz: 432,
      musicMode: "ambient",
      natureSound: "rain",
      frequencyVolume: 0.4,
      musicVolume: 0.5,
      natureVolume: 0.4,
    },
  },
  {
    id: "heart-healing",
    name: "Heart Healing",
    description: "639Hz connection + forest + ambient chords",
    icon: "💚",
    color: "#00D4AA",
    settings: {
      frequencyHz: 639,
      musicMode: "ambient",
      natureSound: "forest",
      frequencyVolume: 0.6,
      musicVolume: 0.4,
      natureVolume: 0.35,
    },
  },
  {
    id: "meditation",
    name: "Deep Meditation",
    description: "963Hz crown + wind + drone for transcendence",
    icon: "✦",
    color: "#EC4899",
    settings: {
      frequencyHz: 963,
      musicMode: "drone",
      natureSound: "wind",
      frequencyVolume: 0.5,
      musicVolume: 0.45,
      natureVolume: 0.3,
    },
  },
  {
    id: "pure-frequency",
    name: "Pure Frequency",
    description: "Unblended healing tone — just the frequency",
    icon: "〰",
    color: "#6B7A99",
    settings: {
      frequencyHz: 432,
      musicMode: "none",
      natureSound: "none",
      frequencyVolume: 0.8,
      musicVolume: 0,
      natureVolume: 0,
    },
  },
];

// ─── Musical helpers (just-intonation, shared by web + mobile engines) ────────

/** Fixed stable drone: sub-octave + root + perfect fifth + octave */
export function droneFreqs(rootHz: number): number[] {
  return [rootHz * 0.5, rootHz, rootHz * 1.5, rootHz * 2];
}

/** Stable major triad in just intonation, with sub-octave root */
export function ambientChordFreqs(rootHz: number): number[] {
  return [rootHz * 0.5, rootHz, rootHz * (5 / 4), rootHz * (3 / 2)];
}

/** Singing bowl: fundamental + octave only */
export function bowlFreqs(rootHz: number): number[] {
  return [rootHz, rootHz * 2];
}
