/**
 * Alarm — Rise In Harmony Smart Alarm Scheduler
 * Create, manage, and configure healing frequency alarms
 * Bioluminescent Depth theme
 */
import { useState, useEffect } from "react";
import { Plus, AlarmClock, Trash2, Edit3, Bell, BellOff, Waves, Sunrise, Zap, Lock, BellRing, ShieldCheck, Layers, Smartphone, Music2, Wind, Droplets, Flame, TreePine, Moon, Mountain, ChevronDown, ChevronUp } from "lucide-react";
import Layout from "@/components/Layout";
import { FREQUENCIES } from "@/hooks/useFrequencyPlayer";
import { BACKGROUND_LOOPS, getLibraryLoopUrl } from "@/data/backgroundLoops";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAlarmNotifications } from "@/hooks/useAlarmNotifications";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { trackPaywallTriggered } from "@/hooks/useAnalytics";
import PremiumPaywall from "@/components/PremiumPaywall";

// ─── Mobile browser detection ────────────────────────────────────────────────
// Mobile browsers suspend a background/locked tab's timers, so web alarms
// cannot reliably fire on phones. On mobile we replace the notification
// banners with an honest prompt about the native app.
// Flip to true (and keep the URL) once the iOS app is live on the App Store.
const IOS_APP_LIVE = false;
const APP_STORE_URL = "https://apps.apple.com/app/id6786561356";

function detectMobilePlatform(): "ios" | "android" | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}

// ─── Custom Studio Mix presets (read from localStorage) ──────────────────────────────
const CUSTOM_PRESETS_KEY = "rih_custom_presets";

interface SavedStudioMix {
  id: string;
  name: string;
  settings: { frequencyHz?: number; musicMode?: string; natureSound?: string };
}

function loadSavedMixes(): SavedStudioMix[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_PRESETS_KEY) || "[]");
  } catch {
    return [];
  }
}

interface Alarm {
  id: string;
  time: string;
  label: string;
  frequencyId: string;
  sequenceId: string;
  days: number[];
  enabled: boolean;
  fadeInMinutes: number;
  /** Sound source — "frequency" (default), a saved Sound Creator recipe, or a Studio mix */
  soundType?: "frequency" | "user_sound" | "studio_mix";
  studioMixId?: string;
  studioMixName?: string;
<<<<<<< Updated upstream
  userSoundId?: number;
  userSoundName?: string;
}

const ALARMS_STORAGE_KEY = "rih_alarms_v1";

