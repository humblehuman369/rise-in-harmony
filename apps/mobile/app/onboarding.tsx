/**
 * Onboarding Screen
 * First-launch flow: goal selection → recommended frequency → enter app.
 * Shown once; completion state stored in SecureStore via authStore.
 */
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";
import { ONBOARDING_GOALS, FREQUENCIES } from "@rih/shared-utils";
import type { OnboardingGoal } from "@rih/shared-types";
import { trackOnboardingCompleted } from "@/hooks/useAnalytics";

export const ONBOARDING_COMPLETED_KEY = "rih_onboarding_completed";

const { width } = Dimensions.get("window");

// Map each goal to the recommended frequency id
const GOAL_FREQUENCY_MAP: Record<OnboardingGoal, string> = {
  morning: "528",
  sleep: "delta",
  stress: "432",
  focus: "alpha",
  spiritual: "963",
  healing: "528",
};

const GOAL_EMOJI: Record<OnboardingGoal, string> = {
  morning: "🌅",
  sleep: "🌙",
  stress: "🌊",
  focus: "⚡",
  spiritual: "✨",
  healing: "💚",
};

const STEPS = ["welcome", "goal", "recommendation", "ready"] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [selectedGoal, setSelectedGoal] = useState<OnboardingGoal | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const transition = (nextStep: Step) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(() => setStep(nextStep), 200);
  };

  const finish = async () => {
    trackOnboardingCompleted({ goal: selectedGoal ?? "skipped" });
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
    router.replace("/(tabs)");
  };

  const recommendedFreqId = selectedGoal ? GOAL_FREQUENCY_MAP[selectedGoal] : "528";
  const recommendedFreq = FREQUENCIES.find((f) => f.id === recommendedFreqId) ?? FREQUENCIES[4];
  const selectedGoalData = ONBOARDING_GOALS.find((g) => g.id === selectedGoal);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Step indicator */}
        <View style={styles.stepDots}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.dot,
                step === s && styles.dotActive,
                STEPS.indexOf(step) > i && styles.dotDone,
              ]}
            />
          ))}
        </View>

        {/* Welcome */}
        {step === "welcome" && (
          <View style={styles.stepContent}>
            <Text style={styles.bigEmoji}>🎵</Text>
            <Text style={styles.headline}>Rise In Harmony</Text>
            <Text style={styles.subheadline}>
              Healing frequencies for your morning ritual, sleep, and daily wellbeing.
            </Text>
            <Text style={styles.body}>
              In just 30 seconds, we'll find the perfect frequency for your goals.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => transition("goal")}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={finish}
              activeOpacity={0.7}
            >
              <Text style={styles.ghostBtnText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Goal selection */}
        {step === "goal" && (
          <View style={styles.stepContent}>
            <Text style={styles.headline}>What's your intention?</Text>
            <Text style={styles.subheadline}>
              Choose your primary wellness goal.
            </Text>
            <ScrollView
              style={styles.goalScroll}
              showsVerticalScrollIndicator={false}
            >
              {ONBOARDING_GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    selectedGoal === goal.id && styles.goalCardActive,
                  ]}
                  onPress={() => setSelectedGoal(goal.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.goalEmoji}>
                    {GOAL_EMOJI[goal.id]}
                  </Text>
                  <View style={styles.goalText}>
                    <Text
                      style={[
                        styles.goalLabel,
                        selectedGoal === goal.id && styles.goalLabelActive,
                      ]}
                    >
                      {goal.label}
                    </Text>
                    <Text style={styles.goalDesc}>{goal.description}</Text>
                  </View>
                  {selectedGoal === goal.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                !selectedGoal && styles.primaryBtnDisabled,
              ]}
              onPress={() => selectedGoal && transition("recommendation")}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recommendation */}
        {step === "recommendation" && (
          <View style={styles.stepContent}>
            <Text style={styles.headline}>Your frequency</Text>
            <Text style={styles.subheadline}>
              Based on your goal of{" "}
              <Text style={{ color: colors.teal }}>
                {selectedGoalData?.label}
              </Text>
              , we recommend:
            </Text>

            <View
              style={[
                styles.freqCard,
                { borderColor: recommendedFreq.color + "50" },
              ]}
            >
              <View
                style={[
                  styles.freqGlow,
                  { backgroundColor: recommendedFreq.color + "18" },
                ]}
              >
                <Text
                  style={[styles.freqHz, { color: recommendedFreq.color }]}
                >
                  {recommendedFreq.hz}
                </Text>
                <Text
                  style={[
                    styles.freqHzUnit,
                    { color: recommendedFreq.color + "99" },
                  ]}
                >
                  Hz
                </Text>
              </View>
              <Text style={styles.freqName}>{recommendedFreq.name}</Text>
              <Text style={styles.freqBenefit}>{recommendedFreq.benefit}</Text>
              {recommendedFreq.affirmation && (
                <Text style={styles.freqAffirmation}>
                  "{recommendedFreq.affirmation}"
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => transition("ready")}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Perfect, let's go</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Ready */}
        {step === "ready" && (
          <View style={styles.stepContent}>
            <Text style={styles.bigEmoji}>🌿</Text>
            <Text style={styles.headline}>You're all set</Text>
            <Text style={styles.subheadline}>
              Your healing journey begins now.
            </Text>
            <View style={styles.readyList}>
              {[
                "🎵  Play your first frequency",
                "⏰  Set a healing alarm",
                "🧘  Try a guided meditation",
                "📊  Track your streak",
              ].map((item) => (
                <Text key={item} style={styles.readyItem}>
                  {item}
                </Text>
              ))}
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={finish}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Enter Rise In Harmony</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  content: { flex: 1 },
  stepDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing[2],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  dotActive: { backgroundColor: colors.teal, width: 18 },
  dotDone: { backgroundColor: "rgba(0,212,170,0.4)" },
  stepContent: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  bigEmoji: {
    fontSize: 64,
    textAlign: "center",
    marginBottom: spacing[5],
  },
  headline: {
    fontSize: fontSizes["3xl"],
    color: colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing[3],
    lineHeight: 40,
  },
  subheadline: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: spacing[4],
  },
  body: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing[8],
  },
  // Goal cards
  goalScroll: { flex: 1, marginBottom: spacing[4] },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    gap: spacing[3],
    ...shadows.sm,
  },
  goalCardActive: {
    backgroundColor: "rgba(0,212,170,0.08)",
    borderColor: "rgba(0,212,170,0.4)",
  },
  goalEmoji: { fontSize: 28 },
  goalText: { flex: 1 },
  goalLabel: {
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  goalLabelActive: { color: colors.teal },
  goalDesc: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  checkmark: { fontSize: fontSizes.lg, color: colors.teal, fontWeight: "700" },
  // Frequency card
  freqCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing[6],
    alignItems: "center",
    marginVertical: spacing[5],
    ...shadows.md,
  },
  freqGlow: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  freqHz: { fontSize: fontSizes["3xl"], fontWeight: "800" },
  freqHzUnit: { fontSize: fontSizes.sm, fontWeight: "600", letterSpacing: 1 },
  freqName: {
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    fontWeight: "700",
    marginBottom: spacing[2],
  },
  freqBenefit: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  freqAffirmation: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: spacing[3],
    lineHeight: 20,
  },
  // Ready list
  readyList: {
    marginVertical: spacing[6],
    gap: spacing[3],
  },
  readyItem: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  // Buttons
  primaryBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.full,
    paddingVertical: spacing[4],
    alignItems: "center",
    marginTop: spacing[2],
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: {
    color: colors.bgDeep,
    fontSize: fontSizes.base,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  ghostBtn: {
    paddingVertical: spacing[3],
    alignItems: "center",
    marginTop: spacing[2],
  },
  ghostBtnText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  // Needed for textSecondary
  textSecondary: { color: colors.textSecondary },
});
