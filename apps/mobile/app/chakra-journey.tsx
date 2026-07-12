/**
 * 7-Chakra Journey — guided sequence from Root (396Hz) to Crown (963Hz).
 * Each chakra plays for a configurable duration with smooth crossfades,
 * showing the chakra's name, Sanskrit pronunciation, and affirmation.
 */
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";
import { CHAKRA_FREQUENCIES } from "@rih/shared-utils";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useChakraJourney } from "@/hooks/useChakraJourney";
import {
  trackSessionStarted,
  trackChakraSequenceCompleted,
  trackPaywallViewed,
} from "@/hooks/useAnalytics";
import SessionJournal from "@/components/SessionJournal";

const DURATION_OPTIONS = [
  { label: "1 min", perChakraSec: 60, total: "7 min" },
  { label: "2 min", perChakraSec: 120, total: "14 min" },
  { label: "3 min", perChakraSec: 180, total: "21 min" },
];

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString();
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ChakraJourneyScreen() {
  const router = useRouter();
  const { isPremium } = usePremiumStatus();

  const [perChakraSec, setPerChakraSec] = useState(180);
  const [started, setStarted] = useState(false);
  const [showJournal, setShowJournal] = useState(false);

  const { isRunning, currentIndex, elapsedInStep, isComplete, start, pause, resume, stop } =
    useChakraJourney(perChakraSec);

  const chakra = CHAKRA_FREQUENCIES[currentIndex];
  const remainingInStep = Math.max(0, perChakraSec - elapsedInStep);

  // Breathing pulse while running
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isRunning) {
      pulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 3500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 3500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isRunning, pulse]);

  // Completion: analytics + journal + paywall for free users
  useEffect(() => {
    if (isComplete) {
      trackChakraSequenceCompleted({
        total_duration_minutes: Math.round((perChakraSec * CHAKRA_FREQUENCIES.length) / 60),
        duration_per_chakra_minutes: Math.round(perChakraSec / 60),
      });
      setShowJournal(true);
    }
  }, [isComplete, perChakraSec]);

  const handleBegin = () => {
    setStarted(true);
    trackSessionStarted({
      frequency_hz: CHAKRA_FREQUENCIES[0].hz,
      frequency_name: "7-Chakra Journey",
      session_type: "chakra_sequence",
      is_premium: false,
      source: "chakra_sequence",
    });
    start();
  };

  const handleEnd = () => {
    stop();
    router.back();
  };

  const handleJournalClosed = () => {
    setShowJournal(false);
    if (!isPremium) {
      trackPaywallViewed({
        trigger: "sequence_end",
        placement: "sequence_completion",
      });
      router.replace("/paywall");
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={handleEnd}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Text style={styles.backBtnText}>← {started ? "End journey" : "Back"}</Text>
      </TouchableOpacity>

      {!started ? (
        /* ── Setup ── */
        <View style={styles.setup}>
          <Text style={styles.setupEmoji}>🌀</Text>
          <Text style={styles.title}>7-Chakra Journey</Text>
          <Text style={styles.subtitle}>
            A guided sequence through all seven energy centers — Root to Crown —
            each paired with its Solfeggio frequency.
          </Text>

          {/* Chakra preview dots */}
          <View style={styles.previewRow}>
            {CHAKRA_FREQUENCIES.map((c) => (
              <View key={c.id} style={styles.previewCol}>
                <View style={[styles.previewDot, { backgroundColor: c.color }]} />
                <Text style={[styles.previewHz, { color: c.color }]}>{c.hz}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.pickerLabel}>TIME PER CHAKRA</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((opt) => {
              const active = perChakraSec === opt.perChakraSec;
              return (
                <TouchableOpacity
                  key={opt.perChakraSec}
                  style={[styles.durationChip, active && styles.durationChipActive]}
                  onPress={() => setPerChakraSec(opt.perChakraSec)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.durationLabel, active && { color: colors.teal }]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.durationTotal}>{opt.total} total</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.beginBtn} onPress={handleBegin} activeOpacity={0.85}>
            <Text style={styles.beginBtnText}>▶ Begin Journey</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Journey ── */
        <View style={styles.journey}>
          {/* Chakra circle */}
          <Animated.View
            style={[
              styles.chakraCircle,
              {
                backgroundColor: chakra.color + "1C",
                borderColor: chakra.color + "55",
                transform: [{ scale: pulse }],
              },
            ]}
          >
            <Text style={[styles.chakraHz, { color: chakra.color }]}>{chakra.hz}</Text>
            <Text style={[styles.chakraHzUnit, { color: chakra.color + "99" }]}>Hz</Text>
          </Animated.View>

          <Text style={styles.chakraName}>{chakra.chakraName}</Text>
          {chakra.pronunciation && (
            <Text style={styles.pronunciation}>{chakra.pronunciation}</Text>
          )}
          {chakra.affirmation && (
            <Text style={styles.affirmation}>"{chakra.affirmation}"</Text>
          )}

          {/* Step timer */}
          <Text style={[styles.stepTimer, { color: chakra.color }]}>
            {isComplete ? "Complete 🌿" : formatTime(remainingInStep)}
          </Text>

          {/* Progress dots */}
          <View style={styles.dotRow}>
            {CHAKRA_FREQUENCIES.map((c, i) => {
              const done = i < currentIndex || isComplete;
              const active = i === currentIndex && !isComplete;
              return (
                <View
                  key={c.id}
                  style={[
                    styles.dot,
                    done && { backgroundColor: c.color },
                    active && {
                      backgroundColor: c.color,
                      width: 22,
                      shadowColor: c.color,
                      shadowOpacity: 0.6,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 0 },
                    },
                  ]}
                />
              );
            })}
          </View>
          <Text style={styles.stepLabel}>
            {isComplete
              ? "All seven centers aligned"
              : `Chakra ${currentIndex + 1} of ${CHAKRA_FREQUENCIES.length}`}
          </Text>

          {/* Controls */}
          {!isComplete && (
            <TouchableOpacity
              style={[styles.pauseBtn, { backgroundColor: chakra.color }]}
              onPress={isRunning ? pause : resume}
              activeOpacity={0.85}
            >
              <Text style={styles.pauseBtnIcon}>{isRunning ? "⏸" : "▶"}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Post-journey journal */}
      <SessionJournal
        visible={showJournal}
        frequencyHz={0}
        frequencyName="7-Chakra Journey"
        durationMinutes={Math.round((perChakraSec * CHAKRA_FREQUENCIES.length) / 60)}
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
  // Setup
  setup: { flex: 1, alignItems: "center", paddingHorizontal: spacing[6], paddingTop: spacing[6] },
  setupEmoji: { fontSize: 56, marginBottom: spacing[4] },
  title: {
    fontSize: fontSizes["2xl"],
    color: colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    marginTop: spacing[2],
    marginBottom: spacing[5],
  },
  previewRow: { flexDirection: "row", gap: spacing[3], marginBottom: spacing[6] },
  previewCol: { alignItems: "center", gap: 4 },
  previewDot: { width: 12, height: 12, borderRadius: 6 },
  previewHz: { fontSize: 9, fontWeight: "700" },
  pickerLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: spacing[3],
  },
  durationRow: { flexDirection: "row", gap: spacing[2], marginBottom: spacing[8] },
  durationChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
  },
  durationChipActive: {
    backgroundColor: colors.tealDim,
    borderColor: colors.tealBorder,
  },
  durationLabel: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  durationTotal: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  beginBtn: {
    width: "100%",
    backgroundColor: colors.teal,
    borderRadius: radii.full,
    paddingVertical: spacing[4],
    alignItems: "center",
    ...shadows.teal,
  },
  beginBtnText: {
    color: colors.bgDeep,
    fontSize: fontSizes.base,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  // Journey
  journey: { flex: 1, alignItems: "center", paddingTop: spacing[6] },
  chakraCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[5],
  },
  chakraHz: { fontSize: fontSizes["4xl"], fontWeight: "800", lineHeight: 52 },
  chakraHzUnit: { fontSize: fontSizes.sm, fontWeight: "600", letterSpacing: 2 },
  chakraName: {
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  pronunciation: { fontSize: fontSizes.xs, color: colors.textDim, marginTop: 2 },
  affirmation: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: spacing[8],
    lineHeight: 21,
    marginTop: spacing[3],
  },
  stepTimer: { fontSize: fontSizes["2xl"], fontWeight: "800", marginTop: spacing[5] },
  dotRow: { flexDirection: "row", gap: spacing[2], marginTop: spacing[4] },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  stepLabel: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: spacing[2] },
  pauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing[6],
    ...shadows.md,
  },
  pauseBtnIcon: { fontSize: 24 },
});
