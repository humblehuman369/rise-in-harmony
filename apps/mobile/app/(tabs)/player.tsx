/**
 * Player Tab Screen
 * Frequency selector grid — tap a frequency to open the full player at /player/[id]
 */
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fontSizes, spacing, radii } from "@rih/ui-tokens";
import { FREQUENCIES, isPremiumUser } from "@rih/shared-utils";
import { useAuthStore } from "@/store/authStore";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - spacing[5] * 2 - spacing[3]) / 2;

export default function PlayerScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPremium = isPremiumUser(user?.subscriptionTier ?? "free");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Frequencies</Text>
        <Text style={styles.subtitle}>{FREQUENCIES.length} healing tones</Text>
      </View>

      <FlatList
        data={FREQUENCIES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const locked = item.isPremium && !isPremium;
          return (
            <TouchableOpacity
              style={[styles.card, { borderColor: item.color + "30" }]}
              onPress={() =>
                locked
                  ? router.push("/paywall")
                  : router.push(`/player/${item.id}`)
              }
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.glowCircle,
                  { backgroundColor: item.color + "18" },
                ]}
              >
                <Text style={[styles.hzText, { color: item.color }]}>
                  {item.hz}
                </Text>
                <Text style={[styles.hzUnit, { color: item.color + "99" }]}>
                  Hz
                </Text>
              </View>

              <Text style={styles.freqName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.freqBenefit} numberOfLines={2}>
                {item.benefit}
              </Text>

              {locked && (
                <View style={styles.lockBadge}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              )}

              {item.chakraName && (
                <View
                  style={[
                    styles.chakraBadge,
                    { backgroundColor: item.color + "20" },
                  ]}
                >
                  <Text style={[styles.chakraText, { color: item.color }]}>
                    {item.chakraName.replace(" Chakra", "")}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
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
  grid: { paddingHorizontal: spacing[5], paddingBottom: spacing[12] },
  row: { justifyContent: "space-between", marginBottom: spacing[3] },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing[4],
    alignItems: "center",
    position: "relative",
  },
  glowCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[3],
  },
  hzText: { fontSize: fontSizes.lg, fontWeight: "800", lineHeight: 22 },
  hzUnit: { fontSize: fontSizes.xs, fontWeight: "600", letterSpacing: 1 },
  freqName: {
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  freqBenefit: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 16,
  },
  lockBadge: { position: "absolute", top: spacing[2], right: spacing[2] },
  lockIcon: { fontSize: 14 },
  chakraBadge: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  chakraText: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },
});
