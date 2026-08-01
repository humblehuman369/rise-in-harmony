import { useEffect } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";

const S = {
  bg: "#0A0B14",
  bg2: "#0D0E1A",
  teal: "#00D4AA",
  amber: "#F59E0B",
  purple: "#8B5CF6",
  red: "#EF4444",
  text: "#E8EDF5",
  muted: "#8FA3BF",
  dim: "#4A5568",
  border: "rgba(255,255,255,0.07)",
  serif: "'Cormorant Garamond', serif",
  mono: "'DM Mono', monospace",
};

const BENEFITS = [
  { icon: "🧠", color: S.teal, title: "Eliminates Sleep Inertia", desc: "Guides your brain from deep sleep to wakefulness naturally, eliminating the cortisol spike and hours of grogginess caused by conventional alarms." },
  { icon: "🌅", color: S.amber, title: "Sunrise Simulation", desc: "The wake screen shifts from warm amber to daylight white, mimicking natural dawn light to regulate your circadian rhythm every morning." },
  { icon: "🎯", color: S.purple, title: "Breaks the Snooze Habit", desc: "The Alarm Mission requires a 60-second morning ritual before dismissal, making zombie-snoozing impossible and forming a positive daily habit loop." },
  { icon: "🎵", color: S.teal, title: "Free Healing Frequencies", desc: "432Hz and 528Hz are now free for all users — delivering the core brand promise of healing frequency science to everyone, every morning." },
];

const SUMMARY_ROWS = [
  { feature: "Deep Sleep Wake Sequence", desc: "δ→θ→α real-time binaural sweep", access: "free" },
  { feature: "4-Stage Volume Escalation", desc: "Whisper → Rise → Full → Persistent", access: "all" },
  { feature: "Sleep Profile Selector", desc: "Light / Normal / Heavy / Very Heavy", access: "all" },
  { feature: "432Hz Alarm Sound", desc: "Natural Harmony frequency", access: "free" },
  { feature: "528Hz Alarm Sound", desc: "Love / Transformation frequency", access: "free" },
  { feature: "Alarm Mission", desc: "Breathing / Intention / Frequency Recognition", access: "all" },
  { feature: "Smart Adaptive Snooze", desc: "Escalating re-entry with snooze count", access: "all" },
  { feature: "Sunrise Simulation", desc: "Amber → white wake screen transition", access: "all" },
];

