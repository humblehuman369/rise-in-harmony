# TrueHz Convert — Development Plan

**Created:** July 17, 2026  
**Status:** Draft for product/engineering review · **DSP spike PASS** (2026-07-17)  
**Related:** `TrueHz_Technical_Specification.docx` · Rise In Harmony codebase (`rise-in-harmony`)  
**Working product name:** TrueHz Convert *(placeholder — confirm before public launch)*  
**Parent brand:** Rise In Harmony / TrueHz™ Precision Tuning  
**Canonical path:** `docs/TrueHz_Convert_Development_Plan.md`  
**DSP spike:** `docs/spikes/truehz-convert/` (`SPIKE_REPORT.md`)

This plan defines how to ship a **standalone companion product**: users upload a soundtrack, choose a target reference frequency (or retune standard), and download a converted file — without diluting the core TrueHz promise that pure tones are *generated*, not pitch-shifted.

---

## 1. Executive summary

| | |
|---|---|
| **Problem** | People want their own music “in” 432 Hz, 528 Hz, etc. Most tools pitch-shift poorly and overclaim accuracy. |
| **Opportunity** | Honest, high-quality retune + optional TrueHz pure-tone bed, under a brand that already owns frequency integrity. |
| **Not in scope for v1** | Claiming the entire mixed track is mathematically 528.00 Hz (that remains TrueHz live synthesis only). |
| **In scope for v1** | Upload → reference retune (e.g. A=440 → A=432) → optional TrueHz carrier mix → export → download library. |

**Product positioning (locked for engineering copy):**

| Product | What it does | Accuracy claim |
|---------|--------------|----------------|
| **TrueHz™ Precision Tuning** | Live pure-tone synthesis (DDS / oscillators) | Exact labeled Hz ±0.05 Hz |
| **TrueHz Convert** *(companion)* | Retunes uploaded audio by reference pitch ratio | Transparent ratio retune (e.g. −31.8 ¢ for 440→432); no “pure Hz” claim on the mix |
| **Optional hybrid** | Retuned track + TrueHz-generated carrier under it | Only the *generated* layer is TrueHz-verified |

---

## 2. Goals & success metrics

### Product goals
1. Ship a usable web MVP: upload → select target → process → download.
2. Keep TrueHz brand integrity: clear labeling, no false “exact 528 Hz music” claims.
3. Reuse Rise In Harmony infra (auth, S3 uploads, Stripe/RC path) where it speeds delivery.
4. Leave room to productize as (A) feature inside RIH Studio, (B) subdomain app, or (C) fully separate SKU.

### Success gates (suggested)

| Phase | Gate |
|-------|------|
| MVP (internal) | 10 test tracks; A/B vs Rubber Band / ffmpeg atempo; no critical artifacts on voice+piano |
| Soft launch | ≥50 conversions; p95 job &lt; 3× realtime for ≤6 min tracks; crash rate &lt; 2% |
| Public v1 | Conversion completion ≥70%; D7 return ≥25% of converters; NPS/feedback on quality ≥7/10 |
| Monetization | Trial→paid ≥25% or clear freemium upgrade path for long/high-quality jobs |

---

## 3. Product definition (v1)

### 3.1 User journey

```
Sign in (RIH account or Convert-only account)
  → Upload audio (MP3 / WAV / M4A / FLAC)
  → Choose mode:
       (A) Reference retune: Source A=440 → Target A=432 | 444 | custom
       (B) Preset “healing” labels that map to documented ratios only
  → Optional: mix TrueHz pure tone under track (level, waveform, mono only in v1)
  → Process (async job)
  → Preview + download WAV (lossless) and/or high-quality MP3
  → Saved in personal library (TTL or quota)
```

### 3.2 Explicit non-goals (v1)

- Real-time scrubbing of full multitrack stems  
- Automatic “make this song be 528 Hz peak” spectral forcing  
- Mobile offline native DSP (web-first; mobile can follow)  
- User-facing disclosure of TrueHz DDS internals  
- Community public gallery of converted copyrighted tracks  

