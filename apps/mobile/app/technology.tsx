/**
 * Frequency Technology Screen — /technology
 * The TrueHz™ story: what a hertz is, why exact tuning matters, why most
 * frequency apps don't deliver the real frequency, and how Rise In Harmony's
 * proprietary precision-tuning methodology is different (without revealing
 * how it works).
 */
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";

const PROBLEMS: Array<{ icon: string; title: string; body: string }> = [
  {
    icon: "📼",
    title: "Compressed recordings",
    body: "Most frequency apps play MP3 files. Lossy compression was designed for music, not precision tones — it discards and smears parts of the signal, so the tone that reaches your ear is an approximation of the frequency on the label.",
  },
  {
    icon: "🎚️",
    title: "Pitch-shifted music",
    body: 'Much of the "432 Hz music" online is ordinary 440 Hz audio digitally bent after the fact. Pitch-shifting warps every harmonic in the recording — the result is near the target frequency, not at it.',
  },
  {
    icon: "📉",
    title: "Playback drift",
    body: "A recording made at one sample rate gets resampled by whatever hardware plays it back. Every conversion in that chain is a chance for the tone to blur or land slightly off target.",
  },
  {
    icon: "🎧",
    title: "Pre-baked \"binaural\" files",
    body: "A binaural beat only exists when each ear receives its own precise tone. Pre-mixed stereo recordings can't verify that separation — and collapse into a single muddy tone the moment they hit a speaker or mono playback.",
  },
];

const STATS: Array<{ value: string; label: string }> = [
  { value: "0.01 Hz", label: "Tuning resolution" },
  { value: "0%", label: "Compression" },
  { value: "2", label: "Independent binaural channels" },
];

export default function TechnologyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>OUR TECHNOLOGY</Text>
          </View>
          <Text style={styles.heroTitle}>TrueHz™ Precision Tuning</Text>
          <Text style={styles.heroSub}>
            Every frequency in this app is mathematically exact. Here's why that
            matters — and why most frequency apps can't say the same.
          </Text>
        </View>

        {/* Stat chips */}
        <View style={styles.statRow}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* What is a hertz */}
        <Text style={styles.sectionTitle}>What is a hertz?</Text>
        <Text style={styles.body}>
          A hertz (Hz) is one vibration per second. When you choose 528 Hz, you're
          choosing a sound wave that rises and falls exactly 528 times every second —
          no more, no less. The number isn't a name. It's the frequency itself.
        </Text>

        {/* Why accuracy matters */}
        <Text style={styles.sectionTitle}>Accuracy is the whole point</Text>
        <Text style={styles.body}>
          Frequency work is precision work. A tone that drifts even a few hertz is a
          different tone — if you asked for 528 Hz and received 531 Hz, you didn't
          get what you chose.
        </Text>
        <Text style={styles.body}>
          With brainwave entrainment the margins are tighter still: the gap between a
          6 Hz beat (Theta — deep meditation) and a 10 Hz beat (Alpha — relaxed
          alertness) is just four cycles per second. At that scale, accuracy isn't a
          detail. It's the entire product.
        </Text>

        {/* The problem */}
        <Text style={styles.sectionTitle}>Why most apps miss the mark</Text>
        <Text style={styles.body}>
          We analyzed how frequency audio is typically produced and delivered. Four
          problems come up again and again:
        </Text>
        {PROBLEMS.map((p) => (
          <View key={p.title} style={styles.problemCard}>
            <Text style={styles.problemIcon}>{p.icon}</Text>
            <View style={styles.problemBody}>
              <Text style={styles.problemTitle}>{p.title}</Text>
              <Text style={styles.problemText}>{p.body}</Text>
            </View>
          </View>
        ))}

        {/* Our answer */}
        <View style={styles.answerCard}>
          <Text style={styles.answerTitle}>The TrueHz™ difference</Text>
          <Text style={styles.answerBody}>
            Rise In Harmony doesn't play recordings. Every tone is generated in the
            moment, on your device, using our proprietary TrueHz™ precision-tuning
            methodology — synthesized at the exact hertz you choose, tuned to two
            decimal places, and calibrated to your device's audio hardware.
          </Text>
          <Text style={styles.answerBody}>
            Binaural beats are created as two independent, precisely offset tones with
            true left/right separation — never a pre-baked file. No compression. No
            pitch-shifting. No drift. Just the pure frequency.
          </Text>
          <Text style={styles.answerBody}>
            Exactly how we do it is our secret — but the result is simple to state:
            when this app says 528 Hz, you get 528.00 Hz.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.push("/precision")}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>Try the Precision Player →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctaBtn, styles.ctaSecondary]}
          onPress={() => router.push("/convert")}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaSecondaryText}>TrueHz Convert →</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Rise In Harmony is a wellness tool, not a medical device. Frequency
          experiences are personal; claims about specific health outcomes are not
          made or implied.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  backBtn: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  backBtnText: { color: colors.textMuted, fontSize: fontSizes.base },
  scroll: { paddingHorizontal: spacing[5], paddingBottom: spacing[12] },
  // Hero
  hero: { alignItems: "center", paddingVertical: spacing[5] },
  heroBadge: {
    backgroundColor: colors.tealDim,
    borderWidth: 1,
    borderColor: colors.tealBorder,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    marginBottom: spacing[3],
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.teal,
  },
  heroTitle: {
    fontSize: fontSizes["3xl"],
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing[2],
  },
  heroSub: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: spacing[4],
  },
  // Stats
  statRow: {
    flexDirection: "row",
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    alignItems: "center",
    ...shadows.sm,
  },
  statValue: {
    fontSize: fontSizes.lg,
    fontWeight: "800",
    color: colors.teal,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
  // Sections
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing[2],
    marginTop: spacing[2],
  },
  body: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing[4],
  },
  // Problem cards
  problemCard: {
    flexDirection: "row",
    gap: spacing[3],
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  problemIcon: { fontSize: 20 },
  problemBody: { flex: 1 },
  problemTitle: {
    fontSize: fontSizes.sm,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing[1],
  },
  problemText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    lineHeight: 19,
  },
  // Answer
  answerCard: {
    backgroundColor: colors.tealDim,
    borderWidth: 1,
    borderColor: colors.tealBorder,
    borderRadius: radii.lg,
    padding: spacing[5],
    marginTop: spacing[3],
    marginBottom: spacing[5],
  },
  answerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: "800",
    color: colors.teal,
    marginBottom: spacing[3],
  },
  answerBody: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing[3],
  },
  // CTA
  ctaBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.lg,
    paddingVertical: spacing[4],
    alignItems: "center",
    marginBottom: spacing[3],
  },
  ctaBtnText: {
    fontSize: fontSizes.base,
    fontWeight: "700",
    color: "#04211C",
  },
  ctaSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.purple,
    marginBottom: spacing[5],
  },
  ctaSecondaryText: {
    fontSize: fontSizes.base,
    fontWeight: "700",
    color: colors.purple,
  },
  footnote: {
    fontSize: fontSizes.xs,
    color: colors.textDim,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: spacing[4],
  },
});
