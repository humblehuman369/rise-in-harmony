import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fontSizes, spacing } from "@rih/ui-tokens";
import { FREQUENCIES } from "@rih/shared-utils";
import { useAuthStore } from "@/store/authStore";
import { isPremiumUser } from "@rih/shared-utils";

export default function LibraryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPremium = isPremiumUser(user?.subscriptionTier ?? "free");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Frequency Library</Text>
        <Text style={styles.subtitle}>{FREQUENCIES.length} frequencies</Text>
      </View>
      <FlatList
        data={FREQUENCIES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const locked = item.isPremium && !isPremium;
          return (
            <TouchableOpacity
              style={[styles.row, locked && styles.rowLocked]}
              onPress={() =>
                locked
                  ? router.push("/paywall")
                  : router.push(`/player/${item.id}`)
              }
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: item.color + "20", borderColor: item.color + "40" },
                ]}
              >
                <Text style={[styles.hz, { color: item.color }]}>{item.hz}</Text>
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.category === "recorded" && (
                    <View style={styles.recordedBadge}>
                      <Text style={styles.recordedBadgeText}>RECORDED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.benefit} numberOfLines={1}>
                  {item.benefit}
                </Text>
              </View>
              {locked ? (
                <Text style={styles.lock}>🔒</Text>
              ) : (
                <Text style={[styles.play, { color: item.color }]}>▶</Text>
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
    fontWeight: "600",
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: 12,
    padding: spacing[4],
    marginBottom: spacing[2],
  },
  rowLocked: { opacity: 0.6 },
  dot: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing[3],
  },
  hz: { fontSize: 11, fontWeight: "700" },
  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: {
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: 2,
  },
  recordedBadge: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  recordedBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#22C55E",
    letterSpacing: 0.5,
  },
  benefit: { fontSize: fontSizes.xs, color: colors.textMuted },
  lock: { fontSize: fontSizes.base, paddingLeft: spacing[2] },
  play: { fontSize: fontSizes.sm, paddingLeft: spacing[3] },
});
