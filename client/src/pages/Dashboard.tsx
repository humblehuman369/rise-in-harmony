/**
 * Dashboard — Rise In Harmony Wellness Analytics
 * Streak tracking, session history, frequency usage, mood trends
 * Bioluminescent Depth theme
 */
import { useState, useMemo } from "react";
import { Flame, Clock, Waves, TrendingUp, Calendar, Award, BarChart3, Target, BookOpen, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { FREQUENCIES } from "@/hooks/useFrequencyPlayer";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { loadJournalEntries } from "@/components/SessionJournal";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Chakra Map ───────────────────────────────────────────────────────────────

const CHAKRA_NODES = [
  { position: 7, name: "Crown",       hz: 963, color: "#EC4899", yPct: 4,  label: "Sahasrāra" },
  { position: 6, name: "Third Eye",   hz: 852, color: "#A855F7", yPct: 17, label: "Ājñā" },
  { position: 5, name: "Throat",      hz: 741, color: "#8B5CF6", yPct: 30, label: "Viśuddha" },
  { position: 4, name: "Heart",       hz: 639, color: "#3B82F6", yPct: 44, label: "Anāhata" },
  { position: 3, name: "Solar Plexus",hz: 528, color: "#06B6D4", yPct: 57, label: "Maṇipūra" },
  { position: 2, name: "Sacral",      hz: 417, color: "#84CC16", yPct: 70, label: "Svādhiṣṭhāna" },
  { position: 1, name: "Root",        hz: 396, color: "#EAB308", yPct: 83, label: "Mūlādhāra" },
];

function ChakraMap({ playedHzThisWeek }: { playedHzThisWeek: Set<number> }) {
  const activeCount = CHAKRA_NODES.filter(n => playedHzThisWeek.has(n.hz)).length;

  return (
    <div className="mx-6 mb-6 glow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-base" style={{ color: '#8B5CF6' }}>✦</div>
          <div className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
            Chakra Map
          </div>
        </div>
        <div className="text-xs px-2.5 py-1 rounded-full"
          style={{
            background: activeCount > 0 ? 'rgba(0,212,170,0.1)' : 'rgba(255,255,255,0.04)',
            color: activeCount > 0 ? '#00D4AA' : '#4A5568',
            fontFamily: 'DM Sans, sans-serif',
          }}>
          {activeCount} / 7 this week
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Body silhouette + chakra dots */}
        <div className="relative flex-shrink-0" style={{ width: 80, height: 280 }}>
          {/* SVG body silhouette */}
          <svg viewBox="0 0 80 280" fill="none" xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 w-full h-full">
            {/* Head */}
            <ellipse cx="40" cy="22" rx="14" ry="16" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
            {/* Neck */}
            <rect x="35" y="37" width="10" height="10" rx="3" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
            {/* Torso */}
            <path d="M20 47 Q16 60 14 90 L14 170 Q14 178 22 180 L58 180 Q66 178 66 170 L66 90 Q64 60 60 47 Z"
              fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
            {/* Left arm */}
            <path d="M20 50 Q8 70 6 110 Q6 120 12 122 Q18 120 20 110 L22 70 Z"
              fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            {/* Right arm */}
            <path d="M60 50 Q72 70 74 110 Q74 120 68 122 Q62 120 60 110 L58 70 Z"
              fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            {/* Left leg */}
            <path d="M22 178 Q18 210 16 240 Q16 252 22 254 Q28 252 30 240 L34 178 Z"
              fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            {/* Right leg */}
            <path d="M58 178 Q62 210 64 240 Q64 252 58 254 Q52 252 50 240 L46 178 Z"
              fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            {/* Central energy channel (sushumna) */}
            <line x1="40" y1="6" x2="40" y2="240"
              stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 4"/>
          </svg>

          {/* Chakra dots */}
          {CHAKRA_NODES.map(node => {
            const active = playedHzThisWeek.has(node.hz);
            const y = (node.yPct / 100) * 280;
            return (
              <div key={node.hz}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: '50%', top: y }}
              >
                <div
                  className="rounded-full transition-all duration-700"
                  style={{
                    width: active ? 16 : 10,
                    height: active ? 16 : 10,
                    background: active ? node.color : 'rgba(255,255,255,0.08)',
                    border: `2px solid ${active ? node.color : 'rgba(255,255,255,0.12)'}`,
                    boxShadow: active ? `0 0 12px ${node.color}80, 0 0 24px ${node.color}40` : 'none',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {CHAKRA_NODES.map(node => {
            const active = playedHzThisWeek.has(node.hz);
            return (
              <div key={node.hz} className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-500"
                  style={{
                    background: active ? node.color : 'rgba(255,255,255,0.08)',
                    boxShadow: active ? `0 0 6px ${node.color}80` : 'none',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium" style={{ color: active ? '#E8EDF5' : '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
                      {node.name}
                    </span>
                    <span className="text-[10px] font-mono-brand" style={{ color: active ? node.color : '#2D3748' }}>
                      {node.hz}Hz
                    </span>
                  </div>
                  <div className="text-[9px]" style={{ color: active ? `${node.color}80` : '#2D3748', fontFamily: 'DM Sans, sans-serif' }}>
                    {node.label}
                  </div>
                </div>
                {active && (
                  <div className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: `${node.color}15`, color: node.color, fontFamily: 'DM Sans, sans-serif' }}>
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {activeCount === 0 && (
        <div className="mt-4 text-xs text-center" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
          Play chakra frequencies this week to light up your energy map.
        </div>
      )}
      {activeCount === 7 && (
        <div className="mt-4 text-xs text-center px-3 py-2 rounded-lg"
          style={{ background: 'rgba(0,212,170,0.08)', color: '#00D4AA', fontFamily: 'DM Sans, sans-serif', border: '1px solid rgba(0,212,170,0.2)' }}>
          ✦ Full chakra alignment achieved this week
        </div>
      )}

      {/* Weekly balance insight */}
      <ChakraBalanceInsight playedHzThisWeek={playedHzThisWeek} />
    </div>
  );
}

// ─── Chakra Balance Insight ───────────────────────────────────────────────────

const LOWER_CHAKRAS = [396, 417, 528];
const UPPER_CHAKRAS = [741, 852, 963];
const HEART_HZ = 639;

function buildInsight(played: Set<number>): { text: string; suggestion: string; color: string } | null {
  if (played.size === 0) return null;

  const lowerPlayed = LOWER_CHAKRAS.filter(hz => played.has(hz));
  const upperPlayed = UPPER_CHAKRAS.filter(hz => played.has(hz));
  const heartPlayed = played.has(HEART_HZ);

  if (played.size === 7) {
    return {
      text: "You explored all seven energy centers this week — a complete Root-to-Crown journey.",
      suggestion: "Try the 7-Chakra Journey for a guided sequence that deepens the alignment.",
      color: '#00D4AA',
    };
  }

  if (lowerPlayed.length >= 2 && upperPlayed.length === 0) {
    return {
      text: "You focused on grounding and lower-chakra work this week — a strong foundation.",
      suggestion: "Consider adding Throat (741Hz), Third Eye (852Hz), or Crown (963Hz) to open your upper energy centers.",
      color: '#8B5CF6',
    };
  }

  if (upperPlayed.length >= 2 && lowerPlayed.length === 0) {
    return {
      text: "Your upper chakras received attention this week — intuition and consciousness are active.",
      suggestion: "Balance with Root (396Hz) or Sacral (417Hz) to ground your expanded awareness.",
      color: '#EAB308',
    };
  }

  if (!heartPlayed && played.size >= 2) {
    return {
      text: "You've been working with multiple frequencies, but the Heart chakra hasn't been visited yet.",
      suggestion: "Add 639Hz (Anāhata) to bridge your lower and upper energy centers with compassion.",
      color: '#3B82F6',
    };
  }

  if (played.size <= 2) {
    const names = Array.from(played).map(hz => {
      const node = CHAKRA_NODES.find(n => n.hz === hz);
      return node ? `${node.name} (${hz}Hz)` : `${hz}Hz`;
    });
    return {
      text: `You explored ${names.join(' and ')} this week.`,
      suggestion: `Expand your practice to ${7 - played.size} more chakra frequencies for a fuller energetic balance.`,
      color: '#06B6D4',
    };
  }

  return {
    text: `You activated ${played.size} of 7 chakra energy centers this week — good progress.`,
    suggestion: `${7 - played.size} chakra${7 - played.size !== 1 ? 's' : ''} remain. Explore the full spectrum for complete alignment.`,
    color: '#00D4AA',
  };
}

function ChakraBalanceInsight({ playedHzThisWeek }: { playedHzThisWeek: Set<number> }) {
  const insight = buildInsight(playedHzThisWeek);
  if (!insight) return null;

  return (
    <div className="mt-4 p-4 rounded-xl"
      style={{
        background: `${insight.color}08`,
        border: `1px solid ${insight.color}20`,
      }}>
      <div className="flex items-start gap-2.5">
        <div className="text-sm mt-0.5" style={{ color: insight.color }}>✦</div>
        <div>
          <p className="text-xs leading-relaxed mb-1" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
            {insight.text}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: insight.color, fontFamily: 'DM Sans, sans-serif' }}>
            {insight.suggestion}
          </p>
        </div>
      </div>
    </div>
  );
}

// Fallback demo data (shown when no journal entries exist yet)
const DEMO_WEEKLY_SESSIONS = [
  { day: "Mon", minutes: 12, sessions: 2 },
  { day: "Tue", minutes: 8, sessions: 1 },
  { day: "Wed", minutes: 20, sessions: 3 },
  { day: "Thu", minutes: 15, sessions: 2 },
  { day: "Fri", minutes: 25, sessions: 4 },
  { day: "Sat", minutes: 18, sessions: 2 },
  { day: "Sun", minutes: 30, sessions: 3 },
];

const MOOD_LABELS: Record<number, string> = { 1: "Difficult", 2: "Low", 3: "Neutral", 4: "Good", 5: "Radiant" };
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="glow-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold font-mono-brand mb-0.5" style={{ color: '#E8EDF5' }}>{value}</div>
      <div className="text-xs font-medium" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>{label}</div>
      {sub && <div className="text-xs mt-1" style={{ color: color, fontFamily: 'DM Sans, sans-serif' }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-3 py-2 rounded-lg text-xs"
        style={{ background: '#12152A', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ color: '#6B7A99' }}>{label}</div>
        <div style={{ color: '#00D4AA' }}>{payload[0].value} min</div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"week" | "month">("week");
  const { isAuthenticated } = useAuth();

  // Server stats (when logged in)
  const { data: serverStats, isLoading: statsLoading } = trpc.sessions.stats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Load local journal entries as fallback
  const journalEntries = useMemo(() => loadJournalEntries(), []);
  const hasRealData = isAuthenticated
    ? (serverStats?.totalSessions ?? 0) > 0
    : journalEntries.length > 0;

  // Build mood chart from journal (last 7 days)
  const moodData = useMemo(() => {
    const now = Date.now();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * 86400000);
      return { day: DAY_NAMES[d.getDay()], date: d.toDateString(), moods: [] as number[] };
    });
    journalEntries.forEach(e => {
      const d = new Date(e.timestamp).toDateString();
      const slot = days.find(day => day.date === d);
      if (slot) slot.moods.push(e.mood);
    });
    return days.map(d => ({
      day: d.day,
      mood: d.moods.length ? Math.round((d.moods.reduce((a, b) => a + b, 0) / d.moods.length) * 2) : 0,
    }));
  }, [journalEntries]);

  // Build frequency usage from journal
  const freqUsage = useMemo(() => {
    const map: Record<number, { sessions: number; minutes: number }> = {};
    journalEntries.forEach(e => {
      if (!map[e.frequencyHz]) map[e.frequencyHz] = { sessions: 0, minutes: 0 };
      map[e.frequencyHz].sessions++;
      map[e.frequencyHz].minutes += e.durationMinutes;
    });
    return Object.entries(map)
      .map(([hz, v]) => ({ hz: Number(hz), ...v }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 4);
  }, [journalEntries]);

  // Recent sessions from journal
  const recentSessions = useMemo(() => journalEntries.slice(0, 5), [journalEntries]);

  const WEEKLY_SESSIONS = hasRealData
    ? (() => {
        const now = Date.now();
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now - (6 - i) * 86400000);
          const dayStr = d.toDateString();
          const entries = journalEntries.filter(e => new Date(e.timestamp).toDateString() === dayStr);
          return {
            day: DAY_NAMES[d.getDay()],
            minutes: entries.reduce((s, e) => s + e.durationMinutes, 0),
            sessions: entries.length,
          };
        });
      })()
    : DEMO_WEEKLY_SESSIONS;

  const totalMinutes = WEEKLY_SESSIONS.reduce((s, d) => s + d.minutes, 0);
  const totalSessions = WEEKLY_SESSIONS.reduce((s, d) => s + d.sessions, 0);
  // Use server-side streak when authenticated, fall back to local calculation
  const currentStreak = isAuthenticated
    ? (serverStats?.currentStreak ?? 0)
    : hasRealData
      ? (() => {
          let streak = 0;
          const now = Date.now();
          for (let i = 0; i < 30; i++) {
            const d = new Date(now - i * 86400000).toDateString();
            if (journalEntries.some(e => new Date(e.timestamp).toDateString() === d)) streak++;
            else break;
          }
          return streak;
        })()
      : 7;

  // Determine which chakra Hz values were played this week (last 7 days)
  const playedChakraHzThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const played = new Set<number>();
    journalEntries.forEach(e => {
      if (e.timestamp >= weekAgo) played.add(e.frequencyHz);
    });
    return played;
  }, [journalEntries]);

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: '#0A0B14' }}>
        {/* Header */}
        <div className="px-6 pt-8 pb-6">
          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            Wellness Analytics
          </div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 600, color: '#E8EDF5' }}>
            Your Journey
          </h1>
        </div>

        {/* Stats grid */}
        <div className="px-6 mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            <div className="col-span-4 flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin" style={{ color: '#00D4AA' }} />
            </div>
          ) : (
            <>
              <StatCard icon={Flame} label="Current Streak" value={`${currentStreak} days`} sub={currentStreak >= 7 ? "🔥 Personal best!" : "Keep going!"} color="#F59E0B" />
              <StatCard icon={Clock} label="This Week" value={`${totalMinutes}m`} sub={`${totalSessions} sessions`} color="#00D4AA" />
              <StatCard icon={Waves} label="Total Sessions" value={isAuthenticated ? (serverStats?.totalSessions ?? 0) : (hasRealData ? journalEntries.length : 43)} sub={isAuthenticated ? `${serverStats?.totalMinutes ?? 0} total minutes` : "Since joining"} color="#8B5CF6" />
              <StatCard icon={BookOpen} label="Avg Mood" value={isAuthenticated ? (serverStats?.avgMoodRating ? serverStats.avgMoodRating.toFixed(1) : '—') : journalEntries.length} sub={isAuthenticated ? "From journal entries" : (hasRealData ? "Real data" : "Start a session!")} color="#3B82F6" />
            </>
          )}
        </div>

        {/* Streak calendar */}
        <div className="mx-6 mb-6 glow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
              Streak Calendar
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#F59E0B', fontFamily: 'DM Sans, sans-serif' }}>
              <Flame size={14} />
              {currentStreak} day streak
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 28 }, (_, i) => {
              const d = new Date(Date.now() - (27 - i) * 86400000).toDateString();
              const active = hasRealData
                ? journalEntries.some((e: { timestamp: number }) => new Date(e.timestamp).toDateString() === d)
                : [0,1,2,3,4,5,7,8,9,10,11,12,13,16,17,18,19,20,21,22,23,24,25,26,27].includes(i);
              return (
                <div key={i} className="w-7 h-7 rounded-md"
                  style={{
                    background: active ? 'rgba(0,212,170,0.25)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? 'rgba(0,212,170,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  }} />
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(0,212,170,0.25)', border: '1px solid rgba(0,212,170,0.4)' }} />
              Session completed
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
              No session
            </div>
          </div>
        </div>

        {/* Session chart */}
        <div className="mx-6 mb-6 glow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
              Session Minutes
            </div>
            <div className="flex gap-1">
              {(['week', 'month'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                  style={{
                    background: activeTab === t ? 'rgba(0,212,170,0.15)' : 'rgba(255,255,255,0.04)',
                    color: activeTab === t ? '#00D4AA' : '#6B7A99',
                    fontFamily: 'DM Sans, sans-serif',
                  }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={WEEKLY_SESSIONS} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#6B7A99', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7A99', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="minutes" stroke="#00D4AA" strokeWidth={2} fill="url(#tealGrad)" dot={false} activeDot={{ r: 4, fill: '#00D4AA' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Mood trend */}
        <div className="mx-6 mb-6 glow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} style={{ color: '#8B5CF6' }} />
            <div className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
              Mood Trend
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={moodData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: '#6B7A99', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#6B7A99', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#12152A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E8EDF5', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="mood" radius={[4, 4, 0, 0]}>
                {moodData.map((entry, index) => (
                  <Cell key={index} fill={entry.mood >= 8 ? '#00D4AA' : entry.mood >= 6 ? '#8B5CF6' : '#6B7A99'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top frequencies */}
        <div className="mx-6 mb-6 glow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} style={{ color: '#00D4AA' }} />
            <div className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
              Top Frequencies {hasRealData && <span className="text-xs ml-1" style={{ color: '#00D4AA' }}>(from your sessions)</span>}
            </div>
          </div>
          {hasRealData && freqUsage.length > 0 ? (
            <div className="space-y-3">
              {freqUsage.map((usage, i) => {
                const freq = FREQUENCIES.find(f => f.hz === usage.hz);
                const color = freq?.color || '#6B7A99';
                const maxSessions = Math.max(...freqUsage.map(u => u.sessions));
                return (
                  <div key={usage.hz} className="flex items-center gap-3">
                    <div className="w-5 text-xs font-mono-brand" style={{ color: '#4A5568' }}>{i + 1}</div>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                      <span className="font-mono-brand text-[10px] font-bold" style={{ color }}>{usage.hz}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>{freq?.name || `${usage.hz}Hz`}</span>
                        <span className="text-xs" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>{usage.sessions} sessions</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(usage.sessions / maxSessions) * 100}%`, background: color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>Complete sessions in the Sound Studio to see your top frequencies here.</p>
          )}
        </div>

        {/* Recent sessions */}
        <div className="mx-6 mb-8 glow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} style={{ color: '#F59E0B' }} />
            <div className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
              Recent Sessions {hasRealData && <span className="text-xs ml-1" style={{ color: '#00D4AA' }}>(from journal)</span>}
            </div>
          </div>
          {hasRealData && recentSessions.length > 0 ? (
            <div className="space-y-3">
              {recentSessions.map((entry, i) => {
                const freq = FREQUENCIES.find(f => f.hz === entry.frequencyHz);
                const color = freq?.color || '#6B7A99';
                const relTime = (() => {
                  const diff = Date.now() - entry.timestamp;
                  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
                  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
                  return `${Math.round(diff / 86400000)}d ago`;
                })();
                return (
                  <div key={entry.id} className="flex items-center gap-3 py-2 border-b last:border-0"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}15` }}>
                      <span className="font-mono-brand text-[9px] font-bold" style={{ color }}>{entry.frequencyHz}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                        {entry.frequencyName} — {entry.durationMinutes}min
                      </div>
                      <div className="text-[10px]" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>{relTime}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,212,170,0.1)', color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
                      {MOOD_LABELS[entry.mood] || 'Good'}
                    </span>
                    {entry.note && (
                      <div className="text-[10px] max-w-[80px] truncate" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }} title={entry.note}>
                        "{entry.note}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>Your session journal is empty. Play a frequency in the Sound Studio and log your mood to see entries here.</p>
          )}
        </div>

        {/* Chakra Map */}
        <ChakraMap playedHzThisWeek={playedChakraHzThisWeek} />

        {/* Goals section */}
        <div className="mx-6 mb-8 glow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} style={{ color: '#3B82F6' }} />
            <div className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
              Weekly Goals
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: "Morning sessions", current: 5, target: 7, color: '#00D4AA' },
              { label: "Total minutes", current: totalMinutes, target: 150, color: '#8B5CF6' },
              { label: "Streak days", current: 7, target: 14, color: '#F59E0B' },
            ].map(goal => (
              <div key={goal.label}>
                <div className="flex justify-between text-xs mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  <span style={{ color: '#8FA3BF' }}>{goal.label}</span>
                  <span style={{ color: goal.color }}>{goal.current} / {goal.target}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((goal.current / goal.target) * 100, 100)}%`,
                      background: `linear-gradient(90deg, ${goal.color}, ${goal.color}CC)`,
                    }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
