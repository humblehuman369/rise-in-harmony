/**
 * About — Rise In Harmony Mission & Story
 * Brand story, mission, science behind the frequencies, and team values
 * Bioluminescent Depth theme
 */
import { useLocation } from "wouter";
import { ArrowLeft, Waves, Heart, Sparkles, Shield, Zap, Star } from "lucide-react";
import Layout from "@/components/Layout";

const CONTACT_EMAIL = "hello@riseinharmony.com";

const VALUES = [
  {
    icon: Waves,
    color: "#00D4AA",
    title: "Sound as Medicine",
    description:
      "We believe sound is one of the oldest and most powerful healing tools available to humanity. Every frequency we offer is rooted in decades of acoustic research and ancient wisdom traditions.",
  },
  {
    icon: Heart,
    color: "#EC4899",
    title: "Gentle by Design",
    description:
      "Every product decision we make asks: does this feel gentle? From the 5-minute progressive alarm fade-in to the soft binaural beat transitions, we design for the nervous system first.",
  },
  {
    icon: Sparkles,
    color: "#8B5CF6",
    title: "Accessible Wellness",
    description:
      "Healing should not require expensive equipment, a retreat booking, or a therapist referral. Rise In Harmony puts clinically-informed sound therapy in your pocket, free to start.",
  },
  {
    icon: Shield,
    color: "#3B82F6",
    title: "Privacy First",
    description:
      "Your wellness data is deeply personal. We never sell it, never share it for advertising, and we give you full control to export or delete it at any time.",
  },
  {
    icon: Zap,
    color: "#F59E0B",
    title: "Science-Informed",
    description:
      "Our frequency library is built on published research in psychoacoustics, chronobiology, and neuroscience. We cite our sources and update our content as the science evolves.",
  },
  {
    icon: Star,
    color: "#00D4AA",
    title: "Community-Driven",
    description:
      "Rise In Harmony grows through the feedback of its community. Every feature request, every bug report, and every kind word shapes what we build next.",
  },
];

const FREQUENCIES_EXPLAINED = [
  {
    hz: "174 Hz",
    name: "Foundation",
    description: "The lowest Solfeggio tone. Associated with pain reduction and a sense of security. Used in deep relaxation and grounding practices.",
  },
  {
    hz: "285 Hz",
    name: "Tissue Repair",
    description: "Traditionally associated with renewal and restoration. Often used in relaxation and recovery contexts.",
  },
  {
    hz: "396 Hz",
    name: "Liberation",
    description: "Associated with releasing guilt and fear. Corresponds to the Root Chakra and is used to clear emotional blockages.",
  },
  {
    hz: "432 Hz",
    name: "Natural Tuning",
    description: "An alternative concert pitch said to resonate with the natural world. Many musicians and meditators prefer it for its warm, organic quality.",
  },
  {
    hz: "528 Hz",
    name: "Miracle Tone",
    description: "Often called the \"Love Frequency\" in wellness traditions. Many people use 528 Hz in meditation for its warm, uplifting quality — Rise In Harmony is a wellness tool, not a medical treatment.",
  },
  {
    hz: "639 Hz",
    name: "Connection",
    description: "Associated with harmonising relationships and opening the heart. Corresponds to the Heart Chakra.",
  },
  {
    hz: "741 Hz",
    name: "Expression",
    description: "Linked to self-expression, problem-solving, and awakening intuition. Corresponds to the Throat Chakra.",
  },
  {
    hz: "852 Hz",
    name: "Intuition",
    description: "Associated with returning to spiritual order and awakening inner strength. Corresponds to the Third Eye Chakra.",
  },
  {
    hz: "963 Hz",
    name: "Crown",
    description: "The highest Solfeggio tone. Associated with divine consciousness and transcendence. Corresponds to the Crown Chakra.",
  },
];

