/**
 * Home Screen — Rise In Harmony Mobile
 *
 * Full parity with the web home page (Home.tsx):
 * Hero (clock + headline + CTAs)
 * → Revelation (6 pillars)
 * → TrueHz strip
 * → Science video (Solfeggio)
 * → Silent Healing Hz video
 * → Solfeggio frequency grid
 * → Daily Rituals (Morning / Afternoon / Evening)
 * → Testimonial + final CTA
 * → Pricing
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
  Linking,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  AlarmClock,
  Waves,
  Headphones,
  Sparkles,
  Activity,
  Stethoscope,
  Sunrise,
  Brain,
  Moon,
  Star,
} from "lucide-react-native";
import Svg, {
  Circle,
  Line,
  Text as SvgText,
  Rect,
  Defs,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { colors, spacing, fontSizes, radii } from "@rih/ui-tokens";
import { useAuthStore } from "@/store/authStore";
import { usePurchases } from "@/hooks/usePurchases";

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

// ─── Analog Clock ─────────────────────────────────────────────────────────────
function AnalogClock({ size = 180 }: { size?: number }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 8;

  const sec = time.getSeconds();
  const min = time.getMinutes();
  const hr = time.getHours() % 12;
  const h12 = time.getHours() > 12 ? time.getHours() - 12 : time.getHours() === 0 ? 12 : time.getHours();
  const ampm = time.getHours() >= 12 ? "PM" : "AM";
  const digital = `${String(h12).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

  const secAngle = ((sec) / 60) * 2 * Math.PI - Math.PI / 2;
  const minAngle = ((min + sec / 60) / 60) * 2 * Math.PI - Math.PI / 2;
  const hrAngle = ((hr + min / 60) / 12) * 2 * Math.PI - Math.PI / 2;

  const toXY = (a: number, len: number) => ({
    x: cx + Math.cos(a) * len,
    y: cy + Math.sin(a) * len,
  });

  const hrEnd = toXY(hrAngle, R * 0.50);
  const minEnd = toXY(minAngle, R * 0.70);
  const secEnd = toXY(secAngle, R * 0.82);
  const secTail = toXY(secAngle + Math.PI, R * 0.18);

  // 60 tick marks
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
    const isQ = i % 15 === 0;
    const isMajor = i % 5 === 0;
    return {
      outer: toXY(a, R - 2),
      inner: toXY(a, isQ ? R - 14 : isMajor ? R - 9 : R - 5),
      isQ, isMajor,
    };
  });

  const TEAL = "#00D4AA";

  return (
    <View style={[styles.clockWrapper]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="face" cx="50%" cy="38%" r="65%">
            <Stop offset="0%" stopColor="#0E2030" />
            <Stop offset="55%" stopColor="#060C14" />
            <Stop offset="100%" stopColor="#020508" />
          </RadialGradient>
        </Defs>

        {/* Bezel */}
        <Circle cx={cx} cy={cy} r={R + 4} fill="none" stroke={TEAL} strokeWidth={1.2} strokeOpacity={0.65} />
        <Circle cx={cx} cy={cy} r={R + 1} fill="none" stroke={TEAL} strokeWidth={0.6} strokeOpacity={0.15} />

        {/* Face */}
        <Circle cx={cx} cy={cy} r={R} fill="url(#face)" />

        {/* Ticks */}
        {ticks.map((t, i) => (
          <Line
            key={i}
            x1={t.outer.x} y1={t.outer.y}
            x2={t.inner.x} y2={t.inner.y}
            stroke={t.isQ ? TEAL : t.isMajor ? "rgba(0,212,170,0.55)" : "rgba(0,212,170,0.18)"}
            strokeWidth={t.isQ ? 2 : t.isMajor ? 1.2 : 0.7}
            strokeLinecap="round"
          />
        ))}

        {/* Hour numerals */}
        {([{ n: "12", i: 0 }, { n: "3", i: 3 }, { n: "6", i: 6 }, { n: "9", i: 9 }] as const).map(({ n, i }) => {
          const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
          const pos = toXY(a, R - 18);
          return (
            <SvgText key={n} x={pos.x} y={pos.y + 4} fontSize={10} fill={TEAL} fillOpacity={0.9} textAnchor="middle">
              {n}
            </SvgText>
          );
        })}

        {/* Digital time box */}
        <Rect x={cx - 22} y={cy + 12} width={44} height={18} rx={4} ry={4} fill="rgba(0,0,0,0.45)" stroke={TEAL} strokeWidth={0.7} strokeOpacity={0.2} />
        <SvgText x={cx} y={cy + 23} fontSize={10} fill={TEAL} fillOpacity={0.9} textAnchor="middle">{digital}</SvgText>
        <SvgText x={cx} y={cy + 36} fontSize={7} fill={TEAL} fillOpacity={0.55} textAnchor="middle">{ampm}</SvgText>

        {/* Hour hand */}
        <Line x1={cx} y1={cy} x2={hrEnd.x} y2={hrEnd.y} stroke="#C8E8F0" strokeWidth={2.5} strokeLinecap="round" />

        {/* Minute hand */}
        <Line x1={cx} y1={cy} x2={minEnd.x} y2={minEnd.y} stroke={TEAL} strokeWidth={2} strokeLinecap="round" />

        {/* Second hand */}
        <Line x1={secTail.x} y1={secTail.y} x2={secEnd.x} y2={secEnd.y} stroke="#00FFC8" strokeWidth={1} strokeLinecap="round" />

        {/* Center jewel */}
        <Circle cx={cx} cy={cy} r={4} fill="#050A10" stroke={TEAL} strokeWidth={1.5} />
        <Circle cx={cx} cy={cy} r={1.8} fill={TEAL} />
      </Svg>
    </View>
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
const APP_PILLARS = [
  { Icon: AlarmClock,   label: "Healing Alarm",     sub: "432Hz · 528Hz · δ→θ→α",         color: "#00D4AA", route: "/(tabs)/alarm"   },
  { Icon: Waves,        label: "Frequency Studio",  sub: "1–22,000 Hz · DDS precision",    color: "#8B5CF6", route: "/(tabs)/studio"  },
  { Icon: Headphones,   label: "Meditation Player", sub: "9 TrueHz tracks · up to 60 min", color: "#3B82F6", route: "/(tabs)/meditation" },
  { Icon: Sparkles,     label: "Reiki Sessions",    sub: "5-phase · 432Hz tri-layer",      color: "#A78BFA", route: "/(tabs)/reiki"   },
  { Icon: Activity,     label: "Brainwave Library", sub: "Delta · Theta · Alpha · Gamma",  color: "#F59E0B", route: "/(tabs)/library" },
  { Icon: Stethoscope,  label: "AI Prescription",   sub: "Personalized frequency session", color: "#EC4899", route: "/(tabs)/player"  },
] as const;

