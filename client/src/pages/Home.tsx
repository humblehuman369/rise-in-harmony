/**
 * Home — Rise In Harmony Landing Page
 * Bioluminescent Depth theme: dark void, teal glow, frequency rings
 * Sections: Hero, Features, Frequencies Preview, Testimonials, CTA
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Play, AlarmClock, Waves, Sparkles, ChevronRight, Star, Shield, Zap } from "lucide-react";
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
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/manus-storage/rih-hero-bg_b01c003a.jpg"
            alt="Bioluminescent deep ocean scene representing healing frequency vibrations"
            className="w-full h-full object-cover"
            style={{ opacity: isLight ? 0.75 : 0.55 }}
          />
          <div className="absolute inset-0" style={{
            background: isLight
              ? 'linear-gradient(120deg, rgba(255,252,245,0.95) 0%, rgba(240,252,250,0.80) 45%, rgba(220,240,255,0.70) 75%, rgba(230,220,255,0.60) 100%)'
              : 'linear-gradient(135deg, rgba(10,11,20,0.85) 0%, rgba(10,11,20,0.5) 50%, rgba(10,11,20,0.8) 100%)',
          }} />
        </div>

        {/* Animated rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="absolute rounded-full border"
              style={{
                width: `${200 + i * 120}px`,
                height: `${200 + i * 120}px`,
                borderColor: `rgba(0,212,170,${0.12 - i * 0.03})`,
                animation: `frequency-pulse ${3 + i * 0.8}s ease-in-out infinite`,
                animationDelay: `${i * 0.4}s`,
              }}
            />
          ))}
        </div>

        <div className="container relative z-10 pt-20 pb-16">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8"
              style={{
                background: isLight ? '#00C4A0' : 'rgba(0,212,170,0.1)',
                border: isLight ? 'none' : '1px solid rgba(0,212,170,0.25)',
                color: isLight ? '#FFFFFF' : '#00D4AA',
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
              color: isLight ? '#0D1B3E' : '#E8EDF5',
              lineHeight: 1.05,
            }}>
              Begin your day<br />
              <span className="gradient-text">in resonance.</span>
            </h1>

            <p className="text-lg leading-relaxed mb-10 max-w-xl" style={{
              color: isLight ? '#2D3748' : '#8FA3BF',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              Rise In Harmony replaces your jarring alarm with healing frequencies —
              432Hz, 528Hz, binaural beats, and Chakra tones — that wake your body
              gently and align your energy for the day ahead.
            </p>

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
                  background: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.06)',
                  border: isLight ? '2px solid #00C4A0' : '1px solid rgba(255,255,255,0.12)',
                  color: isLight ? '#00A88A' : '#E8EDF5',
                  fontFamily: 'DM Sans, sans-serif',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isLight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.10)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isLight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.06)'; }}
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
                    style={{ background: c, borderColor: isLight ? '#FFFFFF' : '#0A0B14', color: '#FFFFFF' }}>
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

      {/* TrueHz technology banner */}
      <section className="py-10" style={{ background: isLight ? '#F5F6F9' : '#0A0B14' }}>
        <div className="container">
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
            <img src="/manus-storage/rih-logo-icon_0fedc44f.png" alt="Rise In Harmony logo" className="w-6 h-6 object-contain" />
            <span className="text-sm font-medium" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
              Rise In Harmony
            </span>
          </div>
          <div className="text-xs" style={{ color: isLight ? '#6B7A99' : '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
            © 2026 Rise In Harmony. Begin every morning in resonance.
          </div>
          <div className="flex gap-6">
            {['Privacy', 'Terms', 'Contact'].map(l => (
              <button key={l} onClick={() => toast(`${l} — coming soon`)}
                className="text-xs transition-colors duration-200"
                style={{ color: isLight ? '#6B7A99' : '#4A5568', fontFamily: 'DM Sans, sans-serif' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = isLight ? '#1A1D2E' : '#6B7A99'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = isLight ? '#6B7A99' : '#4A5568'; }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </Layout>
  );
}
