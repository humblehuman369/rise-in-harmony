/**
 * Programs — structured multi-day rituals (Phase 2).
 * Days 1–7 free on most programs; day 8+ may require Premium.
 */
import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Check,
  Lock,
  Play,
  Loader2,
  CalendarRange,
  Sparkles,
} from "lucide-react";
import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import PremiumPaywall from "@/components/PremiumPaywall";
import { getLoginUrl } from "@/const";

export default function Programs() {
  const { isAuthenticated } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const subStatus = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const isPremium = Boolean(subStatus.data?.isPremium);

  const catalogQuery = trpc.programs.catalog.useQuery();
  const detailQuery = trpc.programs.get.useQuery(
    { programId: selectedId! },
    { enabled: Boolean(selectedId) }
  );
  const myQuery = trpc.programs.myPrograms.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const todayQuery = trpc.programs.today.useQuery(
    { programId: selectedId! },
    { enabled: isAuthenticated && Boolean(selectedId) }
  );

  const utils = trpc.useUtils();
  const enrollMutation = trpc.programs.enroll.useMutation({
    onSuccess: () => {
      toast.success("You're enrolled — day 1 is ready");
      utils.programs.myPrograms.invalidate();
      utils.programs.today.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const completeMutation = trpc.programs.completeDay.useMutation({
    onSuccess: data => {
      if (data.programComplete) {
        toast.success("Program complete — beautiful work");
      } else if (data.nextDayPremium) {
        toast.success(`Day done! Day ${data.nextDay} is Premium`);
      } else {
        toast.success("Day complete");
      }
      utils.programs.myPrograms.invalidate();
      utils.programs.today.invalidate();
      utils.programs.get.invalidate();
    },
    onError: e => {
      if (e.message === "PREMIUM_REQUIRED") {
        setShowPaywall(true);
      } else {
        toast.error(e.message);
      }
    },
  });
  const abandonMutation = trpc.programs.abandon.useMutation({
    onSuccess: () => {
      toast.success("Program paused");
      utils.programs.myPrograms.invalidate();
      utils.programs.today.invalidate();
    },
  });

  const enrolledIds = new Set(
    (myQuery.data ?? []).map(m => m.enrollment.programId)
  );

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selectedId && detailQuery.data) {
    const program = detailQuery.data;
    const today = todayQuery.data;
    const completed = new Set(today?.completedDays ?? []);
    const isEnrolled = enrolledIds.has(program.id) || Boolean(today?.enrollment);

    return (
      <Layout>
        <div className="min-h-screen" style={{ background: "#0A0B14" }}>
          <div className="px-6 pt-8 pb-16 max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-2 text-sm mb-6"
              style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}
            >
              <ArrowLeft size={14} /> All programs
            </button>

            <div className="flex items-start gap-4 mb-6">
              <div className="text-4xl">{program.icon}</div>
              <div>
                <h1
                  style={{
                    fontFamily: "Cormorant Garamond, serif",
                    fontSize: "1.85rem",
                    fontWeight: 600,
                    color: "#E8EDF5",
                  }}
                >
                  {program.name}
                </h1>
                <p className="text-sm mt-1" style={{ color: "#8FA3BF" }}>
                  {program.tagline}
                </p>
                <p className="text-xs mt-2" style={{ color: "#6B7A99" }}>
                  {program.totalDays} days · first {program.freeDays} free
                </p>
              </div>
            </div>

            <p
              className="text-sm leading-relaxed mb-6"
              style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}
            >
              {program.description}
            </p>

            {!isAuthenticated ? (
              <a
                href={getLoginUrl()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: program.accentColor, color: "#0A0B14" }}
              >
                Sign in to enroll
              </a>
            ) : !isEnrolled ? (
              <button
                type="button"
                onClick={() => enrollMutation.mutate({ programId: program.id })}
                disabled={enrollMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: program.accentColor, color: "#0A0B14" }}
              >
                {enrollMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                Start program
              </button>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  disabled={
                    completeMutation.isPending ||
                    today?.allComplete ||
                    today?.locked
                  }
                  onClick={() => {
                    if (today?.locked) {
                      setShowPaywall(true);
                      return;
                    }
                    if (!today?.day) return;
                    completeMutation.mutate({
                      programId: program.id,
                      dayNumber: today.day.day,
                    });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50"
                  style={{ background: program.accentColor, color: "#0A0B14" }}
                >
                  {today?.locked ? (
                    <>
                      <Lock size={14} /> Unlock day {today.day.day}
                    </>
                  ) : today?.allComplete ? (
                    <>
                      <Check size={14} /> Complete
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Complete day {today?.day.day}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Pause this program?")) {
                      abandonMutation.mutate({ programId: program.id });
                    }
                  }}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold"
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#6B7A99",
                  }}
                >
                  Pause
                </button>
                {today?.day && !today.locked && (
                  <Link
                    href={
                      today.day.activityType === "studio"
                        ? "/studio"
                        : today.day.activityType === "meditation"
                          ? "/meditation"
                          : `/player`
                    }
                  >
                    <a
                      className="px-4 py-2.5 rounded-full text-xs font-semibold"
                      style={{
                        border: `1px solid ${program.accentColor}55`,
                        color: program.accentColor,
                      }}
                    >
                      Open activity
                    </a>
                  </Link>
                )}
              </div>
            )}

            {today?.day && isEnrolled && (
              <div
                className="rounded-xl p-4 mb-6"
                style={{
                  background: `${program.accentColor}12`,
                  border: `1px solid ${program.accentColor}33`,
                }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: program.accentColor }}
                >
                  Today · Day {today.day.day}
                </div>
                <div className="text-base font-semibold mb-1" style={{ color: "#E8EDF5" }}>
                  {today.day.title}
                </div>
                <p className="text-sm mb-2" style={{ color: "#8FA3BF" }}>
                  {today.day.guidance}
                </p>
                <p className="text-xs italic" style={{ color: "#6B7A99" }}>
                  “{today.day.affirmation}”
                </p>
                <p className="text-[11px] mt-2" style={{ color: "#4A5568" }}>
                  ~{today.day.durationMinutes} min · {today.day.activityType}
                  {today.day.frequencyHz ? ` · ${today.day.frequencyHz} Hz` : ""}
                </p>
              </div>
            )}

            <div className="space-y-2">
              {program.days.map(d => {
                const done = completed.has(d.day);
                const locked = d.isPremium && !isPremium;
                return (
                  <div
                    key={d.day}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{
                      background: done
                        ? "rgba(0,212,170,0.06)"
                        : "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      opacity: locked && !done ? 0.65 : 1,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: done
                          ? "rgba(0,212,170,0.2)"
                          : "rgba(255,255,255,0.05)",
                        color: done ? "#00D4AA" : "#6B7A99",
                      }}
                    >
                      {done ? <Check size={14} /> : locked ? <Lock size={12} /> : d.day}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: "#E8EDF5" }}>
                        {d.title}
                      </div>
                      <div className="text-[11px]" style={{ color: "#6B7A99" }}>
                        {d.durationMinutes} min
                        {d.isPremium ? " · Premium" : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {showPaywall && (
          <PremiumPaywall onClose={() => setShowPaywall(false)} />
        )}
      </Layout>
    );
  }

  // ── Catalog ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="min-h-screen" style={{ background: "#0A0B14" }}>
        <div className="px-6 pt-8 pb-16 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <CalendarRange size={18} style={{ color: "#00D4AA" }} />
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}
            >
              Structured paths
            </span>
          </div>
          <h1
            className="mb-2"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "2rem",
              fontWeight: 600,
              color: "#E8EDF5",
            }}
          >
            Programs
          </h1>
          <p className="text-sm mb-8" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
            Multi-day rituals that close the loop between intention and practice.
            Descriptive guidance only — not medical advice.
          </p>

          {catalogQuery.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin" style={{ color: "#00D4AA" }} />
            </div>
          ) : (
            <div className="space-y-4">
              {(catalogQuery.data ?? []).map(p => {
                const mine = myQuery.data?.find(m => m.enrollment.programId === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className="w-full text-left glow-card p-5 transition-transform hover:scale-[1.01]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">{p.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h2
                            className="text-lg font-semibold"
                            style={{ color: "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}
                          >
                            {p.name}
                          </h2>
                          {mine && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: `${p.accentColor}22`,
                                color: p.accentColor,
                              }}
                            >
                              {mine.progressPct}%
                            </span>
                          )}
                        </div>
                        <p className="text-sm mb-2" style={{ color: "#8FA3BF" }}>
                          {p.tagline}
                        </p>
                        <div className="flex items-center gap-3 text-xs" style={{ color: "#6B7A99" }}>
                          <span>{p.totalDays} days</span>
                          <span>·</span>
                          <span>{p.freeDays} free</span>
                          {mine && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Sparkles size={11} /> Enrolled
                              </span>
                            </>
                          )}
                        </div>
                        {mine && (
                          <div
                            className="mt-3 h-1.5 rounded-full overflow-hidden"
                            style={{ background: "rgba(255,255,255,0.06)" }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${mine.progressPct}%`,
                                background: p.accentColor,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
