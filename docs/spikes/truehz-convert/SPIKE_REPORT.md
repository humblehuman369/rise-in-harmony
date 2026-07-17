# TrueHz Convert — DSP Spike Report

**Date:** 2026-07-17T08:48:34.138816+00:00  
**Spike ID:** `truehz-convert-dsp-v1`  
**Location:** `docs/spikes/truehz-convert/`

## Objective

Validate that a pure **440 Hz** tone can be pitch-shifted by ratio  
`432.0/440.0 = 0.9818181818` (-31.77 cents) so the measured peak lands at  
**432.0000 Hz** — the mathematical target for an A=440→A=432 retune.

This is **not** a TrueHz live-DDS accuracy claim on mixed music. It is a gate for the Convert offline pipeline.

## Setup

| Item | Value |
|------|-------|
| Sample rate | 48000 Hz |
| Duration | 5.0 s mono PCM16 WAV |
| Source tone | pure sine 440.0 Hz @ −6 dBFS |
| Pitch ratio | 0.9818181818 |
| Cents | -31.7667 |
| Expected peak | 432.000000 Hz |
| Rubber Band | CLI 4.0.0 (`-f <ratio>`) |
| FFmpeg baseline | `asetrate` + `aresample` + `atempo` |

## Source self-check

| Metric | Value |
|--------|-------|
| Measured peak | 440.0000 Hz |
| Error vs 440.0 | +0.0000 Hz |

## Results

### Rubber Band (recommended engine)

| Metric | Value |
|--------|-------|
| Peak Hz | 432.0000 |
| Expected | 432.0000 |
| Error Hz | -0.0000 |
| Within ±0.05 Hz | ✅ |
| Within ±0.5 Hz | ✅ |
| THD est. % | 0.001 |
| Duration sec | 5.000 |
| Process ms | 39 |
| SNR approx dB | 141.0 |

### FFmpeg asetrate baseline

| Metric | Value |
|--------|-------|
| Peak Hz | 431.9921 |
| Expected | 432.0000 |
| Error Hz | -0.0079 |
| Within ±0.05 Hz | ✅ |
| Within ±0.5 Hz | ✅ |
| THD est. % | 0.003 |
| Duration sec | 5.000 |
| Process ms | 63 |
| SNR approx dB | 138.4 |


## Verdict

| Check | Result |
|-------|--------|
| Spike pass (RB within ±0.5 Hz) | **PASS ✅** |
| Prefer Rubber Band over FFmpeg baseline | Yes |

PASS: Rubber Band lands pure-tone peak near expected ratio target.

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
