/**
 * SilentHealing — /silent-healing
 * Dedicated educational page explaining the Silent Healing Hz category,
 * brainwave entrainment, and how sub-audible frequencies work.
 */
import { useLocation } from "wouter";
import { ArrowLeft, EarOff, Brain, Waves, Zap, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import BioluminescentBackground from "@/components/BioluminescentBackground";
import { useTheme } from "@/contexts/ThemeContext";

const SILENT_HEALING_VIDEO_URL =
  "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/FueLTmWRwbXWxsnA.mp4";

const BRAINWAVE_ZONES = [
  {
    band: "δ Delta",
    range: "0.5 – 4 Hz",
    state: "Deep Sleep",
    color: "#8B5CF6",
    description:
      "The slowest brainwave state. Your body does its deepest physical repair here — growth hormone is released, immune function is restored, and memories are consolidated. Delta is where true rest lives.",
    use: "Deep sleep, physical restoration, unconscious healing",
  },
  {
    band: "θ Theta",
    range: "4 – 8 Hz",
    state: "Meditation & Intuition",
    color: "#6366F1",
    description:
      "The threshold between waking and dreaming. Theta is where deep meditation, intuition, creativity, and emotional processing happen. Many spiritual traditions describe this as the gateway to inner knowing.",
    use: "Deep meditation, intuition, emotional healing, inner wisdom",
  },
  {
    band: "α Alpha",
    range: "8 – 13 Hz",
    state: "Relaxed Presence",
    color: "#00D4AA",
    description:
      "The bridge between thinking and feeling. Alpha is the state of calm, relaxed alertness — what athletes call the zone. Stress dissolves, creativity flows, and the mind becomes receptive without being drowsy.",
    use: "Stress relief, relaxed focus, creative flow, mindfulness",
  },
  {
    band: "β Beta",
    range: "13 – 30 Hz",
    state: "Active Thinking",
    color: "#F97316",
    description:
      "The normal waking state. Beta keeps you alert, focused, and engaged. High Beta can tip into anxiety; low Beta supports calm, productive attention.",
    use: "Focus, productivity, active problem-solving",
  },
];

const EARTH_FREQUENCIES = [
  { hz: "0.05 Hz", name: "Ocean Infrasound", desc: "The deep pulse of ocean waves — primal calm and safety" },
  { hz: "2 Hz", name: "Delta Waves", desc: "Deep sleep and physical restoration" },
  { hz: "4 Hz", name: "Theta Waves", desc: "Deep meditation and inner wisdom" },
  { hz: "7.83 Hz", name: "Schumann Resonance", desc: "Earth's own electromagnetic heartbeat" },
  { hz: "10 Hz", name: "Alpha Waves", desc: "Relaxed presence and stress release" },
  { hz: "14 Hz", name: "Beta Waves", desc: "Calm, focused attention" },
];

export default function SilentHealing() {
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const bg = isLight ? "#F5F6F9" : "#0A0B14";
  const cardBg = isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)";
  const cardBorder = isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.06)";
  const textPrimary = isLight ? "#1A1D2E" : "#E8EDF5";
  const textSecondary = isLight ? "#4A5568" : "#8FA3BF";

  return (
    <Layout>
      <BioluminescentBackground />
      <div className="max-w-2xl mx-auto px-5 pb-24 pt-6 relative" style={{ zIndex: 1 }}>

        {/* Back button */}
        <button
          onClick={() => navigate("/library")}
          className="flex items-center gap-1.5 mb-6 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#FBBF24", fontFamily: "DM Sans, sans-serif" }}
        >
          <ArrowLeft size={14} />
          Back to Library
        </button>

        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#FBBF24", fontFamily: "DM Sans, sans-serif" }}>
            <EarOff size={12} />
            Silent Healing Hz
          </div>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 600, color: textPrimary, lineHeight: 1.15, marginBottom: 12 }}>
            Frequencies You Feel,<br />Not Hear
          </h1>
          <p style={{ fontSize: "1rem", color: textSecondary, lineHeight: 1.75, fontFamily: "DM Sans, sans-serif" }}>
            Some of the most powerful healing frequencies in the library produce no audible tone. If you select one and hear silence — that is not a malfunction. That is the point. These frequencies work through a mechanism called <strong style={{ color: textPrimary }}>brainwave entrainment</strong>, and they have been studied for decades.
          </p>
        </div>

        {/* Silent Healing Hz educational video */}
        <div className="mb-10">
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(251,191,36,0.3)", boxShadow: "0 0 40px rgba(251,191,36,0.06), 0 20px 40px rgba(0,0,0,0.4)", background: "#000" }}>
            {[
              { top: 0, left: 0, borderTop: "2px solid #FBBF24", borderLeft: "2px solid #FBBF24" },
              { top: 0, right: 0, borderTop: "2px solid #FBBF24", borderRight: "2px solid #FBBF24" },
              { bottom: 0, left: 0, borderBottom: "2px solid #FBBF24", borderLeft: "2px solid #FBBF24" },
              { bottom: 0, right: 0, borderBottom: "2px solid #FBBF24", borderRight: "2px solid #FBBF24" },
            ].map((s, i) => (
              <div key={i} style={{ position: "absolute", width: 16, height: 16, zIndex: 2, ...s }} />
            ))}
            <video controls playsInline style={{ display: "block", width: "100%", aspectRatio: "16/9", background: "#000" }}>
              <source src={SILENT_HEALING_VIDEO_URL} type="video/mp4" />
            </video>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-8 p-5 rounded-2xl" style={{ background: cardBg, border: cardBorder }}>
          <div className="flex items-center gap-2 mb-4">
            <Brain size={18} style={{ color: "#00D4AA" }} />
            <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.4rem", fontWeight: 600, color: textPrimary }}>
              How Brainwave Entrainment Works
            </h2>
          </div>
          <p style={{ fontSize: "0.9rem", color: textSecondary, lineHeight: 1.75, fontFamily: "DM Sans, sans-serif", marginBottom: 12 }}>
            Your brain naturally synchronises with rhythmic external stimuli — a phenomenon called the <strong style={{ color: textPrimary }}>frequency following response</strong>. When you are exposed to a rhythmic pulse at a specific rate, your brainwaves gradually shift to match that rate.
          </p>
          <p style={{ fontSize: "0.9rem", color: textSecondary, lineHeight: 1.75, fontFamily: "DM Sans, sans-serif", marginBottom: 12 }}>
            Rise In Harmony uses two methods to deliver sub-audible frequencies:
          </p>
          <div className="grid grid-cols-1 gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="p-4 rounded-xl" style={{ background: "rgba(0,212,170,0.06)", border: "1px solid rgba(0,212,170,0.15)" }}>
              <div className="text-sm font-bold mb-1" style={{ color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}>Binaural Beats</div>
              <p className="text-xs leading-relaxed" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}>
                Two slightly different tones — one in each ear. Your brain perceives the difference as a third, sub-audible beat. <strong style={{ color: textPrimary }}>Headphones required.</strong>
              </p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
              <div className="text-sm font-bold mb-1" style={{ color: "#FBBF24", fontFamily: "DM Sans, sans-serif" }}>Isochronic Pulses</div>
              <p className="text-xs leading-relaxed" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}>
                A single tone pulsed on and off at the target rate. Works through speakers or headphones. <strong style={{ color: textPrimary }}>No headphones needed.</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Brainwave zones */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Waves size={18} style={{ color: "#00D4AA" }} />
            <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.4rem", fontWeight: 600, color: textPrimary }}>
              The Four Brainwave Zones
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {BRAINWAVE_ZONES.map(z => (
              <div key={z.band} className="p-4 rounded-xl" style={{ background: cardBg, border: `1px solid ${z.color}22` }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: z.color }} />
                  <span className="text-sm font-bold" style={{ color: z.color, fontFamily: "DM Sans, sans-serif" }}>{z.band}</span>
                  <span className="text-xs" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}>{z.range}</span>
                  <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${z.color}18`, color: z.color, fontFamily: "DM Sans, sans-serif" }}>{z.state}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}>{z.description}</p>
                <p className="text-xs mt-1.5 font-medium" style={{ color: `${z.color}cc`, fontFamily: "DM Sans, sans-serif" }}>Best for: {z.use}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Earth frequencies */}
        <div className="mb-8 p-5 rounded-2xl" style={{ background: cardBg, border: cardBorder }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} style={{ color: "#FBBF24" }} />
            <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.4rem", fontWeight: 600, color: textPrimary }}>
              Silent Healing Hz in the Library
            </h2>
          </div>
          <p className="text-sm mb-4" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif", lineHeight: 1.7 }}>
            The Library contains 24 sub-audible frequencies. Here are some to start with:
          </p>
          <div className="flex flex-col gap-2">
            {EARTH_FREQUENCIES.map(f => (
              <div key={f.hz} className="flex items-center gap-3 py-2.5 px-3 rounded-xl" style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.1)" }}>
                <span className="text-sm font-bold tabular-nums w-16 flex-shrink-0" style={{ color: "#FBBF24", fontFamily: "DM Sans, sans-serif" }}>{f.hz}</span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: textPrimary, fontFamily: "DM Sans, sans-serif" }}>{f.name}</div>
                  <div className="text-xs" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="mb-8 p-5 rounded-2xl" style={{ background: "rgba(0,212,170,0.04)", border: "1px solid rgba(0,212,170,0.12)" }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: "#00D4AA", fontFamily: "DM Sans, sans-serif", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Tips for Best Results
          </h3>
          {[
            "Use headphones for binaural beats — the effect only works when each ear receives a different tone.",
            "Isochronic pulses work through speakers. No headphones needed.",
            "Give it 5–10 minutes. The frequency following response is gradual, not instant.",
            "Combine with meditation, breathwork, or simply rest. The quieter your mind, the faster the entrainment.",
            "The healing happens in the quiet.",
          ].map((tip, i) => (
            <div key={i} className="flex gap-3 py-2" style={{ borderBottom: i < 4 ? (isLight ? "1px solid rgba(0,0,0,0.05)" : "1px solid rgba(255,255,255,0.04)") : "none" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: "rgba(0,212,170,0.15)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}>{i + 1}</span>
              <p className="text-sm leading-relaxed" style={{ color: i === 4 ? "#FBBF24" : textSecondary, fontFamily: i === 4 ? "Cormorant Garamond, serif" : "DM Sans, sans-serif", fontStyle: i === 4 ? "italic" : "normal", fontSize: i === 4 ? "1rem" : "0.875rem" }}>{tip}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate("/library")}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "#FBBF24", fontFamily: "DM Sans, sans-serif" }}
          >
            <EarOff size={16} />
            Explore Silent Healing Hz in the Library
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => navigate("/studio")}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.2)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
          >
            Try One in Frequency Studio
            <ChevronRight size={14} />
          </button>
        </div>

      </div>
    </Layout>
  );
}