function loadAlarms(): Alarm[] {
  try {
    const raw = localStorage.getItem(ALARMS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to defaults
  }
  return DEFAULT_ALARMS;
}

function persistAlarms(alarms: Alarm[]) {
  localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
=======
  ambientId?: string;    // if set, use ambient loop as wake sound
  ambientLabel?: string;
>>>>>>> Stashed changes
}

const WAKE_SEQUENCES = [
  { id: "gentle", name: "Gentle Morning", icon: Sunrise, description: "432Hz → 528Hz fade-in over 5 min", isPremium: false, color: "#F59E0B" },
  { id: "chakra", name: "Chakra Awakening", icon: Waves, description: "Root to Crown — 7 chakra progression", isPremium: true, color: "#8B5CF6" },
  { id: "binaural-focus", name: "Binaural Focus", icon: Zap, description: "Alpha waves for mental clarity", isPremium: true, color: "#00D4AA" },
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const DEFAULT_ALARMS: Alarm[] = [
  { id: "1", time: "06:30", label: "Morning Harmony", frequencyId: "432hz", sequenceId: "gentle", days: [1, 2, 3, 4, 5], enabled: true, fadeInMinutes: 5 },
  { id: "2", time: "07:00", label: "Weekend Rise", frequencyId: "528hz", sequenceId: "gentle", days: [0, 6], enabled: false, fadeInMinutes: 3 },
];

function AlarmCard({ alarm, onToggle, onDelete, onEdit }: {
  alarm: Alarm;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (alarm: Alarm) => void;
}) {
  const freq = FREQUENCIES.find(f => f.id === alarm.frequencyId);
  const seq = WAKE_SEQUENCES.find(s => s.id === alarm.sequenceId);
  const [h, m] = alarm.time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;

  return (
    <div className={`glow-card p-5 transition-all duration-300 ${!alarm.enabled ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-mono-brand font-bold" style={{ fontSize: '2.5rem', lineHeight: 1, color: alarm.enabled ? '#E8EDF5' : '#6B7A99' }}>
              {displayHour}:{m}
            </span>
            <span className="font-mono-brand text-lg font-medium" style={{ color: alarm.enabled ? '#6B7A99' : '#4A5568' }}>
              {ampm}
            </span>
          </div>
          <div className="text-sm font-medium mb-2" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
            {alarm.label}
          </div>

          {/* Days */}
          <div className="flex gap-1.5 mb-3">
            {DAY_LABELS.map((d, i) => (
              <span key={i} className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold"
                style={{
                  background: alarm.days.includes(i) ? `${freq?.color || '#00D4AA'}20` : 'rgba(255,255,255,0.04)',
                  color: alarm.days.includes(i) ? freq?.color || '#00D4AA' : '#4A5568',
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                {d}
              </span>
            ))}
          </div>

          {/* Frequency + Sequence badges */}
          <div className="flex flex-wrap gap-2">
            {alarm.studioMixId ? (
              <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{
                background: 'rgba(139,92,246,0.15)',
                color: '#8B5CF6',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                <Layers size={9} />
                {alarm.studioMixName || 'Studio Mix'}
              </span>
            ) : alarm.ambientId ? (
              <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{
                background: 'rgba(59,130,246,0.15)',
                color: '#3B82F6',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                <Music2 size={9} />
                {alarm.ambientLabel || 'Ambient'}
              </span>
            ) : freq && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                background: `${freq.color}15`,
                color: freq.color,
                fontFamily: 'DM Sans, sans-serif',
              }}>
                {freq.hz}Hz — {freq.name}
              </span>
            )}
            {seq && (
              <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{
                background: `${seq.color}15`,
                color: seq.color,
                fontFamily: 'DM Sans, sans-serif',
              }}>
                {seq.isPremium && <Lock size={9} />}
                {seq.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <Switch
            checked={alarm.enabled}
            onCheckedChange={() => onToggle(alarm.id)}
          />
          <div className="flex gap-2">
            <button onClick={() => onEdit(alarm)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
              style={{ color: '#6B7A99', background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#E8EDF5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B7A99'; }}>
              <Edit3 size={14} />
            </button>
            <button onClick={() => onDelete(alarm.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
              style={{ color: '#6B7A99', background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EF4444'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B7A99'; }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AlarmPrefill {
  wakeTime?: string;
  frequencyHz?: number;
}

type SoundTab = "frequency" | "recorded" | "mysounds" | "studio";

function CreateAlarmModal({ onClose, onSave, prefill, isPremium, onPremiumNeeded }: {
  onClose: () => void;
  onSave: (alarm: Alarm) => void;
  prefill?: AlarmPrefill | null;
  isPremium: boolean;
  onPremiumNeeded: () => void;
}) {
  const prefillTime = prefill?.wakeTime
    ? `${prefill.wakeTime.split(":")[0].padStart(2, "0")}:${prefill.wakeTime.split(":")[1]}`
    : "07:00";
  const prefillFreqId = prefill?.frequencyHz
    ? FREQUENCIES.find(f => f.hz === prefill.frequencyHz && !f.isPremium)?.id ?? "432hz"
    : "432hz";
  const [time, setTime] = useState(prefillTime);
  const [label, setLabel] = useState("Morning Harmony");
  const [selectedFreq, setSelectedFreq] = useState(prefillFreqId);
  const [selectedSeq, setSelectedSeq] = useState("gentle");
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [fadeIn, setFadeIn] = useState(5);
<<<<<<< Updated upstream
  const [soundMode, setSoundMode] = useState<SoundTab>("frequency");
  const [selectedMixId, setSelectedMixId] = useState<string | null>(null);
  const [selectedSoundId, setSelectedSoundId] = useState<number | null>(null);
=======
  const [soundMode, setSoundMode] = useState<"frequency" | "ambient" | "studio">("frequency");
  const [selectedMixId, setSelectedMixId] = useState<string | null>(null);
  const [selectedAmbientId, setSelectedAmbientId] = useState<string | null>(null);
  const [freqCategory, setFreqCategory] = useState<"solfeggio" | "binaural" | "recorded">("solfeggio");
>>>>>>> Stashed changes
  const savedMixes = loadSavedMixes();
  const { isAuthenticated } = useAuth();
  const mySounds = trpc.sounds.list.useQuery(undefined, { enabled: isAuthenticated });

  const toggleDay = (d: number) => {
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const pickFrequency = (f: (typeof FREQUENCIES)[number]) => {
    if (f.isPremium && !isPremium) {
      onPremiumNeeded();
      return;
    }
    setSelectedFreq(f.id);
  };

  const handleSave = () => {
    if (selectedDays.length === 0) {
      toast("Please select at least one day");
      return;
    }
<<<<<<< Updated upstream
    const base = {
      id: Date.now().toString(),
      time, label, frequencyId: selectedFreq, sequenceId: selectedSeq,
      days: selectedDays, enabled: true, fadeInMinutes: fadeIn,
    };

    if (soundMode === "studio" && selectedMixId) {
      const mix = savedMixes.find(m => m.id === selectedMixId);
      onSave({
        ...base,
        soundType: "studio_mix",
        studioMixId: selectedMixId,
        studioMixName: mix?.name,
      });
    } else if (soundMode === "mysounds" && selectedSoundId != null) {
      const s = mySounds.data?.find(x => x.id === selectedSoundId);
      onSave({
        ...base,
        soundType: "user_sound",
        userSoundId: selectedSoundId,
        userSoundName: s?.name,
      });
    } else {
      onSave({ ...base, soundType: "frequency" });
    }
=======
    const selectedMix = savedMixes.find(m => m.id === selectedMixId);
    const selectedAmbient = BACKGROUND_LOOPS.find(l => l.id === selectedAmbientId);
    onSave({
      id: Date.now().toString(),
      time, label, frequencyId: selectedFreq, sequenceId: selectedSeq,
      days: selectedDays, enabled: true, fadeInMinutes: fadeIn,
      studioMixId: soundMode === "studio" && selectedMixId ? selectedMixId : undefined,
      studioMixName: soundMode === "studio" && selectedMix ? selectedMix.name : undefined,
      ambientId: soundMode === "ambient" && selectedAmbientId ? selectedAmbientId : undefined,
      ambientLabel: soundMode === "ambient" && selectedAmbient ? selectedAmbient.label : undefined,
    });
>>>>>>> Stashed changes
    onClose();
    toast("✓ Healing alarm set — your morning ritual awaits");
  };

  const synthFrequencies = FREQUENCIES.filter(f => f.category !== "recorded");
  const recordedFrequencies = FREQUENCIES.filter(f => f.category === "recorded");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: '#12152A', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 600, color: '#E8EDF5' }}>
            New Healing Alarm
          </h2>
          <button onClick={onClose} className="text-[#6B7A99] hover:text-[#E8EDF5] transition-colors">✕</button>
        </div>

        {/* Time */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            Wake Time
          </label>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="w-full px-4 py-3 rounded-xl font-mono-brand text-2xl font-bold text-center"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#E8EDF5',
              colorScheme: 'dark',
            }}
          />
        </div>

        {/* Label */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Morning Harmony"
            className="w-full px-4 py-2.5 rounded-xl text-sm"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#E8EDF5',
              fontFamily: 'DM Sans, sans-serif',
            }}
          />
        </div>

        {/* Days */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            Repeat
          </label>
          <div className="flex gap-2">
            {DAY_LABELS.map((d, i) => (
              <button key={i} onClick={() => toggleDay(i)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                style={{
                  background: selectedDays.includes(i) ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedDays.includes(i) ? 'rgba(0,212,170,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  color: selectedDays.includes(i) ? '#00D4AA' : '#6B7A99',
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Sound Source Toggle — 3 tabs */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            Wake Sound
          </label>
          <div className="flex gap-1.5 mb-3">
            {([
              { mode: "frequency", label: "Frequencies", icon: Waves, activeColor: '#00D4AA', activeBg: 'rgba(0,212,170,0.15)', activeBorder: 'rgba(0,212,170,0.4)' },
              { mode: "ambient", label: "Ambients", icon: Wind, activeColor: '#3B82F6', activeBg: 'rgba(59,130,246,0.15)', activeBorder: 'rgba(59,130,246,0.4)' },
              { mode: "studio", label: "My Mixes", icon: Layers, activeColor: '#8B5CF6', activeBg: 'rgba(139,92,246,0.15)', activeBorder: 'rgba(139,92,246,0.4)' },
            ] as const).map(tab => (
              <button key={tab.mode}
                onClick={() => setSoundMode(tab.mode)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200"
                style={{
                  background: soundMode === tab.mode ? tab.activeBg : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${soundMode === tab.mode ? tab.activeBorder : 'rgba(255,255,255,0.06)'}`,
                  color: soundMode === tab.mode ? tab.activeColor : '#6B7A99',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                <tab.icon size={12} /> {tab.label}
              </button>
            ))}
          </div>

          {/* ── Frequencies tab ── */}
          {soundMode === "frequency" && (
            <div>
              {/* Category sub-tabs */}
              <div className="flex gap-1.5 mb-2">
                {([
                  { id: "solfeggio", label: "Solfeggio" },
                  { id: "binaural", label: "Binaural" },
                  { id: "recorded", label: "Recorded" },
                ] as const).map(cat => (
                  <button key={cat.id}
                    onClick={() => setFreqCategory(cat.id)}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
                    style={{
                      background: freqCategory === cat.id ? 'rgba(0,212,170,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${freqCategory === cat.id ? 'rgba(0,212,170,0.3)' : 'rgba(255,255,255,0.05)'}`,
                      color: freqCategory === cat.id ? '#00D4AA' : '#6B7A99',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FREQUENCIES.filter(f => f.category === freqCategory).map(f => (
                  <button key={f.id}
                    onClick={() => {
                      if (f.isPremium) { toast("✦ Premium frequency — upgrade to unlock"); return; }
                      setSelectedFreq(f.id);
                    }}
                    className="p-3 rounded-xl text-left transition-all duration-200 relative"
                    style={{
                      background: selectedFreq === f.id ? `${f.color}18` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedFreq === f.id ? f.color + '40' : 'rgba(255,255,255,0.06)'}`,
                      opacity: f.isPremium ? 0.75 : 1,
                    }}
                  >
                    {f.isPremium && (
                      <Lock size={9} style={{ color: '#8B5CF6', position: 'absolute', top: 8, right: 8 }} />
                    )}
                    <div className="font-mono-brand text-sm font-bold" style={{ color: f.color }}>
                      {freqCategory === "binaural" ? f.name : `${f.hz}Hz`}
                    </div>
                    <div className="text-xs mt-0.5 pr-3" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                      {freqCategory === "binaural" ? (f.binauralOffset ? `${f.binauralOffset}Hz beat` : f.hz + 'Hz') : f.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Ambients tab ── */}
          {soundMode === "ambient" && (
            <div className="space-y-3">
              {(['nature', 'music'] as const).map(cat => {
                const loops = BACKGROUND_LOOPS.filter(l => l.category === cat);
                const catLabel = cat === 'nature' ? 'Nature Sounds' : 'Music Beds';
                const catColor = cat === 'nature' ? '#00D4AA' : '#F59E0B';
                return (
                  <div key={cat}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: catColor, fontFamily: 'DM Sans, sans-serif' }}>
                      {catLabel}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {loops.map(loop => (
                        <button key={loop.id}
                          onClick={() => setSelectedAmbientId(loop.id)}
                          className="p-2.5 rounded-xl text-center transition-all duration-200"
                          style={{
                            background: selectedAmbientId === loop.id ? `rgba(59,130,246,0.18)` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${selectedAmbientId === loop.id ? 'rgba(59,130,246,0.45)' : 'rgba(255,255,255,0.06)'}`,
                          }}
                        >
                          <div className="text-xs font-semibold" style={{ color: selectedAmbientId === loop.id ? '#3B82F6' : '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
                            {loop.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Studio Mixes tab ── */}
          {soundMode === "studio" && (
            savedMixes.length > 0 ? (
              <div className="space-y-2">
                {savedMixes.map(mix => (
                  <button
                    key={mix.id}
                    onClick={() => setSelectedMixId(mix.id)}
                    className="w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all duration-200"
                    style={{
                      background: selectedMixId === mix.id ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedMixId === mix.id ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <Layers size={16} style={{ color: '#8B5CF6', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>{mix.name}</div>
                      <div className="text-xs" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                        {mix.settings.frequencyHz}Hz · {mix.settings.musicMode} · {mix.settings.natureSound}
                      </div>
                    </div>
                    {selectedMixId === mix.id && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#8B5CF6' }}>
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div
                className="p-4 rounded-xl text-center"
                style={{ background: 'rgba(139,92,246,0.06)', border: '1px dashed rgba(139,92,246,0.2)' }}
              >
                <Layers size={20} style={{ color: '#8B5CF6', margin: '0 auto 8px' }} />
                <p className="text-xs" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                  No saved mixes yet. Go to <strong style={{ color: '#8B5CF6' }}>Sound Studio</strong> and tap <strong style={{ color: '#8B5CF6' }}>Save Mix</strong> to create one.
                </p>
              </div>
            )
          )}
        </div>

        {/* Wake Sequence */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            Wake Sequence
          </label>
          <div className="space-y-2">
            {WAKE_SEQUENCES.map(seq => (
              <button key={seq.id}
                onClick={() => {
                  if (seq.isPremium) { toast("✦ Premium sequence — upgrade to unlock"); return; }
                  setSelectedSeq(seq.id);
                }}
                className="w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all duration-200"
                style={{
                  background: selectedSeq === seq.id ? `${seq.color}12` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selectedSeq === seq.id ? seq.color + '35' : 'rgba(255,255,255,0.06)'}`,
                  opacity: seq.isPremium ? 0.7 : 1,
                }}>
                <seq.icon size={16} style={{ color: seq.color, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                    {seq.name}
                    {seq.isPremium && <Lock size={11} style={{ color: '#8B5CF6' }} />}
                  </div>
                  <div className="text-xs truncate" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>{seq.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Fade-in */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            Fade-in Duration: <span style={{ color: '#00D4AA' }}>{fadeIn} minutes</span>
          </label>
          <div className="flex gap-2">
            {[1, 3, 5, 10, 15].map(v => (
              <button key={v} onClick={() => setFadeIn(v)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                style={{
                  background: fadeIn === v ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${fadeIn === v ? 'rgba(0,212,170,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  color: fadeIn === v ? '#00D4AA' : '#6B7A99',
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                {v}m
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave} className="btn-teal w-full py-3.5 text-base font-semibold flex items-center justify-center gap-2">
          <Bell size={18} />
          Set Healing Alarm
        </button>
      </div>
    </div>
  );
}

export default function Alarm() {
  const [alarms, setAlarms] = useState<Alarm[]>(DEFAULT_ALARMS);
  const [showCreate, setShowCreate] = useState(false);
  const [showAlarmPaywall, setShowAlarmPaywall] = useState(false);
  const { permission, requestPermission, scheduleNotification, cancelNotification, isGranted, isSupported } = useAlarmNotifications();
  const mobilePlatform = detectMobilePlatform();
  const { isAuthenticated } = useAuth();
  const subStatus = trpc.subscription.status.useQuery(undefined, { enabled: isAuthenticated });
  const isPremium = subStatus.data?.isPremium ?? false;
  const [prefill, setPrefill] = useState<AlarmPrefill | null>(null);

  // Onboarding quiz handoff: open the create modal pre-filled once
  useEffect(() => {
    const raw = localStorage.getItem("rih_alarm_prefill");
    if (!raw) return;
    localStorage.removeItem("rih_alarm_prefill");
    try {
      setPrefill(JSON.parse(raw));
      setShowCreate(true);
    } catch {
      // malformed prefill — ignore
    }
  }, []);

  // Free tier includes one alarm; the second creation attempt is a proof-moment paywall
  const handleAddAlarm = () => {
    if (!isPremium && alarms.length >= 1) {
      trackPaywallTriggered("second_alarm");
      setShowAlarmPaywall(true);
      return;
    }
    setShowCreate(true);
  };

  // Schedule notifications for all enabled alarms whenever alarms or permission changes
  useEffect(() => {
    if (!isGranted) return;
    alarms.forEach(alarm => {
      if (alarm.enabled) {
        const freq = FREQUENCIES.find(f => f.id === alarm.frequencyId);
        scheduleNotification({
          id: alarm.id,
          label: alarm.label,
          time: alarm.time,
          days: alarm.days,
          frequencyId: alarm.frequencyId,
          frequencyHz: freq?.hz || 432,
          frequencyName: freq?.name || 'Natural Harmony',
          enabled: alarm.enabled,
        });
      } else {
        cancelNotification(alarm.id);
      }
    });
  }, [alarms, isGranted, scheduleNotification, cancelNotification]);

  const toggleAlarm = (id: string) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const deleteAlarm = (id: string) => {
    cancelNotification(id);
    setAlarms(prev => prev.filter(a => a.id !== id));
    toast("Alarm removed");
  };

  const editAlarm = (alarm: Alarm) => {
    toast(`Editing "${alarm.label}" — full edit modal coming in Phase 2`);
  };

  const saveAlarm = (alarm: Alarm) => {
    setAlarms(prev => [...prev, alarm]);
    // Schedule notification for new alarm if permission granted
    if (isGranted) {
      const freq = FREQUENCIES.find(f => f.id === alarm.frequencyId);
      scheduleNotification({
        id: alarm.id,
        label: alarm.label,
        time: alarm.time,
        days: alarm.days,
        frequencyId: alarm.frequencyId,
        frequencyHz: freq?.hz || 432,
        frequencyName: freq?.name || 'Natural Harmony',
        enabled: alarm.enabled,
      });
    }
  };

  const enabledCount = alarms.filter(a => a.enabled).length;

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: '#0A0B14' }}>
        {/* Header */}
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                Smart Alarm
              </div>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 600, color: '#E8EDF5' }}>
                Healing Alarms
              </h1>
            </div>
            <button
              onClick={handleAddAlarm}
              className="btn-teal flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
            >
              <Plus size={16} />
              New Alarm
            </button>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 mt-6">
            {[
              { label: "Active Alarms", value: enabledCount, color: '#00D4AA' },
              { label: "Total Alarms", value: alarms.length, color: '#8B5CF6' },
              { label: "Streak", value: "7 days", color: '#F59E0B' },
            ].map(stat => (
              <div key={stat.label} className="glow-card px-4 py-3 flex-1">
                <div className="text-xs mb-1" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>{stat.label}</div>
                <div className="text-xl font-bold font-mono-brand" style={{ color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Alarm list */}
        <div className="px-6 pb-8 space-y-4">
          {alarms.length === 0 ? (
            <div className="glow-card p-12 text-center">
              <BellOff size={40} className="mx-auto mb-4" style={{ color: '#4A5568' }} />
              <div className="text-base font-medium mb-2" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                No alarms yet
              </div>
              <div className="text-sm mb-6" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
                Set your first healing alarm to begin your morning ritual
              </div>
              <button onClick={() => setShowCreate(true)} className="btn-teal px-6 py-2.5 text-sm font-semibold">
                Create First Alarm
              </button>
            </div>
          ) : (
            alarms.map(alarm => (
              <AlarmCard
                key={alarm.id}
                alarm={alarm}
                onToggle={toggleAlarm}
                onDelete={deleteAlarm}
                onEdit={editAlarm}
              />
            ))
          )}
        </div>

        {/* Mobile: browsers can't wake a locked phone — prompt the native app */}
        {mobilePlatform !== null && (
          <div className="mx-6 mb-4 p-4 rounded-xl" style={{
            background: 'linear-gradient(135deg, rgba(0,212,170,0.1), rgba(139,92,246,0.06))',
            border: '1px solid rgba(0,212,170,0.25)',
          }}>
            <div className="flex items-start gap-3">
              <Smartphone size={18} style={{ color: '#00D4AA', flexShrink: 0, marginTop: '1px' }} />
              <div className="flex-1">
                <div className="text-sm font-semibold mb-1" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
                  Get the real healing alarm
                </div>
                <div className="text-xs leading-relaxed mb-3" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                  Phone browsers can't wake a locked phone — web alarms only fire while this
                  page stays open. The Rise In Harmony app wakes you with your chosen healing
                  frequency reliably, even with the screen locked.
                </div>
                {IOS_APP_LIVE && mobilePlatform === "ios" ? (
                  <a
                    href={APP_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-teal inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
                  >
                    <Smartphone size={13} />
                    Get the iOS App
                  </a>
                ) : (
                  <div className="text-xs font-medium" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
                    The mobile app is in final testing — coming soon to iPhone and Android.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Browser Notification Permission Banner (desktop only — mobile browsers
            suspend background tabs, so the promise below would be false there) */}
        {mobilePlatform === null && isSupported && !isGranted && (
          <div className="mx-6 mb-4 p-4 rounded-xl" style={{
            background: 'linear-gradient(135deg, rgba(0,212,170,0.08), rgba(59,130,246,0.05))',
            border: '1px solid rgba(0,212,170,0.2)',
          }}>
            <div className="flex items-start gap-3">
              <BellRing size={18} style={{ color: '#00D4AA', flexShrink: 0, marginTop: '1px' }} />
              <div className="flex-1">
                <div className="text-sm font-semibold mb-1" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
                  Enable Alarm Notifications
                </div>
                <div className="text-xs leading-relaxed mb-3" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                  Allow browser notifications so your healing alarms fire even when the app is in the background.
                </div>
                <button
                  onClick={requestPermission}
                  className="btn-teal px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Bell size={13} />
                  Enable Notifications
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification granted confirmation (desktop only) */}
        {mobilePlatform === null && isGranted && (
          <div className="mx-6 mb-4 p-3 rounded-xl flex items-center gap-2.5" style={{
            background: 'rgba(0,212,170,0.06)',
            border: '1px solid rgba(0,212,170,0.12)',
          }}>
            <ShieldCheck size={15} style={{ color: '#00D4AA', flexShrink: 0 }} />
            <span className="text-xs" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
              Browser notifications active — alarms will fire even when the app is minimized.
            </span>
          </div>
        )}

        {/* Alarm info banner */}
        <div className="mx-6 mb-8 p-4 rounded-xl" style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.05))',
          border: '1px solid rgba(245,158,11,0.15)',
        }}>
          <div className="flex items-start gap-3">
            <AlarmClock size={18} style={{ color: '#F59E0B', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: '#F59E0B', fontFamily: 'DM Sans, sans-serif' }}>
                Native App Alarms
              </div>
              <div className="text-xs leading-relaxed" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                The mobile app schedules alarms through the system notification service for exact delivery, even with the screen locked. Web alarms use browser notifications and require this tab to stay open.
              </div>
            </div>
          </div>
        </div>

        {/* Alarm image */}
        <div className="mx-6 mb-8 rounded-2xl overflow-hidden" style={{ height: '180px' }}>
          <img
            src="/manus-storage/rih-alarm-visual_9be7e1ae.jpg"
            alt="Healing alarm visualization"
            className="w-full h-full object-cover"
          />
          <div className="relative -mt-full h-full flex items-end p-5"
            style={{ background: 'linear-gradient(to top, rgba(10,11,20,0.8), transparent)' }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                Progressive Wake-Up
              </div>
              <div className="text-xs" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
                Gentle frequency fade-in over your chosen duration
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateAlarmModal onClose={() => setShowCreate(false)} onSave={saveAlarm} prefill={prefill} />
      )}

      {showAlarmPaywall && (
        <PremiumPaywall
          triggerFrequencyName="Unlimited alarms are a Premium feature"
          onClose={() => setShowAlarmPaywall(false)}
        />
      )}
    </Layout>
  );
}
