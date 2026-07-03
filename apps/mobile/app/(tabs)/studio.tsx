/**
 * Sound Studio Tab Screen
 * Layered audio mixer — blend a healing frequency (live synthesis) with
 * procedural music (ambient/drone/crystal) and real nature soundscapes.
 * Includes built-in + custom presets and a fading sleep timer.
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";
import {
  STUDIO_FREQUENCIES,
  STUDIO_MUSIC_MODES,
  STUDIO_NATURE_SOUNDS,
  STUDIO_PRESETS,
} from "@rih/shared-utils";
import type { StudioMixSettings } from "@rih/shared-types";
import { useSoundStudio } from "@/hooks/useSoundStudio";
import { trackSessionStarted, trackSessionEnded } from "@/hooks/useAnalytics";

const CUSTOM_PRESETS_KEY = "rih_custom_presets";
const SLEEP_DURATIONS = [15, 30, 45, 60];

interface CustomPreset {
  id: string;
  name: string;
  createdAt: number;
  settings: StudioMixSettings;
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

export default function StudioScreen() {
  const {
    state,
    toggle,
    stop,
    setLayerVolume,
    setFrequency,
    setMusicMode,
    setNatureSound,
    applySettings,
  } = useSoundStudio();

  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  // Sleep timer
  const [timerRemainSec, setTimerRemainSec] = useState(0);
  const [timerTotalSec, setTimerTotalSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalMasterRef = useRef(0.8);
  const timerActive = timerTotalSec > 0;

  const sessionStartRef = useRef<number | null>(null);

  useEffect(() => {
    loadCustomPresets().then(setCustomPresets);
  }, []);

  const selectedFreq =
    STUDIO_FREQUENCIES.find((f) => f.hz === state.frequencyHz) ?? STUDIO_FREQUENCIES[4];

  // ── Session analytics on play/stop ────────────────────────────────────────
  const handleToggle = useCallback(() => {
    if (!state.isPlaying) {
      sessionStartRef.current = Date.now();
      trackSessionStarted({
        frequency_hz: state.frequencyHz,
        frequency_name: selectedFreq.name,
        session_type: "studio_mix",
        is_premium: false,
        source: "studio",
      });
    } else if (sessionStartRef.current) {
      trackSessionEnded({
        frequency_hz: state.frequencyHz,
        duration_seconds: Math.round((Date.now() - sessionStartRef.current) / 1000),
        had_journal_entry: false,
      });
      sessionStartRef.current = null;
    }
    toggle();
  }, [state.isPlaying, state.frequencyHz, selectedFreq.name, toggle]);

  // ── Sleep timer ───────────────────────────────────────────────────────────
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
    setLayerVolume("master", originalMasterRef.current);
  }, [clearTimer, setLayerVolume]);

  const startTimer = useCallback(
    (minutes: number) => {
      clearTimer();
      const totalSec = minutes * 60;
      originalMasterRef.current = state.masterVolume;
      setTimerTotalSec(totalSec);
      setTimerRemainSec(totalSec);
      if (!state.isPlaying) handleToggle();

      timerRef.current = setInterval(() => {
        setTimerRemainSec((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            clearTimer();
            setTimerTotalSec(0);
            // Stop playback and restore volume for the next session
            setTimeout(() => {
              stop();
              setLayerVolume("master", originalMasterRef.current);
            }, 300);
            return 0;
          }
          // Fade master volume across the final 25% of the timer
          const fadeStartSec = totalSec * 0.25;
          if (next <= fadeStartSec) {
            setLayerVolume("master", originalMasterRef.current * (next / fadeStartSec));
          }
          return next;
        });
      }, 1000);
    },
    [clearTimer, state.masterVolume, state.isPlaying, handleToggle, stop, setLayerVolume]
  );

  useEffect(() => clearTimer, [clearTimer]);

  // ── Presets ───────────────────────────────────────────────────────────────
  const applyBuiltinPreset = useCallback(
    (presetId: string) => {
      const preset = STUDIO_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      applySettings(preset.settings);
      setActivePreset(presetId);
    },
    [applySettings]
  );

  const applyCustomPreset = useCallback(
    (preset: CustomPreset) => {
      applySettings(preset.settings);
      setActivePreset(`custom_${preset.id}`);
    },
    [applySettings]
  );

  const saveCurrentMix = useCallback(async () => {
    const name = newPresetName.trim() || `My Mix ${customPresets.length + 1}`;
    const preset: CustomPreset = {
      id: `${Date.now()}`,
      name,
      createdAt: Date.now(),
      settings: {
        frequencyHz: state.frequencyHz,
        musicMode: state.musicMode,
        natureSound: state.natureSound,
        frequencyVolume: state.frequencyVolume,
        musicVolume: state.musicVolume,
        natureVolume: state.natureVolume,
        masterVolume: state.masterVolume,
      },
    };
    const updated = [...customPresets, preset];
    setCustomPresets(updated);
    await saveCustomPresets(updated);
    setSaveModalOpen(false);
    setNewPresetName("");
  }, [newPresetName, customPresets, state]);

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.kicker}>SOUND STUDIO</Text>
          <Text style={styles.title}>Frequency Mixer</Text>
          <Text style={styles.subtitle}>
            Blend healing tones with music and nature sounds
          </Text>
        </View>

        {/* Now playing card */}
        <View style={[styles.nowCard, { borderColor: selectedFreq.color + "30" }]}>
          <View style={styles.nowRow}>
            <View>
              <Text style={[styles.nowHz, { color: selectedFreq.color }]}>
                {state.frequencyHz}
                <Text style={[styles.nowHzUnit, { color: selectedFreq.color + "99" }]}>
                  {" "}
                  Hz
                </Text>
              </Text>
              <Text style={styles.nowMeta}>
                {selectedFreq.name}
                {state.musicMode !== "none" &&
                  ` · ${STUDIO_MUSIC_MODES.find((m) => m.id === state.musicMode)?.label}`}
                {state.natureSound !== "none" &&
                  ` · ${STUDIO_NATURE_SOUNDS.find((n) => n.id === state.natureSound)?.label}`}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.playBtn,
                { backgroundColor: state.isPlaying ? selectedFreq.color : "rgba(255,255,255,0.08)" },
              ]}
              onPress={handleToggle}
              activeOpacity={0.85}
            >
              <Text style={[styles.playBtnIcon, state.isPlaying && { color: colors.bgDeep }]}>
                {state.isPlaying ? "⏸" : "▶"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Presets */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>PRESETS</Text>
          <TouchableOpacity style={styles.saveMixBtn} onPress={() => setSaveModalOpen(true)}>
            <Text style={styles.saveMixBtnText}>＋ Save Mix</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetRow}
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
              contentContainerStyle={styles.presetRow}
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
            <Text style={styles.hint}>Long-press a mix to delete it.</Text>
          </>
        )}

        {/* Frequency selector */}
        <Text style={[styles.sectionLabel, styles.sectionGap]}>HEALING FREQUENCY</Text>
        <View style={styles.freqGrid}>
          {STUDIO_FREQUENCIES.map((freq) => {
            const active = state.frequencyHz === freq.hz;
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
                onPress={() => {
                  setFrequency(freq.hz);
                  setActivePreset(null);
                }}
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

        {/* Music mode selector */}
        <Text style={[styles.sectionLabel, styles.sectionGap]}>MUSIC LAYER</Text>
        <View style={styles.modeRow}>
          {STUDIO_MUSIC_MODES.map((mode) => {
            const active = state.musicMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                style={[styles.modeCell, active && styles.modeCellActive]}
                onPress={() => {
                  setMusicMode(mode.id);
                  setActivePreset(null);
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.modeIcon, active && { color: colors.teal }]}>
                  {mode.icon}
                </Text>
                <Text style={[styles.modeLabel, active && { color: colors.textPrimary }]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Nature sound selector */}
        <Text style={[styles.sectionLabel, styles.sectionGap]}>NATURE LAYER</Text>
        <View style={styles.modeRow}>
          {STUDIO_NATURE_SOUNDS.map((sound) => {
            const active = state.natureSound === sound.id;
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
                  setNatureSound(sound.id);
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
              { key: "frequency", label: "Frequency", value: state.frequencyVolume, color: selectedFreq.color },
              { key: "music", label: "Music", value: state.musicVolume, color: colors.teal },
              { key: "nature", label: "Nature", value: state.natureVolume, color: "#3B82F6" },
              { key: "master", label: "Master", value: state.masterVolume, color: colors.purple },
            ] as const
          ).map((layer) => (
            <View key={layer.key} style={styles.mixerRow}>
              <Text style={styles.mixerLabel}>{layer.label}</Text>
              <Slider
                style={styles.mixerSlider}
                minimumValue={0}
                maximumValue={1}
                value={layer.value}
                onValueChange={(v) => setLayerVolume(layer.key, v)}
                minimumTrackTintColor={layer.color}
                maximumTrackTintColor="rgba(255,255,255,0.1)"
                thumbTintColor={layer.color}
              />
              <Text style={styles.mixerPct}>{Math.round(layer.value * 100)}%</Text>
            </View>
          ))}
        </View>

        {/* Sleep timer */}
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
                style={styles.timerChip}
                onPress={() => startTimer(min)}
                activeOpacity={0.8}
              >
                <Text style={styles.timerChipMin}>{min}</Text>
                <Text style={styles.timerChipUnit}>min</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* How it works */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How the layers work</Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoStrong}>Frequency</Text> — a pure sine wave at the
            selected healing Hz, synthesized live on your device.{"\n"}
            <Text style={styles.infoStrong}>Music</Text> — procedural chords tuned to the
            same root using just-intonation ratios, so every note is harmonically aligned.
            {"\n"}
            <Text style={styles.infoStrong}>Nature</Text> — real recorded soundscapes,
            looped seamlessly beneath the mix.
          </Text>
        </View>
      </ScrollView>

      {/* Save mix modal */}
      <Modal visible={saveModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save Current Mix</Text>
            <Text style={styles.modalMeta}>
              {state.frequencyHz}Hz ·{" "}
              {STUDIO_MUSIC_MODES.find((m) => m.id === state.musicMode)?.label} ·{" "}
              {STUDIO_NATURE_SOUNDS.find((n) => n.id === state.natureSound)?.label}
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
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setSaveModalOpen(false);
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  scroll: { paddingBottom: spacing[16] },
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
  // Now playing
  nowCard: {
    marginHorizontal: spacing[5],
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing[5],
    marginBottom: spacing[5],
    ...shadows.md,
  },
  nowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nowHz: { fontSize: fontSizes["3xl"], fontWeight: "800" },
  nowHzUnit: { fontSize: fontSizes.md, fontWeight: "600" },
  nowMeta: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtnIcon: { fontSize: 22, color: colors.textPrimary },
  // Sections
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  sectionLabel: {
    paddingHorizontal: spacing[5],
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  sectionGap: { marginTop: spacing[6], marginBottom: spacing[3] },
  myMixesLabel: { marginTop: spacing[3], marginBottom: spacing[2] },
  saveMixBtn: {
    backgroundColor: colors.purpleDim,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.25)",
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  saveMixBtnText: { fontSize: fontSizes.xs, color: colors.purple, fontWeight: "600" },
  // Presets
  presetRow: { paddingHorizontal: spacing[5], gap: spacing[2] },
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
  hint: {
    paddingHorizontal: spacing[5],
    fontSize: 10,
    color: colors.textDim,
    marginTop: spacing[2],
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
  timerChip: {
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
  // Info
  infoCard: {
    marginHorizontal: spacing[5],
    marginTop: spacing[6],
    padding: spacing[4],
    borderRadius: radii.lg,
    backgroundColor: "rgba(0,212,170,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.1)",
  },
  infoTitle: {
    fontSize: fontSizes.xs,
    color: colors.teal,
    fontWeight: "700",
    marginBottom: spacing[2],
  },
  infoText: { fontSize: fontSizes.xs, color: colors.textMuted, lineHeight: 19 },
  infoStrong: { color: colors.textSecondary, fontWeight: "700" },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.25)",
    borderRadius: radii.xl,
    padding: spacing[5],
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalMeta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing[4],
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.3)",
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: colors.textPrimary,
    fontSize: fontSizes.sm,
    marginBottom: spacing[4],
  },
  modalBtnRow: { flexDirection: "row", gap: spacing[2] },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
  },
  modalCancelText: { color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: "600" },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    backgroundColor: colors.purple,
    alignItems: "center",
  },
  modalSaveText: { color: "#fff", fontSize: fontSizes.sm, fontWeight: "700" },
});
