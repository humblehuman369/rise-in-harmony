import { useEffect } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";

const VIDEO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/uBsjcjxSCjPKyins.mp4";
const POSTER_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/NqZXMFZpPkTIMAwR.png";

export default function DeepSleepWake() {
  useEffect(() => {
    document.title = "Deep Sleep Wake Sequence — Rise In Harmony";
  }, []);

  return (
    <Layout>
      <div style={{ background: "#0A0B14", minHeight: "100vh", color: "#E8EDF5", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>

        {/* Ambient background glows */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(0,212,170,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(139,92,246,0.06) 0%, transparent 60%)",
        }} />

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section style={{ position: "relative", zIndex: 1, paddingTop: "80px", paddingBottom: "60px", textAlign: "center", paddingLeft: "24px", paddingRight: "24px" }}>

          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "6px 18px",
            border: "1px solid rgba(0,212,170,0.3)",
            color: "#00D4AA", fontSize: "12px", fontWeight: 700,
            letterSpacing: "2px", textTransform: "uppercase",
            background: "rgba(0,212,170,0.08)", marginBottom: "32px",
          }}>
            <span style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: "#00D4AA", boxShadow: "0 0 6px #00D4AA",
              display: "inline-block",
              animation: "pulse-dot 2s ease-in-out infinite",
            }} />
            New Feature Release
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(48px, 7vw, 88px)",
            fontWeight: 700, lineHeight: 1.05,
            color: "#E8EDF5",
            textShadow: "0 0 60px rgba(0,212,170,0.2)",
            marginBottom: "24px",
          }}>
            The{" "}
            <em style={{ fontStyle: "italic", color: "#00D4AA", textShadow: "0 0 40px rgba(0,212,170,0.5)" }}>
              Deep Sleep
            </em>
            <br />Wake Sequence
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: "clamp(18px, 2.5vw, 24px)", color: "#8FA3BF", maxWidth: "700px", margin: "0 auto 48px", lineHeight: 1.6 }}>
            The world's first alarm that sweeps binaural beat frequencies in real time — guiding your brain from deep sleep to clear wakefulness through its natural progression.
          </p>

          {/* Phase pills */}
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "64px", flexWrap: "wrap" }}>
            {[
              { sym: "δ", label: "Delta · 3 Hz", color: "#8B5CF6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.4)" },
              { sym: "θ", label: "Theta · 6 Hz", color: "#00D4AA", bg: "rgba(0,212,170,0.08)", border: "rgba(0,212,170,0.4)" },
              { sym: "α", label: "Alpha · 10 Hz", color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.4)" },
            ].map(p => (
              <div key={p.label} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "8px 20px",
                border: `1px solid ${p.border}`,
                color: p.color, background: p.bg,
                fontFamily: "'DM Mono', monospace", fontSize: "14px", fontWeight: 700,
              }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontStyle: "italic" }}>{p.sym}</span>
                {p.label}
              </div>
            ))}
          </div>
        </section>

        {/* ── Video ────────────────────────────────────────────── */}
        <section style={{ position: "relative", zIndex: 1, maxWidth: "1120px", margin: "0 auto", paddingLeft: "24px", paddingRight: "24px", paddingBottom: "80px" }}>
          <div style={{
            position: "relative", width: "100%",
            border: "1px solid rgba(0,212,170,0.2)",
            boxShadow: "0 0 80px rgba(0,212,170,0.12), 0 40px 80px rgba(0,0,0,0.6)",
            background: "#000",
          }}>
            <video
              controls
              autoPlay
              muted
              loop
              playsInline
              poster={POSTER_URL}
              style={{ display: "block", width: "100%", aspectRatio: "16/9", background: "#000" }}
            >
              <source src={VIDEO_URL} type="video/mp4" />
            </video>
          </div>
          <div style={{ marginTop: "20px", textAlign: "center", fontSize: "14px", color: "#8FA3BF", fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" }}>
            Rise In Harmony · Deep Sleep Wake Sequence · δ→θ→α Brainwave Sweep · DDS Audio Engine
          </div>
        </section>

        {/* ── Presentation Script ──────────────────────────────── */}
        <section style={{ position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto", paddingLeft: "24px", paddingRight: "24px", paddingBottom: "100px" }}>
          <div style={{ marginBottom: "48px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#00D4AA", marginBottom: "16px" }}>
              <div style={{ width: 28, height: 1, background: "#00D4AA" }} />
              The Science
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, color: "#E8EDF5", lineHeight: 1.2, margin: 0 }}>
              Three phases. One natural transition.
            </h2>
          </div>

          {[
            {
              sym: "δ", cls: "delta",
              title: "Delta Phase — Deep Sleep",
              time: "Seconds 0 – 4 · 3 Hz binaural beat · 5% → 22% volume",
              color: "#8B5CF6",
              text: `Imagine an alarm that meets you where you are. In deep sleep, your brain operates at three hertz — Delta waves. Conventional alarms shatter this state with a blaring noise. Rise In Harmony begins here, at the Delta frequency, with a gentle, barely audible pulse. It doesn't wake you; it simply nudges your subconscious.`,
            },
            {
              sym: "θ", cls: "theta",
              title: "Theta Phase — Hypnagogic Threshold",
              time: "Seconds 4 – 7 · 6 Hz binaural beat · 22% → 60% volume",
              color: "#00D4AA",
              text: `As the alarm softly escalates, the frequency sweeps in real-time to six hertz — Theta. This is the hypnagogic threshold. Your brain is guided naturally into a lighter, dream-like state. You are stirring, but without the panic or the cortisol spike of a sudden awakening.`,
            },
            {
              sym: "α", cls: "alpha",
              title: "Alpha Phase — Relaxed Wakefulness",
              time: "Seconds 7 – 10 · 10 Hz binaural beat · 60% → 100% volume",
              color: "#F59E0B",
              text: `Finally, as the volume reaches its peak, the frequency arrives at ten hertz — Alpha. The screen floods with the warm light of a simulated sunrise. You are awake. Relaxed, clear, and perfectly aligned with your natural circadian rhythm. This is how you were meant to wake up.`,
            },
          ].map(phase => (
            <div key={phase.cls} style={{ marginBottom: "60px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
                <div style={{
                  width: "48px", height: "48px", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `2px solid ${phase.color}`,
                  boxShadow: `0 0 20px ${phase.color}4D`,
                }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontStyle: "italic", fontWeight: 700, color: phase.color }}>
                    {phase.sym}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#E8EDF5", marginBottom: "4px" }}>{phase.title}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px", color: "#8FA3BF" }}>{phase.time}</div>
                </div>
              </div>
              <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", marginBottom: "24px" }} />
              <p style={{
                fontSize: "20px", color: "#8FA3BF", lineHeight: 1.8,
                fontStyle: "italic", fontFamily: "'Cormorant Garamond', serif",
                borderLeft: `3px solid ${phase.color}`, paddingLeft: "24px",
              }}>
                {phase.text}
              </p>
            </div>
          ))}
        </section>

        {/* ── Feature Strip ────────────────────────────────────── */}
        <section style={{ position: "relative", zIndex: 1, maxWidth: "1120px", margin: "0 auto", paddingLeft: "24px", paddingRight: "24px", paddingBottom: "100px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "2px", background: "rgba(255,255,255,0.08)" }}>
            {[
              { icon: "⟳", color: "#00D4AA", shadow: "rgba(0,212,170,0.5)", title: "Real-Time Frequency Sweep", desc: "The DDS engine updates the binaural beat every 5 seconds — a phase-continuous sweep with zero audio artifacts or clicks." },
              { icon: "▲", color: "#8B5CF6", shadow: "rgba(139,92,246,0.5)", title: "4-Stage Volume Escalation", desc: "Whisper → Rise → Full → Persistent. Four precisely timed stages replace the binary 'silent to full blast' of conventional alarms." },
              { icon: "◐", color: "#F59E0B", shadow: "rgba(245,158,11,0.5)", title: "Sunrise Simulation", desc: "The wake screen shifts from deep amber to neutral white, mimicking natural dawn light to halt melatonin production." },
              { icon: "✦", color: "#EF4444", shadow: "rgba(239,68,68,0.5)", title: "Alarm Mission", desc: "A 60-second morning ritual — breathing, intention, or frequency recognition — makes the zombie-snooze structurally impossible." },
            ].map(f => (
              <div key={f.title} style={{ background: "#0A0B14", padding: "40px 36px" }}>
                <div style={{ fontSize: "32px", marginBottom: "20px", color: f.color, textShadow: `0 0 20px ${f.shadow}` }}>{f.icon}</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#E8EDF5", marginBottom: "12px" }}>{f.title}</div>
                <div style={{ fontSize: "16px", color: "#8FA3BF", lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section style={{
          position: "relative", zIndex: 1, textAlign: "center",
          padding: "80px 24px 120px",
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,212,170,0.06) 0%, transparent 70%)",
        }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 700,
            color: "#E8EDF5", marginBottom: "20px",
            textShadow: "0 0 40px rgba(0,212,170,0.2)",
          }}>
            Wake up in harmony.
          </h2>
          <p style={{ fontSize: "20px", color: "#8FA3BF", marginBottom: "48px", maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
            The advanced alarm system is live now at riseinharmony.com — free to try, no account required.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            <Link href="/alarm">
              <a style={{
                display: "inline-block", padding: "16px 40px",
                background: "linear-gradient(135deg, #00D4AA, #00B894)",
                color: "#0A0B14", fontSize: "16px", fontWeight: 700,
                textDecoration: "none", letterSpacing: "0.03em",
                boxShadow: "0 6px 30px rgba(0,212,170,0.35)",
                transition: "all 0.2s",
              }}>
                Try the Alarm →
              </a>
            </Link>
            <Link href="/alarm-features">
              <a style={{
                display: "inline-block", padding: "16px 40px",
                border: "1px solid rgba(0,212,170,0.3)",
                color: "#00D4AA", fontSize: "16px", fontWeight: 700,
                textDecoration: "none", letterSpacing: "0.03em",
                background: "rgba(0,212,170,0.06)",
                transition: "all 0.2s",
              }}>
                All Features
              </a>
            </Link>
          </div>
        </section>

      </div>
    </Layout>
  );
}
