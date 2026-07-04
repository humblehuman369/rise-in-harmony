/**
 * Precision Player Screen — /precision
 * Custom frequency generator: any Hz from 1–22,000 at 0.01 resolution,
 * four waveforms, and pure / true-binaural / isochronic modes.
 * Favorites persist locally (AsyncStorage).
 */
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";
import { isPremiumUser } from "@rih/shared-utils";
import { usePrecisionPlayer, type PlayMode } from "@/hooks/usePrecisionPlayer";
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
import SessionJournal from "@/components/SessionJournal";

const FAVORITES_KEY = "rih_precision_favorites";
const JOURNAL_MIN_SEC = 30;

interface Favorite {
  id: string;
  name: string;
  hz: number;
  waveform: Waveform;
  mode: PlayMode;
  beatHz: number;
}

const WAVEFORMS: Array<{ id: Waveform; label: string; symbol: string }> = [
  { id: "sine", label: "Sine", symbol: "∿" },
  { id: "square", label: "Square", symbol: "⊓" },
  { id: "triangle", label: "Triangle", symbol: "△" },
  { id: "sawtooth", label: "Saw", symbol: "◿" },
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

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function PrecisionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPremium = isPremiumUser(user?.subscriptionTier ?? "free");

  const { isPlaying, playTime, volume, play, stop, retune, setVolume } =
    usePrecisionPlayer();
  const audioOutput = useAudioOutput();

  const [hz, setHz] = useState(432);
  const [hzText, setHzText] = useState("432");
  const [waveform, setWaveform] = useState<Waveform>("sine");
  const [mode, setMode] = useState<PlayMode>("pure");
  const [beatHz, setBeatHz] = useState(10);

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [favName, setFavName] = useState("");
  const [journalOpen, setJournalOpen] = useState(false);
  const lastPlayTimeRef = useRef(0);

  useEffect(() => {
    loadFavorites().then(setFavorites);
  }, []);

  const currentConfig = useCallback(
    () => ({ hz, waveform, mode, beatHz }),
    [hz, waveform, mode, beatHz]
  );

  const applyHz = useCallback(
    (value: number) => {
      const clamped = clampHz(value);
      setHz(clamped);
      setHzText(String(clamped));
      if (isPlaying) retune(clamped);
    },
    [isPlaying, retune]
  );

  const handleHzSubmit = useCallback(() => {
    const parsed = parseFloat(hzText.replace(",", "."));
    applyHz(Number.isFinite(parsed) ? parsed : hz);
  }, [hzText, hz, applyHz]);

  // Waveform / mode / beat changes need a rebuilt audio graph
  const restartWith = useCallback(
    (partial: Partial<{ waveform: Waveform; mode: PlayMode; beatHz: number }>) => {
      const next = { ...currentConfig(), ...partial };
      if (partial.waveform !== undefined) setWaveform(partial.waveform);
      if (partial.mode !== undefined) setMode(partial.mode);
      if (partial.beatHz !== undefined) setBeatHz(partial.beatHz);
      if (isPlaying) play(next);
    },
    [currentConfig, isPlaying, play]
  );

  const handlePlayStop = useCallback(() => {
    if (isPlaying) {
      lastPlayTimeRef.current = playTime;
      stop();
      trackSessionEnded({
        frequency_hz: hz,
        duration_seconds: playTime,
        had_journal_entry: false,
      });
      if (playTime >= JOURNAL_MIN_SEC) setJournalOpen(true);
    } else {
      play(currentConfig());
      trackSessionStarted({
        frequency_hz: hz,
        frequency_name: `Precision ${hz}Hz${mode !== "pure" ? ` (${mode} ${beatHz}Hz)` : ""}`,
        session_type: "single",
        is_premium: isPremium,
        source: "precision",
      });
    }
  }, [isPlaying, playTime, hz, mode, beatHz, isPremium, play, stop, currentConfig]);

  const applyPreset = useCallback(
    (p: (typeof QUICK_PRESETS)[number]) => {
      setHz(p.hz);
      setHzText(String(p.hz));
      setMode(p.mode);
      if (p.beatHz !== undefined) setBeatHz(p.beatHz);
      setWaveform("sine");
      if (isPlaying) {
        play({ hz: p.hz, waveform: "sine", mode: p.mode, beatHz: p.beatHz ?? beatHz });
      }
    },
    [isPlaying, play, beatHz]
  );

  const saveFavorite = useCallback(async () => {
    const name = favName.trim() || `${hz} Hz`;
    const fav: Favorite = {
      id: `fav_${Date.now()}`,
      name,
      hz,
      waveform,
      mode,
      beatHz,
    };
    const updated = [fav, ...favorites].slice(0, 30);
    setFavorites(updated);
    await persistFavorites(updated);
    setFavName("");
    setSaveModalOpen(false);
  }, [favName, hz, waveform, mode, beatHz, favorites]);

  const loadFavorite = useCallback(
    (fav: Favorite) => {
      setHz(fav.hz);
      setHzText(String(fav.hz));
      setWaveform(fav.waveform);
      setMode(fav.mode);
      setBeatHz(fav.beatHz);
      if (isPlaying) {
        play({ hz: fav.hz, waveform: fav.waveform, mode: fav.mode, beatHz: fav.beatHz });
      }
    },
    [isPlaying, play]
  );

  const deleteFavorite = useCallback(
    async (id: string) => {
      const updated = favorites.filter((f) => f.id !== id);
      setFavorites(updated);
      await persistFavorites(updated);
    },
    [favorites]
  );

  const showBeat = mode !== "pure";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Precision Player</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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

        {/* Mode */}
        <Text style={styles.sectionLabel}>MODE</Text>
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
            Tone pulses on/off at {beatHz} Hz — works on speakers
          </Text>
        )}

        {/* Beat rate */}
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

        {/* Play / Stop */}
        <View style={styles.playSection}>
          <TouchableOpacity
            style={[styles.playBtn, isPlaying && styles.stopBtn]}
            onPress={handlePlayStop}
            activeOpacity={0.85}
          >
            <Text style={styles.playBtnIcon}>{isPlaying ? "⏹" : "▶"}</Text>
          </TouchableOpacity>
          {isPlaying && (
            <Text style={styles.playTime}>{formatTime(playTime)}</Text>
          )}
        </View>

        {/* Volume */}
        <View style={styles.volumeRow}>
          <Text style={styles.volIcon}>🔈</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            onValueChange={setVolume}
            minimumTrackTintColor={colors.teal}
            maximumTrackTintColor="rgba(255,255,255,0.1)"
            thumbTintColor={colors.teal}
          />
          <Text style={styles.volIcon}>🔊</Text>
        </View>
        <Text style={styles.outputLabel}>
          ♪ Playing via {outputLabel(audioOutput.kind, audioOutput.name ?? undefined)}
        </Text>

        {/* Quick presets */}
        <Text style={styles.sectionLabel}>QUICK PRESETS</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetRow}
        >
          {QUICK_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.label}
              style={[styles.presetChip, { borderColor: p.color + "50" }]}
              onPress={() => applyPreset(p)}
              activeOpacity={0.8}
            >
              <Text style={[styles.presetText, { color: p.color }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Favorites */}
        <View style={styles.favHeader}>
          <Text style={styles.sectionLabel}>FAVORITES</Text>
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
                style={styles.modalCancel}
                onPress={() => setSaveModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveFavorite}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  backText: { color: colors.textMuted, fontSize: fontSizes.base },
  topTitle: {
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  scroll: { paddingHorizontal: spacing[5], paddingBottom: spacing[12] },
  // Hz card
  hzCard: {
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
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: spacing[2],
  },
  chipRow: {
    flexDirection: "row",
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
    fontSize: fontSizes.xs,
    color: colors.textDim,
    textAlign: "center",
    marginTop: -spacing[2],
    marginBottom: spacing[4],
  },
  // Beat card
  beatCard: {
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
    marginBottom: spacing[5],
  },
  volIcon: { fontSize: fontSizes.base },
  slider: { flex: 1, marginHorizontal: spacing[2] },
  outputLabel: {
    fontSize: fontSizes.xs,
    color: colors.textDim,
    textAlign: "center",
    marginTop: -spacing[3],
    marginBottom: spacing[5],
  },
  // Presets
  presetRow: { gap: spacing[2], paddingBottom: spacing[5] },
  presetChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
  },
  presetText: { fontSize: fontSizes.sm, fontWeight: "600" },
  // Favorites
  favHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  favSave: { fontSize: fontSizes.sm, color: colors.teal, fontWeight: "600" },
  favEmpty: {
    fontSize: fontSizes.sm,
    color: colors.textDim,
    marginTop: spacing[2],
  },
  favRow: {
    flexDirection: "row",
    alignItems: "center",
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
  modalCancel: {
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
