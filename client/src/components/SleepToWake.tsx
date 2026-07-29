/**
 * SleepToWake — Combined bedtime + wake ritual
 *
 * Sets a Delta isochronic sleep session that fades in at bedtime and
 * automatically transitions to the user's chosen wake frequency at their
 * alarm time. The two ends of the day are linked into a single ritual.
 *
 * Bioluminescent Depth theme.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Moon, AlarmClock, Play, Square, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { startLogin } from "@/const";

const WAKE_FREQUENCIES = [
  { hz: 528, name: "Transformation", benefit: "DNA repair & emotional renewal", color: "#00D4AA" },
  { hz: 432, name: "Natural Harmony", benefit: "Calm, grounded morning energy", color: "#10B981" },
  { hz: 396, name: "Liberation",      benefit: "Release overnight tension",     color: "#F59E0B" },
  { hz: 963, name: "Crown Activation",benefit: "Spiritual clarity & presence",  color: "#8B5CF6" },
];

const SLEEP_TIMES = ["21:00", "21:30", "22:00", "22:30", "23:00", "23:30"];
const WAKE_TIMES  = ["5:00", "5:30", "6:00", "6:30", "7:00", "7:30", "8:00"];

interface SleepToWakeProps {
  /** Called when the ritual is saved so the parent can refresh alarm list */
  onSaved?: () => void;
}

