/**
 * Home Screen — Rise In Harmony
 * Redesigned to match the web landing page (commit e5e3234):
 * - Bioluminescent hero with headline + dual CTA
 * - "You got so much more" revelation section
 * - 3 key feature cards (Alarm, Studio, Library)
 * - Solfeggio frequency list
 * - Testimonial + final CTA
 */
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, spacing, fontSizes, radii } from "@rih/ui-tokens";
import { useAuthStore } from "@/store/authStore";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Pulsing dot ──────────────────────────────────────────────────────────────
function PulseDot() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return <Animated.View style={[styles.pulseDot, { opacity: anim }]} />;
}

// ─── Analog Clock ────────────────────────────────────────────────────────────
function AnalogClock({ size = 160 }: { size?: number }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  const sec = time.getSeconds();
  const min = time.getMinutes();
  const hr = time.getHours() % 12;

  const secAngle = (sec / 60) * 2 * Math.PI - Math.PI / 2;
  const minAngle = ((min + sec / 60) / 60) * 2 * Math.PI - Math.PI / 2;
  const hrAngle = ((hr + min / 60) / 12) * 2 * Math.PI - Math.PI / 2;

  const hand = (angle: number, length: number) => ({
    x2: cx + length * Math.cos(angle),
    y2: cy + length * Math.sin(angle),
  });

  const secHand = hand(secAngle, r * 0.82);
  const minHand = hand(minAngle, r * 0.72);
  const hrHand = hand(hrAngle, r * 0.52);

  const TEAL = "#00D4AA";
  const DIM = "rgba(0,212,170,0.35)";

  return (
    <Svg width={size} height={size}>
      {/* Outer ring */}
      <Circle cx={cx} cy={cy} r={r} fill="rgba(0,212,170,0.04)" stroke={TEAL} strokeWidth={1.5} strokeOpacity={0.5} />
      {/* Inner glow ring */}
      <Circle cx={cx} cy={cy} r={r - 8} fill="none" stroke={DIM} strokeWidth={0.5} />
      {/* Hour markers */}
      {[12, 3, 6, 9].map((h) => {
        const a = ((h / 12) * 2 * Math.PI) - Math.PI / 2;
        return (
          <SvgText
            key={h}
            x={cx + (r - 16) * Math.cos(a)}
            y={cy + (r - 16) * Math.sin(a) + 4}
            fontSize={10}
            fill={TEAL}
            fillOpacity={0.7}
            textAnchor="middle"
          >
            {h}
          </SvgText>
        );
      })}
      {/* Hour hand */}
      <Line x1={cx} y1={cy} x2={hrHand.x2} y2={hrHand.y2} stroke={TEAL} strokeWidth={3} strokeLinecap="round" />
      {/* Minute hand */}
      <Line x1={cx} y1={cy} x2={minHand.x2} y2={minHand.y2} stroke={TEAL} strokeWidth={2} strokeLinecap="round" />
      {/* Second hand */}
      <Line x1={cx} y1={cy} x2={secHand.x2} y2={secHand.y2} stroke="#FF6B6B" strokeWidth={1} strokeLinecap="round" />
      {/* Center dot */}
      <Circle cx={cx} cy={cy} r={4} fill={TEAL} />
      {/* Digital time */}
      <SvgText
        x={cx}
        y={cy + r * 0.45}
        fontSize={9}
        fill={TEAL}
        fillOpacity={0.6}
        textAnchor="middle"
      >
        {String(time.getHours()).padStart(2, "0")}:{String(min).padStart(2, "0")}
      </SvgText>
    </Svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "⏰",
    title: "Healing Alarm",
    body: "Wake to 432Hz or 528Hz. No jarring buzz — a soft, progressive rise that aligns body and mind.",
    route: "/(tabs)/alarm",
    color: colors.teal,
  },
  {
    icon: "〰️",
    title: "Frequency Studio",
    body: "Layer binaural beats, isochronic tones, and nature sounds. Build your perfect healing session.",
    route: "/(tabs)/studio",
    color: "#8B5CF6",
  },
  {
    icon: "🎵",
    title: "Meditation Library",
    body: "TrueHz-mastered tracks with healing frequencies baked in at ±0.05 Hz precision.",
    route: "/(tabs)/library",
    color: "#3B82F6",
  },
] as const;

