/**
 * Alarm — Rise In Harmony Smart Alarm Scheduler
 * Redesigned: Sleek futuristic nighttime aesthetic — luminous, serene, technology-forward
 * iOS-style alarm management: swipe-to-delete, tap-to-edit, drum-roll time picker
 * Server-sourced alarms (trpc.alarms.list) with localStorage fallback for guests
 * Optimistic updates with rollback on failure
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Plus, AlarmClock, Trash2, Edit3, Bell, BellOff, Waves, Sunrise, Zap,
  Lock, BellRing, ShieldCheck, Layers, Smartphone, Music2, Wind, Play,
  Square, Check, Moon,
} from "lucide-react";
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
import AlarmRinging, { type RingingSound } from "@/components/AlarmRinging";

// ─── Grounding frequency for gentle re-entry on 3rd snooze ─────────────────
const GROUNDING_FREQ_ID = "174hz"; // 174 Hz — Foundation / Pain Relief
const MAX_SNOOZES = 2;
const SNOOZE_MINUTES = 5;

/** Build a RingingSound payload from a local Alarm object. */
function buildRingingSound(alarm: Alarm): RingingSound {
  if (alarm.soundType === "studio_mix" && alarm.studioMixId) {
    const mix = loadSavedMixes().find(m => m.id === alarm.studioMixId);
    if (mix) {
      return {
        type: "studio_mix",
        studioMix: {
          name: mix.name,
          frequencyHz: mix.settings.frequencyHz ?? 432,
          musicMode: mix.settings.musicMode ?? "none",
          natureSound: mix.settings.natureSound ?? "none",
          frequencyVolume: 0.7,
          musicVolume: 0.5,
          natureVolume: 0.4,
        },
      };
    }
  }
  const freq = FREQUENCIES.find(f => f.id === alarm.frequencyId) ?? FREQUENCIES.find(f => f.id === "432hz") ?? FREQUENCIES[0];
  return { type: "frequency", frequencyId: freq.id };
}

function buildGroundingSound(): RingingSound {
  const freq = FREQUENCIES.find(f => f.id === GROUNDING_FREQ_ID) ?? FREQUENCIES[0];
  return { type: "frequency", frequencyId: freq.id };
}

// ─── Mobile platform detection ────────────────────────────────────────────────
const IOS_APP_LIVE = false;
const APP_STORE_URL = "https://apps.apple.com/app/id6786561356";

function detectMobilePlatform(): "ios" | "android" | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}

// ─── Studio Mix presets (localStorage) ───────────────────────────────────────
const CUSTOM_PRESETS_KEY = "rih_custom_presets";
interface SavedStudioMix {
  id: string;
  name: string;
  settings: { frequencyHz?: number; musicMode?: string; natureSound?: string };
}
function loadSavedMixes(): SavedStudioMix[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_PRESETS_KEY) || "[]"); }
  catch { return []; }
}

// ─── Local alarm type ─────────────────────────────────────────────────────────
type SleepProfile = "light" | "normal" | "heavy" | "very_heavy";

interface Alarm {
  id: string;
  time: string;
  label: string;
  frequencyId: string;
  sequenceId: string;
  days: number[];
  enabled: boolean;
  fadeInMinutes: number;
  sleepProfile?: SleepProfile;
  soundType?: "frequency" | "user_sound" | "studio_mix";
  studioMixId?: string;
  studioMixName?: string;
  userSoundId?: number;
  userSoundName?: string;
  ambientId?: string;
  ambientLabel?: string;
}

