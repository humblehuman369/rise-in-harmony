/**
 * Home — Rise In Harmony Landing Page (Redesigned)
 *
 * Design philosophy:
 * - First screen acknowledges why the user came: a healing alarm
 * - Immediately reveals the broader world they've entered
 * - Bioluminescent analog clock as the hero visual anchor
 * - Single dominant CTA above the fold, no confusion
 * - Conversion flow: Hook → Reveal → Proof → Pricing
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import {
  AlarmClock, Play, ChevronRight, Star, Sparkles,
  Waves, Moon, Zap, BookOpen, Activity
} from "lucide-react";
import Layout from "@/components/Layout";
import BioluminescentBackground from "@/components/BioluminescentBackground";
import PricingSection from "@/components/PricingSection";
import { FREQUENCIES } from "@/hooks/useFrequencyPlayer";
import { startLogin, startSignup } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";

// ── Live bioluminescent analog clock (hero) ───────────────────────────────────
function HeroClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const SIZE = 200;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = SIZE / 2 - 10;

  const hrs = now.getHours() % 12;
  const min = now.getMinutes();
  const sec = now.getSeconds();
  const ms  = now.getMilliseconds();
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  const h12  = now.getHours() > 12 ? now.getHours() - 12 : now.getHours() === 0 ? 12 : now.getHours();
  const digitalTime = `${String(h12).padStart(2,'0')}:${String(min).padStart(2,'0')}`;

  const secAngle = ((sec + ms / 1000) / 60) * 360 - 90;
  const minAngle = ((min + sec / 60) / 60) * 360 - 90;
  const hrAngle  = ((hrs + min / 60) / 12) * 360 - 90;

  const toXY = (a: number, len: number) => ({
    x: cx + Math.cos((a * Math.PI) / 180) * len,
    y: cy + Math.sin((a * Math.PI) / 180) * len,
  });

  const hrEnd   = toXY(hrAngle,  R * 0.50);
  const minEnd  = toXY(minAngle, R * 0.70);
  const secEnd  = toXY(secAngle, R * 0.82);
  const secTail = toXY(secAngle + 180, R * 0.18);

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * 360 - 90;
    const isMajor = i % 5 === 0;
    const isQ = i % 15 === 0;
    return {
      outer: toXY(a, R - 2),
      inner: toXY(a, isQ ? R - 14 : isMajor ? R - 9 : R - 5),
      isMajor, isQ,
    };
  });

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE + 80, height: SIZE + 80 }}>
      {/* Outer glow halo */}
      <div className="absolute inset-0 rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(0,212,170,0.18) 0%, rgba(0,212,170,0.04) 45%, transparent 70%)',
        filter: 'blur(16px)',
        animation: 'bio-pulse 4s ease-in-out infinite',
      }} />
      <svg width={SIZE} height={SIZE} style={{ position: 'relative', zIndex: 1, overflow: 'visible' }}>
        <defs>
          <radialGradient id="hc-face" cx="50%" cy="38%" r="65%">
            <stop offset="0%" stopColor="#0E2030" />
            <stop offset="55%" stopColor="#060C14" />
            <stop offset="100%" stopColor="#020508" />
          </radialGradient>
          <filter id="hc-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="hc-sglow" x="-80%" y="-80%" width="360%" height="360%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="hc-tglow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Bezel glow */}
        <circle cx={cx} cy={cy} r={R + 5} fill="none" stroke="rgba(0,212,170,0.10)" strokeWidth="10" filter="url(#hc-glow)" />
        <circle cx={cx} cy={cy} r={R + 5} fill="none" stroke="rgba(0,212,170,0.65)" strokeWidth="1.2" />
        <circle cx={cx} cy={cy} r={R + 1} fill="none" stroke="rgba(0,212,170,0.15)" strokeWidth="0.8" />

        {/* Face */}
        <circle cx={cx} cy={cy} r={R} fill="url(#hc-face)" />

        {/* Ticks */}
        {ticks.map((t, i) => (
          <line key={i}
            x1={t.outer.x} y1={t.outer.y} x2={t.inner.x} y2={t.inner.y}
            stroke={t.isQ ? '#00D4AA' : t.isMajor ? 'rgba(0,212,170,0.55)' : 'rgba(0,212,170,0.18)'}
            strokeWidth={t.isQ ? 2 : t.isMajor ? 1.2 : 0.7}
            strokeLinecap="round"
            filter={t.isQ ? 'url(#hc-glow)' : undefined}
          />
        ))}

        {/* Hour numerals */}
        {([{n:'12',a:0},{n:'3',a:3},{n:'6',a:6},{n:'9',a:9}] as const).map(({n,a}) => {
          const pos = toXY((a / 12) * 360 - 90, R - 18);
          return (
            <text key={n} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
              style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, fill: '#00D4AA' }}
              filter="url(#hc-glow)"
            >{n}</text>
          );
        })}

        {/* Digital time in dial */}
        <rect x={cx - 24} y={cy + 12} width={48} height={19} rx={5} ry={5}
          fill="rgba(0,0,0,0.45)" stroke="rgba(0,212,170,0.18)" strokeWidth="0.8"
        />
        <text x={cx} y={cy + 23} textAnchor="middle" dominantBaseline="central"
          style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: 400, fill: '#00D4AA', letterSpacing: '0.06em' }}
          filter="url(#hc-tglow)"
        >{digitalTime}</text>
        <text x={cx} y={cy + 38} textAnchor="middle" dominantBaseline="central"
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '7px', fontWeight: 600, fill: 'rgba(0,212,170,0.55)', letterSpacing: '0.14em' }}
        >{ampm}</text>

        {/* Hour hand */}
        <line x1={cx} y1={cy} x2={hrEnd.x} y2={hrEnd.y} stroke="rgba(0,212,170,0.28)" strokeWidth={6} strokeLinecap="round" filter="url(#hc-glow)" />
        <line x1={cx} y1={cy} x2={hrEnd.x} y2={hrEnd.y} stroke="#C8E8F0" strokeWidth={2.5} strokeLinecap="round" />

        {/* Minute hand */}
        <line x1={cx} y1={cy} x2={minEnd.x} y2={minEnd.y} stroke="rgba(0,212,170,0.38)" strokeWidth={6} strokeLinecap="round" filter="url(#hc-glow)" />
        <line x1={cx} y1={cy} x2={minEnd.x} y2={minEnd.y} stroke="#00D4AA" strokeWidth={2} strokeLinecap="round" />

        {/* Second hand */}
        <line x1={secTail.x} y1={secTail.y} x2={secEnd.x} y2={secEnd.y} stroke="rgba(0,255,200,0.25)" strokeWidth={3.5} strokeLinecap="round" filter="url(#hc-sglow)" />
        <line x1={secTail.x} y1={secTail.y} x2={secEnd.x} y2={secEnd.y} stroke="#00FFC8" strokeWidth={1} strokeLinecap="round" />

        {/* Center jewel */}
        <circle cx={cx} cy={cy} r={7} fill="rgba(0,212,170,0.12)" filter="url(#hc-glow)" />
        <circle cx={cx} cy={cy} r={4} fill="#050A10" stroke="#00D4AA" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={1.8} fill="#00D4AA" />
      </svg>
    </div>
  );
}

