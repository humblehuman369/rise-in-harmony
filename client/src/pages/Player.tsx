/**
 * Player — Rise In Harmony Frequency Player
 * Central frequency visualizer with play controls, volume, and timer
 * Bioluminescent Depth theme
 * Features:
 *   - Frequency visualizer with waveform
 *   - Chakra affirmation overlay while a chakra frequency is playing
 *   - Quick-Start Guided Chakra Journey (3 min/chakra, auto-begins)
 *   - Full 7-Chakra Journey modal with duration picker
 */
import { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, ChevronLeft, ChevronRight, Lock, Zap, Sparkles, Wind } from "lucide-react";
import Layout from "@/components/Layout";
import { useFrequencyPlayer, FREQUENCIES, type Frequency } from "@/hooks/useFrequencyPlayer";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import ChakraSequence from "@/components/ChakraSequence";
import PremiumPaywall from "@/components/PremiumPaywall";
import BreathingGuide from "@/components/BreathingGuide";

// ─── Chakra affirmation data ──────────────────────────────────────────────────

const CHAKRA_AFFIRMATIONS: Record<number, {
  affirmation: string;
  element: string;
  sanskrit: string;
  color: string;
}> = {
  396: {
    affirmation: "I am grounded. I am safe. I belong.",
    element: "Earth",
    sanskrit: "Mūlādhāra",
    color: "#EAB308",
  },
  417: {
    affirmation: "I flow with creativity and joy.",
    element: "Water",
    sanskrit: "Svādhiṣṭhāna",
    color: "#84CC16",
  },
  528: {
    affirmation: "I am confident. I am powerful. I am worthy.",
    element: "Fire",
    sanskrit: "Maṇipūra",
    color: "#06B6D4",
  },
  639: {
    affirmation: "I give and receive love freely.",
    element: "Air",
    sanskrit: "Anāhata",
    color: "#3B82F6",
  },
  741: {
    affirmation: "I speak my truth with clarity and grace.",
    element: "Sound",
    sanskrit: "Viśuddha",
    color: "#8B5CF6",
  },
  852: {
    affirmation: "I trust my intuition and inner wisdom.",
    element: "Light",
    sanskrit: "Ājñā",
    color: "#A855F7",
  },
  963: {
    affirmation: "I am connected to divine consciousness.",
    element: "Thought",
    sanskrit: "Sahasrāra",
    color: "#EC4899",
  },
};

// ─── Visualizer ───────────────────────────────────────────────────────────────

