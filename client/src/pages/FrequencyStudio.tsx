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
import { useLocation } from "wouter";
import {
  Play, Square, Star, StarOff, Plus, Minus, Clock, Activity, Upload,
  Save, Loader2, Music2, ChevronDown, ChevronUp, Headphones, Library,
  Volume2, Sliders, Wind, Flame, TreePine, CloudRain, Waves, Moon,
  Timer, Trash2, Pause, ArrowLeft,
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
import { startLogin } from "@/const";
import ShareCard from "@/components/ShareCard";

// ─── Constants ──────────────────────────────────────────────────────────────

const WAVEFORMS: Waveform[] = ["sine", "square", "triangle", "sawtooth", "bowl"];
const WAVEFORM_LABELS: Record<Waveform, string> = {
  sine: "Sine", square: "Square", triangle: "Triangle", sawtooth: "Saw", bowl: "Bowl",
};

const SLEEP_OPTIONS = [15, 30, 45, 60];

// ─── Brainwave band helper ──────────────────────────────────────────────────
type BrainwaveBand = "Delta" | "Theta" | "Alpha" | "Beta" | "Gamma";
function brainwaveBand(hz: number): BrainwaveBand {
  if (hz < 4) return "Delta";
  if (hz < 8) return "Theta";
  if (hz < 13) return "Alpha";
  if (hz < 30) return "Beta";
  return "Gamma";
}
const BAND_COLORS: Record<BrainwaveBand, string> = {
  Delta: "#6366F1", Theta: "#EC4899", Alpha: "#00D4AA", Beta: "#F59E0B", Gamma: "#EF4444",
};

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
  { label: "Schumann 7.83 Hz", color: "#84CC16", session: { freqL: 200, beatHz: 7.83, waveform: "sine", mode: "binaural", name: "Schumann 7.83 Hz" } },
  { label: "Focus 40 Hz", color: "#F97316", session: { freqL: 200, beatHz: 40, waveform: "sine", mode: "isochronic", name: "Focus 40 Hz" } },
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
  const [, navigate] = useLocation();
  // Detect when user arrived from the Library (via ?hz= deep link)
  const fromLibrary = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("hz") !== null;

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
  const [sleepRemainSec, setSleepRemainSec] = useState(0);
  const [sleepTotalSec, setSleepTotalSec] = useState(0);
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepTimerActive = sleepTotalSec > 0 && sleepRemainSec > 0;
  const [vizMode, setVizMode] = useState<"oscilloscope" | "spectrum" | "both">("both");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [serverFavsLoaded, setServerFavsLoaded] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const sessionStartRef = useRef<number | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);

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

  // Accordion open/close state (all start open so users see controls immediately)
  const [freqOpen, setFreqOpen] = useState(true);
  const [musicOpen, setMusicOpen] = useState(true);
  const [natureOpen, setNatureOpen] = useState(true);

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

  // Deep link from Library Healing Directory: /studio?hz=528
  const hzDeepLinkLoadedRef = useRef(false);
  useEffect(() => {
    if (hzDeepLinkLoadedRef.current || typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("hz");
    if (!raw) return;
    const hz = Number(raw);
    if (!Number.isFinite(hz) || hz < 0.1 || hz > 22000) return;
    hzDeepLinkLoadedRef.current = true;
    setCustomFreq(hz);
    setCustomFreqInput(hz.toFixed(2));
    toast.success(`Loaded ${hz % 1 === 0 ? hz : hz.toFixed(2)} Hz from directory`);
  }, []);

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
  const clearSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) { clearInterval(sleepTimerRef.current); sleepTimerRef.current = null; }
  }, []);

  const cancelSleepTimer = useCallback(() => {
    clearSleepTimer();
    setSleepTotalSec(0);
    setSleepRemainSec(0);
    setSleepMinutes(null);
  }, [clearSleepTimer]);

  const handleSleepTimer = useCallback((min: number) => {
    clearSleepTimer();
    const totalSec = min * 60;
    setSleepMinutes(min);
    setSleepTotalSec(totalSec);
    setSleepRemainSec(totalSec);
    player.setSleepTimer(min);
    toast(`Sleep timer set for ${min} minutes`);
    sleepTimerRef.current = setInterval(() => {
      setSleepRemainSec(prev => {
        const next = prev - 1;
        if (next <= 0) { clearSleepTimer(); setSleepTotalSec(0); setSleepMinutes(null); return 0; }
        return next;
      });
    }, 1000);
  }, [player, clearSleepTimer]);

  useEffect(() => clearSleepTimer, [clearSleepTimer]);

  // ── Server-sync favorites on login ──────────────────────────────────────
  const serverSoundsQuery = trpc.sounds.list.useQuery(undefined, { enabled: !!user && !serverFavsLoaded });
  useEffect(() => {
    if (!serverSoundsQuery.data || serverFavsLoaded) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: Favorite[] = (serverSoundsQuery.data as any[]).map((s: any) => ({
      id: String(s.id),
      name: s.name,
      session: { freqL: s.freqL, waveform: s.waveform as Waveform, mode: s.mode as PlayMode, beatHz: s.beatHz ?? undefined, name: s.name },
    }));
    if (mapped.length > 0) {
      setFavorites(mapped);
      saveFavorites(mapped);
      setServerFavsLoaded(true);
    }
  }, [serverSoundsQuery.data, serverFavsLoaded]);

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
        action: { label: "Sign in", onClick: () => { startLogin(); } },
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
        action: { label: "Sign in", onClick: () => { startLogin(); } },
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
  // RENDER — Mobile-matching single-column layout
  // ─────────────────────────────────────────────────────────────────────────
  const WAVEFORM_SYMBOLS: Record<Waveform, string> = { sine: "∿", square: "⊓", triangle: "△", sawtooth: "⊿", bowl: "⌣" };
  const PLAY_MODE_LABELS: Record<PlayMode, string> = { mono: "Pure Tone", binaural: "Binaural", isochronic: "Isochronic" };

  return (
    <Layout>
      <div className="min-h-screen relative" style={{ background: '#0A0B14' }}>
        {/* Bioluminescent background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute" style={{ top: '5%', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '60%', background: 'radial-gradient(ellipse, rgba(0,212,170,0.05) 0%, transparent 70%)' }} />
          <div className="absolute" style={{ bottom: '10%', right: '5%', width: '40%', height: '40%', background: 'radial-gradient(ellipse, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
        </div>
      <div className="max-w-xl mx-auto px-4 pb-32 pt-4 relative" style={{ zIndex: 1 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-4">
          {/* Back to Library button — shown when navigated from Library */}
          {fromLibrary && (
            <button
              onClick={() => navigate("/library")}
              className="flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{
                background: "rgba(0,212,170,0.08)",
                border: "1px solid rgba(0,212,170,0.2)",
                color: "#00D4AA",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              <ArrowLeft size={14} />
              Back to Library
            </button>
          )}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2"
            style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
            Precision Frequency Studio
          </div>
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "Cormorant Garamond, serif", color: "#E8EDF5", textShadow: '0 0 40px rgba(0,212,170,0.1)' }}>Frequency Studio</h1>
          <p className="text-xs" style={{ color: "#6B7A99" }}>DDS precision synthesis · Layered ambient mixing · ±0.05 Hz accuracy</p>
        </div>

        {/* ── Headphones disclaimer (top, like mobile) ────────────── */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: "rgba(0,212,170,0.06)", border: "1px solid rgba(0,212,170,0.2)" }}>
          <button onClick={() => setDisclaimerOpen(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left"
            style={{ color: "#00D4AA" }}>
            <Headphones size={15} />
            <span className="text-sm font-semibold flex-1">Headphones recommended for best results</span>
            <span className="text-xs">{disclaimerOpen ? "▲" : "▼"}</span>
          </button>
          {disclaimerOpen && (
            <div className="px-4 pb-4 space-y-2">
              <p className="text-xs leading-relaxed" style={{ color: "#8FA3BF" }}>
                Built-in speakers roll off below ~150 Hz — frequencies like 174 Hz may be inaudible without headphones.
                Binaural beats require stereo headphones — the effect only works when each ear receives a different tone.
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#6B7A99" }}>
                Sound healing claims are not validated by mainstream medicine. For wellness purposes only. Consult a physician if you have epilepsy or seizure disorders.
              </p>
            </div>
          )}
        </div>

        {/* ── Frequency Display ───────────────────────────────────── */}
        <div className="p-5 rounded-2xl mb-4" style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Giant Hz display */}
          <div className="text-center mb-4">
            <div className="flex items-end justify-center gap-2">
              <input
                type="text" value={customFreqInput}
                onChange={e => setCustomFreqInput(e.target.value)}
                onBlur={commitFreq}
                onKeyDown={e => e.key === "Enter" && commitFreq()}
                className="text-7xl font-bold text-center bg-transparent outline-none"
                style={{
                  color: "#00D4AA",
                  fontFamily: "Cormorant Garamond, serif",
                  caretColor: "#00D4AA",
                  textShadow: "0 0 40px rgba(0,212,170,0.6), 0 0 80px rgba(0,212,170,0.3), 0 0 120px rgba(0,212,170,0.15)",
                  minWidth: "8rem",
                  maxWidth: "14rem",
                  width: "auto",
                }}
              />
              <span className="text-3xl font-medium mb-3" style={{ color: "rgba(0,212,170,0.7)", fontFamily: "Cormorant Garamond, serif" }}>Hz</span>
            </div>
            <p className="text-xs mt-1" style={{ color: "#4A5568" }}>1 – 22,000 Hz · 0.01 resolution</p>
            <a href="/technology" className="text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ color: "#00D4AA" }}>Powered by TrueHz™ Precision Tuning →</a>
          </div>
          {/* 6 nudge buttons */}
          <div className="grid grid-cols-6 gap-2 mb-4">
            {([-10, -1, -0.1, 0.1, 1, 10] as const).map(d => (
              <button key={d} onClick={() => nudgeFreq(d)}
                className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.06)", color: d < 0 ? "#8FA3BF" : "#00D4AA", border: "1px solid rgba(255,255,255,0.08)" }}>
                {d > 0 ? `+${d}` : d}
              </button>
            ))}
          </div>
          {/* Fine-tune slider */}
          <Slider min={1} max={2000} step={0.01} value={[Math.min(2000, customFreq)]}
            onValueChange={([v]) => {
              setCustomFreq(v); setCustomFreqInput(v.toFixed(2));
              if (player.isPlaying) { const freqR = playMode === "binaural" ? v + beatHz : undefined; player.setFrequency(v, freqR); }
            }} />
          <div className="flex justify-between text-xs mt-1.5 font-medium" style={{ color: "#6B7A99" }}><span>1 Hz</span><span>2000 Hz</span></div>
        </div>

        {/* ── Accordion Layer Mix ─────────────────────────────────── */}
        {/* Frequency accordion */}
        <div className="mb-2 rounded-2xl overflow-hidden" style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Header row: always visible */}
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#8FA3BF" }}>FREQUENCY</span>
              <span className="text-sm font-bold" style={{ color: "#00D4AA" }}>
                {Math.round(player.volume * 100)}% ({Math.round(20 * Math.log10(Math.max(0.01, player.volume)))} dB)
              </span>
            </div>
            <Slider min={0} max={1} step={0.01} value={[player.volume]} onValueChange={([v]) => player.setVolume(v)} />
            <button onClick={() => setFreqOpen(v => !v)}
              className="w-full flex items-center justify-center gap-1 mt-2 mb-1 py-1 text-xs font-medium transition-all"
              style={{ color: freqOpen ? "#00D4AA" : "#4A5568" }}>
              {freqOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {freqOpen ? "Hide controls" : "Show controls"}
            </button>
          </div>
          {/* Collapsible body */}
          {freqOpen && (
            <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 mt-2" style={{ color: "#4A5568" }}>WAVEFORM</p>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {WAVEFORMS.map(w => (
                  <button key={w} onClick={() => handleWaveform(w)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all active:scale-95"
                    style={waveform === w ? {
                      background: "rgba(0,212,170,0.15)", border: "2px solid rgba(0,212,170,0.4)", color: "#00D4AA",
                    } : {
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#6B7A99",
                    }}>
                    <span className="text-lg">{WAVEFORM_SYMBOLS[w]}</span>
                    <span className="text-[10px] font-medium">{WAVEFORM_LABELS[w]}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#4A5568" }}>PLAY MODE</p>
              <div className="grid grid-cols-3 gap-2">
                {(["mono", "binaural", "isochronic"] as PlayMode[]).map(m => (
                  <button key={m} onClick={() => handlePlayMode(m)}
                    className="py-3 rounded-xl text-xs font-semibold transition-all active:scale-95"
                    style={playMode === m ? {
                      background: "rgba(0,212,170,0.15)", border: "2px solid rgba(0,212,170,0.4)", color: "#00D4AA",
                    } : {
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#6B7A99",
                    }}>
                    {PLAY_MODE_LABELS[m]}
                  </button>
                ))}
              </div>
              {playMode === "binaural" && (
                <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-semibold" style={{ color: "#8B5CF6", minWidth: 80 }}>Beat: {beatHz} Hz</span>
                    <Slider min={0.5} max={40} step={0.5} value={[beatHz]}
                      onValueChange={([v]) => { setBeatHz(v); if (player.isPlaying) player.setFrequency(customFreq, customFreq + v); }}
                      className="flex-1" />
                  </div>
                  <div className="flex justify-between mb-1">
                    {(["Delta", "Theta", "Alpha", "Beta", "Gamma"] as BrainwaveBand[]).map(band => (
                      <span key={band} className="text-[10px] font-semibold px-1.5 py-0.5 rounded transition-all"
                        style={brainwaveBand(beatHz) === band ? {
                          background: `${BAND_COLORS[band]}20`, color: BAND_COLORS[band], border: `1px solid ${BAND_COLORS[band]}40`,
                        } : { color: "#3A4A6B" }}>
                        {band}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px]" style={{ color: "#4A5568" }}>L: {customFreq} Hz · R: {(customFreq + beatHz).toFixed(2)} Hz</p>
                </div>
              )}
              {playMode === "isochronic" && (
                <div className="mt-3 p-3 rounded-xl space-y-2" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "#8B5CF6", minWidth: 90 }}>Rate: {isoRate} Hz</span>
                    <Slider min={1} max={40} step={0.5} value={[isoRate]}
                      onValueChange={([v]) => { setIsoRate(v); if (player.isPlaying) player.setIsochronic(v, isoDuty); }} className="flex-1" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "#8B5CF6", minWidth: 90 }}>Duty: {Math.round(isoDuty * 100)}%</span>
                    <Slider min={0.1} max={0.9} step={0.05} value={[isoDuty]}
                      onValueChange={([v]) => { setIsoDuty(v); if (player.isPlaying) player.setIsochronic(isoRate, v); }} className="flex-1" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Music accordion */}
        <div className="mb-2 rounded-2xl overflow-hidden" style={{
          background: "#11142A",
          border: music.activeMusic ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.06)",
          opacity: 1,
        }}>
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: music.activeMusic ? "#8B5CF6" : "#8FA3BF" }}>MUSIC</span>
              {music.activeMusic ? (
                <span className="text-sm font-bold" style={{ color: "#8B5CF6" }}>{Math.round(music.musicVolume * 100)}%</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color: "#F59E0B", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.5)" }}>OFF — select below</span>
              )}
            </div>
            <div style={{ opacity: music.activeMusic ? 1 : 0.35 }}>
              <Slider min={0} max={1} step={0.01} value={[music.musicVolume]}
                onValueChange={([v]) => music.activeMusic && music.setMusicVolume(v)}
                disabled={!music.activeMusic} />
            </div>
            <button onClick={() => setMusicOpen(v => !v)}
              className="w-full flex items-center justify-center gap-1 mt-2 mb-1 py-1 text-xs font-medium transition-all"
              style={{ color: musicOpen ? "#8B5CF6" : "#4A5568" }}>
              {musicOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {musicOpen ? "Hide" : "Choose music"}
            </button>
          </div>
          {musicOpen && (
            <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[{id:null,label:"Off",icon:"—",color:"#F59E0B"},{id:"ambient",label:"Ambient",icon:"♪",color:"#00D4AA"},{id:"drone",label:"Drone",icon:"〰",color:"#8B5CF6"},{id:"crystal",label:"Crystal",icon:"◇",color:"#EC4899"}].map(mm => (
                  <button key={mm.label} onClick={() => music.selectMusic(mm.id, player.isPlaying)}
                    className="flex flex-col items-center gap-2 py-3 rounded-xl transition-all active:scale-95"
                    style={music.activeMusic === mm.id ? {
                      background: `${mm.color}20`, border: `2px solid ${mm.color}60`, color: mm.color,
                    } : mm.id === null ? {
                      background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.4)", color: "#F59E0B",
                    } : {
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#6B7A99",
                    }}>
                    <span className="text-lg">{mm.icon}</span>
                    <span className="text-[10px] font-semibold">{mm.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Nature accordion */}
        <div className="mb-4 rounded-2xl overflow-hidden" style={{
          background: "#11142A",
          border: nature.activeNature ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.06)",
        }}>
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: nature.activeNature ? "#6366F1" : "#8FA3BF" }}>NATURE</span>
              {nature.activeNature ? (
                <span className="text-sm font-bold" style={{ color: "#6366F1" }}>{Math.round(nature.natureVolume * 100)}%</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color: "#F59E0B", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.5)" }}>OFF — select below</span>
              )}
            </div>
            <div style={{ opacity: nature.activeNature ? 1 : 0.35 }}>
              <Slider min={0} max={1} step={0.01} value={[nature.natureVolume]}
                onValueChange={([v]) => nature.activeNature && nature.setNatureVolume(v)}
                disabled={!nature.activeNature} />
            </div>
            <button onClick={() => setNatureOpen(v => !v)}
              className="w-full flex items-center justify-center gap-1 mt-2 mb-1 py-1 text-xs font-medium transition-all"
              style={{ color: natureOpen ? "#6366F1" : "#4A5568" }}>
              {natureOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {natureOpen ? "Hide" : "Choose nature sound"}
            </button>
          </div>
          {natureOpen && (
            <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {[{id:null,label:"Off",emoji:"—",color:"#F59E0B"},{id:"rain",label:"Rain",emoji:"🌧️",color:"#3B82F6"},{id:"ocean",label:"Ocean",emoji:"🌊",color:"#00D4AA"},{id:"forest",label:"Forest",emoji:"🌲",color:"#22C55E"},{id:"wind",label:"Wind",emoji:"🌬️",color:"#94A3B8"},{id:"fire",label:"Fire",emoji:"🔥",color:"#F97316"}].map(ns => (
                  <button key={ns.label} onClick={() => nature.selectNature(ns.id, player.isPlaying)}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all active:scale-95"
                    style={nature.activeNature === ns.id ? {
                      background: `${ns.color}20`, border: `2px solid ${ns.color}60`, color: ns.color,
                    } : ns.id === null ? {
                      background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.4)", color: "#F59E0B",
                    } : {
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#6B7A99",
                    }}>
                    <span className="text-base">{ns.emoji}</span>
                    <span className="text-[10px] font-medium">{ns.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Play Button (centered, prominent) ───────────────────── */}
        <div className="flex flex-col items-center mb-4">
          <button onClick={handlePlay}
            className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-2xl mb-3"
            style={player.isPlaying ? {
              background: "rgba(239,68,68,0.2)", border: "3px solid rgba(239,68,68,0.5)", color: "#EF4444",
              boxShadow: "0 0 40px rgba(239,68,68,0.3)",
            } : {
              background: "#00D4AA", border: "3px solid rgba(0,212,170,0.6)", color: "#0A0B14",
              boxShadow: "0 0 40px rgba(0,212,170,0.4)",
            }}>
            {player.isPlaying ? <Square size={28} fill="currentColor" /> : <Play size={30} fill="currentColor" />}
          </button>
          {player.isPlaying && (
            <p className="text-sm font-mono" style={{ color: "#6B7A99" }}>{formatTime(player.playTime)}</p>
          )}
        </div>

        {/* ── Layer Mix label ──────────────────────────────────────── */}
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#6B7A99" }}>LAYER MIX</p>

        {/* ── Now Playing Status Bar ───────────────────────────────── */}
        <div className="mb-4 px-4 py-3 rounded-2xl" style={{
          background: player.isPlaying ? "rgba(0,212,170,0.07)" : "rgba(255,255,255,0.03)",
          border: player.isPlaying ? "1px solid rgba(0,212,170,0.25)" : "1px solid rgba(255,255,255,0.06)",
        }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold" style={{ color: player.isPlaying ? "#00D4AA" : "#4A5568" }}>
              {player.isPlaying ? "▶" : "○"}
            </span>
            <span className="text-sm font-semibold" style={{ color: player.isPlaying ? "#E8EDF5" : "#6B7A99" }}>
              {customFreq % 1 === 0 ? customFreq : customFreq.toFixed(2)} Hz
            </span>
            <span style={{ color: "#3A4A6B" }}>·</span>
            <span className="text-sm" style={{ color: player.isPlaying ? "#C5CAD6" : "#4A5568" }}>
              {WAVEFORM_LABELS[waveform]}
            </span>
            <span style={{ color: "#3A4A6B" }}>·</span>
            <span className="text-sm" style={{ color: player.isPlaying ? "#C5CAD6" : "#4A5568" }}>
              {playMode === "mono" ? "Pure Tone" : playMode === "binaural" ? `Binaural · ${beatHz} Hz beat · ${brainwaveBand(beatHz)}` : `Isochronic · ${isoRate} Hz`}
            </span>
            {player.isPlaying && (
              <>
                <span style={{ color: "#3A4A6B" }}>·</span>
                <span className="text-sm font-mono" style={{ color: "#00D4AA" }}>{formatTime(player.playTime)}</span>
              </>
            )}
            {player.isPlaying && customFreq < 20 && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{
                  background: "rgba(251,191,36,0.12)",
                  border: "1px solid rgba(251,191,36,0.35)",
                  color: "#FBBF24",
                  fontFamily: "DM Sans, sans-serif",
                  letterSpacing: "0.01em",
                }}
              >
                <span style={{ fontSize: "9px" }}>◉</span>
                Silent Healing Tone — Felt, Not Heard
              </span>
            )}
            {player.playTime >= 60 && (
              <button
                onClick={() => setShowShareCard(true)}
                className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200"
                style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
              >
                ↗ Share
              </button>
            )}
          </div>
        </div>



        {/* ── Visualizer (always visible, like mobile) ─────────────── */}
        <div className="mb-4 rounded-2xl overflow-hidden" style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
          <PrecisionVisualizer
            analyserNode={analyserNode}
            isPlaying={player.isPlaying}
            targetHz={targetHz}
            mode="oscilloscope"
            color="#00D4AA"
          />
          <div className="flex justify-center gap-2 pb-3">
            {(["oscilloscope", "spectrum", "both"] as const).map(m => (
              <button key={m} onClick={() => setVizMode(m)}
                className="px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all"
                style={vizMode === m ? {
                  background: "rgba(0,212,170,0.15)", color: "#00D4AA", border: "1px solid rgba(0,212,170,0.3)",
                } : { color: "#4A5568" }}>
                {m === "oscilloscope" ? "Waveform" : m === "spectrum" ? "Spectrum" : "Both"}
              </button>
            ))}
          </div>
        </div>





        {/* ── Featured Presets (Presets First) ────────────────────── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#6B7A99" }}>FEATURED PRESETS</p>
            <div className="flex gap-2">
              <button onClick={() => setShowBreathing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{ background: "rgba(0,212,170,0.12)", color: "#00D4AA", border: "1px solid rgba(0,212,170,0.3)" }}>
                <Wind size={11} /> Breathe
              </button>
              <button onClick={() => setShowMixSave(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.3)" }}>
                + Save Mix
              </button>
            </div>
          </div>
          {showMixSave && (
            <div className="flex gap-2 mb-3">
              <input type="text" placeholder="Mix name" value={mixNameInput}
                onChange={e => setMixNameInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveCurrentMix()}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5" }} />
              <button onClick={saveCurrentMix} className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(139,92,246,0.2)", color: "#8B5CF6" }}>Save</button>
            </div>
          )}
          {/* Lifestyle preset cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {STUDIO_PRESETS.map(p => (
              <button key={p.id} onClick={() => void handleLifestylePreset(p)}
                className="text-left p-4 rounded-2xl transition-all active:scale-95"
                style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-2xl block mb-2">{p.icon}</span>
                <div className="text-sm font-bold mb-0.5" style={{ color: p.color }}>{p.name}</div>
                <div className="text-[10px] leading-tight" style={{ color: "#6B7A99" }}>{p.description}</div>
              </button>
            ))}
          </div>
          {/* Custom mixes */}
          {customMixes.length > 0 && (
            <div className="space-y-1">
              {customMixes.map(mix => (
                <div key={mix.id} className="flex items-center gap-2 group">
                  <button onClick={() => void applyCustomMix(mix)}
                    className="flex-1 text-left px-4 py-3 rounded-xl transition-all"
                    style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-sm font-semibold" style={{ color: "#E8EDF5" }}>{mix.name}</span>
                    <span className="block text-xs mt-0.5" style={{ color: "#4A5568" }}>
                      {mix.freq} Hz · {mix.waveform}{mix.natureSound ? ` + ${mix.natureSound}` : ""}{mix.musicMode ? ` + ${mix.musicMode}` : ""}
                    </span>
                  </button>
                  <button onClick={() => deleteCustomMix(mix.id)} className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} style={{ color: "#EF4444" }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── "Or customize below" divider ──────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="text-xs font-medium" style={{ color: "#3A4A6B" }}>or customize below</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>

        {/* ── Sleep Timer ─────────────────────────────────────────── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#6B7A99" }}>SLEEP TIMER</p>
            {sleepTimerActive && (
              <button onClick={cancelSleepTimer} className="text-xs px-3 py-1 rounded-full"
                style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                ✕ Cancel
              </button>
            )}
          </div>
          {sleepTimerActive ? (
            <div className="p-4 rounded-2xl" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm" style={{ color: "#8B5CF6" }}>Fading out in</span>
                <span className="text-2xl font-bold font-mono" style={{ color: "#E8EDF5" }}>{formatTime(sleepRemainSec)}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${((sleepTotalSec - sleepRemainSec) / sleepTotalSec) * 100}%`,
                  background: "linear-gradient(90deg, #8B5CF6, #6366F1)",
                }} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {SLEEP_OPTIONS.map(m => (
                <button key={m} onClick={() => handleSleepTimer(m)}
                  className="flex flex-col items-center py-4 rounded-2xl transition-all active:scale-95"
                  style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-2xl font-bold" style={{ color: "#E8EDF5" }}>{m}</span>
                  <span className="text-xs" style={{ color: "#6B7A99" }}>min</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Favorites ───────────────────────────────────────────── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#6B7A99" }}>FAVORITES</p>
            <button onClick={() => setShowFavInput(v => !v)}
              className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
              style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}>
              + Save current
            </button>
          </div>
          {showFavInput && (
            <div className="flex gap-2 mb-3">
              <input type="text" placeholder={`${customFreq.toFixed(2)} Hz`} value={favNameInput}
                onChange={e => setFavNameInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addFavorite()}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5" }} />
              <button onClick={addFavorite} className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(245,158,11,0.2)", color: "#F59E0B" }}>Save</button>
            </div>
          )}
          {favorites.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: "#3A4A6B" }}>No favorites yet — dial in a frequency and save it.</p>
          ) : (
            <div className="space-y-1">
              {favorites.map(fav => (
                <div key={fav.id} className="flex items-center gap-2 group">
                  <button onClick={() => void (async () => {
                    setCustomFreq(fav.session.freqL); setCustomFreqInput(fav.session.freqL.toFixed(2));
                    setWaveformState(fav.session.waveform); setPlayMode(fav.session.mode);
                    if (fav.session.beatHz) setBeatHz(fav.session.beatHz);
                    sessionStartRef.current = Date.now();
                    await player.play(fav.session);
                    if (nature.activeNature) nature.startNature(nature.activeNature, nature.natureVolume);
                    if (music.activeMusic) music.startMusic(music.activeMusic, music.musicVolume);
                  })()}
                    className="flex-1 text-left px-4 py-3 rounded-xl transition-all"
                    style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-sm font-semibold" style={{ color: "#E8EDF5" }}>★ {fav.name}</span>
                    <span className="block text-xs mt-0.5" style={{ color: "#4A5568" }}>
                      {fav.session.freqL} Hz · {fav.session.waveform}{fav.session.mode !== "mono" ? ` · ${fav.session.mode}` : ""}
                    </span>
                  </button>
                  <button onClick={() => removeFavorite(fav.id)} className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <StarOff size={14} style={{ color: "#EF4444" }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Save to account ─────────────────────────────────────── */}
        {user && (
          <div className="mb-4">
            {!showSaveInput ? (
              <button onClick={() => setShowSaveInput(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
                style={{ background: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)" }}>
                <Save size={14} /> Save to Account
              </button>
            ) : (
              <div className="flex gap-2">
                <input type="text" placeholder="Name this sound" value={saveNameInput}
                  onChange={e => setSaveNameInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveSound()}
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5" }} />
                <button onClick={() => void saveSound()} className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(59,130,246,0.2)", color: "#3B82F6" }}>
                  {createSound.isPending ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── MP3 Upload (premium) ─────────────────────────────────── */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#6B7A99" }}>CUSTOM BACKGROUND</p>
          <input type="file" ref={fileInputRef} accept=".mp3,audio/mpeg" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          <button onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)", color: "#8FA3BF" }}>
            {uploadProgress !== null ? <><Loader2 size={14} className="animate-spin" /> Uploading {Math.round(uploadProgress * 100)}%</> : <><Upload size={14} /> Upload MP3 Background</>}
          </button>
          {uploadOptions.length > 0 && (
            <div className="mt-2 space-y-1">
              {uploadOptions.map(u => (
                <button key={u.key} onClick={() => background.selectBackground("upload", u.key, player.isPlaying)}
                  className="w-full text-left px-4 py-2 rounded-xl text-sm transition-all"
                  style={background.layer.key === u.key ? {
                    background: "rgba(0,212,170,0.1)", color: "#00D4AA",
                  } : { background: "#11142A", color: "#8FA3BF", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {u.label}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Floating Play Bar (always visible) ──────────────────── */}
      <div className="fixed bottom-20 lg:bottom-4 left-0 lg:left-64 right-0 z-30 px-4 pointer-events-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-md mx-auto pointer-events-auto">
          <button onClick={handlePlay}
            className={`w-full flex items-center justify-center gap-3 px-6 py-3 rounded-2xl transition-all active:scale-[0.97] shadow-lg ${player.isPlaying ? 'animate-[playPulse_2.5s_ease-in-out_infinite]' : ''}`}
            style={player.isPlaying ? {
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              backdropFilter: 'blur(20px)', color: '#EF4444',
            } : {
              background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.3)',
              backdropFilter: 'blur(20px)', color: '#00D4AA',
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

      </div>
      {/* Overlays */}
      {showBreathing && <BreathingGuide onClose={() => setShowBreathing(false)} accentColor="#00D4AA" />}
      {showShareCard && (
        <ShareCard
          hz={customFreq}
          name={`${customFreq.toFixed(0)} Hz`}
          durationSeconds={player.playTime}
          color="#00D4AA"
          onClose={() => setShowShareCard(false)}
        />
      )}
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
