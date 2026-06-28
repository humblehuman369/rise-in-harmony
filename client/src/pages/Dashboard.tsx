/**
 * Dashboard — Rise In Harmony Wellness Analytics
 * Streak tracking, session history, frequency usage, mood trends
 * Bioluminescent Depth theme
 */
import { useState, useMemo } from "react";
import { Flame, Clock, Waves, TrendingUp, Calendar, Award, BarChart3, Target, BookOpen } from "lucide-react";
import Layout from "@/components/Layout";
import { FREQUENCIES } from "@/hooks/useFrequencyPlayer";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { loadJournalEntries } from "@/components/SessionJournal";

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

  // Load real journal entries
  const journalEntries = useMemo(() => loadJournalEntries(), []);
  const hasRealData = journalEntries.length > 0;

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
  const currentStreak = hasRealData
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
          <StatCard icon={Flame} label="Current Streak" value={`${currentStreak} days`} sub={currentStreak >= 7 ? "🔥 Personal best!" : "Keep going!"} color="#F59E0B" />
          <StatCard icon={Clock} label="This Week" value={`${totalMinutes}m`} sub={`${totalSessions} sessions`} color="#00D4AA" />
          <StatCard icon={Waves} label="Total Sessions" value={hasRealData ? journalEntries.length : 43} sub="Since joining" color="#8B5CF6" />
          <StatCard icon={BookOpen} label="Journal Entries" value={journalEntries.length} sub={hasRealData ? "Real data" : "Start a session!"} color="#3B82F6" />
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
