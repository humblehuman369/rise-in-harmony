/**
 * Home — Rise In Harmony Landing Page
 * Bioluminescent Depth theme: dark void, teal glow, frequency rings
 * Sections: Hero, Features, Frequencies Preview, Testimonials, CTA
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Play, AlarmClock, Waves, Sparkles, ChevronRight, Star, Shield, Zap, Map } from "lucide-react";
import Layout from "@/components/Layout";
import PricingSection from "@/components/PricingSection";
import { FREQUENCIES } from "@/hooks/useFrequencyPlayer";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

const features = [
  {
    icon: AlarmClock,
    title: "Healing Alarm Clock",
    description: "Wake up to 432Hz or 528Hz instead of a jarring buzz. Progressive fade-in over 5 minutes eases you into consciousness.",
    color: "#F59E0B",
  },
  {
    icon: Waves,
    title: `${FREQUENCIES.length} Healing Frequencies`,
    description: "The complete Solfeggio scale from 174Hz to 963Hz, binaural beats for Alpha, Theta, and Delta brainwave states, plus studio-recorded Schumann sessions.",
    color: "#00D4AA",
  },
  {
    icon: Sparkles,
    title: "Chakra Wake Sequences",
    description: "Guided 7-chakra morning sequences that align your energy centers from root to crown before you even get out of bed.",
    color: "#8B5CF6",
  },
  {
    icon: Shield,
    title: "Offline First",
    description: "All frequencies cached locally. Your morning ritual works even in airplane mode — no Wi-Fi required.",
    color: "#3B82F6",
  },
  {
    icon: Zap,
    title: "Real-Time Visualization",
    description: "Watch your frequency as a living waveform. Concentric rings pulse in sync with the sound, creating a meditative focus point.",
    color: "#EC4899",
  },
  {
    icon: Star,
    title: "Wellness Analytics",
    description: "Track your healing sessions, streak, and wellness trends. Understand how your morning ritual impacts your day.",
    color: "#F59E0B",
  },
];

const useCases = [
  {
    title: "Wake in resonance",
    text: "Replace the jarring default alarm with a 528Hz sunrise. Progressive fade-in wakes you gently — no cortisol spike, no snooze-button dread.",
  },
  {
    title: "Drop into deep work",
    text: "Alpha binaural beats at 10Hz set a relaxed-alert brainwave state. Layer in rain or a drone bed and let a 90-minute focus block fly by.",
  },
  {
    title: "Unwind into sleep",
    text: "Delta binaural tones with an ocean layer and a sleep timer that fades everything to silence — a wind-down ritual your evenings will keep.",
  },
];

const freeFrequencies = FREQUENCIES.filter(f => !f.isPremium).slice(0, 3);

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background gradient — bioluminescent depth */}
        <div className="absolute inset-0 z-0" style={{
          background: isLight
            ? 'linear-gradient(135deg, #EDF0F7 0%, #D4EEF0 40%, #E0F0EE 100%)'
            : 'linear-gradient(160deg, #0A0B14 0%, #071828 40%, #071A20 70%, #0A0B14 100%)',
        }}>
          <div className="absolute inset-0" style={{
            background: isLight
              ? 'radial-gradient(ellipse 90% 70% at 65% 45%, rgba(0,212,170,0.1) 0%, transparent 65%)'
              : 'radial-gradient(ellipse 90% 70% at 65% 45%, rgba(0,212,170,0.14) 0%, rgba(0,80,120,0.08) 40%, transparent 70%)',
          }} />
        </div>

        {/* Animated rings — bioluminescent */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" style={{ right: '-20%', top: '10%' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="absolute rounded-full border"
              style={{
                width: `${150 + i * 100}px`,
                height: `${150 + i * 100}px`,
                borderColor: `rgba(0,212,170,${Math.max(0.02, 0.14 - i * 0.025)})`,
                animation: `frequency-pulse ${2.5 + i * 0.7}s ease-in-out infinite`,
                animationDelay: `${i * 0.35}s`,
                boxShadow: i === 1 ? '0 0 30px rgba(0,212,170,0.08)' : 'none',
              }}
            />
          ))}
          {/* Center glow orb */}
          <div className="absolute w-16 h-16 rounded-full" style={{
            background: 'radial-gradient(circle, rgba(0,212,170,0.3) 0%, rgba(0,212,170,0.05) 60%, transparent 100%)',
            animation: 'bio-pulse 4s ease-in-out infinite',
          }} />
        </div>
        {/* Secondary purple ring cluster — top right */}
        {!isLight && (
          <div className="absolute pointer-events-none z-0" style={{ top: '15%', right: '10%' }}>
            {[1, 2].map(i => (
              <div key={i} className="absolute rounded-full border" style={{
                width: `${60 + i * 40}px`,
                height: `${60 + i * 40}px`,
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                borderColor: `rgba(139,92,246,${0.12 - i * 0.04})`,
                animation: `frequency-pulse ${4 + i * 1}s ease-in-out infinite`,
                animationDelay: `${i * 0.6}s`,
              }} />
            ))}
          </div>
        )}

        <div className="container relative z-10 pt-20 pb-16">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8"
              style={{
                background: 'rgba(0,212,170,0.1)',
                border: '1px solid rgba(0,212,170,0.25)',
                color: '#00D4AA',
                fontFamily: 'DM Sans, sans-serif',
              }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
              Your morning ritual, reimagined
            </div>

            {/* Headline */}
            <h1 className="mb-6 leading-tight" style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(3rem, 7vw, 5.5rem)',
              fontWeight: 600,
              color: isLight ? '#1A1D2E' : '#E8EDF5',
              lineHeight: 1.05,
            }}>
              Begin your day<br />
              <span className="gradient-text">in resonance.</span>
            </h1>

            <p className="text-lg leading-relaxed mb-10 max-w-xl" style={{
              color: isLight ? '#4A5568' : '#8FA3BF',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              Rise In Harmony replaces your jarring alarm with healing frequencies —
              432Hz, 528Hz, binaural beats, and Chakra tones — that wake your body
              gently and align your energy for the day ahead.
            </p>

            {/* Journey discovery CTA — prominent banner above action buttons */}
            <button
              onClick={() => navigate("/journey")}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl mb-6 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(0,212,170,0.12), rgba(139,92,246,0.08))',
                border: '1px solid rgba(0,212,170,0.3)',
                maxWidth: '460px',
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0,212,170,0.18)', border: '1px solid rgba(0,212,170,0.35)' }}
              >
                <Map size={16} style={{ color: '#00D4AA' }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
                  Discover Your Healing Journey
                </div>
                <div className="text-xs" style={{ color: 'rgba(232,237,245,0.5)', fontFamily: 'DM Sans, sans-serif' }}>
                  See how sound heals — body, mind &amp; soul
                </div>
              </div>
              <ChevronRight size={16} style={{ color: '#00D4AA', flexShrink: 0 }} />
            </button>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate("/player")}
                className="btn-teal flex items-center gap-2 px-8 py-3.5 text-base font-semibold"
              >
                <Play size={18} fill="currentColor" />
                Try a Frequency
              </button>
              <button
                onClick={() => navigate("/alarm")}
                className="flex items-center gap-2 px-8 py-3.5 text-base font-semibold rounded-full transition-all duration-200"
                style={{
                  background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
                  border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)',
                  color: isLight ? '#1A1D2E' : '#E8EDF5',
                  fontFamily: 'DM Sans, sans-serif',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'; }}
              >
                <AlarmClock size={18} />
                Set Healing Alarm
              </button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-6 mt-10">
              <div className="flex -space-x-2">
                {['#00D4AA','#8B5CF6','#F59E0B','#3B82F6'].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{ background: c, borderColor: '#0A0B14', color: '#0A0B14' }}>
                    {['B','K','B','C'][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5 mb-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="#F59E0B" color="#F59E0B" />)}
                </div>
                <div className="text-xs" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                  Loved by early adopters
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Walkthrough Video Section ── */}
      <section className="py-16" style={{ background: isLight ? '#EDF0F7' : '#080910', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container">
          {/* Section header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
              <div style={{ width: 28, height: 1, background: '#00D4AA' }} />
              See It In Action
              <div style={{ width: 28, height: 1, background: '#00D4AA' }} />
            </div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 700, color: isLight ? '#1A1D2E' : '#E8EDF5', lineHeight: 1.2, marginBottom: 12 }}>
              Your complete healing practice,<br />
              <span style={{ color: '#00D4AA', fontStyle: 'italic' }}>in one app.</span>
            </h2>
            <p style={{ fontSize: '1rem', color: '#8FA3BF', maxWidth: 560, margin: '0 auto', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.7 }}>
              From your morning alarm to guided Reiki sessions — watch how Rise In Harmony walks you through a complete day of healing.
            </p>
          </div>

          {/* Video player */}
          <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative' }}>
            {/* Glow halo behind the video */}
            <div style={{ position: 'absolute', inset: -2, background: 'linear-gradient(135deg, rgba(0,212,170,0.3), rgba(139,92,246,0.2), rgba(245,158,11,0.15))', filter: 'blur(24px)', opacity: 0.5, zIndex: 0, borderRadius: 4 }} />
            <div style={{ position: 'relative', zIndex: 1, border: '1px solid rgba(0,212,170,0.25)', boxShadow: '0 0 60px rgba(0,212,170,0.1), 0 32px 64px rgba(0,0,0,0.5)', background: '#000', borderRadius: 4, overflow: 'hidden' }}>
              {/* Corner accents */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTop: '2px solid #00D4AA', borderLeft: '2px solid #00D4AA', zIndex: 2 }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderTop: '2px solid #00D4AA', borderRight: '2px solid #00D4AA', zIndex: 2 }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, borderBottom: '2px solid #00D4AA', borderLeft: '2px solid #00D4AA', zIndex: 2 }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottom: '2px solid #00D4AA', borderRight: '2px solid #00D4AA', zIndex: 2 }} />
              <video
                controls
                autoPlay
                muted
                loop
                playsInline
                poster="https://files.manuscdn.com/user_upload_by_module/session_file/110672315/ogogFVfpAWOFjhwM.png"
                style={{ display: 'block', width: '100%', aspectRatio: '16/9', background: '#000' }}
              >
                <source src="https://files.manuscdn.com/user_upload_by_module/session_file/110672315/slhyBjmPRMvrbWpF.mp4" type="video/mp4" />
              </video>
            </div>
          </div>

          {/* Four feature pills below the video */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8" style={{ maxWidth: 960, margin: '32px auto 0' }}>
            {[
              { icon: '⏰', color: '#00D4AA', label: 'Healing Alarm', sub: '432Hz · 528Hz · δ→θ→α' },
              { icon: '🎛️', color: '#8B5CF6', label: 'Frequency Studio', sub: '1–22,000 Hz · DDS engine' },
              { icon: '🪷', color: '#F59E0B', label: 'Meditation Player', sub: '9 TrueHz tracks · 60 min' },
              { icon: '✦', color: '#00D4AA', label: 'Reiki Sessions', sub: '5-phase · Crystal & Tibetan' },
            ].map(f => (
              <div key={f.label} style={{ padding: '16px 20px', border: `1px solid ${f.color}22`, background: `${f.color}08`, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isLight ? '#1A1D2E' : '#E8EDF5', fontFamily: 'DM Sans, sans-serif', marginBottom: 3 }}>{f.label}</div>
                <div style={{ fontSize: '0.72rem', color: '#6B7A99', fontFamily: 'DM Mono, monospace' }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TrueHz technology banner */}
      <section className="py-10" style={{ background: isLight ? '#F5F6F9' : '#0A0B14' }}>
        <div className="container space-y-4">
          <button
            onClick={() => navigate("/technology")}
            className="w-full text-left rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5 transition-transform hover:scale-[1.01]"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,170,0.1), rgba(139,92,246,0.06))',
              border: '1px solid rgba(0,212,170,0.25)',
            }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.3)' }}>
              <span className="font-bold" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>Hz</span>
            </div>
            <div className="flex-1">
              <div className="text-base font-bold mb-1" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
                TrueHz™ Precision Tuning
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
                Most frequency apps play compressed or pitch-shifted recordings.
                Every tone here is generated live with 0.01 Hz tuning resolution.
              </p>
            </div>
            <span className="text-sm font-semibold flex-shrink-0" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
              See why it matters →
            </span>
          </button>
          <button
            onClick={() => navigate("/convert?from=home")}
            className="w-full text-left rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 transition-transform hover:scale-[1.01]"
            style={{
              background: isLight ? '#FFFFFF' : '#12152A',
              border: '1px solid rgba(139,92,246,0.25)',
            }}
          >
            <div className="flex-1">
              <div className="text-sm font-bold mb-1" style={{ color: '#A78BFA', fontFamily: 'DM Sans, sans-serif' }}>
                TrueHz Convert
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
                Upload your own track and retune it by concert pitch (e.g. A=440 → A=432).
                Optional TrueHz pure-tone bed under the mix.
              </p>
            </div>
            <span className="text-sm font-semibold flex-shrink-0" style={{ color: '#A78BFA', fontFamily: 'DM Sans, sans-serif' }}>
              Open Convert →
            </span>
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24" style={{ background: isLight ? '#F5F6F9' : '#0A0B14' }}>
        <div className="container">
          <div className="text-center mb-16">
            <div className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
              Why Rise In Harmony
            </div>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 600,
              color: isLight ? '#1A1D2E' : '#E8EDF5',
            }}>
              Your morning ritual,<br />
              <span className="gradient-text">elevated.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Deep Sleep Wake featured card — spans full width on mobile, 2 cols on lg */}
            <a
              href="/deep-sleep-wake"
              className="glow-card p-6 col-span-1 md:col-span-2 lg:col-span-3 flex items-center justify-between gap-6 group"
              style={{ textDecoration: 'none', border: '1px solid rgba(139,92,246,0.25)', background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(0,212,170,0.04))' }}
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontStyle: 'italic', color: '#8B5CF6' }}>δ</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#8B5CF6', fontFamily: 'DM Sans, sans-serif' }}>New Feature</span>
                  </div>
                  <h3 className="text-base font-semibold mb-1" style={{ color: isLight ? '#1A1D2E' : '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                    Deep Sleep Wake Sequence
                  </h3>
                  <p className="text-sm" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                    The world's first alarm that sweeps δ→θ→α brainwave frequencies in real time — guiding your brain out of deep sleep naturally.
                  </p>
                </div>
              </div>
              <div className="text-sm font-semibold flex-shrink-0 flex items-center gap-1" style={{ color: '#8B5CF6', fontFamily: 'DM Sans, sans-serif' }}>
                Watch the video →
              </div>
            </a>

            {features.map((f, i) => (
              <div
                key={f.title}
                className="glow-card p-6"
                style={{
                  animation: 'fade-up 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards',
                  animationDelay: `${i * 80}ms`,
                  opacity: 0,
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
                  <f.icon size={20} style={{ color: f.color }} />
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: isLight ? '#1A1D2E' : '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free Frequencies Preview */}
      <section className="py-24" style={{ background: isLight ? '#EDF0F7' : '#0D0F1E' }}>
        <div className="container">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            {/* Left: Text */}
            <div className="flex-1">
              <div className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8B5CF6', fontFamily: 'DM Sans, sans-serif' }}>
                Free Frequencies
              </div>
              <h2 className="mb-6" style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                fontWeight: 600,
                color: isLight ? '#1A1D2E' : '#E8EDF5',
              }}>
                Start healing.<br />No subscription needed.
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: isLight ? '#4A5568' : '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                Three powerful frequencies are completely free. Experience the difference
                before upgrading to the full {FREQUENCIES.length}-sound library.
              </p>
              <button
                onClick={() => navigate("/library")}
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}
              >
                Explore the full library
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Right: Frequency cards */}
            <div className="flex-1 space-y-4 w-full max-w-md">
              {freeFrequencies.map((freq) => (
                <div
                  key={freq.id}
                  className="glow-card p-5 flex items-center gap-4 cursor-pointer"
                  onClick={() => navigate("/player")}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${freq.color}18`, border: `1px solid ${freq.color}30` }}>
                    <span className="font-mono-brand text-xs font-bold" style={{ color: freq.color }}>
                      {freq.hz}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold mb-0.5" style={{ color: isLight ? '#1A1D2E' : '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                      {freq.name}
                    </div>
                    <div className="text-xs truncate" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                      {freq.benefit}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                    style={{ background: 'rgba(0,212,170,0.1)', color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
                    <Play size={10} fill="currentColor" />
                    Free
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Rituals — how people use it */}
      <section className="py-24" style={{ background: isLight ? '#F5F6F9' : '#0A0B14' }}>
        <div className="container">
          <div className="text-center mb-16">
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 600,
              color: isLight ? '#1A1D2E' : '#E8EDF5',
            }}>
              Built for your daily rituals.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {useCases.map((u) => (
              <div key={u.title} className="glow-card p-6">
                <div className="text-sm font-semibold mb-3" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
                  {u.title}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: isLight ? '#4A5568' : '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
                  {u.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden" style={{ background: isLight ? '#EDF0F7' : '#0D0F1E' }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 rounded-full" style={{
            background: 'radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)',
          }} />
        </div>
        <div className="container relative z-10 text-center">
          <h2 className="mb-6" style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 600,
            color: isLight ? '#1A1D2E' : '#E8EDF5',
          }}>
            Your morning.<br />
            <span className="gradient-text">Your frequency.</span><br />
            Your harmony.
          </h2>
          <p className="text-base mb-10 max-w-md mx-auto" style={{ color: isLight ? '#4A5568' : '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            Join thousands waking up with intention. Start with three free frequencies today.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate("/player")}
              className="btn-teal flex items-center gap-2 px-10 py-4 text-base font-semibold"
            >
              <Play size={18} fill="currentColor" />
              Start Free — No Sign Up
            </button>
            <button
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-2 px-10 py-4 text-base font-semibold rounded-full transition-all duration-200"
              style={{
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.3)',
                color: '#8B5CF6',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              <Sparkles size={18} />
              Go Premium — from $4.17/mo
            </button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* Footer */}
      <footer className="py-8 border-t" style={{ borderColor: isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)', background: isLight ? '#EDF0F7' : '#0A0B14' }}>
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/rih-logo.svg" alt="Rise In Harmony logo" className="w-6 h-6 object-contain" />
            <span className="text-sm font-medium" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
              Rise In Harmony
            </span>
          </div>
          <div className="text-xs" style={{ color: isLight ? '#6B7A99' : '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
            © 2026 Rise In Harmony. Begin every morning in resonance.
          </div>
          <div className="flex gap-6">
            {([['Privacy', '/privacy'], ['Terms', '/terms'], ['Contact', 'mailto:hello@riseinharmony.com']] as [string, string][]).map(([l, href]) => (
              <a key={l} href={href}
                className="text-xs transition-colors duration-200"
                style={{ color: isLight ? '#6B7A99' : '#4A5568', fontFamily: 'DM Sans, sans-serif', textDecoration: 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = isLight ? '#1A1D2E' : '#6B7A99'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = isLight ? '#6B7A99' : '#4A5568'; }}>
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </Layout>
  );
}