export default function About() {
  const [, navigate] = useLocation();

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: '#0A0B14' }}>

        {/* Header */}
        <div className="px-6 pt-8 pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm mb-6 transition-colors duration-200"
            style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#8FA3BF'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B7A99'; }}
          >
            <ArrowLeft size={14} />
            Back to Rise In Harmony
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)' }}>
              <img
                src="/manus-storage/rih-logo-icon_0fedc44f.png"
                alt="Rise In Harmony"
                className="w-6 h-6 object-contain"
              />
            </div>
            <h1 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '2rem',
              fontWeight: 600,
              color: '#E8EDF5',
            }}>
              Our Mission
            </h1>
          </div>
          <p className="text-sm" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            Why we built Rise In Harmony — and what we believe about sound and wellness.
          </p>
        </div>

        <div className="px-6 py-10 max-w-3xl">

          {/* Mission Statement */}
          <div className="mb-12">
            <div className="glow-card p-8 mb-6" style={{
              background: 'linear-gradient(135deg, rgba(0,212,170,0.06), rgba(139,92,246,0.04))',
              border: '1px solid rgba(0,212,170,0.15)',
            }}>
              <p style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
                fontWeight: 500,
                color: '#E8EDF5',
                lineHeight: 1.5,
              }}>
                "To make the ancient science of sound healing accessible to every person — beginning with the most
                important moment of the day: the moment you wake up."
              </p>
            </div>
          </div>

          {/* Story */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-6" style={{
              fontFamily: 'Cormorant Garamond, serif',
              color: '#E8EDF5',
            }}>
              The Story
            </h2>
            <div className="space-y-4">
              {[
                "Most of us begin our day with a jolt. A buzzing phone. A blaring alarm. A spike of cortisol before we have even opened our eyes. For thousands of years, humans woke with the sun — gradually, gently, in rhythm with the natural world. Modern life severed that connection.",
                "Rise In Harmony was built to restore it. We started with a simple question: what if your alarm clock could heal you instead of startle you? What if the first sound you heard each morning was tuned to support your nervous system, align your energy, and set an intention for the day ahead?",
                "We spent months researching the Solfeggio frequency scale, binaural beat entrainment, and the psychoacoustics of waking. We studied chronobiology — the science of how light and sound affect the body's internal clock. We spoke with meditation teachers, sound healers, sleep researchers, and everyday people who were exhausted by the way modern mornings felt.",
                "The result is Rise In Harmony: a healing frequency alarm, a meditation library, a sound studio, and a chakra journey — all designed around one belief: that how you begin your day shapes everything that follows.",
              ].map((para, i) => (
                <p key={i} className="text-sm leading-relaxed"
                  style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
                  {para}
                </p>
              ))}
            </div>
          </div>

          {/* Values */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-6" style={{
              fontFamily: 'Cormorant Garamond, serif',
              color: '#E8EDF5',
            }}>
              What We Stand For
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {VALUES.map(({ icon: Icon, color, title, description }) => (
                <div key={title} className="glow-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <h3 className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                      {title}
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* The Science */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-2" style={{
              fontFamily: 'Cormorant Garamond, serif',
              color: '#E8EDF5',
            }}>
              The Frequencies
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
              The Solfeggio scale is a set of ancient musical tones used in Gregorian chants and rediscovered by
              researchers in the 1990s. Each frequency is associated with specific physiological and psychological
              effects. Below is our complete frequency library and what each tone is believed to support.
            </p>
            <div className="space-y-3">
              {FREQUENCIES_EXPLAINED.map(({ hz, name, description }) => (
                <div key={hz} className="flex gap-4 p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex-shrink-0 w-16 text-right">
                    <span className="text-sm font-semibold" style={{ color: '#00D4AA', fontFamily: 'DM Mono, monospace' }}>
                      {hz}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold mb-1" style={{ color: '#C8D5E8', fontFamily: 'DM Sans, sans-serif' }}>
                      {name}
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                      {description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs mt-4 leading-relaxed" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
              Note: The effects described above are based on traditional use and emerging research in psychoacoustics.
              Rise In Harmony does not make medical claims. See our{" "}
              <button onClick={() => navigate("/terms")} style={{ color: '#6B7A99', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 'inherit' }}>
                Terms of Service
              </button>{" "}
              for our full health disclaimer.
            </p>
          </div>

          {/* Contact */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-4" style={{
              fontFamily: 'Cormorant Garamond, serif',
              color: '#E8EDF5',
            }}>
              Get in Touch
            </h2>
            <div className="glow-card p-6">
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
                We are a small, independent team and we read every message. Whether you have a feature request,
                a question about a frequency, or just want to share how Rise In Harmony has helped your mornings —
                we would love to hear from you.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200"
                style={{
                  background: 'rgba(0,212,170,0.1)',
                  border: '1px solid rgba(0,212,170,0.25)',
                  color: '#00D4AA',
                  fontFamily: 'DM Sans, sans-serif',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,170,0.18)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,170,0.1)'; }}
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-center" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
              © 2026 Rise In Harmony · Begin every morning in resonance.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
