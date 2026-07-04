/**
 * BreathingGuide — animated breathing overlay (4-7-8, Box, Calm patterns).
 * Ported from the web app: a breathing circle scales with each phase,
 * with a per-second countdown, phase dots, and cycle counter.
 */
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { colors, fontSizes, spacing, radii } from "@rih/ui-tokens";

interface BreathPhase {
  label: string;
  seconds: number;
  color: string;
  scale: number;
}

interface BreathPattern {
  id: string;
  name: string;
  description: string;
  benefit: string;
  color: string;
  phases: BreathPhase[];
}

export const BREATH_PATTERNS: BreathPattern[] = [
  {
    id: "478",
    name: "4-7-8",
    description: "Inhale 4s · Hold 7s · Exhale 8s",
    benefit: "Calms the nervous system, ideal before sleep",
    color: "#8B5CF6",
    phases: [
      { label: "Inhale", seconds: 4, color: "#00D4AA", scale: 1.35 },
      { label: "Hold", seconds: 7, color: "#8B5CF6", scale: 1.35 },
      { label: "Exhale", seconds: 8, color: "#3B82F6", scale: 0.72 },
    ],
  },
  {
    id: "box",
    name: "Box Breathing",
    description: "Inhale 4s · Hold 4s · Exhale 4s · Hold 4s",
    benefit: "Reduces stress, sharpens focus and clarity",
    color: "#00D4AA",
    phases: [
      { label: "Inhale", seconds: 4, color: "#00D4AA", scale: 1.32 },
      { label: "Hold", seconds: 4, color: "#8B5CF6", scale: 1.32 },
      { label: "Exhale", seconds: 4, color: "#3B82F6", scale: 0.72 },
      { label: "Hold", seconds: 4, color: "#6B7A99", scale: 0.72 },
    ],
  },
  {
    id: "calm",
    name: "Calm Breath",
    description: "Inhale 5s · Exhale 5s",
    benefit: "Simple coherence breathing for grounding",
    color: "#F59E0B",
    phases: [
      { label: "Inhale", seconds: 5, color: "#F59E0B", scale: 1.35 },
      { label: "Exhale", seconds: 5, color: "#3B82F6", scale: 0.72 },
    ],
  },
];

interface BreathingGuideProps {
  visible: boolean;
  onClose: () => void;
  accentColor?: string;
}

