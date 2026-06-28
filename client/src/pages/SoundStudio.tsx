/**
 * SoundStudio — Layered Audio Mixer
 * Blend healing frequencies with ambient music and natural soundscapes
 * Three independent volume faders + preset library + animated waveform
 * Bioluminescent Depth theme
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, Sliders, Music, Waves, Wind, Flame, TreePine, CloudRain, Minus, Moon, X, Timer, Save, Trash2, Wind as BreathIcon } from "lucide-react";
import Layout from "@/components/Layout";
import { useSoundStudio, STUDIO_PRESETS, type NatureSound, type MusicMode, type StudioState } from "@/hooks/useSoundStudio";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import BreathingGuide from "@/components/BreathingGuide";
import SessionJournal from "@/components/SessionJournal";

// ─── Custom preset persistence key ───────────────────────────────────────────
const CUSTOM_PRESETS_KEY = "rih_custom_presets";

interface CustomPreset {
  id: string;
  name: string;
  createdAt: number;
  settings: Partial<StudioState>;
}

function loadCustomPresets(): CustomPreset[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_PRESETS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCustomPresets(presets: CustomPreset[]) {
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
}

// ─── Sleep Timer options ──────────────────────────────────────────────────────
const SLEEP_DURATIONS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "60 min", minutes: 60 },
];

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

  // ── Session Journal state ──────────────────────────────────────────────────
  const [showJournal, setShowJournal] = useState(false);
  const sessionStartRef = useRef<number | null>(null);

  // Track session start/stop to calculate duration for journal
  const handleToggle = useCallback(() => {
    if (!state.isPlaying) {
      // Starting
      sessionStartRef.current = Date.now();
    } else {
      // Stopping — prompt journal if session was > 30 seconds
      const elapsed = sessionStartRef.current ? (Date.now() - sessionStartRef.current) / 1000 : 0;
      if (elapsed > 30) setShowJournal(true);
      sessionStartRef.current = null;
    }
    toggle();
  }, [state.isPlaying, toggle]);

  // ── Sleep Timer state ──────────────────────────────────────────────────────
  const [timerActive, setTimerActive] = useState(false);
  const [timerTotalSec, setTimerTotalSec] = useState(0);   // total duration in seconds
  const [timerRemainSec, setTimerRemainSec] = useState(0); // seconds remaining
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalMasterRef = useRef<number>(0.8); // saved master volume before fade

  /** Format seconds as MM:SS */
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  /** Fraction of timer elapsed (0 → 1) */
  const timerProgress = timerTotalSec > 0 ? 1 - timerRemainSec / timerTotalSec : 0;

  /** Start the sleep timer for `minutes` minutes */
  const startTimer = useCallback((minutes: number) => {
    // Clear any existing timer
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const totalSec = minutes * 60;
    originalMasterRef.current = state.masterVolume;
    setTimerTotalSec(totalSec);
    setTimerRemainSec(totalSec);
    setTimerActive(true);

    // Start playing if not already
    if (!state.isPlaying) toggle();

    toast(`🌙 Sleep timer set for ${minutes} minutes — fading out gently`);

    timerIntervalRef.current = setInterval(() => {
      setTimerRemainSec(prev => {
        const next = prev - 1;
        if (next <= 0) {
          // Timer complete — stop audio
          clearInterval(timerIntervalRef.current!);
          timerIntervalRef.current = null;
          setTimerActive(false);
          setTimerTotalSec(0);
          setLayerVolume("master", 0);
          // Restore volume after a brief pause so next session starts normally
          setTimeout(() => {
            setLayerVolume("master", originalMasterRef.current);
            toggle(); // stop playback
          }, 800);
          toast("🌙 Sleep timer complete — sweet dreams");
          setShowJournal(true);
          return 0;
        }
        // Gradually reduce master volume in the final 25% of the timer
        const fadeStartSec = totalSec * 0.25;
        if (next <= fadeStartSec) {
          const fadeFraction = next / fadeStartSec; // 1 → 0
          setLayerVolume("master", originalMasterRef.current * fadeFraction);
        }
        return next;
      });
    }, 1000);
  }, [state.masterVolume, state.isPlaying, toggle, setLayerVolume]);

  /** Cancel the sleep timer */
  const cancelTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    setTimerActive(false);
    setTimerTotalSec(0);
    setTimerRemainSec(0);
    // Restore original master volume
    setLayerVolume("master", originalMasterRef.current);
    toast("Sleep timer cancelled");
  }, [setLayerVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, []);

  // ── Custom preset state ────────────────────────────────────────────────────
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(loadCustomPresets);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [showBreathing, setShowBreathing] = useState(false);

  const saveCurrentMix = useCallback(() => {
    const name = newPresetName.trim() || `My Mix ${customPresets.length + 1}`;
    const preset: CustomPreset = {
      id: `custom_${Date.now()}`,
      name,
      createdAt: Date.now(),
      settings: {
        frequencyHz: state.frequencyHz,
        musicMode: state.musicMode,
        natureSound: state.natureSound,
        frequencyVolume: state.frequencyVolume,
        musicVolume: state.musicVolume,
        natureVolume: state.natureVolume,
        masterVolume: state.masterVolume,
      },
    };
    const updated = [...customPresets, preset];
    setCustomPresets(updated);
    saveCustomPresets(updated);
    setSaveModalOpen(false);
    setNewPresetName("");
    toast(`✦ Mix saved: "${name}"`);
  }, [newPresetName, customPresets, state]);

  const deleteCustomPreset = useCallback((id: string) => {
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    saveCustomPresets(updated);
    toast("Custom preset removed");
  }, [customPresets]);

  const applyCustomPreset = useCallback((preset: CustomPreset) => {
    const s = preset.settings;
    if (s.frequencyHz !== undefined) setFrequency(s.frequencyHz);
    if (s.musicMode !== undefined) setMusicMode(s.musicMode);
    if (s.natureSound !== undefined) setNatureSound(s.natureSound);
    if (s.frequencyVolume !== undefined) setLayerVolume("frequency", s.frequencyVolume);
    if (s.musicVolume !== undefined) setLayerVolume("music", s.musicVolume);
    if (s.natureVolume !== undefined) setLayerVolume("nature", s.natureVolume);
    if (s.masterVolume !== undefined) setLayerVolume("master", s.masterVolume);
    setActivePreset(`custom_${preset.id}`);
    toast(`✦ Loaded: "${preset.name}"`);
  }, [setFrequency, setMusicMode, setNatureSound, setLayerVolume]);

  const selectedFreq = FREQ_OPTIONS.find(f => f.hz === state.frequencyHz) || FREQ_OPTIONS[4];
  const sessionDurationMin = sessionStartRef.current
    ? Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 60000))
    : timerTotalSec > 0 ? Math.round(timerTotalSec / 60) : 5;

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
                onClick={handleToggle}
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
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>Presets</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBreathing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                style={{ background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.2)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
              >
                <BreathIcon size={12} />
                Breathe
              </button>
              <button
                onClick={() => setSaveModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", color: "#8B5CF6", fontFamily: "DM Sans, sans-serif" }}
              >
                <Save size={12} />
                Save Mix
              </button>
            </div>
          </div>

          {/* Built-in presets */}
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
                <span className="text-xs font-semibold" style={{ color: activePreset === preset.id ? "#E8EDF5" : "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
                  {preset.name}
                </span>
                <span className="text-[10px] leading-tight" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
                  {preset.description}
                </span>
              </button>
            ))}
          </div>

          {/* Custom presets */}
          {customPresets.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>My Mixes</div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {customPresets.map(preset => (
                  <div
                    key={preset.id}
                    className="flex-shrink-0 flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl"
                    style={{
                      background: activePreset === `custom_${preset.id}` ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${activePreset === `custom_${preset.id}` ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.06)"}`,
                      minWidth: "110px",
                    }}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <button onClick={() => applyCustomPreset(preset)} className="flex-1 text-left">
                        <span className="text-xs font-semibold" style={{ color: activePreset === `custom_${preset.id}` ? "#E8EDF5" : "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
                          {preset.name}
                        </span>
                      </button>
                      <button
                        onClick={() => deleteCustomPreset(preset.id)}
                        className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                        style={{ color: "#4A5568" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#EF4444"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4A5568"; }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                    <span className="text-[9px]" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
                      {FREQ_OPTIONS.find(f => f.hz === preset.settings.frequencyHz)?.name || `${preset.settings.frequencyHz}Hz`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

        {/* Sleep Timer */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Moon size={13} style={{ color: "#6B7A99" }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
              Sleep Timer
            </span>
          </div>

          {timerActive ? (
            /* Active timer display */
            <div
              className="rounded-2xl p-5"
              style={{
                background: "linear-gradient(135deg, #0D0F1E, #12152A)",
                border: "1px solid rgba(139,92,246,0.25)",
                boxShadow: "0 0 30px rgba(139,92,246,0.08)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
                  >
                    <Moon size={18} style={{ color: "#8B5CF6" }} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "#8B5CF6", fontFamily: "DM Sans, sans-serif" }}>
                      Fading out
                    </div>
                    <div
                      className="text-2xl font-bold font-mono-brand"
                      style={{ color: "#E8EDF5", letterSpacing: "0.05em" }}
                    >
                      {formatTime(timerRemainSec)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={cancelTimer}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#6B7A99" }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Progress arc bar */}
              <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                  style={{
                    width: `${timerProgress * 100}%`,
                    background: timerProgress > 0.75
                      ? "linear-gradient(90deg, #8B5CF6, #EC4899)"
                      : "linear-gradient(90deg, #8B5CF6, #A78BFA)",
                    boxShadow: "0 0 8px rgba(139,92,246,0.6)",
                  }}
                />
              </div>

              {/* Fade indicator */}
              {timerRemainSec <= timerTotalSec * 0.25 && (
                <div className="mt-3 text-xs text-center" style={{ color: "#8B5CF6", fontFamily: "DM Sans, sans-serif" }}>
                  ✦ Volume fading gently…
                </div>
              )}
            </div>
          ) : (
            /* Timer selection buttons */
            <div
              className="rounded-2xl p-5"
              style={{
                background: "linear-gradient(135deg, #0D0F1E, #12152A)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="text-xs mb-4" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                Set a timer to gradually fade the master volume to zero — perfect for falling asleep to healing tones.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {SLEEP_DURATIONS.map(({ label, minutes }) => (
                  <button
                    key={minutes}
                    onClick={() => startTimer(minutes)}
                    className="flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all duration-200 active:scale-95"
                    style={{
                      background: "rgba(139,92,246,0.08)",
                      border: "1px solid rgba(139,92,246,0.2)",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.18)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.45)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.08)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.2)"; }}
                  >
                    <Timer size={16} style={{ color: "#8B5CF6" }} />
                    <span className="text-sm font-bold" style={{ color: "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}>
                      {minutes}
                    </span>
                    <span className="text-[10px]" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>min</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Save Mix Modal */}
        {saveModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          >
            <div
              className="w-full max-w-xs rounded-2xl p-6"
              style={{ background: "#12152A", border: "1px solid rgba(139,92,246,0.25)" }}
            >
              <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.3rem", fontWeight: 600, color: "#E8EDF5", marginBottom: "4px" }}>
                Save Current Mix
              </h3>
              <p className="text-xs mb-4" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                {state.frequencyHz}Hz · {MUSIC_MODES.find(m => m.id === state.musicMode)?.label} · {NATURE_SOUNDS.find(n => n.id === state.natureSound)?.label}
              </p>
              <input
                type="text"
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveCurrentMix()}
                placeholder={`My Mix ${customPresets.length + 1}`}
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl text-sm mb-4"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  color: "#E8EDF5",
                  fontFamily: "DM Sans, sans-serif",
                  outline: "none",
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setSaveModalOpen(false); setNewPresetName(""); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveCurrentMix}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#fff", fontFamily: "DM Sans, sans-serif" }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Breathing Guide Overlay */}
        {showBreathing && (
          <BreathingGuide
            onClose={() => setShowBreathing(false)}
            accentColor={selectedFreq.color}
          />
        )}

        {/* Session Journal */}
        {showJournal && (
          <SessionJournal
            frequencyHz={state.frequencyHz}
            frequencyName={selectedFreq.name}
            durationMinutes={sessionDurationMin}
            onClose={() => setShowJournal(false)}
          />
        )}

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