const SOLFEGGIO = [
  { hz: 174, name: "Foundation", benefit: "Pain relief & grounding", color: "#6B7A99", id: "174hz" },
  { hz: 285, name: "Quantum Cognition", benefit: "Tissue regeneration", color: "#3B82F6", id: "285hz" },
  { hz: 396, name: "Liberation", benefit: "Release guilt & fear", color: "#EF4444", id: "396hz" },
  { hz: 417, name: "Transformation", benefit: "Undo negative situations", color: "#F97316", id: "417hz" },
  { hz: 528, name: "Love & Miracles", benefit: "DNA repair & healing", color: "#00D4AA", id: "528hz" },
  { hz: 639, name: "Connection", benefit: "Harmonise relationships", color: "#22C55E", id: "639hz" },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const greeting = getGreeting();
  const dayName = DAYS[new Date().getDay()];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />

          {/* Greeting chip */}
          <View style={styles.greetingChip}>
            <PulseDot />
            <Text style={styles.greetingChipText}>{greeting} · {dayName}</Text>
          </View>

          {/* Headline */}
          <Text style={styles.heroHeadline}>
            {"Your alarm,\n"}
            <Text style={styles.heroAccent}>reimagined.</Text>
          </Text>

          {/* Sub-headline */}
          <Text style={styles.heroSub}>
            Wake gently with healing frequencies. No jarring buzz — just a soft, progressive rise that aligns your body and mind.
          </Text>

          {/* Analog Clock */}
          <View style={styles.clockWrapper}>
            <AnalogClock size={160} />
          </View>

          {/* Primary CTA */}
          <TouchableOpacity style={styles.ctaPrimary} onPress={() => router.push("/(tabs)/alarm")} activeOpacity={0.85}>
            <Text style={styles.ctaPrimaryText}>⏰  Set Your Healing Alarm</Text>
          </TouchableOpacity>

          {/* Secondary CTA */}
          <TouchableOpacity style={styles.ctaSecondary} onPress={() => router.push("/(tabs)/player" as any)} activeOpacity={0.85}>
            <Text style={styles.ctaSecondaryText}>▶  Try a Free Frequency</Text>
          </TouchableOpacity>

          {/* Trust line */}
          <Text style={styles.trustLine}>Free to start · No card required · 3 frequencies unlocked</Text>
        </View>

        {/* ── REVELATION ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.eyebrow}>YOU DOWNLOADED AN ALARM.</Text>
          <Text style={styles.headline}>
            {"You got so much\n"}
            <Text style={styles.accentText}>more.</Text>
          </Text>
          <Text style={styles.body}>
            Rise In Harmony is a complete sound-healing system — precision frequencies, guided meditations, a binaural studio, and a smart alarm that wakes you in resonance.
          </Text>
        </View>

        {/* ── FEATURES ─────────────────────────────────────────────────── */}
        <View style={styles.featuresSection}>
          {FEATURES.map((f) => (
            <TouchableOpacity
              key={f.title}
              style={styles.featureCard}
              onPress={() => router.push(f.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIcon, { backgroundColor: f.color + "18", borderColor: f.color + "30" }]}>
                <Text style={styles.featureIconEmoji}>{f.icon}</Text>
              </View>
              <View style={styles.featureBody}>
                <Text style={[styles.featureTitle, { color: f.color }]}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.body}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── SOLFEGGIO FREQUENCIES ────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.eyebrow}>SOLFEGGIO SCALE</Text>
              <Text style={styles.headlineSmall}>Healing frequencies</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(tabs)/library")}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {SOLFEGGIO.map((f) => (
            <TouchableOpacity
              key={f.hz}
              style={styles.freqRow}
              onPress={() => router.push(`/player/${f.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.freqDot, { backgroundColor: f.color + "18", borderColor: f.color + "35" }]}>
                <Text style={[styles.freqHz, { color: f.color }]}>{f.hz}</Text>
              </View>
              <View style={styles.freqInfo}>
                <Text style={styles.freqName}>{f.name}</Text>
                <Text style={styles.freqBenefit}>{f.benefit}</Text>
              </View>
              <Text style={[styles.freqPlay, { color: f.color }]}>▶</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TESTIMONIAL ──────────────────────────────────────────────── */}
        <View style={styles.testimonialSection}>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Text key={i} style={styles.star}>★</Text>
            ))}
          </View>
          <Text style={styles.testimonialQuote}>
            "I downloaded it for the alarm. I stayed for the frequencies. My mornings are completely different now."
          </Text>
          <Text style={styles.testimonialAttrib}>— Early adopter, Premium member</Text>
        </View>

        {/* ── FINAL CTA ────────────────────────────────────────────────── */}
        <View style={styles.finalCta}>
          <Text style={styles.finalHeadline}>
            {"Your body already knows\n"}
            <Text style={styles.accentText}>how to heal.</Text>
          </Text>
          <Text style={styles.finalSub}>
            We give it the frequency to remember. Start free — three healing frequencies, no sign-up required.
          </Text>
          <TouchableOpacity style={styles.ctaPrimary} onPress={() => router.push("/(tabs)/alarm")} activeOpacity={0.85}>
            <Text style={styles.ctaPrimaryText}>⏰  Set Your Healing Alarm</Text>
          </TouchableOpacity>
          {!user && (
            <TouchableOpacity style={styles.ctaPremium} onPress={() => router.push("/paywall" as any)} activeOpacity={0.85}>
              <Text style={styles.ctaPremiumText}>✦  Go Premium — from $4.17/mo</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  scroll: { paddingBottom: spacing[10] },

  // Hero
  hero: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[8],
    paddingBottom: spacing[8],
    alignItems: "center",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -60,
    left: SCREEN_W * 0.1,
    width: SCREEN_W * 0.8,
    height: 280,
    borderRadius: 999,
    backgroundColor: "rgba(0,212,170,0.07)",
  },
  greetingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: "rgba(0,212,170,0.10)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.22)",
    marginBottom: spacing[5],
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal,
  },
  greetingChipText: {
    fontSize: fontSizes.xs,
    color: colors.teal,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  heroHeadline: {
    fontSize: 40,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 46,
    textAlign: "center",
    marginBottom: spacing[4],
  },
  heroAccent: { color: colors.teal, fontStyle: "italic" },
  heroSub: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
    marginBottom: spacing[6],
  },
  ctaPrimary: {
    backgroundColor: colors.teal,
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
    marginBottom: spacing[3],
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaPrimaryText: { color: "#0A0B14", fontSize: fontSizes.base, fontWeight: "700" },
  ctaSecondary: {
    borderRadius: 100,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
    marginBottom: spacing[4],
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  ctaSecondaryText: { color: colors.textPrimary, fontSize: fontSizes.base, fontWeight: "600" },
  trustLine: { fontSize: 11, color: "rgba(139,163,191,0.45)", textAlign: "center" },
  clockWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 24,
    opacity: 0.92,
  },

  // Sections
  section: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[7],
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.teal,
    textTransform: "uppercase",
    marginBottom: spacing[2],
  },
  headline: {
    fontSize: 30,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 36,
    marginBottom: spacing[3],
  },
  headlineSmall: { fontSize: fontSizes.xl, fontWeight: "600", color: colors.textPrimary },
  body: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 24 },
  accentText: { color: colors.teal },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: spacing[4],
  },
  seeAll: { fontSize: fontSizes.sm, color: colors.teal, fontWeight: "600" },

  // Features
  featuresSection: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[7],
    paddingBottom: spacing[7],
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    gap: spacing[3],
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[4],
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: radii.lg,
    padding: spacing[4],
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureIconEmoji: { fontSize: 20 },
  featureBody: { flex: 1 },
  featureTitle: { fontSize: fontSizes.base, fontWeight: "700", marginBottom: 4 },
  featureDesc: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },

  // Frequencies
  freqRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
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
  freqHz: { fontSize: 11, fontWeight: "700" },
  freqInfo: { flex: 1 },
  freqName: { fontSize: fontSizes.base, color: colors.textPrimary, fontWeight: "600", marginBottom: 2 },
  freqBenefit: { fontSize: fontSizes.xs, color: colors.textMuted },
  freqPlay: { fontSize: fontSizes.base, paddingLeft: spacing[3] },

  // Testimonial
  testimonialSection: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[8],
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(0,212,170,0.03)",
    alignItems: "center",
  },
  starsRow: { flexDirection: "row", gap: 4, marginBottom: spacing[4] },
  star: { fontSize: 16, color: "#F2C94C" },
  testimonialQuote: {
    fontSize: 19,
    fontStyle: "italic",
    color: "#C8D8E8",
    lineHeight: 29,
    textAlign: "center",
    marginBottom: spacing[3],
  },
  testimonialAttrib: { fontSize: fontSizes.sm, color: colors.textMuted, textAlign: "center" },

  // Final CTA
  finalCta: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[8],
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
  },
  finalHeadline: {
    fontSize: 30,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 36,
    textAlign: "center",
    marginBottom: spacing[3],
  },
  finalSub: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  ctaPremium: {
    borderRadius: 100,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
    marginTop: spacing[3],
    backgroundColor: "rgba(139,92,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.30)",
  },
  ctaPremiumText: { color: "#A78BFA", fontSize: fontSizes.base, fontWeight: "600" },
});

