/**
 * Your Resonance — descriptive insights card for Dashboard.
 * Copy is observational only (logged moods / minutes) — no medical claims.
 */
import { Sparkles, Clock, TrendingUp, Moon, Loader2, Snowflake } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";

const BUCKET_LABEL: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

export default function ResonanceInsights() {
  const { isAuthenticated } = useAuth();
  const insightsQuery = trpc.insights.weekly.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const freezeMutation = trpc.insights.useStreakFreeze.useMutation({
    onSuccess: data => {
      if (data.success) {
        toast.success(`Streak freeze saved · ${data.remaining} remaining this month`);
        insightsQuery.refetch();
      } else {
        toast.error(data.message || "No freezes available");
      }
    },
    onError: e => toast.error(e.message),
  });

  if (!isAuthenticated) {
    return (
      <div className="mx-6 mb-6 glow-card p-5">
        <div className="text-sm" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
          Sign in to unlock Your Resonance insights from logged sessions.
        </div>
      </div>
    );
  }

  if (insightsQuery.isLoading) {
    return (
      <div className="mx-6 mb-6 glow-card p-8 flex justify-center">
        <Loader2 className="animate-spin" size={22} style={{ color: "#00D4AA" }} />
      </div>
    );
  }

  const data = insightsQuery.data;
  if (!data) return null;

  return (
    <div className="mx-6 mb-6 glow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: "#00D4AA" }} />
          <div className="text-sm font-semibold" style={{ color: "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}>
            Your Resonance
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
          <span className="flex items-center gap-1">
            <Snowflake size={12} style={{ color: "#60A5FA" }} />
            {data.streakFreezesRemaining} freeze{data.streakFreezesRemaining === 1 ? "" : "s"}
          </span>
          <span>{data.currentStreak}d streak</span>
        </div>
      </div>

      {!data.ready ? (
        <div
          className="rounded-xl p-4 mb-3"
          style={{ background: "rgba(0,212,170,0.06)", border: "1px solid rgba(0,212,170,0.15)" }}
        >
          <div className="text-sm font-medium mb-1" style={{ color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}>
            Insights unlock with a little more data
          </div>
          <ul className="space-y-1">
            {data.coaching.map((line, i) => (
              <li key={i} className="text-xs leading-relaxed" style={{ color: "#8FA3BF" }}>
                · {line}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase tracking-wider" style={{ color: "#6B7A99" }}>
              <Clock size={11} /> This week
            </div>
            <div className="text-xl font-bold font-mono-brand" style={{ color: "#E8EDF5" }}>
              {data.minutesThisWeek}
              <span className="text-xs font-normal ml-1" style={{ color: "#6B7A99" }}>min</span>
            </div>
            {data.minutesTrendPct != null && (
              <div className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: data.minutesTrendPct >= 0 ? "#00D4AA" : "#F59E0B" }}>
                <TrendingUp size={11} />
                {data.minutesTrendPct >= 0 ? "+" : ""}
                {data.minutesTrendPct}% vs last week
              </div>
            )}
          </div>

          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#6B7A99" }}>
              Top logged mood tone
            </div>
            {data.topMoodFrequency ? (
              <>
                <div className="text-lg font-semibold" style={{ color: "#00D4AA" }}>
                  {data.topMoodFrequency.frequencyHz} Hz
                </div>
                <div className="text-[11px]" style={{ color: "#8FA3BF" }}>
                  avg mood {data.topMoodFrequency.avgMood}/5 · n={data.topMoodFrequency.sampleSize}
                </div>
              </>
            ) : (
              <div className="text-xs" style={{ color: "#6B7A99" }}>
                Log 3 moods to unlock
              </div>
            )}
          </div>

          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-1" style={{ color: "#6B7A99" }}>
              <Moon size={11} /> Best time (by mood)
            </div>
            {data.bestTimeOfDay ? (
              <>
                <div className="text-lg font-semibold" style={{ color: "#A78BFA" }}>
                  {BUCKET_LABEL[data.bestTimeOfDay.bucket] ?? data.bestTimeOfDay.bucket}
                </div>
                <div className="text-[11px]" style={{ color: "#8FA3BF" }}>
                  avg {data.bestTimeOfDay.avgMood}/5 · n={data.bestTimeOfDay.sampleSize}
                </div>
              </>
            ) : (
              <div className="text-xs" style={{ color: "#6B7A99" }}>
                Need a few mood logs at different times
              </div>
            )}
          </div>
        </div>
      )}

      {data.ready && data.coaching.length > 0 && (
        <div className="text-xs leading-relaxed mb-3 space-y-1" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
          {data.coaching.slice(0, 3).map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/programs">
          <a
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(0,212,170,0.12)",
              border: "1px solid rgba(0,212,170,0.3)",
              color: "#00D4AA",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Browse programs →
          </a>
        </Link>
        {data.isPremium && data.streakFreezesRemaining > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm("Use one streak freeze this month? (saved for when you need it)")) {
                freezeMutation.mutate();
              }
            }}
            disabled={freezeMutation.isPending}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(96,165,250,0.12)",
              border: "1px solid rgba(96,165,250,0.3)",
              color: "#60A5FA",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Confirm freeze inventory
          </button>
        )}
      </div>
      <p className="text-[10px] mt-3" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
        Insights describe your logged sessions only. Not medical advice.
      </p>
    </div>
  );
}