// ── Animated frequency waveform ───────────────────────────────────────────────
function FrequencyWave({ color = '#00D4AA', hz = 528 }: { color?: string; hz?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const freq = 0.018 + (hz / 1000) * 0.006;
      const amp  = H * 0.32;

      ctx.beginPath();
      ctx.strokeStyle = color + '40';
      ctx.lineWidth = 6;
      for (let x = 0; x <= W; x++) {
        const y = H / 2 + amp * Math.sin(freq * x + tRef.current);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= W; x++) {
        const y = H / 2 + amp * Math.sin(freq * x + tRef.current);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      tRef.current += 0.022;
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [color, hz]);

  return <canvas ref={canvasRef} width={320} height={48} className="w-full" style={{ opacity: 0.85 }} />;
}

// ── Data ──────────────────────────────────────────────────────────────────────
const APP_PILLARS = [
  { icon: AlarmClock, label: 'Healing Alarm',     sub: '432Hz · 528Hz · δ→θ→α',         color: '#00D4AA', href: '/alarm'   },
  { icon: Waves,      label: 'Frequency Studio',  sub: '1–22,000 Hz · DDS precision',    color: '#8B5CF6', href: '/studio'  },
  { icon: Moon,       label: 'Meditation Player', sub: '9 TrueHz tracks · up to 60 min', color: '#3B82F6', href: '/player'  },
  { icon: Sparkles,   label: 'Reiki Sessions',    sub: '5-phase · 432Hz tri-layer',      color: '#A78BFA', href: '/reiki'   },
  { icon: Activity,   label: 'Brainwave Library', sub: 'Delta · Theta · Alpha · Gamma',  color: '#F59E0B', href: '/library' },
  { icon: BookOpen,   label: 'AI Prescription',   sub: 'Personalized frequency session', color: '#EC4899', href: '/prescription' },
];

const SOLFEGGIO_PREVIEW = [
  { hz: 174, name: 'Foundation',    benefit: 'Deep calm & security',    color: '#6B7A99' },
  { hz: 396, name: 'Liberation',    benefit: 'Release guilt & fear',    color: '#EF4444' },
  { hz: 528, name: 'Miracle Tone',  benefit: 'DNA repair & renewal',    color: '#F59E0B' },
  { hz: 639, name: 'Heart',         benefit: 'Connection & empathy',    color: '#22C55E' },
  { hz: 741, name: 'Awakening',     benefit: 'Clarity & expression',    color: '#3B82F6' },
  { hz: 963, name: 'Crown',         benefit: 'Divine consciousness',    color: '#00D4AA' },
];

const RITUALS = [
  {
    time: 'Morning',
    icon: '🌅',
    title: 'Wake in resonance',
    body: 'Replace the jarring alarm with a 528Hz sunrise. Progressive fade-in over 5 minutes — no cortisol spike, no snooze-button dread.',
    cta: 'Set Healing Alarm',
    href: '/alarm',
    color: '#F2C94C',
  },
  {
    time: 'Afternoon',
    icon: '🧠',
    title: 'Drop into deep work',
    body: 'Alpha binaural beats at 10Hz create a relaxed-alert brainwave state. Layer in rain and let a 90-minute focus block fly by.',
    cta: 'Open Studio',
    href: '/studio',
    color: '#00D4AA',
  },
  {
    time: 'Evening',
    icon: '🌙',
    title: 'Unwind into sleep',
    body: 'Delta binaural tones with an ocean layer and a sleep timer that fades everything to silence — a wind-down ritual your evenings will keep.',
    cta: 'Start Meditation',
    href: '/player',
    color: '#8B5CF6',
  },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isGuest = !user;

  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const now    = new Date();
  const hour   = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dayName  = days[now.getDay()];

  return (
    <Layout>
      <BioluminescentBackground variant="teal" density="low" />

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO — Above the fold: clock + headline + single CTA
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-5 pt-20 pb-12" style={{
        background: isLight
          ? 'linear-gradient(160deg, #EDF0F7 0%, #D4EEF0 50%, #EDF0F7 100%)'
          : 'linear-gradient(160deg, #050610 0%, #071828 45%, #050A14 100%)',
      }}>
        {/* Ambient radial glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: isLight
            ? 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,212,170,0.10) 0%, transparent 65%)'
            : 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,212,170,0.12) 0%, rgba(0,60,100,0.06) 50%, transparent 75%)',
        }} />

        <div className="relative z-10 w-full max-w-2xl mx-auto text-center">

          {/* Greeting chip */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ background: 'rgba(0,212,170,0.10)', border: '1px solid rgba(0,212,170,0.22)', color: '#00D4AA', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.04em' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA]" style={{ animation: 'bio-pulse 2.5s ease-in-out infinite' }} />
            {greeting} · {dayName}
          </div>

          {/* Headline */}
          <h1 className="mb-4" style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(2.8rem, 7vw, 5.2rem)',
            fontWeight: 600,
            color: isLight ? '#1A1D2E' : '#E8EDF5',
            lineHeight: 1.05,
          }}>
            Your alarm,<br />
            <em style={{ color: '#00D4AA', fontStyle: 'italic' }}>reimagined.</em>
          </h1>

          <p className="mb-8 mx-auto" style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
            color: isLight ? '#4A5568' : '#8FA3BF',
            lineHeight: 1.7,
            maxWidth: 520,
          }}>
            Wake gently with 432Hz or 528Hz healing frequencies. No jarring buzz —
            just a soft, progressive rise that aligns your body and mind for the day ahead.
          </p>

          {/* Hero clock */}
          <div className="flex justify-center mb-8">
            <HeroClock />
          </div>

          {/* Primary CTA pair */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <button
              onClick={() => navigate('/alarm')}
              className="btn-teal flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold"
              style={{ minWidth: 220, fontSize: '1rem', boxShadow: '0 0 32px rgba(0,212,170,0.30)' }}
            >
              <AlarmClock size={18} />
              Set Your Healing Alarm
            </button>
            <button
              onClick={() => navigate('/player')}
              className="flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold rounded-full transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: isLight ? '#1A1D2E' : '#E8EDF5',
                fontFamily: 'DM Sans, sans-serif',
                minWidth: 200,
              }}
            >
              <Play size={16} fill="currentColor" />
              Try a Free Frequency
            </button>
          </div>

          {/* Trust micro-copy */}
          <p className="text-xs" style={{ color: 'rgba(139,163,191,0.55)', fontFamily: 'DM Sans, sans-serif' }}>
            Free to start · No credit card required · 3 healing frequencies unlocked immediately
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none"
          style={{ color: 'rgba(139,163,191,0.35)', fontFamily: 'DM Sans, sans-serif', fontSize: '11px' }}>
          <span>Discover what's inside</span>
          <div style={{ animation: 'journey-bounce 2s ease-in-out infinite' }}>↓</div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          REVELATION — "You downloaded an alarm. You got so much more."
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 px-5" style={{ background: isLight ? '#F5F6F9' : '#0A0B14', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
              You downloaded an alarm
            </div>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 600,
              color: isLight ? '#1A1D2E' : '#E8EDF5',
              lineHeight: 1.2,
            }}>
              You got a complete<br />
              <span style={{ color: '#00D4AA', fontStyle: 'italic' }}>healing practice.</span>
            </h2>
            <p className="mt-3 text-sm" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif', maxWidth: 440, margin: '12px auto 0' }}>
              Six integrated tools — each built on the same precision frequency engine that powers your alarm.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {APP_PILLARS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => navigate(p.href)}
                className="text-left p-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: i === 0
                    ? `linear-gradient(135deg, ${p.color}18, ${p.color}08)`
                    : 'rgba(255,255,255,0.03)',
                  border: i === 0
                    ? `1px solid ${p.color}40`
                    : `1px solid ${p.color}18`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {i === 0 && (
                  <div className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: `${p.color}20`, color: p.color, fontFamily: 'DM Sans, sans-serif', fontSize: '10px' }}>
                    Start here
                  </div>
                )}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${p.color}15`, border: `1px solid ${p.color}25` }}>
                  <p.icon size={16} style={{ color: p.color }} />
                </div>
                <div className="text-sm font-semibold mb-0.5" style={{ color: isLight ? '#1A1D2E' : '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                  {p.label}
                </div>
                <div className="text-xs leading-snug" style={{ color: '#6B7A99', fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>
                  {p.sub}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SCIENCE STRIP — TrueHz credibility
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-10 px-5" style={{ background: isLight ? '#EDF0F7' : '#080910', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/technology')}
            className="w-full text-left rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-5 transition-all duration-200 hover:scale-[1.01]"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,170,0.10), rgba(139,92,246,0.06))',
              border: '1px solid rgba(0,212,170,0.25)',
            }}
          >
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(0,212,170,0.14)', border: '1px solid rgba(0,212,170,0.30)' }}>
                <span className="text-lg font-bold" style={{ color: '#00D4AA', fontFamily: 'DM Mono, monospace' }}>Hz</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-base font-bold mb-1" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
                TrueHz™ Precision Tuning
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
                Most apps play compressed recordings. Every tone here is generated live on your device
                using Direct Digital Synthesis — accurate to 0.01 Hz. When we say 528 Hz, you get 528.00 Hz.
              </p>
            </div>
            <div className="text-sm font-semibold flex-shrink-0 flex items-center gap-1" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
              Why it matters <ChevronRight size={14} />
            </div>
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          EXPLAINER VIDEO — Healing frequencies science
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 px-5" style={{ background: isLight ? '#F5F6F9' : '#0A0B14', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
              <div style={{ width: 24, height: 1, background: '#00D4AA' }} />
              The Science
              <div style={{ width: 24, height: 1, background: '#00D4AA' }} />
            </div>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
              fontWeight: 600,
              color: isLight ? '#1A1D2E' : '#E8EDF5',
              lineHeight: 1.2,
              marginBottom: 10,
            }}>
              Why healing frequencies work
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#8FA3BF', maxWidth: 480, margin: '0 auto', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.7 }}>
              Everything vibrates. Your cells, your brain, the Earth itself. Watch how specific frequencies guide your body into healing states.
            </p>
          </div>

          {/* Video */}
          <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
            <div style={{ position: 'absolute', inset: -1, background: 'linear-gradient(135deg, rgba(0,212,170,0.25), rgba(139,92,246,0.15))', filter: 'blur(20px)', opacity: 0.5, zIndex: 0, borderRadius: 12 }} />
            <div style={{ position: 'relative', zIndex: 1, border: '1px solid rgba(0,212,170,0.22)', boxShadow: '0 0 50px rgba(0,212,170,0.08), 0 24px 48px rgba(0,0,0,0.5)', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
              {[{t:0,l:0,bt:'2px solid #00D4AA',bl:'2px solid #00D4AA'},{t:0,r:0,bt:'2px solid #00D4AA',br:'2px solid #00D4AA'},{b:0,l:0,bb:'2px solid #00D4AA',bl:'2px solid #00D4AA'},{b:0,r:0,bb:'2px solid #00D4AA',br:'2px solid #00D4AA'}].map((c,i) => (
                <div key={i} style={{ position:'absolute', width:16, height:16, zIndex:2,
                  top: 't' in c ? 0 : undefined, bottom: 'b' in c ? 0 : undefined,
                  left: 'l' in c ? 0 : undefined, right: 'r' in c ? 0 : undefined,
                  borderTop: 'bt' in c ? (c as any).bt : undefined,
                  borderBottom: 'bb' in c ? (c as any).bb : undefined,
                  borderLeft: 'bl' in c ? (c as any).bl : undefined,
                  borderRight: 'br' in c ? (c as any).br : undefined,
                }} />
              ))}
              <video controls playsInline poster="https://files.manuscdn.com/user_upload_by_module/session_file/110672315/ryPsMuvFrztMNPat.jpg"
                style={{ display: 'block', width: '100%', aspectRatio: '16/9', background: '#000' }}>
                <source src="https://files.manuscdn.com/user_upload_by_module/session_file/110672315/jOZiosROKCzQdWiM.mp4" type="video/mp4" />
              </video>
            </div>
          </div>

          {/* Silent Healing Hz video */}
          <div style={{ marginTop: 40 }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#FBBF24', fontFamily: 'DM Sans, sans-serif', marginBottom: 6 }}>
                <div style={{ width: 20, height: 1, background: '#FBBF24' }} />
                Silent Healing Hz
                <div style={{ width: 20, height: 1, background: '#FBBF24' }} />
              </div>
              <p style={{ fontSize: '0.9rem', color: '#8FA3BF', maxWidth: 480, margin: '0 auto', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.7 }}>
                Some frequencies are below the range of hearing. They are felt, not heard — and they work.
              </p>
            </div>
            <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
              <div style={{ position: 'absolute', inset: -1, background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(139,92,246,0.1))', filter: 'blur(20px)', opacity: 0.5, zIndex: 0, borderRadius: 12 }} />
              <div style={{ position: 'relative', zIndex: 1, border: '1px solid rgba(251,191,36,0.3)', boxShadow: '0 0 50px rgba(251,191,36,0.06), 0 24px 48px rgba(0,0,0,0.5)', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
                {[{t:0,l:0,bt:'2px solid #FBBF24',bl:'2px solid #FBBF24'},{t:0,r:0,bt:'2px solid #FBBF24',br:'2px solid #FBBF24'},{b:0,l:0,bb:'2px solid #FBBF24',bl:'2px solid #FBBF24'},{b:0,r:0,bb:'2px solid #FBBF24',br:'2px solid #FBBF24'}].map((c,i) => (
                  <div key={i} style={{ position:'absolute', width:16, height:16, zIndex:2,
                    top: 't' in c ? 0 : undefined, bottom: 'b' in c ? 0 : undefined,
                    left: 'l' in c ? 0 : undefined, right: 'r' in c ? 0 : undefined,
                    borderTop: 'bt' in c ? (c as any).bt : undefined,
                    borderBottom: 'bb' in c ? (c as any).bb : undefined,
                    borderLeft: 'bl' in c ? (c as any).bl : undefined,
                    borderRight: 'br' in c ? (c as any).br : undefined,
                  }} />
                ))}
                <video controls playsInline poster="https://files.manuscdn.com/user_upload_by_module/session_file/110672315/IgMHfxddpqkmRQxH.png"
                  style={{ display: 'block', width: '100%', aspectRatio: '16/9', background: '#000' }}>
                  <source src="https://files.manuscdn.com/user_upload_by_module/session_file/110672315/FueLTmWRwbXWxsnA.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <a href="/silent-healing"
                style={{ fontSize: '0.8rem', color: '#FBBF24', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, textDecoration: 'none', opacity: 0.85 }}
              >
                Explore Silent Healing Hz in the Library →
              </a>
            </div>
          </div>

          {/* Journey CTA below video */}
          <div className="flex justify-center mt-6">
            <button
              onClick={() => navigate('/journey')}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'rgba(0,212,170,0.10)', border: '1px solid rgba(0,212,170,0.25)', color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}
            >
              Discover Your Healing Journey
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SOLFEGGIO FREQUENCIES — Live waveform preview
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 px-5" style={{ background: isLight ? '#EDF0F7' : '#0D0F1E', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#8B5CF6', fontFamily: 'DM Sans, sans-serif' }}>
              The Solfeggio Scale
            </div>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
              fontWeight: 600,
              color: isLight ? '#1A1D2E' : '#E8EDF5',
              lineHeight: 1.2,
            }}>
              Ancient tones. Modern healing.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SOLFEGGIO_PREVIEW.map((freq) => (
              <button
                key={freq.hz}
                onClick={() => navigate('/library')}
                className="text-left p-4 rounded-2xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${freq.color}22` }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${freq.color}18`, border: `1px solid ${freq.color}30` }}>
                    <span className="text-xs font-bold" style={{ color: freq.color, fontFamily: 'DM Mono, monospace' }}>{freq.hz}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: isLight ? '#1A1D2E' : '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>{freq.name}</div>
                    <div className="text-xs" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>{freq.benefit}</div>
                  </div>
                  <div className="ml-auto">
                    <Play size={14} style={{ color: freq.color, opacity: 0.7 }} />
                  </div>
                </div>
                <FrequencyWave color={freq.color} hz={freq.hz} />
              </button>
            ))}
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={() => navigate('/library')}
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}
            >
              Explore all {FREQUENCIES.length} frequencies <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          DAILY RITUALS — Morning / Afternoon / Evening
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 px-5" style={{ background: isLight ? '#F5F6F9' : '#0A0B14', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
              fontWeight: 600,
              color: isLight ? '#1A1D2E' : '#E8EDF5',
              lineHeight: 1.2,
            }}>
              Built for your daily rituals.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {RITUALS.map((r) => (
              <div key={r.time} className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${r.color}20` }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{r.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: r.color, fontFamily: 'DM Sans, sans-serif' }}>{r.time}</span>
                </div>
                <div className="text-sm font-semibold" style={{ color: isLight ? '#1A1D2E' : '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>{r.title}</div>
                <p className="text-xs leading-relaxed flex-1" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>{r.body}</p>
                <button
                  onClick={() => navigate(r.href)}
                  className="text-xs font-semibold flex items-center gap-1 mt-1"
                  style={{ color: r.color, fontFamily: 'DM Sans, sans-serif' }}
                >
                  {r.cta} <ChevronRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SOCIAL PROOF + CONVERSION CTA
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 px-5 relative overflow-hidden" style={{ background: isLight ? '#EDF0F7' : '#0D0F1E', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-80 h-80 rounded-full" style={{
            background: 'radial-gradient(circle, rgba(0,212,170,0.07) 0%, transparent 70%)',
            animation: 'bio-pulse 5s ease-in-out infinite',
          }} />
        </div>
        <div className="max-w-2xl mx-auto relative z-10 text-center">
          {/* Stars */}
          <div className="flex justify-center gap-1 mb-4">
            {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="#F2C94C" color="#F2C94C" />)}
          </div>
          <blockquote className="mb-6" style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
            fontStyle: 'italic',
            color: isLight ? '#2D3748' : '#C8D8E8',
            lineHeight: 1.5,
          }}>
            "I downloaded it for the alarm. I stayed for the frequencies. My mornings are completely different now."
          </blockquote>
          <div className="text-sm mb-10" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            — Early adopter, Premium member
          </div>

          {/* Final CTA */}
          <h2 className="mb-4" style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            fontWeight: 600,
            color: isLight ? '#1A1D2E' : '#E8EDF5',
            lineHeight: 1.1,
          }}>
            Your body already knows<br />
            <span style={{ color: '#00D4AA' }}>how to heal.</span>
          </h2>
          <p className="mb-8 text-sm" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif', maxWidth: 400, margin: '0 auto 32px' }}>
            We give it the frequency to remember. Start free — three healing frequencies, no sign-up required.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/alarm')}
              className="btn-teal flex items-center justify-center gap-2 px-10 py-4 text-base font-semibold"
              style={{ boxShadow: '0 0 40px rgba(0,212,170,0.30)' }}
            >
              <AlarmClock size={18} />
              Set Your Healing Alarm
            </button>
            {isGuest ? (
              <button
                onClick={() => startSignup()}
                className="flex items-center justify-center gap-2 px-10 py-4 text-base font-semibold rounded-full transition-all duration-200"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.30)', color: '#A78BFA', fontFamily: 'DM Sans, sans-serif' }}
              >
                <Sparkles size={18} />
                Go Premium — from $4.17/mo
              </button>
            ) : (
              <button
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center justify-center gap-2 px-10 py-4 text-base font-semibold rounded-full transition-all duration-200"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.30)', color: '#A78BFA', fontFamily: 'DM Sans, sans-serif' }}
              >
                <Sparkles size={18} />
                Upgrade to Premium
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* Footer */}
      <footer className="py-8 border-t px-5" style={{ borderColor: isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)', background: isLight ? '#EDF0F7' : '#0A0B14' }}>
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/rih-logo.svg" alt="Rise In Harmony" className="w-6 h-6 object-contain" />
            <span className="text-sm font-medium" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>Rise In Harmony</span>
          </div>
          <div className="text-xs" style={{ color: isLight ? '#6B7A99' : '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
            © 2026 Rise In Harmony. Begin every morning in resonance.
          </div>
          <div className="flex gap-6">
            {([['Privacy', '/privacy'], ['Terms', '/terms'], ['Contact', 'mailto:hello@riseinharmony.com']] as [string, string][]).map(([l, href]) => (
              <a key={l} href={href}
                className="text-xs transition-colors duration-200"
                style={{ color: isLight ? '#6B7A99' : '#4A5568', fontFamily: 'DM Sans, sans-serif', textDecoration: 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#00D4AA'; }}
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
