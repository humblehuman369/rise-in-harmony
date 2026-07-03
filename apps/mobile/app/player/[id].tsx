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
import { FREQUENCIES } from "@rih/shared-utils";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAuthStore } from "@/store/authStore";
import { isPremiumUser } from "@rih/shared-utils";

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
  const { user } = useAuthStore();
  const isPremium = isPremiumUser(user?.subscriptionTier ?? "free");

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

  const { isPlaying, isLoading, volume, play, pause, setVolume, setSleepTimer } =
    useAudioPlayer(frequency ?? null);

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
            🎧 Headphones required — true binaural beat ({frequency.hz}Hz offset)
          </Text>
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

        {/* Volume slider */}
        <View style={styles.sliderRow}>
          <Text style={styles.sliderIcon}>🔈</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            onValueChange={setVolume}
            minimumTrackTintColor={frequency.color}
            maximumTrackTintColor="rgba(255,255,255,0.1)"
            thumbTintColor={frequency.color}
          />
          <Text style={styles.sliderIcon}>🔊</Text>
        </View>

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
  playBtnIcon: { fontSize: 32 },
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
