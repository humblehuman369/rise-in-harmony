/**
 * Dashboard — Rise In Harmony Wellness Analytics
 * Streak tracking, session history, frequency usage, mood trends
 * Bioluminescent Depth theme
 */
import { useState } from "react";
import { Flame, Clock, Waves, TrendingUp, Calendar, Award, BarChart3, Target } from "lucide-react";
import Layout from "@/components/Layout";
import { FREQUENCIES } from "@/hooks/useFrequencyPlayer";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Mock data for demo
const WEEKLY_SESSIONS = [
  { day: "Mon", minutes: 12, sessions: 2 },
  { day: "Tue", minutes: 8, sessions: 1 },
  { day: "Wed", minutes: 20, sessions: 3 },
  { day: "Thu", minutes: 15, sessions: 2 },
  { day: "Fri", minutes: 25, sessions: 4 },
  { day: "Sat", minutes: 18, sessions: 2 },
  { day: "Sun", minutes: 30, sessions: 3 },
];

const MOOD_DATA = [
  { day: "Mon", mood: 6 },
  { day: "Tue", mood: 7 },
  { day: "Wed", mood: 8 },
  { day: "Thu", mood: 7 },
  { day: "Fri", mood: 9 },
  { day: "Sat", mood: 8 },
  { day: "Sun", mood: 9 },
];

const RECENT_SESSIONS = [
  { freq: "432hz", duration: 12, time: "Today, 6:30 AM", mood: "Calm" },
  { freq: "528hz", duration: 8, time: "Yesterday, 6:45 AM", mood: "Energized" },
  { freq: "binaural-alpha", duration: 20, time: "2 days ago, 7:00 AM", mood: "Focused" },
  { freq: "396hz", duration: 5, time: "3 days ago, 6:30 AM", mood: "Grounded" },
];

const FREQ_USAGE = [
  { id: "432hz", sessions: 18, minutes: 216 },
  { id: "528hz", sessions: 12, minutes: 96 },
  { id: "binaural-alpha", sessions: 8, minutes: 160 },
  { id: "396hz", sessions: 5, minutes: 25 },
];

const STREAK_DAYS = [true, true, true, true, true, true, false, true, true, true, true, true, true, true, false, false, true, true, true, true, true, true, true, true, true, true, true, true];

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

  const totalMinutes = WEEKLY_SESSIONS.reduce((s, d) => s + d.minutes, 0);
  const totalSessions = WEEKLY_SESSIONS.reduce((s, d) => s + d.sessions, 0);

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
          <StatCard icon={Flame} label="Current Streak" value="7 days" sub="🔥 Personal best!" color="#F59E0B" />
          <StatCard icon={Clock} label="This Week" value={`${totalMinutes}m`} sub={`${totalSessions} sessions`} color="#00D4AA" />
          <StatCard icon={Waves} label="Total Sessions" value="43" sub="Since joining" color="#8B5CF6" />
          <StatCard icon={Award} label="Harmony Score" value="87" sub="↑ 12 this week" color="#3B82F6" />
        </div>

        {/* Streak calendar */}
        <div className="mx-6 mb-6 glow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
              Streak Calendar
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#F59E0B', fontFamily: 'DM Sans, sans-serif' }}>
              <Flame size={14} />
              7 day streak
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STREAK_DAYS.map((active, i) => (
              <div key={i} className="w-7 h-7 rounded-md"
                style={{
                  background: active ? 'rgba(0,212,170,0.25)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? 'rgba(0,212,170,0.4)' : 'rgba(255,255,255,0.06)'}`,
                }} />
            ))}
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
            <BarChart data={MOOD_DATA} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: '#6B7A99', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#6B7A99', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#12152A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E8EDF5', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="mood" radius={[4, 4, 0, 0]}>
                {MOOD_DATA.map((entry, index) => (
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
              Top Frequencies
            </div>
          </div>
          <div className="space-y-3">
            {FREQ_USAGE.map((usage, i) => {
              const freq = FREQUENCIES.find(f => f.id === usage.id);
              if (!freq) return null;
              const maxSessions = Math.max(...FREQ_USAGE.map(u => u.sessions));
              return (
                <div key={usage.id} className="flex items-center gap-3">
                  <div className="w-5 text-xs font-mono-brand" style={{ color: '#4A5568' }}>{i + 1}</div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${freq.color}15`, border: `1px solid ${freq.color}25` }}>
                    <span className="font-mono-brand text-[10px] font-bold" style={{ color: freq.color }}>{freq.hz}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>{freq.name}</span>
                      <span className="text-xs" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>{usage.sessions} sessions</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(usage.sessions / maxSessions) * 100}%`, background: freq.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent sessions */}
        <div className="mx-6 mb-8 glow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} style={{ color: '#F59E0B' }} />
            <div className="text-sm font-semibold" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
              Recent Sessions
            </div>
          </div>
          <div className="space-y-3">
            {RECENT_SESSIONS.map((session, i) => {
              const freq = FREQUENCIES.find(f => f.id === session.freq);
              if (!freq) return null;
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${freq.color}15` }}>
                    <span className="font-mono-brand text-[9px] font-bold" style={{ color: freq.color }}>{freq.hz}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
                      {freq.name} — {session.duration}min
                    </div>
                    <div className="text-[10px]" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>{session.time}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,212,170,0.1)', color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
                    {session.mood}
                  </span>
                </div>
              );
            })}
          </div>
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
