/**
 * Individual Frequency Player Screen — /player/[id]
 * Full-screen player with animated rings, volume control, sleep timer,
 * and chakra affirmation overlay.
 */
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import Slider from "@react-native-community/slider";
import { colors, fontSizes, spacing, radii } from "@rih/ui-tokens";
import AudioVisualizer from "@/components/AudioVisualizer";
import VolumeSlider from "@/components/VolumeSlider";
import { FREQUENCIES } from "@rih/shared-utils";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAudioOutput } from "@/hooks/useAudioOutput";
import { useRecordedDownload } from "@/hooks/useRecordedDownload";
import { binauralRouteHint } from "@/lib/audioRoute";

const { width } = Dimensions.get("window");
const RING_BASE = width * 0.38;

const SLEEP_OPTIONS = [
  { label: "Off", minutes: 0 },
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "60m", minutes: 60 },
];

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isPremium } = usePremiumStatus();

  const frequency = FREQUENCIES.find((f) => f.id === id);

  // Redirect if frequency not found or locked
  useEffect(() => {
    if (!frequency) {
      router.back();
      return;
    }
    if (frequency.isPremium && !isPremium) {
      router.replace("/paywall");
    }
  }, [frequency, isPremium]);

  const {
    isPlaying,
    isLoading,
    volume,
    error,
    timbre,
    play,
    pause,
    setVolume,
    setSleepTimer,
    setTimbre,
  } = useAudioPlayer(frequency ?? null);
  const audioOutput = useAudioOutput();
  const download = useRecordedDownload(frequency ?? null);

  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [showAffirmation, setShowAffirmation] = useState(false);

  // Waveform bars (12 bars, each with independent Animated.Value)
  const waveAnims = useRef(
    Array.from({ length: 12 }, () => new Animated.Value(0.15))
  ).current;

  useEffect(() => {
    if (!isPlaying) {
      waveAnims.forEach((a) => a.setValue(0.15));
      return;
    }
    const animations = waveAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 60),
          Animated.timing(anim, {
            toValue: 0.2 + Math.random() * 0.8,
            duration: 300 + Math.random() * 400,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0.1 + Math.random() * 0.3,
            duration: 300 + Math.random() * 400,
            useNativeDriver: false,
          }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [isPlaying]);

  // Animated rings
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const ring3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isPlaying) {
      ring1.setValue(1);
      ring2.setValue(1);
      ring3.setValue(1);
      return;
    }
    const pulse = (anim: Animated.Value, delay: number, scale: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: scale,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      );
    const a1 = pulse(ring1, 0, 1.18);
    const a2 = pulse(ring2, 600, 1.28);
    const a3 = pulse(ring3, 1200, 1.38);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [isPlaying]);

  const handleSleepTimer = (minutes: number) => {
    setSleepMinutes(minutes);
    setSleepTimer(minutes);
  };

  if (!frequency) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated rings */}
        <View style={styles.ringContainer}>
          {[ring3, ring2, ring1].map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.ring,
                {
                  width: RING_BASE + i * 60,
                  height: RING_BASE + i * 60,
                  borderRadius: (RING_BASE + i * 60) / 2,
                  borderColor: frequency.color + (["12", "20", "35"][i]),
                  transform: [{ scale: anim }],
                },
              ]}
            />
          ))}
          {/* Center circle */}
          <View
            style={[
              styles.centerCircle,
              { backgroundColor: frequency.color + "20", borderColor: frequency.color + "50" },
            ]}
          >
            <Text style={[styles.hzLarge, { color: frequency.color }]}>
              {frequency.hz}
            </Text>
            <Text style={[styles.hzUnit, { color: frequency.color + "99" }]}>Hz</Text>
          </View>
        </View>

        {/* Frequency info */}
        <Text style={styles.freqName}>{frequency.name}</Text>
        <Text style={styles.freqBenefit}>{frequency.benefit}</Text>
        {frequency.chakraName && (
          <View
            style={[
              styles.chakraBadge,
              { backgroundColor: frequency.color + "18", borderColor: frequency.color + "30" },
            ]}
          >
            <Text style={[styles.chakraBadgeText, { color: frequency.color }]}>
              {frequency.chakraName}
            </Text>
          </View>
        )}
        {frequency.category === "binaural" && (
          <Text style={styles.headphoneHint}>
            {binauralRouteHint(audioOutput.kind)} True binaural beat —{" "}
            {frequency.hz}Hz offset.
          </Text>
        )}
        {frequency.category === "isochronic" && (
          <Text style={styles.headphoneHint}>
            Isochronic pulse — the tone gates on/off {frequency.hz} times per
            second. Works on any speaker, no headphones needed.
          </Text>
        )}
        {frequency.category === "recorded" && (
          <Text style={styles.headphoneHint}>
            {binauralRouteHint(audioOutput.kind)} Studio-mixed session with a
            7.83Hz Schumann binaural beat —{" "}
            {download.status === "downloaded"
              ? "saved for offline playback."
              : "streamed over the internet."}
          </Text>
        )}

        {/* TrueHz badge (live synthesis) / Studio Recording badge */}
        {frequency.category === "recorded" ? (
          <View style={styles.trueHzBadge}>
            <Text style={styles.trueHzBadgeText}>♪ Studio Recording · Sinta Positivo</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.trueHzBadge}
            onPress={() => router.push("/technology")}
            activeOpacity={0.7}
          >
            <Text style={styles.trueHzBadgeText}>
              ✓ TrueHz™ Precision Tuning · 0.01 Hz resolution
            </Text>
          </TouchableOpacity>
        )}

        {/* Play / Pause */}
        <TouchableOpacity
          style={[
            styles.playBtn,
            { backgroundColor: frequency.color },
            isLoading && styles.playBtnLoading,
          ]}
          onPress={() => (isPlaying ? pause() : play(3000))}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          <Text style={styles.playBtnIcon}>
            {isLoading ? "⏳" : isPlaying ? "⏸" : "▶"}
          </Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Offline download (recorded sessions · premium perk) */}
        {frequency.category === "recorded" && (
          <View style={styles.downloadRow}>
            {download.status === "downloaded" ? (
              <>
                <View style={[styles.downloadBtn, styles.downloadBtnDone]}>
                  <Text style={styles.downloadDoneText}>✓ Downloaded</Text>
                </View>
                <TouchableOpacity
                  onPress={download.remove}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.downloadRemoveText}>Remove</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() =>
                  isPremium ? download.download() : router.push("/paywall")
                }
                disabled={download.status === "downloading"}
                activeOpacity={0.75}
              >
                <Text style={styles.downloadBtnText}>
                  {download.status === "downloading"
                    ? "⏳ Downloading…"
                    : isPremium
                      ? "⬇ Download for offline"
                      : "⬇ Download for offline · 🔒 Premium"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {download.error && <Text style={styles.errorText}>{download.error}</Text>}

        {/* Tone character — synthesized tones only (recorded sessions are pre-mixed) */}
        {frequency.category !== "recorded" && (
          <View style={styles.toneRow}>
            {(
              [
                { id: "pure", label: "Tuning Fork" },
                { id: "bowl", label: "Singing Bowl" },
              ] as const
            ).map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.toneChip,
                  timbre === t.id && {
                    backgroundColor: frequency.color + "25",
                    borderColor: frequency.color + "60",
                  },
                ]}
                onPress={() => setTimbre(t.id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.toneChipText,
                    timbre === t.id && { color: frequency.color },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Waveform visualizer */}
        <View style={styles.waveRow}>
          {waveAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.waveBar,
                {
                  backgroundColor: frequency.color,
                  height: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 36],
                  }),
                  opacity: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.9],
                  }),
                },
              ]}
            />
          ))}
        </View>

        {/* Real-time Audio Visualizer */}
        <AudioVisualizer
          isPlaying={isPlaying}
          width={width - spacing[4] * 2}
          height={80}
          color={frequency.color}
        />

        {/* Volume Control */}
        <VolumeSlider
          value={volume}
          onValueChange={setVolume}
          color={frequency.color}
          label="Volume"
          showLevel
        />

        {/* Sleep timer */}
        <View style={styles.sleepSection}>
          <Text style={styles.sleepLabel}>Sleep Timer</Text>
          <View style={styles.sleepRow}>
            {SLEEP_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[
                  styles.sleepChip,
                  sleepMinutes === opt.minutes && {
                    backgroundColor: frequency.color + "25",
                    borderColor: frequency.color + "60",
                  },
                ]}
                onPress={() => handleSleepTimer(opt.minutes)}
              >
                <Text
                  style={[
                    styles.sleepChipText,
                    sleepMinutes === opt.minutes && { color: frequency.color },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Affirmation */}
        {frequency.affirmation && (
          <TouchableOpacity
            style={styles.affirmationCard}
            onPress={() => setShowAffirmation((v) => !v)}
            activeOpacity={0.8}
          >
            {showAffirmation ? (
              <Text style={styles.affirmationText}>
                "{frequency.affirmation}"
              </Text>
            ) : (
              <Text style={styles.affirmationHint}>
                Tap to reveal your affirmation ✨
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Pronunciation */}
        {frequency.pronunciation && (
          <Text style={styles.pronunciation}>{frequency.pronunciation}</Text>
        )}
      </ScrollView>
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
  scroll: {
    alignItems: "center",
    paddingBottom: spacing[12],
  },
  // Rings
  ringContainer: {
    width: width,
    height: width * 0.9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  ring: {
    position: "absolute",
    borderWidth: 1,
  },
  centerCircle: {
    width: RING_BASE,
    height: RING_BASE,
    borderRadius: RING_BASE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  hzLarge: {
    fontSize: fontSizes["4xl"],
    fontWeight: "800",
    lineHeight: 52,
  },
  hzUnit: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    letterSpacing: 2,
  },
  // Info
  freqName: {
    fontSize: fontSizes["2xl"],
    color: colors.textPrimary,
    fontWeight: "700",
    marginBottom: spacing[2],
    textAlign: "center",
  },
  freqBenefit: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacing[8],
    marginBottom: spacing[3],
  },
  chakraBadge: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    borderWidth: 1,
    marginBottom: spacing[6],
  },
  chakraBadgeText: { fontSize: fontSizes.sm, fontWeight: "600" },
  headphoneHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing[8],
    marginTop: -spacing[4],
    marginBottom: spacing[5],
  },
  trueHzBadge: {
    backgroundColor: "rgba(0,212,170,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.22)",
    borderRadius: radii.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    marginTop: -spacing[2],
    marginBottom: spacing[5],
  },
  trueHzBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: "600",
    color: colors.teal,
  },
  // Play button
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[6],
  },
  playBtnLoading: { opacity: 0.6 },
  errorText: {
    fontSize: fontSizes.xs,
    color: "#EF4444",
    textAlign: "center",
    paddingHorizontal: spacing[8],
    marginTop: -spacing[4],
    marginBottom: spacing[4],
  },
  downloadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginTop: -spacing[3],
    marginBottom: spacing[5],
  },
  downloadBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  downloadBtnDone: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderColor: "rgba(34,197,94,0.30)",
  },
  downloadBtnText: {
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  downloadDoneText: {
    fontSize: fontSizes.xs,
    color: "#22C55E",
    fontWeight: "600",
  },
  downloadRemoveText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textDecorationLine: "underline",
  },
  playBtnIcon: { fontSize: 32 },
  // Tone character
  toneRow: {
    flexDirection: "row",
    gap: spacing[2],
    marginTop: -spacing[2],
    marginBottom: spacing[5],
  },
  toneChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  toneChipText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: "600",
  },
  // Volume
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    width: "100%",
    marginBottom: spacing[5],
  },
  slider: { flex: 1, marginHorizontal: spacing[2] },
  sliderIcon: { fontSize: fontSizes.base },
  // Sleep timer
  sleepSection: {
    width: "100%",
    paddingHorizontal: spacing[5],
    marginBottom: spacing[5],
  },
  sleepLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing[2],
  },
  sleepRow: { flexDirection: "row", gap: spacing[2] },
  sleepChip: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sleepChipText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: "600",
  },
  // Affirmation
  affirmationCard: {
    marginHorizontal: spacing[5],
    padding: spacing[5],
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.lg,
    alignItems: "center",
    marginBottom: spacing[4],
    width: "90%",
  },
  affirmationText: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 24,
  },
  affirmationHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  pronunciation: {
    fontSize: fontSizes.xs,
    color: colors.textDim,
    textAlign: "center",
    marginTop: spacing[2],
    paddingHorizontal: spacing[8],
  },
  // Waveform visualizer
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 40,
    marginBottom: spacing[5],
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
});
