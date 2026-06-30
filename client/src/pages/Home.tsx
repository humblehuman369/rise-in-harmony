/**
 * Home — Rise In Harmony Landing Page
 * Bioluminescent Depth theme: dark void, teal glow, frequency rings
 * Sections: Hero, Features, Frequencies Preview, Testimonials, CTA
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Play, AlarmClock, Waves, Sparkles, ChevronRight, Star, Shield, Zap } from "lucide-react";
import Layout from "@/components/Layout";
import { FREQUENCIES } from "@/hooks/useFrequencyPlayer";
import { toast } from "sonner";

const features = [
  {
    icon: AlarmClock,
    title: "Healing Alarm Clock",
    description: "Wake up to 432Hz or 528Hz instead of a jarring buzz. Progressive fade-in over 5 minutes eases you into consciousness.",
    color: "#F59E0B",
  },
  {
    icon: Waves,
    title: "12+ Solfeggio Frequencies",
    description: "The complete Solfeggio scale from 174Hz to 963Hz, plus binaural beats for Alpha, Theta, and Delta brainwave states.",
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
    title: "Sleep Analytics",
    description: "Track your healing sessions, streak, and wellness trends. Understand how your morning ritual impacts your day.",
    color: "#F59E0B",
  },
];

const testimonials = [
  {
    name: "Sarah M.",
    role: "Yoga Instructor",
    text: "I've tried every meditation app. Rise In Harmony is the only one that actually changes how I feel when I wake up. The 528Hz sequence is transformative.",
    rating: 5,
  },
  {
    name: "James K.",
    role: "Software Engineer",
    text: "The binaural beats for focus are incredible. I use the Alpha wave session every morning before deep work. My productivity has genuinely improved.",
    rating: 5,
  },
  {
    name: "Priya D.",
    role: "Wellness Coach",
    text: "I recommend this to all my clients. The Chakra awakening sequence is exactly what I was looking for in a morning ritual app.",
    rating: 5,
  },
];

const freeFrequencies = FREQUENCIES.filter(f => !f.isPremium).slice(0, 3);

export default function Home() {
    const { user } = useAuth();
  const [, navigate] = useLocation();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/manus-storage/rih-hero-bg_b01c003a.jpg"
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: 0.55 }}
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(135deg, rgba(10,11,20,0.85) 0%, rgba(10,11,20,0.5) 50%, rgba(10,11,20,0.8) 100%)',
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
              color: '#E8EDF5',
              lineHeight: 1.05,
            }}>
              Begin your day<br />
              <span className="gradient-text">in resonance.</span>
            </h1>

            <p className="text-lg leading-relaxed mb-10 max-w-xl" style={{
              color: '#8FA3BF',
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
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#E8EDF5',
                  fontFamily: 'DM Sans, sans-serif',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
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
                    {['S','J','P','M'][i]}
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

      {/* Features Section */}
      <section className="py-24" style={{ background: '#0A0B14' }}>
        <div className="container">
          <div className="text-center mb-16">
            <div className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
              Why Rise In Harmony
            </div>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 600,
              color: '#E8EDF5',
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
                <h3 className="text-base font-semibold mb-2" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
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
      <section className="py-24" style={{ background: '#0D0F1E' }}>
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
                color: '#E8EDF5',
              }}>
                Start healing.<br />No subscription needed.
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                Three powerful frequencies are completely free. Experience the difference
                before upgrading to the full 12-frequency library.
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
                    <div className="text-sm font-semibold mb-0.5" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
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

      {/* Testimonials */}
      <section className="py-24" style={{ background: '#0A0B14' }}>
        <div className="container">
          <div className="text-center mb-16">
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 600,
              color: '#E8EDF5',
            }}>
              Mornings transformed.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="glow-card p-6">
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="#F59E0B" color="#F59E0B" />)}
                </div>
                <p className="text-sm leading-relaxed mb-6" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
                  "{t.text}"
                </p>
                <div>
                  <div className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>{t.name}</div>
                  <div className="text-xs" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden" style={{ background: '#0D0F1E' }}>
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
            color: '#E8EDF5',
          }}>
            Your morning.<br />
            <span className="gradient-text">Your frequency.</span><br />
            Your harmony.
          </h2>
          <p className="text-base mb-10 max-w-md mx-auto" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
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
              onClick={() => toast("Premium — $7.99/month or $49.99/year. Coming soon!")}
              className="flex items-center gap-2 px-10 py-4 text-base font-semibold rounded-full transition-all duration-200"
              style={{
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.3)',
                color: '#8B5CF6',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              <Sparkles size={18} />
              Go Premium — $7.99/mo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0A0B14' }}>
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/manus-storage/rih-logo-icon_0fedc44f.png" alt="" className="w-6 h-6 object-contain" />
            <span className="text-sm font-medium" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
              Rise In Harmony
            </span>
          </div>
          <div className="text-xs" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
            © 2026 Rise In Harmony. Begin every morning in resonance.
          </div>
          <div className="flex gap-6">
            {['Privacy', 'Terms', 'Contact'].map(l => (
              <button key={l} onClick={() => toast(`${l} — coming soon`)}
                className="text-xs transition-colors duration-200"
                style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#6B7A99'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4A5568'; }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </Layout>
  );
}
