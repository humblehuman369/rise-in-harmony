#!/usr/bin/env python3
"""
TrueHz Convert — Phase 0 DSP spike
Generate pure 440 Hz tone → pitch-shift to 432 Hz ratio → measure peak Hz.

Usage:
  python3 run_spike.py
"""
from __future__ import annotations

import json
import math
import struct
import subprocess
import sys
import wave
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

SPIKE_DIR = Path(__file__).resolve().parent
FS = 48000
DURATION_SEC = 5.0
SOURCE_HZ = 440.0
TARGET_A = 432.0
SOURCE_A = 440.0
RATIO = TARGET_A / SOURCE_A  # 432/440
EXPECTED_PEAK = SOURCE_HZ * RATIO  # pure 440 → ~432.0
CENTS = 1200.0 * math.log2(RATIO)


def write_wav_mono_f32_as_pcm16(path: Path, samples: np.ndarray, fs: int = FS) -> None:
    samples = np.clip(samples, -1.0, 1.0)
    pcm = (samples * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(fs)
        w.writeframes(pcm.tobytes())


def read_wav_mono(path: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(path), "rb") as w:
        nch = w.getnchannels()
        fs = w.getframerate()
        nframes = w.getnframes()
        sampwidth = w.getsampwidth()
        raw = w.readframes(nframes)
    if sampwidth == 2:
        data = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0
    elif sampwidth == 4:
        data = np.frombuffer(raw, dtype=np.int32).astype(np.float64) / 2147483648.0
    else:
        raise ValueError(f"Unsupported sampwidth {sampwidth} for {path}")
    if nch > 1:
        data = data.reshape(-1, nch).mean(axis=1)
    return data, fs


def peak_hz(samples: np.ndarray, fs: int, search_lo: float = 20.0, search_hi: float = 2000.0) -> dict:
    """Parabolic-interpolated FFT peak in [search_lo, search_hi]."""
    # Hann window, drop edges for steady-state
    n = len(samples)
    start = int(0.5 * fs)
    end = min(n, int(4.5 * fs))
    seg = samples[start:end]
    if len(seg) < fs:
        seg = samples
    win = np.hanning(len(seg))
    spectrum = np.fft.rfft(seg * win)
    mags = np.abs(spectrum)
    freqs = np.fft.rfftfreq(len(seg), d=1.0 / fs)
    mask = (freqs >= search_lo) & (freqs <= search_hi)
    idx = np.arange(len(freqs))[mask]
    local = mags[mask]
    k = int(np.argmax(local))
    global_k = int(idx[k])
    # parabolic interpolation around peak
    if 1 <= global_k < len(mags) - 1:
        alpha = mags[global_k - 1]
        beta = mags[global_k]
        gamma = mags[global_k + 1]
        denom = alpha - 2 * beta + gamma
        delta = 0.5 * (alpha - gamma) / denom if denom != 0 else 0.0
    else:
        delta = 0.0
    peak = (global_k + delta) * fs / len(seg)
    peak_mag = float(mags[global_k])
    # noise floor estimate (median away from peak)
    noise = float(np.median(local))
    snr_db = 20 * math.log10(peak_mag / noise) if noise > 0 else float("inf")
    return {
        "peak_hz": float(peak),
        "bin_hz": float(freqs[global_k]),
        "snr_db_approx": float(snr_db),
        "n_samples": int(len(seg)),
        "fs": int(fs),
    }


def thd_estimate(samples: np.ndarray, fs: int, f0: float, n_harmonics: int = 5) -> float:
    """Rough THD % using FFT bins nearest k*f0."""
    start = int(0.5 * fs)
    end = min(len(samples), int(4.5 * fs))
    seg = samples[start:end]
    win = np.hanning(len(seg))
    spectrum = np.abs(np.fft.rfft(seg * win))
    freqs = np.fft.rfftfreq(len(seg), d=1.0 / fs)

    def bin_at(f: float) -> float:
        k = int(np.argmin(np.abs(freqs - f)))
        # sum small neighborhood
        lo, hi = max(0, k - 2), min(len(spectrum), k + 3)
        return float(np.sum(spectrum[lo:hi] ** 2))

    p1 = bin_at(f0)
    if p1 <= 0:
        return float("nan")
    harm = sum(bin_at(f0 * h) for h in range(2, n_harmonics + 1))
    return 100.0 * math.sqrt(harm / p1)


def run_cmd(cmd: list[str]) -> dict:
    t0 = datetime.now(timezone.utc)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    t1 = datetime.now(timezone.utc)
    return {
        "cmd": " ".join(cmd),
        "returncode": proc.returncode,
        "stderr_tail": (proc.stderr or "")[-800:],
        "stdout_tail": (proc.stdout or "")[-400:],
        "elapsed_ms": int((t1 - t0).total_seconds() * 1000),
    }


def main() -> int:
    src = SPIKE_DIR / "source_440hz_5s.wav"
    out_rb = SPIKE_DIR / "out_rubberband_432ratio.wav"
    out_ff = SPIKE_DIR / "out_ffmpeg_asetrate_432ratio.wav"
    report_json = SPIKE_DIR / "spike_results.json"
    report_md = SPIKE_DIR / "SPIKE_REPORT.md"

    n = int(FS * DURATION_SEC)
    t = np.arange(n, dtype=np.float64) / FS
    tone = 0.5 * np.sin(2 * math.pi * SOURCE_HZ * t)
    write_wav_mono_f32_as_pcm16(src, tone, FS)

    results: dict = {
        "spike": "truehz-convert-dsp-v1",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source_hz": SOURCE_HZ,
        "source_a": SOURCE_A,
        "target_a": TARGET_A,
        "pitch_ratio": RATIO,
        "cents": CENTS,
        "expected_peak_hz": EXPECTED_PEAK,
        "sample_rate": FS,
        "duration_sec": DURATION_SEC,
        "methods": {},
    }

    # --- Method A: Rubber Band CLI (recommended) ---
    rb_bin = subprocess.run(["which", "rubberband"], capture_output=True, text=True)
    rb_path = rb_bin.stdout.strip() or "rubberband"
    # -f = frequency ratio; keep duration with time ratio 1.0 (default if only -f)
    rb_cmd = [
        rb_path,
        "-f",
        f"{RATIO:.10f}",
        "-c",  # crispness mid
        "2",
        str(src),
        str(out_rb),
    ]
    rb_run = run_cmd(rb_cmd)
    results["methods"]["rubberband"] = {"run": rb_run}
    if rb_run["returncode"] == 0 and out_rb.exists():
        samples, fs = read_wav_mono(out_rb)
        peak = peak_hz(samples, fs)
        err = peak["peak_hz"] - EXPECTED_PEAK
        results["methods"]["rubberband"].update(
            {
                "peak": peak,
                "error_hz": err,
                "abs_error_hz": abs(err),
                "thd_percent": thd_estimate(samples, fs, EXPECTED_PEAK),
                "duration_sec": len(samples) / fs,
                "pass_peak_within_0_05": abs(err) <= 0.05,
                "pass_peak_within_0_5": abs(err) <= 0.5,
            }
        )
    else:
        results["methods"]["rubberband"]["error"] = "rubberband failed"

    # --- Method B: ffmpeg asetrate + aresample + atempo (cheap baseline) ---
    # Pitch up/down by changing sample rate then resampling back + tempo fix
    # ratio r: asetrate=FS*r, aresample=FS, atempo=1/r (atempo range 0.5-100, may chain)
    r = RATIO
    atempo = 1.0 / r  # ~1.0185 for 432/440
    ff_filter = f"asetrate={FS * r},aresample={FS},atempo={atempo:.10f}"
    ff_cmd = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(src),
        "-af",
        ff_filter,
        str(out_ff),
    ]
    ff_run = run_cmd(ff_cmd)
    results["methods"]["ffmpeg_asetrate"] = {"run": ff_run, "filter": ff_filter}
    if ff_run["returncode"] == 0 and out_ff.exists():
        samples, fs = read_wav_mono(out_ff)
        peak = peak_hz(samples, fs)
        err = peak["peak_hz"] - EXPECTED_PEAK
        results["methods"]["ffmpeg_asetrate"].update(
            {
                "peak": peak,
                "error_hz": err,
                "abs_error_hz": abs(err),
                "thd_percent": thd_estimate(samples, fs, EXPECTED_PEAK),
                "duration_sec": len(samples) / fs,
                "pass_peak_within_0_05": abs(err) <= 0.05,
                "pass_peak_within_0_5": abs(err) <= 0.5,
            }
        )
    else:
        results["methods"]["ffmpeg_asetrate"]["error"] = "ffmpeg failed"

    # --- Source self-check ---
    src_samples, src_fs = read_wav_mono(src)
    src_peak = peak_hz(src_samples, src_fs)
    results["source_measurement"] = {
        "peak": src_peak,
        "error_hz": src_peak["peak_hz"] - SOURCE_HZ,
    }

    # Verdict
    rb = results["methods"].get("rubberband", {})
    ff = results["methods"].get("ffmpeg_asetrate", {})
    rb_ok = rb.get("pass_peak_within_0_5", False)
    results["verdict"] = {
        "rubberband_recommended": rb_ok and rb.get("abs_error_hz", 99) <= ff.get("abs_error_hz", 99),
        "spike_pass": bool(rb_ok),
        "notes": (
            "PASS: Rubber Band lands pure-tone peak near expected ratio target."
            if rb_ok
            else "FAIL: Rubber Band peak outside ±0.5 Hz of expected."
        ),
    }

    report_json.write_text(json.dumps(results, indent=2))

    # Markdown report
    def fmt_method(name: str, m: dict) -> str:
        if "peak" not in m:
            return f"### {name}\n\nFailed: {m.get('error', m.get('run', {}))}\n"
        return f"""### {name}

| Metric | Value |
|--------|-------|
| Peak Hz | {m['peak']['peak_hz']:.4f} |
| Expected | {EXPECTED_PEAK:.4f} |
| Error Hz | {m['error_hz']:+.4f} |
| Within ±0.05 Hz | {'✅' if m['pass_peak_within_0_05'] else '❌'} |
| Within ±0.5 Hz | {'✅' if m['pass_peak_within_0_5'] else '❌'} |
| THD est. % | {m['thd_percent']:.3f} |
| Duration sec | {m['duration_sec']:.3f} |
| Process ms | {m['run']['elapsed_ms']} |
| SNR approx dB | {m['peak']['snr_db_approx']:.1f} |
"""

    md = f"""# TrueHz Convert — DSP Spike Report

**Date:** {results['timestamp']}  
**Spike ID:** `{results['spike']}`  
**Location:** `docs/spikes/truehz-convert/`

## Objective

Validate that a pure **{SOURCE_HZ:.0f} Hz** tone can be pitch-shifted by ratio  
`{TARGET_A}/{SOURCE_A} = {RATIO:.10f}` ({CENTS:.2f} cents) so the measured peak lands at  
**{EXPECTED_PEAK:.4f} Hz** — the mathematical target for an A={SOURCE_A:.0f}→A={TARGET_A:.0f} retune.

This is **not** a TrueHz live-DDS accuracy claim on mixed music. It is a gate for the Convert offline pipeline.

## Setup

| Item | Value |
|------|-------|
| Sample rate | {FS} Hz |
| Duration | {DURATION_SEC} s mono PCM16 WAV |
| Source tone | pure sine {SOURCE_HZ} Hz @ −6 dBFS |
| Pitch ratio | {RATIO:.10f} |
| Cents | {CENTS:.4f} |
| Expected peak | {EXPECTED_PEAK:.6f} Hz |
| Rubber Band | CLI 4.0.0 (`-f <ratio>`) |
| FFmpeg baseline | `asetrate` + `aresample` + `atempo` |

## Source self-check

| Metric | Value |
|--------|-------|
| Measured peak | {src_peak['peak_hz']:.4f} Hz |
| Error vs {SOURCE_HZ} | {results['source_measurement']['error_hz']:+.4f} Hz |

## Results

{fmt_method('Rubber Band (recommended engine)', rb)}
{fmt_method('FFmpeg asetrate baseline', ff)}

## Verdict

| Check | Result |
|-------|--------|
| Spike pass (RB within ±0.5 Hz) | **{'PASS ✅' if results['verdict']['spike_pass'] else 'FAIL ❌'}** |
| Prefer Rubber Band over FFmpeg baseline | {'Yes' if results['verdict']['rubberband_recommended'] else 'No / inconclusive'} |

{results['verdict']['notes']}

### Product implications

1. **Rubber Band is viable** for the Phase 1 worker if peak accuracy on pure tones holds (and subjectively on music in later QA).
2. FFmpeg `asetrate` path is a fine **fast/fallback** path for Free tier or pure tones; music quality usually favors Rubber Band.
3. TrueHz hybrid layer remains a **separate offline sine render** (not this pitch path); FFT-verify that bed at ±0.05 Hz in Phase 2.
4. Do **not** market Convert output as “TrueHz exact Hz” for full mixes — only the optional generated carrier.

## Artifacts

| File | Role |
|------|------|
| `source_440hz_5s.wav` | Input fixture |
| `out_rubberband_432ratio.wav` | RB output |
| `out_ffmpeg_asetrate_432ratio.wav` | FFmpeg output |
| `spike_results.json` | Machine-readable metrics |
| `run_spike.py` | Reproducible script |

## Reproduce

```bash
cd docs/spikes/truehz-convert
python3 run_spike.py
```

Requires: `python3` + `numpy`, `ffmpeg`, `rubberband` (Homebrew: `brew install rubberband`).

## Next

- Proceed to Phase 1 job pipeline if spike PASS.
- Add a short music fixture (piano + voice) for subjective listening QA before soft launch.
"""
    report_md.write_text(md)
    print(json.dumps(results["verdict"], indent=2))
    print(f"\nWrote {report_md}")
    print(f"Wrote {report_json}")
    return 0 if results["verdict"]["spike_pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
