import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontSizes, spacing } from "@rih/ui-tokens";

/**
 * Alarm Screen
 *
 * TODO: Implement alarm scheduler with:
 * - expo-notifications for local alarm scheduling
 * - SCHEDULE_EXACT_ALARM permission handling (Android)
 * - RECEIVE_BOOT_COMPLETED broadcast receiver (Android restart recovery)
 * - iOS AlarmKit integration for iOS 26+ (with UNUserNotificationCenter fallback)
 * - Battery optimization prompt on first alarm creation
 * - Frequency/studio-mix sound selection
 * - Fade-in duration slider (1–10 minutes)
 * - Day-of-week repeat selector
 * - Active/inactive toggle per alarm
 */
export default function AlarmScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.center}>
        <Text style={styles.title}>Healing Alarm</Text>
        <Text style={styles.subtitle}>
          Alarm implementation coming in Phase 1.{"\n"}
          See §5.3 of the development plan for Android alarm reliability requirements.
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
