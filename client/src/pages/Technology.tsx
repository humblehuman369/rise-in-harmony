/**
 * Technology — TrueHz™ Precision Tuning
 * The frequency-accuracy story: what a hertz is, why exact tuning matters,
 * why most frequency audio misses the target, and Rise In Harmony's
 * proprietary precision-tuning methodology (without revealing how it works).
 * Bioluminescent Depth theme
 */
import { useLocation } from "wouter";
import { ArrowLeft, Disc, Music2, TrendingDown, Headphones, CheckCircle2, Activity } from "lucide-react";
import Layout from "@/components/Layout";

const STATS = [
  { value: "0.01 Hz", label: "Tuning resolution" },
  { value: "0%", label: "Compression" },
  { value: "2", label: "Independent binaural channels" },
];

const PROBLEMS = [
  {
    icon: Disc,
    color: "#F59E0B",
    title: "Compressed recordings",
    description:
      "Most frequency apps play MP3 files. Lossy compression was designed for music, not precision tones — it discards and smears parts of the signal, so the tone that reaches your ear is an approximation of the frequency on the label.",
  },
  {
    icon: Music2,
    color: "#EC4899",
    title: "Pitch-shifted music",
    description:
      'Much of the "432 Hz music" online is ordinary 440 Hz audio digitally bent after the fact. Pitch-shifting warps every harmonic in the recording — the result is near the target frequency, not at it.',
  },
  {
    icon: TrendingDown,
    color: "#8B5CF6",
    title: "Playback drift",
    description:
      "A recording made at one sample rate gets resampled by whatever hardware plays it back. Every conversion in that chain is a chance for the tone to blur or land slightly off target.",
  },
  {
    icon: Headphones,
    color: "#3B82F6",
    title: 'Pre-baked "binaural" files',
    description:
      "A binaural beat only exists when each ear receives its own precise tone. Pre-mixed stereo recordings can't verify that separation — and collapse into a single muddy tone the moment they hit a speaker or mono playback.",
  },
];

export default function Technology() {
  const [, navigate] = useLocation();

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: '#0A0B14' }}>
        <div className="container max-w-3xl mx-auto px-6 py-10">
          {/* Back */}
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : navigate("/")}
            className="flex items-center gap-2 text-sm mb-8 transition-colors"
            style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5" style={{
              background: 'rgba(0,212,170,0.08)',
              border: '1px solid rgba(0,212,170,0.25)',
            }}>
              <Activity size={13} style={{ color: '#00D4AA' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
                Our Technology
              </span>
            </div>
            <h1 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
              fontWeight: 600,
              color: '#E8EDF5',
              lineHeight: 1.15,
            }}>
              TrueHz™ Precision Tuning
            </h1>
            <p className="mt-4 text-base leading-relaxed max-w-xl mx-auto" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
              Every frequency in Rise In Harmony is mathematically exact. Here's why
              that matters — and why most frequency apps can't say the same.
            </p>
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-3 gap-3 mb-12">
            {STATS.map(s => (
              <div key={s.label} className="glow-card px-4 py-5 text-center">
                <div className="text-xl font-bold font-mono-brand" style={{ color: '#00D4AA' }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* What is a hertz */}
          <h2 className="text-xl font-semibold mb-3" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
            What is a hertz?
          </h2>
          <p className="text-sm leading-relaxed mb-10" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
            A hertz (Hz) is one vibration per second. When you choose 528 Hz, you're
            choosing a sound wave that rises and falls exactly 528 times every
            second — no more, no less. The number isn't a name. It's the frequency itself.
          </p>

          {/* Why accuracy matters */}
          <h2 className="text-xl font-semibold mb-3" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
            Accuracy is the whole point
          </h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
            Frequency work is precision work. A tone that drifts even a few hertz is a
            different tone — if you asked for 528 Hz and received 531 Hz, you didn't
            get what you chose.
          </p>
          <p className="text-sm leading-relaxed mb-10" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
            With brainwave entrainment the margins are tighter still: the gap between a
            6 Hz beat (Theta — deep meditation) and a 10 Hz beat (Alpha — relaxed
            alertness) is just four cycles per second. At that scale, accuracy isn't a
            detail. It's the entire product.
          </p>

          {/* Problems */}
          <h2 className="text-xl font-semibold mb-3" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
            Why most apps miss the mark
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
            We analyzed how frequency audio is typically produced and delivered. Four
            problems come up again and again:
          </p>
          <div className="space-y-4 mb-12">
            {PROBLEMS.map(p => (
              <div key={p.title} className="glow-card p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${p.color}18`, border: `1px solid ${p.color}30` }}>
                  <p.icon size={18} style={{ color: p.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                    {p.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                    {p.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Our answer */}
          <div className="rounded-2xl p-8 mb-10" style={{
            background: 'linear-gradient(135deg, rgba(0,212,170,0.1), rgba(139,92,246,0.06))',
            border: '1px solid rgba(0,212,170,0.25)',
          }}>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={20} style={{ color: '#00D4AA' }} />
              <h2 className="text-xl font-bold" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
                The TrueHz™ difference
              </h2>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#B8C5DB', fontFamily: 'DM Sans, sans-serif' }}>
              Rise In Harmony doesn't play recordings. Every tone is generated in the
              moment, on your device, using our proprietary TrueHz™ precision-tuning
              methodology — synthesized at the exact hertz you choose, tuned to two
              decimal places, and calibrated to your device's audio hardware.
            </p>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#B8C5DB', fontFamily: 'DM Sans, sans-serif' }}>
              Binaural beats are created as two independent, precisely offset tones with
              true left/right separation — never a pre-baked file. No compression. No
              pitch-shifting. No drift. Just the pure frequency.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#B8C5DB', fontFamily: 'DM Sans, sans-serif' }}>
              Exactly how we do it is our secret — but the result is simple to state:
              when this app says 528 Hz, you get 528.00 Hz.
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate("/studio")}
            className="btn-teal w-full py-3.5 text-base font-semibold mb-3"
          >
            Try the Precision Player →
          </button>
          <button
            onClick={() => navigate("/convert")}
            className="w-full py-3.5 text-base font-semibold mb-8 rounded-xl border transition-colors"
            style={{
              borderColor: "rgba(0,212,170,0.35)",
              color: "#00D4AA",
              background: "transparent",
            }}
          >
            TrueHz Convert — retune your tracks →
          </button>

          <p className="text-xs text-center leading-relaxed pb-10" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
            Rise In Harmony is a wellness tool, not a medical device. Frequency
            experiences are personal; claims about specific health outcomes are not
            made or implied.
          </p>
        </div>
      </div>
    </Layout>
  );
}