### 3.3 Frequency UX (honest model)

**Primary control:** source concert pitch → target concert pitch.

| Label (UI) | Engineering meaning |
|------------|---------------------|
| A=440 → A=432 | Pitch ratio = 432/440 |
| A=440 → A=444 | Pitch ratio = 444/440 |
| “Natural Harmony (432)” | Same as 440→432 with friendly name |
| Solfeggio / 528 etc. | **Not** “force peak to 528.” Offer: (1) reference retune only, or (2) hybrid TrueHz carrier at exact 528.00 Hz under the track |

Document every preset ratio in-product (“This shifts the whole track by X cents”).

### 3.4 Limits (v1 defaults)

| Limit | Free | Paid / Convert Pro |
|-------|------|---------------------|
| Max duration | 5 min | 30 min |
| Max file size | 25 MB | 100 MB |
| Concurrent jobs | 1 | 2 |
| Output formats | MP3 256 kbps | WAV + MP3 320 |
| Quality mode | Standard | High (slower, better pitch algorithm) |
| TrueHz tone bed | No | Yes |
| Library retention | 7 days | 90 days |

*(Adjust numbers after cost modeling on Railway/S3/worker CPU.)*

---

## 4. Architecture

### 4.1 High-level

```
┌─────────────┐     presigned PUT      ┌─────────────┐
│  Web client │ ─────────────────────► │  S3 (raw)   │
│  (Vite RIH  │                        └──────┬──────┘
│   or Convert│                               │
│   mini-app) │     tRPC createJob            │
└──────┬──────┘ ─────────────────────► ┌──────▼──────┐
       │                               │ API server  │
       │     poll / websocket          │ (Express +  │
       │ ◄───────────────────────────  │  tRPC)      │
       │                               └──────┬──────┘
       │                                      │ enqueue
       │                               ┌──────▼──────┐
       │                               │ Job worker  │
       │                               │ ffmpeg +    │
       │                               │ rubberband  │
       │                               │ (or sox)    │
       │                               └──────┬──────┘
       │                                      │ write result
       │                               ┌──────▼──────┐
       └──── download URL ──────────── │ S3 (out)    │
                                       └─────────────┘
```

### 4.2 Relationship to existing stack

| Existing asset | Reuse? | Notes |
|----------------|--------|-------|
| Auth / users | Yes | Same session; Convert as feature flag or product entitlement |
| S3 + presigned upload (`uploadSoundMp3`, storage) | Yes | New key prefix `convert/{userId}/{jobId}/` |
| `user_sounds` table | Partial | Either extend with `kind=retune` or new `convert_jobs` table (preferred) |
| TrueHz DDS / `usePrecisionPlayer` | Hybrid only | Client preview of tone bed; server mixes offline for export |
| Studio ambient upload | Do not conflate | Backgrounds stay backgrounds; Convert is a separate flow |
| Stripe / RevenueCat | Yes when monetizing | New SKU or RIH premium gate |
| PostHog | Yes | Full funnel events |

### 4.3 DSP pipeline (worker)

1. **Validate** — mime, duration via ffprobe, sample rate, channels  
2. **Decode** to intermediate WAV (48 kHz stereo or preserve mono)  
3. **Pitch shift** — Rubber Band Library CLI (`rubberband`) preferred for music quality; fallback SoundTouch for speed  
   - Ratio `r = targetA / sourceA`  
   - Formant preservation ON for vocal-heavy content (toggle)  
4. **Optional TrueHz bed** — generate pure sine (or catalog waveform) at exact `carrierHz` via offline render (same math as DDS: sample-accurate `sin(2π f n / fs)`), mix at user gain (−24 … −6 dB default −18)  
5. **Normalize** — true-peak limiter −1.0 dBTP; loudness target optional (−16 LUFS for streaming preview)  
6. **Encode** — WAV PCM 24-bit and/or MP3  
7. **QC metadata** — write job report: ratio, cents, source duration, peak, algorithm, version  

