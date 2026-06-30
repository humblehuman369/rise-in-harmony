/**
 * Dashboard Tab Screen
 * Wellness stats: streak, session minutes, chakra map, top frequencies.
 * Data comes from the same tRPC backend as the web app.
 */
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";
import { CHAKRA_FREQUENCIES, formatDuration, formatStreakLabel } from "@rih/shared-utils";
import { useAuthStore } from "@/store/authStore";

const { width } = Dimensions.get("window");
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Placeholder weekly data — replace with tRPC sessions.stats query
const MOCK_WEEK = [12, 0, 25, 18, 30, 0, 22]; // minutes per day
const MOCK_STREAK = 4;
const MOCK_LONGEST = 12;
const MOCK_TOTAL_MIN = 340;
const MOCK_SESSIONS = 28;
const MAX_BAR = Math.max(...MOCK_WEEK, 1);
const BAR_MAX_HEIGHT = 80;

export default function DashboardScreen() {
  const { user } = useAuthStore();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Journey</Text>
          <Text style={styles.subtitle}>Wellness at a glance</Text>
        </View>

        {/* Streak + totals row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: "rgba(0,212,170,0.3)" }]}>
            <Text style={[styles.statValue, { color: colors.teal }]}>
              {MOCK_STREAK}
            </Text>
            <Text style={styles.statLabel}>Day Streak 🔥</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{MOCK_TOTAL_MIN}</Text>
            <Text style={styles.statLabel}>Total Minutes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{MOCK_SESSIONS}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>

        {/* Weekly bar chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.chartCard}>
            <View style={styles.barChart}>
              {MOCK_WEEK.map((min, i) => (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barValue}>
                    {min > 0 ? min : ""}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: (min / MAX_BAR) * BAR_MAX_HEIGHT,
                          backgroundColor:
                            min > 0
                              ? colors.teal
                              : "rgba(255,255,255,0.05)",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{DAY_LABELS[i]}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Chakra Map */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chakra Balance</Text>
          <View style={styles.chartCard}>
            <View style={styles.chakraRow}>
              {CHAKRA_FREQUENCIES.map((freq, i) => {
                const active = MOCK_WEEK[i % 7] > 0;
                return (
                  <View key={freq.id} style={styles.chakraCol}>
                    <View
                      style={[
                        styles.chakraDot,
                        {
                          backgroundColor: active
                            ? freq.color + "30"
                            : "rgba(255,255,255,0.04)",
                          borderColor: active
                            ? freq.color + "80"
                            : "rgba(255,255,255,0.08)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chakraHz,
                          { color: active ? freq.color : colors.textDim },
                        ]}
                      >
                        {freq.hz}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.chakraName,
                        { color: active ? colors.textMuted : colors.textDim },
                      ]}
                      numberOfLines={1}
                    >
                      {freq.chakraName?.replace(" Chakra", "") ?? ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Longest streak */}
        <View style={styles.section}>
          <View style={styles.insightCard}>
            <Text style={styles.insightEmoji}>🏆</Text>
            <View style={styles.insightText}>
              <Text style={styles.insightTitle}>Personal Best</Text>
              <Text style={styles.insightBody}>
                {formatStreakLabel(MOCK_LONGEST)} — keep going!
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.note}>
          Connect your account to sync sessions across devices.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  scroll: { paddingBottom: spacing[16] },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  title: {
    fontSize: fontSizes["2xl"],
    color: colors.textPrimary,
    fontWeight: "700",
  },
  subtitle: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 },
  // Stats row
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing[5],
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.lg,
    padding: spacing[4],
    alignItems: "center",
    ...shadows.sm,
  },
  statValue: {
    fontSize: fontSizes["2xl"],
    color: colors.textPrimary,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "center",
  },
  // Sections
  section: { marginBottom: spacing[5] },
  sectionTitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    fontWeight: "600",
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  chartCard: {
    marginHorizontal: spacing[5],
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  // Bar chart
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: BAR_MAX_HEIGHT + 40,
  },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  barValue: {
    fontSize: 9,
    color: colors.teal,
    fontWeight: "600",
    marginBottom: 2,
    height: 12,
  },
  barTrack: {
    width: 16,
    height: BAR_MAX_HEIGHT,
    justifyContent: "flex-end",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { width: "100%", borderRadius: 4 },
  barLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing[1],
    fontWeight: "500",
  },
  // Chakra map
  chakraRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chakraCol: { alignItems: "center", flex: 1 },
  chakraDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  chakraHz: { fontSize: 9, fontWeight: "700" },
  chakraName: { fontSize: 8, textAlign: "center" },
  // Insight card
  insightCard: {
    marginHorizontal: spacing[5],
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,212,170,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.2)",
    borderRadius: radii.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  insightEmoji: { fontSize: 28 },
  insightText: { flex: 1 },
  insightTitle: {
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  insightBody: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 },
  note: {
    textAlign: "center",
    fontSize: fontSizes.xs,
    color: colors.textDim,
    paddingHorizontal: spacing[8],
    marginTop: spacing[2],
  },
  // Needed for textSecondary
  textSecondary: { color: colors.textSecondary },
});