const ALARMS_STORAGE_KEY = "rih_alarms_v1";
function loadLocalAlarms(): Alarm[] {
  try {
    const raw = localStorage.getItem(ALARMS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through */ }
  return DEFAULT_ALARMS;
}
function persistLocalAlarms(alarms: Alarm[]) {
  localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
}

const WAKE_SEQUENCES = [
  { id: "gentle", name: "Gentle Morning", icon: Sunrise, description: "432Hz → 528Hz fade-in over 5 min", isPremium: false, color: "#F2C94C" },
  { id: "deep-sleep-wake", name: "Deep Sleep Wake", icon: Waves, description: "δ Delta → θ Theta → α Alpha — brain-guided wake", isPremium: false, color: "#00D4AA" },
  { id: "chakra", name: "Chakra Awakening", icon: Zap, description: "Root to Crown — 7 chakra progression", isPremium: true, color: "#8B5CF6" },
  { id: "binaural-focus", name: "Binaural Focus", icon: BellRing, description: "Alpha waves for mental clarity", isPremium: true, color: "#3B82F6" },
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const DEFAULT_ALARMS: Alarm[] = [
  { id: "1", time: "06:30", label: "Morning Harmony", frequencyId: "432", sequenceId: "gentle", days: [1, 2, 3, 4, 5], enabled: true, fadeInMinutes: 5 },
  { id: "2", time: "07:00", label: "Weekend Rise", frequencyId: "528", sequenceId: "gentle", days: [0, 6], enabled: false, fadeInMinutes: 3 },
];

// ─── iOS drum-roll time picker ────────────────────────────────────────────────
interface DrumRollPickerProps {
  value: number;
  items: Array<{ value: number; label: string }>;
  onChange: (v: number) => void;
  height?: number;
}

function DrumRollPicker({ value, items, onChange, height = 180 }: DrumRollPickerProps) {
  const ITEM_H = 44;
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  const selectedIdx = useMemo(() => items.findIndex(i => i.value === value), [items, value]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const target = selectedIdx * ITEM_H;
    el.scrollTop = target;
  }, [selectedIdx]);

  const snapToNearest = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    el.scrollTop = clamped * ITEM_H;
    onChange(items[clamped].value);
  }, [items, onChange]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    clearTimeout((el as HTMLDivElement & { _snapTimer?: ReturnType<typeof setTimeout> })._snapTimer);
    (el as HTMLDivElement & { _snapTimer?: ReturnType<typeof setTimeout> })._snapTimer = setTimeout(snapToNearest, 120);
  }, [snapToNearest]);

  const visiblePadding = Math.floor(height / 2 / ITEM_H) * ITEM_H;

  return (
    <div className="relative overflow-hidden" style={{ height, width: '100%' }}>
      <div
        className="pointer-events-none absolute left-0 right-0 z-10"
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          height: ITEM_H,
          background: 'rgba(0,212,170,0.08)',
          borderTop: '1px solid rgba(0,212,170,0.25)',
          borderBottom: '1px solid rgba(0,212,170,0.25)',
        }}
      />
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-10" style={{
        height: '40%',
        background: 'linear-gradient(to bottom, rgba(8,10,24,1) 0%, transparent 100%)',
      }} />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10" style={{
        height: '40%',
        background: 'linear-gradient(to top, rgba(8,10,24,1) 0%, transparent 100%)',
      }} />
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: '100%',
          overflowY: 'scroll',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingTop: visiblePadding,
          paddingBottom: visiblePadding,
          scrollSnapType: 'y mandatory',
        }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {items.map(item => (
          <div
            key={item.value}
            onClick={() => { onChange(item.value); }}
            style={{
              height: ITEM_H,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'center',
              cursor: 'pointer',
              fontFamily: 'DM Mono, monospace',
              fontSize: '1.5rem',
              fontWeight: item.value === value ? 700 : 400,
              color: item.value === value ? '#E8EDF5' : '#2D3748',
              transition: 'color 0.15s, font-weight 0.15s',
              userSelect: 'none',
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Format countdown ─────────────────────────────────────────────────────────
function formatCountdown(ms: number): string {
  if (ms <= 0) return "< 1 min";
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 1) return "< 1 min";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Nighttime Star Field ─────────────────────────────────────────────────────
function StarField() {
  const stars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.5,
    opacity: Math.random() * 0.5 + 0.1,
    delay: Math.random() * 4,
    duration: Math.random() * 3 + 2,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {stars.map(s => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: '#E8EDF5',
            opacity: s.opacity,
            animation: `bio-pulse ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      {/* Aurora bands */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 120% 40% at 50% -10%, rgba(0,212,170,0.06) 0%, transparent 60%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 30% at 80% 20%, rgba(139,92,246,0.04) 0%, transparent 60%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 60% 25% at 20% 60%, rgba(59,130,246,0.03) 0%, transparent 60%)',
      }} />
    </div>
  );
}

// ─── Live Digital Clock Hero ──────────────────────────────────────────────────
function LiveDigitalClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const hStr = String(h12).padStart(2, '0');
  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(2, '0');

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;

  return (
    <div className="flex flex-col items-center" style={{ position: 'relative' }}>
      {/* Outer glow halo */}
      <div className="absolute pointer-events-none" style={{
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '320px', height: '120px',
        background: 'radial-gradient(ellipse, rgba(0,212,170,0.12) 0%, transparent 70%)',
        filter: 'blur(20px)',
        animation: 'bio-pulse 4s ease-in-out infinite',
      }} />

      {/* Time display */}
      <div className="flex items-end gap-1 relative" style={{ zIndex: 1 }}>
        <span style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 'clamp(3.5rem, 10vw, 5.5rem)',
          fontWeight: 300,
          letterSpacing: '-0.02em',
          color: '#E8EDF5',
          lineHeight: 1,
          textShadow: '0 0 40px rgba(0,212,170,0.3), 0 0 80px rgba(0,212,170,0.1)',
        }}>
          {hStr}
        </span>
        <span style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 'clamp(3.5rem, 10vw, 5.5rem)',
          fontWeight: 300,
          color: 'rgba(0,212,170,0.6)',
          lineHeight: 1,
          animation: 'bio-pulse 1s ease-in-out infinite',
          marginBottom: '0.05em',
        }}>:</span>
        <span style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 'clamp(3.5rem, 10vw, 5.5rem)',
          fontWeight: 300,
          letterSpacing: '-0.02em',
          color: '#E8EDF5',
          lineHeight: 1,
          textShadow: '0 0 40px rgba(0,212,170,0.3), 0 0 80px rgba(0,212,170,0.1)',
        }}>
          {mStr}
        </span>
        <div className="flex flex-col items-start ml-2 mb-2" style={{ gap: '2px' }}>
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#00D4AA',
            letterSpacing: '0.05em',
          }}>{ampm}</span>
          <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '0.75rem',
            color: 'rgba(0,212,170,0.5)',
            letterSpacing: '0.08em',
          }}>{sStr}</span>
        </div>
      </div>

      {/* Date */}
      <div className="mt-2" style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '0.8rem',
        fontWeight: 400,
        color: 'rgba(139,163,191,0.7)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}>
        {dayStr}
      </div>
    </div>
  );
}

// ─── Alarm Card (redesigned) ──────────────────────────────────────────────────
function AlarmCard({ alarm, onToggle, onDelete, onEdit, nextFireTime }: {
  alarm: Alarm;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (alarm: Alarm) => void;
  nextFireTime: Date | null;
}) {
  const freq = FREQUENCIES.find(f => f.id === alarm.frequencyId);
  const seq = WAKE_SEQUENCES.find(s => s.id === alarm.sequenceId);
  const [h, m] = alarm.time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!alarm.enabled || !nextFireTime) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [alarm.enabled, nextFireTime]);
  const msUntil = nextFireTime ? nextFireTime.getTime() - now : null;

  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isScrollRef = useRef(false);
  const DELETE_THRESHOLD = 72;

  const handlePointerDown = (e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isScrollRef.current = false;
    setIsSwiping(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isSwiping) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    if (!isScrollRef.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
      isScrollRef.current = true;
      setIsSwiping(false);
      setSwipeX(0);
      return;
    }
    if (isScrollRef.current) return;
    const clamped = Math.max(-DELETE_THRESHOLD, Math.min(0, dx + (isRevealed ? -DELETE_THRESHOLD : 0)));
    setSwipeX(clamped);
  };

  const handlePointerUp = () => {
    if (!isSwiping || isScrollRef.current) { setIsSwiping(false); return; }
    setIsSwiping(false);
    if (swipeX <= -DELETE_THRESHOLD / 2) {
      setSwipeX(-DELETE_THRESHOLD);
      setIsRevealed(true);
    } else {
      setSwipeX(0);
      setIsRevealed(false);
    }
  };

  const handleCardClick = () => {
    if (isRevealed) { setSwipeX(0); setIsRevealed(false); return; }
    onEdit(alarm);
  };

  const accentColor = alarm.enabled ? (freq?.color || '#00D4AA') : '#2D3748';

  return (
    <div className="relative overflow-hidden" style={{ borderRadius: '1.25rem', touchAction: 'pan-y' }}>
      {/* Delete reveal */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
        style={{ width: `${DELETE_THRESHOLD}px`, background: 'linear-gradient(135deg, #EF4444, #DC2626)', borderRadius: '0 1.25rem 1.25rem 0' }}>
        <button onClick={() => onDelete(alarm.id)} className="flex flex-col items-center gap-1 px-4">
          <Trash2 size={16} color="white" />
          <span className="text-[9px] font-semibold text-white tracking-wide uppercase">Delete</span>
        </button>
      </div>

      {/* Card */}
      <div
        className={`cursor-pointer select-none ${!alarm.enabled ? 'opacity-50' : ''}`}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.23,1,0.32,1)',
          borderRadius: '1.25rem',
          background: alarm.enabled
            ? `linear-gradient(135deg, rgba(10,11,20,0.95) 0%, rgba(${accentColor === '#00D4AA' ? '0,212,170' : accentColor === '#8B5CF6' ? '139,92,246' : '242,201,76'},0.04) 100%)`
            : 'rgba(10,11,20,0.8)',
          border: `1px solid ${alarm.enabled ? `${accentColor}22` : 'rgba(255,255,255,0.04)'}`,
          boxShadow: alarm.enabled
            ? `0 0 0 1px ${accentColor}10, 0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`
            : '0 2px 16px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(12px)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleCardClick}
      >
        {/* Top accent line */}
        {alarm.enabled && (
          <div style={{
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${accentColor}50, transparent)`,
            borderRadius: '1.25rem 1.25rem 0 0',
          }} />
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Time display */}
              <div className="flex items-baseline gap-2 mb-1">
                <span style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '2.8rem',
                  fontWeight: 200,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: alarm.enabled ? '#E8EDF5' : '#4A5568',
                  textShadow: alarm.enabled ? `0 0 30px ${accentColor}30` : 'none',
                }}>
                  {String(displayHour).padStart(2, '0')}:{m}
                </span>
                <div className="flex flex-col gap-0.5 mb-1">
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: alarm.enabled ? accentColor : '#4A5568',
                    letterSpacing: '0.06em',
                  }}>{ampm}</span>
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.65rem',
                    color: '#4A5568',
                    letterSpacing: '0.04em',
                  }}>tap to edit</span>
                </div>
              </div>

              {/* Label */}
              <div className="text-sm font-medium mb-3" style={{
                color: alarm.enabled ? '#8FA3BF' : '#4A5568',
                fontFamily: 'DM Sans, sans-serif',
                letterSpacing: '0.01em',
              }}>{alarm.label}</div>

              {/* Day pills */}
              <div className="flex gap-1.5 mb-3">
                {DAY_LABELS.map((d, i) => (
                  <span key={i}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      fontFamily: 'DM Sans, sans-serif',
                      letterSpacing: '0.02em',
                      background: alarm.days.includes(i)
                        ? `${accentColor}18`
                        : 'rgba(255,255,255,0.03)',
                      color: alarm.days.includes(i) ? accentColor : '#2D3748',
                      border: `1px solid ${alarm.days.includes(i) ? accentColor + '30' : 'rgba(255,255,255,0.04)'}`,
                    }}>
                    {d}
                  </span>
                ))}
              </div>

              {/* Tags row */}
              <div className="flex flex-wrap gap-1.5">
                {alarm.studioMixId ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', fontFamily: 'DM Sans, sans-serif', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <Layers size={8} />{alarm.studioMixName || 'Studio Mix'}
                  </span>
                ) : alarm.ambientId ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6', fontFamily: 'DM Sans, sans-serif', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <Music2 size={8} />{alarm.ambientLabel || 'Ambient'}
                  </span>
                ) : freq && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${freq.color}10`, color: freq.color, fontFamily: 'DM Sans, sans-serif', border: `1px solid ${freq.color}20` }}>
                    {freq.hz}Hz — {freq.name}
                  </span>
                )}
                {seq && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: `${seq.color}10`, color: seq.color, fontFamily: 'DM Sans, sans-serif', border: `1px solid ${seq.color}20` }}>
                    {seq.isPremium && <Lock size={7} />}{seq.name}
                  </span>
                )}
                {alarm.enabled && msUntil !== null && msUntil > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(0,212,170,0.08)', color: '#00D4AA', fontFamily: 'DM Sans, sans-serif', border: '1px solid rgba(0,212,170,0.15)' }}>
                    <Moon size={7} /> in {formatCountdown(msUntil)}
                  </span>
                )}
              </div>
            </div>

            {/* Right controls */}
            <div className="flex flex-col items-end gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <Switch checked={alarm.enabled} onCheckedChange={() => onToggle(alarm.id)} />
              <div className="flex gap-1.5">
                <button onClick={(e) => { e.stopPropagation(); onEdit(alarm); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
                  style={{ color: '#4A5568', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#00D4AA'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,170,0.3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4A5568'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)'; }}
                  title="Edit alarm">
                  <Edit3 size={12} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(alarm.id); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
                  style={{ color: '#4A5568', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4A5568'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)'; }}
                  title="Delete alarm">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Alarm editor sheet ───────────────────────────────────────────────────────
type SoundTab = "frequency" | "studio" | "ambient";

interface AlarmEditorSheetProps {
  onClose: () => void;
  onSave: (alarm: Alarm) => void;
  onDelete?: (id: string) => void;
  editingAlarm?: Alarm | null;
  prefill?: AlarmPrefill | null;
  isPremium: boolean;
  onPremiumNeeded: () => void;
}

function AlarmEditorSheet({ onClose, onSave, onDelete, editingAlarm, prefill, isPremium, onPremiumNeeded }: AlarmEditorSheetProps) {
  const isEditing = !!editingAlarm;

  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return { h: h ?? 7, m: m ?? 0 };
  };
  const initTime = editingAlarm?.time ?? (prefill?.wakeTime ?? "07:00");
  const { h: initH, m: initM } = parseTime(initTime);
  const initIs12 = initH >= 12;
  const initHour12 = initH > 12 ? initH - 12 : initH === 0 ? 12 : initH;

  const [hour12, setHour12] = useState(initHour12);
  const [minute, setMinute] = useState(initM);
  const [isAM, setIsAM] = useState(!initIs12);
  const [label, setLabel] = useState(editingAlarm?.label ?? "Morning Harmony");
  const [selectedFreq, setSelectedFreq] = useState(
    editingAlarm?.frequencyId ?? (prefill?.frequencyHz
      ? FREQUENCIES.find(f => f.hz === prefill.frequencyHz && !f.isPremium)?.id ?? "432"
      : "432")
  );
  const [selectedSeq, setSelectedSeq] = useState(editingAlarm?.sequenceId ?? "gentle");
  const [selectedDays, setSelectedDays] = useState(editingAlarm?.days ?? [1, 2, 3, 4, 5]);
  const [fadeIn, setFadeIn] = useState(editingAlarm?.fadeInMinutes ?? 5);
  const [sleepProfile, setSleepProfile] = useState<SleepProfile>(editingAlarm?.sleepProfile ?? "normal");
  const [soundMode, setSoundMode] = useState<SoundTab>(
    editingAlarm?.studioMixId ? "studio" : editingAlarm?.ambientId ? "ambient" : "frequency"
  );
  const [selectedMixId, setSelectedMixId] = useState<string | null>(editingAlarm?.studioMixId ?? null);
  const [selectedAmbientId, setSelectedAmbientId] = useState<string | null>(editingAlarm?.ambientId ?? null);
  const [freqCategory, setFreqCategory] = useState<"solfeggio" | "binaural" | "recorded">("solfeggio");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const stopPreview = useCallback(() => {
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current.src = ""; previewAudioRef.current = null; }
    setPreviewId(null);
  }, []);
  const togglePreview = useCallback((id: string, url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewId === id) { stopPreview(); return; }
    stopPreview();
    const audio = new Audio(url);
    audio.loop = true; audio.volume = 0.7;
    previewAudioRef.current = audio;
    setPreviewId(id);
    audio.play().catch(() => setPreviewId(null));
    audio.onended = () => setPreviewId(null);
  }, [previewId, stopPreview]);
  useEffect(() => stopPreview, [stopPreview]);

  const savedMixes = loadSavedMixes();
  const { isAuthenticated } = useAuth();
  const mySounds = trpc.sounds.list.useQuery(undefined, { enabled: isAuthenticated });

  const hourItems = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1).padStart(2, '0') })), []);
  const minuteItems = useMemo(() => Array.from({ length: 60 }, (_, i) => ({ value: i, label: String(i).padStart(2, '0') })), []);

  const toggleDay = (d: number) => setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const buildTime = () => {
    let h24 = hour12 % 12;
    if (!isAM) h24 += 12;
    return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (selectedDays.length === 0) { toast("Please select at least one day"); return; }
    const base: Alarm = {
      id: editingAlarm?.id ?? Date.now().toString(),
      time: buildTime(), label,
      frequencyId: selectedFreq, sequenceId: selectedSeq,
      days: selectedDays, enabled: editingAlarm?.enabled ?? true,
      fadeInMinutes: fadeIn,
      sleepProfile,
    };
    if (soundMode === "studio" && selectedMixId) {
      const mix = savedMixes.find(m => m.id === selectedMixId);
      onSave({ ...base, soundType: "studio_mix", studioMixId: selectedMixId, studioMixName: mix?.name });
    } else if (soundMode === "ambient" && selectedAmbientId) {
      const ambient = BACKGROUND_LOOPS.find(l => l.id === selectedAmbientId);
      onSave({ ...base, ambientId: selectedAmbientId, ambientLabel: ambient?.label });
    } else {
      onSave({ ...base, soundType: "frequency" });
    }
    onClose();
    toast(isEditing ? "✓ Alarm updated" : "✓ Healing alarm set — your morning ritual awaits");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #0D0F1E 0%, #080A18 100%)',
          border: '1px solid rgba(0,212,170,0.1)',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,212,170,0.05)',
          maxHeight: '92vh',
        }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-8 h-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.2)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <button onClick={onClose} className="text-sm font-medium" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 600, color: '#E8EDF5', letterSpacing: '0.01em' }}>
            {isEditing ? 'Edit Alarm' : 'New Healing Alarm'}
          </h2>
          <button onClick={handleSave} className="text-sm font-bold" style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
            {isEditing ? 'Save' : 'Add'}
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Alarm Name */}
          <div className="mb-5">
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>Alarm Name</label>
            <input
              type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Morning Harmony"
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,212,170,0.15)', color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
            />
          </div>

          {/* Time picker */}
          <div className="mb-6">
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>Wake Time</label>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(0,212,170,0.03)', border: '1px solid rgba(0,212,170,0.1)' }}>
              <div className="flex items-center justify-center gap-1 px-4 py-2">
                <div style={{ flex: 1, maxWidth: 80 }}>
                  <DrumRollPicker value={hour12} items={hourItems} onChange={setHour12} height={180} />
                </div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '2rem', fontWeight: 200, color: 'rgba(0,212,170,0.5)', paddingBottom: 4 }}>:</span>
                <div style={{ flex: 1, maxWidth: 80 }}>
                  <DrumRollPicker value={minute} items={minuteItems} onChange={setMinute} height={180} />
                </div>
                <div className="flex flex-col gap-2 ml-3">
                  {['AM', 'PM'].map(period => (
                    <button key={period}
                      onClick={() => setIsAM(period === 'AM')}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                      style={{
                        background: (period === 'AM') === isAM ? 'rgba(0,212,170,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${(period === 'AM') === isAM ? 'rgba(0,212,170,0.35)' : 'rgba(255,255,255,0.05)'}`,
                        color: (period === 'AM') === isAM ? '#00D4AA' : '#4A5568',
                        fontFamily: 'DM Sans, sans-serif',
                      }}>
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-center pb-3" style={{ fontFamily: 'DM Mono, monospace', fontSize: '1.1rem', fontWeight: 300, color: '#00D4AA', letterSpacing: '0.05em' }}>
                {String(hour12).padStart(2, '0')}:{String(minute).padStart(2, '0')} {isAM ? 'AM' : 'PM'}
              </div>
            </div>
          </div>

          {/* Repeat days */}
          <div className="mb-5">
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>Repeat</label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                  style={{
                    background: selectedDays.includes(i) ? 'rgba(0,212,170,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selectedDays.includes(i) ? 'rgba(0,212,170,0.35)' : 'rgba(255,255,255,0.05)'}`,
                    color: selectedDays.includes(i) ? '#00D4AA' : '#4A5568',
                    fontFamily: 'DM Sans, sans-serif',
                  }}>
                  {d}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              {[{ label: 'Weekdays', days: [1,2,3,4,5] }, { label: 'Weekend', days: [0,6] }, { label: 'Every day', days: [0,1,2,3,4,5,6] }].map(preset => {
                const active = JSON.stringify([...selectedDays].sort()) === JSON.stringify([...preset.days].sort());
                return (
                  <button key={preset.label} onClick={() => setSelectedDays(preset.days)}
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-150"
                    style={{
                      background: active ? 'rgba(0,212,170,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${active ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.04)'}`,
                      color: active ? '#00D4AA' : '#4A5568',
                      fontFamily: 'DM Sans, sans-serif',
                    }}>
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wake Sound */}
          <div className="mb-5">
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>Wake Sound</label>
            <div className="flex gap-1.5 mb-3">
              {([
                { mode: "frequency" as const, label: "Frequencies", icon: Waves, activeColor: '#00D4AA', activeBg: 'rgba(0,212,170,0.12)', activeBorder: 'rgba(0,212,170,0.3)' },
                { mode: "ambient" as const, label: "Ambients", icon: Wind, activeColor: '#3B82F6', activeBg: 'rgba(59,130,246,0.12)', activeBorder: 'rgba(59,130,246,0.3)' },
                { mode: "studio" as const, label: "My Mixes", icon: Layers, activeColor: '#8B5CF6', activeBg: 'rgba(139,92,246,0.12)', activeBorder: 'rgba(139,92,246,0.3)' },
              ]).map(tab => (
                <button key={tab.mode} onClick={() => setSoundMode(tab.mode)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200"
                  style={{
                    background: soundMode === tab.mode ? tab.activeBg : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${soundMode === tab.mode ? tab.activeBorder : 'rgba(255,255,255,0.05)'}`,
                    color: soundMode === tab.mode ? tab.activeColor : '#4A5568',
                    fontFamily: 'DM Sans, sans-serif',
                  }}>
                  <tab.icon size={11} /> {tab.label}
                </button>
              ))}
            </div>

            {soundMode === "frequency" && (
              <div>
                <div className="flex gap-1.5 mb-2">
                  {([{ id: "solfeggio", label: "Solfeggio" }, { id: "binaural", label: "Binaural" }, { id: "recorded", label: "Recorded" }] as const).map(cat => (
                    <button key={cat.id} onClick={() => setFreqCategory(cat.id)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
                      style={{
                        background: freqCategory === cat.id ? 'rgba(0,212,170,0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${freqCategory === cat.id ? 'rgba(0,212,170,0.25)' : 'rgba(255,255,255,0.04)'}`,
                        color: freqCategory === cat.id ? '#00D4AA' : '#4A5568',
                        fontFamily: 'DM Sans, sans-serif',
                      }}>
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {FREQUENCIES.filter(f => f.category === freqCategory).map(f => {
                    const previewKey = `freq:${f.id}`;
                    const isPreviewing = previewId === previewKey;
                    const previewUrl = f.audioUrl ?? getLibraryLoopUrl(`binaural-${f.hz}`);
                    const alarmFree = f.hz === 432 || f.hz === 528;
                    const isLocked = f.isPremium && !isPremium && !alarmFree;
                    return (
                      <button key={f.id} onClick={() => { if (isLocked) { onPremiumNeeded(); return; } setSelectedFreq(f.id); }}
                        className="p-3 rounded-xl text-left transition-all duration-200 relative"
                        style={{
                          background: selectedFreq === f.id ? `${f.color}12` : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${selectedFreq === f.id ? f.color + '30' : 'rgba(255,255,255,0.05)'}`,
                          opacity: isLocked ? 0.55 : 1,
                        }}>
                        {isLocked ? (
                          <Lock size={9} style={{ color: '#8B5CF6', position: 'absolute', top: 8, right: 8 }} />
                        ) : alarmFree && f.isPremium ? (
                          <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 8, color: '#00D4AA', fontFamily: 'DM Sans, sans-serif', background: 'rgba(0,212,170,0.1)', padding: '1px 4px', borderRadius: 4 }}>FREE</span>
                        ) : (
                          <button onClick={(e) => togglePreview(previewKey, previewUrl, e)}
                            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150"
                            style={{ background: isPreviewing ? f.color : 'rgba(255,255,255,0.06)', border: `1px solid ${isPreviewing ? f.color : 'rgba(255,255,255,0.1)'}` }}>
                            {isPreviewing ? <Square size={7} fill="#0A0B14" style={{ color: '#0A0B14' }} /> : <Play size={7} fill="currentColor" style={{ color: f.color }} />}
                          </button>
                        )}
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', fontWeight: 600, color: f.color }}>
                          {freqCategory === "binaural" ? f.name : `${f.hz}Hz`}
                        </div>
                        <div className="text-xs mt-0.5 pr-6" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
                          {freqCategory === "binaural" ? (f.binauralOffset ? `${f.binauralOffset}Hz beat` : f.hz + 'Hz') : f.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {soundMode === "ambient" && (
              <div className="space-y-3">
                {(['nature', 'music'] as const).map(cat => {
                  const loops = BACKGROUND_LOOPS.filter(l => l.category === cat);
                  const catColor = cat === 'nature' ? '#00D4AA' : '#F2C94C';
                  return (
                    <div key={cat}>
                      <div className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: catColor, fontFamily: 'DM Sans, sans-serif' }}>
                        {cat === 'nature' ? 'Nature Sounds' : 'Music Beds'}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {loops.map(loop => {
                          const previewKey = `ambient:${loop.id}`;
                          const isPreviewing = previewId === previewKey;
                          return (
                            <button key={loop.id} onClick={() => setSelectedAmbientId(loop.id)}
                              className="p-2.5 rounded-xl text-center transition-all duration-200 relative"
                              style={{
                                background: selectedAmbientId === loop.id ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${selectedAmbientId === loop.id ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.04)'}`,
                              }}>
                              <button onClick={(e) => togglePreview(previewKey, getLibraryLoopUrl(loop.id), e)}
                                className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                                style={{ background: isPreviewing ? catColor : 'rgba(255,255,255,0.06)', border: `1px solid ${isPreviewing ? catColor : 'rgba(255,255,255,0.1)'}` }}>
                                {isPreviewing ? <Square size={6} fill="#0A0B14" style={{ color: '#0A0B14' }} /> : <Play size={6} fill="currentColor" style={{ color: catColor }} />}
                              </button>
                              <div className="text-xs font-medium pr-4" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif', fontSize: '0.65rem' }}>
                                {loop.label}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {soundMode === "studio" && (
              savedMixes.length > 0 ? (
                <div className="space-y-2">
                  {savedMixes.map(mix => (
                    <button key={mix.id} onClick={() => setSelectedMixId(mix.id)}
                      className="w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all duration-200"
                      style={{
                        background: selectedMixId === mix.id ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${selectedMixId === mix.id ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.04)'}`,
                      }}>
                      <Layers size={14} style={{ color: '#8B5CF6', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>{mix.name}</div>
                        <div className="text-xs" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>{mix.settings.frequencyHz}Hz · {mix.settings.musicMode}</div>
                      </div>
                      {selectedMixId === mix.id && <Check size={14} style={{ color: '#8B5CF6' }} />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(139,92,246,0.04)', border: '1px dashed rgba(139,92,246,0.15)' }}>
                  <Layers size={18} style={{ color: '#8B5CF6', margin: '0 auto 8px' }} />
                  <p className="text-xs" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
                    No saved mixes yet. Go to <strong style={{ color: '#8B5CF6' }}>Sound Studio</strong> and tap <strong style={{ color: '#8B5CF6' }}>Save Mix</strong>.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Wake Sequence */}
          <div className="mb-5">
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>Wake Sequence</label>
            <div className="space-y-2">
              {WAKE_SEQUENCES.map(seq => (
                <button key={seq.id}
                  onClick={() => { if (seq.isPremium) { toast("✦ Premium sequence — upgrade to unlock"); return; } setSelectedSeq(seq.id); }}
                  className="w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all duration-200"
                  style={{
                    background: selectedSeq === seq.id ? `${seq.color}10` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedSeq === seq.id ? seq.color + '25' : 'rgba(255,255,255,0.04)'}`,
                    opacity: seq.isPremium ? 0.65 : 1,
                  }}>
                  <seq.icon size={14} style={{ color: seq.color, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                      {seq.name}{seq.isPremium && <Lock size={10} style={{ color: '#8B5CF6' }} />}
                    </div>
                    <div className="text-xs truncate" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>{seq.description}</div>
                  </div>
                  {selectedSeq === seq.id && !seq.isPremium && <Check size={13} style={{ color: '#00D4AA', flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Fade-in */}
          <div className="mb-6">
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
              Fade-in: <span style={{ color: '#00D4AA' }}>{fadeIn} min</span>
            </label>
            <div className="flex gap-1.5">
              {[1, 3, 5, 10, 15].map(v => (
                <button key={v} onClick={() => setFadeIn(v)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                  style={{
                    background: fadeIn === v ? 'rgba(0,212,170,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${fadeIn === v ? 'rgba(0,212,170,0.35)' : 'rgba(255,255,255,0.05)'}`,
                    color: fadeIn === v ? '#00D4AA' : '#4A5568',
                    fontFamily: 'DM Sans, sans-serif',
                  }}>
                  {v}m
                </button>
              ))}
            </div>
          </div>

          {/* Sleep Profile */}
          <div className="mb-6">
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>Sleep Profile</label>
            <p className="text-[10px] mb-3" style={{ color: '#2D3748', fontFamily: 'DM Sans, sans-serif' }}>Controls how quickly the alarm escalates to full volume</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'light' as const, label: 'Light Sleeper', desc: 'Slow, gentle rise', color: '#00D4AA' },
                { id: 'normal' as const, label: 'Normal', desc: 'Balanced escalation', color: '#8B5CF6' },
                { id: 'heavy' as const, label: 'Heavy Sleeper', desc: 'Faster escalation', color: '#F2C94C' },
                { id: 'very_heavy' as const, label: 'Very Heavy', desc: 'Quick to full volume', color: '#EF4444' },
              ] as const).map(p => (
                <button key={p.id} onClick={() => setSleepProfile(p.id)}
                  className="p-3 rounded-xl text-left transition-all duration-200"
                  style={{
                    background: sleepProfile === p.id ? `${p.color}10` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${sleepProfile === p.id ? p.color + '30' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                  <div className="text-xs font-semibold" style={{ color: sleepProfile === p.id ? p.color : '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>{p.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: '#2D3748', fontFamily: 'DM Sans, sans-serif' }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button onClick={handleSave} className="btn-teal w-full py-4 text-sm font-semibold flex items-center justify-center gap-2 mb-4">
            <Bell size={16} />
            {isEditing ? 'Save Changes' : 'Set Healing Alarm'}
          </button>

          {/* Delete (edit mode) */}
          {isEditing && onDelete && (
            <>
              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444', fontFamily: 'DM Sans, sans-serif' }}>
                  <Trash2 size={14} /> Delete Alarm
                </button>
              ) : (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="px-4 py-3 text-center text-sm" style={{ color: '#E8EDF5', background: 'rgba(239,68,68,0.06)', fontFamily: 'DM Sans, sans-serif' }}>
                    Delete this alarm?
                  </div>
                  <div className="flex">
                    <button onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-3 text-sm font-semibold"
                      style={{ color: '#4A5568', background: 'rgba(255,255,255,0.02)', fontFamily: 'DM Sans, sans-serif' }}>
                      Cancel
                    </button>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.04)' }} />
                    <button onClick={() => { onDelete(editingAlarm.id); onClose(); }}
                      className="flex-1 py-3 text-sm font-bold"
                      style={{ color: '#EF4444', background: 'rgba(239,68,68,0.04)', fontFamily: 'DM Sans, sans-serif' }}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
              <div className="h-6" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface AlarmPrefill { wakeTime?: string; frequencyHz?: number; }

// ─── Main Alarm page ──────────────────────────────────────────────────────────
export default function Alarm() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const serverAlarms = trpc.alarms.list.useQuery(undefined, { enabled: isAuthenticated });
  const [localAlarms, setLocalAlarms] = useState<Alarm[]>(loadLocalAlarms);

  const alarms: Alarm[] = useMemo(() => {
    if (isAuthenticated && serverAlarms.data) {
      return serverAlarms.data.map(a => ({
        id: String(a.id),
        time: `${String(a.hour).padStart(2, '0')}:${String(a.minute).padStart(2, '0')}`,
        label: a.label ?? 'Healing Alarm',
        frequencyId: FREQUENCIES.find(f => f.hz === a.frequencyHz)?.id ?? '432hz',
        sequenceId: a.wakeSequence ?? 'gentle',
        days: (a.days as number[]) ?? [],
        enabled: a.isEnabled,
        fadeInMinutes: a.fadeInMinutes,
        soundType: a.soundType as Alarm['soundType'],
        studioMixName: a.studioMixName ?? undefined,
      }));
    }
    return localAlarms;
  }, [isAuthenticated, serverAlarms.data, localAlarms]);

  const setAlarms = useCallback((updater: Alarm[] | ((prev: Alarm[]) => Alarm[])) => {
    if (!isAuthenticated) {
      setLocalAlarms(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        persistLocalAlarms(next);
        return next;
      });
    }
  }, [isAuthenticated]);

  const [showCreate, setShowCreate] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [showAlarmPaywall, setShowAlarmPaywall] = useState(false);
  const { requestPermission, scheduleNotification, cancelNotification, getNextFireTime, isGranted, isSupported } = useAlarmNotifications();
  const mobilePlatform = detectMobilePlatform();
  const subStatus = trpc.subscription.status.useQuery(undefined, { enabled: isAuthenticated });
  const isPremium = subStatus.data?.isPremium ?? false;
  const [prefill, setPrefill] = useState<AlarmPrefill | null>(null);

  const [firingAlarm, setFiringAlarm] = useState<Alarm | null>(null);
  const snoozeCountRef = useRef<Record<string, number>>({});
  const snoozeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isGentleReentry, setIsGentleReentry] = useState(false);

  const [, setCountdownTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCountdownTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const createAlarmMutation = trpc.alarms.create.useMutation({
    onSuccess: () => utils.alarms.list.invalidate(),
    onError: () => { toast.error("Failed to save alarm — please try again"); utils.alarms.list.invalidate(); },
  });

  const updateAlarmMutation = trpc.alarms.update.useMutation({
    onMutate: async (input) => {
      await utils.alarms.list.cancel();
      const prev = utils.alarms.list.getData();
      utils.alarms.list.setData(undefined, old =>
        old?.map(a => a.id === input.id ? { ...a, ...input } : a)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.alarms.list.setData(undefined, ctx.prev);
      toast.error("Failed to update alarm");
    },
    onSettled: () => utils.alarms.list.invalidate(),
  });

  const deleteAlarmMutation = trpc.alarms.delete.useMutation({
    onMutate: async (input) => {
      await utils.alarms.list.cancel();
      const prev = utils.alarms.list.getData();
      utils.alarms.list.setData(undefined, old => old?.filter(a => a.id !== input.id));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.alarms.list.setData(undefined, ctx.prev);
      toast.error("Failed to delete alarm");
    },
    onSettled: () => utils.alarms.list.invalidate(),
  });

  const toggleAlarmMutation = trpc.alarms.toggle.useMutation({
    onMutate: async (input) => {
      await utils.alarms.list.cancel();
      const prev = utils.alarms.list.getData();
      utils.alarms.list.setData(undefined, old =>
        old?.map(a => a.id === input.id ? { ...a, isEnabled: input.isEnabled } : a)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.alarms.list.setData(undefined, ctx.prev);
      toast.error("Failed to toggle alarm");
    },
    onSettled: () => utils.alarms.list.invalidate(),
  });

  useEffect(() => {
    const raw = localStorage.getItem("rih_alarm_prefill");
    if (!raw) return;
    localStorage.removeItem("rih_alarm_prefill");
    try { setPrefill(JSON.parse(raw)); setShowCreate(true); } catch { /* ignore */ }
  }, []);

  const handleAddAlarm = () => {
    if (!isPremium && alarms.length >= 1) { trackPaywallTriggered("second_alarm"); setShowAlarmPaywall(true); return; }
    setShowCreate(true);
  };

  const handleAlarmFire = useCallback((alarmId: string) => {
    const alarm = alarms.find(a => a.id === alarmId);
    if (!alarm) return;
    snoozeCountRef.current[alarmId] = 0;
    setIsGentleReentry(false);
    setFiringAlarm(alarm);
  }, [alarms]);

  const clearSnoozeTimer = useCallback(() => {
    if (snoozeTimerRef.current != null) {
      clearTimeout(snoozeTimerRef.current);
      snoozeTimerRef.current = null;
    }
  }, []);

  const handleStop = useCallback(() => {
    clearSnoozeTimer();
    if (firingAlarm) { delete snoozeCountRef.current[firingAlarm.id]; }
    setFiringAlarm(null);
    setIsGentleReentry(false);
  }, [firingAlarm, clearSnoozeTimer]);

  const handleSnooze = useCallback(() => {
    if (!firingAlarm) return;
    const id = firingAlarm.id;
    const alarm = firingAlarm;
    const count = (snoozeCountRef.current[id] ?? 0) + 1;
    snoozeCountRef.current[id] = count;
    const gentle = count >= MAX_SNOOZES;
    if (gentle) setIsGentleReentry(true);
    setFiringAlarm(null);
    clearSnoozeTimer();
    snoozeTimerRef.current = setTimeout(() => {
      snoozeTimerRef.current = null;
      setFiringAlarm(alarm);
    }, SNOOZE_MINUTES * 60 * 1000);
  }, [firingAlarm, clearSnoozeTimer]);

  useEffect(() => () => clearSnoozeTimer(), [clearSnoozeTimer]);

  useEffect(() => {
    alarms.forEach(alarm => {
      const freq = FREQUENCIES.find(f => f.id === alarm.frequencyId);
      if (alarm.enabled) {
        scheduleNotification({
          id: alarm.id, label: alarm.label, time: alarm.time, days: alarm.days,
          frequencyId: alarm.frequencyId, frequencyHz: freq?.hz || 432,
          frequencyName: freq?.name || 'Natural Harmony', enabled: alarm.enabled,
          onFire: handleAlarmFire,
        });
      } else {
        cancelNotification(alarm.id);
      }
    });
  }, [alarms, scheduleNotification, cancelNotification, handleAlarmFire]);

  const toggleAlarm = (id: string) => {
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) return;
    const numericId = parseInt(id);
    if (isAuthenticated && !isNaN(numericId)) {
      toggleAlarmMutation.mutate({ id: numericId, isEnabled: !alarm.enabled });
    } else {
      setAlarms(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
    }
  };

  const deleteAlarmById = (id: string) => {
    cancelNotification(id);
    const numericId = parseInt(id);
    if (isAuthenticated && !isNaN(numericId)) {
      deleteAlarmMutation.mutate({ id: numericId });
    } else {
      setAlarms(prev => prev.filter(a => a.id !== id));
    }
    toast("Alarm removed");
  };

  const saveAlarm = (alarm: Alarm) => {
    if (isAuthenticated) {
      const [h, m] = alarm.time.split(':');
      const freq = FREQUENCIES.find(f => f.id === alarm.frequencyId);
      createAlarmMutation.mutate({
        label: alarm.label, hour: parseInt(h), minute: parseInt(m),
        days: alarm.days, soundType: alarm.soundType === 'studio_mix' ? 'studio_mix' : 'frequency',
        frequencyHz: freq?.hz, frequencyName: freq?.name,
        studioMixName: alarm.studioMixName, wakeSequence: alarm.sequenceId,
        fadeInMinutes: alarm.fadeInMinutes,
      });
    } else {
      setAlarms(prev => [...prev, alarm]);
    }
    if (isGranted) {
      const freq = FREQUENCIES.find(f => f.id === alarm.frequencyId);
      scheduleNotification({ id: alarm.id, label: alarm.label, time: alarm.time, days: alarm.days, frequencyId: alarm.frequencyId, frequencyHz: freq?.hz || 432, frequencyName: freq?.name || 'Natural Harmony', enabled: alarm.enabled });
    }
  };

  const saveEditedAlarm = (updated: Alarm) => {
    setEditingAlarm(null);
    const numericId = parseInt(updated.id);
    if (isAuthenticated && !isNaN(numericId)) {
      const [h, m] = updated.time.split(':');
      const freq = FREQUENCIES.find(f => f.id === updated.frequencyId);
      updateAlarmMutation.mutate({
        id: numericId, label: updated.label,
        hour: parseInt(h), minute: parseInt(m),
        days: updated.days, soundType: updated.soundType === 'studio_mix' ? 'studio_mix' : 'frequency',
        frequencyHz: freq?.hz, frequencyName: freq?.name,
        studioMixName: updated.studioMixName, wakeSequence: updated.sequenceId,
        fadeInMinutes: updated.fadeInMinutes, isEnabled: updated.enabled,
      });
    } else {
      setAlarms(prev => prev.map(a => a.id === updated.id ? updated : a));
    }
  };

  const enabledCount = alarms.filter(a => a.enabled).length;

  return (
    <Layout>
      {/* ── Full-page nighttime background ── */}
      <div className="min-h-screen relative" style={{
        background: 'linear-gradient(180deg, #050610 0%, #080A18 30%, #0A0B14 60%, #08090F 100%)',
      }}>
        <StarField />

        {/* ── Hero section ── */}
        <div className="relative px-5 pt-10 pb-6" style={{ zIndex: 1 }}>

          {/* Page label */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background: 'rgba(242,201,76,0.06)', border: '1px solid rgba(242,201,76,0.15)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#F2C94C', animation: 'bio-pulse 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.65rem', fontWeight: 600, color: '#F2C94C', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Smart Alarm
              </span>
            </div>
          </div>

          {/* Digital clock hero */}
          <div className="flex justify-center mb-6">
            <LiveDigitalClock />
          </div>

          {/* Page title */}
          <div className="text-center mb-8">
            <h1 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#E8EDF5',
              letterSpacing: '0.02em',
              lineHeight: 1.2,
            }}>
              Healing Alarms
            </h1>
            <p style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.8rem',
              color: 'rgba(139,163,191,0.6)',
              marginTop: '0.35rem',
              letterSpacing: '0.04em',
            }}>
              Wake gently with healing frequencies
            </p>
          </div>

          {/* Stats row */}
          <div className="flex gap-3 mb-6">
            {[
              { label: "Active", value: enabledCount, color: '#00D4AA', bg: 'rgba(0,212,170,0.06)', border: 'rgba(0,212,170,0.12)' },
              { label: "Total", value: alarms.length, color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.12)' },
              { label: "Streak", value: "7 days", color: '#F2C94C', bg: 'rgba(242,201,76,0.06)', border: 'rgba(242,201,76,0.12)' },
            ].map(stat => (
              <div key={stat.label} className="flex-1 rounded-2xl px-4 py-3 flex flex-col items-center"
                style={{ background: stat.bg, border: `1px solid ${stat.border}` }}>
                <div style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '1.5rem',
                  fontWeight: 300,
                  color: stat.color,
                  lineHeight: 1,
                  textShadow: `0 0 20px ${stat.color}40`,
                }}>{stat.value}</div>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.6rem',
                  color: 'rgba(139,163,191,0.5)',
                  marginTop: '0.3rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* New Alarm CTA */}
          <div className="flex justify-center mb-6">
            <button onClick={handleAddAlarm}
              className="relative flex items-center gap-2.5 px-8 py-3.5 rounded-full font-semibold transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #00D4AA, #00B894)',
                color: '#050610',
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                boxShadow: '0 0 30px rgba(0,212,170,0.35), 0 4px 20px rgba(0,0,0,0.4)',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 50px rgba(0,212,170,0.55), 0 6px 30px rgba(0,0,0,0.5)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(0,212,170,0.35), 0 4px 20px rgba(0,0,0,0.4)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              {/* Pulse ring */}
              <span className="absolute inset-0 rounded-full pointer-events-none" style={{
                border: '1px solid rgba(0,212,170,0.4)',
                animation: 'ring-expand 2.5s ease-out infinite',
              }} />
              <Plus size={16} strokeWidth={2.5} />
              New Alarm
            </button>
          </div>
        </div>

        {/* ── Deep Sleep Wake banner ── */}
        <div className="px-5 pb-4" style={{ position: 'relative', zIndex: 1 }}>
          <a href="/deep-sleep-wake"
            className="flex items-center justify-between gap-4 px-5 py-4 w-full rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.07) 0%, rgba(0,212,170,0.04) 100%)',
              border: '1px solid rgba(139,92,246,0.15)',
              textDecoration: 'none',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-center gap-3">
              {/* Brainwave icon */}
              <div className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontStyle: 'italic', color: '#8B5CF6' }}>δ</span>
              </div>
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: '#C4B5FD', letterSpacing: '0.01em' }}>
                  Deep Sleep Wake Sequence
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.65rem', color: 'rgba(139,163,191,0.5)', marginTop: '0.2rem', letterSpacing: '0.03em' }}>
                  δ→θ→α · Brainwave sweep · How it works
                </div>
              </div>
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', fontWeight: 600, color: '#8B5CF6', letterSpacing: '0.04em', flexShrink: 0 }}>
              Watch →
            </div>
          </a>
        </div>

        {/* ── Alarm list ── */}
        <div className="px-5 pb-6 space-y-3" style={{ position: 'relative', zIndex: 1 }}>
          {serverAlarms.isLoading && isAuthenticated ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: '#4A5568' }}>Loading alarms...</div>
            </div>
          ) : alarms.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex justify-center mb-4">
                <Moon size={36} style={{ color: '#2D3748' }} />
              </div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', color: '#4A5568', marginBottom: '0.5rem' }}>No alarms yet</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: '#2D3748', marginBottom: '1.5rem' }}>Set your first healing alarm to begin your morning ritual</div>
              <button onClick={() => setShowCreate(true)} className="btn-teal px-6 py-2.5 text-sm font-semibold">Create First Alarm</button>
            </div>
          ) : (
            alarms.map(alarm => (
              <AlarmCard
                key={alarm.id}
                alarm={alarm}
                onToggle={toggleAlarm}
                onDelete={deleteAlarmById}
                onEdit={setEditingAlarm}
                nextFireTime={alarm.enabled ? getNextFireTime(alarm.id) : null}
              />
            ))
          )}
        </div>

        {/* ── Notification / mobile banners ── */}
        <div className="px-5 pb-4 space-y-3" style={{ position: 'relative', zIndex: 1 }}>

          {mobilePlatform !== null && (
            <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.06), rgba(139,92,246,0.04))', border: '1px solid rgba(0,212,170,0.12)' }}>
              <div className="flex items-start gap-3">
                <Smartphone size={16} style={{ color: '#00D4AA', flexShrink: 0, marginTop: '1px' }} />
                <div className="flex-1">
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: '#00D4AA', marginBottom: '0.35rem' }}>Get the real healing alarm</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', color: 'rgba(139,163,191,0.6)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    Phone browsers can't wake a locked phone. The Rise In Harmony app wakes you with your chosen healing frequency reliably, even with the screen locked.
                  </div>
                  {IOS_APP_LIVE ? (
                    <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="btn-teal inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold">
                      <Smartphone size={12} /> Get the iOS App
                    </a>
                  ) : (
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', color: '#00D4AA' }}>The mobile app is in final testing — coming soon to iPhone and Android.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {mobilePlatform === null && isSupported && !isGranted && (
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.1)' }}>
              <div className="flex items-start gap-3">
                <BellRing size={16} style={{ color: '#00D4AA', flexShrink: 0, marginTop: '1px' }} />
                <div className="flex-1">
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: '#00D4AA', marginBottom: '0.35rem' }}>Enable Alarm Notifications</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', color: 'rgba(139,163,191,0.6)', lineHeight: 1.5, marginBottom: '0.75rem' }}>Allow browser notifications so your healing alarms fire even when the app is in the background.</div>
                  <button onClick={requestPermission} className="btn-teal px-4 py-2 text-xs font-semibold flex items-center gap-1.5">
                    <Bell size={12} /> Enable Notifications
                  </button>
                </div>
              </div>
            </div>
          )}

          {mobilePlatform === null && isGranted && (
            <div className="p-3 rounded-2xl flex items-center gap-2.5" style={{ background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.08)' }}>
              <ShieldCheck size={13} style={{ color: '#00D4AA', flexShrink: 0 }} />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', color: 'rgba(139,163,191,0.5)' }}>Browser notifications active — alarms will fire even when the app is minimized.</span>
            </div>
          )}

          <div className="p-4 rounded-2xl" style={{ background: 'rgba(242,201,76,0.04)', border: '1px solid rgba(242,201,76,0.1)' }}>
            <div className="flex items-start gap-3">
              <AlarmClock size={16} style={{ color: '#F2C94C', flexShrink: 0, marginTop: '1px' }} />
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: '#F2C94C', marginBottom: '0.35rem' }}>Native App Alarms</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', color: 'rgba(139,163,191,0.5)', lineHeight: 1.5 }}>The mobile app schedules alarms through the system notification service for exact delivery, even with the screen locked. Web alarms use browser notifications and require this tab to stay open.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom padding for nav */}
        <div className="h-8" />
      </div>

      {showCreate && (
        <AlarmEditorSheet onClose={() => setShowCreate(false)} onSave={saveAlarm} prefill={prefill} isPremium={isPremium} onPremiumNeeded={() => setShowAlarmPaywall(true)} />
      )}

      {editingAlarm && (
        <AlarmEditorSheet onClose={() => setEditingAlarm(null)} onSave={saveEditedAlarm} onDelete={deleteAlarmById} editingAlarm={editingAlarm} isPremium={isPremium} onPremiumNeeded={() => setShowAlarmPaywall(true)} />
      )}

      {showAlarmPaywall && (
        <PremiumPaywall triggerFrequencyName="Unlimited alarms are a Premium feature" onClose={() => setShowAlarmPaywall(false)} />
      )}

      {firingAlarm && (() => {
        const sound = isGentleReentry ? buildGroundingSound() : buildRingingSound(firingAlarm);
        const freq = FREQUENCIES.find(f => f.id === (isGentleReentry ? GROUNDING_FREQ_ID : firingAlarm.frequencyId));
        const soundName = isGentleReentry
          ? `174Hz — Gentle Re-entry`
          : (firingAlarm.studioMixName ?? freq?.name ?? 'Healing Frequency');
        const snoozeCount = snoozeCountRef.current[firingAlarm.id] ?? 0;
        const snoozeLabel = isGentleReentry
          ? undefined
          : `Snooze ${SNOOZE_MINUTES} min${snoozeCount > 0 ? ` (${MAX_SNOOZES - snoozeCount} left)` : ''}`;
        return (
          <AlarmRinging
            label={firingAlarm.label}
            soundName={soundName}
            sound={sound}
            fadeInMinutes={firingAlarm.fadeInMinutes}
            sleepProfile={firingAlarm.sleepProfile ?? "normal"}
            snoozeCount={snoozeCount}
            maxSnoozes={MAX_SNOOZES}
            sequenceId={firingAlarm.sequenceId}
            onStop={handleStop}
            onSnooze={isGentleReentry ? handleStop : handleSnooze}
            missionEnabled={true}
          />
        );
      })()}
    </Layout>
  );
}
