/**
 * PrecisionPlayer — ResoNate SRS v1.0 compliant frequency generator
 *
 * Implements all Must requirements:
 *   FR-001  Custom frequency 1–22000 Hz, 0.01 Hz resolution
 *   FR-002  Phase-continuous DDS synthesis (AudioWorklet)
 *   FR-003  Sine / Square / Triangle / Sawtooth waveforms
 *   FR-004  Smooth amplitude ramping
 *   FR-010  Full preset library (Solfeggio + 432Hz + binaural brainwave states)
 *   FR-011  Favorites with custom names
 *   FR-020  Binaural beats — user-configurable base + beat frequency
 *   FR-021  Isochronic tones — adjustable pulse rate + duty cycle
 *   FR-030  Real-time oscilloscope
 *   FR-031  Real-time FFT spectrum analyzer with Hz readout
 *   FR-040  Play / Pause / Stop
 *   FR-041  Sleep timer with fade-out
 *   NFR-FREQ-001  ±0.05 Hz accuracy (hardware-limited)
 *   NFR-FREQ-003  Hardware disclaimer + headphone recommendation
 *   NFR-FREQ-004  Double-precision phase accumulation
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { Play, Square, AlertCircle, Star, StarOff, Plus, Minus, Clock, Activity, Upload, Save, Loader2, Music2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { usePrecisionPlayer, type Waveform, type PlayMode, type PrecisionSession } from "@/hooks/usePrecisionPlayer";
import { useBackgroundLayer } from "@/hooks/useBackgroundLayer";
import PrecisionVisualizer from "@/components/PrecisionVisualizer";
import { FREQUENCIES } from "@/hooks/useFrequencyPlayer";
import { BACKGROUND_LOOPS, formatSoundSummary, type BackgroundType } from "@/data/backgroundLoops";
import { uploadSoundMp3 } from "@/lib/soundUpload";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

// ─── Preset catalog ──────────────────────────────────────────────────────────

const PRESETS: Array<{ label: string; session: PrecisionSession; color: string }> = [
  // Solfeggio
  { label: "174 Hz — Foundation", color: "#EF4444", session: { freqL: 174, waveform: "sine", mode: "mono", name: "174 Hz Foundation" } },
  { label: "396 Hz — Liberation", color: "#EAB308", session: { freqL: 396, waveform: "sine", mode: "mono", name: "396 Hz Liberation" } },
  { label: "417 Hz — Transmutation", color: "#84CC16", session: { freqL: 417, waveform: "sine", mode: "mono", name: "417 Hz Transmutation" } },
  { label: "432 Hz — Natural Harmony", color: "#00D4AA", session: { freqL: 432, waveform: "sine", mode: "mono", name: "432 Hz Natural Harmony" } },
  { label: "528 Hz — Miracle Tone", color: "#06B6D4", session: { freqL: 528, waveform: "sine", mode: "mono", name: "528 Hz Miracle Tone" } },
  { label: "639 Hz — Connection", color: "#3B82F6", session: { freqL: 639, waveform: "sine", mode: "mono", name: "639 Hz Connection" } },
  { label: "741 Hz — Awakening", color: "#8B5CF6", session: { freqL: 741, waveform: "sine", mode: "mono", name: "741 Hz Awakening" } },
  { label: "852 Hz — Spiritual Order", color: "#A855F7", session: { freqL: 852, waveform: "sine", mode: "mono", name: "852 Hz Spiritual Order" } },
  { label: "963 Hz — Divine Consciousness", color: "#EC4899", session: { freqL: 963, waveform: "sine", mode: "mono", name: "963 Hz Divine Consciousness" } },
  // Binaural brainwave states
  { label: "Alpha 10 Hz beat (200 Hz base)", color: "#00D4AA", session: { freqL: 200, beatHz: 10, waveform: "sine", mode: "binaural", name: "Alpha 10 Hz" } },
  { label: "Theta 6 Hz beat (200 Hz base)", color: "#8B5CF6", session: { freqL: 200, beatHz: 6, waveform: "sine", mode: "binaural", name: "Theta 6 Hz" } },
  { label: "Delta 2 Hz beat (200 Hz base)", color: "#6366F1", session: { freqL: 200, beatHz: 2, waveform: "sine", mode: "binaural", name: "Delta 2 Hz" } },
  { label: "Gamma 40 Hz beat (200 Hz base)", color: "#F59E0B", session: { freqL: 200, beatHz: 40, waveform: "sine", mode: "binaural", name: "Gamma 40 Hz" } },
];

const WAVEFORMS: Waveform[] = ["sine", "square", "triangle", "sawtooth"];
const WAVEFORM_LABELS: Record<Waveform, string> = {
  sine: "Sine",
  square: "Square",
  triangle: "Triangle",
  sawtooth: "Sawtooth",
};

const SLEEP_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

interface Favorite {
  id: string;
  name: string;
  session: PrecisionSession;
}

const FAVORITES_KEY = "rih-precision-favorites";

function loadFavorites(): Favorite[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveFavorites(favs: Favorite[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrecisionPlayer() {
  const player = usePrecisionPlayer();
  const background = useBackgroundLayer(() => player.getAudioContext());
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const createSound = trpc.sounds.create.useMutation({
    onSuccess: () => {
      void utils.sounds.list.invalidate();
      void utils.sounds.listUploads.invalidate();
    },
  });
  const uploadsQuery = trpc.sounds.listUploads.useQuery(undefined, {
    enabled: !!user,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Custom frequency state
  const [customFreq, setCustomFreq] = useState<number>(528);
  const [customFreqInput, setCustomFreqInput] = useState("528.00");
  const [beatHz, setBeatHz] = useState<number>(10);
  const [isoRate, setIsoRate] = useState<number>(10);
  const [isoDuty, setIsoDuty] = useState<number>(0.5);
  const [waveform, setWaveformState] = useState<Waveform>("sine");
  const [playMode, setPlayMode] = useState<PlayMode>("mono");
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);
  const [vizMode, setVizMode] = useState<"oscilloscope" | "spectrum" | "both">("both");

  // Favorites
  const [favorites, setFavorites] = useState<Favorite[]>(loadFavorites);
  const [favNameInput, setFavNameInput] = useState("");
  const [showFavInput, setShowFavInput] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [pendingUploads, setPendingUploads] = useState<Array<{ key: string; label: string }>>([]);

  const applySavedSound = useCallback((sound: {
    freqL: number;
    beatHz: number | null;
    isoRate: number | null;
    isoDuty: number | null;
    waveform: string;
    mode: string;
    toneVolume: number;
    backgroundType: string;
    backgroundKey: string | null;
    backgroundVolume: number;
  }) => {
    setCustomFreq(sound.freqL);
    setCustomFreqInput(sound.freqL.toFixed(2));
    setWaveformState(sound.waveform as Waveform);
    setPlayMode(sound.mode as PlayMode);
    if (sound.beatHz != null) setBeatHz(sound.beatHz);
    if (sound.isoRate != null) setIsoRate(sound.isoRate);
    if (sound.isoDuty != null) setIsoDuty(sound.isoDuty);
    player.setVolume(sound.toneVolume);
    background.selectBackground(
      sound.backgroundType as BackgroundType,
      sound.backgroundKey,
    );
    background.setBackgroundVolume(sound.backgroundVolume);
  }, [player, background]);

  useEffect(() => {
    const sound = savedSoundQuery.data;
    if (!sound || deepLinkLoadedRef.current === sound.id) return;
    deepLinkLoadedRef.current = sound.id;
    applySavedSound(sound);
    toast.success(`Loaded "${sound.name}"`);
  }, [savedSoundQuery.data, applySavedSound]);

  // Analyser node — sync directly from player state
  // analyserRef is set synchronously inside play() so we can read it right after isPlaying flips
  const analyserNode = player.isPlaying ? player.analyserNode : null;

  // ── Build session from current UI state ──────────────────────────────────
  const buildSession = useCallback((): PrecisionSession => {
    const base: PrecisionSession = {
      freqL: customFreq,
      waveform,
      mode: playMode,
      name: `${customFreq.toFixed(2)} Hz`,
    };
    if (playMode === "binaural") {
      base.beatHz = beatHz;
      base.freqR = customFreq + beatHz;
    }
    if (playMode === "isochronic") {
      base.isoRate = isoRate;
      base.isoDuty = isoDuty;
    }
    return base;
  }, [customFreq, waveform, playMode, beatHz, isoRate, isoDuty]);

  // ── Play / Stop ───────────────────────────────────────────────────────────
  const handlePlay = useCallback(async () => {
    if (player.isPlaying) {
      background.stopBackground();
      player.stopAudio();
    } else {
      await player.play(buildSession());
      await background.startBackground(
        background.layer.type,
        background.layer.key,
        background.layer.volume,
      );
    }
  }, [player, buildSession, background]);

  const handlePreset = useCallback(async (preset: typeof PRESETS[0]) => {
    const s = preset.session;
    setCustomFreq(s.freqL);
    setCustomFreqInput(s.freqL.toFixed(2));
    setWaveformState(s.waveform);
    setPlayMode(s.mode);
    if (s.beatHz !== undefined) setBeatHz(s.beatHz);
    if (s.isoRate !== undefined) setIsoRate(s.isoRate);
    await player.play(s);
    await background.startBackground(
      background.layer.type,
      background.layer.key,
      background.layer.volume,
    );
  }, [player, background]);

  // ── Frequency input ───────────────────────────────────────────────────────
  const commitFreq = useCallback(() => {
    const parsed = parseFloat(customFreqInput);
    if (isNaN(parsed) || parsed < 1 || parsed > 22000) {
      toast.error("Frequency must be between 1 and 22,000 Hz");
      setCustomFreqInput(customFreq.toFixed(2));
      return;
    }
    const rounded = Math.round(parsed * 100) / 100; // 0.01 Hz resolution
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

  // ── Waveform change (phase-continuous) ───────────────────────────────────
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
    const fav: Favorite = {
      id: `${Date.now()}`,
      name,
      session: buildSession(),
    };
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

  const buildSavePayload = useCallback(() => ({
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
  }), [
    saveNameInput,
    customFreq,
    playMode,
    beatHz,
    isoRate,
    isoDuty,
    waveform,
    player.volume,
    background.layer,
  ]);

  const saveSound = useCallback(async () => {
    if (!user) {
      toast.error("Sign in to save sounds to your account", {
        action: { label: "Sign in", onClick: () => { window.location.href = getLoginUrl(); } },
      });
      return;
    }
    try {
      const result = await createSound.mutateAsync(buildSavePayload());
      setSaveNameInput("");
      setShowSaveInput(false);
      toast.success("Sound saved", {
        description: "Find it in your Dashboard under My Sounds.",
        action: { label: "Dashboard", onClick: () => { window.location.href = "/dashboard"; } },
      });
      return result;
    } catch {
      toast.error("Could not save sound");
    }
  }, [user, createSound, buildSavePayload]);

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
      background.selectBackground("upload", result.key);
      toast.success(`Uploaded "${label}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [user, background]);

  const uploadOptions = [
    ...pendingUploads,
    ...(uploadsQuery.data ?? []).map(key => ({
      key,
      label: key.split("/").pop()?.replace(/\.mp3$/i, "") ?? key,
    })).filter(u => !pendingUploads.some(p => p.key === u.key)),
  ];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const targetHz = playMode === "binaural" ? beatHz : customFreq;

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3"
            style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.2)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}>
            <Activity size={12} />
            Precision Frequency Generator — SRS v1.0 Compliant
          </div>
          <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: "Cormorant Garamond, serif", color: "#E8EDF5" }}>
            Precision Player
          </h1>
          <p className="text-sm" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
            Double-precision DDS synthesis · ±0.05 Hz accuracy · Phase-continuous
          </p>
          <a
            href="/technology"
            className="inline-block mt-2 text-xs font-semibold transition-colors"
            style={{ color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
          >
            Powered by TrueHz™ Precision Tuning — learn how we're different →
          </a>
        </div>

        {/* Hardware disclaimer (NFR-FREQ-003) */}
        <div className="flex items-start gap-3 p-4 rounded-xl mb-6"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: "#F59E0B", fontFamily: "DM Sans, sans-serif" }}>
              Headphones recommended for best results
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
              Built-in phone and laptop speakers roll off significantly below ~150 Hz — frequencies such as 174 Hz may be inaudible or distorted without headphones.
              For binaural beats, <strong style={{ color: "#E8EDF5" }}>stereo headphones are required</strong> — the effect only works when each ear receives a different tone.
              Frequency accuracy is limited by your device's audio hardware; use quality headphones with a flat frequency response (20 Hz – 20 kHz) for the most precise experience.
              <br /><span className="italic mt-1 block" style={{ color: "#6B7A99" }}>
                Note: Sound healing claims are not validated by mainstream medicine. This app is for wellness and entertainment purposes only.
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column: Controls ─────────────────────────────────────── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Frequency input (FR-001) */}
            <div className="p-5 rounded-2xl" style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                Frequency (1 – 22,000 Hz · 0.01 Hz resolution)
              </div>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => nudgeFreq(-1)} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#E8EDF5" }}>
                  <Minus size={16} />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="22000"
                    value={customFreqInput}
                    onChange={e => setCustomFreqInput(e.target.value)}
                    onBlur={commitFreq}
                    onKeyDown={e => e.key === "Enter" && commitFreq()}
                    className="w-full text-center text-3xl font-bold rounded-xl px-4 py-3 outline-none"
                    style={{
                      background: "rgba(0,212,170,0.06)",
                      border: "1px solid rgba(0,212,170,0.2)",
                      color: "#00D4AA",
                      fontFamily: "DM Sans, sans-serif",
                    }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#6B7A99" }}>Hz</span>
                </div>
                <button onClick={() => nudgeFreq(1)} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#E8EDF5" }}>
                  <Plus size={16} />
                </button>
              </div>

              {/* Fine-tune slider */}
              <Slider
                min={1}
                max={2000}
                step={0.01}
                value={[Math.min(customFreq, 2000)]}
                onValueChange={([v]) => {
                  setCustomFreq(v);
                  setCustomFreqInput(v.toFixed(2));
                  if (player.isPlaying) {
                    const freqR = playMode === "binaural" ? v + beatHz : undefined;
                    player.setFrequency(v, freqR);
                  }
                }}
                className="mb-1"
              />
              <div className="flex justify-between text-xs" style={{ color: "#3A4A6B", fontFamily: "DM Sans, sans-serif" }}>
                <span>1 Hz</span>
                <span>Slider range: 1–2000 Hz</span>
                <span>2000 Hz</span>
              </div>
            </div>

            {/* Waveform selector (FR-003) */}
            <div className="p-5 rounded-2xl" style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                Waveform
              </div>
              <div className="grid grid-cols-4 gap-2">
                {WAVEFORMS.map(w => (
                  <button
                    key={w}
                    onClick={() => handleWaveform(w)}
                    className="py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                    style={waveform === w ? {
                      background: "linear-gradient(135deg, #00D4AA, #00B894)",
                      color: "#0A0B14",
                    } : {
                      background: "rgba(255,255,255,0.04)",
                      color: "#6B7A99",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {WAVEFORM_LABELS[w]}
                  </button>
                ))}
              </div>
              {waveform !== "sine" && (
                <p className="text-xs mt-2" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                  ✦ Sine wave is recommended for healing and meditation applications.
                </p>
              )}
            </div>

            {/* Play mode selector */}
            <div className="p-5 rounded-2xl" style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                Play Mode
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(["mono", "binaural", "isochronic"] as PlayMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setPlayMode(m)}
                    className="py-2.5 rounded-xl text-sm font-medium capitalize transition-all duration-200"
                    style={playMode === m ? {
                      background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                      color: "#fff",
                    } : {
                      background: "rgba(255,255,255,0.04)",
                      color: "#6B7A99",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {playMode === "binaural" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
                      Beat frequency: <strong style={{ color: "#E8EDF5" }}>{beatHz.toFixed(1)} Hz</strong>
                    </span>
                    <span className="text-xs" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                      L: {customFreq.toFixed(2)} Hz · R: {(customFreq + beatHz).toFixed(2)} Hz
                    </span>
                  </div>
                  <Slider
                    min={0.5}
                    max={50}
                    step={0.5}
                    value={[beatHz]}
                    onValueChange={([v]) => {
                      setBeatHz(v);
                      if (player.isPlaying) player.setFrequency(customFreq, customFreq + v);
                    }}
                  />
                  <div className="flex justify-between text-xs mt-1" style={{ color: "#3A4A6B" }}>
                    <span>0.5 Hz (Delta)</span>
                    <span>10 Hz (Alpha)</span>
                    <span>50 Hz (Gamma)</span>
                  </div>
                  <p className="text-xs mt-2" style={{ color: "#F59E0B", fontFamily: "DM Sans, sans-serif" }}>
                    ⚠ Stereo headphones required — binaural beats do not work on speakers.
                  </p>
                </div>
              )}

              {playMode === "isochronic" && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
                        Pulse rate: <strong style={{ color: "#E8EDF5" }}>{isoRate.toFixed(1)} Hz</strong>
                      </span>
                    </div>
                    <Slider
                      min={0.5}
                      max={40}
                      step={0.5}
                      value={[isoRate]}
                      onValueChange={([v]) => {
                        setIsoRate(v);
                        if (player.isPlaying) player.setIsochronic(v, isoDuty);
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
                        Duty cycle: <strong style={{ color: "#E8EDF5" }}>{Math.round(isoDuty * 100)}%</strong>
                      </span>
                    </div>
                    <Slider
                      min={0.1}
                      max={0.9}
                      step={0.05}
                      value={[isoDuty]}
                      onValueChange={([v]) => {
                        setIsoDuty(v);
                        if (player.isPlaying) player.setIsochronic(isoRate, v);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Background layer */}
            <div className="p-5 rounded-2xl" style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                  Background Layer
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadProgress !== null}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all disabled:opacity-50"
                  style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.25)" }}
                >
                  {uploadProgress !== null ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                  Upload MP3
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mpeg,.mp3"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file);
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <button
                  onClick={() => background.selectBackground("none", null)}
                  className="px-2.5 py-1.5 rounded-lg text-xs transition-all"
                  style={background.layer.type === "none" ? {
                    background: "rgba(0,212,170,0.15)",
                    color: "#00D4AA",
                    border: "1px solid rgba(0,212,170,0.3)",
                  } : {
                    background: "rgba(255,255,255,0.04)",
                    color: "#6B7A99",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  None
                </button>
                {BACKGROUND_LOOPS.map(loop => (
                  <button
                    key={loop.id}
                    onClick={() => background.selectBackground("library", loop.id)}
                    className="px-2.5 py-1.5 rounded-lg text-xs transition-all"
                    style={
                      background.layer.type === "library" && background.layer.key === loop.id
                        ? {
                            background: "rgba(139,92,246,0.18)",
                            color: "#C4B5FD",
                            border: "1px solid rgba(139,92,246,0.35)",
                          }
                        : {
                            background: "rgba(255,255,255,0.04)",
                            color: "#6B7A99",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }
                    }
                  >
                    {loop.category === "music" ? "♪ " : ""}{loop.label}
                  </button>
                ))}
              </div>

              {uploadOptions.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
                    My uploads
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {uploadOptions.map(upload => (
                      <button
                        key={upload.key}
                        onClick={() => background.selectBackground("upload", upload.key)}
                        className="px-2.5 py-1.5 rounded-lg text-xs transition-all"
                        style={
                          background.layer.type === "upload" && background.layer.key === upload.key
                            ? {
                                background: "rgba(245,158,11,0.15)",
                                color: "#F59E0B",
                                border: "1px solid rgba(245,158,11,0.3)",
                              }
                            : {
                                background: "rgba(255,255,255,0.04)",
                                color: "#6B7A99",
                                border: "1px solid rgba(255,255,255,0.06)",
                              }
                        }
                      >
                        {upload.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {background.layer.type !== "none" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs flex items-center gap-1" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
                      <Music2 size={12} /> Background volume
                    </span>
                    <span className="text-xs font-mono" style={{ color: "#E8EDF5" }}>
                      {Math.round(background.layer.volume * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={[background.layer.volume]}
                    onValueChange={([v]) => background.setBackgroundVolume(v)}
                  />
                </div>
              )}

              {uploadProgress !== null && (
                <p className="text-xs mt-2" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
                  Uploading… {uploadProgress}%
                </p>
              )}
            </div>

            {/* Visualizer (FR-030 + FR-031) */}
            <div className="p-5 rounded-2xl" style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                  Signal Analysis
                </div>
                <div className="flex gap-1">
                  {(["oscilloscope", "spectrum", "both"] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setVizMode(v)}
                      className="px-2 py-1 rounded-lg text-xs font-medium capitalize transition-all"
                      style={vizMode === v ? {
                        background: "rgba(0,212,170,0.15)",
                        color: "#00D4AA",
                        border: "1px solid rgba(0,212,170,0.3)",
                      } : {
                        background: "transparent",
                        color: "#6B7A99",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <PrecisionVisualizer
                analyserNode={analyserNode}
                isPlaying={player.isPlaying}
                targetHz={targetHz}
                mode={vizMode}
              />
              {!player.isPlaying && (
                <p className="text-xs text-center mt-2" style={{ color: "#3A4A6B", fontFamily: "DM Sans, sans-serif" }}>
                  Start playback to see live signal analysis
                </p>
              )}
            </div>
          </div>

          {/* ── Right column: Playback + Presets + Favorites ─────────────── */}
          <div className="flex flex-col gap-5">

            {/* Playback controls */}
            <div className="p-5 rounded-2xl" style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                Playback
              </div>

              {/* Play/Stop */}
              <button
                onClick={handlePlay}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-base mb-3 transition-all duration-200"
                style={player.isPlaying ? {
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#EF4444",
                } : {
                  background: "linear-gradient(135deg, #00D4AA, #00B894)",
                  color: "#0A0B14",
                }}
              >
                {player.isPlaying ? <><Square size={18} /> Stop</> : <><Play size={18} fill="currentColor" /> Play</>}
              </button>

              {/* Save Sound (account) */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                    Save to account
                  </span>
                  <button
                    onClick={() => setShowSaveInput(v => !v)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all"
                    style={{ background: "rgba(59,130,246,0.12)", color: "#60A5FA", border: "1px solid rgba(59,130,246,0.25)" }}
                  >
                    <Save size={11} /> Save Sound
                  </button>
                </div>
                {showSaveInput && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={formatSoundSummary(
                        customFreq,
                        waveform,
                        playMode,
                        background.layer.type,
                        background.layer.key,
                      )}
                      value={saveNameInput}
                      onChange={e => setSaveNameInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && void saveSound()}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5" }}
                    />
                    <button
                      onClick={() => void saveSound()}
                      disabled={createSound.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                      style={{ background: "rgba(59,130,246,0.15)", color: "#60A5FA" }}
                    >
                      {createSound.isPending ? "Saving…" : "Save"}
                    </button>
                  </div>
                )}
                {!user && (
                  <p className="text-[10px] mt-1" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
                    Sign in to save layered sounds. Local favorites below still work offline.
                  </p>
                )}
              </div>

              {/* Timer display */}
              {player.isPlaying && (
                <div className="text-center mb-4">
                  <div className="text-2xl font-mono font-bold" style={{ color: "#00D4AA" }}>
                    {formatTime(player.playTime)}
                  </div>
                  <div className="text-xs" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                    {player.session?.name ?? `${customFreq.toFixed(2)} Hz`}
                  </div>
                </div>
              )}

              {/* Volume (FR-004) */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>Volume</span>
                  <span className="text-xs font-mono" style={{ color: "#E8EDF5" }}>{Math.round(player.volume * 100)}%</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[player.volume]}
                  onValueChange={([v]) => player.setVolume(v)}
                />
              </div>

              {/* Sleep timer (FR-041) */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Clock size={12} style={{ color: "#6B7A99" }} />
                  <span className="text-xs" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                    Sleep timer {sleepMinutes ? `— ${sleepMinutes} min` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {SLEEP_OPTIONS.map(m => (
                    <button
                      key={m}
                      onClick={() => handleSleepTimer(m)}
                      className="px-2 py-1 rounded-lg text-xs transition-all"
                      style={sleepMinutes === m ? {
                        background: "rgba(139,92,246,0.2)",
                        color: "#8B5CF6",
                        border: "1px solid rgba(139,92,246,0.3)",
                      } : {
                        background: "rgba(255,255,255,0.04)",
                        color: "#6B7A99",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Favorites (FR-011) */}
            <div className="p-5 rounded-2xl" style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                  Favorites
                </div>
                <button
                  onClick={() => setShowFavInput(v => !v)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all"
                  style={{ background: "rgba(0,212,170,0.1)", color: "#00D4AA", border: "1px solid rgba(0,212,170,0.2)" }}
                >
                  <Star size={11} /> Save
                </button>
              </div>

              {showFavInput && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder={`${customFreq.toFixed(2)} Hz`}
                    value={favNameInput}
                    onChange={e => setFavNameInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addFavorite()}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8EDF5" }}
                  />
                  <button onClick={addFavorite} className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(0,212,170,0.15)", color: "#00D4AA" }}>
                    Add
                  </button>
                </div>
              )}

              {favorites.length === 0 ? (
                <p className="text-xs" style={{ color: "#3A4A6B", fontFamily: "DM Sans, sans-serif" }}>
                  No favorites yet — save a custom frequency above.
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {favorites.map(fav => (
                    <div key={fav.id} className="flex items-center gap-2 group">
                      <button
                        onClick={() => {
                          setCustomFreq(fav.session.freqL);
                          setCustomFreqInput(fav.session.freqL.toFixed(2));
                          setWaveformState(fav.session.waveform);
                          setPlayMode(fav.session.mode);
                          if (fav.session.beatHz) setBeatHz(fav.session.beatHz);
                          void player.play(fav.session).then(() =>
                            background.startBackground(
                              background.layer.type,
                              background.layer.key,
                              background.layer.volume,
                            ),
                          );
                        }}
                        className="flex-1 text-left px-2 py-1.5 rounded-lg text-xs transition-all"
                        style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "#E8EDF5"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#8FA3BF"; }}
                      >
                        ★ {fav.name}
                      </button>
                      <button onClick={() => removeFavorite(fav.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <StarOff size={12} style={{ color: "#EF4444" }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preset library (FR-010) */}
            <div className="p-5 rounded-2xl" style={{ background: "#11142A", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                Presets
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handlePreset(p)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs transition-all duration-150 flex items-center gap-2"
                    style={{
                      background: player.session?.name === p.session.name && player.isPlaying
                        ? `rgba(${hexToRgb(p.color)},0.12)`
                        : "transparent",
                      color: "#8FA3BF",
                      fontFamily: "DM Sans, sans-serif",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background =
                        player.session?.name === p.session.name && player.isPlaying
                          ? `rgba(${hexToRgb(p.color)},0.12)` : "transparent";
                    }}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
