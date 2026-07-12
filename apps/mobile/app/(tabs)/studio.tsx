/**
 * Precision Frequency Studio — Unified Screen
 * Combines the Precision Player (DDS engine, waveforms, binaural/isochronic,
 * favorites) with the Sound Studio (ambient layers, presets, sleep timer,
 * breathing guide) into a single dense interface.
 */
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import {
  STUDIO_FREQUENCIES,
  STUDIO_MUSIC_MODES,
  STUDIO_NATURE_SOUNDS,
  STUDIO_PRESETS,
} from "@rih/shared-utils";
import type { StudioMixSettings } from "@rih/shared-types";
import { usePrecisionPlayer, type PlayMode } from "@/hooks/usePrecisionPlayer";
import { useSoundStudio } from "@/hooks/useSoundStudio";
import { useAudioOutput } from "@/hooks/useAudioOutput";
import { binauralRouteHint, outputLabel } from "@/lib/audioRoute";
import {
  clampHz,
  clampBeatHz,
  brainwaveBand,
  MIN_BEAT_HZ,
  MAX_BEAT_HZ,
  type Waveform,
} from "@/lib/synthMath";
import { useAuthStore } from "@/store/authStore";
import { trackSessionStarted, trackSessionEnded } from "@/hooks/useAnalytics";
import BreathingGuide from "@/components/BreathingGuide";
import SessionJournal from "@/components/SessionJournal";
import AudioVisualizer from "@/components/AudioVisualizer";
import VolumeSlider from "@/components/VolumeSlider";
import { Dimensions } from "react-native";
import { soundsApi, type ServerSound } from "@/lib/api";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ─── Constants ────────────────────────────────────────────────────────────────

const FAVORITES_KEY = "rih_precision_favorites";
const CUSTOM_PRESETS_KEY = "rih_custom_presets";
const JOURNAL_MIN_SEC = 30;
const SLEEP_DURATIONS = [15, 30, 45, 60];

interface Favorite {
  id: string;
  name: string;
  hz: number;
  waveform: Waveform;
  mode: PlayMode;
  beatHz: number;
}

interface CustomPreset {
  id: string;
  name: string;
  createdAt: number;
  settings: StudioMixSettings;
}

const WAVEFORMS: Array<{ id: Waveform; label: string; symbol: string }> = [
  { id: "sine", label: "Sine", symbol: "∿" },
  { id: "square", label: "Square", symbol: "⊓" },
  { id: "triangle", label: "Triangle", symbol: "△" },
  { id: "sawtooth", label: "Saw", symbol: "◿" },
  { id: "bowl", label: "Bowl", symbol: "◡" },
];

const MODES: Array<{ id: PlayMode; label: string }> = [
  { id: "pure", label: "Pure Tone" },
  { id: "binaural", label: "Binaural" },
  { id: "isochronic", label: "Isochronic" },
];

const NUDGES = [-10, -1, -0.1, 0.1, 1, 10];

