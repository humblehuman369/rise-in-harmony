/**
 * AlarmFeatures — Permanent showcase page at /alarm-features
 * Presents the six new advanced alarm system features.
 */
import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";

const TEAL = "#00D4AA";
const AMBER = "#F59E0B";
const PURPLE = "#8B5CF6";
const RED = "#EF4444";
const BG = "#0A0B14";
const BG2 = "#0D0E1A";
const TEXT = "#E8EDF5";
const MUTED = "#8FA3BF";
const DIM = "#4A5568";
const BORDER = "rgba(255,255,255,0.07)";
const SERIF = "'Cormorant Garamond', serif";
const SANS = "'DM Sans', sans-serif";
const MONO = "'DM Mono', monospace";

function Badge({ label, color = TEAL }: { label: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{ width: 28, height: 1, background: color }} />
      <span style={{ fontFamily: MONO, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const, color }}>
        {label}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 style={{ fontFamily: SERIF, fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, lineHeight: 1.2, color: TEXT, marginBottom: 16 }}>
      {children}
    </h2>
  );
}

function FeaturePoint({ label, text, color = TEAL }: { label: string; text: string; color?: string }) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: 12, fontFamily: SANS, fontSize: "0.9rem", color: MUTED, lineHeight: 1.7, listStyle: "none" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, marginTop: 8, flexShrink: 0, display: "inline-block" }} />
      <span><strong style={{ color: TEXT }}>{label}:</strong> {text}</span>
    </li>
  );
}

