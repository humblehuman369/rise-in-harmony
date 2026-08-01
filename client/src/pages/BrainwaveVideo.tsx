import { useEffect } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";

const VIDEO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/uBsjcjxSCjPKyins.mp4";
const POSTER_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/NqZXMFZpPkTIMAwR.png";

const S = {
  bg: "#0A0B14",
  teal: "#00D4AA",
  purple: "#8B5CF6",
  amber: "#F59E0B",
  red: "#EF4444",
  text: "#E8EDF5",
  muted: "#8FA3BF",
  border: "rgba(255,255,255,0.08)",
  serif: "'Cormorant Garamond', serif",
  mono: "'DM Mono', monospace",
};

const PHASES = [
  {
    sym: "δ",
    cls: "delta",
    title: "Delta Phase — Deep Sleep",
    time: "Seconds 0 – 4 · 3 Hz binaural beat · 5% → 22% volume",
    color: "#8B5CF6",
    text: `Imagine an alarm that meets you where you are. In deep sleep, your brain operates at three hertz — Delta waves. Conventional alarms shatter this state with a blaring noise. Rise In Harmony begins here, at the Delta frequency, with a gentle, barely audible pulse. It doesn't wake you; it simply nudges your subconscious.`,
  },
  {
    sym: "θ",
    cls: "theta",
    title: "Theta Phase — Hypnagogic Threshold",
    time: "Seconds 4 – 7 · 6 Hz binaural beat · 22% → 60% volume",
    color: "#00D4AA",
    text: `As the alarm softly escalates, the frequency sweeps in real-time to six hertz — Theta. This is the hypnagogic threshold. Your brain is guided naturally into a lighter, dream-like state. You are stirring, but without the panic or the cortisol spike of a sudden awakening.`,
  },
  {
    sym: "α",
    cls: "alpha",
    title: "Alpha Phase — Relaxed Wakefulness",
    time: "Seconds 7 – 10 · 10 Hz binaural beat · 60% → 100% volume",
    color: "#F59E0B",
    text: `Finally, as the volume reaches its peak, the frequency arrives at ten hertz — Alpha. The screen floods with the warm light of a simulated sunrise. You are awake. Relaxed, clear, and perfectly aligned with your natural circadian rhythm. This is how you were meant to wake up.`,
  },
];

const FEATURES = [
  { icon: "⟳", color: S.teal, title: "Real-Time Frequency Sweep", desc: "The DDS engine updates the binaural beat every 5 seconds — a phase-continuous sweep with zero audio artifacts or clicks." },
  { icon: "▲", color: S.purple, title: "4-Stage Volume Escalation", desc: "Whisper → Rise → Full → Persistent. Four precisely timed stages replace the binary \"silent to full blast\" of conventional alarms." },
  { icon: "◐", color: S.amber, title: "Sunrise Simulation", desc: "The wake screen shifts from deep amber to neutral white, mimicking natural dawn light to halt melatonin production." },
  { icon: "✦", color: S.red, title: "Alarm Mission", desc: "A 60-second morning ritual — breathing, intention, or frequency recognition — makes the zombie-snooze structurally impossible." },
];

