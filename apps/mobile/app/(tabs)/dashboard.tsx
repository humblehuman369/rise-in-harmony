import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontSizes, spacing } from "@rih/ui-tokens";

/**
 * Dashboard Screen
 *
 * TODO: Implement dashboard with:
 * - Streak calendar (current streak, longest streak)
 * - Session minutes chart (last 7 days)
 * - Mood trend chart
 * - Chakra Map (7 chakra dots, lit when played this week)
 * - Weekly balance insight text
 * - Top frequencies
 * - Recent sessions list
 *
 * Data source: tRPC sessions.stats query (same as web app)
 * Charts: react-native-svg based custom components
 */
export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.center}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>
          Dashboard implementation coming in Phase 1.{"\n"}
          Shares the same tRPC backend as the web app.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[6],
  },
  title: {
    fontSize: fontSizes["2xl"],
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing[3],
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
});
