import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, spacing, fontSizes } from "@rih/ui-tokens";
import { CHAKRA_FREQUENCIES, FREE_FREQUENCIES } from "@rih/shared-utils";
import { useAuthStore } from "@/store/authStore";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.name}>
              {user?.name ?? "Friend"}
            </Text>
          </View>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>RiH</Text>
          </View>
        </View>

        {/* Quick Start Card */}
        <TouchableOpacity
          style={styles.quickStartCard}
          onPress={() => router.push("/(tabs)/player")}
          activeOpacity={0.85}
        >
          <Text style={styles.quickStartLabel}>QUICK START</Text>
          <Text style={styles.quickStartTitle}>7-Chakra Journey</Text>
          <Text style={styles.quickStartSub}>
            Root → Crown · 21 minutes · Full alignment
          </Text>
          <View style={styles.quickStartButton}>
            <Text style={styles.quickStartButtonText}>▶  Begin Now</Text>
          </View>
        </TouchableOpacity>

        {/* Free Frequencies */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Free Frequencies</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/library")}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>
        {FREE_FREQUENCIES.slice(0, 3).map((freq) => (
          <TouchableOpacity
            key={freq.id}
            style={styles.freqRow}
            onPress={() => router.push(`/player/${freq.id}`)}
            activeOpacity={0.75}
          >
            <View style={[styles.freqDot, { backgroundColor: freq.color + "30", borderColor: freq.color + "50" }]}>
              <Text style={[styles.freqHz, { color: freq.color }]}>{freq.hz}</Text>
            </View>
            <View style={styles.freqInfo}>
              <Text style={styles.freqName}>{freq.name}</Text>
              <Text style={styles.freqBenefit}>{freq.benefit}</Text>
            </View>
            <Text style={styles.freqPlay}>▶</Text>
          </TouchableOpacity>
        ))}

        {/* Chakra Journey Preview */}
        <Text style={styles.sectionTitle}>Chakra Journey</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chakraRow}
        >
          {CHAKRA_FREQUENCIES.map((freq) => (
            <TouchableOpacity
              key={freq.id}
              style={[styles.chakraChip, { borderColor: freq.color + "40" }]}
              onPress={() => router.push(`/player/${freq.id}`)}
              activeOpacity={0.75}
            >
              <View style={[styles.chakraDot, { backgroundColor: freq.color }]} />
              <Text style={[styles.chakraHz, { color: freq.color }]}>{freq.hz}Hz</Text>
              <Text style={styles.chakraName} numberOfLines={1}>
                {freq.chakraName?.replace(" Chakra", "")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  scroll: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  greeting: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  name: {
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    fontWeight: "600",
    marginTop: 2,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.tealDim,
    borderWidth: 1,
    borderColor: colors.tealBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: colors.teal,
    fontSize: fontSizes.xs,
    fontWeight: "700",
    letterSpacing: 1,
  },
  quickStartCard: {
    backgroundColor: "rgba(0,212,170,0.06)",
    borderWidth: 1,
    borderColor: colors.tealBorder,
    borderRadius: 16,
    padding: spacing[5],
    marginBottom: spacing[6],
  },
  quickStartLabel: {
    fontSize: 10,
    color: colors.teal,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: spacing[1],
  },
  quickStartTitle: {
    fontSize: fontSizes["2xl"],
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing[1],
  },
  quickStartSub: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing[4],
  },
  quickStartButton: {
    backgroundColor: colors.teal,
    borderRadius: 100,
    paddingVertical: spacing[3],
    alignItems: "center",
  },
  quickStartButtonText: {
    color: "#0A0B14",
    fontSize: fontSizes.base,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  seeAll: {
    fontSize: fontSizes.xs,
    color: colors.teal,
    fontWeight: "600",
  },
  freqRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: 12,
    padding: spacing[4],
    marginBottom: spacing[2],
  },
  freqDot: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing[3],
  },
  freqHz: {
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  freqInfo: {
    flex: 1,
  },
  freqName: {
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: 2,
  },
  freqBenefit: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  freqPlay: {
    fontSize: fontSizes.sm,
    color: colors.teal,
    paddingLeft: spacing[3],
  },
  chakraRow: {
    paddingBottom: spacing[2],
    gap: spacing[2],
  },
  chakraChip: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing[3],
    alignItems: "center",
    width: 80,
  },
  chakraDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: spacing[1],
  },
  chakraHz: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  chakraName: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
  },
});