const SOLFEGGIO_PREVIEW = [
  { hz: 174, name: "Foundation",   benefit: "Deep calm & security",  color: "#6B7A99" },
  { hz: 396, name: "Liberation",   benefit: "Release guilt & fear",  color: "#EF4444" },
  { hz: 528, name: "Miracle Tone", benefit: "DNA repair & renewal",  color: "#F59E0B" },
  { hz: 639, name: "Heart",        benefit: "Connection & empathy",  color: "#22C55E" },
  { hz: 741, name: "Awakening",    benefit: "Clarity & expression",  color: "#3B82F6" },
  { hz: 963, name: "Crown",        benefit: "Divine consciousness",  color: "#00D4AA" },
];

const RITUALS = [
  {
    time: "Morning", Icon: Sunrise, title: "Wake in resonance",
    body: "Replace the jarring alarm with a 528Hz sunrise. Progressive fade-in over 5 minutes — no cortisol spike, no snooze-button dread.",
    cta: "Set Healing Alarm", route: "/(tabs)/alarm", color: "#F2C94C",
  },
  {
    time: "Afternoon", Icon: Brain, title: "Drop into deep work",
    body: "Alpha binaural beats at 10Hz create a relaxed-alert brainwave state. Layer in rain and let a 90-minute focus block fly by.",
    cta: "Open Studio", route: "/(tabs)/studio", color: "#00D4AA",
  },
  {
    time: "Evening", Icon: Moon, title: "Unwind into sleep",
    body: "Delta binaural tones with an ocean layer and a sleep timer that fades everything to silence — a wind-down ritual your evenings will keep.",
    cta: "Start Meditation", route: "/(tabs)/meditation", color: "#8B5CF6",
  },
] as const;