### 4.4 Accuracy & labeling (product contract)

| Layer | Claim |
|-------|--------|
| Retuned music | “Retuned by ratio from assumed source pitch A” |
| TrueHz bed | “TrueHz™ pure tone at X.XX Hz” (verify with FFT in QC tests) |
| Never claim | “This song is exactly 528.00 Hz throughout” for full mixes |

---

## 5. Data model

### 5.1 New table: `convert_jobs`

| Column | Type | Notes |
|--------|------|-------|
| id | varchar PK | nanoid |
| userId | FK users | |
| status | enum | `queued` \| `processing` \| `completed` \| `failed` \| `expired` |
| sourceKey | varchar | S3 key |
| sourceFilename | varchar | original name |
| sourceDurationSec | float | from ffprobe |
| sourceFormat | varchar | |
| sourcePitchA | decimal | default 440 |
| targetPitchA | decimal | e.g. 432 |
| pitchRatio | decimal | stored for audit |
| cents | decimal | 1200·log2(ratio) |
| hybridEnabled | bool | TrueHz bed |
| hybridHz | decimal nullable | exact carrier |
| hybridGainDb | float | |
| quality | enum | `standard` \| `high` |
| outputWavKey | varchar nullable | |
| outputMp3Key | varchar nullable | |
| errorCode | varchar nullable | |
| errorMessage | text nullable | |
| algorithmVersion | varchar | e.g. `rb-3.3.0-v1` |
| processingMs | int nullable | |
| expiresAt | timestamp | library TTL |
| createdAt / updatedAt | timestamps | |

### 5.2 Entitlements

- Reuse `users.subscriptionTier` **or** add `convertCredits` / `convertPlan`  
- Free: N conversions/month; paid: higher limits  
- Decision point in Phase 0 (see open questions)

---

## 6. API surface (tRPC)

| Procedure | Purpose |
|-----------|---------|
| `convert.createUploadUrl` | Presigned PUT for source |
| `convert.createJob` | After upload complete; validates limits |
| `convert.getJob` | Status + progress + result URLs |
| `convert.listJobs` | Personal library |
| `convert.deleteJob` | Remove S3 objects + row |
| `convert.getDownloadUrl` | Short-lived GET for output |

**Worker:** not tRPC — poll DB or Redis queue (`BullMQ` / Railway worker process).

REST webhook optional later for Zapier; not required for MVP.

---

## 7. Client UX (web MVP)

### Screens
1. **Landing** — what Convert does / does not claim; contrast with TrueHz live player  
2. **Converter** — dropzone, pitch source/target, optional hybrid, quality, submit  
3. **Job progress** — stages: uploaded → analyzing → retuning → encoding → ready  
4. **Result** — waveform preview, A/B original vs converted (client-side), download buttons, share disclaimer  
5. **Library** — list jobs, expiry countdown, re-download  

### Copy guardrails (engineering checklist)
- [ ] Every results page shows cents and ratio  
- [ ] Hybrid jobs show “TrueHz layer: X.XX Hz” badge only when hybrid on  
- [ ] Link to TrueHz Technology page for pure-tone story  
- [ ] Copyright notice: user certifies rights to process the file  

### Integration options (pick one in Phase 0)

| Option | Effort | Brand clarity |
|--------|--------|---------------|
| **A.** New route in RIH: `/convert` | Lowest | Medium — needs strong labeling |
| **B.** Subdomain `convert.riseinharmony.com` | Medium | High |
| **C.** Separate app + repo | Highest | Highest for spin-out |

**Recommendation:** **A for MVP** (fastest, reuses auth), **B for public launch** if Convert monetizes separately.

---

## 8. Phased delivery

Estimates assume one engineer + AI agent, focused days (not calendar weeks with context-switching).