const QUICK_PRESETS: Array<{
  label: string;
  color: string;
  hz: number;
  mode: PlayMode;
  beatHz?: number;
}> = [
  { label: "432 Hz", color: "#00D4AA", hz: 432, mode: "pure" },
  { label: "528 Hz", color: "#06B6D4", hz: 528, mode: "pure" },
  { label: "Schumann 7.83", color: "#84CC16", hz: 200, mode: "binaural", beatHz: 7.83 },
  { label: "Alpha 10 Hz", color: "#00D4AA", hz: 200, mode: "binaural", beatHz: 10 },
  { label: "Theta 6 Hz", color: "#EC4899", hz: 200, mode: "binaural", beatHz: 6 },
  { label: "Delta 2 Hz", color: "#6366F1", hz: 200, mode: "binaural", beatHz: 2 },
  { label: "Focus 40 Hz", color: "#F59E0B", hz: 200, mode: "isochronic", beatHz: 40 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadFavorites(): Promise<Favorite[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function persistFavorites(favs: Favorite[]) {
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  } catch {}
}

async function loadCustomPresets(): Promise<CustomPreset[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveCustomPresets(presets: CustomPreset[]) {
  try {
    await AsyncStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
  } catch {}
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudioScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isPremium } = usePremiumStatus();

  // Precision DDS engine (tone layer)
  const precision = usePrecisionPlayer();
  const audioOutput = useAudioOutput();

  // Studio ambient engine (music + nature layers)
  const studio = useSoundStudio();

  // ── Precision state ─────────────────────────────────────────────────────────
  const [hz, setHz] = useState(432);
  const [hzText, setHzText] = useState("432");
  const [waveform, setWaveform] = useState<Waveform>("sine");
  const [mode, setMode] = useState<PlayMode>("pure");
  const [beatHz, setBeatHz] = useState(10);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  // ── Favorites ───────────────────────────────────────────────────────────────
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [favName, setFavName] = useState("");
  const [syncingFavs, setSyncingFavs] = useState(false);

  // ── Custom presets (studio mixes) ───────────────────────────────────────────
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [saveMixModalOpen, setSaveMixModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // ── Session / Journal ───────────────────────────────────────────────────────
  const [journalOpen, setJournalOpen] = useState(false);
  const lastPlayTimeRef = useRef(0);

  // ── Breathing guide ─────────────────────────────────────────────────────────
  const [showBreathing, setShowBreathing] = useState(false);

  // ── Sleep timer ─────────────────────────────────────────────────────────────
  const [timerRemainSec, setTimerRemainSec] = useState(0);
  const [timerTotalSec, setTimerTotalSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalMasterRef = useRef(0.8);
  const timerActive = timerTotalSec > 0;

  // ── Load data on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    loadCustomPresets().then(setCustomPresets);
  }, []);

  useEffect(() => {
    async function loadAll() {
      if (user) {
        const serverFavs = await soundsApi.list();
        if (serverFavs) {
          const mapped: Favorite[] = serverFavs.map((s: ServerSound) => ({
            id: String(s.id),
            name: s.name,
            hz: s.freqL,
            waveform: s.waveform as Waveform,
            mode: s.mode as PlayMode,
            beatHz: s.beatHz ?? 10,
          }));
          setFavorites(mapped);
          await persistFavorites(mapped);
          return;
        }
      }
      loadFavorites().then(setFavorites);
    }
    loadAll();
  }, [user]);

  // ── Precision controls ──────────────────────────────────────────────────────
  const currentConfig = useCallback(
    () => ({ hz, waveform, mode, beatHz }),
    [hz, waveform, mode, beatHz]
  );

  const applyHz = useCallback(
    (value: number) => {
      const clamped = clampHz(value);
      setHz(clamped);
      setHzText(String(clamped));
      if (precision.isPlaying) precision.retune(clamped);
      // Also update studio frequency to nearest solfeggio
      const nearest = STUDIO_FREQUENCIES.reduce((prev, curr) =>
        Math.abs(curr.hz - clamped) < Math.abs(prev.hz - clamped) ? curr : prev
      );
      studio.setFrequency(nearest.hz);
    },
    [precision, studio]
  );

  const handleHzSubmit = useCallback(() => {
    const parsed = parseFloat(hzText.replace(",", "."));
    applyHz(Number.isFinite(parsed) ? parsed : hz);
  }, [hzText, hz, applyHz]);

  const restartWith = useCallback(
    (partial: Partial<{ waveform: Waveform; mode: PlayMode; beatHz: number }>) => {
      const next = { ...currentConfig(), ...partial };
      if (partial.waveform !== undefined) setWaveform(partial.waveform);
      if (partial.mode !== undefined) setMode(partial.mode);
      if (partial.beatHz !== undefined) setBeatHz(partial.beatHz);
      if (precision.isPlaying) precision.play(next);
    },
    [currentConfig, precision]
  );

  // ── Play / Stop (precision tone) ───────────────────────────────────────────
  const handlePlayStop = useCallback(() => {
    if (precision.isPlaying) {
      lastPlayTimeRef.current = precision.playTime;
      precision.stop();
      studio.stop();
      trackSessionEnded({
        frequency_hz: hz,
        duration_seconds: precision.playTime,
        had_journal_entry: false,
      });
      if (precision.playTime >= JOURNAL_MIN_SEC) setJournalOpen(true);
    } else {
      precision.play(currentConfig());
      studio.toggle();
      trackSessionStarted({
        frequency_hz: hz,
        frequency_name: `Precision ${hz}Hz${mode !== "pure" ? ` (${mode} ${beatHz}Hz)` : ""}`,
        session_type: "studio_mix",
        is_premium: isPremium,
        source: "studio",
      });
    }
  }, [precision, studio, hz, mode, beatHz, isPremium, currentConfig]);

  // ── Quick presets (precision) ───────────────────────────────────────────────
  const applyQuickPreset = useCallback(
    (p: (typeof QUICK_PRESETS)[number]) => {
      setHz(p.hz);
      setHzText(String(p.hz));
      setMode(p.mode);
      if (p.beatHz !== undefined) setBeatHz(p.beatHz);
      setWaveform("sine");
      if (precision.isPlaying) {
        precision.play({ hz: p.hz, waveform: "sine", mode: p.mode, beatHz: p.beatHz ?? beatHz });
      }
    },
    [precision, beatHz]
  );

  // ── Solfeggio frequency grid (studio) ──────────────────────────────────────
  const selectSolfeggioHz = useCallback(
    (freqHz: number) => {
      setHz(freqHz);
      setHzText(String(freqHz));
      studio.setFrequency(freqHz);
      setActivePreset(null);
      if (precision.isPlaying) precision.retune(freqHz);
    },
    [precision, studio]
  );

  // ── Studio presets ──────────────────────────────────────────────────────────
  const applyBuiltinPreset = useCallback(
    (presetId: string) => {
      const preset = STUDIO_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      studio.applySettings(preset.settings);
      setActivePreset(presetId);
      // Sync Hz display
      setHz(preset.settings.frequencyHz);
      setHzText(String(preset.settings.frequencyHz));
      if (precision.isPlaying) precision.retune(preset.settings.frequencyHz);
    },
    [studio, precision]
  );

  const applyCustomPreset = useCallback(
    (preset: CustomPreset) => {
      studio.applySettings(preset.settings);
      setActivePreset(`custom_${preset.id}`);
      setHz(preset.settings.frequencyHz);
      setHzText(String(preset.settings.frequencyHz));
      if (precision.isPlaying) precision.retune(preset.settings.frequencyHz);
    },
    [studio, precision]
  );

  const saveCurrentMix = useCallback(async () => {
    const name = newPresetName.trim() || `My Mix ${customPresets.length + 1}`;
    const preset: CustomPreset = {
      id: `${Date.now()}`,
      name,
      createdAt: Date.now(),
      settings: {
        frequencyHz: studio.state.frequencyHz,
        musicMode: studio.state.musicMode,
        natureSound: studio.state.natureSound,
        frequencyVolume: studio.state.frequencyVolume,
        musicVolume: studio.state.musicVolume,
        natureVolume: studio.state.natureVolume,
        masterVolume: studio.state.masterVolume,
      },
    };
    const updated = [...customPresets, preset];
    setCustomPresets(updated);
    await saveCustomPresets(updated);
    setSaveMixModalOpen(false);
    setNewPresetName("");
  }, [newPresetName, customPresets, studio.state]);

  const deleteCustomPreset = useCallback(
    (preset: CustomPreset) => {
      Alert.alert("Delete Mix", `Remove "${preset.name}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updated = customPresets.filter((p) => p.id !== preset.id);
            setCustomPresets(updated);
            await saveCustomPresets(updated);
          },
        },
      ]);
    },
    [customPresets]
  );

  // ── Favorites ───────────────────────────────────────────────────────────────
  const saveFavorite = useCallback(async () => {
    const name = favName.trim() || `${hz} Hz`;
    setSyncingFavs(true);
    try {
      if (user) {
        const result = await soundsApi.create({
          name,
          freqL: hz,
          beatHz: mode !== "pure" ? beatHz : undefined,
          waveform,
          mode: mode === "pure" ? "mono" : mode,
          toneVolume: 0.7,
        });
        if (result) {
          const fav: Favorite = { id: String(result.id), name, hz, waveform, mode, beatHz };
          const updated = [fav, ...favorites].slice(0, 30);
          setFavorites(updated);
          await persistFavorites(updated);
          setFavName("");
          setSaveModalOpen(false);
          return;
        }
      }
      const fav: Favorite = { id: `fav_${Date.now()}`, name, hz, waveform, mode, beatHz };
      const updated = [fav, ...favorites].slice(0, 30);
      setFavorites(updated);
      await persistFavorites(updated);
      setFavName("");
      setSaveModalOpen(false);
    } finally {
      setSyncingFavs(false);
    }
  }, [favName, hz, waveform, mode, beatHz, favorites, user]);

  const loadFavorite = useCallback(
    (fav: Favorite) => {
      setHz(fav.hz);
      setHzText(String(fav.hz));
      setWaveform(fav.waveform);
      setMode(fav.mode);
      setBeatHz(fav.beatHz);
      if (precision.isPlaying) {
        precision.play({ hz: fav.hz, waveform: fav.waveform, mode: fav.mode, beatHz: fav.beatHz });
      }
    },
    [precision]
  );

  const deleteFavorite = useCallback(
    async (id: string) => {
      const updated = favorites.filter((f) => f.id !== id);
      setFavorites(updated);
      await persistFavorites(updated);
      if (user && /^\d+$/.test(id)) {
        await soundsApi.delete(Number(id));
      }
    },
    [favorites, user]
  );

  // ── Sleep timer ─────────────────────────────────────────────────────────────
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelTimer = useCallback(() => {
    clearTimer();
    setTimerTotalSec(0);
    setTimerRemainSec(0);
    studio.setLayerVolume("master", originalMasterRef.current);
  }, [clearTimer, studio]);

  const startTimer = useCallback(
    (minutes: number) => {
      clearTimer();
      const totalSec = minutes * 60;
      originalMasterRef.current = studio.state.masterVolume;
      setTimerTotalSec(totalSec);
      setTimerRemainSec(totalSec);
      // Start playback if not already playing
      if (!precision.isPlaying) handlePlayStop();

      timerRef.current = setInterval(() => {
        setTimerRemainSec((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            clearTimer();
            setTimerTotalSec(0);
            setTimeout(() => {
              precision.stop();
              studio.stop();
              studio.setLayerVolume("master", originalMasterRef.current);
            }, 300);
            return 0;
          }
          const fadeStartSec = totalSec * 0.25;
          if (next <= fadeStartSec) {
            studio.setLayerVolume("master", originalMasterRef.current * (next / fadeStartSec));
          }
          return next;
        });
      }, 1000);
    },
    [clearTimer, studio, precision, handlePlayStop]
  );

  useEffect(() => clearTimer, [clearTimer]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const showBeat = mode !== "pure";
  const selectedFreq =
    STUDIO_FREQUENCIES.find((f) => f.hz === hz) ??
    STUDIO_FREQUENCIES.reduce((prev, curr) =>
      Math.abs(curr.hz - hz) < Math.abs(prev.hz - hz) ? curr : prev
    );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.kicker}>PRECISION FREQUENCY STUDIO</Text>
          <Text style={styles.title}>Frequency Studio</Text>
          <Text style={styles.subtitle}>
            DDS precision synthesis · Layered ambient mixing · ±0.05 Hz accuracy
          </Text>
        </View>

        {/* Hardware disclaimer */}
        <View style={styles.disclaimerCard}>
          <TouchableOpacity
            style={styles.disclaimerHeader}
            onPress={() => setDisclaimerOpen((o) => !o)}
            activeOpacity={0.7}
          >
            <Text style={styles.disclaimerIcon}>⚠</Text>
            <Text style={styles.disclaimerTitle}>
              Headphones recommended for best results
            </Text>
            <Text style={styles.disclaimerChevron}>
              {disclaimerOpen ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>
          {disclaimerOpen && (
            <Text style={styles.disclaimerBody}>
              Built-in phone speakers roll off significantly below ~150 Hz —
              frequencies such as 174 Hz may be inaudible or distorted without
              headphones. For binaural beats, stereo headphones are required —
              the effect only works when each ear receives a different tone.
              {"\n\n"}Note: Sound healing claims are not validated by mainstream
              medicine. This app is for wellness and entertainment purposes only.
            </Text>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            PRECISION CONTROLS
        ═══════════════════════════════════════════════════════════════════════ */}

        {/* Hz display + input */}
        <View style={styles.hzCard}>
          <View style={styles.hzRow}>
            <TextInput
              style={styles.hzInput}
              value={hzText}
              onChangeText={setHzText}
              onBlur={handleHzSubmit}
              onSubmitEditing={handleHzSubmit}
              keyboardType="decimal-pad"
              returnKeyType="done"
              selectTextOnFocus
              maxLength={8}
            />
            <Text style={styles.hzUnit}>Hz</Text>
          </View>
          <Text style={styles.hzRange}>1 – 22,000 Hz · 0.01 resolution</Text>
          <TouchableOpacity
            onPress={() => router.push("/technology")}
            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
          >
            <Text style={styles.trueHzLink}>Powered by TrueHz™ Precision Tuning →</Text>
          </TouchableOpacity>
          <View style={styles.nudgeRow}>
            {NUDGES.map((n) => (
              <TouchableOpacity
                key={n}
                style={styles.nudgeBtn}
                onPress={() => applyHz(hz + n)}
                activeOpacity={0.7}
              >
                <Text style={styles.nudgeText}>
                  {n > 0 ? `+${n}` : n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Waveform */}
        <Text style={styles.sectionLabel}>WAVEFORM</Text>
        <View style={styles.chipRow}>
          {WAVEFORMS.map((w) => {
            const active = waveform === w.id;
            return (
              <TouchableOpacity
                key={w.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => restartWith({ waveform: w.id })}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipSymbol, active && styles.chipTextActive]}>
                  {w.symbol}
                </Text>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {w.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {waveform === "bowl" && (
          <Text style={styles.hint}>
            Singing bowl — layered overtones and slow shimmer
          </Text>
        )}

        {/* Play Mode */}
        <Text style={styles.sectionLabel}>PLAY MODE</Text>
        <View style={styles.chipRow}>
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.chip, styles.modeChip, active && styles.chipActive]}
                onPress={() => restartWith({ mode: m.id })}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {mode === "binaural" && (
          <Text style={styles.hint}>
            {binauralRouteHint(audioOutput.kind)}
            {"\n"}Left ear {hz} Hz · right ear {clampHz(hz + beatHz)} Hz
          </Text>
        )}
        {mode === "isochronic" && (
          <Text style={styles.hint}>
            Tone pulses on/off at {beatHz} Hz — works with speakers
          </Text>
        )}

        {/* Beat rate slider */}
        {showBeat && (
          <View style={styles.beatCard}>
            <View style={styles.beatHeader}>
              <Text style={styles.beatLabel}>
                {mode === "binaural" ? "Beat Frequency" : "Pulse Rate"}
              </Text>
              <Text style={styles.beatValue}>
                {beatHz} Hz · {brainwaveBand(beatHz)}
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={MIN_BEAT_HZ}
              maximumValue={MAX_BEAT_HZ}
              step={0.01}
              value={beatHz}
              onSlidingComplete={(v) => restartWith({ beatHz: clampBeatHz(v) })}
              minimumTrackTintColor={colors.teal}
              maximumTrackTintColor="rgba(255,255,255,0.1)"
              thumbTintColor={colors.teal}
            />
            <View style={styles.bandRow}>
              {["Delta", "Theta", "Alpha", "Beta", "Gamma"].map((b) => (
                <Text
                  key={b}
                  style={[
                    styles.bandText,
                    brainwaveBand(beatHz) === b && styles.bandTextActive,
                  ]}
                >
                  {b}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PLAY CONTROLS
        ═══════════════════════════════════════════════════════════════════════ */}

        <View style={styles.playSection}>
          <TouchableOpacity
            style={[styles.playBtn, precision.isPlaying && styles.stopBtn]}
            onPress={handlePlayStop}
            activeOpacity={0.85}
          >
            <Text style={styles.playBtnIcon}>{precision.isPlaying ? "⏹" : "▶"}</Text>
          </TouchableOpacity>
          {precision.isPlaying && (
            <Text style={styles.playTime}>{formatTime(precision.playTime)}</Text>
          )}
        </View>

        {/* Real-time Audio Visualizer */}
        <AudioVisualizer
          isPlaying={precision.isPlaying}
          width={SCREEN_WIDTH - spacing[4] * 2 - spacing[6]}
          height={100}
          color={colors.teal}
        />

        {/* Volume Control */}
        <VolumeSlider
          value={precision.volume}
          onValueChange={precision.setVolume}
          color={colors.teal}
          label="Tone Volume"
          showLevel
        />
        <Text style={styles.outputLabel}>
          ♪ Playing via {outputLabel(audioOutput.kind, audioOutput.name ?? undefined)}
        </Text>

        {/* Quick presets */}
        <Text style={styles.sectionLabel}>QUICK PRESETS</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetScrollRow}
        >
          {QUICK_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.label}
              style={[styles.presetChip, { borderColor: p.color + "50" }]}
              onPress={() => applyQuickPreset(p)}
              activeOpacity={0.8}
            >
              <Text style={[styles.presetChipText, { color: p.color }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ═══════════════════════════════════════════════════════════════════════
            SOLFEGGIO FREQUENCIES
        ═══════════════════════════════════════════════════════════════════════ */}

        <Text style={[styles.sectionLabel, styles.sectionGap]}>HEALING FREQUENCY</Text>
        <View style={styles.freqGrid}>
          {STUDIO_FREQUENCIES.map((freq) => {
            const active = hz === freq.hz;
            return (
              <TouchableOpacity
                key={freq.hz}
                style={[
                  styles.freqCell,
                  active && {
                    backgroundColor: freq.color + "18",
                    borderColor: freq.color + "45",
                  },
                ]}
                onPress={() => selectSolfeggioHz(freq.hz)}
                activeOpacity={0.75}
              >
                <Text style={[styles.freqCellHz, active && { color: freq.color }]}>
                  {freq.hz}
                </Text>
                <Text style={styles.freqCellName} numberOfLines={1}>
                  {freq.name.split(" ")[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            AMBIENT LAYERS
        ═══════════════════════════════════════════════════════════════════════ */}

        {/* Music mode selector */}
        <Text style={[styles.sectionLabel, styles.sectionGap]}>MUSIC LAYER</Text>
        <View style={styles.modeRow}>
          {STUDIO_MUSIC_MODES.map((m) => {
            const active = studio.state.musicMode === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.modeCell, active && styles.modeCellActive]}
                onPress={() => {
                  studio.setMusicMode(m.id);
                  setActivePreset(null);
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.modeIcon, active && { color: colors.teal }]}>
                  {m.icon}
                </Text>
                <Text style={[styles.modeLabel, active && { color: colors.textPrimary }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Nature sound selector */}
        <Text style={[styles.sectionLabel, styles.sectionGap]}>NATURE LAYER</Text>
        <View style={styles.modeRow}>
          {STUDIO_NATURE_SOUNDS.map((sound) => {
            const active = studio.state.natureSound === sound.id;
            return (
              <TouchableOpacity
                key={sound.id}
                style={[
                  styles.natureCell,
                  active && {
                    backgroundColor: sound.color + "12",
                    borderColor: sound.color + "35",
                  },
                ]}
                onPress={() => {
                  studio.setNatureSound(sound.id);
                  setActivePreset(null);
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.natureEmoji}>{sound.emoji}</Text>
                <Text style={[styles.modeLabel, active && { color: colors.textPrimary }]}>
                  {sound.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Layer mixer */}
        <Text style={[styles.sectionLabel, styles.sectionGap]}>LAYER MIX</Text>
        <View style={styles.mixerCard}>
          {(
            [
              { key: "frequency", label: "Frequency", value: studio.state.frequencyVolume, color: selectedFreq.color },
              { key: "music", label: "Music", value: studio.state.musicVolume, color: colors.teal },
              { key: "nature", label: "Nature", value: studio.state.natureVolume, color: "#3B82F6" },
              { key: "master", label: "Master", value: studio.state.masterVolume, color: colors.purple },
            ] as const
          ).map((layer) => (
            <View key={layer.key} style={styles.mixerRow}>
              <Text style={styles.mixerLabel}>{layer.label}</Text>
              <Slider
                style={styles.mixerSlider}
                minimumValue={0}
                maximumValue={1}
                value={layer.value}
                onValueChange={(v) => studio.setLayerVolume(layer.key, v)}
                minimumTrackTintColor={layer.color}
                maximumTrackTintColor="rgba(255,255,255,0.1)"
                thumbTintColor={layer.color}
              />
              <Text style={styles.mixerPct}>{Math.round(layer.value * 100)}%</Text>
            </View>
          ))}
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            PRESETS & MIXES
        ═══════════════════════════════════════════════════════════════════════ */}

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionLabel, { paddingHorizontal: 0 }]}>PRESETS</Text>
          <View style={styles.headerBtnRow}>
            <TouchableOpacity
              style={styles.breatheBtn}
              onPress={() => setShowBreathing(true)}
            >
              <Text style={styles.breatheBtnText}>🌬 Breathe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveMixBtn} onPress={() => setSaveMixModalOpen(true)}>
              <Text style={styles.saveMixBtnText}>＋ Save Mix</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetScrollRow}
        >
          {STUDIO_PRESETS.map((preset) => {
            const active = activePreset === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetCard,
                  active && {
                    backgroundColor: preset.color + "15",
                    borderColor: preset.color + "40",
                  },
                ]}
                onPress={() => applyBuiltinPreset(preset.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.presetIcon}>{preset.icon}</Text>
                <Text style={[styles.presetName, active && { color: colors.textPrimary }]}>
                  {preset.name}
                </Text>
                <Text style={styles.presetDesc} numberOfLines={2}>
                  {preset.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Custom presets */}
        {customPresets.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, styles.myMixesLabel]}>MY MIXES</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetScrollRow}
            >
              {customPresets.map((preset) => {
                const active = activePreset === `custom_${preset.id}`;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.customCard,
                      active && {
                        backgroundColor: colors.purpleDim,
                        borderColor: "rgba(139,92,246,0.4)",
                      },
                    ]}
                    onPress={() => applyCustomPreset(preset)}
                    onLongPress={() => deleteCustomPreset(preset)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.presetName, active && { color: colors.textPrimary }]}>
                      {preset.name}
                    </Text>
                    <Text style={styles.presetDesc}>
                      {preset.settings.frequencyHz}Hz
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={styles.hintPadded}>Long-press a mix to delete it.</Text>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            SLEEP TIMER
        ═══════════════════════════════════════════════════════════════════════ */}

        <Text style={[styles.sectionLabel, styles.sectionGap]}>SLEEP TIMER</Text>
        {timerActive ? (
          <View style={[styles.timerCard, { borderColor: "rgba(139,92,246,0.3)" }]}>
            <View style={styles.timerHeadRow}>
              <View>
                <Text style={styles.timerFading}>Fading out</Text>
                <Text style={styles.timerClock}>{formatTime(timerRemainSec)}</Text>
              </View>
              <TouchableOpacity style={styles.timerCancel} onPress={cancelTimer}>
                <Text style={styles.timerCancelText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timerTrack}>
              <View
                style={[
                  styles.timerFill,
                  { width: `${(1 - timerRemainSec / timerTotalSec) * 100}%` },
                ]}
              />
            </View>
          </View>
        ) : (
          <View style={styles.timerRow}>
            {SLEEP_DURATIONS.map((min) => (
              <TouchableOpacity
                key={min}
                style={styles.timerChipBtn}
                onPress={() => startTimer(min)}
                activeOpacity={0.8}
              >
                <Text style={styles.timerChipMin}>{min}</Text>
                <Text style={styles.timerChipUnit}>min</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            FAVORITES
        ═══════════════════════════════════════════════════════════════════════ */}

        <View style={styles.favHeader}>
          <Text style={[styles.sectionLabel, { paddingHorizontal: 0 }]}>FAVORITES</Text>
          <TouchableOpacity onPress={() => setSaveModalOpen(true)}>
            <Text style={styles.favSave}>+ Save current</Text>
          </TouchableOpacity>
        </View>
        {favorites.length === 0 ? (
          <Text style={styles.favEmpty}>
            No favorites yet — dial in a frequency and save it.
          </Text>
        ) : (
          favorites.map((fav) => (
            <View key={fav.id} style={styles.favRow}>
              <TouchableOpacity
                style={styles.favBody}
                onPress={() => loadFavorite(fav)}
                activeOpacity={0.7}
              >
                <Text style={styles.favName}>{fav.name}</Text>
                <Text style={styles.favMeta}>
                  {fav.hz} Hz · {fav.waveform}
                  {fav.mode !== "pure" ? ` · ${fav.mode} ${fav.beatHz} Hz` : ""}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteFavorite(fav.id)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Text style={styles.favDelete}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS & OVERLAYS
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* Save favorite modal */}
      <Modal
        visible={saveModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save Favorite</Text>
            <Text style={styles.modalSubtitle}>
              {hz} Hz · {waveform}
              {mode !== "pure" ? ` · ${mode} ${beatHz} Hz` : ""}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={`${hz} Hz`}
              placeholderTextColor={colors.textDim}
              value={favName}
              onChangeText={setFavName}
              maxLength={40}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSaveModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveFavorite}>
                <Text style={styles.modalSaveText}>
                  {syncingFavs ? "Saving…" : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Save mix modal */}
      <Modal
        visible={saveMixModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveMixModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save Current Mix</Text>
            <Text style={styles.modalSubtitle}>
              {studio.state.frequencyHz}Hz ·{" "}
              {STUDIO_MUSIC_MODES.find((m) => m.id === studio.state.musicMode)?.label} ·{" "}
              {STUDIO_NATURE_SOUNDS.find((n) => n.id === studio.state.natureSound)?.label}
            </Text>
            <TextInput
              value={newPresetName}
              onChangeText={setNewPresetName}
              placeholder={`My Mix ${customPresets.length + 1}`}
              placeholderTextColor={colors.textDim}
              style={styles.modalInput}
              autoFocus
              onSubmitEditing={saveCurrentMix}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setSaveMixModalOpen(false);
                  setNewPresetName("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveCurrentMix}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Breathing guide overlay */}
      <BreathingGuide
        visible={showBreathing}
        onClose={() => setShowBreathing(false)}
        accentColor={selectedFreq.color}
      />

      {/* Post-session mood check-in */}
      <SessionJournal
        visible={journalOpen}
        onClose={() => setJournalOpen(false)}
        frequencyHz={hz}
        frequencyName={`Precision ${hz} Hz`}
        durationMinutes={Math.max(1, Math.round(lastPlayTimeRef.current / 60))}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  scroll: { paddingBottom: spacing[16] },
  // Header
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
  },
  kicker: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 2,
  },
  title: {
    fontSize: fontSizes["2xl"],
    color: colors.textPrimary,
    fontWeight: "700",
  },
  subtitle: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 },
  // Disclaimer
  disclaimerCard: {
    marginHorizontal: spacing[5],
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    borderRadius: radii.lg,
    marginBottom: spacing[5],
    overflow: "hidden",
  },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    gap: spacing[2],
  },
  disclaimerIcon: { fontSize: fontSizes.sm, color: "#F59E0B" },
  disclaimerTitle: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: "#F59E0B",
  },
  disclaimerChevron: { fontSize: fontSizes.xs, color: "#F59E0B" },
  disclaimerBody: {
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: colors.textDim,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  // Hz card
  hzCard: {
    marginHorizontal: spacing[5],
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.lg,
    padding: spacing[5],
    alignItems: "center",
    marginBottom: spacing[5],
    ...shadows.sm,
  },
  hzRow: { flexDirection: "row", alignItems: "baseline", gap: spacing[2] },
  hzInput: {
    fontSize: 56,
    fontWeight: "800",
    color: colors.teal,
    minWidth: 140,
    textAlign: "center",
    padding: 0,
  },
  hzUnit: { fontSize: fontSizes.xl, color: colors.textMuted, fontWeight: "600" },
  hzRange: { fontSize: fontSizes.xs, color: colors.textDim, marginTop: spacing[1] },
  trueHzLink: {
    fontSize: fontSizes.xs,
    fontWeight: "600",
    color: colors.teal,
    marginTop: spacing[2],
  },
  nudgeRow: {
    flexDirection: "row",
    gap: spacing[2],
    marginTop: spacing[4],
  },
  nudgeBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  nudgeText: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: "600" },
  // Sections
  sectionLabel: {
    paddingHorizontal: spacing[5],
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: spacing[2],
  },
  sectionGap: { marginTop: spacing[6], marginBottom: spacing[3] },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    marginTop: spacing[6],
    marginBottom: spacing[3],
  },
  headerBtnRow: { flexDirection: "row", gap: spacing[2] },
  breatheBtn: {
    backgroundColor: colors.tealDim,
    borderWidth: 1,
    borderColor: colors.tealBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  breatheBtnText: { fontSize: fontSizes.xs, color: colors.teal, fontWeight: "600" },
  saveMixBtn: {
    backgroundColor: colors.purpleDim,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.25)",
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  saveMixBtnText: { fontSize: fontSizes.xs, color: colors.purple, fontWeight: "600" },
  myMixesLabel: { marginTop: spacing[3], marginBottom: spacing[2] },
  // Chips (waveform/mode)
  chipRow: {
    flexDirection: "row",
    paddingHorizontal: spacing[5],
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
  },
  modeChip: { paddingVertical: spacing[3] },
  chipActive: {
    backgroundColor: colors.tealDim,
    borderColor: colors.tealBorder,
  },
  chipSymbol: { fontSize: fontSizes.lg, color: colors.textMuted, lineHeight: 24 },
  chipText: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: colors.teal },
  hint: {
    paddingHorizontal: spacing[5],
    fontSize: fontSizes.xs,
    color: colors.textDim,
    textAlign: "center",
    marginTop: -spacing[2],
    marginBottom: spacing[4],
  },
  hintPadded: {
    paddingHorizontal: spacing[5],
    fontSize: 10,
    color: colors.textDim,
    marginTop: spacing[2],
  },
  // Beat card
  beatCard: {
    marginHorizontal: spacing[5],
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  beatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  beatLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: "600" },
  beatValue: { fontSize: fontSizes.sm, color: colors.teal, fontWeight: "700" },
  bandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing[1],
  },
  bandText: { fontSize: 10, color: colors.textDim },
  bandTextActive: { color: colors.teal, fontWeight: "700" },
  // Play
  playSection: { alignItems: "center", marginVertical: spacing[4] },
  playBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: { backgroundColor: "#EF4444" },
  playBtnIcon: { fontSize: 34 },
  playTime: {
    marginTop: spacing[2],
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  // Volume
  volumeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  volIcon: { fontSize: fontSizes.base },
  slider: { flex: 1, marginHorizontal: spacing[2] },
  outputLabel: {
    fontSize: fontSizes.xs,
    color: colors.textDim,
    textAlign: "center",
    marginBottom: spacing[5],
  },
  // Quick presets
  presetScrollRow: { paddingHorizontal: spacing[5], gap: spacing[2], paddingBottom: spacing[3] },
  presetChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
  },
  presetChipText: { fontSize: fontSizes.sm, fontWeight: "600" },
  // Preset cards
  presetCard: {
    width: 130,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.lg,
    padding: spacing[3],
  },
  presetIcon: { fontSize: 18, marginBottom: spacing[1] },
  presetName: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: "700",
    marginBottom: 2,
  },
  presetDesc: { fontSize: 10, color: colors.textDim, lineHeight: 13 },
  customCard: {
    minWidth: 110,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.lg,
    padding: spacing[3],
  },
  // Frequency grid
  freqGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing[5],
    gap: spacing[2],
  },
  freqCell: {
    width: "18%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
  },
  freqCellHz: { fontSize: fontSizes.sm, fontWeight: "800", color: colors.textMuted },
  freqCellName: { fontSize: 8, color: colors.textDim, marginTop: 2 },
  // Music/nature selectors
  modeRow: {
    flexDirection: "row",
    paddingHorizontal: spacing[5],
    gap: spacing[2],
  },
  modeCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
  },
  modeCellActive: {
    backgroundColor: colors.tealDim,
    borderColor: colors.tealBorder,
  },
  modeIcon: { fontSize: fontSizes.md, color: colors.textDim, marginBottom: 2 },
  modeLabel: { fontSize: 10, color: colors.textMuted, fontWeight: "600" },
  natureCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
  },
  natureEmoji: { fontSize: 16, marginBottom: 2 },
  // Mixer
  mixerCard: {
    marginHorizontal: spacing[5],
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.xl,
    padding: spacing[4],
    gap: spacing[2],
  },
  mixerRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  mixerLabel: {
    width: 76,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  mixerSlider: { flex: 1 },
  mixerPct: {
    width: 40,
    textAlign: "right",
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  // Sleep timer
  timerRow: {
    flexDirection: "row",
    paddingHorizontal: spacing[5],
    gap: spacing[2],
  },
  timerChipBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[4],
    borderRadius: radii.md,
    backgroundColor: colors.purpleDim,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
  },
  timerChipMin: { fontSize: fontSizes.base, fontWeight: "700", color: colors.textPrimary },
  timerChipUnit: { fontSize: 10, color: colors.textMuted },
  timerCard: {
    marginHorizontal: spacing[5],
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing[4],
  },
  timerHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[3],
  },
  timerFading: { fontSize: fontSizes.xs, color: colors.purple, fontWeight: "600" },
  timerClock: {
    fontSize: fontSizes["2xl"],
    color: colors.textPrimary,
    fontWeight: "700",
  },
  timerCancel: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  timerCancelText: { color: colors.textMuted, fontSize: fontSizes.base },
  timerTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  timerFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.purple,
  },
  // Favorites
  favHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  favSave: { fontSize: fontSizes.sm, color: colors.teal, fontWeight: "600" },
  favEmpty: {
    paddingHorizontal: spacing[5],
    fontSize: fontSizes.sm,
    color: colors.textDim,
    marginTop: spacing[2],
  },
  favRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing[5],
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.md,
    padding: spacing[3],
    marginTop: spacing[2],
    gap: spacing[3],
  },
  favBody: { flex: 1 },
  favName: { fontSize: fontSizes.sm, color: colors.textPrimary, fontWeight: "600" },
  favMeta: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 1 },
  favDelete: { fontSize: fontSizes.sm, color: colors.textDim, padding: spacing[1] },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    paddingHorizontal: spacing[6],
  },
  modalCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.lg,
    padding: spacing[5],
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing[3],
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    color: colors.textPrimary,
    fontSize: fontSizes.base,
    marginBottom: spacing[4],
  },
  modalActions: { flexDirection: "row", gap: spacing[3] },
  modalCancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.bgBorder,
  },
  modalCancelText: { color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: "600" },
  modalSaveBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    backgroundColor: colors.teal,
  },
  modalSaveText: { color: "#04211C", fontSize: fontSizes.sm, fontWeight: "700" },
});