const PLANS = [
  {
    id: "monthly" as const,
    label: "Monthly",
    price: "$7.99",
    period: "/month",
    features: ["All 22+ frequencies", "9 TrueHz meditations", "Sound Studio", "Healing Alarm", "Premium Player"],
    color: "#00D4AA",
    highlight: false,
  },
  {
    id: "annual" as const,
    label: "Annual",
    price: "$49.99",
    period: "/year",
    badge: "7-Day Free Trial",
    features: ["Everything in Monthly", "Save 48% vs monthly", "7-day free trial", "Priority support"],
    color: "#8B5CF6",
    highlight: true,
  },
  {
    id: "lifetime" as const,
    label: "Founder Lifetime",
    price: "$149.99",
    period: "one-time",
    features: ["Everything, forever", "All future features", "Founder badge", "Lifetime access"],
    color: "#F59E0B",
    highlight: false,
  },
] as const;

// ─── Main component ───────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { purchaseProduct } = usePurchases();
  const greeting = getGreeting();
  const dayName = DAYS[new Date().getDay()];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ══════════════════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════════════════ */}
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
            Wake gently with 432Hz or 528Hz healing frequencies. No jarring buzz — just a soft, progressive rise that aligns your body and mind for the day ahead.
          </Text>

          {/* Analog Clock */}
          <AnalogClock size={180} />

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

        {/* ══════════════════════════════════════════════════════════════════
            REVELATION — 6 pillars
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.eyebrow}>YOU DOWNLOADED AN ALARM.</Text>
          <Text style={styles.headline}>
            {"You got a complete\n"}
            <Text style={styles.accentText}>healing practice.</Text>
          </Text>
          <Text style={styles.body}>
            Six integrated tools — each built on the same precision frequency engine that powers your alarm.
          </Text>

          <View style={styles.pillarsGrid}>
            {APP_PILLARS.map((p, i) => (
              <TouchableOpacity
                key={p.label}
                style={[
                  styles.pillarCard,
                  i === 0 && { backgroundColor: p.color + "18", borderColor: p.color + "40" },
                ]}
                onPress={() => router.push(p.route as any)}
                activeOpacity={0.8}
              >
                {i === 0 && (
                  <View style={[styles.startHereBadge, { backgroundColor: p.color + "20" }]}>
                    <Text style={[styles.startHereText, { color: p.color }]}>Start here</Text>
                  </View>
                )}
                <View style={[styles.pillarIcon, { backgroundColor: p.color + "15", borderColor: p.color + "25" }]}>
                  <p.Icon size={16} color={p.color} strokeWidth={1.8} />
                </View>
                <Text style={styles.pillarLabel}>{p.label}</Text>
                <Text style={styles.pillarSub}>{p.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            TRUEHZ STRIP
        ══════════════════════════════════════════════════════════════════ */}
        <TouchableOpacity
          style={styles.truehzStrip}
          onPress={() => router.push("/technology" as any)}
          activeOpacity={0.85}
        >
          <View style={styles.truehzIcon}>
            <Text style={styles.truehzHz}>Hz</Text>
          </View>
          <View style={styles.truehzBody}>
            <Text style={styles.truehzTitle}>TrueHz™ Precision Tuning</Text>
            <Text style={styles.truehzDesc}>
              Most apps play compressed recordings. Every tone here is generated live on your device using Direct Digital Synthesis — accurate to 0.01 Hz. When we say 528 Hz, you get 528.00 Hz.
            </Text>
          </View>
          <Text style={styles.truehzArrow}>›</Text>
        </TouchableOpacity>

        {/* ══════════════════════════════════════════════════════════════════
            SCIENCE VIDEO — Solfeggio
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>THE SCIENCE</Text>
            <View style={styles.dividerLine} />
          </View>
          <Text style={styles.sectionHeadline}>Why healing frequencies work</Text>
          <Text style={styles.body}>
            Everything vibrates. Your cells, your brain, the Earth itself. Watch how specific frequencies guide your body into healing states.
          </Text>

          <TouchableOpacity
            style={styles.videoWrapper}
            onPress={() => Linking.openURL("https://files.manuscdn.com/user_upload_by_module/session_file/110672315/jOZiosROKCzQdWiM.mp4")}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/ryPsMuvFrztMNPat.jpg" }}
              style={styles.video}
              resizeMode="cover"
            />
            <View style={styles.playOverlay}>
              <View style={styles.playBtn}>
                <Text style={styles.playBtnText}>▶</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Silent Healing Hz video */}
          <View style={styles.silentHzSection}>
            <View style={[styles.sectionDivider, { marginBottom: 8 }]}>
              <View style={[styles.dividerLine, { backgroundColor: "#FBBF24" }]} />
              <Text style={[styles.dividerLabel, { color: "#FBBF24" }]}>SILENT HEALING HZ</Text>
              <View style={[styles.dividerLine, { backgroundColor: "#FBBF24" }]} />
            </View>
            <Text style={styles.body}>
              Some frequencies are below the range of hearing. They are felt, not heard — and they work.
            </Text>
            <TouchableOpacity
              style={[styles.videoWrapper, { borderColor: "rgba(251,191,36,0.3)" }]}
              onPress={() => Linking.openURL("https://files.manuscdn.com/user_upload_by_module/session_file/110672315/FueLTmWRwbXWxsnA.mp4")}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/IgMHfxddpqkmRQxH.png" }}
                style={styles.video}
                resizeMode="cover"
              />
              <View style={styles.playOverlay}>
                <View style={[styles.playBtn, { borderColor: "rgba(251,191,36,0.6)", backgroundColor: "rgba(251,191,36,0.15)" }]}>
                  <Text style={[styles.playBtnText, { color: "#FBBF24" }]}>▶</Text>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/library" as any)}>
              <Text style={[styles.seeAll, { color: "#FBBF24", textAlign: "center", marginTop: 8 }]}>
                Explore Silent Healing Hz in the Library →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Journey CTA */}
          <TouchableOpacity
            style={styles.journeyCta}
            onPress={() => router.push("/(tabs)/journey" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.journeyCtaText}>Discover Your Healing Journey  ›</Text>
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            SOLFEGGIO FREQUENCIES GRID
        ══════════════════════════════════════════════════════════════════ */}
        <View style={[styles.section, { backgroundColor: "#0D0F1E" }]}>
          <Text style={[styles.eyebrow, { color: "#8B5CF6" }]}>THE SOLFEGGIO SCALE</Text>
          <Text style={styles.sectionHeadline}>Ancient tones. Modern healing.</Text>

          <View style={styles.solfeggioGrid}>
            {SOLFEGGIO_PREVIEW.map((freq) => (
              <TouchableOpacity
                key={freq.hz}
                style={[styles.freqCard, { borderColor: freq.color + "22" }]}
                onPress={() => router.push("/(tabs)/library" as any)}
                activeOpacity={0.8}
              >
                <View style={styles.freqCardHeader}>
                  <View style={[styles.freqDot, { backgroundColor: freq.color + "18", borderColor: freq.color + "30" }]}>
                    <Text style={[styles.freqHz, { color: freq.color }]}>{freq.hz}</Text>
                  </View>
                  <View style={styles.freqInfo}>
                    <Text style={styles.freqName}>{freq.name}</Text>
                    <Text style={styles.freqBenefit}>{freq.benefit}</Text>
                  </View>
                  <Text style={[styles.freqPlay, { color: freq.color }]}>▶</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={() => router.push("/(tabs)/library" as any)}>
            <Text style={[styles.seeAll, { textAlign: "center", marginTop: spacing[4] }]}>
              Explore all 28 frequencies  ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            DAILY RITUALS
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionHeadline}>Built for your daily rituals.</Text>
          {RITUALS.map((r) => (
            <View key={r.time} style={[styles.ritualCard, { borderColor: r.color + "20" }]}>
              <View style={styles.ritualHeader}>
                <r.Icon size={18} color={r.color} strokeWidth={1.8} />
                <Text style={[styles.ritualTime, { color: r.color }]}>{r.time}</Text>
              </View>
              <Text style={styles.ritualTitle}>{r.title}</Text>
              <Text style={styles.ritualBody}>{r.body}</Text>
              <TouchableOpacity onPress={() => router.push(r.route as any)}>
                <Text style={[styles.ritualCta, { color: r.color }]}>{r.cta}  ›</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            TESTIMONIAL + FINAL CTA
        ══════════════════════════════════════════════════════════════════ */}
        <View style={[styles.section, { alignItems: "center" }]}>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={16} color="#F2C94C" fill="#F2C94C" strokeWidth={0} />
            ))}
          </View>
          <Text style={styles.testimonialQuote}>
            "I downloaded it for the alarm. I stayed for the frequencies. My mornings are completely different now."
          </Text>
          <Text style={styles.testimonialAttrib}>— Early adopter, Premium member</Text>

          <Text style={[styles.headline, { textAlign: "center", marginTop: spacing[6] }]}>
            {"Your body already knows\n"}
            <Text style={styles.accentText}>how to heal.</Text>
          </Text>
          <Text style={[styles.body, { textAlign: "center" }]}>
            We give it the frequency to remember. Start free — three healing frequencies, no sign-up required.
          </Text>

          <TouchableOpacity
            style={[styles.ctaPrimary, { marginTop: spacing[5] }]}
            onPress={() => router.push("/(tabs)/alarm")}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaPrimaryText}>⏰  Set Your Healing Alarm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctaSecondary, { borderColor: "rgba(139,92,246,0.30)", backgroundColor: "rgba(139,92,246,0.12)" }]}
            onPress={() => router.push("/paywall" as any)}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaSecondaryText, { color: "#A78BFA" }]}>✦  Go Premium — from $4.17/mo</Text>
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            PRICING
        ══════════════════════════════════════════════════════════════════ */}
        <View style={[styles.section, { backgroundColor: "#080910" }]}>
          <Text style={styles.eyebrow}>PRICING</Text>
          <Text style={styles.sectionHeadline}>Start free. Upgrade when ready.</Text>
          <Text style={[styles.body, { textAlign: "center", marginBottom: spacing[5] }]}>
            Seven frequencies, seven meditations, and the full alarm — free forever. No credit card.
          </Text>

          {PLANS.map((plan) => (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                { borderColor: plan.color + (plan.highlight ? "50" : "20") },
                plan.highlight && { backgroundColor: plan.color + "0A" },
              ]}
            >
              {plan.highlight && (
                <View style={[styles.planBadge, { backgroundColor: plan.color + "20" }]}>
                  <Text style={[styles.planBadgeText, { color: plan.color }]}>{"badge" in plan ? plan.badge : "Most Popular"}</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <Text style={styles.planLabel}>{plan.label}</Text>
                <View style={styles.planPriceRow}>
                  <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </View>
              </View>
              {plan.features.map((f) => (
                <View key={f} style={styles.planFeatureRow}>
                  <Text style={[styles.planCheck, { color: plan.color }]}>✓</Text>
                  <Text style={styles.planFeature}>{f}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.planCta, { backgroundColor: plan.color + (plan.highlight ? "FF" : "18"), borderColor: plan.color + "40" }]}
                onPress={() => purchaseProduct(plan.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.planCtaText, { color: plan.highlight ? "#0A0B14" : plan.color }]}>
                  {plan.id === "annual" ? "Start 7-Day Free Trial" : plan.id === "lifetime" ? "Claim Founder Lifetime" : "Subscribe Monthly"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Rise In Harmony. Begin every morning in resonance.</Text>
          <View style={styles.footerLinks}>
            {[["Privacy", "https://www.riseinharmony.com/privacy"], ["Terms", "https://www.riseinharmony.com/terms"], ["Contact", "mailto:hello@riseinharmony.com"]].map(([l, href]) => (
              <TouchableOpacity key={l} onPress={() => Linking.openURL(href)}>
                <Text style={styles.footerLink}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0B14" },
  scroll: { paddingBottom: 40 },

  // Hero
  hero: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[8],
    paddingBottom: spacing[8],
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "transparent",
  },
  greetingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    fontSize: 12,
    fontWeight: "600",
    color: colors.teal,
    letterSpacing: 0.5,
  },
  heroHeadline: {
    fontSize: 38,
    fontWeight: "600",
    color: "#E8EDF5",
    textAlign: "center",
    lineHeight: 44,
    marginBottom: spacing[3],
  },
  heroAccent: {
    color: colors.teal,
    fontStyle: "italic",
  },
  heroSub: {
    fontSize: fontSizes.base,
    color: "#8FA3BF",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing[4],
    maxWidth: 320,
  },
  clockWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing[4],
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
  ctaSecondaryText: { color: "#E8EDF5", fontSize: fontSizes.base, fontWeight: "600" },
  trustLine: { fontSize: 11, color: "rgba(139,163,191,0.45)", textAlign: "center" },

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
    fontSize: 28,
    fontWeight: "600",
    color: "#E8EDF5",
    lineHeight: 34,
    marginBottom: spacing[3],
  },
  sectionHeadline: {
    fontSize: 24,
    fontWeight: "600",
    color: "#E8EDF5",
    lineHeight: 30,
    marginBottom: spacing[3],
    textAlign: "center",
  },
  body: { fontSize: fontSizes.base, color: "#8FA3BF", lineHeight: 24, marginBottom: spacing[3] },
  accentText: { color: colors.teal },
  seeAll: { fontSize: fontSizes.sm, color: colors.teal, fontWeight: "600" },

  // Pillars
  pillarsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    marginTop: spacing[4],
  },
  pillarCard: {
    width: (SCREEN_W - spacing[5] * 2 - spacing[2]) / 2,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: radii.lg,
    padding: spacing[3],
    position: "relative",
    overflow: "hidden",
  },
  startHereBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
  },
  startHereText: { fontSize: 9, fontWeight: "700" },
  pillarIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[2],
  },
  pillarIconEmoji: { fontSize: 16 }, // kept for reference — replaced by Lucide
  pillarLabel: { fontSize: fontSizes.sm, fontWeight: "700", color: "#E8EDF5", marginBottom: 2 },
  pillarSub: { fontSize: 10, lineHeight: 14, color: "rgba(0,212,170,0.55)" },

  // TrueHz strip
  truehzStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    marginHorizontal: spacing[5],
    marginVertical: spacing[2],
    padding: spacing[4],
    borderRadius: radii.lg,
    backgroundColor: "rgba(0,212,170,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.25)",
  },
  truehzIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(0,212,170,0.14)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.30)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  truehzHz: { fontSize: 14, fontWeight: "700", color: colors.teal },
  truehzBody: { flex: 1 },
  truehzTitle: { fontSize: fontSizes.sm, fontWeight: "700", color: colors.teal, marginBottom: 4 },
  truehzDesc: { fontSize: 12, color: "#8FA3BF", lineHeight: 18 },
  truehzArrow: { fontSize: 20, color: colors.teal, flexShrink: 0 },

  // Section divider
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing[3],
    justifyContent: "center",
  },
  dividerLine: { width: 24, height: 1, backgroundColor: colors.teal },
  dividerLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.teal,
    textTransform: "uppercase",
  },

  // Video
  playOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,212,170,0.15)",
    borderWidth: 2,
    borderColor: "rgba(0,212,170,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  playBtnText: { fontSize: 20, color: colors.teal, marginLeft: 4 },
  videoWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.22)",
    backgroundColor: "#000",
    marginTop: spacing[3],
  },
  video: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  silentHzSection: { marginTop: spacing[6] },

  // Journey CTA
  journeyCta: {
    alignSelf: "center",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
    borderRadius: 100,
    backgroundColor: "rgba(0,212,170,0.10)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.25)",
    marginTop: spacing[4],
  },
  journeyCtaText: { fontSize: fontSizes.sm, fontWeight: "600", color: colors.teal },

  // Solfeggio grid
  solfeggioGrid: { gap: spacing[2] },
  freqCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing[3],
  },
  freqCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  freqDot: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  freqHz: { fontSize: 11, fontWeight: "700" },
  freqInfo: { flex: 1 },
  freqName: { fontSize: fontSizes.base, color: "#E8EDF5", fontWeight: "600", marginBottom: 2 },
  freqBenefit: { fontSize: fontSizes.xs, color: "#6B7A99" },
  freqPlay: { fontSize: fontSizes.base, paddingLeft: spacing[2] },

  // Rituals
  ritualCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  ritualHeader: { flexDirection: "row", alignItems: "center", gap: spacing[2], marginBottom: spacing[2] },
  ritualIcon: { fontSize: 20 }, // kept for reference — replaced by Lucide
  ritualTime: { fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  ritualTitle: { fontSize: fontSizes.base, fontWeight: "700", color: "#E8EDF5", marginBottom: spacing[2] },
  ritualBody: { fontSize: fontSizes.sm, color: "#8FA3BF", lineHeight: 20, marginBottom: spacing[3] },
  ritualCta: { fontSize: fontSizes.sm, fontWeight: "600" },

  // Testimonial
  starsRow: { flexDirection: "row", gap: 4, marginBottom: spacing[4] },
  star: { fontSize: 16, color: "#F2C94C" }, // kept for reference — replaced by Lucide
  testimonialQuote: {
    fontSize: 19,
    fontStyle: "italic",
    color: "#C8D8E8",
    lineHeight: 29,
    textAlign: "center",
    marginBottom: spacing[3],
  },
  testimonialAttrib: { fontSize: fontSizes.sm, color: "#6B7A99", textAlign: "center", marginBottom: spacing[4] },

  // Pricing
  planCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    position: "relative",
    overflow: "hidden",
  },
  planBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
    marginBottom: spacing[3],
  },
  planBadgeText: { fontSize: 11, fontWeight: "700" },
  planHeader: { marginBottom: spacing[3] },
  planLabel: { fontSize: fontSizes.sm, fontWeight: "700", color: "#8FA3BF", marginBottom: 4 },
  planPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  planPrice: { fontSize: 32, fontWeight: "700" },
  planPeriod: { fontSize: fontSizes.sm, color: "#6B7A99" },
  planFeatureRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  planCheck: { fontSize: 14, fontWeight: "700" },
  planFeature: { fontSize: fontSizes.sm, color: "#8FA3BF" },
  planCta: {
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing[4],
    borderWidth: 1,
  },
  planCtaText: { fontSize: fontSizes.base, fontWeight: "700" },

  // Footer
  footer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[6],
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    gap: spacing[3],
  },
  footerText: { fontSize: 11, color: "#4A5568", textAlign: "center" },
  footerLinks: { flexDirection: "row", gap: spacing[5] },
  footerLink: { fontSize: 12, color: "#4A5568" },
});
