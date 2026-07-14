/**
 * Meditation — Guided Meditation Library
 * 12 popular meditations across 6 categories
 * Dual-mode player: Sound Only vs Sound + Healing Frequency
 * Bioluminescent Depth theme
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, X, ChevronRight, Lock, Sunrise, Wind, Target, Moon,
  Heart, Sparkles, Grid3X3, Eye, Zap, Layers, Repeat, Droplets,
  Scan, Volume2, VolumeX, Timer, Radio, Music2, Info,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MEDITATIONS, MEDITATION_CATEGORIES, type MeditationTrack } from "@/data/meditations";
import { FREQUENCIES } from "@/hooks/useFrequencyPlayer";
import { useSoundStudio } from "@/hooks/useSoundStudio";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Sunrise, Wind, Target, Moon, Heart, Sparkles, Grid3X3, Eye, Zap,
  Layers, Repeat, Droplets, Scan, Music2,
};

function MeditationIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? Sparkles;
  return <Icon size={size} />;
}

// ─── Duration badge ───────────────────────────────────────────────────────────
function DurationBadge({ minutes }: { minutes: number }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
      style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
      <Timer size={10} />
      {minutes} min
    </span>
  );
}

// ─── Guidance step display ────────────────────────────────────────────────────
function GuidanceStep({ step, index, total, isLight }: { step: string; index: number; total: number; isLight: boolean }) {
  return (
    <div className="flex gap-3 py-3" style={{ borderBottom: index < total - 1 ? (isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.05)') : 'none' }}>
      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
        style={{ background: 'rgba(0,212,170,0.15)', color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
        {index + 1}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: isLight ? '#4A5568' : '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>{step}</p>
    </div>
  );
}

// ─── Animated ambient ring ────────────────────────────────────────────────────
function AmbientRings({ color, isPlaying }: { color: string; isPlaying: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[1, 2, 3].map(i => (
        <div key={i} className="absolute rounded-full border"
          style={{
            width: `${80 + i * 50}px`,
            height: `${80 + i * 50}px`,
            borderColor: `${color}${Math.round((0.18 - i * 0.04) * 255).toString(16).padStart(2, '0')}`,
            animation: isPlaying ? `frequency-pulse ${2.5 + i * 0.7}s ease-in-out infinite` : 'none',
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Meditation Card ──────────────────────────────────────────────────────────
function MeditationCard({
  meditation,
  onSelect,
  isActive,
}: {
  meditation: MeditationTrack;
  onSelect: (m: MeditationTrack) => void;
  isActive: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const isLocked = meditation.isPremium && !isAuthenticated;
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      onClick={() => onSelect(meditation)}
      className="w-full text-left rounded-2xl p-4 transition-all duration-200 group relative overflow-hidden"
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${meditation.color}22, ${meditation.colorSecondary}15)`
          : (isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)'),
        border: isActive
          ? `1px solid ${meditation.color}55`
          : (isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.06)'),
        boxShadow: isActive ? `0 0 20px ${meditation.color}20` : 'none',
      }}
    >
      {/* Icon + title row */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${meditation.color}20`, color: meditation.color }}>
          <MeditationIcon name={meditation.icon} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold leading-tight"
              style={{ color: isLight ? '#1A1D2E' : '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
              {meditation.title}
            </h3>
            {meditation.isPremium && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(139,92,246,0.2)', color: '#8B5CF6' }}>
                ✦ PRO
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: isLight ? '#4A5568' : '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            {meditation.subtitle}
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <DurationBadge minutes={meditation.durationMinutes} />
          {isLocked
            ? <Lock size={14} style={{ color: '#6B7A99' }} />
            : <ChevronRight size={14} style={{ color: isActive ? meditation.color : '#6B7A99' }} />
          }
        </div>
      </div>

      {/* Benefit */}
      <p className="text-xs mt-2 leading-relaxed line-clamp-2"
        style={{ color: isLight ? '#4A5568' : '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
        {meditation.benefit}
      </p>

      {/* Frequency pairing badge */}
      <div className="flex items-center gap-1.5 mt-2">
        <Radio size={10} style={{ color: '#00D4AA' }} />
        <span className="text-[10px]" style={{ color: '#4A6B7A', fontFamily: 'DM Sans, sans-serif' }}>
          Pairs with {meditation.recommendedFrequencyLabel}
        </span>
      </div>
    </button>
  );
}

// ─── Meditation Player Modal ──────────────────────────────────────────────────
function MeditationPlayer({
  meditation,
  onClose,
}: {
  meditation: MeditationTrack;
  onClose: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState<"sound" | "frequency">("frequency");
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Default mix: 25% frequency / 75% music (ambient) per product spec
  const [volume, setVolume] = useState(0.75);
  const [freqVolume, setFreqVolume] = useState(0.25);
  const [currentStep, setCurrentStep] = useState(0);
  const [showGuidance, setShowGuidance] = useState(true);

  // tRPC session logging (optional — guests must never be redirected to login)
  const startSession = trpc.sessions.start.useMutation({
    meta: { noAuthRedirect: true },
  });
  const endSession = trpc.sessions.end.useMutation({
    meta: { noAuthRedirect: true },
  });
  const sessionIdRef = useRef<number | null>(null);

  // Frequency synthesis — DDS AudioWorklet engine (SRS NFR-FREQ-004)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const freqGainRef = useRef<GainNode | null>(null);
  const workletLoadedRef = useRef(false);

  // Sound studio (ambient layers)
  const { play: studioPlay, stop: studioStop, setLayerVolume, setMusicMode: setStudioMusicMode, setNatureSound: setStudioNatureSound } = useSoundStudio();

  const totalSeconds = meditation.durationMinutes * 60;
  const progress = Math.min((elapsed / totalSeconds) * 100, 100);
  const recommendedFreq = FREQUENCIES.find(f => f.id === meditation.recommendedFrequencyId);

  // Step advancement: divide guidance into equal time slices
  const stepDuration = Math.floor(totalSeconds / meditation.guidance.length);

  // Timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopFrequency = useCallback(() => {
    const ctx = audioCtxRef.current;
    const gain = freqGainRef.current;
    const node = workletNodeRef.current;
    if (!ctx || !gain || !node) return;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    setTimeout(() => {
      node.disconnect();
      workletNodeRef.current = null;
    }, 1200);
  }, []);

  const startFrequency = useCallback(async () => {
    if (!recommendedFreq || mode !== "frequency") return;
    // Stop any existing worklet node first
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
      workletLoadedRef.current = false;
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    if (!workletLoadedRef.current) {
      await ctx.audioWorklet.addModule('/dds-processor.js');
      workletLoadedRef.current = true;
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.setTargetAtTime(freqVolume, ctx.currentTime, 0.5);
    freqGainRef.current = gain;

    const worklet = new AudioWorkletNode(ctx, 'dds-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    workletNodeRef.current = worklet;

    // Isochronic presets store the pulse rate in `hz` (e.g. 10Hz Alpha) and
    // pulse a comfortable audible carrier; binaural presets store the carrier
    // in `hz` with the beat in `binauralOffset` (mirrors useFrequencyPlayer).
    const isIso = recommendedFreq.isIsochronic === true;
    const freqL = isIso ? 200 : recommendedFreq.hz;
    const freqR = recommendedFreq.binauralOffset !== undefined
      ? recommendedFreq.hz + recommendedFreq.binauralOffset
      : freqL;
    const playMode = recommendedFreq.binauralOffset !== undefined ? 'binaural' : 'mono';

    worklet.port.postMessage({ type: 'setFreq', freqL, freqR });
    worklet.port.postMessage({ type: 'setWaveform', waveform: 'sine' });
    worklet.port.postMessage({ type: 'setMode', mode: playMode });
    worklet.port.postMessage({ type: 'setIsochronic', enabled: isIso, rate: isIso ? recommendedFreq.hz : undefined });

    worklet.connect(gain);
    gain.connect(ctx.destination);
  }, [recommendedFreq, mode, freqVolume]);

  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      // Pause
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
      studioStop();
      stopFrequency();
    } else {
      // Start / resume
      setIsPlaying(true);

      // Log session start
      if (isAuthenticated && !sessionIdRef.current) {
        try {
          const result = await startSession.mutateAsync({
            frequencyHz: mode === "frequency" ? (recommendedFreq?.hz ?? 0) : 0,
            frequencyName: meditation.title,
            sessionType: "single",
          });
          sessionIdRef.current = result.sessionId;
        } catch { /* non-critical */ }
      }

      // Start ambient sound
      // Always mute the studio's built-in frequency layer — the Meditation page
      // manages its own DDS overlay via startFrequency() in "Sound + Frequency" mode.
      // This prevents an unwanted 432Hz sine tone from playing in "Sound Only" mode.
      setLayerVolume("frequency", 0);
      setStudioNatureSound(meditation.soundscape === "silence" ? "none" : meditation.soundscape);
      setStudioMusicMode(meditation.musicMode);
      setLayerVolume("nature", volume);
      setLayerVolume("music", volume);
      studioPlay();

      // Start frequency if in frequency mode
      if (mode === "frequency") startFrequency();

      // Timer
      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          // Advance guidance step
          const step = Math.min(Math.floor(next / stepDuration), meditation.guidance.length - 1);
          setCurrentStep(step);
          // Auto-stop at end
          if (next >= totalSeconds) {
            clearInterval(timerRef.current!);
            setIsPlaying(false);
            studioStop();
            stopFrequency();
            // Log session end
            if (isAuthenticated && sessionIdRef.current) {
              endSession.mutateAsync({
                sessionId: sessionIdRef.current,
                durationSeconds: next,
              }).catch(() => {});
              sessionIdRef.current = null;
            }
            toast("Meditation complete. Well done.", { icon: "✦" });
          }
          return next;
        });
      }, 1000);
    }
  }, [isPlaying, studioPlay, studioStop, mode, meditation, volume, startFrequency, stopFrequency, isAuthenticated, startSession, endSession, recommendedFreq, stepDuration, totalSeconds, setLayerVolume, setStudioMusicMode, setStudioNatureSound]);

  // Update freq volume live
  useEffect(() => {
    if (freqGainRef.current && audioCtxRef.current) {
      freqGainRef.current.gain.setTargetAtTime(freqVolume, audioCtxRef.current.currentTime, 0.1);
    }
  }, [freqVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      studioStop();
      stopFrequency();
      audioCtxRef.current?.close();
      // Log session end if still running
      if (isAuthenticated && sessionIdRef.current) {
        endSession.mutateAsync({
          sessionId: sessionIdRef.current,
          durationSeconds: elapsed,
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
      <div className="relative w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: isLight ? '#FFFFFF' : '#0E1020', border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)' }}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4"
          style={{ background: isLight ? '#FFFFFF' : '#0E1020', borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${meditation.color}20`, color: meditation.color }}>
              <MeditationIcon name={meditation.icon} size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: isLight ? '#1A1D2E' : '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                {meditation.title}
              </h2>
              <p className="text-xs" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                {meditation.durationMinutes} min · {meditation.category}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#6B7A99' }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-8 space-y-6">
          {/* Visualizer + play button */}
          <div className="relative flex items-center justify-center py-8">
            <AmbientRings color={meditation.color} isPlaying={isPlaying} />
            <button
              onClick={handlePlay}
              className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
              style={{
                background: isPlaying
                  ? `linear-gradient(135deg, ${meditation.color}, ${meditation.colorSecondary})`
                  : 'rgba(255,255,255,0.08)',
                border: `2px solid ${isPlaying ? meditation.color : 'rgba(255,255,255,0.12)'}`,
                boxShadow: isPlaying ? `0 0 30px ${meditation.color}40` : 'none',
                color: isPlaying ? '#0A0B14' : (isLight ? '#1A1D2E' : '#E8EDF5'),
              }}>
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
            </button>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs mb-2" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
              <span>{formatTime(elapsed)}</span>
              <span>{formatTime(totalSeconds)}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${meditation.color}, ${meditation.colorSecondary})`,
                  boxShadow: `0 0 8px ${meditation.color}60`,
                }} />
            </div>
          </div>

          {/* Mode toggle */}
          <div className="rounded-2xl p-1 flex gap-1" style={{ background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { id: "sound", label: "Sound Only", icon: <Music2 size={14} /> },
              { id: "frequency", label: "Sound + Frequency", icon: <Radio size={14} /> },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  if (isPlaying) {
                    // Switch mode live
                    if (opt.id === "frequency" && mode === "sound") {
                      startFrequency();
                    } else if (opt.id === "sound" && mode === "frequency") {
                      stopFrequency();
                    }
                  }
                  setMode(opt.id as "sound" | "frequency");
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  background: mode === opt.id
                    ? `linear-gradient(135deg, ${meditation.color}30, ${meditation.colorSecondary}20)`
                    : 'transparent',
                  color: mode === opt.id ? meditation.color : (isLight ? '#4A5568' : '#6B7A99'),
                  border: mode === opt.id ? `1px solid ${meditation.color}40` : '1px solid transparent',
                }}>
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          {/* Frequency info (shown in frequency mode) */}
          {mode === "frequency" && recommendedFreq && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.15)' }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${recommendedFreq.color}20`, color: recommendedFreq.color }}>
                  <Radio size={14} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                      {recommendedFreq.hz}Hz — {recommendedFreq.name}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
                    {meditation.frequencyRationale}
                  </p>
                  {/* Frequency volume */}
                  <div className="flex items-center gap-3 mt-3">
                    <VolumeX size={12} style={{ color: '#6B7A99' }} />
                    <Slider
                      value={[freqVolume * 100]}
                      onValueChange={([v]) => setFreqVolume(v / 100)}
                      min={0} max={100} step={1}
                      className="flex-1"
                    />
                    <Volume2 size={12} style={{ color: '#6B7A99' }} />
                    <span className="text-xs w-8 text-right" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                      {Math.round(freqVolume * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ambient volume */}
          <div className="rounded-2xl p-4" style={{ background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Music2 size={14} style={{ color: '#8FA3BF' }} />
              <span className="text-sm font-medium" style={{ color: isLight ? '#4A5568' : '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
                Ambient Sound Volume
              </span>
            </div>
            <div className="flex items-center gap-3">
              <VolumeX size={12} style={{ color: '#6B7A99' }} />
              <Slider
                value={[volume * 100]}
                onValueChange={([v]) => {
                  setVolume(v / 100);
                  setLayerVolume("nature", v / 100);
                  setLayerVolume("music", v / 100);
                }}
                min={0} max={100} step={1}
                className="flex-1"
              />
              <Volume2 size={12} style={{ color: '#6B7A99' }} />
              <span className="text-xs w-8 text-right" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* Affirmation */}
          <div className="rounded-2xl p-4 text-center" style={{ background: `${meditation.color}10`, border: `1px solid ${meditation.color}25` }}>
            <p className="text-sm italic leading-relaxed" style={{ color: isLight ? '#2D3748' : '#C8D8E8', fontFamily: 'Cormorant Garamond, serif', fontSize: '1rem' }}>
              "{meditation.affirmation}"
            </p>
          </div>

          {/* Guidance steps */}
          <div>
            <button
              onClick={() => setShowGuidance(g => !g)}
              className="flex items-center gap-2 w-full mb-3"
            >
              <Info size={14} style={{ color: '#00D4AA' }} />
              <span className="text-sm font-semibold" style={{ color: isLight ? '#1A1D2E' : '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                Guided Steps
              </span>
              <ChevronRight size={14} className={`ml-auto transition-transform ${showGuidance ? 'rotate-90' : ''}`}
                style={{ color: '#6B7A99' }} />
            </button>

            {showGuidance && (
              <div className="rounded-2xl overflow-hidden" style={{ background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)', border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                {meditation.guidance.map((step, i) => (
                  <div key={i} className={`px-4 transition-all duration-500 ${i === currentStep && isPlaying ? 'opacity-100' : 'opacity-60'}`}
                    style={i === currentStep && isPlaying ? { background: `${meditation.color}08` } : {}}>
                    <GuidanceStep step={step} index={i} total={meditation.guidance.length} isLight={isLight} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Meditation() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedMeditation, setSelectedMeditation] = useState<MeditationTrack | null>(null);
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const filtered = activeCategory === "all"
    ? MEDITATIONS
    : MEDITATIONS.filter(m => m.category === activeCategory);

  const handleSelect = (m: MeditationTrack) => {
    if (m.isPremium && !isAuthenticated) {
      toast("Sign in to unlock premium meditations", { icon: "✦" });
      return;
    }
    setSelectedMeditation(m);
  };

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        {/* Page header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)', color: '#009E80', fontFamily: 'DM Sans, sans-serif' }}>
            <Sparkles size={12} />
            {MEDITATIONS.length} Guided Meditations
          </div>
          <h1 className="mb-2" style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 600,
            color: isLight ? '#1A1D2E' : '#E8EDF5',
            lineHeight: 1.1,
          }}>
            Meditation Library
          </h1>
          <p className="text-base" style={{ color: isLight ? '#4A5568' : '#8FA3BF', fontFamily: 'DM Sans, sans-serif', maxWidth: '520px' }}>
            Each meditation is available in two modes — <strong style={{ color: isLight ? '#1A1D2E' : '#E8EDF5' }}>Sound Only</strong> for a pure ambient experience, or <strong style={{ color: '#009E80' }}>Sound + Frequency</strong> to layer a healing tone beneath the soundscape.
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {MEDITATION_CATEGORIES.map(cat => {
            const Icon = ICON_MAP[cat.icon] ?? Grid3X3;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  background: active ? 'linear-gradient(135deg, #00D4AA, #00B894)' : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)'),
                  color: active ? '#0A0B14' : (isLight ? '#4A5568' : '#8FA3BF'),
                  border: active ? 'none' : (isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)'),
                  boxShadow: active ? '0 0 16px rgba(0,212,170,0.3)' : 'none',
                }}>
                <Icon size={13} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Meditations", value: MEDITATIONS.length.toString() },
            { label: "Free", value: MEDITATIONS.filter(m => !m.isPremium).length.toString() },
            { label: "With Frequency", value: MEDITATIONS.length.toString() },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl p-4 text-center"
              style={{ background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-2xl font-bold mb-1"
                style={{ color: '#00D4AA', fontFamily: 'Cormorant Garamond, serif' }}>
                {stat.value}
              </div>
              <div className="text-xs" style={{ color: isLight ? '#4A5568' : '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Meditation grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(m => (
            <MeditationCard
              key={m.id}
              meditation={m}
              onSelect={handleSelect}
              isActive={selectedMeditation?.id === m.id}
            />
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Sparkles size={32} style={{ color: '#4A5568', margin: '0 auto 12px' }} />
            <p style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>No meditations in this category yet.</p>
          </div>
        )}
      </div>

      {/* Player modal */}
      {selectedMeditation && (
        <MeditationPlayer
          meditation={selectedMeditation}
          onClose={() => setSelectedMeditation(null)}
        />
      )}
    </Layout>
  );
}
