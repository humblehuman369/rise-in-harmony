/**
 * Dashboard Tab Screen
 * Wellness stats: streak, session minutes, chakra map, top frequencies.
 * Fetches real data from the Rise In Harmony backend API.
 * Falls back to empty/zero state when unauthenticated or offline.
 */
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";
import { CHAKRA_FREQUENCIES, formatStreakLabel, calculateStreak } from "@rih/shared-utils";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import type { SessionStats, Session } from "@rih/shared-types";

const { width } = Dimensions.get("window");
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BAR_MAX_HEIGHT = 80;

function getWeekMinutes(sessions: Session[]): number[] {
  const now = new Date();
  const startOfWeek = new Date(now);
  // Monday = 0 index
  const day = now.getDay(); // 0=Sun,1=Mon,...
  const mondayOffset = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(now.getDate() + mondayOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  const buckets = [0, 0, 0, 0, 0, 0, 0]; // Mon–Sun
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    if (d < startOfWeek) continue;
    const dayIndex = (d.getDay() + 6) % 7; // Mon=0, Sun=6
    buckets[dayIndex] += Math.round(s.durationSeconds / 60);
  }
  return buckets;
}

function getChakraActivity(sessions: Session[]): Set<number> {
  const active = new Set<number>();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30); // last 30 days
  for (const s of sessions) {
    if (new Date(s.startedAt) < cutoff) continue;
    active.add(s.frequencyHz);
  }
  return active;
}

export default function DashboardScreen() {
  const { user, accessToken } = useAuthStore();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SessionStats>("/api/trpc/sessions.getStats");
      if (res.success) {
        setStats(res.data);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Could not load stats. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Derived values
  const streak = stats?.currentStreak ?? 0;
  const totalMin = stats?.totalMinutes ?? 0;
  const totalSessions = stats?.totalSessions ?? 0;
  const recentSessions = stats?.recentSessions ?? [];

  // Compute longest streak from recent sessions
  const sessionDates = recentSessions.map((s) => new Date(s.startedAt));
  const longestStreak = calculateStreak(sessionDates);

  const weekMinutes = getWeekMinutes(recentSessions);
  const maxBar = Math.max(...weekMinutes, 1);

  const chakraActive = getChakraActivity(recentSessions);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Journey</Text>
          <Text style={styles.subtitle}>
            {user ? `Welcome back, ${user.name?.split(" ")[0] ?? "friend"}` : "Wellness at a glance"}
          </Text>
        </View>

        {/* Loading / Error */}
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.teal} />
            <Text style={styles.loadingText}>Loading your stats…</Text>
          </View>
        )}
        {error && !loading && (
          <TouchableOpacity style={styles.errorCard} onPress={fetchStats}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorRetry}>Tap to retry</Text>
          </TouchableOpacity>
        )}

        {/* Streak + totals row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: "rgba(0,212,170,0.3)" }]}>
            <Text style={[styles.statValue, { color: colors.teal }]}>
              {streak}
            </Text>
            <Text style={styles.statLabel}>Day Streak 🔥</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalMin}</Text>
            <Text style={styles.statLabel}>Total Minutes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>

        {/* Weekly bar chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.chartCard}>
            <View style={styles.barChart}>
              {weekMinutes.map((min, i) => (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barValue}>
                    {min > 0 ? min : ""}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: (min / maxBar) * BAR_MAX_HEIGHT,
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
          <Text style={styles.sectionTitle}>Chakra Balance (Last 30 Days)</Text>
          <View style={styles.chartCard}>
            <View style={styles.chakraRow}>
              {CHAKRA_FREQUENCIES.map((freq) => {
                const active = chakraActive.has(freq.hz);
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

        {/* Streak calendar (last 30 days) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>30-Day Calendar</Text>
          <View style={styles.chartCard}>
            <StreakCalendar sessions={recentSessions} />
          </View>
        </View>

        {/* Personal best */}
        <View style={styles.section}>
          <View style={styles.insightCard}>
            <Text style={styles.insightEmoji}>🏆</Text>
            <View style={styles.insightText}>
              <Text style={styles.insightTitle}>Personal Best</Text>
              <Text style={styles.insightBody}>
                {longestStreak > 0
                  ? `${formatStreakLabel(longestStreak)} — keep going!`
                  : "Start your first session to begin your streak."}
              </Text>
            </View>
          </View>
        </View>

        {!user && (
          <Text style={styles.note}>
            Sign in to sync sessions across devices and unlock detailed analytics.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** 30-day streak calendar grid */
function StreakCalendar({ sessions }: { sessions: Session[] }) {
  const activeDays = new Set<string>();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 29);
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    if (d >= cutoff) {
      activeDays.add(d.toISOString().slice(0, 10));
    }
  }

  const days: Date[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  return (
    <View style={calStyles.grid}>
      {days.map((d, i) => {
        const key = d.toISOString().slice(0, 10);
        const active = activeDays.has(key);
        return (
          <View
            key={i}
            style={[
              calStyles.cell,
              { backgroundColor: active ? colors.teal + "50" : "rgba(255,255,255,0.04)" },
            ]}
          />
        );
      })}
    </View>
  );
}

const calStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  cell: {
    width: (width - spacing[5] * 2 - spacing[4] * 2 - 4 * 29) / 30,
    height: 16,
    borderRadius: 3,
  },
});

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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  loadingText: { fontSize: fontSizes.sm, color: colors.textMuted },
  errorCard: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[4],
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    borderRadius: radii.lg,
    padding: spacing[4],
  },
  errorText: { fontSize: fontSizes.sm, color: "#EF4444" },
  errorRetry: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 4 },
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
});
