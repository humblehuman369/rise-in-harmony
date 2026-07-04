/**
 * Meditation Tab Screen
 * Guided meditation library — 12 meditations across 6 categories.
 * Tap a meditation to open the session player at /meditation/[id].
 */
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";
import { MEDITATIONS, MEDITATION_CATEGORIES, isPremiumUser } from "@rih/shared-utils";
import type { Meditation, MeditationCategory } from "@rih/shared-types";
import { useAuthStore } from "@/store/authStore";

// Map lucide icon names (from the shared catalog) to emoji for mobile
export const MEDITATION_EMOJI: Record<string, string> = {
  Sunrise: "🌅",
  Sparkles: "✨",
  Scan: "🌀",
  Wind: "🌬️",
  Target: "🎯",
  Repeat: "🔁",
  Moon: "🌙",
  Layers: "🧘",
  Heart: "💚",
  Droplets: "💧",
  Eye: "👁️",
  Zap: "⚡",
  Grid3X3: "🔲",
};

type CategoryFilter = MeditationCategory | "all";

export default function MeditationScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPremium = isPremiumUser(user?.subscriptionTier ?? "free");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filtered = useMemo(
    () =>
      category === "all"
        ? MEDITATIONS
        : MEDITATIONS.filter((m) => m.category === category),
    [category]
  );

  const openMeditation = (m: Meditation) => {
    if (m.isPremium && !isPremium) {
      router.push("/paywall");
    } else {
      router.push(`/meditation/${m.id}`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Meditations</Text>
        <Text style={styles.subtitle}>
          {MEDITATIONS.length} guided sessions · frequency-paired
        </Text>
      </View>

      {/* Category chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {MEDITATION_CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategory(c.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const locked = item.isPremium && !isPremium;
          return (
            <TouchableOpacity
              style={[styles.card, { borderColor: item.color + "30" }]}
              onPress={() => openMeditation(item)}
              activeOpacity={0.8}
            >
              <View
                style={[styles.iconWrap, { backgroundColor: item.color + "20" }]}
              >
                <Text style={styles.iconEmoji}>
                  {MEDITATION_EMOJI[item.icon] ?? "✨"}
                </Text>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.isPremium && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>✦ PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  {item.subtitle}
                </Text>
                <View style={styles.cardMetaRow}>
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>
                      {item.durationMinutes} min
                    </Text>
                  </View>
                  <Text
                    style={[styles.freqLabel, { color: item.color }]}
                    numberOfLines={1}
                  >
                    {item.recommendedFrequencyLabel}
                  </Text>
                </View>
              </View>

              <Text style={locked ? styles.lock : [styles.play, { color: item.color }]}>
                {locked ? "🔒" : "▶"}
              </Text>
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
  // Category chips
  chipRow: {
    paddingHorizontal: spacing[5],
    gap: spacing[2],
    paddingBottom: spacing[3],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
  },
  chipActive: {
    backgroundColor: colors.tealDim,
    borderColor: colors.tealBorder,
  },
  chipText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: "600",
  },
  chipTextActive: { color: colors.teal },
  // Cards
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[12] },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    gap: spacing[3],
    ...shadows.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: { fontSize: 20 },
  cardBody: { flex: 1 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  proBadge: {
    backgroundColor: colors.purpleDim,
    paddingHorizontal: spacing[2],
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  proBadgeText: { fontSize: 9, fontWeight: "700", color: colors.purple },
  cardSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginTop: spacing[1],
  },
  durationBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: spacing[2],
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  durationText: { fontSize: 10, color: colors.textSecondary },
  freqLabel: { flexShrink: 1, fontSize: 10, fontWeight: "600" },
  lock: { fontSize: fontSizes.base },
  play: { fontSize: fontSizes.sm, fontWeight: "700" },
});