export default function AlarmFeatures() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <Layout>
      <div style={{ background: BG, minHeight: "100vh", fontFamily: SANS }}>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section style={{ minHeight: "90vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative", overflow: "hidden", paddingTop: 80 }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 30%, rgba(0,212,170,0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.1) 0%, transparent 45%)`, pointerEvents: "none" }} />

          {/* Pulse rings */}
          {[300, 500, 700, 900].map((size, i) => (
            <div key={size} style={{ position: "absolute", top: "50%", left: "50%", width: size, height: size, borderRadius: "50%", border: `1px solid rgba(0,212,170,${0.25 - i * 0.05})`, transform: "translate(-50%,-50%)", animation: `frequency-pulse ${2.5 + i * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.3}s`, pointerEvents: "none" }} />
          ))}

          <div style={{ position: "relative", zIndex: 2, maxWidth: 820, padding: "0 32px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.25)", borderRadius: 100, padding: "6px 16px", fontFamily: MONO, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: TEAL, marginBottom: 28 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: TEAL, boxShadow: `0 0 8px ${TEAL}`, display: "inline-block" }} />
              New Feature Release
            </div>

            <h1 style={{ fontFamily: SERIF, fontSize: "clamp(3rem, 6vw, 5.5rem)", fontWeight: 700, lineHeight: 1.1, color: "#fff", textShadow: "0 0 60px rgba(0,212,170,0.25)", marginBottom: 24 }}>
              The World's First<br />Brain-Guided Healing Alarm
            </h1>

            <p style={{ fontFamily: SERIF, fontSize: "clamp(1.2rem, 2.5vw, 1.7rem)", fontStyle: "italic", color: MUTED, marginBottom: 48, lineHeight: 1.5 }}>
              Wake up the way your brain was designed to —<br />gently, scientifically, beautifully.
            </p>

            {/* Brainwave pills */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 48, flexWrap: "wrap" as const }}>
              {[
                { sym: "δ", name: "Delta", hz: "3Hz", color: PURPLE },
                { sym: "→", name: "", hz: "", color: DIM },
                { sym: "θ", name: "Theta", hz: "6Hz", color: TEAL },
                { sym: "→", name: "", hz: "", color: DIM },
                { sym: "α", name: "Alpha", hz: "10Hz", color: AMBER },
              ].map((item, i) =>
                item.name ? (
                  <div key={i} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4, padding: "12px 20px", border: `1px solid ${item.color}40`, background: `${item.color}0D`, borderRadius: 10, minWidth: 90 }}>
                    <span style={{ fontFamily: SERIF, fontSize: "2rem", fontStyle: "italic", fontWeight: 700, color: item.color }}>{item.sym}</span>
                    <span style={{ fontFamily: MONO, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: MUTED }}>{item.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: DIM }}>{item.hz}</span>
                  </div>
                ) : (
                  <span key={i} style={{ color: DIM, fontSize: "1.4rem" }}>{item.sym}</span>
                )
              )}
            </div>

            <Link href="/alarm">
              <a style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,212,170,0.15)", border: "1.5px solid rgba(0,212,170,0.5)", color: TEAL, fontFamily: SANS, fontWeight: 700, fontSize: "1rem", padding: "16px 36px", borderRadius: 8, textDecoration: "none" }}>
                Set Your Healing Alarm →
              </a>
            </Link>
          </div>
        </section>

        {/* ── BENEFITS ─────────────────────────────────────────── */}
        <section style={{ background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: "80px 0" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 40 }}>
              {[
                { icon: "🧠", title: "Eliminates Sleep Inertia", desc: "Guides your brain from deep sleep to wakefulness naturally, removing the cortisol spike and hours of grogginess.", color: TEAL },
                { icon: "🌅", title: "Sunrise Simulation", desc: "The wake screen shifts from warm amber to daylight white, mimicking natural dawn light to regulate your circadian rhythm.", color: AMBER },
                { icon: "🎯", title: "Breaks the Snooze Habit", desc: "The Alarm Mission requires a 60-second morning ritual before dismissal, making zombie-snoozing structurally impossible.", color: PURPLE },
                { icon: "🎵", title: "Free Healing Frequencies", desc: "432Hz and 528Hz are now free for all users — delivering the brand promise of healing frequency science every morning.", color: TEAL },
              ].map((b) => (
                <div key={b.title} style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", background: `${b.color}1A` }}>{b.icon}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: "1rem", color: TEXT }}>{b.title}</div>
                  <div style={{ fontFamily: SANS, fontSize: "0.88rem", color: MUTED, lineHeight: 1.6 }}>{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────── */}
        <section style={{ padding: "100px 0" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
            <Badge label="Six New Features" />
            <SectionTitle>An alarm system built on <span style={{ color: TEAL }}>neuroscience and healing</span></SectionTitle>
            <p style={{ fontFamily: SANS, fontSize: "1.1rem", color: MUTED, maxWidth: 640, lineHeight: 1.7, marginBottom: 80 }}>
              Every feature was designed with a single question: what does the brain actually need to transition from sleep to wakefulness in the healthiest, most harmonious way possible?
            </p>

            {/* Feature 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 100 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: DIM, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 12 }}>Feature 01</div>
                <h3 style={{ fontFamily: SERIF, fontSize: "2.4rem", fontWeight: 700, lineHeight: 1.2, color: TEXT, marginBottom: 20 }}>
                  Deep Sleep Wake<br /><span style={{ color: PURPLE }}>δ → θ → α Sequence</span>
                </h3>
                <p style={{ fontFamily: SANS, fontSize: "0.95rem", color: MUTED, lineHeight: 1.8, marginBottom: 24 }}>
                  The world's first alarm that sweeps binaural beat frequencies in real time, guiding your brain through its natural wake progression. The DDS engine updates the frequency every 5 seconds — phase-continuous, with zero clicks or pops.
                </p>
                <ul style={{ padding: 0 }}>
                  <FeaturePoint label="Delta Phase (0–40%)" text="200Hz carrier + 3Hz beat. Meets the brain in deep sleep at whisper volume." color={PURPLE} />
                  <FeaturePoint label="Theta Phase (40–75%)" text="Beat sweeps to 6Hz. The hypnagogic threshold — creative and dream-like." color={TEAL} />
                  <FeaturePoint label="Alpha Phase (75–100%)" text="Beat sweeps to 10Hz. Relaxed, clear wakefulness at full resonance." color={AMBER} />
                  <FeaturePoint label="Live indicator" text="δ / θ / α phase shown on the wake screen in real time." color={TEAL} />
                </ul>
                <a href="/deep-sleep-wake" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  marginTop: 24, padding: '10px 20px',
                  border: `1px solid ${PURPLE}50`,
                  color: PURPLE, textDecoration: 'none',
                  fontFamily: SANS, fontSize: '0.85rem', fontWeight: 700,
                  background: `${PURPLE}10`,
                  letterSpacing: '0.02em',
                }}>
                  ▶ Watch the video
                </a>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
                <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ width: "40%", background: PURPLE, boxShadow: `0 0 12px ${PURPLE}80` }} />
                  <div style={{ width: "35%", background: TEAL, boxShadow: `0 0 12px ${TEAL}80` }} />
                  <div style={{ width: "25%", background: AMBER, boxShadow: `0 0 12px ${AMBER}80` }} />
                </div>
                <div style={{ display: "flex", fontFamily: MONO, fontSize: "0.68rem", color: DIM, marginBottom: 24 }}>
                  <span style={{ width: "40%" }}>0%–40%</span>
                  <span style={{ width: "35%" }}>40%–75%</span>
                  <span style={{ width: "25%" }}>75%–100%</span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { sym: "δ Delta", hz: "200Hz + 3Hz", desc: "Deep sleep. Subconscious priming begins.", color: PURPLE },
                    { sym: "θ Theta", hz: "200Hz + 6Hz", desc: "Hypnagogic threshold. Creative state.", color: TEAL },
                    { sym: "α Alpha", hz: "200Hz + 10Hz", desc: "Relaxed wakefulness. Full resonance.", color: AMBER },
                  ].map((p) => (
                    <div key={p.sym} style={{ flex: 1, border: `1px solid ${p.color}30`, background: `${p.color}08`, borderRadius: 10, padding: 14 }}>
                      <div style={{ fontFamily: SERIF, fontSize: "1.1rem", fontStyle: "italic", fontWeight: 700, color: p.color, marginBottom: 4 }}>{p.sym}</div>
                      <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: DIM, marginBottom: 8 }}>{p.hz}</div>
                      <div style={{ fontFamily: SANS, fontSize: "0.78rem", color: MUTED, lineHeight: 1.5 }}>{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 100 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: 200, gap: 12, marginBottom: 16 }}>
                  {[
                    { h: 44, pct: "22%", label: "Whisper", bg: TEAL, opacity: 0.4 },
                    { h: 120, pct: "60%", label: "Rise", bg: `linear-gradient(to top, ${TEAL}, #7AE68A)`, opacity: 1 },
                    { h: 176, pct: "88%", label: "Full", bg: `linear-gradient(to top, #7AE68A, ${AMBER})`, opacity: 1 },
                    { h: 200, pct: "100%", label: "Persistent", bg: AMBER, opacity: 1 },
                  ].map((bar) => (
                    <div key={bar.label} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8, flex: 1 }}>
                      <div style={{ width: "100%", height: bar.h, background: bar.bg, opacity: bar.opacity, borderRadius: "4px 4px 0 0" }} />
                      <div style={{ fontFamily: MONO, fontSize: "0.7rem", color: TEXT }}>{bar.pct}</div>
                      <div style={{ fontFamily: SANS, fontSize: "0.7rem", color: MUTED, fontWeight: 600 }}>{bar.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 1, background: BORDER, marginBottom: 12 }} />
                <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: DIM, textAlign: "center" as const }}>Stage timing controlled by Sleep Profile</p>
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: DIM, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 12 }}>Feature 02</div>
                <h3 style={{ fontFamily: SERIF, fontSize: "2.4rem", fontWeight: 700, lineHeight: 1.2, color: TEXT, marginBottom: 20 }}>
                  4-Stage Progressive<br /><span style={{ color: TEAL }}>Volume Escalation</span>
                </h3>
                <p style={{ fontFamily: SANS, fontSize: "0.95rem", color: MUTED, lineHeight: 1.8, marginBottom: 24 }}>
                  Heavy sleepers don't need a louder alarm — they need a smarter one. Four precisely timed stages replace the binary "silent to full blast" of conventional alarms.
                </p>
                <ul style={{ padding: 0 }}>
                  <FeaturePoint label="Whisper (5%→22%)" text="Subconscious priming. The healing frequency enters awareness before the conscious mind wakes." />
                  <FeaturePoint label="Rise (22%→60%)" text="Clearly audible, gentle. The body begins to stir naturally." />
                  <FeaturePoint label="Full (60%→88%)" text="Full healing resonance. Unmistakable but never jarring." />
                  <FeaturePoint label="Persistent (88%→100%)" text="Sustained presence. Cannot be slept through." />
                </ul>
              </div>
            </div>

            {/* Feature 3 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 100 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: DIM, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 12 }}>Feature 03</div>
                <h3 style={{ fontFamily: SERIF, fontSize: "2.4rem", fontWeight: 700, lineHeight: 1.2, color: TEXT, marginBottom: 20 }}>
                  Sleep Profile<br /><span style={{ color: AMBER }}>Personalisation</span>
                </h3>
                <p style={{ fontFamily: SANS, fontSize: "0.95rem", color: MUTED, lineHeight: 1.8, marginBottom: 24 }}>
                  One alarm setting does not fit all. Set your Sleep Profile once and the app automatically adjusts the escalation timing every morning — no manual adjustment needed.
                </p>
                <ul style={{ padding: 0 }}>
                  <FeaturePoint label="Light Sleeper" text="Extended 8-minute gradual escalation for those who wake easily." color={TEAL} />
                  <FeaturePoint label="Normal" text="Balanced 6-minute escalation — the default for most users." color={PURPLE} />
                  <FeaturePoint label="Heavy Sleeper" text="Compressed 3-minute curve that skips the Whisper stage." color={AMBER} />
                  <FeaturePoint label="Very Heavy Sleeper" text="Escalates to Persistent in 4 minutes for those who historically sleep through alarms." color={RED} />
                </ul>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { label: "Light Sleeper", desc: "Slow, gradual 8-min escalation", color: TEAL, pct: "100%" },
                  { label: "Normal", desc: "Balanced 6-min escalation", color: PURPLE, pct: "75%" },
                  { label: "Heavy Sleeper", desc: "Fast 3-min escalation", color: AMBER, pct: "37%" },
                  { label: "Very Heavy", desc: "Rapid 4-min escalation", color: RED, pct: "50%" },
                ].map((p) => (
                  <div key={p.label} style={{ padding: 18, border: `1px solid ${BORDER}`, borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.9rem", color: p.color, marginBottom: 6 }}>{p.label}</div>
                    <div style={{ fontFamily: SANS, fontSize: "0.78rem", color: MUTED, marginBottom: 12 }}>{p.desc}</div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                      <div style={{ width: p.pct, height: "100%", background: p.color, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 4 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 100 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { hz: "432", name: "Natural Harmony", desc: "The most universally loved healing frequency. Associated with calm, balance, and natural resonance.", color: TEAL },
                  { hz: "528", name: "Love Frequency", desc: "The most searched healing frequency. Associated with transformation and cellular healing.", color: AMBER },
                ].map((f) => (
                  <div key={f.hz} style={{ padding: 24, border: `1px solid ${f.color}35`, borderRadius: 16, background: `radial-gradient(circle at center, ${f.color}12 0%, transparent 70%)`, textAlign: "center" as const, position: "relative" as const }}>
                    <div style={{ position: "absolute" as const, top: 10, right: 10, fontFamily: MONO, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "1.5px", background: `${f.color}18`, border: `1px solid ${f.color}40`, color: f.color, padding: "2px 7px", borderRadius: 4 }}>FREE</div>
                    <div style={{ fontFamily: SERIF, fontSize: "3.2rem", fontWeight: 700, lineHeight: 1, color: f.color, textShadow: `0 0 30px ${f.color}40`, marginBottom: 4 }}>{f.hz}</div>
                    <div style={{ fontFamily: MONO, fontSize: "0.7rem", color: f.color, marginBottom: 10 }}>Hz</div>
                    <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.88rem", color: TEXT, marginBottom: 8 }}>{f.name}</div>
                    <div style={{ fontFamily: SANS, fontSize: "0.78rem", color: MUTED, lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: DIM, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 12 }}>Feature 04</div>
                <h3 style={{ fontFamily: SERIF, fontSize: "2.4rem", fontWeight: 700, lineHeight: 1.2, color: TEXT, marginBottom: 20 }}>
                  Free Healing Frequencies<br /><span style={{ color: TEAL }}>for Every User</span>
                </h3>
                <p style={{ fontFamily: SANS, fontSize: "0.95rem", color: MUTED, lineHeight: 1.8, marginBottom: 24 }}>
                  432Hz and 528Hz are now completely free for alarm use. The alarm is our core brand promise — by making these free, we remove the biggest barrier to entry and give every user a daily healing experience.
                </p>
                <ul style={{ padding: 0 }}>
                  <FeaturePoint label="Free badge" text="Both frequencies show a 'FREE' badge in the alarm editor — no subscription required." />
                  <FeaturePoint label="Brand touchpoint" text="Creates a daily healing experience for free users, building trust and driving premium conversion." />
                  <FeaturePoint label="Premium unlocks more" text="Subscribers access all 10+ Solfeggio frequencies, binaural presets, and studio mixes." />
                </ul>
              </div>
            </div>

            {/* Feature 5 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 100 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: DIM, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 12 }}>Feature 05</div>
                <h3 style={{ fontFamily: SERIF, fontSize: "2.4rem", fontWeight: 700, lineHeight: 1.2, color: TEXT, marginBottom: 20 }}>
                  Alarm Mission<br /><span style={{ color: PURPLE }}>Anti-Zombie-Snooze</span>
                </h3>
                <p style={{ fontFamily: SANS, fontSize: "0.95rem", color: MUTED, lineHeight: 1.8, marginBottom: 24 }}>
                  Snoozing is a habit loop. Pressing "I'm Awake" requires the user to complete a 60-second morning ritual before the alarm dismisses. Clinical research shows that a purposeful micro-task within 60 seconds of waking dramatically reduces the chance of falling back asleep.
                </p>
                <ul style={{ padding: 0 }}>
                  <FeaturePoint label="Three mission types" text="Rotate by snooze count to keep the experience fresh and engaging." color={PURPLE} />
                  <FeaturePoint label="Under 60 seconds" text="Each mission is brief enough to complete while still half-asleep, but purposeful enough to engage the conscious mind." color={PURPLE} />
                  <FeaturePoint label="Habit loop" text="Wake → ritual → positive emotion → open app → engage with content." color={PURPLE} />
                </ul>
              </div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
                {[
                  { icon: "💨", title: "Breathing Round", desc: "Complete one 4-7-8 breath cycle with an animated progress ring. Activates the parasympathetic nervous system in ~20 seconds.", color: TEAL },
                  { icon: "🌅", title: "Morning Intention", desc: "Answer one gratitude prompt with a word or phrase. Sets a positive cognitive frame for the entire day.", color: AMBER },
                  { icon: "🎵", title: "Frequency Recognition", desc: "Tap the correct Hz from three options while the tone plays. Confirms true wakefulness.", color: PURPLE },
                ].map((m) => (
                  <div key={m.title} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${m.color}`, borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ fontSize: "1.5rem", width: 36, textAlign: "center" as const, flexShrink: 0 }}>{m.icon}</div>
                    <div>
                      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.95rem", color: TEXT, marginBottom: 4 }}>{m.title}</div>
                      <div style={{ fontFamily: SANS, fontSize: "0.82rem", color: MUTED, lineHeight: 1.5 }}>{m.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 6 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 0 }}>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {[
                  { num: "1", title: "Initial Alarm — Original Frequency", msg: "[ Snooze 5 min (2 left) ]", color: TEAL },
                  { num: "↓", title: "", msg: "", color: DIM },
                  { num: "2", title: "1st Snooze — 174Hz Foundation Tone", msg: '"Frequency shifted to 174Hz for gentle re-entry"', color: PURPLE },
                  { num: "↓", title: "", msg: "", color: DIM },
                  { num: "3", title: "Max Snoozes — Full Persistent Volume", msg: '"⚡ Full volume — time to rise in harmony"', color: AMBER },
                ].map((s, i) =>
                  s.title ? (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", border: `1px solid ${BORDER}`, borderRadius: 10, background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 700, fontSize: "0.82rem", background: `${s.color}18`, color: s.color, flexShrink: 0 }}>{s.num}</div>
                      <div>
                        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.9rem", color: TEXT, marginBottom: 4 }}>{s.title}</div>
                        <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: DIM }}>{s.msg}</div>
                      </div>
                    </div>
                  ) : (
                    <div key={i} style={{ textAlign: "center" as const, color: DIM, fontSize: "1.1rem" }}>{s.num}</div>
                  )
                )}
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: DIM, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 12 }}>Feature 06</div>
                <h3 style={{ fontFamily: SERIF, fontSize: "2.4rem", fontWeight: 700, lineHeight: 1.2, color: TEXT, marginBottom: 20 }}>
                  Smart Adaptive Snooze<br /><span style={{ color: AMBER }}>Therapeutic Re-entry</span>
                </h3>
                <p style={{ fontFamily: SANS, fontSize: "0.95rem", color: MUTED, lineHeight: 1.8, marginBottom: 24 }}>
                  Every snooze becomes a therapeutic re-entry, not just a delay. After the first snooze, the alarm re-fires with the 174Hz Foundation Tone — a grounding, deeply calming frequency — for a gentler second wake attempt.
                </p>
                <ul style={{ padding: 0 }}>
                  <FeaturePoint label="Remaining count" text="The snooze button shows how many snoozes are left, building awareness of sleep fragmentation." color={AMBER} />
                  <FeaturePoint label="174Hz re-entry" text="After the first snooze, the Foundation Tone replaces the original frequency for a gentler second attempt." color={AMBER} />
                  <FeaturePoint label="Escalation messaging" text="After max snoozes, the button disappears and the alarm reaches full Persistent volume with a clear message." color={AMBER} />
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── ROADMAP ───────────────────────────────────────────── */}
        <section style={{ background: BG2, borderTop: `1px solid ${BORDER}`, padding: "100px 0" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
            <Badge label="Platform Roadmap" color={AMBER} />
            <SectionTitle>Web is the foundation — <span style={{ color: AMBER }}>native mobile is the future</span></SectionTitle>
            <p style={{ fontFamily: SANS, fontSize: "1.1rem", color: MUTED, maxWidth: 640, lineHeight: 1.7, marginBottom: 64 }}>
              The current web experience works beautifully when the app is open on your nightstand. The roadmap takes this further — to true system-level alarm reliability that bypasses silent mode entirely.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
              {[
                { phase: "Current", icon: "🌐", title: "Web Foundation", desc: "Full alarm system works reliably when the browser tab is open. All six new features are live at riseinharmony.com.", color: TEAL },
                { phase: "Near-Term", icon: "📱", title: "Native Mobile", desc: "Android uses STREAM_ALARM to bypass silent mode. iOS applies for Critical Alerts entitlement. Both wake the device from lock screen.", color: AMBER },
                { phase: "Future", icon: "💓", title: "HRV-Informed Wake", desc: "Integrates with Apple Health and Google Fit overnight HRV data to automatically select the optimal wake window and healing frequency.", color: PURPLE },
              ].map((col) => (
                <div key={col.phase} style={{ padding: 24, border: `1px solid ${BORDER}`, borderTop: `3px solid ${col.color}`, borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontFamily: MONO, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const, color: col.color, marginBottom: 12 }}>{col.phase}</div>
                  <div style={{ fontSize: "1.8rem", marginBottom: 12 }}>{col.icon}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: "1rem", color: TEXT, marginBottom: 10 }}>{col.title}</div>
                  <div style={{ fontFamily: SANS, fontSize: "0.85rem", color: MUTED, lineHeight: 1.6 }}>{col.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SUMMARY TABLE ─────────────────────────────────────── */}
        <section style={{ background: BG2, borderTop: `1px solid ${BORDER}`, padding: "100px 0" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
            <Badge label="Feature Summary" />
            <SectionTitle>Six features. One vision.</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, marginTop: 32 }}>
              <thead>
                <tr>
                  {["Feature", "Core Benefit", "Available"].map((h) => (
                    <th key={h} style={{ textAlign: "left" as const, fontFamily: MONO, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: TEAL, padding: "14px 20px", borderBottom: `1px solid rgba(0,212,170,0.3)` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Deep Sleep Wake (δ→θ→α)", benefit: "Brain-guided wake sequence — eliminates sleep inertia", free: true },
                  { feature: "4-Stage Volume Escalation", benefit: "Never miss an alarm again — Whisper to Persistent", free: false },
                  { feature: "Sleep Profile Personalisation", benefit: "Escalation timing matched to your sleep depth", free: false },
                  { feature: "Free 432Hz + 528Hz", benefit: "Daily healing frequency experience for everyone", free: true },
                  { feature: "Alarm Mission", benefit: "Breaks the snooze habit with a morning ritual", free: false },
                  { feature: "Smart Adaptive Snooze", benefit: "174Hz therapeutic re-entry after first snooze", free: false },
                ].map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                    <td style={{ padding: "18px 20px", borderBottom: `1px solid ${BORDER}`, fontFamily: SANS, fontWeight: 700, fontSize: "0.95rem", color: TEXT }}>{row.feature}</td>
                    <td style={{ padding: "18px 20px", borderBottom: `1px solid ${BORDER}`, fontFamily: SANS, fontSize: "0.95rem", color: MUTED }}>{row.benefit}</td>
                    <td style={{ padding: "18px 20px", borderBottom: `1px solid ${BORDER}` }}>
                      {row.free
                        ? <span style={{ fontFamily: MONO, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "1px", background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.3)", color: TEAL, padding: "3px 10px", borderRadius: 4 }}>Free</span>
                        : <span style={{ fontFamily: MONO, fontSize: "0.68rem", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: MUTED, padding: "3px 10px", borderRadius: 4 }}>All Users</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <section style={{ padding: "120px 0", textAlign: "center" as const, position: "relative" as const, overflow: "hidden" }}>
          <div style={{ position: "absolute" as const, inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(0,212,170,0.12) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" as const, zIndex: 1, maxWidth: 820, margin: "0 auto", padding: "0 32px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "clamp(2rem, 4vw, 3.5rem)", fontWeight: 700, lineHeight: 1.2, color: TEXT, marginBottom: 20 }}>
              The alarm is no longer a disruption.<br /><span style={{ color: TEAL }}>It is the beginning of your healing practice.</span>
            </h2>
            <p style={{ fontFamily: SERIF, fontSize: "1.4rem", fontStyle: "italic", color: MUTED, marginBottom: 48 }}>
              Wake up in harmony with your mind, body, and frequency.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" as const }}>
              <Link href="/alarm">
                <a style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,212,170,0.15)", border: "1.5px solid rgba(0,212,170,0.5)", color: TEAL, fontFamily: SANS, fontWeight: 700, fontSize: "1rem", padding: "16px 36px", borderRadius: 8, textDecoration: "none" }}>
                  Set Your Healing Alarm →
                </a>
              </Link>
              <Link href="/">
                <a style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED, fontFamily: SANS, fontWeight: 600, fontSize: "1rem", padding: "16px 36px", borderRadius: 8, textDecoration: "none" }}>
                  Explore Rise In Harmony
                </a>
              </Link>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
}