---

### Phase 0 — Product lock & foundation · ~2–3 dev-days

**Goal:** decisions frozen; skeleton ships empty shell.

| # | Task | Days |
|---|------|------|
| 0.1 | Confirm product name, option A/B/C hosting, freemium limits | 0.5 |
| 0.2 | Write public-facing claims doc (legal/marketing one-pager) | 0.5 |
| 0.3 | Schema `convert_jobs` + migration | 0.5 |
| 0.4 | Scaffold `/convert` page + nav entry (feature flag) | 0.5 |
| 0.5 | Cost model: worker CPU, S3, ffmpeg on Railway | 0.5 |

**Exit criteria:** Feature flag off in prod; empty UI behind flag; schema migrated in staging.

---

### Phase 1 — Pipeline MVP (happy path) · ~8–10 dev-days · **IMPLEMENTED 2026-07-17**

**Goal:** signed-in user can retune one track end-to-end.

| # | Task | Status |
|---|------|--------|
| 1.1 | Upload path `POST /api/convert/upload` (multi-format, storagePut) | ✅ |
| 1.2 | tRPC `convert.*` create/list/get/delete/download + status machine | ✅ |
| 1.3 | In-process worker: ffprobe → rubberband (ffmpeg fallback) → encode | ✅ |
| 1.4 | Progress fields (stage + %) + client polling on `/convert` | ✅ |
| 1.5 | Download URLs + `POST /api/scheduled/convert-expire` | ✅ |
| 1.6 | Error taxonomy + Convert UI | ✅ |
| 1.7 | Tests: pitchMath + pipeline fixture | ✅ |
| — | Schema `convert_jobs` + migration `0009_convert_jobs.sql` | ✅ |
| — | Feature flag `RIH_CONVERT_ENABLED` | ✅ |

**Key paths:** `server/routers/convert.ts`, `server/lib/convert/*`, `client/src/pages/Convert.tsx`, `packages/shared-utils/src/pitchMath.ts`

**Exit criteria:** Staging demo: 3-minute MP3, 440→432, download WAV, metadata shows cents.  
**Ops:** run migration `0009_convert_jobs.sql` before enabling traffic; ensure `ffmpeg`, `ffprobe`, `rubberband` on the host.

**Tech choice default:**  
- `ffmpeg` + `rubberband` CLI in Docker worker image  
- Queue: DB `status=queued` poll every 2s if no Redis yet; upgrade to Redis when concurrent load appears  

---

### Phase 2 — Quality, hybrid TrueHz, limits · ~6–7 dev-days · **IMPLEMENTED 2026-07-17**

**Goal:** product-grade quality and brand-aligned hybrid.

| # | Task | Status |
|---|------|--------|
| 2.1 | High vs standard quality (Rubber Band R3 `-3`) | ✅ |
| 2.2 | Formant-preserve (`-F`) + `formantPreserve` column | ✅ |
| 2.3 | Offline TrueHz sine bed (`trueHzOffline` + `hybridMix`) | ✅ |
| 2.4 | Mix + peak limiter (~−1 dBTP) | ✅ |
| 2.5 | Free/paid limits (formant/hybrid/high/WAV) server-side | ✅ |
| 2.6 | QC tests: hybrid FFT peak within ±0.05 Hz | ✅ |
| 2.7 | A/B preview (original File URL vs converted) | ✅ |

**Key paths:** `server/lib/convert/hybridMix.ts`, `wavCodec.ts`, `pipeline.ts`, `client/src/pages/Convert.tsx`, migration `0010_convert_formant.sql`

**Exit criteria:** Hybrid job badge + automated FFT assert on sine bed; free users blocked over quota.

---

### Phase 3 — Polish, trust, monetization · ~5–6 dev-days · **IMPLEMENTED 2026-07-17**

**Goal:** launch-ready UX and money path.