export default function BreathingGuide({
  visible,
  onClose,
  accentColor = colors.teal,
}: BreathingGuideProps) {
  const [pattern, setPattern] = useState<BreathPattern>(BREATH_PATTERNS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseRemain, setPhaseRemain] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentPhase = pattern.phases[phaseIndex];

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const animateToPhase = useCallback(
    (phase: BreathPhase) => {
      Animated.timing(scaleAnim, {
        toValue: phase.scale,
        duration: phase.seconds * 1000,
        useNativeDriver: true,
      }).start();
    },
    [scaleAnim]
  );

  const startBreathing = useCallback(() => {
    stopTimer();
    let pIdx = 0;
    let remain = pattern.phases[0].seconds;
    setPhaseIndex(0);
    setPhaseRemain(remain);
    setCycleCount(0);
    setIsRunning(true);
    animateToPhase(pattern.phases[0]);

    intervalRef.current = setInterval(() => {
      remain -= 1;
      if (remain <= 0) {
        pIdx = (pIdx + 1) % pattern.phases.length;
        if (pIdx === 0) setCycleCount((c) => c + 1);
        remain = pattern.phases[pIdx].seconds;
        setPhaseIndex(pIdx);
        animateToPhase(pattern.phases[pIdx]);
      }
      setPhaseRemain(remain);
    }, 1000);
  }, [pattern, stopTimer, animateToPhase]);

  const stopBreathing = useCallback(() => {
    stopTimer();
    setIsRunning(false);
    setPhaseIndex(0);
    setPhaseRemain(0);
    setCycleCount(0);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [stopTimer, scaleAnim]);

  // Reset when closed
  useEffect(() => {
    if (!visible) stopBreathing();
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const circleColor = isRunning ? currentPhase.color : accentColor;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        {/* Close */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {/* Pattern selector */}
        {!isRunning && (
          <View style={styles.patternList}>
            <Text style={styles.patternHeading}>CHOOSE A BREATHING PATTERN</Text>
            {BREATH_PATTERNS.map((p) => {
              const active = pattern.id === p.id;
              const cycleSec = p.phases.reduce((s, ph) => s + ph.seconds, 0);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.patternCard,
                    active && {
                      backgroundColor: p.color + "15",
                      borderColor: p.color + "40",
                    },
                  ]}
                  onPress={() => setPattern(p)}
                  activeOpacity={0.8}
                >
                  <View style={styles.patternTitleRow}>
                    <Text
                      style={[styles.patternName, active && { color: colors.textPrimary }]}
                    >
                      {p.name}
                    </Text>
                    <View style={[styles.cycleBadge, { backgroundColor: p.color + "20" }]}>
                      <Text style={[styles.cycleBadgeText, { color: p.color }]}>
                        {cycleSec}s cycle
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.patternDesc}>{p.description}</Text>
                  <Text style={styles.patternBenefit}>{p.benefit}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Breathing circle */}
        <View style={styles.circleArea}>
          <Animated.View
            style={[
              styles.circle,
              {
                backgroundColor: circleColor + "18",
                borderColor: circleColor + "50",
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {isRunning ? (
              <>
                <Text style={[styles.count, { color: circleColor }]}>{phaseRemain}</Text>
                <Text style={[styles.phaseLabel, { color: circleColor }]}>
                  {currentPhase.label.toUpperCase()}
                </Text>
              </>
            ) : (
              <Text style={styles.idleIcon}>🌬️</Text>
            )}
          </Animated.View>
        </View>

        {/* Phase dots + cycle counter */}
        {isRunning && (
          <>
            <View style={styles.dotRow}>
              {pattern.phases.map((ph, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === phaseIndex && { width: 20, backgroundColor: ph.color },
                  ]}
                />
              ))}
            </View>
            {cycleCount > 0 && (
              <Text style={styles.cycleText}>
                {cycleCount} {cycleCount === 1 ? "cycle" : "cycles"} complete
              </Text>
            )}
            <Text style={styles.runningName}>{pattern.name}</Text>
          </>
        )}

        {/* Start / Stop */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: isRunning ? "rgba(255,255,255,0.06)" : pattern.color },
          ]}
          onPress={isRunning ? stopBreathing : startBreathing}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.actionText,
              { color: isRunning ? colors.textSecondary : "#fff" },
            ]}
          >
            {isRunning ? "Stop" : `Begin ${pattern.name}`}
          </Text>
        </TouchableOpacity>

        {!isRunning && <Text style={styles.benefitFooter}>{pattern.benefit}</Text>}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10,11,20,0.94)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[6],
  },
  closeBtn: {
    position: "absolute",
    top: 64,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: colors.textMuted, fontSize: fontSizes.base },
  patternList: { width: "100%", marginBottom: spacing[5] },
  patternHeading: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: spacing[3],
  },
  patternCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: radii.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  patternTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  patternName: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  cycleBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  cycleBadgeText: { fontSize: 9, fontWeight: "700" },
  patternDesc: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  patternBenefit: {
    fontSize: 10,
    color: colors.textDim,
    fontStyle: "italic",
    marginTop: 2,
  },
  circleArea: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  count: { fontSize: 44, fontWeight: "800" },
  phaseLabel: {
    fontSize: fontSizes.xs,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 2,
    opacity: 0.85,
  },
  idleIcon: { fontSize: 34, opacity: 0.7 },
  dotRow: { flexDirection: "row", gap: spacing[2], marginTop: spacing[4] },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  cycleText: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: spacing[3] },
  runningName: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: "600",
    marginTop: spacing[1],
  },
  actionBtn: {
    marginTop: spacing[6],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[3],
    borderRadius: radii.full,
  },
  actionText: { fontSize: fontSizes.sm, fontWeight: "700" },
  benefitFooter: {
    marginTop: spacing[4],
    fontSize: fontSizes.xs,
    color: colors.textDim,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 18,
  },
});
