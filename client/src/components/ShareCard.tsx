/**
 * ShareCard — Frequency Session Share Card
 *
 * Renders a canvas-based shareable card with the frequency, session duration,
 * waveform visualization, and Rise In Harmony branding. Exports as PNG for
 * Instagram Stories, TikTok, or Twitter/X.
 *
 * Bioluminescent Depth theme.
 */
import { useRef, useCallback, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { toast } from "sonner";

interface ShareCardProps {
  hz: number;
  name: string;
  durationSeconds: number;
  color?: string;
  onClose: () => void;
}

const CARD_W = 1080;
const CARD_H = 1920; // 9:16 portrait for Stories

function drawCard(
  canvas: HTMLCanvasElement,
  hz: number,
  name: string,
  durationSeconds: number,
  color: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width  = CARD_W;
  canvas.height = CARD_H;

  // ── Background ──────────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0, "#0A0B14");
  bg.addColorStop(0.5, "#0D1020");
  bg.addColorStop(1, "#0A0B14");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // ── Ambient glow ────────────────────────────────────────────────────────────
  const glow = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.45, 0, CARD_W / 2, CARD_H * 0.45, CARD_W * 0.7);
  glow.addColorStop(0, `${color}22`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // ── Sine wave decoration ─────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = `${color}30`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= CARD_W; x += 2) {
    const y = CARD_H * 0.45 + Math.sin((x / CARD_W) * Math.PI * 8) * 80;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // ── Frequency orb ───────────────────────────────────────────────────────────
  const orbX = CARD_W / 2;
  const orbY = CARD_H * 0.42;
  const orbR = 220;

  const orbGlow = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbR * 1.6);
  orbGlow.addColorStop(0, `${color}40`);
  orbGlow.addColorStop(0.5, `${color}15`);
  orbGlow.addColorStop(1, "transparent");
  ctx.fillStyle = orbGlow;
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR * 1.6, 0, Math.PI * 2);
  ctx.fill();

  const orbFill = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbR);
  orbFill.addColorStop(0, `${color}35`);
  orbFill.addColorStop(1, `${color}08`);
  ctx.fillStyle = orbFill;
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `${color}60`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
  ctx.stroke();

  // ── Hz number ───────────────────────────────────────────────────────────────
  ctx.fillStyle = color;
  ctx.font = "bold 160px 'DM Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${hz}`, orbX, orbY - 20);

  ctx.fillStyle = `${color}CC`;
  ctx.font = "500 60px 'DM Sans', sans-serif";
  ctx.fillText("Hz", orbX, orbY + 80);

  // ── Frequency name ───────────────────────────────────────────────────────────
  ctx.fillStyle = "#E8EDF5";
  ctx.font = "600 72px 'Cormorant Garamond', serif";
  ctx.textAlign = "center";
  ctx.fillText(name, CARD_W / 2, CARD_H * 0.62);

  // ── Session duration ─────────────────────────────────────────────────────────
  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  const durationStr = mins > 0 ? `${mins}m ${secs}s session` : `${secs}s session`;
  ctx.fillStyle = "#6B7A99";
  ctx.font = "400 48px 'DM Sans', sans-serif";
  ctx.fillText(durationStr, CARD_W / 2, CARD_H * 0.68);

  // ── Divider ──────────────────────────────────────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CARD_W * 0.2, CARD_H * 0.73);
  ctx.lineTo(CARD_W * 0.8, CARD_H * 0.73);
  ctx.stroke();

  // ── Tagline ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = "#4A5568";
  ctx.font = "400 40px 'DM Sans', sans-serif";
  ctx.fillText("TrueHz™ Precision Synthesis", CARD_W / 2, CARD_H * 0.77);

  // ── Branding ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = "#00D4AA";
  ctx.font = "600 52px 'DM Sans', sans-serif";
  ctx.fillText("✦ Rise In Harmony", CARD_W / 2, CARD_H * 0.88);

  ctx.fillStyle = "#4A5568";
  ctx.font = "400 38px 'DM Sans', sans-serif";
  ctx.fillText("riseinharmony.com", CARD_W / 2, CARD_H * 0.92);
}

export default function ShareCard({ hz, name, durationSeconds, color = "#00D4AA", onClose }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  const renderCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCard(canvas, hz, name, durationSeconds, color);
    setRendered(true);
  }, [hz, name, durationSeconds, color]);

  // Render on mount
  const mountRef = useCallback((el: HTMLCanvasElement | null) => {
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = el;
    if (el) {
      drawCard(el, hz, name, durationSeconds, color);
      setRendered(true);
    }
  }, [hz, name, durationSeconds, color]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `rih-${hz}hz-${name.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Frequency card downloaded!");
  }, [hz, name]);

  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `rih-${hz}hz.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: `${hz} Hz · ${name} — Rise In Harmony`,
            text: `I just completed a ${Math.floor(durationSeconds / 60)}m ${hz}Hz ${name} healing session. ✦`,
            files: [file],
          });
        } catch {
          handleDownload();
        }
      } else {
        handleDownload();
      }
    }, "image/png");
  }, [hz, name, durationSeconds, handleDownload]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: "#0D0F1E", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-semibold" style={{ color: "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}>Share Your Session</div>
            <div className="text-xs" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>Download or share to Stories</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
            <X size={14} style={{ color: "#6B7A99" }} />
          </button>
        </div>

        {/* Canvas preview — scaled down */}
        <div className="px-5 pb-4">
          <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: "9/16", background: "#0A0B14" }}>
            <canvas
              ref={mountRef}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-6 flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
          >
            <Download size={15} />
            Save PNG
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #00D4AA, #0EA5E9)", color: "#0A0B14", fontFamily: "DM Sans, sans-serif" }}
          >
            <Share2 size={15} />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
