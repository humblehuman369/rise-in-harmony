/**
 * FrequencyStudio — Unified Frequency + Ambient Mixer
 *
 * Merges the old SoundStudio (layered ambient mixing, nature synth, presets,
 * breathing guide, session journal) with the Precision Player (DDS worklet,
 * all waveforms, binaural/isochronic, signal analysis, frequency browser,
 * account saves, uploads).
 *
 * Layout: dense 2-column grid on desktop (controls left, playback/presets right),
 * single-column on mobile with sticky play bar at bottom.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Play, Square, Star, StarOff, Plus, Minus, Clock, Activity, Upload,
  Save, Loader2, Music2, ChevronDown, ChevronUp, Headphones, Library,
  Volume2, Sliders, Wind, Flame, TreePine, CloudRain, Waves, Moon,
  Timer, Trash2, Pause,
} from "lucide-react";
import FrequencyBrowser from "@/components/FrequencyBrowser";
import type { HealingFrequency } from "@/data/healingFrequencies";
import Layout from "@/components/Layout";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { usePrecisionPlayer, type Waveform, type PlayMode, type PrecisionSession } from "@/hooks/usePrecisionPlayer";
import { useBackgroundLayer } from "@/hooks/useBackgroundLayer";
import PrecisionVisualizer from "@/components/PrecisionVisualizer";
import { BACKGROUND_LOOPS, type BackgroundType, getLibraryLoopUrl } from "@/data/backgroundLoops";
import { uploadSoundMp3 } from "@/lib/soundUpload";
import { STUDIO_PRESETS } from "@/hooks/useSoundStudio";
import { startNatureSynth, type NatureSynthHandle } from "@/lib/natureSynth";
import BreathingGuide from "@/components/BreathingGuide";
import SessionJournal from "@/components/SessionJournal";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Constants ──────────────────────────────────────────────────────────────

const WAVEFORMS: Waveform[] = ["sine", "square", "triangle", "sawtooth", "bowl"];
const WAVEFORM_LABELS: Record<Waveform, string> = {
  sine: "Sine", square: "Square", triangle: "Triangle", sawtooth: "Saw", bowl: "Bowl",
};

const SLEEP_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

const NATURE_SOUNDS = [
  { id: "rain", label: "Rain", Icon: CloudRain, color: "#3B82F6" },
  { id: "ocean", label: "Ocean", Icon: Waves, color: "#00D4AA" },
  { id: "forest", label: "Forest", Icon: TreePine, color: "#22C55E" },
  { id: "wind", label: "Wind", Icon: Wind, color: "#94A3B8" },
  { id: "fire", label: "Fire", Icon: Flame, color: "#F97316" },
  { id: "river", label: "River", Icon: Waves, color: "#38BDF8" },
  { id: "night", label: "Night", Icon: Moon, color: "#818CF8" },
  { id: "cave", label: "Cave", Icon: Minus, color: "#A78BFA" },
  { id: "bowl", label: "Bowl", Icon: Music2, color: "#FBBF24" },
] as const;

const MUSIC_MODES = [
  { id: "ambient", label: "Ambient", color: "#3B82F6" },
  { id: "drone", label: "Drone", color: "#8B5CF6" },
  { id: "crystal", label: "Crystal", color: "#FBBF24" },
] as const;

// Precision presets (Solfeggio + Binaural)
const PRECISION_PRESETS: Array<{ label: string; session: PrecisionSession; color: string }> = [
  { label: "174 Hz — Foundation", color: "#EF4444", session: { freqL: 174, waveform: "sine", mode: "mono", name: "174 Hz Foundation" } },
  { label: "396 Hz — Liberation", color: "#EAB308", session: { freqL: 396, waveform: "sine", mode: "mono", name: "396 Hz Liberation" } },
  { label: "417 Hz — Transmutation", color: "#84CC16", session: { freqL: 417, waveform: "sine", mode: "mono", name: "417 Hz Transmutation" } },
  { label: "432 Hz — Natural Harmony", color: "#00D4AA", session: { freqL: 432, waveform: "sine", mode: "mono", name: "432 Hz Natural Harmony" } },
  { label: "528 Hz — Miracle Tone", color: "#06B6D4", session: { freqL: 528, waveform: "sine", mode: "mono", name: "528 Hz Miracle Tone" } },
  { label: "639 Hz — Connection", color: "#3B82F6", session: { freqL: 639, waveform: "sine", mode: "mono", name: "639 Hz Connection" } },
  { label: "741 Hz — Awakening", color: "#8B5CF6", session: { freqL: 741, waveform: "sine", mode: "mono", name: "741 Hz Awakening" } },
  { label: "852 Hz — Spiritual Order", color: "#A855F7", session: { freqL: 852, waveform: "sine", mode: "mono", name: "852 Hz Spiritual Order" } },
  { label: "963 Hz — Divine Consciousness", color: "#EC4899", session: { freqL: 963, waveform: "sine", mode: "mono", name: "963 Hz Divine Consciousness" } },
  { label: "Alpha 10 Hz beat", color: "#00D4AA", session: { freqL: 200, beatHz: 10, waveform: "sine", mode: "binaural", name: "Alpha 10 Hz" } },
  { label: "Theta 6 Hz beat", color: "#8B5CF6", session: { freqL: 200, beatHz: 6, waveform: "sine", mode: "binaural", name: "Theta 6 Hz" } },
  { label: "Delta 2 Hz beat", color: "#6366F1", session: { freqL: 200, beatHz: 2, waveform: "sine", mode: "binaural", name: "Delta 2 Hz" } },
  { label: "Gamma 40 Hz beat", color: "#F59E0B", session: { freqL: 200, beatHz: 40, waveform: "sine", mode: "binaural", name: "Gamma 40 Hz" } },
];

// ─── Favorites persistence ──────────────────────────────────────────────────
interface Favorite {
  id: string;
  name: string;
  session: PrecisionSession;
}
const FAVORITES_KEY = "rih-precision-favorites";
function loadFavorites(): Favorite[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]"); } catch { return []; }
}
function saveFavorites(favs: Favorite[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

// ─── Custom mix persistence (from old Studio) ───────────────────────────────
interface CustomMix {
  id: string;
  name: string;
  createdAt: number;
  freq: number;
  waveform: Waveform;
  mode: PlayMode;
  beatHz?: number;
  isoRate?: number;
  isoDuty?: number;
  natureSound: string | null;
  musicMode: string | null;
  ambientVolume: number;
}
const CUSTOM_MIX_KEY = "rih_custom_mixes";
function loadCustomMixes(): CustomMix[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_MIX_KEY) ?? "[]"); } catch { return []; }
}
function saveCustomMixes(mixes: CustomMix[]) {
  localStorage.setItem(CUSTOM_MIX_KEY, JSON.stringify(mixes));
}

// ─── Nature synth layer hook ────────────────────────────────────────────────
function useNatureLayer(getAudioContext: () => AudioContext | null) {
  const synthRef = useRef<NatureSynthHandle | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const [activeNature, setActiveNature] = useState<string | null>(null);
  const [natureVolume, setNatureVolumeState] = useState(0.35);

  const stopNature = useCallback(() => {
    if (synthRef.current) {
      try { synthRef.current.stop(); } catch {}
      synthRef.current = null;
    }
    if (gainRef.current) {
      try { gainRef.current.disconnect(); } catch {}
      gainRef.current = null;
    }
  }, []);

  const startNature = useCallback((sound: string, volume: number) => {
    stopNature();
    const ctx = getAudioContext();
    if (!ctx) return;

    const handle = startNatureSynth(ctx, sound);
    if (!handle) return;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2);
    gain.connect(ctx.destination);
    handle.output.connect(gain);

    synthRef.current = handle;
    gainRef.current = gain;
  }, [getAudioContext, stopNature]);

  const selectNature = useCallback((sound: string | null, isPlaying: boolean) => {
    setActiveNature(sound);
    if (!sound || sound === "none") {
      stopNature();
    } else if (isPlaying) {
      startNature(sound, natureVolume);
    }
  }, [stopNature, startNature, natureVolume]);

  const setNatureVolume = useCallback((v: number) => {
    setNatureVolumeState(v);
    const ctx = getAudioContext();
    if (gainRef.current && ctx) {
      gainRef.current.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
    }
  }, [getAudioContext]);

  useEffect(() => {
    return () => stopNature();
  }, [stopNature]);

  return { activeNature, natureVolume, selectNature, setNatureVolume, startNature, stopNature };
}

// ─── Music layer hook (library loops for ambient/drone/crystal) ─────────────
function useMusicLayer(getAudioContext: () => AudioContext | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const [activeMusic, setActiveMusic] = useState<string | null>(null);
  const [musicVolume, setMusicVolumeState] = useState(0.4);

  const stopMusic = useCallback(() => {
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch {}
      sourceRef.current = null;
    }
    if (gainRef.current) {
      try { gainRef.current.disconnect(); } catch {}
      gainRef.current = null;
    }
  }, []);

  const startMusic = useCallback((mode: string, volume: number) => {
    stopMusic();
    const ctx = getAudioContext();
    if (!ctx) return;

    const loopId = `music-${mode}`;
    const loop = BACKGROUND_LOOPS.find(l => l.id === loopId);
    if (!loop) return;

    const url = getLibraryLoopUrl(loop.id);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2);
    gain.connect(ctx.destination);

    const audio = new Audio(url);
    audio.loop = true;
    audio.crossOrigin = "anonymous";
    audio.volume = 1;

    const source = ctx.createMediaElementSource(audio);
    source.connect(gain);

    audioRef.current = audio;
    sourceRef.current = source;
    gainRef.current = gain;

    audio.play().catch(() => {});
  }, [getAudioContext, stopMusic]);

  const selectMusic = useCallback((mode: string | null, isPlaying: boolean) => {
    setActiveMusic(mode);
    if (!mode || mode === "none") {
      stopMusic();
    } else if (isPlaying) {
      startMusic(mode, musicVolume);
    }
  }, [stopMusic, startMusic, musicVolume]);

  const setMusicVolume = useCallback((v: number) => {
    setMusicVolumeState(v);
    const ctx = getAudioContext();
    if (gainRef.current && ctx) {
      gainRef.current.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
    }
  }, [getAudioContext]);

  useEffect(() => {
    return () => stopMusic();
  }, [stopMusic]);

  return { activeMusic, musicVolume, selectMusic, setMusicVolume, startMusic, stopMusic };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FrequencyStudio() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const player = usePrecisionPlayer();
  const background = useBackgroundLayer(() => player.getAudioContext());
  const nature = useNatureLayer(() => player.getAudioContext());
  const music = useMusicLayer(() => player.getAudioContext());
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const createSound = trpc.sounds.create.useMutation({
    onSuccess: () => {
      void utils.sounds.list.invalidate();
      void utils.sounds.listUploads.invalidate();
    },
  });
  const uploadsQuery = trpc.sounds.listUploads.useQuery(undefined, { enabled: !!user });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deep link support
  const deepLinkLoadedRef = useRef<number | null>(null);
  const soundIdParam = (() => {
    if (typeof window === "undefined") return null;
    const id = new URLSearchParams(window.location.search).get("sound");
    return id ? Number(id) : null;
  })();
  const savedSoundQuery = trpc.sounds.get.useQuery(
    { id: soundIdParam ?? 0 },
    { enabled: !!user && soundIdParam !== null && !Number.isNaN(soundIdParam) && soundIdParam > 0 },
  );

  // ── Core state ────────────────────────────────────────────────────────────
  const [customFreq, setCustomFreq] = useState<number>(528);
  const [customFreqInput, setCustomFreqInput] = useState("528.00");
  const [beatHz, setBeatHz] = useState<number>(10);
  const [isoRate, setIsoRate] = useState<number>(10);
  const [isoDuty, setIsoDuty] = useState<number>(0.5);
  const [waveform, setWaveformState] = useState<Waveform>("sine");
  const [playMode, setPlayMode] = useState<PlayMode>("mono");
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);
  const [vizMode, setVizMode] = useState<"oscilloscope" | "spectrum" | "both">("both");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const sessionStartRef = useRef<number | null>(null);

  // Ambient tab state
  const [ambientTab, setAmbientTab] = useState<"nature" | "music" | "uploads">("nature");

  // Premium status
  const subStatus = trpc.subscription.status.useQuery(undefined, { enabled: !!user });
  const isPremium = subStatus.data?.isPremium ?? false;

  // Favorites
  const [favorites, setFavorites] = useState<Favorite[]>(loadFavorites);
  const [favNameInput, setFavNameInput] = useState("");
  const [showFavInput, setShowFavInput] = useState(false);

  // Save to account
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState("");

  // Custom mixes
  const [customMixes, setCustomMixes] = useState<CustomMix[]>(loadCustomMixes);
  const [showMixSave, setShowMixSave] = useState(false);
  const [mixNameInput, setMixNameInput] = useState("");

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [pendingUploads, setPendingUploads] = useState<Array<{ key: string; label: string }>>([]);

  // Presets tab
  const [presetTab, setPresetTab] = useState<"solfeggio" | "lifestyle" | "mixes" | "favorites">("solfeggio");

  // ── Deep link load ────────────────────────────────────────────────────────
  const applySavedSound = useCallback((sound: {
    freqL: number; beatHz: number | null; isoRate: number | null; isoDuty: number | null;
    waveform: string; mode: string; toneVolume: number;
    backgroundType: string; backgroundKey: string | null; backgroundVolume: number;
  }) => {
    setCustomFreq(sound.freqL);
    setCustomFreqInput(sound.freqL.toFixed(2));
    setWaveformState(sound.waveform as Waveform);
    setPlayMode(sound.mode as PlayMode);
    if (sound.beatHz != null) setBeatHz(sound.beatHz);
    if (sound.isoRate != null) setIsoRate(sound.isoRate);
    if (sound.isoDuty != null) setIsoDuty(sound.isoDuty);
    player.setVolume(sound.toneVolume);
    background.selectBackground(sound.backgroundType as BackgroundType, sound.backgroundKey, player.isPlaying);
    background.setBackgroundVolume(sound.backgroundVolume);
  }, [player, background]);

  useEffect(() => {
    const sound = savedSoundQuery.data;
    if (!sound || deepLinkLoadedRef.current === sound.id) return;
    deepLinkLoadedRef.current = sound.id;
    applySavedSound(sound);
    toast.success(`Loaded "${sound.name}"`);
  }, [savedSoundQuery.data, applySavedSound]);

  // ── Build session from UI state ───────────────────────────────────────────
  const buildSession = useCallback((): PrecisionSession => {
    const base: PrecisionSession = { freqL: customFreq, waveform, mode: playMode, name: `${customFreq.toFixed(2)} Hz` };
    if (playMode === "binaural") { base.beatHz = beatHz; base.freqR = customFreq + beatHz; }
    if (playMode === "isochronic") { base.isoRate = isoRate; base.isoDuty = isoDuty; }
    return base;
  }, [customFreq, waveform, playMode, beatHz, isoRate, isoDuty]);

  // ── Play / Stop ───────────────────────────────────────────────────────────
  const handlePlay = useCallback(async () => {
    if (player.isPlaying) {
      // Stopping — prompt journal if session > 30s
      const elapsed = sessionStartRef.current ? (Date.now() - sessionStartRef.current) / 1000 : 0;
      if (elapsed > 30) setShowJournal(true);
      sessionStartRef.current = null;
      background.stopBackground();
      nature.stopNature();
      music.stopMusic();
      player.stopAudio();
    } else {
      sessionStartRef.current = Date.now();
      await player.play(buildSession());
      // Start ambient layers if selected
      if (background.layer.type !== "none") {
        await background.startBackground(background.layer.type, background.layer.key, background.layer.volume);
      }
      if (nature.activeNature && nature.activeNature !== "none") {
        nature.startNature(nature.activeNature, nature.natureVolume);
      }
      if (music.activeMusic && music.activeMusic !== "none") {
        music.startMusic(music.activeMusic, music.musicVolume);
      }
    }
  }, [player, buildSession, background, nature, music]);

  // ── Preset handlers ───────────────────────────────────────────────────────
  const handlePrecisionPreset = useCallback(async (preset: typeof PRECISION_PRESETS[0]) => {
    const s = preset.session;
    setCustomFreq(s.freqL);
    setCustomFreqInput(s.freqL.toFixed(2));
    setWaveformState(s.waveform);
    setPlayMode(s.mode);
    if (s.beatHz !== undefined) setBeatHz(s.beatHz);
    if (s.isoRate !== undefined) setIsoRate(s.isoRate);
    sessionStartRef.current = Date.now();
    await player.play(s);
    if (background.layer.type !== "none") {
      await background.startBackground(background.layer.type, background.layer.key, background.layer.volume);
    }
    if (nature.activeNature && nature.activeNature !== "none") {
      nature.startNature(nature.activeNature, nature.natureVolume);
    }
    if (music.activeMusic && music.activeMusic !== "none") {
      music.startMusic(music.activeMusic, music.musicVolume);
    }
  }, [player, background, nature, music]);

  const handleLifestylePreset = useCallback(async (preset: typeof STUDIO_PRESETS[0]) => {
    const s = preset.settings;
    const hz = s.frequencyHz ?? 432;
    setCustomFreq(hz);
    setCustomFreqInput(hz.toFixed(2));
    setWaveformState("sine");
    setPlayMode("mono");
    // Apply nature + music from preset
    if (s.natureSound && s.natureSound !== "none") {
      nature.selectNature(s.natureSound, true);
    } else {
      nature.selectNature(null, false);
    }
    if (s.musicMode && s.musicMode !== "none") {
      music.selectMusic(s.musicMode, true);
    } else {
      music.selectMusic(null, false);
    }
    sessionStartRef.current = Date.now();
    await player.play({ freqL: hz, waveform: "sine", mode: "mono", name: preset.name });
    // Start nature/music after play since AudioContext is now active
    if (s.natureSound && s.natureSound !== "none") {
      nature.startNature(s.natureSound, s.natureVolume ?? 0.35);
    }
    if (s.musicMode && s.musicMode !== "none") {
      music.startMusic(s.musicMode, s.musicVolume ?? 0.4);
    }
  }, [player, nature, music]);

  // ── Frequency input ───────────────────────────────────────────────────────
  const commitFreq = useCallback(() => {
    const parsed = parseFloat(customFreqInput);
    if (isNaN(parsed) || parsed < 1 || parsed > 22000) {
      toast.error("Frequency must be between 1 and 22,000 Hz");
      setCustomFreqInput(customFreq.toFixed(2));
      return;
    }
    const rounded = Math.round(parsed * 100) / 100;
    setCustomFreq(rounded);
    setCustomFreqInput(rounded.toFixed(2));
    if (player.isPlaying) {
      const freqR = playMode === "binaural" ? rounded + beatHz : undefined;
      player.setFrequency(rounded, freqR);
    }
  }, [customFreqInput, customFreq, player, playMode, beatHz]);

  const nudgeFreq = useCallback((delta: number) => {
    const next = Math.round((customFreq + delta) * 100) / 100;
    const clamped = Math.max(1, Math.min(22000, next));
    setCustomFreq(clamped);
    setCustomFreqInput(clamped.toFixed(2));
    if (player.isPlaying) {
      const freqR = playMode === "binaural" ? clamped + beatHz : undefined;
      player.setFrequency(clamped, freqR);
    }
  }, [customFreq, player, playMode, beatHz]);

  // ── Play mode / waveform ──────────────────────────────────────────────────
  const handlePlayMode = useCallback((m: PlayMode) => {
    setPlayMode(m);
    if (player.isPlaying) player.setMode(m, { freqL: customFreq, beatHz, isoRate, isoDuty });
  }, [player, customFreq, beatHz, isoRate, isoDuty]);

  const handleWaveform = useCallback((w: Waveform) => {
    setWaveformState(w);
    if (player.isPlaying) player.setWaveform(w);
  }, [player]);

  // ── Sleep timer ───────────────────────────────────────────────────────────
  const handleSleepTimer = useCallback((min: number) => {
    setSleepMinutes(min);
    player.setSleepTimer(min);
    toast(`Sleep timer set for ${min} minutes`);
  }, [player]);

  // ── Favorites ─────────────────────────────────────────────────────────────
  const addFavorite = useCallback(() => {
    const name = favNameInput.trim() || `${customFreq.toFixed(2)} Hz`;
    const fav: Favorite = { id: `${Date.now()}`, name, session: buildSession() };
    const updated = [fav, ...favorites];
    setFavorites(updated);
    saveFavorites(updated);
    setFavNameInput("");
    setShowFavInput(false);
    toast(`"${name}" saved to favorites`);
  }, [favNameInput, customFreq, buildSession, favorites]);

  const removeFavorite = useCallback((id: string) => {
    const updated = favorites.filter(f => f.id !== id);
    setFavorites(updated);
    saveFavorites(updated);
  }, [favorites]);

  // ── Custom mix save ───────────────────────────────────────────────────────
  const saveCurrentMix = useCallback(() => {
    const name = mixNameInput.trim() || `My Mix ${customMixes.length + 1}`;
    const mix: CustomMix = {
      id: `mix_${Date.now()}`,
      name,
      createdAt: Date.now(),
      freq: customFreq,
      waveform,
      mode: playMode,
      beatHz: playMode === "binaural" ? beatHz : undefined,
      isoRate: playMode === "isochronic" ? isoRate : undefined,
      isoDuty: playMode === "isochronic" ? isoDuty : undefined,
      natureSound: nature.activeNature,
      musicMode: music.activeMusic,
      ambientVolume: nature.natureVolume,
    };
    const updated = [...customMixes, mix];
    setCustomMixes(updated);
    saveCustomMixes(updated);
    setShowMixSave(false);
    setMixNameInput("");
    toast(`Mix saved: "${name}"`);
  }, [mixNameInput, customMixes, customFreq, waveform, playMode, beatHz, isoRate, isoDuty, nature, music]);

  const deleteCustomMix = useCallback((id: string) => {
    const updated = customMixes.filter(m => m.id !== id);
    setCustomMixes(updated);
    saveCustomMixes(updated);
    toast("Mix removed");
  }, [customMixes]);

  const applyCustomMix = useCallback(async (mix: CustomMix) => {
    setCustomFreq(mix.freq);
    setCustomFreqInput(mix.freq.toFixed(2));
    setWaveformState(mix.waveform);
    setPlayMode(mix.mode);
    if (mix.beatHz) setBeatHz(mix.beatHz);
    if (mix.isoRate) setIsoRate(mix.isoRate);
    if (mix.isoDuty) setIsoDuty(mix.isoDuty);
    nature.selectNature(mix.natureSound, true);
    music.selectMusic(mix.musicMode, true);
    sessionStartRef.current = Date.now();
    const session: PrecisionSession = {
      freqL: mix.freq, waveform: mix.waveform, mode: mix.mode,
      beatHz: mix.beatHz, isoRate: mix.isoRate, isoDuty: mix.isoDuty,
      name: mix.name,
    };
    await player.play(session);
    if (mix.natureSound && mix.natureSound !== "none") {
      nature.startNature(mix.natureSound, mix.ambientVolume);
    }
    if (mix.musicMode && mix.musicMode !== "none") {
      music.startMusic(mix.musicMode, music.musicVolume);
    }
  }, [player, nature, music]);

  // ── Save to account ───────────────────────────────────────────────────────
  const saveSound = useCallback(async () => {
    if (!user) {
      toast.error("Sign in to save sounds", {
        action: { label: "Sign in", onClick: () => { window.location.href = getLoginUrl(); } },
      });
      return;
    }
    try {
      await createSound.mutateAsync({
        name: saveNameInput.trim() || `${customFreq.toFixed(2)} Hz mix`,
        freqL: customFreq,
        beatHz: playMode === "binaural" ? beatHz : undefined,
        isoRate: playMode === "isochronic" ? isoRate : undefined,
        isoDuty: playMode === "isochronic" ? isoDuty : undefined,
        waveform,
        mode: playMode,
        toneVolume: player.volume,
        backgroundType: background.layer.type,
        backgroundKey: background.layer.type === "none" ? undefined : (background.layer.key ?? undefined),
        backgroundVolume: background.layer.volume,
      });
      setSaveNameInput("");
      setShowSaveInput(false);
      toast.success("Sound saved to your account");
    } catch { toast.error("Could not save sound"); }
  }, [user, createSound, saveNameInput, customFreq, playMode, beatHz, isoRate, isoDuty, waveform, player.volume, background.layer]);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = useCallback(async (file: File) => {
    if (!user) {
      toast.error("Sign in to upload MP3 backgrounds", {
        action: { label: "Sign in", onClick: () => { window.location.href = getLoginUrl(); } },
      });
      return;
    }
    setUploadProgress(0);
    try {
      const result = await uploadSoundMp3(file, setUploadProgress);
      const label = file.name.replace(/\.mp3$/i, "");
      setPendingUploads(prev => [{ key: result.key, label }, ...prev.filter(u => u.key !== result.key)]);
      background.selectBackground("upload", result.key, player.isPlaying);
      toast.success(`Uploaded "${label}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [user, background, player.isPlaying]);

  const uploadOptions = [
    ...pendingUploads,
    ...(uploadsQuery.data ?? []).map(key => ({
      key,
      label: key.split("/").pop()?.replace(/\.mp3$/i, "") ?? key,
    })).filter(u => !pendingUploads.some(p => p.key === u.key)),
  ];

  // ── Browser select ────────────────────────────────────────────────────────
  const handleBrowserSelect = useCallback((freq: HealingFrequency) => {
    const hz = freq.hz;
    setCustomFreq(hz);
    setCustomFreqInput(hz.toFixed(2));
    if (player.isPlaying) {
      const freqR = playMode === "binaural" ? hz + beatHz : undefined;
      player.setFrequency(hz, freqR);
    }
    toast(`Loaded ${freq.name} — ${hz} Hz`);
  }, [player, playMode, beatHz]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const targetHz = playMode === "binaural" ? beatHz : customFreq;
  const analyserNode = player.isPlaying ? player.analyserNode : null;
  const sessionDurationMin = sessionStartRef.current
    ? Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 60000))
    : 5;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="container py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-2"
            style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.2)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}>
            <Activity size={12} />
            Precision Frequency Studio — DDS Precision Engine
          </div>
          <h1 className="text-2xl font-semibold mb-0.5" style={{ fontFamily: "Cormorant Garamond, serif", color: isLight ? "#1A1D2E" : "#E8EDF5" }}>
            Precision Frequency Studio
          </h1>
          <p className="text-xs" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
            Double-precision synthesis · Layered ambient mixing · ±0.05 Hz accuracy
          </p>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
          {/* ═══ LEFT COLUMN — Primary Controls ═══ */}
          <div className="space-y-4">
            {/* ── Frequency Input ─────────────────────────────────── */}
            <div className="p-4 rounded-2xl" style={{ background: isLight ? "#FFFFFF" : "#11142A", border: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                  Frequency
                </span>
                <button onClick={() => setBrowserOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all"
                  style={{ background: "rgba(0,212,170,0.1)", color: "#00D4AA", border: "1px solid rgba(0,212,170,0.2)" }}>
                  <Library size={11} /> More Frequencies
                </button>
              </div>
              {/* Quick-select frequency chips */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[174, 285, 396, 417, 432, 528, 639, 741, 852, 963].map(hz => (
                  <button key={hz} onClick={() => {
                    setCustomFreq(hz);
                    setCustomFreqInput(hz.toFixed(2));
                    if (player.isPlaying) {
                      const freqR = playMode === "binaural" ? hz + beatHz : undefined;
                      player.setFrequency(hz, freqR);
                    }
                  }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                    style={customFreq === hz ? {
                      background: "rgba(0,212,170,0.18)", color: isLight ? "#007A62" : "#00D4AA", border: "1px solid rgba(0,212,170,0.4)",
                    } : {
                      background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)", color: isLight ? "#4A5568" : "#8FA3BF", border: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.08)",
                    }}>
                    {hz} Hz
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => nudgeFreq(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)", color: isLight ? "#4A5568" : "#8FA3BF", border: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.08)" }}>
                  <Minus size={14} />
                </button>
                <input
                  type="text"
                  value={customFreqInput}
                  onChange={e => setCustomFreqInput(e.target.value)}
                  onBlur={commitFreq}
                  onKeyDown={e => e.key === "Enter" && commitFreq()}
                  className="flex-1 text-center text-xl font-mono-brand px-3 py-2 rounded-xl outline-none"
                  style={{ background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)", border: isLight ? "1px solid rgba(0,0,0,0.10)" : "1px solid rgba(255,255,255,0.1)", color: isLight ? "#1A1D2E" : "#E8EDF5" }}
                />
                <span className="text-sm font-medium" style={{ color: "#6B7A99" }}>Hz</span>
                <button onClick={() => nudgeFreq(1)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)", color: isLight ? "#4A5568" : "#8FA3BF", border: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.08)" }}>
                  <Plus size={14} />
                </button>
              </div>
              {/* Fine-tune slider */}
              <Slider
                min={1} max={2000} step={0.01}
                value={[Math.min(2000, customFreq)]}
                onValueChange={([v]) => {
                  setCustomFreq(v);
                  setCustomFreqInput(v.toFixed(2));
                  if (player.isPlaying) {
                    const freqR = playMode === "binaural" ? v + beatHz : undefined;
                    player.setFrequency(v, freqR);
                  }
                }}
              />
              <div className="flex justify-between text-[10px] mt-1" style={{ color: isLight ? "#9AA5B4" : "#3A4A6B" }}>
                <span>1 Hz</span><span>2000 Hz</span>
              </div>
            </div>

            {/* ── Sound Engine (Waveform + Play Mode) ────────────── */}
            <div className="p-4 rounded-2xl" style={{ background: isLight ? "#FFFFFF" : "#11142A", border: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-xs font-semibold uppercase tracking-widest block mb-3" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                Sound Engine
              </span>
              {/* Waveform */}
              <span className="text-[10px] font-medium uppercase tracking-wider block mb-1.5" style={{ color: isLight ? "#6B7A99" : "#4A5568" }}>Waveform</span>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {WAVEFORMS.map(w => (
                  <button key={w} onClick={() => handleWaveform(w)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={waveform === w ? {
                      background: "rgba(0,212,170,0.15)", color: isLight ? "#007A62" : "#00D4AA", border: "1px solid rgba(0,212,170,0.3)",
                    } : {
                      background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)", color: "#6B7A99", border: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)",
                    }}>
                    {WAVEFORM_LABELS[w]}
                  </button>
                ))}
              </div>
              {/* Play Mode */}
              <span className="text-[10px] font-medium uppercase tracking-wider block mb-1.5" style={{ color: isLight ? "#6B7A99" : "#4A5568" }}>Play Mode</span>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(["mono", "binaural", "isochronic"] as PlayMode[]).map(m => (
                  <button key={m} onClick={() => handlePlayMode(m)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                    style={playMode === m ? {
                      background: "rgba(139,92,246,0.15)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.3)",
                    } : {
                      background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)", color: "#6B7A99", border: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)",
                    }}>
                    {m}
                  </button>
                ))}
              </div>
              {/* Binaural beat Hz */}
              {playMode === "binaural" && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                  <span className="text-xs" style={{ color: "#8FA3BF", minWidth: 60 }}>Beat: {beatHz} Hz</span>
                  <Slider min={0.5} max={50} step={0.5} value={[beatHz]}
                    onValueChange={([v]) => {
                      setBeatHz(v);
                      if (player.isPlaying) player.setFrequency(customFreq, customFreq + v);
                    }}
                    className="flex-1"
                  />
                </div>
              )}
              {/* Isochronic params */}
              {playMode === "isochronic" && (
                <div className="space-y-2 p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "#8FA3BF", minWidth: 80 }}>Rate: {isoRate} Hz</span>
                    <Slider min={1} max={40} step={0.5} value={[isoRate]}
                      onValueChange={([v]) => { setIsoRate(v); if (player.isPlaying) player.setIsochronic(v, isoDuty); }}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "#8FA3BF", minWidth: 80 }}>Duty: {Math.round(isoDuty * 100)}%</span>
                    <Slider min={0.1} max={0.9} step={0.05} value={[isoDuty]}
                      onValueChange={([v]) => { setIsoDuty(v); if (player.isPlaying) player.setIsochronic(isoRate, v); }}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Ambient Layers (Nature / Music / Uploads) ──────── */}
            <div className="p-4 rounded-2xl" style={{ background: isLight ? "#FFFFFF" : "#11142A", border: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                  Ambient Layers
                </span>
              </div>
              {/* Tabs */}
              <div className="flex gap-1 mb-3">
                {(["nature", "music", "uploads"] as const).map(tab => (
                  <button key={tab} onClick={() => setAmbientTab(tab)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                    style={ambientTab === tab ? {
                      background: "rgba(0,212,170,0.12)", color: isLight ? "#007A62" : "#00D4AA", border: "1px solid rgba(0,212,170,0.25)",
                    } : {
                      background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.03)", color: "#6B7A99", border: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)",
                    }}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* Nature tab — procedural synth */}
              {ambientTab === "nature" && (
                <div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mb-3">
                    {NATURE_SOUNDS.map(ns => (
                      <button key={ns.id} onClick={() => nature.selectNature(
                        nature.activeNature === ns.id ? null : ns.id,
                        player.isPlaying,
                      )}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] transition-all"
                        style={nature.activeNature === ns.id ? {
                          background: `${ns.color}15`, border: `1px solid ${ns.color}40`, color: ns.color,
                        } : {
                          background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.03)", border: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)", color: "#6B7A99",
                        }}>
                        <ns.Icon size={14} />
                        {ns.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume2 size={12} style={{ color: "#6B7A99" }} />
                    <Slider min={0} max={1} step={0.01} value={[nature.natureVolume]}
                      onValueChange={([v]) => nature.setNatureVolume(v)} className="flex-1" />
                    <span className="text-[10px] font-mono-brand" style={{ color: "#6B7A99" }}>{Math.round(nature.natureVolume * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Music tab — library loops */}
              {ambientTab === "music" && (
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {MUSIC_MODES.map(mm => (
                      <button key={mm.id} onClick={() => music.selectMusic(
                        music.activeMusic === mm.id ? null : mm.id,
                        player.isPlaying,
                      )}
                        className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                        style={music.activeMusic === mm.id ? {
                          background: `${mm.color}15`, border: `1px solid ${mm.color}40`, color: mm.color,
                        } : {
                          background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.03)", border: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)", color: "#6B7A99",
                        }}>
                        {mm.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Music2 size={12} style={{ color: "#6B7A99" }} />
                    <Slider min={0} max={1} step={0.01} value={[music.musicVolume]}
                      onValueChange={([v]) => music.setMusicVolume(v)} className="flex-1" />
                    <span className="text-[10px] font-mono-brand" style={{ color: "#6B7A99" }}>{Math.round(music.musicVolume * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Uploads tab */}
              {ambientTab === "uploads" && (
                <div>
                  <input type="file" ref={fileInputRef} accept=".mp3,audio/mpeg" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all mb-3"
                    style={{ background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)", border: isLight ? "1px dashed rgba(0,0,0,0.15)" : "1px dashed rgba(255,255,255,0.15)", color: isLight ? "#4A5568" : "#8FA3BF" }}>
                    {uploadProgress !== null ? <><Loader2 size={12} className="animate-spin" /> Uploading {Math.round(uploadProgress * 100)}%</> : <><Upload size={12} /> Upload MP3</>}
                  </button>
                  {uploadOptions.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {uploadOptions.map(u => (
                        <button key={u.key} onClick={() => background.selectBackground("upload", u.key, player.isPlaying)}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all"
                          style={background.layer.key === u.key ? {
                            background: "rgba(0,212,170,0.1)", color: isLight ? "#007A62" : "#00D4AA",
                          } : { color: isLight ? "#4A5568" : "#8FA3BF" }}>
                          {u.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {uploadOptions.length === 0 && !uploadProgress && (
                    <p className="text-[10px]" style={{ color: isLight ? "#9AA5B4" : "#3A4A6B" }}>Upload an MP3 to use as a background layer.</p>
                  )}
                  {background.layer.type === "upload" && (
                    <div className="flex items-center gap-2 mt-2">
                      <Volume2 size={12} style={{ color: "#6B7A99" }} />
                      <Slider min={0} max={1} step={0.01} value={[background.layer.volume]}
                        onValueChange={([v]) => background.setBackgroundVolume(v)} className="flex-1" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Signal Analysis (collapsible) ──────────────────── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: isLight ? "#FFFFFF" : "#11142A", border: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={() => setShowAnalysis(v => !v)}
                className="w-full flex items-center justify-between p-4 text-xs font-semibold uppercase tracking-widest"
                style={{ color: isLight ? "#4A5568" : "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                Signal Analysis
                {showAnalysis ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showAnalysis && (
                <div className="px-4 pb-4">
                  <div className="flex gap-1 mb-3">
                    {(["oscilloscope", "spectrum", "both"] as const).map(m => (
                      <button key={m} onClick={() => setVizMode(m)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-medium capitalize transition-all"
                        style={vizMode === m ? {
                          background: "rgba(0,212,170,0.12)", color: "#00D4AA",
                        } : { color: "#6B7A99" }}>
                        {m}
                      </button>
                    ))}
                  </div>
                  <PrecisionVisualizer
                    analyserNode={analyserNode}
                    isPlaying={player.isPlaying}
                    targetHz={targetHz}
                    mode={vizMode}
                    color="#00D4AA"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ═══ RIGHT COLUMN — Playback & Library ═══ */}
          <div className="space-y-4">
            {/* ── Playback controls ──────────────────────────────── */}
            <div className="p-4 rounded-2xl lg:sticky lg:top-4" style={{ background: isLight ? "#FFFFFF" : "#11142A", border: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)" }}>
              {/* Play button + timer */}
              <div className="flex items-center gap-3 mb-4">
                <button onClick={handlePlay}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
                  style={player.isPlaying ? {
                    background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.4)", color: "#EF4444",
                  } : {
                    background: "rgba(0,212,170,0.15)", border: "2px solid rgba(0,212,170,0.4)", color: "#00D4AA",
                  }}>
                  {player.isPlaying ? <Square size={20} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                </button>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: isLight ? "#1A1D2E" : "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}>
                    {player.isPlaying ? `Playing — ${customFreq.toFixed(customFreq % 1 === 0 ? 0 : 2)} Hz` : "Ready"}
                  </div>
                  <div className="text-xs" style={{ color: "#6B7A99" }}>
                    {player.isPlaying && formatTime(player.playTime)}
                    {!player.isPlaying && `${WAVEFORM_LABELS[waveform]} · ${playMode}`}
                  </div>
                </div>
              </div>

              {/* Tone volume */}
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-1.5">
                  <Volume2 size={11} style={{ color: "#6B7A99" }} />
                  <span className="text-[10px]" style={{ color: "#6B7A99" }}>Tone — {Math.round(player.volume * 100)}%</span>
                </div>
                <Slider min={0} max={1} step={0.01} value={[player.volume]}
                  onValueChange={([v]) => player.setVolume(v)} />
              </div>

              {/* Sleep timer */}
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-1.5">
                  <Clock size={11} style={{ color: "#6B7A99" }} />
                  <span className="text-[10px]" style={{ color: "#6B7A99" }}>
                    Sleep timer {sleepMinutes ? `— ${sleepMinutes} min` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {SLEEP_OPTIONS.map(m => (
                    <button key={m} onClick={() => handleSleepTimer(m)}
                      className="px-2 py-1 rounded-lg text-[10px] transition-all"
                    style={sleepMinutes === m ? {
                      background: "rgba(139,92,246,0.2)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.3)",
                    } : {
                      background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)", color: "#6B7A99", border: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)",
                    }}>
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setShowBreathing(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                  style={{ background: "rgba(0,212,170,0.08)", color: "#00D4AA", border: "1px solid rgba(0,212,170,0.2)" }}>
                  <Wind size={10} /> Breathe
                </button>
                <button onClick={() => { setShowFavInput(v => !v); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                  style={{ background: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <Star size={10} /> Favorite
                </button>
                <button onClick={() => setShowSaveInput(v => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                  style={{ background: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)" }}>
                  <Save size={10} /> Save
                </button>
                <button onClick={() => setShowMixSave(v => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                  style={{ background: "rgba(139,92,246,0.08)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <Sliders size={10} /> Mix
                </button>
              </div>

              {/* Inline save inputs */}
              {showFavInput && (
                <div className="flex gap-2 mt-3">
                  <input type="text" placeholder={`${customFreq.toFixed(2)} Hz`} value={favNameInput}
                    onChange={e => setFavNameInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addFavorite()}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.10)" : "1px solid rgba(255,255,255,0.1)", color: isLight ? "#1A1D2E" : "#E8EDF5" }} />
                  <button onClick={addFavorite} className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>Add</button>
                </div>
              )}
              {showSaveInput && (
                <div className="flex gap-2 mt-3">
                  <input type="text" placeholder="Name this sound" value={saveNameInput}
                    onChange={e => setSaveNameInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && saveSound()}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.10)" : "1px solid rgba(255,255,255,0.1)", color: isLight ? "#1A1D2E" : "#E8EDF5" }} />
                  <button onClick={() => void saveSound()} className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6" }}>
                    {createSound.isPending ? <Loader2 size={12} className="animate-spin" /> : "Save"}
                  </button>
                </div>
              )}
              {showMixSave && (
                <div className="flex gap-2 mt-3">
                  <input type="text" placeholder="Mix name" value={mixNameInput}
                    onChange={e => setMixNameInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && saveCurrentMix()}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)", border: isLight ? "1px solid rgba(0,0,0,0.10)" : "1px solid rgba(255,255,255,0.1)", color: isLight ? "#1A1D2E" : "#E8EDF5" }} />
                  <button onClick={saveCurrentMix} className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}>Save</button>
                </div>
              )}
            </div>

            {/* ── Presets & Favorites ─────────────────────────────── */}
            <div className="p-4 rounded-2xl" style={{ background: isLight ? "#FFFFFF" : "#11142A", border: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)" }}>
              {/* Tabs */}
              <div className="flex gap-1 mb-3 overflow-x-auto">
                {([
                  { id: "solfeggio", label: "Presets" },
                  { id: "lifestyle", label: "Lifestyle" },
                  { id: "mixes", label: `Mixes (${customMixes.length})` },
                  { id: "favorites", label: `Favs (${favorites.length})` },
                ] as const).map(t => (
                  <button key={t.id} onClick={() => setPresetTab(t.id)}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all"
                    style={presetTab === t.id ? {
                      background: "rgba(0,212,170,0.12)", color: isLight ? "#007A62" : "#00D4AA",
                    } : { color: "#6B7A99" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Solfeggio + Binaural presets */}
              {presetTab === "solfeggio" && (
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {PRECISION_PRESETS.map((p, i) => (
                    <button key={i} onClick={() => void handlePrecisionPreset(p)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-2"
                      style={{
                        background: player.session?.name === p.session.name && player.isPlaying
                          ? `${p.color}18` : "transparent",
                        color: isLight ? "#4A5568" : "#8FA3BF", fontFamily: "DM Sans, sans-serif",
                      }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Lifestyle presets (from old Studio) */}
              {presetTab === "lifestyle" && (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {STUDIO_PRESETS.map(p => (
                    <button key={p.id} onClick={() => void handleLifestylePreset(p)}
                      className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                      style={{ background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.02)", border: isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{p.icon}</span>
                        <div>
                          <div className="text-xs font-medium" style={{ color: p.color }}>{p.name}</div>
                          <div className="text-[10px]" style={{ color: "#6B7A99" }}>{p.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Custom mixes */}
              {presetTab === "mixes" && (
                <div>
                  {customMixes.length === 0 ? (
                    <p className="text-xs py-4 text-center" style={{ color: isLight ? "#9AA5B4" : "#3A4A6B" }}>
                      No custom mixes yet. Use the "Mix" button above to save your current setup.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-72 overflow-y-auto">
                      {customMixes.map(mix => (
                        <div key={mix.id} className="flex items-center gap-2 group">
                          <button onClick={() => void applyCustomMix(mix)}
                            className="flex-1 text-left px-3 py-2 rounded-xl text-xs transition-all"
                            style={{ color: isLight ? "#4A5568" : "#8FA3BF" }}>
                            <span className="font-medium" style={{ color: isLight ? "#1A1D2E" : "#E8EDF5" }}>{mix.name}</span>
                            <span className="ml-2 text-[10px]" style={{ color: isLight ? "#6B7A99" : "#4A5568" }}>
                              {mix.freq} Hz · {mix.waveform}
                              {mix.natureSound ? ` + ${mix.natureSound}` : ""}
                              {mix.musicMode ? ` + ${mix.musicMode}` : ""}
                            </span>
                          </button>
                          <button onClick={() => deleteCustomMix(mix.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <Trash2 size={12} style={{ color: "#EF4444" }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Favorites */}
              {presetTab === "favorites" && (
                <div>
                  {favorites.length === 0 ? (
                    <p className="text-xs py-4 text-center" style={{ color: isLight ? "#9AA5B4" : "#3A4A6B" }}>
                      No favorites yet — use the star button to save a frequency.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-72 overflow-y-auto">
                      {favorites.map(fav => (
                        <div key={fav.id} className="flex items-center gap-2 group">
                          <button onClick={() => void (async () => {
                            setCustomFreq(fav.session.freqL);
                            setCustomFreqInput(fav.session.freqL.toFixed(2));
                            setWaveformState(fav.session.waveform);
                            setPlayMode(fav.session.mode);
                            if (fav.session.beatHz) setBeatHz(fav.session.beatHz);
                            sessionStartRef.current = Date.now();
                            await player.play(fav.session);
                            if (nature.activeNature) nature.startNature(nature.activeNature, nature.natureVolume);
                            if (music.activeMusic) music.startMusic(music.activeMusic, music.musicVolume);
                          })()}
                            className="flex-1 text-left px-3 py-1.5 rounded-lg text-xs transition-all"
                            style={{ color: isLight ? "#4A5568" : "#8FA3BF" }}>
                            ★ {fav.name}
                          </button>
                          <button onClick={() => removeFavorite(fav.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <StarOff size={12} style={{ color: "#EF4444" }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Headphone disclaimer ─────────────────────────────── */}
            <div className="p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="flex items-start gap-2">
                <Headphones size={14} style={{ color: "#F59E0B", marginTop: 2 }} />
                <p className="text-[10px] leading-relaxed" style={{ color: isLight ? "#4A5568" : "#8FA3BF" }}>
                  Use quality headphones for binaural beats. This is not a medical device. Consult a physician if you have epilepsy or seizure disorders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating Play Bar (always visible) ──────────────────── */}
      <div className="fixed bottom-20 lg:bottom-4 left-0 lg:left-64 right-0 z-30 px-4 pointer-events-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-md mx-auto pointer-events-auto">
          <button onClick={handlePlay}
            className={`w-full flex items-center justify-center gap-3 px-6 py-3 rounded-2xl transition-all active:scale-[0.97] shadow-lg ${player.isPlaying ? 'animate-[playPulse_2.5s_ease-in-out_infinite]' : ''}`}
            style={player.isPlaying ? {
              background: isLight ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              backdropFilter: 'blur(20px)', color: '#EF4444',
              boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.12)' : undefined,
            } : {
              background: isLight ? 'rgba(0,212,170,0.10)' : 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.3)',
              backdropFilter: 'blur(20px)', color: isLight ? '#007A62' : '#00D4AA',
              boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.12)' : undefined,
            }}>
            {player.isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            <span className="text-sm font-semibold" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              {player.isPlaying ? `Stop — ${customFreq.toFixed(customFreq % 1 === 0 ? 0 : 2)} Hz` : `Play ${customFreq.toFixed(customFreq % 1 === 0 ? 0 : 2)} Hz`}
            </span>
            {player.isPlaying && (
              <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatTime(player.playTime)}</span>
            )}
          </button>
        </div>
      </div>

      {/* Overlays */}
      {showBreathing && <BreathingGuide onClose={() => setShowBreathing(false)} accentColor="#00D4AA" />}
      {showJournal && (
        <SessionJournal
          frequencyHz={customFreq}
          frequencyName={`${customFreq.toFixed(0)} Hz ${WAVEFORM_LABELS[waveform]}`}
          durationMinutes={sessionDurationMin}
          onClose={() => setShowJournal(false)}
        />
      )}
      <FrequencyBrowser
        isOpen={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onSelect={handleBrowserSelect}
        isPremiumUser={isPremium}
        currentHz={customFreq}
      />
    </Layout>
  );
}
