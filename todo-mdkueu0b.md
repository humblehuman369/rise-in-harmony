# Rise In Harmony — Deploy Session TODO

## TrueHz Convert Production Deploy

- [x] Sync webdev project to GitHub main ≥ 78bd474 (9830d69)
- [x] Verify Convert files exist: Convert.tsx, convert.ts router, worker.ts, convertUpload.ts, 0009/0010 SQL
- [x] Apply migration drizzle/0009_convert_jobs.sql
- [x] Apply migration drizzle/0010_convert_formant.sql
- [x] Verify convert_jobs table has formantPreserve column
- [x] Set env: RIH_CONVERT_ENABLED=true
- [x] Set env: CONVERT_WORKER_CONCURRENCY=1
- [x] Set env: CONVERT_STALE_MINUTES=30
- [x] Verify Dockerfile present with ffmpeg + rubberband-cli
- [x] Build and checkpoint
- [x] Publish to production
- [x] Verify: /api/trpc/convert.status is NOT "No procedure found" (returns 401 UNAUTHORIZED — correct)
- [x] Verify: production JS bundle contains "TrueHz Convert" or "/api/convert" (3 markers found)
- [x] Verify: convert_jobs table exists with formantPreserve (confirmed)
- [x] Report commit SHA + all verification results