export default function BrainwaveVideo() {
  useEffect(() => {
    document.title = "Brainwave Sweep Video — Rise In Harmony";
  }, []);

  return (
    <Layout>
      <div style={{ background: S.bg, minHeight: "100vh", color: S.text, fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>

        {/* Ambient background */}
        <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 80% 60% at 20% 10%, rgba(0,212,170,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 80%, rgba(139,92,246,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 50% 50%, rgba(245,158,11,0.03) 0%, transparent 70%)` }} />

        {/* ── Hero ── */}
        <section style={{ position: "relative", zIndex: 1, paddingTop: 120, paddingBottom: 80, textAlign: "center", paddingLeft: 24, paddingRight: 24 }}>

          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px", border: "1px solid rgba(0,212,170,0.3)", color: S.teal, fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", background: "rgba(0,212,170,0.08)", marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: S.teal, boxShadow: `0 0 6px ${S.teal}`, display: "inline-block" }} />
            Brainwave Sweep · DDS Audio Engine
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: S.serif, fontSize: "clamp(48px, 7vw, 88px)", fontWeight: 700, lineHeight: 1.05, color: S.text, textShadow: "0 0 60px rgba(0,212,170,0.2)", marginBottom: 24 }}>
            The{" "}
            <em style={{ fontStyle: "italic", color: S.teal, textShadow: "0 0 40px rgba(0,212,170,0.5)" }}>Deep Sleep</em>
            <br />Wake Sequence
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: "clamp(18px, 2.5vw, 24px)", color: S.muted, maxWidth: 700, margin: "0 auto 48px", lineHeight: 1.6 }}>
            The world's first alarm that sweeps binaural beat frequencies in real time — guiding your brain from deep sleep to clear wakefulness through its natural progression.
          </p>

          {/* Phase pills */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 64, flexWrap: "wrap" }}>
            {[
              { sym: "δ", label: "Delta · 3 Hz", color: S.purple, border: "rgba(139,92,246,0.4)", bg: "rgba(139,92,246,0.08)" },
              { sym: "θ", label: "Theta · 6 Hz", color: S.teal, border: "rgba(0,212,170,0.4)", bg: "rgba(0,212,170,0.08)" },
              { sym: "α", label: "Alpha · 10 Hz", color: S.amber, border: "rgba(245,158,11,0.4)", bg: "rgba(245,158,11,0.08)" },
            ].map(p => (
              <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", border: `1px solid ${p.border}`, fontFamily: S.mono, fontSize: 14, fontWeight: 700, color: p.color, background: p.bg }}>
                <span style={{ fontFamily: S.serif, fontSize: 20, fontStyle: "italic" }}>{p.sym}</span>
                {p.label}
              </div>
            ))}
          </div>
        </section>

        {/* ── Video ── */}
        <section style={{ position: "relative", zIndex: 1, maxWidth: 1120, margin: "0 auto", paddingLeft: 24, paddingRight: 24, paddingBottom: 80 }}>
          <div style={{ position: "relative", width: "100%", border: "1px solid rgba(0,212,170,0.2)", boxShadow: "0 0 80px rgba(0,212,170,0.12), 0 40px 80px rgba(0,0,0,0.6)", background: "#000" }}>
            {/* Corner accents */}
            {[{ t: -1, l: -1, bt: "2px solid #00D4AA", bl: "2px solid #00D4AA" }, { t: -1, r: -1, bt: "2px solid #00D4AA", br: "2px solid #00D4AA" }, { b: -1, l: -1, bb: "2px solid #00D4AA", bl: "2px solid #00D4AA" }, { b: -1, r: -1, bb: "2px solid #00D4AA", br: "2px solid #00D4AA" }].map((c, i) => (
              <div key={i} style={{ position: "absolute", width: 20, height: 20, ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k === 'bt' ? 'borderTop' : k === 'bl' ? 'borderLeft' : k === 'br' ? 'borderRight' : k === 'bb' ? 'borderBottom' : k, v])), zIndex: 2 }} />
            ))}
            <video controls autoPlay muted loop playsInline poster={POSTER_URL} style={{ display: "block", width: "100%", aspectRatio: "16/9", background: "#000" }}>
              <source src={VIDEO_URL} type="video/mp4" />
            </video>
          </div>
          <div style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: S.muted, fontFamily: S.mono, letterSpacing: "0.05em" }}>
            Rise In Harmony · Deep Sleep Wake Sequence · δ→θ→α Brainwave Sweep · DDS Audio Engine
          </div>
        </section>

        {/* ── Presentation Script ── */}
        <section style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", paddingLeft: 24, paddingRight: 24, paddingBottom: 100 }}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: S.teal, marginBottom: 16 }}>
              <div style={{ width: 28, height: 1, background: S.teal }} />
              The Science
            </div>
            <h2 style={{ fontFamily: S.serif, fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, color: S.text, lineHeight: 1.2, margin: 0 }}>
              Three phases. One natural transition.
            </h2>
          </div>

          {PHASES.map(phase => (
            <div key={phase.cls} style={{ marginBottom: 60 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${phase.color}`, boxShadow: `0 0 20px ${phase.color}4D` }}>
                  <span style={{ fontFamily: S.serif, fontSize: 28, fontStyle: "italic", fontWeight: 700, color: phase.color }}>{phase.sym}</span>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: S.text, marginBottom: 4 }}>{phase.title}</div>
                  <div style={{ fontFamily: S.mono, fontSize: 13, color: S.muted }}>{phase.time}</div>
                </div>
              </div>
              <div style={{ height: 1, background: S.border, marginBottom: 24 }} />
              <p style={{ fontSize: 20, color: S.muted, lineHeight: 1.8, fontStyle: "italic", fontFamily: S.serif, borderLeft: `3px solid ${phase.color}`, paddingLeft: 24 }}>
                {phase.text}
              </p>
            </div>
          ))}
        </section>

        {/* ── Feature Strip ── */}
        <section style={{ position: "relative", zIndex: 1, maxWidth: 1120, margin: "0 auto", paddingLeft: 24, paddingRight: 24, paddingBottom: 100 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 2, background: S.border }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: S.bg, padding: "40px 36px" }}>
                <div style={{ fontSize: 32, marginBottom: 20, color: f.color, textShadow: `0 0 20px ${f.color}80` }}>{f.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: S.text, marginBottom: 12 }}>{f.title}</div>
                <div style={{ fontSize: 16, color: S.muted, lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "80px 24px 120px", background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,212,170,0.06) 0%, transparent 70%)" }}>
          <h2 style={{ fontFamily: S.serif, fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 700, color: S.text, marginBottom: 20, textShadow: "0 0 40px rgba(0,212,170,0.2)" }}>
            Wake up in harmony.
          </h2>
          <p style={{ fontSize: 20, color: S.muted, marginBottom: 48, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
            The advanced alarm system is live now at riseinharmony.com — free to try, no account required.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <Link href="/alarm">
              <button style={{ padding: "16px 40px", background: "linear-gradient(135deg, #00D4AA, #00B894)", color: "#0A0B14", fontSize: 16, fontWeight: 700, border: "none", cursor: "pointer", letterSpacing: "0.03em", boxShadow: "0 6px 30px rgba(0,212,170,0.35)" }}>
                Try the Alarm →
              </button>
            </Link>
            <Link href="/alarm-features">
              <button style={{ padding: "16px 40px", border: "1px solid rgba(0,212,170,0.3)", color: S.teal, fontSize: 16, fontWeight: 700, background: "rgba(0,212,170,0.06)", cursor: "pointer" }}>
                All Features
              </button>
            </Link>
          </div>
        </section>

      </div>
    </Layout>
  );
}
