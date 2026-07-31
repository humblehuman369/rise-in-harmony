/**
 * AlarmFeatures — Permanent showcase page at /alarm-features
 *
 * Presents the six new advanced alarm system features using the
 * app's Bioluminescent Depth design language.
 */
import React, { useEffect } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";

// ─── Animated ring component ──────────────────────────────────────────────────
function PulseRings({ color = "#00D4AA", count = 4 }: { color?: string; count?: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: `${220 + i * 140}px`,
            height: `${220 + i * 140}px`,
            borderColor: `${color}${Math.round((0.35 - i * 0.07) * 255).toString(16).padStart(2, "0")}`,
            animation: `frequency-pulse ${2.5 + i * 0.6}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Section badge ────────────────────────────────────────────────────────────
function SectionBadge({ label, color = "#00D4AA" }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-7 h-px" style={{ background: color }} />
      <span
        className="text-xs font-semibold tracking-widest uppercase"
        style={{ color, fontFamily: "DM Sans, sans-serif" }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Feature row ──────────────────────────────────────────────────────────────
function FeatureRow({
  number,
  title,
  accentColor,
  description,
  points,
  visual,
  reverse = false,
}: {
  number: string;
  title: React.ReactNode | string;
  accentColor: string;
  description: string;
  points: Array<{ label: string; text: string }>;
  visual: React.ReactNode | string;
  reverse?: boolean;
}) {
  return (
    <div
      className="grid gap-16 items-center mb-28"
      style={{ gridTemplateColumns: "1fr 1fr" }}
    >
      <div className={reverse ? "order-2" : "order-1"}>
        <div
          className="text-xs font-semibold tracking-widest uppercase mb-3"
          style={{ color: "#4A5568", fontFamily: "DM Mono, monospace" }}
        >
          {number}
        </div>
        <h3
          className="text-4xl font-bold leading-tight mb-5"
          style={{ fontFamily: "Cormorant Garamond, serif", color: "#E8EDF5" }}
        >
          {title}
        </h3>
        <p className="text-base leading-relaxed mb-6" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
          {description}
        </p>
        <ul className="flex flex-col gap-3">
          {points.map((p, i) => (
            <li key={i} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
              <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: accentColor }} />
              <span><strong style={{ color: "#E8EDF5" }}>{p.label}:</strong> {p.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={reverse ? "order-1" : "order-2"}>{visual}</div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AlarmFeatures() {
  // Scroll to top on mount
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <Layout>
      <div style={{ background: "#0A0B14", minHeight: "100vh" }}>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center justify-center text-center overflow-hidden" style={{ minHeight: "90vh", paddingTop: 80 }}>
          {/* Background glows */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse at 50% 30%, rgba(0,212,170,0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.1) 0%, transparent 45%)",
          }} />
          <PulseRings count={5} />

          <div className="relative z-10 max-w-3xl mx-auto px-6">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-8"
              style={{ background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.25)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: "#00D4AA", boxShadow: "0 0 8px #00D4AA" }} />
              New Feature Release
            </div>

            <h1
              className="font-bold leading-tight mb-6"
              style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(3rem, 6vw, 5.5rem)", color: "#fff", textShadow: "0 0 60px rgba(0,212,170,0.25)" }}
            >
              The World's First<br />Brain-Guided Healing Alarm
            </h1>

            <p
              className="text-xl leading-relaxed mb-10"
              style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8FA3BF" }}
            >
              Wake up the way your brain was designed to —<br />gently, scientifically, beautifully.
            </p>

            {/* Brainwave pills */}
            <div className="flex items-center justify-center gap-4 mb-10 flex-wrap">
              {[
                { symbol: "δ", name: "Delta", hz: "3Hz", color: "#8B5CF6" },
                { symbol: "→", name: "", hz: "", color: "#4A5568" },
                { symbol: "θ", name: "Theta", hz: "6Hz", color: "#00D4AA" },
                { symbol: "→", name: "", hz: "", color: "#4A5568" },
                { symbol: "α", name: "Alpha", hz: "10Hz", color: "#F59E0B" },
              ].map((item, i) =>
                item.name ? (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1 px-5 py-3 rounded-lg border"
                    style={{
                      borderColor: `${item.color}40`,
                      background: `${item.color}0D`,
                      minWidth: 90,
                    }}
                  >
                    <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2rem", fontStyle: "italic", fontWeight: 700, color: item.color }}>{item.symbol}</span>
                    <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>{item.name}</span>
                    <span className="text-xs" style={{ color: "#4A5568", fontFamily: "DM Mono, monospace" }}>{item.hz}</span>
                  </div>
                ) : (
                  <span key={i} style={{ color: "#4A5568", fontSize: "1.4rem" }}>→</span>
                )
              )}
            </div>

            <Link href="/alarm">
              <a
                className="inline-flex items-center gap-2 px-9 py-4 rounded-lg font-bold text-base transition-all duration-200"
                style={{
                  background: "rgba(0,212,170,0.15)",
                  border: "1.5px solid rgba(0,212,170,0.5)",
                  color: "#00D4AA",
                  fontFamily: "DM Sans, sans-serif",
                  boxShadow: "0 0 0 rgba(0,212,170,0)",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 30px rgba(0,212,170,0.2)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 rgba(0,212,170,0)"; }}
              >
                Set Your Healing Alarm →
              </a>
            </Link>
          </div>
        </section>

        {/* ── BENEFITS STRIP ───────────────────────────────────────────────── */}
        <section style={{ background: "#0D0E1A", borderTop: "1px solid rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "80px 0" }}>
          <div className="max-w-5xl mx-auto px-8">
            <div className="grid grid-cols-2 gap-10" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {[
                { icon: "🧠", title: "Eliminates Sleep Inertia", desc: "Guides your brain from deep sleep to wakefulness naturally, removing the cortisol spike and hours of grogginess.", color: "#00D4AA" },
                { icon: "🌅", title: "Sunrise Simulation", desc: "The wake screen shifts from warm amber to daylight white, mimicking natural dawn light to regulate your circadian rhythm.", color: "#F59E0B" },
                { icon: "🎯", title: "Breaks the Snooze Habit", desc: "The Alarm Mission requires a 60-second morning ritual before dismissal, making zombie-snoozing structurally impossible.", color: "#8B5CF6" },
                { icon: "🎵", title: "Free Healing Frequencies", desc: "432Hz and 528Hz are now free for all users — delivering the brand promise of healing frequency science every morning.", color: "#00D4AA" },
              ].map((b, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: `${b.color}1A` }}
                  >
                    {b.icon}
                  </div>
                  <div className="font-bold text-base" style={{ color: "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}>{b.title}</div>
                  <div className="text-sm leading-relaxed" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────────────────── */}
        <section id="features" style={{ padding: "100px 0" }}>
          <div className="max-w-5xl mx-auto px-8">
            <SectionBadge label="Six New Features" />
            <h2
              className="font-bold leading-tight mb-4"
              style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(2rem, 4vw, 3.2rem)", color: "#E8EDF5" }}
            >
              An alarm system built on<br /><span style={{ color: "#00D4AA" }}>neuroscience and healing</span>
            </h2>
            <p className="text-lg leading-relaxed mb-20" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif", maxWidth: 640 }}>
              Every feature was designed with a single question: what does the brain actually need to transition from sleep to wakefulness in the healthiest, most harmonious way possible?
            </p>

            {/* Feature 1: Deep Sleep Wake */}
            <FeatureRow
              number="Feature 01"
              title={<>Deep Sleep Wake<br /><span style={{ color: "#8B5CF6" }}>δ → θ → α Sequence</span></>}
              accentColor="#8B5CF6"
              description="The world's first alarm that sweeps binaural beat frequencies in real time, guiding your brain through its natural wake progression. The DDS engine updates the frequency every 5 seconds — phase-continuous, with zero clicks or pops."
              points={[
                { label: "Delta Phase (0–40%)", text: "200Hz carrier + 3Hz beat. Meets the brain in deep sleep at whisper volume." },
                { label: "Theta Phase (40–75%)", text: "Beat sweeps to 6Hz. The hypnagogic threshold — creative and dream-like." },
                { label: "Alpha Phase (75–100%)", text: "Beat sweeps to 10Hz. Relaxed, clear wakefulness at full resonance." },
                { label: "Live indicator", text: "δ / θ / α phase shown on the wake screen in real time." },
              ]}
              visual={
                <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {/* Timeline bar */}
                  <div className="flex h-2.5 rounded-full overflow-hidden mb-2">
                    <div style={{ width: "40%", background: "#8B5CF6", boxShadow: "0 0 12px rgba(139,92,246,0.5)" }} />
                    <div style={{ width: "35%", background: "#00D4AA", boxShadow: "0 0 12px rgba(0,212,170,0.5)" }} />
                    <div style={{ width: "25%", background: "#F59E0B", boxShadow: "0 0 12px rgba(245,158,11,0.5)" }} />
                  </div>
                  <div className="flex text-xs mb-6" style={{ color: "#4A5568", fontFamily: "DM Mono, monospace" }}>
                    <span style={{ width: "40%" }}>0%–40%</span>
                    <span style={{ width: "35%" }}>40%–75%</span>
                    <span style={{ width: "25%" }}>75%–100%</span>
                  </div>
                  <div className="flex gap-3">
                    {[
                      { sym: "δ", label: "Delta", hz: "200Hz + 3Hz", desc: "Deep sleep. Subconscious priming.", color: "#8B5CF6" },
                      { sym: "θ", label: "Theta", hz: "200Hz + 6Hz", desc: "Hypnagogic threshold.", color: "#00D4AA" },
                      { sym: "α", label: "Alpha", hz: "200Hz + 10Hz", desc: "Relaxed wakefulness.", color: "#F59E0B" },
                    ].map((p) => (
                      <div key={p.sym} className="flex-1 rounded-xl p-4" style={{ border: `1px solid ${p.color}30`, background: `${p.color}08` }}>
                        <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.4rem", fontStyle: "italic", fontWeight: 700, color: p.color, marginBottom: 4 }}>{p.sym} {p.label}</div>
                        <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#4A5568", marginBottom: 8 }}>{p.hz}</div>
                        <div style={{ fontSize: "0.8rem", color: "#8FA3BF", fontFamily: "DM Sans, sans-serif", lineHeight: 1.5 }}>{p.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              }
            />

            {/* Feature 2: 4-Stage Escalation */}
            <FeatureRow
              number="Feature 02"
              title={<>4-Stage Progressive<br /><span style={{ color: "#00D4AA" }}>Volume Escalation</span></>}
              accentColor="#00D4AA"
              description="Heavy sleepers don't need a louder alarm — they need a smarter one. Four precisely timed stages replace the binary 'silent to full blast' of conventional alarms."
              points={[
                { label: "Whisper (5%→22%)", text: "Subconscious priming. The healing frequency enters awareness before the conscious mind wakes." },
                { label: "Rise (22%→60%)", text: "Clearly audible, gentle. The body begins to stir naturally." },
                { label: "Full (60%→88%)", text: "Full healing resonance. Unmistakable but never jarring." },
                { label: "Persistent (88%→100%)", text: "Sustained presence. Cannot be slept through." },
              ]}
              reverse
              visual={
                <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-end justify-around gap-4" style={{ height: 200, marginBottom: 16 }}>
                    {[
                      { h: 44, pct: "22%", label: "Whisper", bg: "#00D4AA", opacity: 0.4 },
                      { h: 120, pct: "60%", label: "Rise", bg: "linear-gradient(to top, #00D4AA, #7AE68A)", opacity: 1 },
                      { h: 176, pct: "88%", label: "Full", bg: "linear-gradient(to top, #7AE68A, #F59E0B)", opacity: 1 },
                      { h: 200, pct: "100%", label: "Persistent", bg: "#F59E0B", opacity: 1, glow: true },
                    ].map((bar) => (
                      <div key={bar.label} className="flex flex-col items-center gap-2 flex-1">
                        <div
                          className="w-full rounded-t-sm"
                          style={{
                            height: bar.h,
                            background: bar.bg,
                            opacity: bar.opacity,
                            boxShadow: bar.glow ? "0 0 20px rgba(245,158,11,0.4)" : "none",
                          }}
                        />
                        <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#E8EDF5" }}>{bar.pct}</div>
                        <div style={{ fontSize: "0.72rem", color: "#8FA3BF", fontFamily: "DM Sans, sans-serif", fontWeight: 600 }}>{bar.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 12 }} />
                  <p style={{ fontSize: "0.78rem", color: "#4A5568", textAlign: "center", fontFamily: "DM Sans, sans-serif" }}>Stage timing controlled by Sleep Profile</p>
                </div>
              }
            />

            {/* Feature 3: Sleep Profile */}
            <FeatureRow
              number="Feature 03"
              title={<>Sleep Profile<br /><span style={{ color: "#F59E0B" }}>Personalisation</span></>}
              accentColor="#F59E0B"
              description="One alarm setting does not fit all. Set your Sleep Profile once and the app automatically adjusts the escalation timing every morning — no manual adjustment needed."
              points={[
                { label: "Light Sleeper", text: "Extended 8-minute gradual escalation for those who wake easily." },
                { label: "Normal", text: "Balanced 6-minute escalation — the default for most users." },
                { label: "Heavy Sleeper", text: "Compressed 3-minute curve that skips the Whisper stage." },
                { label: "Very Heavy Sleeper", text: "Escalates to Persistent in 4 minutes for those who historically sleep through alarms." },
              ]}
              visual={
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Light Sleeper", desc: "Slow, gradual 8-min escalation", color: "#00D4AA", pct: "100%" },
                    { label: "Normal", desc: "Balanced 6-min escalation", color: "#8B5CF6", pct: "75%" },
                    { label: "Heavy Sleeper", desc: "Fast 3-min escalation", color: "#F59E0B", pct: "37%" },
                    { label: "Very Heavy", desc: "Rapid 4-min escalation", color: "#EF4444", pct: "50%" },
                  ].map((p) => (
                    <div key={p.label} className="p-4 rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                      <div className="font-bold text-sm mb-1" style={{ color: p.color, fontFamily: "DM Sans, sans-serif" }}>{p.label}</div>
                      <div className="text-xs mb-3" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>{p.desc}</div>
                      <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: p.pct, background: p.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              }
            />

            {/* Feature 4: Free Frequencies */}
            <FeatureRow
              number="Feature 04"
              title={<>Free Healing Frequencies<br /><span style={{ color: "#00D4AA" }}>for Every User</span></>}
              accentColor="#00D4AA"
              description="432Hz and 528Hz are now completely free for alarm use. The alarm is our core brand promise — by making these free, we remove the biggest barrier to entry and give every user a daily healing experience."
              points={[
                { label: "Free badge", text: "Both frequencies show a 'FREE' badge in the alarm editor — no subscription required." },
                { label: "Brand touchpoint", text: "Creates a daily healing experience for free users, building trust and driving premium conversion." },
                { label: "Premium unlocks more", text: "Subscribers access all 10+ Solfeggio frequencies, binaural presets, and studio mixes." },
              ]}
              reverse
              visual={
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { hz: "432", name: "Natural Harmony", desc: "The most universally loved healing frequency. Associated with calm, balance, and natural resonance.", color: "#00D4AA" },
                    { hz: "528", name: "Love Frequency", desc: "The most searched healing frequency. Associated with transformation and cellular healing.", color: "#F59E0B" },
                  ].map((f) => (
                    <div
                      key={f.hz}
                      className="p-6 rounded-2xl text-center relative"
                      style={{
                        border: `1px solid ${f.color}35`,
                        background: `radial-gradient(circle at center, ${f.color}12 0%, transparent 70%)`,
                      }}
                    >
                      <div
                        className="absolute top-3 right-3 text-xs font-bold tracking-widest px-2 py-0.5 rounded"
                        style={{ background: `${f.color}18`, border: `1px solid ${f.color}40`, color: f.color, fontFamily: "DM Mono, monospace" }}
                      >
                        FREE
                      </div>
                      <div
                        className="font-bold leading-none mb-1"
                        style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "3.5rem", color: f.color, textShadow: `0 0 30px ${f.color}40` }}
                      >
                        {f.hz}
                      </div>
                      <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: f.color, marginBottom: 10 }}>Hz</div>
                      <div className="font-semibold text-sm mb-2" style={{ color: "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}>{f.name}</div>
                      <div className="text-xs leading-relaxed" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>{f.desc}</div>
                    </div>
                  ))}
                </div>
              }
            />

            {/* Feature 5: Alarm Mission */}
            <FeatureRow
              number="Feature 05"
              title={<>Alarm Mission<br /><span style={{ color: "#8B5CF6" }}>Anti-Zombie-Snooze</span></>}
              accentColor="#8B5CF6"
              description="Snoozing is a habit loop. Pressing 'I'm Awake' requires the user to complete a 60-second morning ritual before the alarm dismisses. Clinical research shows that a purposeful micro-task within 60 seconds of waking dramatically reduces the chance of falling back asleep."
              points={[
                { label: "Three mission types", text: "Rotate by snooze count to keep the experience fresh and engaging." },
                { label: "Under 60 seconds", text: "Each mission is brief enough to complete while still half-asleep, but purposeful enough to engage the conscious mind." },
                { label: "Habit loop", text: "Wake → ritual → positive emotion → open app → engage with content." },
              ]}
              visual={
                <div className="flex flex-col gap-3">
                  {[
                    { icon: "💨", title: "Breathing Round", desc: "Complete one 4-7-8 breath cycle with an animated progress ring. Activates the parasympathetic nervous system in ~20 seconds.", color: "#00D4AA" },
                    { icon: "🌅", title: "Morning Intention", desc: "Answer one gratitude prompt with a word or phrase. Sets a positive cognitive frame for the entire day.", color: "#F59E0B" },
                    { icon: "🎵", title: "Frequency Recognition", desc: "Tap the correct Hz from three options while the tone plays. Confirms true wakefulness.", color: "#8B5CF6" },
                  ].map((m) => (
                    <div
                      key={m.title}
                      className="flex items-center gap-4 p-4 rounded-xl"
                      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${m.color}` }}
                    >
                      <div className="text-2xl w-9 text-center flex-shrink-0">{m.icon}</div>
                      <div>
                        <div className="font-bold text-sm mb-1" style={{ color: "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}>{m.title}</div>
                        <div className="text-xs leading-relaxed" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>{m.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              }
            />

            {/* Feature 6: Smart Snooze */}
            <FeatureRow
              number="Feature 06"
              title={<>Smart Adaptive Snooze<br /><span style={{ color: "#F59E0B" }}>Therapeutic Re-entry</span></>}
              accentColor="#F59E0B"
              description="Every snooze becomes a therapeutic re-entry, not just a delay. After the first snooze, the alarm re-fires with the 174Hz Foundation Tone — a grounding, deeply calming frequency — for a gentler second wake attempt."
              points={[
                { label: "Remaining count", text: "The snooze button shows how many snoozes are left, building awareness of sleep fragmentation." },
                { label: "174Hz re-entry", text: "After the first snooze, the Foundation Tone replaces the original frequency for a gentler second attempt." },
                { label: "Escalation messaging", text: "After max snoozes, the button disappears and the alarm reaches full Persistent volume with a clear message." },
              ]}
              reverse
              visual={
                <div className="flex flex-col gap-3">
                  {[
                    { num: "1", title: "Initial Alarm — Original Frequency", msg: "[ Snooze 5 min (2 left) ]", color: "#00D4AA" },
                    { num: "↓", title: "", msg: "", color: "#4A5568" },
                    { num: "2", title: "1st Snooze — 174Hz Foundation Tone", msg: '"Frequency shifted to 174Hz for gentle re-entry"', color: "#8B5CF6" },
                    { num: "↓", title: "", msg: "", color: "#4A5568" },
                    { num: "3", title: "Max Snoozes — Full Persistent Volume", msg: '"⚡ Full volume — time to rise in harmony"', color: "#F59E0B" },
                  ].map((s, i) =>
                    s.title ? (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={{ background: `${s.color}18`, color: s.color, fontFamily: "DM Sans, sans-serif" }}
                        >
                          {s.num}
                        </div>
                        <div>
                          <div className="font-bold text-sm mb-1" style={{ color: "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}>{s.title}</div>
                          <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "#4A5568" }}>{s.msg}</div>
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="text-center text-lg" style={{ color: "#4A5568" }}>{s.num}</div>
                    )
                  )}
                </div>
              }
            />
          </div>
        </section>

        {/* ── ROADMAP ───────────────────────────────────────────────────────── */}
        <section id="roadmap" style={{ background: "#0D0E1A", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "100px 0" }}>
          <div className="max-w-5xl mx-auto px-8">
            <SectionBadge label="Platform Roadmap" color="#F59E0B" />
            <h2 className="font-bold leading-tight mb-4" style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(2rem, 4vw, 3.2rem)", color: "#E8EDF5" }}>
              Web is the foundation —<br /><span style={{ color: "#F59E0B" }}>native mobile is the future</span>
            </h2>
            <p className="text-lg leading-relaxed mb-16" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif", maxWidth: 640 }}>
              The current web experience works beautifully when the app is open on your nightstand. The roadmap takes this further — to true system-level alarm reliability that bypasses silent mode entirely.
            </p>
            <div className="grid grid-cols-3 gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              {[
                { phase: "Current", icon: "🌐", title: "Web Foundation", desc: "Full alarm system works reliably when the browser tab is open. All six new features are live at riseinharmony.com.", color: "#00D4AA" },
                { phase: "Near-Term", icon: "📱", title: "Native Mobile", desc: "Android uses STREAM_ALARM to bypass silent mode. iOS applies for Critical Alerts entitlement. Both wake the device from lock screen.", color: "#F59E0B" },
                { phase: "Future", icon: "💓", title: "HRV-Informed Wake", desc: "Integrates with Apple Health and Google Fit overnight HRV data to automatically select the optimal wake window and healing frequency.", color: "#8B5CF6" },
              ].map((col) => (
                <div key={col.phase} className="p-6 rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", borderTop: `3px solid ${col.color}` }}>
                  <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: col.color, fontFamily: "DM Mono, monospace" }}>{col.phase}</div>
                  <div className="text-3xl mb-3">{col.icon}</div>
                  <div className="font-bold text-base mb-3" style={{ color: "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}>{col.title}</div>
                  <div className="text-sm leading-relaxed" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>{col.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SUMMARY TABLE ─────────────────────────────────────────────────── */}
        <section id="summary" style={{ background: "#0D0E1A", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "100px 0" }}>
          <div className="max-w-5xl mx-auto px-8">
            <SectionBadge label="Feature Summary" />
            <h2 className="font-bold leading-tight mb-12" style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(2rem, 4vw, 3.2rem)", color: "#E8EDF5" }}>
              Six features. One vision.
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Feature", "Core Benefit", "Available"].map((h) => (
                    <th key={h} style={{ textAlign: "left", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#00D4AA", padding: "14px 20px", borderBottom: "1px solid rgba(0,212,170,0.3)", fontFamily: "DM Sans, sans-serif" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Deep Sleep Wake (δ→θ→α)", benefit: "Brain-guided wake sequence — eliminates sleep inertia", available: "free" },
                  { feature: "4-Stage Volume Escalation", benefit: "Never miss an alarm — Whisper to Persistent", available: "all" },
                  { feature: "Sleep Profile Personalisation", benefit: "Escalation timing matched to your sleep depth", available: "all" },
                  { feature: "Free 432Hz + 528Hz", benefit: "Daily healing frequency experience for everyone", available: "free" },
                  { feature: "Alarm Mission", benefit: "Breaks the snooze habit with a morning ritual", available: "all" },
                  { feature: "Smart Adaptive Snooze", benefit: "174Hz therapeutic re-entry after first snooze", available: "all" },
                ].map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                    <td style={{ padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontWeight: 700, color: "#E8EDF5", fontFamily: "DM Sans, sans-serif", fontSize: "0.95rem" }}>{row.feature}</td>
                    <td style={{ padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", color: "#8FA3BF", fontFamily: "DM Sans, sans-serif", fontSize: "0.95rem" }}>{row.benefit}</td>
                    <td style={{ padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {row.available === "free" ? (
                        <span style={{ background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.3)", color: "#00D4AA", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "1px", padding: "3px 10px", borderRadius: 4 }}>Free</span>
                      ) : (
                        <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#8FA3BF", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", padding: "3px 10px", borderRadius: 4 }}>All Users</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section style={{ padding: "120px 0", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,212,170,0.12) 0%, transparent 60%)" }} />
          <div className="relative z-10 max-w-3xl mx-auto px-8">
            <h2 className="font-bold leading-tight mb-5" style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(2rem, 4vw, 3.5rem)", color: "#E8EDF5" }}>
              The alarm is no longer a disruption.<br /><span style={{ color: "#00D4AA" }}>It is the beginning of your healing practice.</span>
            </h2>
            <p className="text-xl mb-12" style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8FA3BF" }}>
              Wake up in harmony with your mind, body, and frequency.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/alarm">
                <a
                  className="inline-flex items-center gap-2 px-9 py-4 rounded-lg font-bold text-base"
                  style={{ background: "rgba(0,212,170,0.15)", border: "1.5px solid rgba(0,212,170,0.5)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
                >
                  Set Your Healing Alarm →
                </a>
              </Link>
              <Link href="/">
                <a
                  className="inline-flex items-center gap-2 px-9 py-4 rounded-lg font-semibold text-base"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}
                >
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