| # | Task | Status |
|---|------|--------|
| 3.1 | Landing + Technology/Home cross-links + disclaimer UX | ✅ |
| 3.2 | Library rename/delete + expiry messaging | ✅ |
| 3.3 | Premium paywall from Convert + checkout return paths | ✅ |
| 3.4 | PostHog convert funnel events | ✅ |
| 3.5 | Convert upload rate limit (20/hr prod) + rights attestation | ✅ |
| 3.6 | Resend “job ready” email | ✅ |
| 3.7 | Soft launch checklist + support playbook | ✅ `docs/CONVERT_SOFT_LAUNCH.md` |

**Exit criteria:** Feature flag on for beta users; paid conversion path works; support FAQ published.

---

### Phase 4 — Scale & optional mobile · ~5+ dev-days · **IMPLEMENTED 2026-07-17**

| # | Task | Status |
|---|------|--------|
| 4.1 | Multi-slot worker + stale reaper (`CONVERT_WORKER_CONCURRENCY`) | ✅ (DB queue; Redis optional later) |
| 4.2 | Subdomain host redirect + `docs/CONVERT_SUBDOMAIN.md` | ✅ |
| 4.3 | Mobile `/convert` job list + web upload deep-link | ✅ |
| 4.4 | Batch convert `createBatch` multi-target packs | ✅ |
| 4.5 | Experimental pitch detect (`detectPitch` + ACF) | ✅ |

**Env:** `CONVERT_WORKER_CONCURRENCY` (1–4), `CONVERT_STALE_MINUTES` (default 30)

---

## 9. Testing strategy

| Layer | What |
|-------|------|
| Unit | Ratio/cents math; clamp limits; entitlement checks |
| Fixture DSP | Golden WAVs: pure 440 Hz tone → 432; measure peak within tolerance of **ratio**, not absolute “magic” Hz for music |
| Hybrid integrity | Sine bed FFT peak = target ±0.05 Hz (reuse TrueHz contract spirit) |
| E2E | Playwright: upload fixture → job completes → download 200 |
| Load | 5 concurrent 5-min jobs; no stuck `processing` |
| Security | Authz on job IDs; no cross-user S3 keys; file type sniffing |

---

## 10. Security, legal, ops

### Security
- Auth required for create/download  
- Content-type + magic-byte validation  
- Max size/duration server-side  
- Private S3 buckets; short-lived signed URLs  
- Virus scan backlog item for public launch  

### Legal / product
- User rights attestation checkbox  
- DMCA / takedown process if library becomes social  
- Claims review: marketing cannot reuse TrueHz “exact Hz” language for pitch-shifted mixes  

### Ops
- Worker Docker image with ffmpeg + rubberband  
- Structured logs: `jobId`, stage, ms  
- Dead-letter: jobs `processing` &gt; 30 min → failed + alert  
- S3 lifecycle: auto-delete expired prefixes  

---

## 11. Cost sketch (order of magnitude)

| Component | Driver | Note |
|-----------|--------|------|
| Worker CPU | minutes of audio × quality | Dominant cost |
| S3 | raw + wav + mp3 × retention | Lifecycle rules essential |
| Egress | downloads | Prefer same-region |
| API | light | Existing Railway service |

Run Phase 0.5 with 100 hypothetical 5-min high-quality jobs/day before locking free tier.

---

## 12. Analytics events

| Event | Properties |
|-------|------------|
| `convert_page_viewed` | source |
| `convert_upload_started/completed` | bytes, format, durationSec |
| `convert_job_created` | sourceA, targetA, hybrid, quality |
| `convert_job_completed` | processingMs, algorithmVersion |
| `convert_job_failed` | errorCode |
| `convert_download` | format |
| `convert_paywall_viewed` | trigger |
| `convert_upgraded` | plan |

---

## 13. Team responsibilities (suggested)

| Role | Owns |
|------|------|
| Engineering | Pipeline, schema, UI, tests |
| Product / brand | Name, claims, pricing, Free vs Pro matrix |
| Legal | Disclaimers, copyright attestation |
| Support | Failure codes → user-readable help |

