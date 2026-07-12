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
import { useFocusEffect, useRouter } from "expo-router";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";
import { CHAKRA_FREQUENCIES, FREQUENCIES, formatStreakLabel, calculateStreak } from "@rih/shared-utils";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { loadJournalEntries, averageMood } from "@/lib/journal";
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
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avgMood, setAvgMood] = useState<number | null>(null);

  // Refresh local mood average whenever the tab regains focus
  useFocusEffect(
    useCallback(() => {
      loadJournalEntries().then((entries) => setAvgMood(averageMood(entries)));
    }, [])
  );

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
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {avgMood !== null ? avgMood : "–"}
            </Text>
            <Text style={styles.statLabel}>Avg Mood (30d)</Text>
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

        {/* Mood Trend */}
        <MoodTrendSection sessions={recentSessions} />

        {/* Top Frequencies */}
        <TopFrequenciesSection sessions={recentSessions} />

        {/* Recent Sessions */}
        <RecentSessionsSection sessions={recentSessions} />

        {/* Weekly Goals */}
        <WeeklyGoalsSection totalMinutes={totalMin} streak={streak} />

        {!user && (
          <View style={{ alignItems: "center", marginTop: spacing[4] }}>
            <Text style={styles.note}>
              Sign in to sync sessions across devices and unlock detailed analytics.
            </Text>
            <TouchableOpacity
              style={{
                marginTop: spacing[3],
                paddingHorizontal: spacing[5],
                paddingVertical: spacing[3],
                borderRadius: 100,
                backgroundColor: colors.teal,
              }}
              onPress={() => router.push("/login")}
              activeOpacity={0.85}
            >
              <Text style={{ color: colors.bgDeep, fontWeight: "700", fontSize: fontSizes.sm }}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
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

// ─── Mood Trend Section ──────────────────────────────────────────────────────
function MoodTrendSection({ sessions }: { sessions: Session[] }) {
  const DAY_LABELS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(now.getDate() + mondayOffset);
  startOfWeek.setHours(0, 0, 0, 0);
  const moodBuckets: number[] = [0, 0, 0, 0, 0, 0, 0];
  const moodCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    if (d < startOfWeek) continue;
    const dayIndex = (d.getDay() + 6) % 7;
    if (s.moodRating) {
      moodBuckets[dayIndex] += s.moodRating;
      moodCounts[dayIndex]++;
    }
  }
  const avgMoods = moodBuckets.map((sum, i) =>
    moodCounts[i] > 0 ? Math.round((sum / moodCounts[i]) * 10) / 10 : 0
  );
  const maxMood = Math.max(...avgMoods, 1);
  const BAR_H = 60;
  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.sectionTitle}>Mood Trend</Text>
      <View style={sectionStyles.card}>
        <View style={sectionStyles.barChart}>
          {avgMoods.map((mood, i) => {
            const barColor = mood >= 4 ? colors.teal : mood >= 3 ? "#8B5CF6" : mood > 0 ? "#6B7A99" : "rgba(255,255,255,0.05)";
            return (
              <View key={i} style={sectionStyles.barCol}>
                <Text style={[sectionStyles.barValue, { color: barColor }]}>
                  {mood > 0 ? mood : ""}
                </Text>
                <View style={[sectionStyles.barTrack, { height: BAR_H }]}>
                  <View
                    style={[
                      sectionStyles.barFill,
                      { height: (mood / maxMood) * BAR_H, backgroundColor: barColor },
                    ]}
                  />
                </View>
                <Text style={sectionStyles.barLabel}>{DAY_LABELS_SHORT[i]}</Text>
              </View>
            );
          })}
        </View>
        {avgMoods.every((m) => m === 0) && (
          <Text style={sectionStyles.emptyText}>
            Log your mood after sessions to see your trend here.
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Top Frequencies Section ──────────────────────────────────────────────────
function TopFrequenciesSection({ sessions }: { sessions: Session[] }) {
  const freqMap = new Map<number, { name: string; count: number; color: string }>();
  for (const s of sessions) {
    const existing = freqMap.get(s.frequencyHz);
    const freq = FREQUENCIES.find((f) => f.hz === s.frequencyHz);
    const color = freq?.color ?? "#6B7A99";
    if (existing) {
      existing.count++;
    } else {
      freqMap.set(s.frequencyHz, {
        name: s.frequencyName ?? `${s.frequencyHz} Hz`,
        count: 1,
        color,
      });
    }
  }
  const top = Array.from(freqMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);
  const maxCount = top.length > 0 ? top[0][1].count : 1;
  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.sectionTitle}>Top Frequencies</Text>
      <View style={sectionStyles.card}>
        {top.length > 0 ? (
          top.map(([hz, info]) => (
            <View key={hz} style={sectionStyles.freqRow}>
              <View style={[sectionStyles.freqDot, { backgroundColor: info.color + "20", borderColor: info.color + "50" }]}>
                <Text style={[sectionStyles.freqHz, { color: info.color }]}>{hz}</Text>
              </View>
              <View style={sectionStyles.freqBarWrap}>
                <Text style={sectionStyles.freqName} numberOfLines={1}>{info.name}</Text>
                <View style={sectionStyles.freqTrack}>
                  <View
                    style={[
                      sectionStyles.freqFill,
                      { width: `${(info.count / maxCount) * 100}%` as any, backgroundColor: info.color },
                    ]}
                  />
                </View>
              </View>
              <Text style={[sectionStyles.freqCount, { color: info.color }]}>{info.count}x</Text>
            </View>
          ))
        ) : (
          <Text style={sectionStyles.emptyText}>
            Complete sessions to see your most-used frequencies here.
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Recent Sessions Section ──────────────────────────────────────────────────
const MOOD_LABELS: Record<number, string> = { 1: "Low", 2: "Okay", 3: "Good", 4: "Great", 5: "Amazing" };
function RecentSessionsSection({ sessions }: { sessions: Session[] }) {
  const recent = sessions.slice(0, 5);
  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.sectionTitle}>Recent Sessions</Text>
      <View style={sectionStyles.card}>
        {recent.length > 0 ? (
          recent.map((s, i) => {
            const freq = FREQUENCIES.find((f) => f.hz === s.frequencyHz);
            const color = freq?.color ?? "#6B7A99";
            const diff = Date.now() - new Date(s.startedAt).getTime();
            const relTime =
              diff < 3600000
                ? `${Math.round(diff / 60000)}m ago`
                : diff < 86400000
                ? `${Math.round(diff / 3600000)}h ago`
                : `${Math.round(diff / 86400000)}d ago`;
            return (
              <View
                key={s.id}
                style={[
                  sectionStyles.sessionRow,
                  i < recent.length - 1 && sectionStyles.sessionRowBorder,
                ]}
              >
                <View style={[sectionStyles.sessionDot, { backgroundColor: color + "15" }]}>
                  <Text style={[sectionStyles.sessionHz, { color }]}>{s.frequencyHz}</Text>
                </View>
                <View style={sectionStyles.sessionInfo}>
                  <Text style={sectionStyles.sessionName} numberOfLines={1}>
                    {s.frequencyName ?? `${s.frequencyHz} Hz`} — {Math.round(s.durationSeconds / 60)}min
                  </Text>
                  <Text style={sectionStyles.sessionTime}>{relTime}</Text>
                </View>
                {s.moodRating && (
                  <View style={sectionStyles.moodBadge}>
                    <Text style={sectionStyles.moodBadgeText}>
                      {MOOD_LABELS[s.moodRating] ?? "Good"}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <Text style={sectionStyles.emptyText}>
            Your session history is empty. Play a frequency to get started.
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Weekly Goals Section ─────────────────────────────────────────────────────
function WeeklyGoalsSection({ totalMinutes, streak }: { totalMinutes: number; streak: number }) {
  const goals = [
    { label: "Total minutes", current: totalMinutes, target: 150, color: colors.teal },
    { label: "Streak days", current: streak, target: 14, color: "#8B5CF6" },
    { label: "Sessions this week", current: Math.min(streak, 7), target: 7, color: "#F59E0B" },
  ];
  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.sectionTitle}>Weekly Goals</Text>
      <View style={sectionStyles.card}>
        {goals.map((goal) => (
          <View key={goal.label} style={sectionStyles.goalRow}>
            <View style={sectionStyles.goalHeader}>
              <Text style={sectionStyles.goalLabel}>{goal.label}</Text>
              <Text style={[sectionStyles.goalValue, { color: goal.color }]}>
                {goal.current} / {goal.target}
              </Text>
            </View>
            <View style={sectionStyles.goalTrack}>
              <View
                style={[
                  sectionStyles.goalFill,
                  {
                    width: `${Math.min((goal.current / goal.target) * 100, 100)}%` as any,
                    backgroundColor: goal.color,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Shared section styles ────────────────────────────────────────────────────
const sectionStyles = StyleSheet.create({
  section: { marginBottom: spacing[5] },
  sectionTitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    fontWeight: "600",
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  card: {
    marginHorizontal: spacing[5],
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  emptyText: {
    fontSize: fontSizes.xs,
    color: colors.textDim,
    textAlign: "center",
    paddingVertical: spacing[3],
  },
  // Mood/bar chart
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  barValue: { fontSize: 9, fontWeight: "600", marginBottom: 2, height: 12 },
  barTrack: {
    width: 16,
    justifyContent: "flex-end",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { width: "100%", borderRadius: 4 },
  barLabel: { fontSize: 10, color: colors.textMuted, marginTop: spacing[1], fontWeight: "500" },
  // Top frequencies
  freqRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  freqDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  freqHz: { fontSize: 9, fontWeight: "700" },
  freqBarWrap: { flex: 1 },
  freqName: { fontSize: fontSizes.xs, color: colors.textSecondary, marginBottom: 4 },
  freqTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
  },
  freqFill: { height: "100%", borderRadius: 3 },
  freqCount: { fontSize: fontSizes.xs, fontWeight: "700", minWidth: 24, textAlign: "right" },
  // Recent sessions
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  sessionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  sessionDot: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sessionHz: { fontSize: 9, fontWeight: "700" },
  sessionInfo: { flex: 1 },
  sessionName: { fontSize: fontSizes.xs, color: colors.textPrimary, fontWeight: "500" },
  sessionTime: { fontSize: 10, color: colors.textDim, marginTop: 2 },
  moodBadge: {
    backgroundColor: "rgba(0,212,170,0.1)",
    borderRadius: 10,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  moodBadgeText: { fontSize: 10, color: colors.teal, fontWeight: "500" },
  // Weekly goals
  goalRow: { marginBottom: spacing[4] },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing[1] },
  goalLabel: { fontSize: fontSizes.xs, color: colors.textMuted },
  goalValue: { fontSize: fontSizes.xs, fontWeight: "600" },
  goalTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 4,
    overflow: "hidden",
  },
  goalFill: { height: "100%", borderRadius: 4 },
});

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
