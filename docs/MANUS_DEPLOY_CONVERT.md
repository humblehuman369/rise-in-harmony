# Manus prompt — Deploy TrueHz Convert (latest main)

Copy everything inside the block below into Manus as the user instruction / agent task.

---

## Prompt for Manus (copy from here)

```
You are deploying Rise In Harmony production from GitHub so TrueHz Convert is live.

## Goal
Production at https://www.riseinharmony.com must serve the Convert feature from GitHub main.
Current production is STALE: convert.status returns NOT_FOUND and the JS bundle has no Convert code.

## Source of truth
- Repo: https://github.com/humblehuman369/rise-in-harmony
- Branch: main
- Minimum commit (must be at or after): 78bd474
  - 580cdb9 — feat(convert): ship Phase 3–4 and production deploy artifacts
  - 78bd474 — fix(mobile): add missing expo-haptics dependency
- Do NOT deploy from an old sandbox snapshot or Jul 14 build.

## Steps (do in order)

### 1) Sync code
1. Pull / sync the project from GitHub origin main.
2. Confirm `git rev-parse HEAD` and `git log -1 --oneline` show main at/after 78bd474.
3. Confirm these paths exist in the tree:
   - client/src/pages/Convert.tsx
   - server/routers/convert.ts
   - server/lib/convert/worker.ts
   - server/_core/convertUpload.ts
   - drizzle/0009_convert_jobs.sql
   - drizzle/0010_convert_formant.sql
   - Dockerfile

### 2) Database migrations (production MySQL)
Apply on the PRODUCTION database (same DATABASE_URL used by the live app):

1. Run drizzle/0009_convert_jobs.sql
   - Creates table convert_jobs (+ indexes/FK)
2. Run drizzle/0010_convert_formant.sql
   - Adds formantPreserve boolean to convert_jobs

If a migration is already applied, skip safely (do not drop data).
If you use Manus db:push / drizzle migrate instead of raw SQL, ensure convert_jobs and formantPreserve end up on production.

Verify with SQL:
  SHOW TABLES LIKE 'convert_jobs';
  DESCRIBE convert_jobs;
  -- must include: publicId, status, sourceKey, sourcePitchA, targetPitchA, formantPreserve, hybridEnabled

### 3) Environment variables (production)
Ensure these are set (do not print secret values back to the user):

Required (existing app):
- NODE_ENV=production
- JWT_SECRET (≥32 chars)
- DATABASE_URL
- BUILT_IN_FORGE_API_URL
- BUILT_IN_FORGE_API_KEY
- APP_URL=https://www.riseinharmony.com

Strongly recommended for Convert:
- RIH_CONVERT_ENABLED=true
- CONVERT_WORKER_CONCURRENCY=1
- CONVERT_STALE_MINUTES=30
- RESEND_API_KEY + RESEND_FROM_EMAIL (job-ready emails)
- RIH_STRIPE_* if Premium paywall should work on web

Optional later:
- CONVERT_WORKER_CONCURRENCY=2 (only if host has CPU headroom)

### 4) DSP tools on the runtime host
TrueHz Convert offline processing needs CLI tools on PATH:
- ffmpeg
- ffprobe
- rubberband (rubberband-cli package)

Verify after install:
  which ffmpeg ffprobe rubberband
  ffmpeg -version | head -1
  rubberband -V || rubberband --version

If the platform cannot install system packages, build/run from the repo Dockerfile
(which installs ffmpeg + rubberband-cli on node:22-bookworm-slim).

Without these tools, upload may work but jobs fail with TOOLING_MISSING.

### 5) Build and deploy
1. Install deps: pnpm install --frozen-lockfile (or platform equivalent)
2. Build: pnpm build
   - Must produce dist/index.js and dist/public/ assets
3. Deploy/restart the production web+API service so it runs:
   NODE_ENV=production node dist/index.js
   (or platform start command that uses the new build)
4. Ensure the Convert worker starts (server starts it when RIH_CONVERT_ENABLED is not false).
5. Do a full restart so old process/bundle is gone (no sticky old assets only).

### 6) Post-deploy verification (required — report results)
Run these checks against https://www.riseinharmony.com and report pass/fail:

A) API — Convert router mounted
  curl -sS "https://www.riseinharmony.com/api/trpc/convert.status"
  - MUST NOT return: No procedure found on path "convert.status"
  - Unauthenticated may return UNAUTHORIZED (401) — that is OK
  - 404 NOT_FOUND for missing procedure = DEPLOY FAILED

B) SPA bundle includes Convert
  Fetch homepage HTML, find the /assets/index-*.js name.
  curl that JS file and confirm it contains at least one of:
    "TrueHz Convert"  OR  "/api/convert"  OR  "formantPreserve"
  Zero matches = old frontend still live.

C) Routes
  GET /convert → 200 HTML
  GET /technology → 200 HTML
  Prefer GET /healthz → JSON {"ok":true,...} if the Express health routes are active
  (if /healthz still returns SPA HTML, note it but do not block if A+B pass)

D) Optional smoke (if you have a test user session)
  - Open /convert
  - Sign in
  - Rights checkbox required before upload
  - Upload a short MP3, A=440→432, job reaches completed
  - Download MP3 works

### 7) Cron (optional but recommended)
Schedule or document:
  POST /api/scheduled/convert-expire
Auth: Manus cron identity or Authorization: Bearer $CRON_SECRET
Purpose: mark expired convert library rows past TTL.

## Success criteria (all required)
1. Production git/build is main @ ≥ 78bd474
2. convert_jobs table exists with formantPreserve
3. convert.status is NOT a missing-procedure 404
4. Production JS bundle contains Convert markers
5. ffmpeg + ffprobe + rubberband available on the worker host (or Dockerfile deploy)

## Failure modes to fix if seen
| Symptom | Fix |
|---------|-----|
| convert.status path not found | Server not redeployed / old process still running |
| Bundle has no Convert strings | Frontend assets not rebuilt/redeployed; clear CDN if any |
| Jobs fail TOOLING_MISSING | Install ffmpeg/ffprobe/rubberband or use Dockerfile |
| Jobs fail DOWNLOAD_FAILED / upload 500 | Forge storage env missing |
| Table doesn't exist | Run 0009 + 0010 migrations |
| PREMIUM_REQUIRED on free basics | Expected for hybrid/formant/high/WAV only |

## Do NOT
- Do not deploy mobile EAS unless asked (web only for this task)
- Do not drop or wipe the production database
- Do not disable RIH_CONVERT_ENABLED unless rolling back
- Do not claim success without verification steps A and B passing

## Report back to the user
Return a short deploy report:
- Deployed commit SHA
- Migration status (0009/0010)
- DSP tools present? (yes/no + versions)
- convert.status result (status code + whether procedure exists)
- Bundle filename + whether Convert markers found
- Any remaining blockers
```

