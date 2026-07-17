/**
 * TrueHz Convert — mobile status view.
 * Full upload/DSP runs on the web Convert flow; mobile lists jobs, polls progress,
 * and opens download URLs. Deep-link to web for new conversions.
 */
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fontSizes, spacing, radii } from "@rih/ui-tokens";
import {
  convertApi,
  convertWebUrl,
  type ConvertJobDto,
  type ConvertStatusDto,
} from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

function formatCents(cents: number): string {
  const sign = cents > 0 ? "+" : cents < 0 ? "−" : "";
  return `${sign}${Math.abs(cents).toFixed(1)} ¢`;
}

export default function ConvertScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [status, setStatus] = useState<ConvertStatusDto | null>(null);
  const [jobs, setJobs] = useState<ConvertJobDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setStatus(null);
      setJobs([]);
      setLoading(false);
      return;
    }
    const [st, list] = await Promise.all([
      convertApi.status(),
      convertApi.list(),
    ]);
    setStatus(st);
    setJobs(list ?? []);
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const active = jobs.some(
      j => j.status === "queued" || j.status === "processing",
    );
    if (!active || !isAuthenticated) return;
    const t = setInterval(() => {
      void load();
    }, 2500);
    return () => clearInterval(t);
  }, [jobs, isAuthenticated, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openWebConvert = () => {
    void Linking.openURL(convertWebUrl("/convert?from=mobile"));
  };

  const download = async (job: ConvertJobDto) => {
    if (job.status !== "completed" || !job.hasMp3) {
      Alert.alert("Not ready", "This job is not ready for download.");
      return;
    }
    const res = await convertApi.getDownloadUrl(job.id, "mp3");
    if (!res?.url) {
      Alert.alert("Download failed", "Could not get download URL.");
      return;
    }
    const url = res.url.startsWith("http")
      ? res.url
      : convertWebUrl(res.url);
    void Linking.openURL(url);
  };

  const remove = (job: ConvertJobDto) => {
    Alert.alert("Delete job?", job.sourceFilename, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void convertApi.delete(job.id).then(() => load());
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.teal}
          />
        }
      >
        <Text style={styles.title}>TrueHz Convert</Text>
        <Text style={styles.sub}>
          Retune your tracks by concert pitch (e.g. A=440 → A=432). Processing
          runs on our servers — open the web Convert flow to upload, then track
          progress here.
        </Text>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Pitch-ratio retune is not the same as TrueHz live pure-tone
            synthesis. Optional pure-tone beds are the only exact-Hz layer.
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={openWebConvert}>
          <Text style={styles.primaryBtnText}>Upload on web Convert →</Text>
        </TouchableOpacity>

        {!isAuthenticated && (
          <Text style={styles.muted}>Sign in to see your convert jobs.</Text>
        )}

        {isAuthenticated && status && (
          <Text style={styles.meta}>
            {status.enabled ? "Convert online" : "Convert disabled"} ·{" "}
            {status.isPremium ? "Premium" : "Free"} · {status.activeJobs} active
            · {status.limits.retentionDays}-day library
          </Text>
        )}

        <Text style={styles.section}>Your jobs</Text>

        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 24 }} />
        ) : jobs.length === 0 ? (
          <Text style={styles.muted}>No conversions yet.</Text>
        ) : (
          jobs.map(job => (
            <View key={job.id} style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {job.sourceFilename}
              </Text>
              <Text style={styles.cardMeta}>
                {job.status}
                {job.status === "processing" || job.status === "queued"
                  ? ` · ${job.stage} ${job.progressPct}%`
                  : ""}
              </Text>
              <Text style={styles.cardMeta}>
                {job.sourcePitchA} → {job.targetPitchA} ·{" "}
                {formatCents(job.cents)}
                {job.hybridEnabled && job.hybridHz
                  ? ` · bed ${job.hybridHz} Hz`
                  : ""}
              </Text>
              {job.status === "failed" && (
                <Text style={styles.error}>
                  {job.errorCode}: {job.errorMessage}
                </Text>
              )}
              {(job.status === "queued" || job.status === "processing") && (
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${job.progressPct}%` },
                    ]}
                  />
                </View>
              )}
              <View style={styles.row}>
                {job.status === "completed" && job.hasMp3 && (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => void download(job)}
                  >
                    <Text style={styles.secondaryBtnText}>Download MP3</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={() => remove(job)}
                >
                  <Text style={styles.ghostBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  backBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  backBtnText: {
    color: colors.teal,
    fontSize: fontSizes.sm,
    fontWeight: "600",
  },
  scroll: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[12],
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  sub: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing[3],
  },
  disclaimer: {
    backgroundColor: colors.tealDim,
    borderRadius: radii.md,
    padding: spacing[3],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.tealBorder,
  },
  disclaimerText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
    alignItems: "center",
    marginBottom: spacing[3],
  },
  primaryBtnText: {
    color: "#04120E",
    fontWeight: "700",
    fontSize: fontSizes.sm,
  },
  meta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing[4],
  },
  section: {
    fontSize: fontSizes.sm,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  muted: { fontSize: fontSizes.sm, color: colors.textMuted },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.bgBorder,
  },
  cardTitle: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cardMeta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  error: { fontSize: fontSizes.xs, color: colors.error, marginTop: 6 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginTop: spacing[2],
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.teal,
  },
  row: { flexDirection: "row", gap: 8, marginTop: spacing[2] },
  secondaryBtn: {
    backgroundColor: colors.tealDim,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  secondaryBtnText: {
    color: colors.teal,
    fontSize: fontSizes.xs,
    fontWeight: "600",
  },
  ghostBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ghostBtnText: { color: colors.textMuted, fontSize: fontSizes.xs },
});
