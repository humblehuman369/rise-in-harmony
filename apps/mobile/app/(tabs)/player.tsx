import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontSizes, spacing } from "@rih/ui-tokens";

/**
 * Player Screen
 *
 * TODO: Implement full frequency player with:
 * - expo-av audio engine (AudioPlayer hook)
 * - Waveform visualizer (react-native-svg animated rings)
 * - Volume slider, timer, and sleep timer
 * - Chakra affirmation overlay
 * - 7-Chakra Journey quick start button
 * - Background audio mode (playsInSilentModeIOS: true)
 */
export default function PlayerScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.center}>
        <Text style={styles.title}>Frequency Player</Text>
        <Text style={styles.subtitle}>
          Full player implementation coming in Phase 1.{"\n"}
          See apps/mobile/src/screens/PlayerScreen.tsx for the implementation guide.
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