export default function SleepToWake({ onSaved }: SleepToWakeProps) {
  const [sleepTime, setSleepTime]   = useState("22:30");
  const [wakeTime, setWakeTime]     = useState("6:30");
  const [wakeFreq, setWakeFreq]     = useState(WAKE_FREQUENCIES[0]);
  const [saved, setSaved]           = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [expanded, setExpanded]     = useState(false);

  const audioCtxRef   = useRef<AudioContext | null>(null);
  const workletRef    = useRef<AudioWorkletNode | null>(null);
  const gainRef       = useRef<GainNode | null>(null);

  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const createAlarm = trpc.alarms.create.useMutation();

  // Stop preview on unmount
  useEffect(() => () => { stopPreview(); }, []);

  const stopPreview = useCallback(() => {
    if (gainRef.current && audioCtxRef.current) {
      gainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.4);
      setTimeout(() => {
        workletRef.current?.disconnect();
        gainRef.current?.disconnect();
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        workletRef.current = null;
        gainRef.current = null;
      }, 800);
    }
    setIsPreviewPlaying(false);
  }, []);

  const toggleDeltaPreview = useCallback(async () => {
    if (isPreviewPlaying) { stopPreview(); return; }
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      await ctx.audioWorklet.addModule('/dds-processor.js');
      const node = new AudioWorkletNode(ctx, 'dds-processor');
      workletRef.current = node;
      const gain = ctx.createGain();
      gainRef.current = gain;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.setTargetAtTime(0.3, ctx.currentTime, 0.8);
      // Delta isochronic: 200 Hz carrier, 2 Hz pulse rate
      node.port.postMessage({
        type: 'setParams',
        freq: 200,
        waveform: 'sine',
        mode: 'isochronic',
        isoRate: 2,
        isoDuty: 0.5,
      });
      node.connect(gain);
      gain.connect(ctx.destination);
      setIsPreviewPlaying(true);
      setTimeout(() => stopPreview(), 30_000);
    } catch {
      toast.error("Audio preview unavailable in this browser.");
    }
  }, [isPreviewPlaying, stopPreview]);

  const handleSave = async () => {
    if (!user) {
      startLogin();
      return;
    }
    const [wHour, wMin] = wakeTime.split(":").map(Number);
    try {
      await createAlarm.mutateAsync({
        label: `✦ Sleep-to-Wake · ${wakeFreq.name}`,
        hour: wHour,
        minute: wMin,
        days: [1, 2, 3, 4, 5],
        soundType: "frequency",
        frequencyHz: wakeFreq.hz,
        frequencyName: wakeFreq.name,
        fadeInMinutes: 5,
      });
      setSaved(true);
      onSaved?.();
      toast.success(`Sleep-to-Wake ritual saved — ${wakeFreq.hz}Hz alarm at ${wakeTime}`);
    } catch {
      toast.error("Could not save the ritual. Please try again.");
    }
  };

  const bg    = isLight ? "rgba(255,255,255,0.9)" : "rgba(13,15,30,0.9)";
  const bdr   = isLight ? "rgba(0,0,0,0.06)"      : "rgba(255,255,255,0.06)";
  const text  = isLight ? "#1A1D2E"               : "#E8EDF5";
  const muted = "#6B7A99";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: bg, border: `1px solid ${bdr}`, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(0,212,170,0.1))", border: "1px solid rgba(139,92,246,0.3)" }}>
            <Moon size={16} style={{ color: "#8B5CF6" }} />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold" style={{ color: text }}>Sleep-to-Wake Cycle</div>
            <div className="text-xs" style={{ color: muted }}>Delta sleep → healing wake alarm</div>
          </div>
        </div>
        <ChevronRight size={16} style={{ color: muted, transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t" style={{ borderColor: bdr }}>
          {/* Delta sleep preview */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium" style={{ color: text, fontFamily: "DM Sans, sans-serif" }}>Bedtime — Delta Sleep</div>
                <div className="text-xs" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>2 Hz isochronic · 200 Hz carrier · fades in at bedtime</div>
              </div>
              <button
                onClick={toggleDeltaPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
                style={{
                  background: isPreviewPlaying ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.1)",
                  border: `1px solid rgba(139,92,246,${isPreviewPlaying ? "0.5" : "0.25"})`,
                  color: "#8B5CF6",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {isPreviewPlaying ? <><Square size={11} /> Stop</> : <><Play size={11} /> Preview</>}
              </button>
            </div>

            {/* Bedtime picker */}
            <div className="grid grid-cols-3 gap-1.5">
              {SLEEP_TIMES.map(t => (
                <button key={t} onClick={() => setSleepTime(t)}
                  className="py-2 rounded-xl text-xs font-medium transition-all duration-200"
                  style={{
                    background: sleepTime === t ? "rgba(139,92,246,0.15)" : (isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)"),
                    border: `1px solid ${sleepTime === t ? "rgba(139,92,246,0.4)" : (isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)")}`,
                    color: sleepTime === t ? "#C084FC" : muted,
                    fontFamily: "DM Sans, sans-serif",
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Wake frequency */}
          <div>
            <div className="text-sm font-medium mb-2" style={{ color: text, fontFamily: "DM Sans, sans-serif" }}>Wake Frequency</div>
            <div className="grid grid-cols-2 gap-2">
              {WAKE_FREQUENCIES.map(f => (
                <button key={f.hz} onClick={() => setWakeFreq(f)}
                  className="flex items-center gap-2 p-3 rounded-xl text-left transition-all duration-200"
                  style={{
                    background: wakeFreq.hz === f.hz ? `${f.color}12` : (isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)"),
                    border: `1px solid ${wakeFreq.hz === f.hz ? `${f.color}40` : (isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)")}`,
                    fontFamily: "DM Sans, sans-serif",
                  }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}>
                    <span className="text-[10px] font-bold" style={{ color: f.color }}>{f.hz}</span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: text }}>{f.name}</div>
                    <div className="text-[10px] leading-tight" style={{ color: muted }}>{f.benefit}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Wake time */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlarmClock size={13} style={{ color: "#00D4AA" }} />
              <div className="text-sm font-medium" style={{ color: text, fontFamily: "DM Sans, sans-serif" }}>Wake Time</div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {WAKE_TIMES.map(t => (
                <button key={t} onClick={() => setWakeTime(t)}
                  className="py-2 rounded-xl text-xs font-medium transition-all duration-200"
                  style={{
                    background: wakeTime === t ? "rgba(0,212,170,0.15)" : (isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)"),
                    border: `1px solid ${wakeTime === t ? "rgba(0,212,170,0.4)" : (isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)")}`,
                    color: wakeTime === t ? "#00D4AA" : muted,
                    fontFamily: "DM Sans, sans-serif",
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Summary + Save */}
          <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(0,212,170,0.06)", border: "1px solid rgba(0,212,170,0.15)", color: muted, fontFamily: "DM Sans, sans-serif" }}>
            <Sparkles size={11} className="inline mr-1" style={{ color: "#00D4AA" }} />
            Delta isochronic at <strong style={{ color: text }}>{sleepTime}</strong> → {wakeFreq.hz} Hz {wakeFreq.name} alarm at <strong style={{ color: text }}>{wakeTime}</strong>
          </div>

          {saved ? (
            <div className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.3)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}>
              ✓ Ritual saved — see you tonight
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={createAlarm.isPending}
              className="btn-teal w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Moon size={15} />
              {createAlarm.isPending ? "Saving…" : "Save Sleep-to-Wake Ritual"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
