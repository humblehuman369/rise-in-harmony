/**
 * Player — Rise In Harmony Frequency Player
 * Central frequency visualizer with play controls, volume, and timer
 * Bioluminescent Depth theme
 */
import { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, ChevronLeft, ChevronRight, Lock, Zap } from "lucide-react";
import Layout from "@/components/Layout";
import { useFrequencyPlayer, FREQUENCIES, type Frequency } from "@/hooks/useFrequencyPlayer";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import ChakraSequence from "@/components/ChakraSequence";

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

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Player() {
  const { isPlaying, currentFrequency, volume, playTime, togglePlay, setVolume } = useFrequencyPlayer();
  const [selectedIndex, setSelectedIndex] = useState(4); // 432Hz default
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.6);
  const [showChakra, setShowChakra] = useState(false);

  const selected = FREQUENCIES[selectedIndex];

  const handlePrev = () => setSelectedIndex(i => (i - 1 + FREQUENCIES.length) % FREQUENCIES.length);
  const handleNext = () => setSelectedIndex(i => (i + 1) % FREQUENCIES.length);

  const handleToggle = () => {
    if (selected.isPremium && selected.id !== currentFrequency?.id) {
      toast("✦ Premium frequency — upgrade to unlock all 12+ healing tones", {
        action: { label: "Upgrade", onClick: () => toast("Premium subscription coming soon!") },
      });
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

  const isCurrentlyPlaying = isPlaying && currentFrequency?.id === selected.id;

  return (
    <Layout>
      {showChakra && <ChakraSequence onClose={() => setShowChakra(false)} />}
      <div className="min-h-screen flex flex-col" style={{ background: '#0A0B14' }}>
        {/* Header */}
        <div className="px-6 pt-8 pb-4 flex items-start justify-between">
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
          <button
            onClick={() => setShowChakra(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 mt-2"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))',
              border: '1px solid rgba(139,92,246,0.35)',
              color: '#C084FC',
              fontFamily: 'DM Sans, sans-serif',
              boxShadow: '0 0 16px rgba(139,92,246,0.15)',
            }}
          >
            <Zap size={13} />
            7-Chakra Journey
          </button>
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
                        toast("✦ Premium — upgrade to unlock");
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
    </Layout>
  );
}
