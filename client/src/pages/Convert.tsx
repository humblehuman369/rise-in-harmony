/**
 * TrueHz Convert — upload, retune by concert-pitch ratio, download.
 * Phase 3: paywall, analytics, expiry, rename, rights attestation, A/B.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  Download,
  Info,
  Loader2,
  Music2,
  Pause,
  Pencil,
  Play,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import Layout from "@/components/Layout";
import PremiumPaywall from "@/components/PremiumPaywall";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  isAcceptedConvertFile,
  uploadConvertSource,
} from "@/lib/convertUpload";
import { formatCents } from "@rih/shared-utils";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import {
  trackConvertDownload,
  trackConvertJobCompleted,
  trackConvertJobCreated,
  trackConvertJobFailed,
  trackConvertPageViewed,
  trackConvertPaywallViewed,
  trackConvertUploadCompleted,
  trackConvertUploadStarted,
} from "@/hooks/useAnalytics";

const PRESETS: { label: string; sourceA: number; targetA: number }[] = [
  { label: "A=440 → A=432 (Natural Harmony)", sourceA: 440, targetA: 432 },
  { label: "A=440 → A=444", sourceA: 440, targetA: 444 },
  { label: "A=432 → A=440", sourceA: 432, targetA: 440 },
];

const HYBRID_PRESETS = [
  { hz: 432, label: "432 Hz" },
  { hz: 528, label: "528 Hz Miracle" },
  { hz: 639, label: "639 Hz" },
  { hz: 741, label: "741 Hz" },
];

function formatExpiry(expiresAt: Date | string | null | undefined): string {
  if (!expiresAt) return "";
  const d = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  if (Number.isNaN(d.getTime())) return "";
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.ceil(ms / 86400000);
  if (days === 1) return "Expires tomorrow";
  if (days < 14) return `Expires in ${days} days`;
  return `Expires ${d.toLocaleDateString()}`;
}

export default function Convert() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [sourceA, setSourceA] = useState(440);
  const [targetA, setTargetA] = useState(432);
  /** Extra targets for batch pack (premium packs up to 5 total including primary). */
  const [batchTargets, setBatchTargets] = useState<number[]>([]);
  const [quality, setQuality] = useState<"standard" | "high">("standard");
  const [formantPreserve, setFormantPreserve] = useState(false);
  const [hybridEnabled, setHybridEnabled] = useState(false);
  const [hybridHz, setHybridHz] = useState(528);
  const [hybridGainDb, setHybridGainDb] = useState(-18);
  const [rightsOk, setRightsOk] = useState(false);
  const [detectNote, setDetectNote] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState<
    "hybrid" | "formant" | "quality" | "wav" | "upsell_banner"
  >("upsell_banner");
  const [localOriginalUrl, setLocalOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [abSide, setAbSide] = useState<"original" | "converted">("converted");
  const [playing, setPlaying] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackedComplete = useRef<Set<string>>(new Set());
  const trackedFail = useRef<Set<string>>(new Set());

  useEffect(() => {
    trackConvertPageViewed(
      new URLSearchParams(search).get("from") ?? "nav",
    );
  }, [search]);

  // Deep-link ?job= and billing return
  useEffect(() => {
    const params = new URLSearchParams(search);
    const job = params.get("job");
    if (job) setActiveJobId(job);
    if (params.get("billing") === "success") {
      toast.success("Premium unlocked — Convert Pro features are yours.");
    }
  }, [search]);

  const statusQuery = trpc.convert.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const listQuery = trpc.convert.list.useQuery(undefined, {
    enabled: isAuthenticated && statusQuery.data?.enabled !== false,
    refetchInterval: q => {
      const jobs = q.state.data;
      if (jobs?.some(j => j.status === "queued" || j.status === "processing")) {
        return 2000;
      }
      return false;
    },
  });
  const createJob = trpc.convert.createJob.useMutation();
  const createBatch = trpc.convert.createBatch.useMutation();
  const detectPitch = trpc.convert.detectPitch.useMutation();
  const deleteJob = trpc.convert.delete.useMutation({
    onSuccess: () => void listQuery.refetch(),
  });
  const renameJob = trpc.convert.rename.useMutation({
    onSuccess: () => {
      void listQuery.refetch();
      void utils.convert.get.invalidate();
      setRenamingId(null);
      toast.success("Renamed");
    },
  });
  const utils = trpc.useUtils();

  const jobQuery = trpc.convert.get.useQuery(
    { id: activeJobId! },
    {
      enabled: Boolean(activeJobId),
      refetchInterval: q => {
        const s = q.state.data?.status;
        if (s === "queued" || s === "processing") return 1500;
        return false;
      },
    },
  );

  const isPremium = statusQuery.data?.isPremium ?? false;
  const retentionDays = statusQuery.data?.limits.retentionDays ?? 7;

  const c = isLight
    ? {
        card: "bg-white border border-black/8",
        text: "text-[#1A1D2E]",
        muted: "text-[#6B7A99]",
        accent: "#007A62",
        input: "bg-[#F5F6F9] border border-black/10 text-[#1A1D2E]",
      }
    : {
        card: "bg-[#12152A] border border-white/8",
        text: "text-[#E8EDF5]",
        muted: "text-[#8B95A8]",
        accent: "#00D4AA",
        input: "bg-[#0B0D1A] border border-white/10 text-[#E8EDF5]",
      };

  const centsLabel = useMemo(() => {
    try {
      return formatCents(1200 * Math.log2(targetA / sourceA));
    } catch {
      return "—";
    }
  }, [sourceA, targetA]);

  const openPaywall = (
    trigger: "hybrid" | "formant" | "quality" | "wav" | "upsell_banner",
  ) => {
    setPaywallTrigger(trigger);
    trackConvertPaywallViewed(trigger);
    setShowPaywall(true);
  };

  useEffect(() => {
    let cancelled = false;
    async function loadResult() {
      if (!jobQuery.data || jobQuery.data.status !== "completed") {
        setResultUrl(null);
        return;
      }
      if (!trackedComplete.current.has(jobQuery.data.id)) {
        trackedComplete.current.add(jobQuery.data.id);
        trackConvertJobCompleted({
          processingMs: jobQuery.data.processingMs,
          algorithmVersion: jobQuery.data.algorithmVersion,
          hybrid: jobQuery.data.hybridEnabled,
        });
      }
      try {
        const fmt = jobQuery.data.hasMp3 ? "mp3" : "wav";
        if (!jobQuery.data.hasMp3 && !jobQuery.data.hasWav) return;
        const res = await utils.convert.getDownloadUrl.fetch({
          id: jobQuery.data.id,
          format: fmt as "mp3" | "wav",
        });
        if (!cancelled) setResultUrl(res.url);
      } catch {
        if (!cancelled) setResultUrl(null);
      }
    }
    void loadResult();
    return () => {
      cancelled = true;
    };
  }, [jobQuery.data, utils.convert.getDownloadUrl]);

  useEffect(() => {
    if (
      jobQuery.data?.status === "failed" &&
      !trackedFail.current.has(jobQuery.data.id)
    ) {
      trackedFail.current.add(jobQuery.data.id);
      trackConvertJobFailed(jobQuery.data.errorCode);
    }
  }, [jobQuery.data]);

  useEffect(() => {
    return () => {
      if (localOriginalUrl) URL.revokeObjectURL(localOriginalUrl);
    };
  }, [localOriginalUrl]);

  const activeSrc = abSide === "original" ? localOriginalUrl : resultUrl;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    setPlaying(false);
    if (activeSrc) {
      el.src = activeSrc;
      el.load();
    }
  }, [activeSrc]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el || !activeSrc) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el
        .play()
        .then(() => setPlaying(true))
        .catch(() => toast.error("Playback failed"));
    }
  };

  const onFile = useCallback(
    async (file: File | null) => {
      if (!file || !isAuthenticated) return;
      if (!rightsOk) {
        toast.error("Confirm you have rights to this file before uploading");
        return;
      }
      if (!isAcceptedConvertFile(file)) {
        toast.error("Use MP3, WAV, FLAC, M4A, or OGG");
        return;
      }
      if (!statusQuery.data?.enabled) {
        toast.error("Convert is temporarily unavailable");
        return;
      }
      setBusy(true);
      setUploadPct(0);
      if (localOriginalUrl) URL.revokeObjectURL(localOriginalUrl);
      setLocalOriginalUrl(URL.createObjectURL(file));
      setResultUrl(null);
      setAbSide("converted");
      const ext = file.name.split(".").pop()?.toLowerCase();
      trackConvertUploadStarted({ bytes: file.size, format: ext });
      try {
        const uploaded = await uploadConvertSource(file, setUploadPct);
        trackConvertUploadCompleted({
          bytes: uploaded.bytes,
          format: uploaded.format,
        });

        // Experimental pitch detect — suggest only; user-selected sourceA wins unless empty
        let effectiveSourceA = sourceA;
        try {
          const det = await detectPitch.mutateAsync({
            sourceKey: uploaded.key,
          });
          if (det.confidence >= 0.35) {
            setDetectNote(
              `Detected ~${det.dominantHz} Hz → suggested source A=${det.suggestedSourceA} (confidence ${Math.round(det.confidence * 100)}%). Using your selected source A=${sourceA} for this job. ${det.note}`,
            );
          } else {
            setDetectNote(det.note);
          }
        } catch {
          setDetectNote(null);
        }

        const targets = Array.from(
          new Set([targetA, ...batchTargets].map(Number)),
        ).filter(t => t >= 400 && t <= 480);
        const shared = {
          sourceKey: uploaded.key,
          sourceFilename: uploaded.filename,
          sourcePitchA: effectiveSourceA,
          quality: (isPremium ? quality : "standard") as "standard" | "high",
          formantPreserve: isPremium && formantPreserve,
          hybridEnabled: isPremium && hybridEnabled,
          hybridHz: isPremium && hybridEnabled ? hybridHz : undefined,
          hybridGainDb,
        };

        if (targets.length > 1) {
          const { jobs } = await createBatch.mutateAsync({
            ...shared,
            targetPitchAs: targets,
          });
          for (const j of jobs) {
            trackConvertJobCreated({
              sourceA: effectiveSourceA,
              targetA: j.targetPitchA,
              hybrid: isPremium && hybridEnabled,
              formant: isPremium && formantPreserve,
              quality: shared.quality,
            });
          }
          setActiveJobId(jobs[0]?.id ?? null);
          toast.success(
            `${jobs.length} jobs queued — we'll email when each is ready.`,
          );
        } else {
          const job = await createJob.mutateAsync({
            ...shared,
            targetPitchA: targets[0] ?? targetA,
          });
          trackConvertJobCreated({
            sourceA: effectiveSourceA,
            targetA: targets[0] ?? targetA,
            hybrid: isPremium && hybridEnabled,
            formant: isPremium && formantPreserve,
            quality: shared.quality,
          });
          setActiveJobId(job.id);
          toast.success("Job queued — we'll email you when it's ready.");
        }
        void utils.convert.list.invalidate();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Convert failed";
        toast.error(msg);
      } finally {
        setBusy(false);
        setUploadPct(null);
      }
    },
    [
      isAuthenticated,
      rightsOk,
      statusQuery.data?.enabled,
      createJob,
      createBatch,
      detectPitch,
      sourceA,
      targetA,
      batchTargets,
      quality,
      formantPreserve,
      hybridEnabled,
      hybridHz,
      hybridGainDb,
      isPremium,
      localOriginalUrl,
      utils.convert.list,
    ],
  );

  const download = async (id: string, format: "mp3" | "wav") => {
    try {
      const res = await utils.convert.getDownloadUrl.fetch({ id, format });
      trackConvertDownload(format);
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Download unavailable");
    }
  };

  useEffect(() => {
    if (jobQuery.data?.status === "completed") {
      void utils.convert.list.invalidate();
    }
  }, [jobQuery.data?.status, utils.convert.list]);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <button
          type="button"
          onClick={() => navigate("/technology")}
          className={`flex items-center gap-2 text-sm mb-6 ${c.muted} hover:opacity-80`}
        >
          <ArrowLeft size={16} /> Technology
        </button>

        <div className="flex items-start gap-3 mb-2">
          <Music2 size={28} style={{ color: c.accent }} />
          <div>
            <h1
              className={`text-2xl font-bold ${c.text}`}
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              TrueHz Convert
            </h1>
            <p className={`text-sm mt-1 ${c.muted}`}>
              Retune your tracks by concert-pitch ratio. Optional TrueHz™
              pure-tone bed is the only layer claimed mathematically exact.
            </p>
          </div>
        </div>

        <div
          className={`rounded-xl p-4 mb-4 flex gap-3 text-sm ${c.card}`}
          style={{ borderColor: "rgba(0,212,170,0.25)" }}
        >
          <Info
            size={18}
            className="shrink-0 mt-0.5"
            style={{ color: c.accent }}
          />
          <div className={c.muted}>
            <p>
              <strong className={c.text}>What Convert does:</strong> shifts the
              whole file by a documented ratio (currently{" "}
              <strong className={c.text}>{centsLabel}</strong>).
            </p>
            <p className="mt-2">
              <strong className={c.text}>What it does not do:</strong> claim
              your MP3 is pure 528.00 Hz throughout. For exact pure tones use{" "}
              <Link
                href="/studio"
                className="underline"
                style={{ color: c.accent }}
              >
                Precision Studio
              </Link>
              .
            </p>
          </div>
        </div>

        {!isPremium && isAuthenticated && (
          <button
            type="button"
            onClick={() => openPaywall("upsell_banner")}
            className={`w-full rounded-xl p-4 mb-6 text-left flex items-center gap-3 ${c.card}`}
            style={{ borderColor: "rgba(139,92,246,0.35)" }}
          >
            <Sparkles size={20} style={{ color: "#8B5CF6" }} />
            <div>
              <p className={`text-sm font-semibold ${c.text}`}>
                Unlock Convert Pro with Premium
              </p>
              <p className={`text-xs ${c.muted}`}>
                TrueHz bed · formant preserve · high quality · WAV ·{" "}
                {statusQuery.data?.limits
                  ? `${Math.round(CONVERT_PAID_MIN / 60)} min files`
                  : "longer files"}
              </p>
            </div>
          </button>
        )}

        {!isAuthenticated ? (
          <div className={`rounded-2xl p-8 text-center ${c.card}`}>
            <p className={`mb-4 ${c.muted}`}>
              Sign in to upload and retune tracks.
            </p>
            <a
              href={getLoginUrl()}
              className="inline-block px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: c.accent, color: "#04120E" }}
            >
              Sign in
            </a>
          </div>
        ) : (
          <>
            <div className={`rounded-2xl p-6 mb-6 space-y-5 ${c.card}`}>
              <div>
                <label
                  className={`text-xs font-medium uppercase tracking-wide ${c.muted}`}
                >
                  Retune preset
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PRESETS.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setSourceA(p.sourceA);
                        setTargetA(p.targetA);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs border transition-colors"
                      style={{
                        borderColor:
                          sourceA === p.sourceA && targetA === p.targetA
                            ? c.accent
                            : "rgba(128,128,128,0.25)",
                        color:
                          sourceA === p.sourceA && targetA === p.targetA
                            ? c.accent
                            : undefined,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs ${c.muted}`}>Source A (Hz)</label>
                  <input
                    type="number"
                    min={400}
                    max={480}
                    step={0.01}
                    value={sourceA}
                    onChange={e => setSourceA(Number(e.target.value))}
                    className={`mt-1 w-full rounded-lg px-3 py-2 text-sm ${c.input}`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${c.muted}`}>Target A (Hz)</label>
                  <input
                    type="number"
                    min={400}
                    max={480}
                    step={0.01}
                    value={targetA}
                    onChange={e => setTargetA(Number(e.target.value))}
                    className={`mt-1 w-full rounded-lg px-3 py-2 text-sm ${c.input}`}
                  />
                </div>
              </div>

              <p className={`text-xs ${c.muted}`}>
                Shift: <strong className={c.text}>{centsLabel}</strong> · ratio{" "}
                {(targetA / sourceA).toFixed(6)} · library keeps files{" "}
                <strong className={c.text}>{retentionDays} days</strong>
              </p>

              {detectNote && (
                <p className={`text-xs rounded-lg px-3 py-2 ${c.muted}`} style={{ background: "rgba(139,92,246,0.08)" }}>
                  Experimental pitch detect: {detectNote}
                </p>
              )}

              <div>
                <label className={`text-xs ${c.muted}`}>
                  Batch pack — also retune to (optional)
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[432, 440, 444].map(hz => {
                    const on = batchTargets.includes(hz) || targetA === hz;
                    return (
                      <button
                        key={hz}
                        type="button"
                        onClick={() => {
                          if (targetA === hz) return;
                          setBatchTargets(prev =>
                            prev.includes(hz)
                              ? prev.filter(x => x !== hz)
                              : [...prev, hz],
                          );
                        }}
                        className="px-2.5 py-1 rounded-md text-xs border"
                        style={{
                          borderColor: on ? c.accent : "rgba(128,128,128,0.25)",
                          color: on ? c.accent : undefined,
                        }}
                      >
                        A={hz}
                      </button>
                    );
                  })}
                </div>
                <p className={`text-[10px] mt-1 ${c.muted}`}>
                  Free: up to 2 targets · Premium: up to 5. Upload creates one job per target.
                </p>
              </div>

              {isPremium ? (
                <div className="space-y-4 pt-2 border-t border-white/10">
                  <div>
                    <label className={`text-xs ${c.muted}`}>Quality</label>
                    <select
                      value={quality}
                      onChange={e =>
                        setQuality(e.target.value as "standard" | "high")
                      }
                      className={`mt-1 w-full rounded-lg px-3 py-2 text-sm ${c.input}`}
                    >
                      <option value="standard">Standard</option>
                      <option value="high">High (R3 engine, slower)</option>
                    </select>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formantPreserve}
                      onChange={e => setFormantPreserve(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className={`text-sm font-medium ${c.text}`}>
                        Formant preserve
                      </span>
                      <span className={`block text-xs ${c.muted}`}>
                        Keeps vocal/instrument timbre more natural when shifting.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hybridEnabled}
                      onChange={e => setHybridEnabled(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className={`text-sm font-medium ${c.text}`}>
                        TrueHz™ pure-tone bed
                      </span>
                      <span className={`block text-xs ${c.muted}`}>
                        Mix an exact sine under the track (±0.05 Hz verified).
                      </span>
                    </span>
                  </label>

                  {hybridEnabled && (
                    <div className="pl-6 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {HYBRID_PRESETS.map(p => (
                          <button
                            key={p.hz}
                            type="button"
                            onClick={() => setHybridHz(p.hz)}
                            className="px-2.5 py-1 rounded-md text-xs border"
                            style={{
                              borderColor:
                                hybridHz === p.hz
                                  ? c.accent
                                  : "rgba(128,128,128,0.25)",
                              color: hybridHz === p.hz ? c.accent : undefined,
                            }}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs ${c.muted}`}>Bed Hz</label>
                          <input
                            type="number"
                            min={1}
                            max={22000}
                            step={0.01}
                            value={hybridHz}
                            onChange={e => setHybridHz(Number(e.target.value))}
                            className={`mt-1 w-full rounded-lg px-3 py-2 text-sm ${c.input}`}
                          />
                        </div>
                        <div>
                          <label className={`text-xs ${c.muted}`}>
                            Bed level (dB)
                          </label>
                          <input
                            type="number"
                            min={-48}
                            max={0}
                            step={1}
                            value={hybridGainDb}
                            onChange={e =>
                              setHybridGainDb(Number(e.target.value))
                            }
                            className={`mt-1 w-full rounded-lg px-3 py-2 text-sm ${c.input}`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                  {(
                    [
                      ["quality", "High quality"],
                      ["formant", "Formant preserve"],
                      ["hybrid", "TrueHz bed"],
                      ["wav", "WAV export"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => openPaywall(key)}
                      className="px-3 py-1.5 rounded-lg text-xs border"
                      style={{ borderColor: "rgba(139,92,246,0.4)", color: "#A78BFA" }}
                    >
                      {label} · Premium
                    </button>
                  ))}
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rightsOk}
                  onChange={e => setRightsOk(e.target.checked)}
                  className="mt-1"
                />
                <span className={`text-xs ${c.muted}`}>
                  I certify I own or have the right to process this audio. I will
                  not upload material that infringes copyright.
                </span>
              </label>

              <label
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 cursor-pointer transition-opacity ${
                  busy || !rightsOk
                    ? "opacity-60 pointer-events-none"
                    : "hover:opacity-90"
                }`}
                style={{ borderColor: "rgba(0,212,170,0.35)" }}
              >
                {busy ? (
                  <Loader2
                    className="animate-spin"
                    style={{ color: c.accent }}
                  />
                ) : (
                  <Upload style={{ color: c.accent }} />
                )}
                <span className={`text-sm font-medium ${c.text}`}>
                  {uploadPct != null
                    ? `Uploading… ${uploadPct}%`
                    : rightsOk
                      ? "Drop or choose audio"
                      : "Accept rights checkbox first"}
                </span>
                <span className={`text-xs ${c.muted}`}>
                  MP3 / WAV / FLAC / M4A · free max{" "}
                  {Math.round(
                    (statusQuery.data?.limits.maxFileBytes ?? 25 * 1024 * 1024) /
                      (1024 * 1024),
                  )}{" "}
                  MB /{" "}
                  {Math.round(
                    (statusQuery.data?.limits.maxDurationSec ?? 300) / 60,
                  )}{" "}
                  min · {retentionDays}-day library · direct cloud upload
                </span>
                <input
                  type="file"
                  accept=".mp3,.wav,.flac,.m4a,.ogg,.aac,.mp4,.mkv,.mov,.avi,.webm,audio/*,video/*"
                  className="hidden"
                  disabled={!rightsOk}
                  onChange={e => void onFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {jobQuery.data && (
              <div className={`rounded-2xl p-5 mb-6 ${c.card}`}>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className={`font-medium text-sm truncate ${c.text}`}>
                      {jobQuery.data.sourceFilename}
                    </p>
                    <p className={`text-xs mt-1 ${c.muted}`}>
                      {jobQuery.data.status} · {jobQuery.data.stage} ·{" "}
                      {jobQuery.data.progressPct}%
                    </p>
                    <p className={`text-xs mt-1 ${c.muted}`}>
                      {jobQuery.data.sourcePitchA} →{" "}
                      {jobQuery.data.targetPitchA} Hz ·{" "}
                      {formatCents(jobQuery.data.cents)}
                      {jobQuery.data.hybridEnabled && jobQuery.data.hybridHz
                        ? ` · TrueHz bed ${jobQuery.data.hybridHz} Hz`
                        : ""}
                    </p>
                    {jobQuery.data.expiresAt && (
                      <p className={`text-xs mt-1 ${c.muted}`}>
                        {formatExpiry(jobQuery.data.expiresAt)}
                      </p>
                    )}
                  </div>
                  {(jobQuery.data.status === "queued" ||
                    jobQuery.data.status === "processing") && (
                    <Loader2
                      className="animate-spin shrink-0"
                      size={18}
                      style={{ color: c.accent }}
                    />
                  )}
                </div>
                <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 mt-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${jobQuery.data.progressPct}%`,
                      background: c.accent,
                    }}
                  />
                </div>
                {jobQuery.data.status === "failed" && (
                  <p className="text-xs text-red-400 mt-3">
                    {jobQuery.data.errorCode}: {jobQuery.data.errorMessage}
                  </p>
                )}
                {jobQuery.data.status === "completed" && (
                  <>
                    {(localOriginalUrl || resultUrl) && (
                      <div className="mt-4 p-3 rounded-xl border border-white/10 space-y-3">
                        <p className={`text-xs font-medium ${c.text}`}>
                          A/B preview
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={!localOriginalUrl}
                            onClick={() => setAbSide("original")}
                            className="flex-1 py-2 rounded-lg text-xs font-medium border"
                            style={{
                              borderColor:
                                abSide === "original"
                                  ? c.accent
                                  : "rgba(128,128,128,0.25)",
                              color:
                                abSide === "original" ? c.accent : undefined,
                              opacity: localOriginalUrl ? 1 : 0.4,
                            }}
                          >
                            Original
                          </button>
                          <button
                            type="button"
                            disabled={!resultUrl}
                            onClick={() => setAbSide("converted")}
                            className="flex-1 py-2 rounded-lg text-xs font-medium border"
                            style={{
                              borderColor:
                                abSide === "converted"
                                  ? c.accent
                                  : "rgba(128,128,128,0.25)",
                              color:
                                abSide === "converted" ? c.accent : undefined,
                              opacity: resultUrl ? 1 : 0.4,
                            }}
                          >
                            Converted
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={togglePlay}
                          disabled={!activeSrc}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
                          style={{
                            background: c.accent,
                            color: "#04120E",
                            opacity: activeSrc ? 1 : 0.5,
                          }}
                        >
                          {playing ? <Pause size={16} /> : <Play size={16} />}
                          {playing ? "Pause" : `Play ${abSide}`}
                        </button>
                        <audio
                          ref={audioRef}
                          onEnded={() => setPlaying(false)}
                          onPause={() => setPlaying(false)}
                          className="hidden"
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-4">
                      {jobQuery.data.hasMp3 && (
                        <button
                          type="button"
                          onClick={() =>
                            void download(jobQuery.data!.id, "mp3")
                          }
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                          style={{ background: c.accent, color: "#04120E" }}
                        >
                          <Download size={14} /> MP3
                        </button>
                      )}
                      {jobQuery.data.hasWav ? (
                        <button
                          type="button"
                          onClick={() =>
                            void download(jobQuery.data!.id, "wav")
                          }
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border ${c.text}`}
                        >
                          <Download size={14} /> WAV
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openPaywall("wav")}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border"
                          style={{
                            borderColor: "rgba(139,92,246,0.4)",
                            color: "#A78BFA",
                          }}
                        >
                          <Download size={14} /> WAV · Premium
                        </button>
                      )}
                    </div>
                    {jobQuery.data.algorithmVersion && (
                      <p className={`text-[10px] mt-2 ${c.muted}`}>
                        Engine: {jobQuery.data.algorithmVersion}
                        {jobQuery.data.processingMs != null
                          ? ` · ${jobQuery.data.processingMs} ms`
                          : ""}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <h2 className={`text-sm font-semibold mb-3 ${c.text}`}>
              Your library
            </h2>
            <p className={`text-xs mb-3 ${c.muted}`}>
              Free: {retentionDays}-day retention · Premium: up to 90 days.
              Expired jobs are marked and may be removed.
            </p>
            {!listQuery.data?.length ? (
              <p className={`text-sm ${c.muted}`}>No conversions yet.</p>
            ) : (
              <ul className="space-y-2">
                {listQuery.data.map(job => (
                  <li
                    key={job.id}
                    className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${c.card}`}
                  >
                    {renamingId === job.id ? (
                      <form
                        className="flex-1 flex gap-2"
                        onSubmit={e => {
                          e.preventDefault();
                          if (renameValue.trim()) {
                            renameJob.mutate({
                              id: job.id,
                              name: renameValue.trim(),
                            });
                          }
                        }}
                      >
                        <input
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          className={`flex-1 rounded-lg px-2 py-1 text-sm ${c.input}`}
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="text-xs font-medium"
                          style={{ color: c.accent }}
                        >
                          Save
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="text-left min-w-0 flex-1"
                        onClick={() => setActiveJobId(job.id)}
                      >
                        <p className={`text-sm truncate ${c.text}`}>
                          {job.sourceFilename}
                        </p>
                        <p className={`text-xs ${c.muted}`}>
                          {job.status === "expired" ? "expired" : job.status} ·{" "}
                          {job.sourcePitchA}→{job.targetPitchA}
                          {job.expiresAt
                            ? ` · ${formatExpiry(job.expiresAt)}`
                            : ""}
                        </p>
                      </button>
                    )}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        aria-label="Rename"
                        onClick={() => {
                          setRenamingId(job.id);
                          setRenameValue(job.sourceFilename);
                        }}
                        className="p-2 rounded-lg hover:bg-white/5"
                      >
                        <Pencil size={14} className={c.muted} />
                      </button>
                      {job.status === "completed" && job.hasMp3 && (
                        <button
                          type="button"
                          aria-label="Download MP3"
                          onClick={() => void download(job.id, "mp3")}
                          className="p-2 rounded-lg hover:bg-white/5"
                        >
                          <Download size={16} style={{ color: c.accent }} />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Delete job"
                        onClick={() =>
                          deleteJob.mutate(
                            { id: job.id },
                            {
                              onSuccess: () => {
                                if (activeJobId === job.id) setActiveJobId(null);
                                toast.success("Deleted");
                              },
                            },
                          )
                        }
                        className="p-2 rounded-lg hover:bg-white/5"
                      >
                        <Trash2 size={16} className={c.muted} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {user && (
              <p className={`text-xs mt-8 ${c.muted}`}>
                Signed in as {user.email ?? user.name ?? "member"}. Wellness tool
                only — not a medical device.
              </p>
            )}
          </>
        )}
      </div>

      {showPaywall && (
        <PremiumPaywall
          triggerFrequencyName="TrueHz Convert Pro"
          onClose={() => setShowPaywall(false)}
          successPath="/convert?billing=success"
          cancelPath="/convert?billing=cancelled"
        />
      )}
    </Layout>
  );
}

/** Paid max duration minutes for upsell copy */
const CONVERT_PAID_MIN = 30 * 60;