function FrequencyVisualizer({ isPlaying, color, hz }: { isPlaying: boolean; color: string; hz: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;

    const draw = (t: number) => {
      timeRef.current = t;
      ctx.clearRect(0, 0, size, size);

      const speed = isPlaying ? 1 : 0.2;
      const pulse = isPlaying ? Math.sin(t * 0.002 * speed) * 0.12 + 1 : 1;

      // Draw concentric rings
      const numRings = 5;
      for (let i = numRings; i >= 1; i--) {
        const radius = (size * 0.12 * i) * pulse;
        const alpha = isPlaying ? (0.15 - i * 0.02) : 0.05;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = isPlaying ? 1.5 : 0.5;
        ctx.stroke();
      }

      // Waveform arc
      if (isPlaying) {
        const waveRadius = size * 0.28;
        const wavePoints = 120;
        ctx.beginPath();
        for (let i = 0; i <= wavePoints; i++) {
          const angle = (i / wavePoints) * Math.PI * 2 - Math.PI / 2;
          const waveAmp = 8 * Math.sin(i * (hz / 100) * 0.15 + t * 0.003);
          const r = waveRadius + waveAmp;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `${color}CC`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Center glow
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.15);
      gradient.addColorStop(0, `${color}${isPlaying ? '40' : '18'}`);
      gradient.addColorStop(1, `${color}00`);
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, isPlaying ? 6 + Math.sin(t * 0.004) * 2 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isPlaying ? color : `${color}80`;
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, color, hz]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={320}
      className="w-full max-w-xs mx-auto"
      style={{ maxWidth: '320px' }}
    />
  );
}

// ─── Affirmation overlay ──────────────────────────────────────────────────────

function ChakraAffirmationOverlay({ freq }: { freq: Frequency }) {
  const data = CHAKRA_AFFIRMATIONS[freq.hz];
  const [visible, setVisible] = useState(false);

  // Fade in after a short delay when frequency changes
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, [freq.hz]);

  if (!data) return null;

  return (
    <div
      className="mt-5 mx-auto w-full max-w-sm px-5 py-4 rounded-2xl text-center transition-all duration-700"
      style={{
        background: `linear-gradient(135deg, ${data.color}0D, ${data.color}06)`,
        border: `1px solid ${data.color}25`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
      }}
    >
      {/* Element badge */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: data.color }} />
        <span className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: data.color, fontFamily: 'DM Sans, sans-serif' }}>
          {data.sanskrit} · {data.element}
        </span>
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: data.color }} />
      </div>
      {/* Affirmation */}
      <p className="text-base italic leading-snug"
        style={{
          fontFamily: 'Cormorant Garamond, serif',
          color: '#C8D5E8',
          fontSize: '1.05rem',
        }}>
        "{data.affirmation}"
      </p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Player() {
  const { isPlaying, currentFrequency, volume, playTime, timbre, togglePlay, setVolume, setTimbre, audioContextSuspended, unlockAudio } = useFrequencyPlayer(
    (msg) => toast.error(msg, { duration: 6000 })
  );
  const [selectedIndex, setSelectedIndex] = useState(4); // 432Hz default
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.6);
  const [showChakra, setShowChakra] = useState(false);
  const [chakraAutoStart, setChakraAutoStart] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);

  const selected = FREQUENCIES[selectedIndex];

  const handlePrev = () => setSelectedIndex(i => (i - 1 + FREQUENCIES.length) % FREQUENCIES.length);
  const handleNext = () => setSelectedIndex(i => (i + 1) % FREQUENCIES.length);

  const handleToggle = () => {
    if (selected.isPremium && selected.id !== currentFrequency?.id) {
      setShowPaywall(true);
      return;
    }
    togglePlay(selected);
  };

  const handleMute = () => {
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  /** Open the full journey modal with duration picker */
  const openJourneyPicker = () => {
    setChakraAutoStart(false);
    setShowChakra(true);
  };

  /** Open the journey modal and immediately begin (3 min/chakra) */
  const quickStartJourney = () => {
    setChakraAutoStart(true);
    setShowChakra(true);
  };

  const isCurrentlyPlaying = isPlaying && currentFrequency?.id === selected.id;

  // Is the currently selected frequency a chakra frequency with an affirmation?
  const showAffirmation = isCurrentlyPlaying && !!CHAKRA_AFFIRMATIONS[selected.hz];

  return (
    <Layout>
      {showChakra && (
        <ChakraSequence
          onClose={() => { setShowChakra(false); setChakraAutoStart(false); }}
          autoStart={chakraAutoStart}
          autoStartDuration={180}
        />
      )}
      {showPaywall && (
        <PremiumPaywall
          triggerFrequencyHz={selected.hz}
          triggerFrequencyName={selected.name}
          onClose={() => setShowPaywall(false)}
        />
      )}
      <div className="min-h-screen flex flex-col" style={{ background: '#0A0B14' }} onClick={unlockAudio}>
        {/* Tap-to-enable audio banner — shown when AudioContext is suspended by autoplay policy */}
        {audioContextSuspended && (
          <div
            className="flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium cursor-pointer"
            style={{
              background: 'linear-gradient(90deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.08) 100%)',
              borderBottom: '1px solid rgba(245,158,11,0.3)',
              color: '#F59E0B',
              fontFamily: 'DM Sans, sans-serif',
            }}
            onClick={unlockAudio}
          >
            <span style={{ fontSize: '1.1rem' }}>🔇</span>
            <span>Tap here to enable audio, then press play</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>(browser autoplay blocked)</span>
          </div>
        )}
        {/* Header */}
        <div className="px-6 pt-8 pb-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                Frequency Player
              </div>
              <h1 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '2rem',
                fontWeight: 600,
                color: '#E8EDF5',
              }}>
                Healing Tones
              </h1>
            </div>
            {/* Journey buttons */}
            <div className="flex flex-col gap-2 mt-1">
              {/* Quick Start — immediately begins 3 min/chakra */}
              <button
                onClick={quickStartJourney}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,212,170,0.2), rgba(139,92,246,0.2))',
                  border: '1px solid rgba(0,212,170,0.35)',
                  color: '#00D4AA',
                  fontFamily: 'DM Sans, sans-serif',
                  boxShadow: '0 0 16px rgba(0,212,170,0.12)',
                }}
                title="Start the 7-Chakra Journey immediately (3 min per chakra)"
              >
                <Sparkles size={12} />
                Quick Start
              </button>
              {/* Full picker */}
              <button
                onClick={openJourneyPicker}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))',
                  border: '1px solid rgba(139,92,246,0.35)',
                  color: '#C084FC',
                  fontFamily: 'DM Sans, sans-serif',
                  boxShadow: '0 0 16px rgba(139,92,246,0.12)',
                }}
                title="Choose duration and start the 7-Chakra Journey"
              >
                <Zap size={12} />
                7-Chakra Journey
              </button>
              {/* Breathe — opens Breathing Patterns overlay */}
              <button
                onClick={() => setShowBreathing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(0,212,170,0.2))',
                  border: '1px solid rgba(0,212,170,0.3)',
                  color: '#67E8F9',
                  fontFamily: 'DM Sans, sans-serif',
                  boxShadow: '0 0 16px rgba(0,212,170,0.10)',
                }}
                title="Open guided breathing patterns"
              >
                <Wind size={12} />
                Breathe
              </button>
            </div>
          </div>
        </div>

        {/* Main player area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-8 px-6 pb-8">
          {/* Left: Visualizer + Controls */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Background image */}
            <div className="relative w-full max-w-sm mx-auto">
              <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <img
                  src="/manus-storage/rih-player-bg_ac962b3f.jpg"
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ opacity: 0.3 }}
                />
                <div className="absolute inset-0 rounded-2xl" style={{
                  background: 'radial-gradient(circle at center, transparent 30%, rgba(10,11,20,0.8) 100%)',
                }} />
              </div>

              <div className="relative z-10 p-8">
                {/* Frequency info */}
                <div className="text-center mb-6">
                  <div className="font-mono-brand text-4xl font-bold mb-1" style={{ color: selected.color }}>
                    {selected.hz}
                    {selected.binauralOffset ? `/${selected.hz + selected.binauralOffset}` : ''}
                    <span className="text-lg ml-1" style={{ color: `${selected.color}80` }}>Hz</span>
                  </div>
                  <div className="text-lg font-semibold mb-1" style={{ color: '#E8EDF5', fontFamily: 'Cormorant Garamond, serif' }}>
                    {selected.name}
                  </div>
                  <div className="text-xs px-3 py-1 rounded-full inline-block" style={{
                    background: `${selected.color}15`,
                    color: selected.color,
                    fontFamily: 'DM Sans, sans-serif',
                  }}>
                    {selected.category.charAt(0).toUpperCase() + selected.category.slice(1)}
                    {selected.isPremium && ' · Premium'}
                  </div>
                </div>

                {/* Visualizer */}
                <FrequencyVisualizer
                  isPlaying={isCurrentlyPlaying}
                  color={selected.color}
                  hz={selected.hz}
                />

                {/* Timer */}
                {isCurrentlyPlaying && (
                  <div className="text-center mt-4">
                    <span className="font-mono-brand text-sm" style={{ color: '#6B7A99' }}>
                      {formatTime(playTime)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Chakra affirmation overlay — shown when a chakra frequency is playing */}
            {showAffirmation && <ChakraAffirmationOverlay freq={selected} />}

            {/* Navigation + Play controls */}
            <div className="flex items-center gap-6 mt-6">
              <button
                onClick={handlePrev}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#6B7A99' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#E8EDF5'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B7A99'; }}
              >
                <ChevronLeft size={20} />
              </button>

              <button
                onClick={handleToggle}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 relative"
                style={{
                  background: selected.isPremium && !isCurrentlyPlaying
                    ? 'rgba(139,92,246,0.2)'
                    : `linear-gradient(135deg, ${selected.color}, ${selected.color}CC)`,
                  boxShadow: isCurrentlyPlaying ? `0 0 30px ${selected.color}60` : 'none',
                  color: selected.isPremium && !isCurrentlyPlaying ? '#8B5CF6' : '#0A0B14',
                }}
              >
                {selected.isPremium && !isCurrentlyPlaying ? (
                  <Lock size={22} />
                ) : isCurrentlyPlaying ? (
                  <Pause size={24} fill="currentColor" />
                ) : (
                  <Play size={24} fill="currentColor" style={{ marginLeft: '2px' }} />
                )}
                {isCurrentlyPlaying && (
                  <div className="absolute inset-0 rounded-full animate-alarm-ring" />
                )}
              </button>

              <button
                onClick={handleNext}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#6B7A99' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#E8EDF5'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B7A99'; }}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Tone character — synthesized tones only (recorded sessions are pre-mixed) */}
            {!selected.audioUrl && (
              <div className="flex items-center gap-2 mt-6">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                  Tone
                </span>
                {([
                  { id: "pure", label: "Tuning Fork" },
                  { id: "bowl", label: "Singing Bowl" },
                ] as const).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTimbre(t.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                    style={timbre === t.id ? {
                      background: `${selected.color}20`,
                      border: `1px solid ${selected.color}50`,
                      color: selected.color,
                      fontFamily: 'DM Sans, sans-serif',
                    } : {
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#6B7A99',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Volume */}
            <div className="flex items-center gap-3 mt-6 w-full max-w-xs">
              <button onClick={handleMute} style={{ color: '#6B7A99' }}>
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <Slider
                value={[isMuted ? 0 : volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([v]) => { setVolume(v); if (v > 0) setIsMuted(false); }}
                className="flex-1"
              />
              <span className="text-xs font-mono-brand w-8 text-right" style={{ color: '#6B7A99' }}>
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>

          {/* Right: Benefit info + quick select */}
          <div className="lg:w-80 space-y-4">
            {/* Benefit card */}
            <div className="glow-card p-5">
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                Healing Properties
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#E8EDF5', fontFamily: 'Cormorant Garamond, serif' }}>
                {selected.description}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                {selected.benefit}
              </p>
              {selected.binauralOffset && (
                <div className="mt-3 p-3 rounded-lg text-xs" style={{
                  background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.15)',
                  color: '#8B5CF6',
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                  🎧 Binaural beat: {selected.binauralOffset}Hz difference between ears.
                  Use headphones for full effect.
                </div>
              )}
            </div>

            {/* Chakra Journey info card */}
            <div className="glow-card p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(236,72,153,0.04))',
                border: '1px solid rgba(139,92,246,0.15)',
              }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#8B5CF6', fontFamily: 'DM Sans, sans-serif' }}>
                ✦ Guided Chakra Journey
              </div>
              <p className="text-xs leading-relaxed mb-3" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                Play all 7 chakra frequencies in sequence — Root to Crown — for a complete energetic alignment. Each chakra plays for your chosen duration with its affirmation.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={quickStartJourney}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                  style={{
                    background: 'rgba(0,212,170,0.12)',
                    border: '1px solid rgba(0,212,170,0.3)',
                    color: '#00D4AA',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Quick Start (3 min)
                </button>
                <button
                  onClick={openJourneyPicker}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                  style={{
                    background: 'rgba(139,92,246,0.12)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    color: '#C084FC',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Choose Duration
                </button>
              </div>
            </div>

            {/* Quick select grid */}
            <div className="glow-card p-5">
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                All Frequencies
              </div>
              <div className="grid grid-cols-3 gap-2">
                {FREQUENCIES.map((f, i) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      if (f.isPremium) {
                        setSelectedIndex(i);
                        setShowPaywall(true);
                        return;
                      }
                      setSelectedIndex(i);
                    }}
                    className="relative p-2 rounded-lg text-center transition-all duration-200"
                    style={{
                      background: selectedIndex === i ? `${f.color}20` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedIndex === i ? f.color + '50' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    {f.isPremium && (
                      <div className="absolute top-1 right-1">
                        <Lock size={8} style={{ color: '#8B5CF6' }} />
                      </div>
                    )}
                    <div className="font-mono-brand text-xs font-bold" style={{ color: selectedIndex === i ? f.color : '#6B7A99' }}>
                      {f.hz}
                    </div>
                    <div className="text-[10px] mt-0.5 truncate" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
                      {f.name.split(' ')[0]}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showBreathing && (
        <BreathingGuide onClose={() => setShowBreathing(false)} accentColor="#00D4AA" />
      )}
    </Layout>
  );
}