---

## 14. Open decisions (resolve in Phase 0)

1. **Name:** TrueHz Convert vs Harmony Retune vs Pitch Lab (brand safety)  
2. **Hosting:** `/convert` in RIH vs subdomain vs spin-out  
3. **Monetization:** free with RIH Premium vs separate Convert Pro SKU vs credits  
4. **Default algorithm:** Rubber Band only vs dual engines  
5. **Source pitch:** fixed 440 assumption only in v1, or optional pitch detection later  
6. **Hybrid waveforms:** sine only vs full TrueHz set (bowl, binaural) — **recommend sine mono only for v1**  

---

## 15. Milestone summary

| Phase | Focus | Est. effort | Outcome |
|-------|--------|-------------|---------|
| **0** | Lock scope + skeleton | 2–3 d | Flagged empty product + schema |
| **1** | E2E retune pipeline | 8–10 d | First successful conversions |
| **2** | Hybrid TrueHz + limits | 6–7 d | Brand-safe quality MVP |
| **3** | Launch polish + pay | 5–6 d | Soft launch ready |
| **4** | Scale + mobile | 5+ d | Growth |

**MVP total (Phases 0–2):** ~16–20 focused dev-days  
**Launch total (0–3):** ~21–26 focused dev-days  

---

## 16. Immediate next actions

1. Approve this plan’s positioning (companion product, not TrueHz DDS modification).  
2. Resolve Phase 0 open decisions (especially name + hosting + monetization).  
3. ~~Spike: Rubber Band on a 440 Hz test tone → 432; measure quality.~~ **DONE — PASS** (see below).  
4. Implement Phase 1 schema + job API (next engineering step).  
5. Optional: Dockerize worker with `ffmpeg` + `rubberband` before Railway deploy.

### 16.1 DSP spike results (2026-07-17)

Reproduce: `cd docs/spikes/truehz-convert && python3 run_spike.py`

| Method | Peak Hz | Error vs 432.0 | Within ±0.05 Hz | Process time |
|--------|---------|----------------|-----------------|--------------|
| **Rubber Band 4.0.0** (`-f 432/440`) | **432.0000** | **~0 Hz** | ✅ | ~39 ms (5 s mono) |
| FFmpeg `asetrate`+`atempo` | 431.9921 | −0.0079 Hz | ✅ | ~63 ms |

- Source self-check: 440.0000 Hz exact  
- Ratio: `0.9818181818` (−31.77 cents)  
- Rubber Band THD est. ~0.0015% on pure tone  
- **Verdict: proceed with Rubber Band as Phase 1 primary engine; FFmpeg path is acceptable fallback/fast tier**  
- Full write-up: `docs/spikes/truehz-convert/SPIKE_REPORT.md`  

---

## Appendix A — Mapping to TrueHz technical spec

| TrueHz spec concept | Convert usage |
|---------------------|---------------|
| FR-001 exact Hz 1–22000 @ 0.01 | Applies only to optional hybrid carrier generation |
| Phase-continuous retune | N/A for offline file processing |
| No pitch-shifting claim | Preserved for live TrueHz; Convert is explicitly pitch-ratio based |
| `clampHz` / catalog | Reuse for hybridHz UI presets |
| Recorded path vs live path | Convert is a **third path**: offline file transform |

## Appendix B — Suggested repo layout (if kept monorepo)

```
rise-in-harmony/
  client/src/pages/Convert.tsx          # UI
  server/routers/convert.ts             # tRPC
  server/workers/convertWorker.ts       # job runner
  packages/shared-utils/src/pitchMath.ts  # ratio, cents
  packages/shared-utils/src/trueHzOffline.ts  # sample-accurate sine render
  drizzle/...                           # convert_jobs migration
  scripts/convert-worker.Dockerfile
```

---

*— End of development plan —*
