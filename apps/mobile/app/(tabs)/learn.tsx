/**
 * Learn — Rise In Harmony Inspirational Learning Section (Mobile)
 * Four thematic "Journeys": Foundation, Mind, Body, Cosmos.
 * Journey cards → drill-down entry list with benefit text.
 * Premium entries are gated with a lock icon.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Lock, Sparkles, Brain, Activity, Compass } from "lucide-react-native";
import { colors, spacing, radii, fontSizes, shadows } from "@rih/ui-tokens";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { JOURNEYS, type Journey, type JourneyEntry } from "@/lib/learningContent";

const { width } = Dimensions.get("window");

const ICON_MAP = {
  sparkles: Sparkles,
  brain: Brain,
  activity: Activity,
  compass: Compass,
} as const;

// ─── Journey Grid Card ────────────────────────────────────────────────────────
function JourneyCard({
  journey,
  onPress,
}: {
  journey: Journey;
  onPress: () => void;
}) {
  const Icon = ICON_MAP[journey.iconType];
  const freeCount = journey.entries.filter((e) => !e.isPremium).length;
  return (
    <TouchableOpacity
      style={[styles.journeyCard, { borderColor: journey.themeColor + "30" }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Icon badge */}
      <View
        style={[
          styles.journeyIconBadge,
          { backgroundColor: journey.themeColor + "18", borderColor: journey.themeColor + "40" },
        ]}
      >
        <Icon size={22} color={journey.themeColor} strokeWidth={1.8} />
      </View>
      {/* Subtitle */}
      <Text style={[styles.journeySubtitle, { color: journey.themeColor }]}>
        {journey.subtitle}
      </Text>
      {/* Title */}
      <Text style={styles.journeyTitle}>{journey.title}</Text>
      {/* Description */}
      <Text style={styles.journeyDesc} numberOfLines={3}>
        {journey.description}
      </Text>
      {/* Footer */}
      <View style={styles.journeyFooter}>
        <Text style={styles.journeyMeta}>
          {journey.entries.length} frequencies · {freeCount} free
        </Text>
        <Text style={[styles.journeyBegin, { color: journey.themeColor }]}>
          Begin →
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Entry Row ────────────────────────────────────────────────────────────────
function EntryRow({
  entry,
  index,
  isPremium,
  onPressLocked,
}: {
  entry: JourneyEntry;
  index: number;
  isPremium: boolean;
  onPressLocked: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const locked = entry.isPremium && !isPremium;

  return (
    <TouchableOpacity
      style={styles.entryRow}
      onPress={locked ? onPressLocked : () => setExpanded((v) => !v)}
      activeOpacity={0.75}
    >
      {/* Left: colour dot + index */}
      <View style={[styles.entryDot, { backgroundColor: entry.color + "20", borderColor: entry.color + "50" }]}>
        <Text style={[styles.entryDotText, { color: entry.color }]}>{index + 1}</Text>
      </View>
      {/* Content */}
      <View style={styles.entryContent}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryName} numberOfLines={1}>
            {entry.name}
          </Text>
          {locked ? (
            <Lock size={14} color={colors.textMuted} strokeWidth={1.8} />
          ) : (
            <Text style={[styles.entryHz, { color: entry.color }]}>{entry.hz} Hz</Text>
          )}
        </View>
        <Text style={styles.entryDesc} numberOfLines={expanded ? undefined : 2}>
          {entry.description}
        </Text>
        {expanded && !locked && (
          <Text style={styles.entryBenefit}>{entry.benefit}</Text>
        )}
        {locked && (
          <Text style={styles.entryLocked}>Premium — unlock to read full benefit</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LearnScreen() {
  const router = useRouter();
  const { isPremium } = usePremiumStatus();
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        {activeJourney ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setActiveJourney(null)}
          >
            <ChevronLeft size={20} color={colors.teal} strokeWidth={2} />
            <Text style={styles.backText}>All Journeys</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.title}>
          {activeJourney ? activeJourney.title : "The Frequency Journeys"}
        </Text>
        <Text style={styles.subtitle}>
          {activeJourney
            ? activeJourney.subtitle
            : "Explore the traditions behind healing sound"}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeJourney ? (
          /* ── Journey Detail ── */
          <>
            {/* Journey description */}
            <View style={styles.journeyDetailDesc}>
              <Text style={styles.journeyDetailDescText}>
                {activeJourney.description}
              </Text>
            </View>
            {/* Entry list */}
            {activeJourney.entries.map((entry, i) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                index={i}
                isPremium={isPremium}
                onPressLocked={() => router.push("/paywall")}
              />
            ))}
            {/* Disclaimer */}
            <Text style={styles.disclaimer}>
              The descriptions in this section reflect traditional, historical,
              and symbolic associations. They are not medical claims and have not
              been evaluated by any regulatory authority.
            </Text>
          </>
        ) : (
          /* ── Journey Grid ── */
          <>
            <Text style={styles.gridIntro}>
              Each journey gathers frequencies by intention — grounding,
              cognition, body resonance, and cosmic archetypes — every tone
              rendered with double-precision DDS synthesis.
            </Text>
            {JOURNEYS.map((journey) => (
              <JourneyCard
                key={journey.id}
                journey={journey}
                onPress={() => setActiveJourney(journey)}
              />
            ))}
            <Text style={styles.disclaimer}>
              Frequency therapy descriptions reflect traditional and symbolic
              associations. They are not medical claims.
            </Text>
          </>
        )}
      </ScrollView>
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
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing[2],
  },
  backText: {
    fontSize: fontSizes.sm,
    color: colors.teal,
    fontWeight: "500",
  },
  title: {
    fontSize: fontSizes["2xl"],
    color: colors.textPrimary,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing[16] },

  // Grid intro
  gridIntro: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: spacing[5],
    marginBottom: spacing[5],
  },

  // Journey cards
  journeyCard: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[4],
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing[5],
    ...shadows.sm,
  },
  journeyIconBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[3],
  },
  journeySubtitle: {
    fontSize: fontSizes.xs,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: spacing[1],
  },
  journeyTitle: {
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    fontWeight: "700",
    marginBottom: spacing[2],
  },
  journeyDesc: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing[4],
  },
  journeyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.bgBorder,
  },
  journeyMeta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  journeyBegin: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
  },

  // Journey detail description
  journeyDetailDesc: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[5],
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: radii.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.bgBorder,
  },
  journeyDetailDescText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  // Entry rows
  entryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: spacing[5],
    marginBottom: spacing[3],
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.bgBorder,
    gap: spacing[3],
  },
  entryDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  entryDotText: {
    fontSize: fontSizes.xs,
    fontWeight: "700",
  },
  entryContent: { flex: 1 },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  entryName: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: "600",
    flex: 1,
    marginRight: spacing[2],
  },
  entryHz: {
    fontSize: fontSizes.xs,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  entryDesc: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
  entryBenefit: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.bgBorder,
  },
  entryLocked: {
    fontSize: fontSizes.xs,
    color: colors.textDim,
    fontStyle: "italic",
    marginTop: 4,
  },

  // Disclaimer
  disclaimer: {
    fontSize: fontSizes.xs,
    color: colors.textDim,
    textAlign: "center",
    paddingHorizontal: spacing[8],
    marginTop: spacing[4],
    lineHeight: 18,
  },
});