---

## Short version (if Manus has a token limit)

```
Deploy Rise In Harmony web from GitHub main ≥ commit 78bd474
(https://github.com/humblehuman369/rise-in-harmony).

1. Pull latest main (not old sandbox).
2. Apply production SQL migrations:
   drizzle/0009_convert_jobs.sql
   drizzle/0010_convert_formant.sql
3. Ensure env: RIH_CONVERT_ENABLED=true, storage forge keys, DATABASE_URL, JWT_SECRET, APP_URL.
4. Install ffmpeg, ffprobe, rubberband on host (or deploy Dockerfile).
5. pnpm install && pnpm build && restart production so dist/index.js serves new assets.
6. Verify:
   - /api/trpc/convert.status is NOT "No procedure found"
   - Production index-*.js contains "TrueHz Convert" or "/api/convert"
7. Report commit SHA, migration status, DSP tools, and verification results.

Current production is stale (convert router missing). Full redeploy required.
```

---

## After Manus reports success

Human smoke test:

1. Open https://www.riseinharmony.com/convert  
2. Sign in → accept rights checkbox → upload short track → 440→432  
3. Confirm job completes and MP3 downloads  
4. Optional: Premium hybrid bed / formant  

Details: `docs/CONVERT_SOFT_LAUNCH.md`
