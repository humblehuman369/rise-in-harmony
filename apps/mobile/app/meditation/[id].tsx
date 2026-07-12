/**
 * Meditation Session Player — /meditation/[id]
 * Layered ambience (nature loop + optional healing frequency) with
 * auto-advancing guidance steps, progress ring, and volume mixing.
 */
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import Slider from "@react-native-community/slider";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";
import AudioVisualizer from "@/components/AudioVisualizer";
import { MEDITATIONS, FREQUENCIES } from "@rih/shared-utils";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useMeditationPlayer, type MeditationMode } from "@/hooks/useMeditationPlayer";
import { trackSessionStarted, trackSessionEnded } from "@/hooks/useAnalytics";

import SessionJournal from "@/components/SessionJournal";
import { MEDITATION_EMOJI } from "../(tabs)/meditation";

const SCREEN_WIDTH = Dimensions.get("window").width;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString();
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const SOUNDSCAPE_LABEL: Record<string, string> = {
  rain: "Rain",
  ocean: "Ocean waves",
  forest: "Forest",
  wind: "Wind",
  fire: "Crackling fire",
  river: "Gentle river",
  night: "Night crickets",
  cave: "Cave water",
  bowl: "Singing bowl",
  silence: "Silence",
};

export default function MeditationSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isPremium } = usePremiumStatus();

  const meditation = MEDITATIONS.find((m) => m.id === id) ?? null;
  const [mode, setMode] = useState<MeditationMode>("frequency");
  const [journalMinutes, setJournalMinutes] = useState<number | null>(null);
  const closeAfterJournalRef = useRef(false);

  // The healing frequency paired with this meditation. Reported in analytics
  // and the journal only when the frequency layer is active ("frequency"
  // mode) — matching the web app's behavior.
  const recommendedFreq = meditation
    ? FREQUENCIES.find((f) => f.id === meditation.recommendedFrequencyId) ?? null
    : null;
  const activeFrequencyHz = mode === "frequency" ? recommendedFreq?.hz ?? 0 : 0;

  const {
    isPlaying,
    elapsedSec,
    stepIndex,
    isComplete,
    totalSec,
    natureVolume,
    frequencyVolume,
    play,
    pause,
    stop,
    setNatureVolume,
    setFrequencyVolume,
  } = useMeditationPlayer(meditation, mode);

  const sessionStartedRef = useRef(false);

  // Gate: missing or locked meditations bounce out
  useEffect(() => {
    if (!meditation) {
      router.back();
      return;
    }
    if (meditation.isPremium && !isPremium) {
      router.replace("/paywall");
    }
  }, [meditation, isPremium, router]);

  // Breathing pulse animation while playing
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isPlaying) {
      pulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 4000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 4000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isPlaying, pulse]);

  // Session end on completion: analytics + mood check-in
  useEffect(() => {
    if (isComplete && meditation && sessionStartedRef.current) {
      trackSessionEnded({
        frequency_hz: activeFrequencyHz,
        duration_seconds: totalSec,
        had_journal_entry: true,
      });
      sessionStartedRef.current = false;
      setJournalMinutes(meditation.durationMinutes);
    }
  }, [isComplete, meditation, totalSec, activeFrequencyHz]);

  if (!meditation) return null;

  const emoji = MEDITATION_EMOJI[meditation.icon] ?? "✨";
  const progress = totalSec > 0 ? elapsedSec / totalSec : 0;
  const showFrequencyLayer = mode === "frequency";

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      if (!sessionStartedRef.current) {
        trackSessionStarted({
          frequency_hz: activeFrequencyHz,
          frequency_name: meditation.title,
          session_type: "single",
          is_premium: meditation.isPremium,
          source: "player",
        });
        sessionStartedRef.current = true;
      }
      play();
    }
  };

  const handleEnd = () => {
    const promptJournal = elapsedSec > 30;
    if (sessionStartedRef.current) {
      trackSessionEnded({
        frequency_hz: activeFrequencyHz,
        duration_seconds: elapsedSec,
        had_journal_entry: promptJournal,
      });
      sessionStartedRef.current = false;
    }
    stop();
    if (promptJournal) {
      closeAfterJournalRef.current = true;
      setJournalMinutes(Math.max(1, Math.round(elapsedSec / 60)));
    } else {
      router.back();
    }
  };

  const handleJournalClosed = () => {
    setJournalMinutes(null);
    if (closeAfterJournalRef.current) {
      closeAfterJournalRef.current = false;
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Back */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={handleEnd}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Text style={styles.backBtnText}>← End session</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View
          style={[
            styles.hero,
            {
              backgroundColor: meditation.color + "18",
              borderColor: meditation.color + "40",
              transform: [{ scale: pulse }],
            },
          ]}
        >
          <Text style={styles.heroEmoji}>{emoji}</Text>
        </Animated.View>

        <Text style={styles.title}>{meditation.title}</Text>
        <Text style={styles.subtitle}>{meditation.subtitle}</Text>

        {/* Time + progress */}
        <Text style={[styles.timer, { color: meditation.color }]}>
          {formatTime(elapsedSec)}{" "}
          <Text style={styles.timerTotal}>/ {formatTime(totalSec)}</Text>
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(progress * 100, 100)}%`,
                backgroundColor: meditation.color,
              },
            ]}
          />
        </View>

        {/* Play / pause */}
        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: meditation.color }]}
          onPress={handlePlayPause}
          activeOpacity={0.85}
        >
          <Text style={styles.playBtnIcon}>
            {isComplete ? "↻" : isPlaying ? "⏸" : "▶"}
          </Text>
        </TouchableOpacity>

        {isComplete && (
          <Text style={styles.completeText}>
            Session complete — well done. 🌿
          </Text>
        )}

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          {(
            [
              { id: "sound", label: "Sound Only" },
              { id: "frequency", label: `+ ${meditation.recommendedFrequencyLabel}` },
            ] as { id: MeditationMode; label: string }[]
          ).map((opt) => {
            const active = mode === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.modeChip,
                  active && {
                    backgroundColor: meditation.color + "22",
                    borderColor: meditation.color + "60",
                  },
                ]}
                onPress={() => setMode(opt.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    active && { color: meditation.color },
                  ]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Current guidance step */}
        <View
          style={[styles.guidanceCard, { borderColor: meditation.color + "30" }]}
        >
          <Text style={styles.guidanceLabel}>
            STEP {stepIndex + 1} OF {meditation.guidance.length}
          </Text>
          <Text style={styles.guidanceText}>
            {meditation.guidance[stepIndex]}
          </Text>
        </View>

        {/* Real-time Audio Visualizer */}
        <AudioVisualizer
          isPlaying={isPlaying}
          width={SCREEN_WIDTH - spacing[4] * 2}
          height={80}
          color={meditation.color}
        />

        {/* Volume mixing */}
        <View style={styles.mixCard}>
          <Text style={styles.mixTitle}>
            Soundscape · {SOUNDSCAPE_LABEL[meditation.soundscape] ?? meditation.soundscape}
          </Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Nature</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={natureVolume}
              onValueChange={setNatureVolume}
              minimumTrackTintColor={meditation.color}
              maximumTrackTintColor="rgba(255,255,255,0.1)"
              thumbTintColor={meditation.color}
            />
          </View>
          {showFrequencyLayer && (
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>Frequency</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={frequencyVolume}
                onValueChange={setFrequencyVolume}
                minimumTrackTintColor={colors.teal}
                maximumTrackTintColor="rgba(255,255,255,0.1)"
                thumbTintColor={colors.teal}
              />
            </View>
          )}
        </View>

        {/* Why this frequency */}
        {showFrequencyLayer && (
          <View style={styles.rationaleCard}>
            <Text style={styles.rationaleTitle}>Why this pairing</Text>
            <Text style={styles.rationaleText}>
              {meditation.frequencyRationale}
            </Text>
          </View>
        )}

        {/* Affirmation */}
        <Text style={styles.affirmation}>"{meditation.affirmation}"</Text>
      </ScrollView>

      {/* Post-session mood check-in */}
      <SessionJournal
        visible={journalMinutes !== null}
        frequencyHz={activeFrequencyHz}
        frequencyName={meditation.title}
        durationMinutes={journalMinutes ?? 0}
        onClose={handleJournalClosed}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  backBtn: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  backBtnText: { color: colors.textMuted, fontSize: fontSizes.base },
  scroll: { alignItems: "center", paddingBottom: spacing[12] },
  hero: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  heroEmoji: { fontSize: 48 },
  title: {
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: spacing[6],
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing[4],
  },
  timer: { fontSize: fontSizes["2xl"], fontWeight: "800" },
  timerTotal: { fontSize: fontSizes.sm, color: colors.textMuted, fontWeight: "500" },
  progressTrack: {
    width: "80%",
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginTop: spacing[2],
    marginBottom: spacing[5],
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
    ...shadows.md,
  },
  playBtnIcon: { fontSize: 28 },
  completeText: {
    fontSize: fontSizes.sm,
    color: colors.teal,
    marginBottom: spacing[3],
  },
  // Mode toggle
  modeRow: {
    flexDirection: "row",
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    marginBottom: spacing[4],
  },
  modeChip: {
    flexShrink: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
  },
  modeChipText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: "600",
  },
  // Guidance
  guidanceCard: {
    width: "90%",
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing[5],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  guidanceLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: spacing[2],
  },
  guidanceText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  // Mixer
  mixCard: {
    width: "90%",
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  mixTitle: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing[2],
  },
  sliderRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  sliderLabel: {
    width: 76,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  slider: { flex: 1 },
  // Rationale
  rationaleCard: {
    width: "90%",
    backgroundColor: "rgba(0,212,170,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.15)",
    borderRadius: radii.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  rationaleTitle: {
    fontSize: fontSizes.xs,
    color: colors.teal,
    fontWeight: "700",
    marginBottom: spacing[1],
  },
  rationaleText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  affirmation: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: spacing[8],
    lineHeight: 24,
  },
});
