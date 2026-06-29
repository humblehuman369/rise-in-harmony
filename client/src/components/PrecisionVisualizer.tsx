/**
 * PrecisionVisualizer — ResoNate SRS FR-030 + FR-031
 *
 * FR-030: Real-time oscilloscope waveform display of the generated audio signal
 * FR-031: Real-time FFT spectrum analyzer with dominant frequency peak + numerical readout
 *
 * Uses the AnalyserNode from usePrecisionPlayer for live data.
 */
import { useEffect, useRef, useState } from "react";

interface Props {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  targetHz: number;
  color?: string;
  mode?: "oscilloscope" | "spectrum" | "both";
}

export default function PrecisionVisualizer({
  analyserNode,
  isPlaying,
  targetHz,
  color = "#00D4AA",
  mode = "both",
}: Props) {
  const oscCanvasRef = useRef<HTMLCanvasElement>(null);
  const fftCanvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [measuredHz, setMeasuredHz] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<"good" | "warn" | "error" | null>(null);

  useEffect(() => {
    if (!analyserNode || !isPlaying) {
      cancelAnimationFrame(animRef.current);
      setMeasuredHz(null);
      setAccuracy(null);
      return;
    }

    const fftSize = analyserNode.fftSize;
    const bufLen = analyserNode.frequencyBinCount;
    const timeBuf = new Float32Array(fftSize);
    const freqBuf = new Float32Array(bufLen);

    const sampleRate = analyserNode.context.sampleRate;
    const binHz = sampleRate / fftSize;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);

      // ── Oscilloscope (FR-030) ────────────────────────────────────────────
      const oscCanvas = oscCanvasRef.current;
      if (oscCanvas && (mode === "oscilloscope" || mode === "both")) {
        analyserNode.getFloatTimeDomainData(timeBuf);
        const ctx = oscCanvas.getContext("2d");
        if (ctx) {
          const W = oscCanvas.width;
          const H = oscCanvas.height;
          ctx.clearRect(0, 0, W, H);

          // Background
          ctx.fillStyle = "rgba(10,11,20,0.6)";
          ctx.fillRect(0, 0, W, H);

          // Grid lines
          ctx.strokeStyle = "rgba(255,255,255,0.04)";
          ctx.lineWidth = 1;
          for (let g = 1; g < 4; g++) {
            const y = (H / 4) * g;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
          }
          for (let g = 1; g < 8; g++) {
            const x = (W / 8) * g;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
          }

          // Zero line
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

          // Waveform
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 6;
          ctx.shadowColor = color;
          ctx.beginPath();
          const sliceW = W / fftSize;
          for (let i = 0; i < fftSize; i++) {
            const x = i * sliceW;
            const y = (1 - (timeBuf[i] + 1) / 2) * H;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // ── FFT Spectrum Analyzer (FR-031) ───────────────────────────────────
      const fftCanvas = fftCanvasRef.current;
      if (fftCanvas && (mode === "spectrum" || mode === "both")) {
        analyserNode.getFloatFrequencyData(freqBuf);
        const ctx = fftCanvas.getContext("2d");
        if (ctx) {
          const W = fftCanvas.width;
          const H = fftCanvas.height;
          ctx.clearRect(0, 0, W, H);

          ctx.fillStyle = "rgba(10,11,20,0.6)";
          ctx.fillRect(0, 0, W, H);

          // Grid
          ctx.strokeStyle = "rgba(255,255,255,0.04)";
          ctx.lineWidth = 1;
          for (let g = 1; g < 4; g++) {
            const y = (H / 4) * g;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
          }

          // Display range: 0–2000 Hz (covers all healing frequencies)
          const maxDisplayHz = 2000;
          const maxBin = Math.min(bufLen, Math.floor(maxDisplayHz / binHz));

          // Find peak bin for Hz readout
          let peakBin = 0;
          let peakDb = -Infinity;
          for (let i = 1; i < maxBin; i++) {
            if (freqBuf[i] > peakDb) { peakDb = freqBuf[i]; peakBin = i; }
          }

          // Parabolic interpolation for sub-bin accuracy
          let peakHzMeasured = peakBin * binHz;
          if (peakBin > 0 && peakBin < bufLen - 1) {
            const alpha = freqBuf[peakBin - 1];
            const beta = freqBuf[peakBin];
            const gamma = freqBuf[peakBin + 1];
            const denom = alpha - 2 * beta + gamma;
            if (denom !== 0) {
              const delta = 0.5 * (alpha - gamma) / denom;
              peakHzMeasured = (peakBin + delta) * binHz;
            }
          }

          if (isPlaying && peakDb > -80) {
            const rounded = Math.round(peakHzMeasured * 100) / 100;
            setMeasuredHz(rounded);
            const diff = Math.abs(rounded - targetHz);
            setAccuracy(diff <= 0.05 ? "good" : diff <= 0.5 ? "warn" : "error");
          }

          // Draw bars
          const barW = W / maxBin;
          for (let i = 0; i < maxBin; i++) {
            const db = freqBuf[i]; // typically -160 to 0
            const normalized = Math.max(0, (db + 100) / 100); // map -100..0 dB to 0..1
            const barH = normalized * H;
            const x = i * barW;

            // Highlight peak bin
            const isPeak = Math.abs(i - peakBin) <= 1;
            if (isPeak) {
              ctx.fillStyle = color;
              ctx.shadowBlur = 8;
              ctx.shadowColor = color;
            } else {
              ctx.fillStyle = `rgba(0,212,170,0.35)`;
              ctx.shadowBlur = 0;
            }
            ctx.fillRect(x, H - barH, Math.max(1, barW - 0.5), barH);
          }
          ctx.shadowBlur = 0;

          // Frequency axis labels
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.font = "10px DM Sans, sans-serif";
          ctx.textAlign = "center";
          const labelFreqs = [100, 200, 400, 600, 800, 1000, 1500, 2000];
          for (const f of labelFreqs) {
            if (f > maxDisplayHz) break;
            const x = (f / maxDisplayHz) * W;
            ctx.fillText(`${f}`, x, H - 2);
          }
        }
      }
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [analyserNode, isPlaying, targetHz, color, mode]);

  const accuracyColor = accuracy === "good" ? "#00D4AA" : accuracy === "warn" ? "#F59E0B" : "#EF4444";
  const accuracyLabel = accuracy === "good" ? "✓ Within ±0.05 Hz" : accuracy === "warn" ? "⚠ Within ±0.5 Hz" : "✗ >0.5 Hz deviation";

  return (
    <div className="flex flex-col gap-3 w-full">
      {(mode === "oscilloscope" || mode === "both") && (
        <div className="relative">
          <div className="text-xs font-medium mb-1" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
            Oscilloscope — Live Waveform
          </div>
          <canvas
            ref={oscCanvasRef}
            width={600}
            height={80}
            className="w-full rounded-lg"
            style={{ background: "rgba(10,11,20,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
          />
        </div>
      )}

      {(mode === "spectrum" || mode === "both") && (
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
              FFT Spectrum Analyzer — 0–2000 Hz
            </div>
            {measuredHz !== null && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold" style={{ color: accuracyColor }}>
                  {measuredHz.toFixed(2)} Hz
                </span>
                <span className="text-xs" style={{ color: accuracyColor, fontFamily: "DM Sans, sans-serif" }}>
                  {accuracyLabel}
                </span>
              </div>
            )}
          </div>
          <canvas
            ref={fftCanvasRef}
            width={600}
            height={100}
            className="w-full rounded-lg"
            style={{ background: "rgba(10,11,20,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: "#3A4A6B", fontFamily: "DM Sans, sans-serif" }}>0 Hz</span>
            <span className="text-xs" style={{ color: "#3A4A6B", fontFamily: "DM Sans, sans-serif" }}>2000 Hz</span>
          </div>
        </div>
      )}
    </div>
  );
}
