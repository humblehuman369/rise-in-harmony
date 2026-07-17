/**
 * Programs catalog (Phase 2) — mobile. Progress tracked server-side when signed in.
 */
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { colors, fontSizes, spacing, radii } from "@rih/ui-tokens";
import { PROGRAMS, getProgramById } from "@rih/shared-utils";
import { useAuthStore } from "@/store/authStore";
import Constants from "expo-constants";

type EnrollmentState = {
  programId: string;
  completedDays: number[];
  progressPct: number;
};

const API_BASE =
  Constants.expoConfig?.extra?.apiUrl ?? "https://www.riseinharmony.com";

export default function ProgramsScreen() {
  const router = useRouter();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentState[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMine = useCallback(async () => {
    if (!isAuthenticated || !accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/trpc/programs.myPrograms`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const json = await res.json();
        const data =
          json?.result?.data?.json ?? json?.[0]?.result?.data?.json ?? [];
        if (Array.isArray(data)) {
          setEnrollments(
            data.map(
              (row: {
                enrollment: { programId: string };
                completedDays: number[];
                progressPct: number;
              }) => ({
                programId: row.enrollment.programId,
                completedDays: row.completedDays ?? [],
                progressPct: row.progressPct ?? 0,
              })
            )
          );
        }
      }
    } catch {
      // offline — catalog still works
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  const program = selectedId ? getProgramById(selectedId) : null;
  const mine = enrollments.find(e => e.programId === selectedId);

  if (program) {
    const completed = new Set(mine?.completedDays ?? []);
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.pad}>
          <TouchableOpacity onPress={() => setSelectedId(null)} style={styles.back}>
            <Text style={styles.backText}>← All programs</Text>
          </TouchableOpacity>
          <Text style={styles.icon}>{program.icon}</Text>
          <Text style={styles.title}>{program.name}</Text>
          <Text style={styles.tagline}>{program.tagline}</Text>
          <Text style={styles.body}>{program.description}</Text>
          <Text style={styles.meta}>
            {program.totalDays} days · first {program.freeDays} free
          </Text>
          {mine && (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${mine.progressPct}%`,
                    backgroundColor: program.accentColor,
                  },
                ]}
              />
            </View>
          )}
          {!isAuthenticated && (
            <Text style={styles.hint}>
              Sign in to sync program progress across devices.
            </Text>
          )}
          {program.days.map(d => {
            const done = completed.has(d.day);
            return (
              <View key={d.day} style={styles.dayRow}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>{done ? "✓" : d.day}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayTitle}>{d.title}</Text>
                  <Text style={styles.dayMeta}>
                    {d.durationMinutes} min{d.isPremium ? " · Premium" : ""}
                  </Text>
                  <Text style={styles.dayGuide}>{d.guidance}</Text>
                </View>
              </View>
            );
          })}
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: program.accentColor }]}
            onPress={() => {
              const firstOpen =
                program.days.find(d => !completed.has(d.day)) ?? program.days[0];
              if (firstOpen.activityType === "studio") {
                router.push("/(tabs)/studio");
              } else if (firstOpen.activityType === "meditation") {
                router.push("/(tabs)/meditation");
              } else {
                router.push("/(tabs)/player");
              }
            }}
          >
            <Text style={styles.ctaText}>Open today's activity</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.kicker}>STRUCTURED PATHS</Text>
        <Text style={styles.title}>Programs</Text>
        <Text style={styles.tagline}>
          Multi-day rituals. Guidance is descriptive only — not medical advice.
        </Text>
        {loading && (
          <ActivityIndicator color={colors.teal} style={{ marginVertical: 16 }} />
        )}
        {PROGRAMS.map(p => {
          const e = enrollments.find(x => x.programId === p.id);
          return (
            <TouchableOpacity
              key={p.id}
              style={styles.card}
              onPress={() => setSelectedId(p.id)}
              activeOpacity={0.85}
            >
              <Text style={styles.cardIcon}>{p.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{p.name}</Text>
                <Text style={styles.cardTag}>{p.tagline}</Text>
                <Text style={styles.cardMeta}>
                  {p.totalDays} days · {p.freeDays} free
                  {e ? ` · ${e.progressPct}%` : ""}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  pad: { padding: spacing[5], paddingBottom: 48 },
  kicker: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 6,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSizes["2xl"],
    fontWeight: "600",
    marginBottom: 6,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginBottom: 20,
    lineHeight: 20,
  },
  icon: { fontSize: 40, marginBottom: 8 },
  body: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    marginBottom: 12,
  },
  meta: { color: colors.textMuted, fontSize: 12, marginBottom: 16 },
  back: { marginBottom: 16 },
  backText: { color: colors.textMuted, fontSize: 14 },
  card: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    marginBottom: 12,
  },
  cardIcon: { fontSize: 28 },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    fontWeight: "600",
  },
  cardTag: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  cardMeta: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  dayRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgBorder,
  },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  dayTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  dayMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  dayGuide: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bgCard,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  cta: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  ctaText: { color: "#0A0B14", fontWeight: "700", fontSize: 15 },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 12,
    fontStyle: "italic",
  },
});
