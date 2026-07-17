/**
 * TrueHz Convert — upload a track, retune by concert-pitch ratio, download.
 * Companion product: does NOT claim TrueHz exact-Hz accuracy on mixed music.
 * Phase 2: hybrid TrueHz bed, formant preserve, A/B preview.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Download,
  Info,
  Loader2,
  Music2,
  Pause,
  Play,
  Trash2,
  Upload,
} from "lucide-react";
import Layout from "@/components/Layout";
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

export default function Convert() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [sourceA, setSourceA] = useState(440);
  const [targetA, setTargetA] = useState(432);
  const [quality, setQuality] = useState<"standard" | "high">("standard");
  const [formantPreserve, setFormantPreserve] = useState(false);
  const [hybridEnabled, setHybridEnabled] = useState(false);
  const [hybridHz, setHybridHz] = useState(528);
  const [hybridGainDb, setHybridGainDb] = useState(-18);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Local original for A/B without re-fetch */
  const [localOriginalUrl, setLocalOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [abSide, setAbSide] = useState<"original" | "converted">("converted");
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
  const deleteJob = trpc.convert.delete.useMutation({
    onSuccess: () => void listQuery.refetch(),
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
      const ratio = targetA / sourceA;
      return formatCents(1200 * Math.log2(ratio));
    } catch {
      return "—";
    }
  }, [sourceA, targetA]);

  // Load result URL when job completes
  useEffect(() => {
    let cancelled = false;
    async function loadResult() {
      if (!jobQuery.data || jobQuery.data.status !== "completed") {
        setResultUrl(null);
        return;
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
    return () => {
      if (localOriginalUrl) URL.revokeObjectURL(localOriginalUrl);
    };
  }, [localOriginalUrl]);

  const activeSrc =
    abSide === "original" ? localOriginalUrl : resultUrl;

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
      void el.play().then(() => setPlaying(true)).catch(() => {
        toast.error("Playback failed");
      });
    }
  };

  const onFile = useCallback(
    async (file: File | null) => {
      if (!file || !isAuthenticated) return;
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
      try {
        const uploaded = await uploadConvertSource(file, setUploadPct);
        const job = await createJob.mutateAsync({
          sourceKey: uploaded.key,
          sourceFilename: uploaded.filename,
          sourcePitchA: sourceA,
          targetPitchA: targetA,
          quality: isPremium ? quality : "standard",
          formantPreserve: isPremium && formantPreserve,
          hybridEnabled: isPremium && hybridEnabled,
          hybridHz: isPremium && hybridEnabled ? hybridHz : undefined,
          hybridGainDb: hybridGainDb,
        });
        setActiveJobId(job.id);
        toast.success("Job queued — retuning…");
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
      statusQuery.data?.enabled,
      createJob,
      sourceA,
      targetA,
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
              Retune your own tracks by concert-pitch ratio (e.g. A=440 → A=432).
              Optional TrueHz™ pure-tone bed is the only layer claimed exact.
            </p>
          </div>
        </div>

        <div
          className={`rounded-xl p-4 mb-6 flex gap-3 text-sm ${c.card}`}
          style={{ borderColor: "rgba(0,212,170,0.25)" }}
        >
          <Info
            size={18}
            className="shrink-0 mt-0.5"
            style={{ color: c.accent }}
          />
          <p className={c.muted}>
            Pitch-shifting is not TrueHz live synthesis. For exact pure tones use{" "}
            <Link
              href="/studio"
              className="underline"
              style={{ color: c.accent }}
            >
              Precision Studio
            </Link>
            . Current shift: <strong className={c.text}>{centsLabel}</strong>.
          </p>
        </div>

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
                {(targetA / sourceA).toFixed(6)}
              </p>

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
                        Keeps vocal/instrument timbre more natural when shifting
                        pitch (Rubber Band −F).
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
                        Mix an exact sine under the track. Only this layer is
                        TrueHz-verified (±0.05 Hz).
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
                          <label className={`text-xs ${c.muted}`}>
                            Bed Hz
                          </label>
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
                <p className={`text-xs ${c.muted}`}>
                  Premium unlocks high quality, formant preserve, TrueHz bed, and
                  WAV download.
                </p>
              )}

              <label
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 cursor-pointer transition-opacity ${
                  busy ? "opacity-60 pointer-events-none" : "hover:opacity-90"
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
                    : "Drop or choose audio"}
                </span>
                <span className={`text-xs ${c.muted}`}>
                  MP3 / WAV / FLAC / M4A · free max{" "}
                  {Math.round(
                    (statusQuery.data?.limits.maxDurationSec ?? 300) / 60,
                  )}{" "}
                  min
                </span>
                <input
                  type="file"
                  accept=".mp3,.wav,.flac,.m4a,.ogg,audio/*"
                  className="hidden"
                  onChange={e => void onFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {/* Active job */}
            {jobQuery.data && (
              <div className={`rounded-2xl p-5 mb-6 ${c.card}`}>
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className={`font-medium text-sm ${c.text}`}>
                      {jobQuery.data.sourceFilename}
                    </p>
                    <p className={`text-xs mt-1 ${c.muted}`}>
                      {jobQuery.data.status} · {jobQuery.data.stage} ·{" "}
                      {jobQuery.data.progressPct}%
                    </p>
                    <p className={`text-xs mt-1 ${c.muted}`}>
                      {jobQuery.data.sourcePitchA} → {jobQuery.data.targetPitchA}{" "}
                      Hz · {formatCents(jobQuery.data.cents)}
                      {jobQuery.data.hybridEnabled && jobQuery.data.hybridHz
                        ? ` · TrueHz bed ${jobQuery.data.hybridHz} Hz`
                        : ""}
                      {jobQuery.data.formantPreserve ? " · formant" : ""}
                    </p>
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
                    {/* A/B preview */}
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
                      {jobQuery.data.hasWav && (
                        <button
                          type="button"
                          onClick={() =>
                            void download(jobQuery.data!.id, "wav")
                          }
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border ${c.text}`}
                        >
                          <Download size={14} /> WAV
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

            {/* Library */}
            <h2 className={`text-sm font-semibold mb-3 ${c.text}`}>
              Your jobs
            </h2>
            {!listQuery.data?.length ? (
              <p className={`text-sm ${c.muted}`}>No conversions yet.</p>
            ) : (
              <ul className="space-y-2">
                {listQuery.data.map(job => (
                  <li
                    key={job.id}
                    className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${c.card}`}
                  >
                    <button
                      type="button"
                      className="text-left min-w-0 flex-1"
                      onClick={() => setActiveJobId(job.id)}
                    >
                      <p className={`text-sm truncate ${c.text}`}>
                        {job.sourceFilename}
                      </p>
                      <p className={`text-xs ${c.muted}`}>
                        {job.status} · {job.sourcePitchA}→{job.targetPitchA} ·{" "}
                        {formatCents(job.cents)}
                        {job.hybridEnabled && job.hybridHz
                          ? ` · bed ${job.hybridHz}`
                          : ""}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
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
                Signed in as {user.email ?? user.name ?? "member"}. You certify
                you have rights to process uploaded files.
              </p>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