export default function AlarmShowcase() {
  useEffect(() => {
    document.title = "Advanced Alarm System — Rise In Harmony";
  }, []);

  return (
    <Layout>
      <div style={{ background: S.bg, minHeight: "100vh", color: S.text, fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>

        {/* Ambient background */}
        <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse at 50% 30%, rgba(0,212,170,0.18) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.1) 0%, transparent 45%),
            radial-gradient(ellipse at 20% 80%, rgba(245,158,11,0.06) 0%, transparent 40%)` }} />

        {/* ── Hero ── */}
        <section style={{ position: "relative", zIndex: 1, minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "100px 24px 80px" }}>
          {/* Pulse rings */}
          {[300, 500, 700, 900].map((size, i) => (
            <div key={size} style={{
              position: "absolute", top: "50%", left: "50%",
              width: size, height: size,
              borderRadius: "50%",
              border: "1px solid rgba(0,212,170,0.2)",
              transform: "translate(-50%, -50%)",
              animation: `pulse-ring 3.5s ease-out ${i * 0.7}s infinite`,
              pointerEvents: "none",
            }} />
          ))}

          <div style={{ position: "relative", zIndex: 2, maxWidth: 820 }}>
            {/* Badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.25)", padding: "6px 16px", fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: S.teal, marginBottom: 28 }}>
              <span style={{ width: 7, height: 7, background: S.teal, borderRadius: "50%", boxShadow: `0 0 8px ${S.teal}`, display: "inline-block" }} />
              New Feature Release
            </div>

            <h1 style={{ fontFamily: S.serif, fontSize: "clamp(3rem, 6vw, 5.5rem)", fontWeight: 700, lineHeight: 1.1, color: "#fff", textShadow: "0 0 60px rgba(0,212,170,0.25)", marginBottom: 24 }}>
              The World's First<br />Brain-Guided Healing Alarm
            </h1>
            <p style={{ fontFamily: S.serif, fontSize: "clamp(1.2rem, 2.5vw, 1.7rem)", fontStyle: "italic", color: S.muted, marginBottom: 48, lineHeight: 1.5 }}>
              Wake up the way your brain was designed to —<br />gently, scientifically, beautifully.
            </p>

            {/* Brainwave pills */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 48, flexWrap: "wrap" }}>
              {[
                { sym: "δ", name: "Delta", hz: "3Hz", color: S.purple, bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.4)" },
                { sym: "θ", name: "Theta", hz: "6Hz", color: S.teal, bg: "rgba(0,212,170,0.08)", border: "rgba(0,212,170,0.4)" },
                { sym: "α", name: "Alpha", hz: "10Hz", color: S.amber, bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.4)" },
              ].map((p, i) => (
                <div key={p.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 24px", border: `1px solid ${p.border}`, background: p.bg, minWidth: 100 }}>
                  <span style={{ fontFamily: S.serif, fontSize: "2rem", fontStyle: "italic", fontWeight: 700, color: p.color }}>{p.sym}</span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: S.muted, letterSpacing: 1, textTransform: "uppercase" }}>{p.name}</span>
                  <span style={{ fontFamily: S.mono, fontSize: "0.72rem", color: S.dim }}>{p.hz}</span>
                  {i < 2 && <span style={{ display: "none" }}>→</span>}
                </div>
              ))}
            </div>

            <Link href="/alarm">
              <button style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(0,212,170,0.15)", border: "1.5px solid rgba(0,212,170,0.5)", color: S.teal, fontWeight: 700, fontSize: "1rem", padding: "16px 36px", cursor: "pointer", letterSpacing: "0.5px" }}>
                Set Your Healing Alarm →
              </button>
            </Link>
          </div>
        </section>

        {/* ── Benefits Strip ── */}
        <section style={{ position: "relative", zIndex: 1, background: S.bg2, borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}`, padding: "80px 0" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 40 }}>
            {BENEFITS.map(b => (
              <div key={b.title} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", background: `${b.color}1A` }}>{b.icon}</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: S.text }}>{b.title}</div>
                <div style={{ fontSize: "0.9rem", color: S.muted, lineHeight: 1.6 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section style={{ position: "relative", zIndex: 1, padding: "100px 0" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.75rem", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: S.teal, marginBottom: 16 }}>
              <div style={{ width: 28, height: 1, background: S.teal }} />
              Six New Features
            </div>
            <h2 style={{ fontFamily: S.serif, fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
              An alarm system built on<br /><span style={{ color: S.teal }}>neuroscience and healing</span>
            </h2>
            <p style={{ fontSize: "1.15rem", color: S.muted, maxWidth: 680, lineHeight: 1.7, marginBottom: 64 }}>
              Every feature was designed with a single question: what does the brain actually need to transition from sleep to wakefulness in the healthiest, most harmonious way possible?
            </p>

            {/* Feature 1: Deep Sleep Wake */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 120 }}>
              <div>
                <div style={{ fontFamily: S.mono, fontSize: "0.75rem", color: S.dim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Feature 01</div>
                <h3 style={{ fontFamily: S.serif, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 700, lineHeight: 1.2, marginBottom: 20 }}>
                  Deep Sleep Wake<br /><span style={{ color: S.purple }}>δ → θ → α</span> Sequence
                </h3>
                <p style={{ fontSize: "1rem", color: S.muted, lineHeight: 1.8, marginBottom: 28 }}>
                  The world's first alarm that sweeps binaural beat frequencies in real time, guiding your brain through its natural wake progression. The DDS engine updates the frequency every 5 seconds — phase-continuous, with zero clicks or pops.
                </p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                  {["Delta Phase (0–40%): 200Hz carrier + 3Hz beat. Meets the brain in deep sleep at whisper volume.", "Theta Phase (40–75%): Beat sweeps to 6Hz. The hypnagogic threshold — creative and dream-like.", "Alpha Phase (75–100%): Beat sweeps to 10Hz. Relaxed, clear wakefulness at full resonance.", "Live δ / θ / α indicator on the wake screen shows the active brainwave phase."].map(pt => (
                    <li key={pt} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: "0.95rem", color: S.muted, lineHeight: 1.6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: S.teal, marginTop: 8, flexShrink: 0, display: "inline-block" }} />
                      <span dangerouslySetInnerHTML={{ __html: pt.replace(/^([^:]+:)/, '<strong style="color:#E8EDF5">$1</strong>') }} />
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${S.border}`, padding: 32 }}>
                {/* Sweep timeline */}
                <div style={{ display: "flex", height: 10, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ width: "40%", background: S.purple, boxShadow: "0 0 12px rgba(139,92,246,0.5)" }} />
                  <div style={{ width: "35%", background: S.teal, boxShadow: "0 0 12px rgba(0,212,170,0.5)" }} />
                  <div style={{ width: "25%", background: S.amber, boxShadow: "0 0 12px rgba(245,158,11,0.5)" }} />
                </div>
                <div style={{ display: "flex", fontSize: "0.72rem", color: S.dim, fontFamily: S.mono, marginBottom: 28 }}>
                  <span style={{ width: "40%" }}>0% — 40%</span>
                  <span style={{ width: "35%" }}>40% — 75%</span>
                  <span style={{ width: "25%" }}>75% — 100%</span>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  {[
                    { label: "δ Delta", hz: "200Hz + 3Hz beat", desc: "Deep sleep. Subconscious priming begins.", color: S.purple, border: "rgba(139,92,246,0.3)", bg: "rgba(139,92,246,0.06)" },
                    { label: "θ Theta", hz: "200Hz + 6Hz beat", desc: "Hypnagogic threshold. Creative state.", color: S.teal, border: "rgba(0,212,170,0.3)", bg: "rgba(0,212,170,0.06)" },
                    { label: "α Alpha", hz: "200Hz + 10Hz beat", desc: "Relaxed wakefulness. Full resonance.", color: S.amber, border: "rgba(245,158,11,0.3)", bg: "rgba(245,158,11,0.06)" },
                  ].map(ph => (
                    <div key={ph.label} style={{ flex: 1, padding: 16, border: `1px solid ${ph.border}`, background: ph.bg }}>
                      <div style={{ fontFamily: S.serif, fontSize: "1.2rem", fontStyle: "italic", fontWeight: 700, color: ph.color, marginBottom: 4 }}>{ph.label}</div>
                      <div style={{ fontFamily: S.mono, fontSize: "0.72rem", color: S.dim, marginBottom: 8 }}>{ph.hz}</div>
                      <div style={{ fontSize: "0.82rem", color: S.muted, lineHeight: 1.5 }}>{ph.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature 2: 4-Stage Escalation */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 120 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${S.border}`, padding: 32 }}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: 200, gap: 16, marginBottom: 16 }}>
                  {[
                    { h: 44, bg: S.teal, opacity: 0.4, pct: "22%", name: "Whisper" },
                    { h: 120, bg: `linear-gradient(to top, ${S.teal}, #7AE68A)`, opacity: 1, pct: "60%", name: "Rise" },
                    { h: 176, bg: "linear-gradient(to top, #7AE68A, #F59E0B)", opacity: 1, pct: "88%", name: "Full" },
                    { h: 200, bg: S.amber, opacity: 1, pct: "100%", name: "Persistent" },
                  ].map(bar => (
                    <div key={bar.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
                      <div style={{ width: "100%", height: bar.h, background: bar.bg, opacity: bar.opacity }} />
                      <div style={{ fontFamily: S.mono, fontSize: "0.72rem", color: S.text, textAlign: "center" }}>{bar.pct}</div>
                      <div style={{ fontSize: "0.72rem", color: S.muted, textAlign: "center", fontWeight: 600 }}>{bar.name}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 1, background: S.border, marginBottom: 12 }} />
                <p style={{ fontSize: "0.8rem", color: S.dim, textAlign: "center" }}>Stage timing controlled by Sleep Profile</p>
              </div>
              <div>
                <div style={{ fontFamily: S.mono, fontSize: "0.75rem", color: S.dim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Feature 02</div>
                <h3 style={{ fontFamily: S.serif, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 700, lineHeight: 1.2, marginBottom: 20 }}>
                  4-Stage Progressive<br /><span style={{ color: S.teal }}>Volume Escalation</span>
                </h3>
                <p style={{ fontSize: "1rem", color: S.muted, lineHeight: 1.8, marginBottom: 28 }}>
                  Heavy sleepers don't need a louder alarm — they need a smarter one. Four precisely timed stages replace the binary "silent to full blast" of conventional alarms.
                </p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                  {["Whisper (5%→22%): Subconscious priming. The healing frequency enters awareness before the conscious mind wakes.", "Rise (22%→60%): Clearly audible, gentle. The body begins to stir naturally.", "Full (60%→88%): Full healing resonance. Unmistakable but never jarring.", "Persistent (88%→100%): Sustained presence. Cannot be slept through."].map(pt => (
                    <li key={pt} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: "0.95rem", color: S.muted, lineHeight: 1.6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: S.teal, marginTop: 8, flexShrink: 0, display: "inline-block" }} />
                      <span dangerouslySetInnerHTML={{ __html: pt.replace(/^([^:]+:)/, '<strong style="color:#E8EDF5">$1</strong>') }} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 3: Sleep Profile */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 120 }}>
              <div>
                <div style={{ fontFamily: S.mono, fontSize: "0.75rem", color: S.dim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Feature 03</div>
                <h3 style={{ fontFamily: S.serif, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 700, lineHeight: 1.2, marginBottom: 20 }}>
                  Sleep Profile<br /><span style={{ color: S.amber }}>Personalisation</span>
                </h3>
                <p style={{ fontSize: "1rem", color: S.muted, lineHeight: 1.8, marginBottom: 28 }}>
                  One alarm setting does not fit all. Set your Sleep Profile once and the app automatically adjusts the escalation timing every morning — no manual adjustment needed.
                </p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                  {["Light Sleeper: Extended 8-minute gradual escalation for those who wake easily.", "Normal: Balanced 6-minute escalation — the default for most users.", "Heavy Sleeper: Compressed 3-minute curve that skips the Whisper stage.", "Very Heavy Sleeper: Escalates to Persistent in 4 minutes for those who historically sleep through alarms."].map(pt => (
                    <li key={pt} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: "0.95rem", color: S.muted, lineHeight: 1.6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: S.teal, marginTop: 8, flexShrink: 0, display: "inline-block" }} />
                      <span dangerouslySetInnerHTML={{ __html: pt.replace(/^([^:]+:)/, '<strong style="color:#E8EDF5">$1</strong>') }} />
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { title: "Light Sleeper", desc: "Slow, gradual 8-minute escalation.", color: S.teal, fill: "100%" },
                  { title: "Normal", desc: "Balanced 6-minute escalation.", color: S.purple, fill: "75%" },
                  { title: "Heavy Sleeper", desc: "Fast 3-minute escalation.", color: S.amber, fill: "37%" },
                  { title: "Very Heavy", desc: "Rapid 4-minute escalation.", color: S.red, fill: "50%" },
                ].map(p => (
                  <div key={p.title} style={{ padding: 20, border: `1px solid ${S.border}`, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: p.color, marginBottom: 6 }}>{p.title}</div>
                    <div style={{ fontSize: "0.82rem", color: S.muted, marginBottom: 12, lineHeight: 1.5 }}>{p.desc}</div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: p.fill, background: p.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 4: Free Frequencies */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 120 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {[
                  { hz: "432", label: "Hz", name: "Natural Harmony", desc: "The most universally loved healing frequency. Associated with calm, balance, and natural resonance.", color: S.teal, border: "rgba(0,212,170,0.35)", bg: "radial-gradient(circle at center, rgba(0,212,170,0.1) 0%, transparent 70%)" },
                  { hz: "528", label: "Hz", name: "Love Frequency", desc: "The most searched healing frequency. Associated with transformation and cellular healing.", color: S.amber, border: "rgba(245,158,11,0.35)", bg: "radial-gradient(circle at center, rgba(245,158,11,0.1) 0%, transparent 70%)" },
                ].map(f => (
                  <div key={f.hz} style={{ padding: 28, border: `1px solid ${f.border}`, background: f.bg, textAlign: "center", position: "relative" }}>
                    <div style={{ position: "absolute", top: 12, right: 12, fontFamily: S.mono, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", background: `${f.color}26`, border: `1px solid ${f.color}66`, color: f.color }}>FREE</div>
                    <div style={{ fontFamily: S.serif, fontSize: "3.5rem", fontWeight: 700, lineHeight: 1, color: f.color, textShadow: `0 0 30px ${f.color}66`, marginBottom: 8 }}>{f.hz}</div>
                    <div style={{ fontFamily: S.mono, fontSize: "0.75rem", color: f.color, marginBottom: 12 }}>{f.label}</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: S.text, marginBottom: 8 }}>{f.name}</div>
                    <div style={{ fontSize: "0.8rem", color: S.muted, lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontFamily: S.mono, fontSize: "0.75rem", color: S.dim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Feature 04</div>
                <h3 style={{ fontFamily: S.serif, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 700, lineHeight: 1.2, marginBottom: 20 }}>
                  Free Healing<br /><span style={{ color: S.amber }}>Frequencies</span>
                </h3>
                <p style={{ fontSize: "1rem", color: S.muted, lineHeight: 1.8, marginBottom: 28 }}>
                  432Hz and 528Hz are now free for all users — no subscription required. Every morning, every user wakes up to the healing frequency science that defines the Rise In Harmony brand.
                </p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                  {["432Hz — Natural Harmony: Tuned to the natural resonance of the universe. Reduces anxiety and promotes calm.", "528Hz — Love Frequency: The most searched healing frequency on the internet. Associated with cellular repair.", "Both free forever: No paywall, no trial. The brand promise delivered every single morning."].map(pt => (
                    <li key={pt} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: "0.95rem", color: S.muted, lineHeight: 1.6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: S.teal, marginTop: 8, flexShrink: 0, display: "inline-block" }} />
                      <span dangerouslySetInnerHTML={{ __html: pt.replace(/^([^—]+—[^:]+:)/, '<strong style="color:#E8EDF5">$1</strong>') }} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 5: Alarm Mission */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 120 }}>
              <div>
                <div style={{ fontFamily: S.mono, fontSize: "0.75rem", color: S.dim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Feature 05</div>
                <h3 style={{ fontFamily: S.serif, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 700, lineHeight: 1.2, marginBottom: 20 }}>
                  Alarm Mission<br /><span style={{ color: S.red }}>Anti-Zombie-Snooze</span>
                </h3>
                <p style={{ fontSize: "1rem", color: S.muted, lineHeight: 1.8, marginBottom: 28 }}>
                  Pressing "I'm awake" triggers a 60-second morning ritual before the alarm dismisses. Three mission types rotate by snooze count, making the zombie-snooze structurally impossible.
                </p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                  {["Breathing Round: Animated 4-7-8 cycle with circular progress ring.", "Morning Intention: Gratitude prompt with text input.", "Frequency Recognition: Tap the correct Hz from 3 options."].map(pt => (
                    <li key={pt} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: "0.95rem", color: S.muted, lineHeight: 1.6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: S.teal, marginTop: 8, flexShrink: 0, display: "inline-block" }} />
                      <span dangerouslySetInnerHTML={{ __html: pt.replace(/^([^:]+:)/, '<strong style="color:#E8EDF5">$1</strong>') }} />
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { icon: "🫁", color: S.teal, title: "Breathing Round", desc: "Animated 4-7-8 breathing cycle with a circular progress ring. Activates the parasympathetic nervous system for a calm, clear start." },
                  { icon: "✍️", color: S.amber, title: "Morning Intention", desc: "A gratitude prompt with a text input field. Sets a positive mental frame before the day begins." },
                  { icon: "🎵", color: S.purple, title: "Frequency Recognition", desc: "Tap the correct Hz from 3 options. Engages the conscious mind and reinforces healing frequency awareness." },
                ].map(m => (
                  <div key={m.title} style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 24px", border: `1px solid ${S.border}`, background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${m.color}` }}>
                    <span style={{ fontSize: "1.6rem", width: 40, textAlign: "center", flexShrink: 0 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: S.text, marginBottom: 4 }}>{m.title}</div>
                      <div style={{ fontSize: "0.85rem", color: S.muted, lineHeight: 1.5 }}>{m.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 6: Smart Snooze */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { num: "1", cls: S.teal, title: "First Snooze", msg: "Gentle re-entry with 174Hz grounding frequency" },
                  { num: "2", cls: S.purple, title: "Second Snooze", msg: "Volume escalates. Snooze count shown on screen." },
                  { num: "3", cls: S.amber, title: "Final Snooze", msg: "Maximum volume. Alarm Mission activates on dismiss." },
                ].map(step => (
                  <div key={step.num} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", border: `1px solid ${S.border}`, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0, background: `${step.cls}26`, color: step.cls }}>{step.num}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: S.text, marginBottom: 4 }}>{step.title}</div>
                      <div style={{ fontFamily: S.mono, fontSize: "0.78rem", color: S.dim }}>{step.msg}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontFamily: S.mono, fontSize: "0.75rem", color: S.dim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Feature 06</div>
                <h3 style={{ fontFamily: S.serif, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 700, lineHeight: 1.2, marginBottom: 20 }}>
                  Smart Adaptive<br /><span style={{ color: S.purple }}>Snooze System</span>
                </h3>
                <p style={{ fontSize: "1rem", color: S.muted, lineHeight: 1.8 }}>
                  Each snooze is smarter than the last. The system tracks your snooze count, shows it on screen, escalates the volume on re-entry, and activates the Alarm Mission on the final snooze — creating a natural, self-correcting wake-up loop.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Roadmap ── */}
        <section style={{ position: "relative", zIndex: 1, background: S.bg2, borderTop: `1px solid ${S.border}`, padding: "100px 0" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
            <h2 style={{ fontFamily: S.serif, fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 700, lineHeight: 1.2, marginBottom: 48, textAlign: "center" }}>
              What's coming next
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {[
                { phase: "Now Live", icon: "🌊", color: S.teal, title: "Web Platform", desc: "All six features live at riseinharmony.com. Free 432Hz and 528Hz, Sleep Profiles, Deep Sleep Wake sequence, Alarm Mission, and Smart Snooze." },
                { phase: "Next Sprint", icon: "📱", color: S.amber, title: "Native App", desc: "Android STREAM_ALARM foreground service — bypasses silent mode entirely. iOS Critical Alerts entitlement for Do Not Disturb override." },
                { phase: "Future", icon: "❤️", color: S.purple, title: "HRV-Informed Wake", desc: "Integrate with Apple Health / Google Fit overnight HRV data. Automatically adjusts fade-in duration and frequency based on recovery score." },
              ].map(col => (
                <div key={col.title} style={{ padding: 24, border: `1px solid ${S.border}`, background: "rgba(255,255,255,0.02)", borderTop: `3px solid ${col.color}` }}>
                  <div style={{ fontFamily: S.mono, fontSize: "0.7rem", letterSpacing: 2, textTransform: "uppercase", color: col.color, marginBottom: 12 }}>{col.phase}</div>
                  <div style={{ fontSize: "1.8rem", marginBottom: 12 }}>{col.icon}</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: S.text, marginBottom: 10 }}>{col.title}</div>
                  <div style={{ fontSize: "0.85rem", color: S.muted, lineHeight: 1.6 }}>{col.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Summary Table ── */}
        <section style={{ position: "relative", zIndex: 1, background: S.bg2, borderTop: `1px solid ${S.border}`, padding: "80px 0" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
            <h2 style={{ fontFamily: S.serif, fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>Feature summary</h2>
            <p style={{ fontSize: "1.15rem", color: S.muted, marginBottom: 32 }}>All features available now at riseinharmony.com</p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Feature", "Description", "Access"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: S.teal, padding: "14px 20px", borderBottom: "1px solid rgba(0,212,170,0.3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUMMARY_ROWS.map(row => (
                  <tr key={row.feature}>
                    <td style={{ padding: "18px 20px", borderBottom: `1px solid ${S.border}`, fontSize: "0.95rem", fontWeight: 700, color: S.text }}>{row.feature}</td>
                    <td style={{ padding: "18px 20px", borderBottom: `1px solid ${S.border}`, fontSize: "0.95rem", color: S.muted }}>{row.desc}</td>
                    <td style={{ padding: "18px 20px", borderBottom: `1px solid ${S.border}` }}>
                      {row.access === "free"
                        ? <span style={{ fontFamily: S.mono, fontSize: "0.68rem", fontWeight: 700, letterSpacing: 1, padding: "3px 10px", background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.3)", color: S.teal }}>FREE</span>
                        : <span style={{ fontFamily: S.mono, fontSize: "0.68rem", fontWeight: 700, letterSpacing: 1, padding: "3px 10px", background: "rgba(255,255,255,0.05)", border: `1px solid ${S.border}`, color: S.muted }}>ALL USERS</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "120px 24px", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(0,212,170,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
          <h2 style={{ fontFamily: S.serif, fontSize: "clamp(2rem, 4vw, 3.5rem)", fontWeight: 700, lineHeight: 1.2, marginBottom: 20, position: "relative" }}>
            Wake up in <span style={{ color: S.teal }}>harmony</span>.
          </h2>
          <p style={{ fontFamily: S.serif, fontSize: "1.4rem", fontStyle: "italic", color: S.muted, marginBottom: 48, position: "relative" }}>
            The advanced alarm system is live now — free to try, no account required.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
            <Link href="/alarm">
              <button style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,212,170,0.15)", border: "1.5px solid rgba(0,212,170,0.5)", color: S.teal, fontWeight: 700, fontSize: "1rem", padding: "16px 36px", cursor: "pointer" }}>
                Set Your Healing Alarm →
              </button>
            </Link>
            <Link href="/alarm-features">
              <button style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${S.border}`, color: S.muted, fontWeight: 600, fontSize: "1rem", padding: "16px 36px", cursor: "pointer" }}>
                All Features
              </button>
            </Link>
          </div>
        </section>

      </div>
    </Layout>
  );
}
