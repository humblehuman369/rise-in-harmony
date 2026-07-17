# TrueHz Convert — Soft Launch Checklist & Support Playbook

**Product:** TrueHz Convert (companion to TrueHz™ live synthesis)  
**Route:** `/convert`  
**Flag:** `RIH_CONVERT_ENABLED` (default on; set `false` / `0` / `off` to disable)  
**Date:** 2026-07-17  

---

## Pre-launch checklist

### Infrastructure
- [ ] Apply migrations: `0009_convert_jobs.sql`, `0010_convert_formant.sql`
- [ ] Host has `ffmpeg`, `ffprobe`, `rubberband` on `PATH` (worker logs tooling at boot)
- [ ] `BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY` set (upload/download)
- [ ] `RESEND_API_KEY` + `RESEND_FROM_EMAIL` for job-ready emails
- [ ] `APP_URL` points at production origin (email deep links)
- [ ] Stripe configured for Premium (`RIH_STRIPE_*`) if paywall CTAs should work
- [ ] PostHog `VITE_POSTHOG_KEY` for funnel events

### Smoke test (staging)
1. Free user: rights checkbox → upload short MP3 → A=440→432 → complete → MP3 download  
2. Free user: hybrid/formant/WAV buttons open paywall  
3. Premium user: hybrid 528 Hz bed + formant + high quality → WAV download  
4. A/B preview plays original and converted  
5. Rename + delete in library  
6. Job-ready email arrives (if Resend configured)  
7. Expiry copy shows retention days  
8. Deep link `/convert?job=<publicId>` opens job  
9. Checkout from Convert returns to `/convert?billing=success`  

### Claims review
- [ ] Marketing never says “this song is exactly 528.00 Hz” for full mixes  
- [ ] Convert page disclaimer visible above the fold  
- [ ] Technology page links Convert as companion, not replacement for live TrueHz  

---

## Support playbook

| User report | Likely cause | Action |
|-------------|--------------|--------|
| “Convert unavailable” | `RIH_CONVERT_ENABLED=false` or feature outage | Check env; check `/healthz` |
| Upload fails `TOO_LARGE` | Free 25 MB / paid 100 MB | Suggest trim or upgrade |
| Upload fails `BAD_FORMAT` | Non-audio or exotic codec | Convert to MP3/WAV first |
| Job stuck `processing` | Worker crash / missing rubberband | Check server logs; restart; verify CLI tools |
| Job `TOOLING_MISSING` | ffmpeg/rubberband not installed on host | Install packages; redeploy |
| Job `TOO_LONG` | Over tier duration | Free 5 min / Premium 30 min |
| Job `DOWNLOAD_FAILED` | Storage/Forge misconfig | Check Forge credentials |
| No email | Resend not configured or no user email | Check `RESEND_*`; account email on file |
| “Not exact 528 Hz” | User expects mix = pure tone | Educate: ratio retune + optional TrueHz bed only |
| Copyright complaint | User rights attestation | Disable account uploads; legal process |

### Error codes (API / UI)

| Code | Meaning |
|------|---------|
| `FEATURE_DISABLED` | Convert flag off |
| `TOO_LARGE` | File size over tier |
| `TOO_LONG` | Duration over tier |
| `BAD_FORMAT` | Magic-byte check failed |
| `CONCURRENT_LIMIT` | Too many active jobs |
| `PREMIUM_REQUIRED` | Feature gated |
| `TOOLING_MISSING` | DSP binaries missing |
| `PROCESS_FAILED` | Pipeline error |
| `TIMEOUT` | Job exceeded process timeout |
| `DOWNLOAD_FAILED` / `UPLOAD_FAILED` | Storage I/O |

---

## Analytics events (PostHog)

| Event | When |
|-------|------|
| `convert_page_viewed` | `/convert` mount |
| `convert_upload_started` / `_completed` | Upload lifecycle |
| `convert_job_created` | After createJob |
| `convert_job_completed` / `_failed` | Poll result |
| `convert_download` | MP3/WAV download |
| `convert_paywall_viewed` | Premium CTA from Convert |
| `paywall_shown` | source=`convert` |

---

## Soft launch sequence

1. **Internal** — team accounts only (1–2 days)  
2. **Beta** — 20–50 friendly users; watch fail rate + processingMs  
3. **Public** — homepage Convert card + Technology CTA; monitor p95 job time  

**Kill switch:** `RIH_CONVERT_ENABLED=false` (upload + tRPC create blocked; worker does not start).

### Scale knobs (Phase 4)

| Env | Default | Meaning |
|-----|---------|---------|
| `CONVERT_WORKER_CONCURRENCY` | `1` | Parallel jobs per process (max 4) |
| `CONVERT_STALE_MINUTES` | `30` | Fail stuck `processing` jobs |
| Horizontal | — | Run multiple app instances; DB claim is optimistic |

Subdomain: see `docs/CONVERT_SUBDOMAIN.md`. Mobile status UI: app route `/convert`.

---

## Cron

| Path | Purpose |
|------|---------|
| `POST /api/scheduled/convert-expire` | Mark completed jobs past `expiresAt` as `expired` |

Auth: Manus cron or `Authorization: Bearer $CRON_SECRET`.

---

*— End of soft-launch checklist —*
