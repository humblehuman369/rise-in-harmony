/**
 * SoundStudio — Layered Audio Mixer
 * Blend healing frequencies with ambient music and natural soundscapes
 * Three independent volume faders + preset library + animated waveform
 * Bioluminescent Depth theme
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, Sliders, Music, Waves, Wind, Flame, TreePine, CloudRain, Minus, Plus } from "lucide-react";
import Layout from "@/components/Layout";
import { useSoundStudio, STUDIO_PRESETS, type NatureSound, type MusicMode } from "@/hooks/useSoundStudio";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

// ─── Frequency options ────────────────────────────────────────────────────────
const FREQ_OPTIONS = [
  { hz: 174, name: "Foundation", color: "#EF4444" },
  { hz: 285, name: "Quantum", color: "#F97316" },
  { hz: 396, name: "Liberation", color: "#EAB308" },
  { hz: 417, name: "Transmutation", color: "#84CC16" },
  { hz: 432, name: "Natural Harmony", color: "#00D4AA" },
  { hz: 528, name: "Miracle Tone", color: "#3B82F6" },
  { hz: 639, name: "Connection", color: "#8B5CF6" },
  { hz: 741, name: "Awakening", color: "#A855F7" },
  { hz: 852, name: "Spiritual", color: "#EC4899" },
  { hz: 963, name: "Divine", color: "#F472B6" },
];

// ─── Music mode options ───────────────────────────────────────────────────────
const MUSIC_MODES: { id: MusicMode; label: string; desc: string; icon: string }[] = [
  { id: "none", label: "Off", desc: "Pure frequency only", icon: "—" },
  { id: "ambient", label: "Ambient", desc: "Evolving pentatonic chords", icon: "♪" },
  { id: "drone", label: "Drone", desc: "Deep resonant harmonics", icon: "〰" },
  { id: "crystal", label: "Crystal", desc: "Singing bowl tones", icon: "◇" },
];

// ─── Nature sound options ─────────────────────────────────────────────────────
const NATURE_SOUNDS: { id: NatureSound; label: string; Icon: React.ElementType; color: string }[] = [
  { id: "none", label: "Off", Icon: Minus, color: "#4A5568" },
  { id: "rain", label: "Rain", Icon: CloudRain, color: "#3B82F6" },
  { id: "ocean", label: "Ocean", Icon: Waves, color: "#00D4AA" },
  { id: "forest", label: "Forest", Icon: TreePine, color: "#22C55E" },
  { id: "wind", label: "Wind", Icon: Wind, color: "#94A3B8" },
  { id: "fire", label: "Fire", Icon: Flame, color: "#F97316" },
];

// ─── Waveform visualizer ──────────────────────────────────────────────────────
function WaveformVisualizer({ isPlaying, color }: { isPlaying: boolean; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      if (!isPlaying) {
        // Static flat line
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
        return;
      }

      timeRef.current += 0.018;
      const t = timeRef.current;

      // Draw 3 layered sine waves with different frequencies and phases
      const waves = [
        { amp: 18, freq: 0.018, phase: 0, alpha: 0.7 },
        { amp: 10, freq: 0.035, phase: Math.PI / 3, alpha: 0.4 },
        { amp: 6, freq: 0.06, phase: Math.PI * 0.7, alpha: 0.25 },
      ];

      waves.forEach(({ amp, freq, phase, alpha }) => {
        ctx.beginPath();
        ctx.strokeStyle = color + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = 1.5;
        for (let x = 0; x <= W; x++) {
          const y = H / 2 + amp * Math.sin(x * freq + t + phase) * Math.sin(t * 0.3 + phase);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // Glow center line
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.5, color + "60");
      grad.addColorStop(1, "transparent");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, color]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={80}
      className="w-full"
      style={{ display: "block" }}
    />
  );
}

// ─── Volume fader ─────────────────────────────────────────────────────────────
function LayerFader({
  label,
  icon: Icon,
  value,
  onChange,
  color,
  isActive,
}: {
  label: string;
  icon: React.ElementType;
  value: number;
  onChange: (v: number) => void;
  color: string;
  isActive: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300"
      style={{
        background: isActive ? `${color}0D` : "rgba(255,255,255,0.02)",
        border: `1px solid ${isActive ? `${color}25` : "rgba(255,255,255,0.05)"}`,
        minWidth: "80px",
      }}
    >
      <Icon size={18} style={{ color: isActive ? color : "#4A5568" }} />
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Vertical slider simulation using horizontal Slider rotated */}
        <div className="w-full">
          <Slider
            value={[Math.round(value * 100)]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => onChange(v / 100)}
            className="w-full"
            style={{ "--slider-color": color } as React.CSSProperties}
          />
        </div>
        <span
          className="text-xs font-mono-brand"
          style={{ color: isActive ? color : "#4A5568" }}
        >
          {Math.round(value * 100)}%
        </span>
      </div>
      <span
        className="text-[10px] font-semibold uppercase tracking-wide text-center"
        style={{ color: isActive ? "#8FA3BF" : "#4A5568", fontFamily: "DM Sans, sans-serif" }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SoundStudio() {
  const { state, toggle, setLayerVolume, setFrequency, setMusicMode, setNatureSound } = useSoundStudio();
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const selectedFreq = FREQ_OPTIONS.find(f => f.hz === state.frequencyHz) || FREQ_OPTIONS[4];

  const applyPreset = useCallback((presetId: string) => {
    const preset = STUDIO_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    const s = preset.settings;
    if (s.frequencyHz !== undefined) setFrequency(s.frequencyHz);
    if (s.musicMode !== undefined) setMusicMode(s.musicMode);
    if (s.natureSound !== undefined) setNatureSound(s.natureSound);
    if (s.frequencyVolume !== undefined) setLayerVolume("frequency", s.frequencyVolume);
    if (s.musicVolume !== undefined) setLayerVolume("music", s.musicVolume);
    if (s.natureVolume !== undefined) setLayerVolume("nature", s.natureVolume);
    toast(`✦ Preset loaded: ${preset.name}`);
  }, [setFrequency, setMusicMode, setNatureSound, setLayerVolume]);

  return (
    <Layout>
      <div className="min-h-screen pb-24" style={{ background: "#0A0B14" }}>
        {/* Header */}
        <div className="px-6 pt-8 pb-4">
          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
            Sound Studio
          </div>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2rem", fontWeight: 600, color: "#E8EDF5" }}>
            Frequency Mixer
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
            Blend healing tones with music and nature sounds
          </p>
        </div>

        {/* Waveform + Play button */}
        <div
          className="mx-6 mb-6 rounded-2xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, #0D0F1E, #12152A)",
            border: `1px solid ${selectedFreq.color}20`,
            boxShadow: `0 0 40px ${selectedFreq.color}10`,
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 50% 50%, ${selectedFreq.color}08 0%, transparent 70%)` }}
          />
          <div className="relative p-5">
            {/* Frequency label */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <span
                  className="text-3xl font-bold font-mono-brand"
                  style={{ color: selectedFreq.color }}
                >
                  {state.frequencyHz}
                </span>
                <span className="text-lg ml-1" style={{ color: selectedFreq.color + "80" }}>Hz</span>
                <div className="text-sm mt-0.5" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
                  {selectedFreq.name}
                  {state.musicMode !== "none" && (
                    <span style={{ color: "#6B7A99" }}> · {MUSIC_MODES.find(m => m.id === state.musicMode)?.label}</span>
                  )}
                  {state.natureSound !== "none" && (
                    <span style={{ color: "#6B7A99" }}> · {NATURE_SOUNDS.find(n => n.id === state.natureSound)?.label}</span>
                  )}
                </div>
              </div>
              <button
                onClick={toggle}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                style={{
                  background: state.isPlaying
                    ? `linear-gradient(135deg, ${selectedFreq.color}, ${selectedFreq.color}CC)`
                    : "rgba(255,255,255,0.08)",
                  boxShadow: state.isPlaying ? `0 0 24px ${selectedFreq.color}60` : "none",
                  color: state.isPlaying ? "#0A0B14" : "#E8EDF5",
                }}
              >
                {state.isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" style={{ marginLeft: "2px" }} />}
              </button>
            </div>

            {/* Waveform */}
            <WaveformVisualizer isPlaying={state.isPlaying} color={selectedFreq.color} />
          </div>
        </div>

        {/* Presets */}
        <div className="px-6 mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
            Presets
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {STUDIO_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className="flex-shrink-0 flex flex-col items-start gap-1 px-4 py-3 rounded-xl transition-all duration-200"
                style={{
                  background: activePreset === preset.id ? `${preset.color}15` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${activePreset === preset.id ? `${preset.color}40` : "rgba(255,255,255,0.06)"}`,
                  minWidth: "120px",
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>{preset.icon}</span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: activePreset === preset.id ? "#E8EDF5" : "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}
                >
                  {preset.name}
                </span>
                <span
                  className="text-[10px] leading-tight"
                  style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}
                >
                  {preset.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Frequency selector */}
        <div className="px-6 mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
            Healing Frequency
          </div>
          <div className="grid grid-cols-5 gap-2">
            {FREQ_OPTIONS.map(freq => (
              <button
                key={freq.hz}
                onClick={() => { setFrequency(freq.hz); setActivePreset(null); }}
                className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all duration-200"
                style={{
                  background: state.frequencyHz === freq.hz ? `${freq.color}18` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${state.frequencyHz === freq.hz ? `${freq.color}45` : "rgba(255,255,255,0.05)"}`,
                  transform: state.frequencyHz === freq.hz ? "scale(1.04)" : "scale(1)",
                }}
              >
                <span
                  className="text-sm font-bold font-mono-brand"
                  style={{ color: state.frequencyHz === freq.hz ? freq.color : "#6B7A99" }}
                >
                  {freq.hz}
                </span>
                <span
                  className="text-[9px] text-center leading-tight"
                  style={{ color: state.frequencyHz === freq.hz ? "#8FA3BF" : "#4A5568", fontFamily: "DM Sans, sans-serif" }}
                >
                  {freq.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Music mode selector */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Music size={13} style={{ color: "#6B7A99" }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
              Music Layer
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MUSIC_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => { setMusicMode(mode.id); setActivePreset(null); }}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200"
                style={{
                  background: state.musicMode === mode.id ? "rgba(0,212,170,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${state.musicMode === mode.id ? "rgba(0,212,170,0.35)" : "rgba(255,255,255,0.05)"}`,
                }}
              >
                <span style={{ fontSize: "1.1rem", color: state.musicMode === mode.id ? "#00D4AA" : "#4A5568" }}>
                  {mode.icon}
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: state.musicMode === mode.id ? "#E8EDF5" : "#6B7A99", fontFamily: "DM Sans, sans-serif" }}
                >
                  {mode.label}
                </span>
                <span
                  className="text-[9px] text-center leading-tight"
                  style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}
                >
                  {mode.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Nature sound selector */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Waves size={13} style={{ color: "#6B7A99" }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
              Nature Layer
            </span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {NATURE_SOUNDS.map(({ id, label, Icon, color }) => (
              <button
                key={id}
                onClick={() => { setNatureSound(id); setActivePreset(null); }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200"
                style={{
                  background: state.natureSound === id ? `${color}12` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${state.natureSound === id ? `${color}35` : "rgba(255,255,255,0.05)"}`,
                }}
              >
                <Icon size={18} style={{ color: state.natureSound === id ? color : "#4A5568" }} />
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: state.natureSound === id ? "#E8EDF5" : "#6B7A99", fontFamily: "DM Sans, sans-serif" }}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Layer volume mixer */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sliders size={13} style={{ color: "#6B7A99" }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
              Layer Mix
            </span>
          </div>
          <div
            className="rounded-2xl p-5"
            style={{
              background: "linear-gradient(135deg, #0D0F1E, #12152A)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="grid grid-cols-4 gap-4">
              <LayerFader
                label="Frequency"
                icon={Volume2}
                value={state.frequencyVolume}
                onChange={v => setLayerVolume("frequency", v)}
                color={selectedFreq.color}
                isActive={true}
              />
              <LayerFader
                label="Music"
                icon={Music}
                value={state.musicVolume}
                onChange={v => setLayerVolume("music", v)}
                color="#00D4AA"
                isActive={state.musicMode !== "none"}
              />
              <LayerFader
                label="Nature"
                icon={Waves}
                value={state.natureVolume}
                onChange={v => setLayerVolume("nature", v)}
                color="#3B82F6"
                isActive={state.natureSound !== "none"}
              />
              <LayerFader
                label="Master"
                icon={Volume2}
                value={state.masterVolume}
                onChange={v => setLayerVolume("master", v)}
                color="#8B5CF6"
                isActive={true}
              />
            </div>

            {/* Mix visualization bars */}
            <div className="mt-5 space-y-2">
              {[
                { label: "Frequency", value: state.frequencyVolume, color: selectedFreq.color },
                { label: "Music", value: state.musicVolume, color: "#00D4AA" },
                { label: "Nature", value: state.natureVolume, color: "#3B82F6" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-[10px] w-16 text-right" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
                    {label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${value * 100}%`,
                        background: `linear-gradient(90deg, ${color}80, ${color})`,
                        boxShadow: state.isPlaying ? `0 0 6px ${color}60` : "none",
                      }}
                    />
                  </div>
                  <span className="text-[10px] w-8" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
                    {Math.round(value * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How it works info */}
        <div
          className="mx-6 p-4 rounded-xl"
          style={{
            background: "rgba(0,212,170,0.04)",
            border: "1px solid rgba(0,212,170,0.1)",
          }}
        >
          <div className="text-xs font-semibold mb-2" style={{ color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}>
            How the layers work
          </div>
          <div className="text-xs leading-relaxed space-y-1" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
            <p><strong style={{ color: "#8FA3BF" }}>Frequency layer</strong> — a pure sine wave at the selected healing Hz, embedded beneath everything else.</p>
            <p><strong style={{ color: "#8FA3BF" }}>Music layer</strong> — procedural chords tuned to the same root frequency using just-intonation ratios, so every note is harmonically aligned.</p>
            <p><strong style={{ color: "#8FA3BF" }}>Nature layer</strong> — synthesized soundscapes (no audio files) generated via filtered noise and oscillators, shaped to match the emotional tone of each scene.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
