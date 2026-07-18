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

## EC2 Upload Relay Integration (Large File Upload Fix)

- [x] EC2 relay server running on cloud computer (34.23.137.141:4567)
- [x] Relay health check confirmed: GET /health → {"ok":true}
- [x] UFW port 4567 opened on cloud computer
- [x] Add relay config to server/_core/env.ts (relayUrl, relayAuthSecret)
- [x] Add getRelayToken procedure to server/routers/convert.ts (HMAC-SHA256, 5-min window)
- [x] Rewrite client/src/lib/convertUpload.ts to use relay for files > 2 MB
- [x] Add video format support (MP4, MKV, MOV, AVI, WEBM) to convertUpload.ts
- [x] Update Convert.tsx file input accept attribute to include video formats
- [x] Increase premium maxFileBytes from 100 MB to 500 MB in limits.ts
- [x] Set RIH_RELAY_AUTH_SECRET project secret
- [x] All 106 tests pass (including 4 new relay.token.test.ts tests)
- [x] Production build verified: relay markers in server + client bundles
- [x] Checkpoint and publish (checkpoint 7478b74e saved — ready to Publish)

## Cloudflare Tunnel Fix (Mixed Content / HTTPS)

- [x] Diagnose root cause: browser blocks HTTP XHR from HTTPS page (mixed content)
- [x] Install cloudflared on cloud computer
- [x] Create start-tunnel.sh script that captures tunnel URL to file
- [x] Create rih-tunnel systemd service (auto-starts with rih-upload-relay)
- [x] Tunnel URL: https://vids-touch-distributed-newark.trycloudflare.com
- [x] Update env.ts default relayUrl to HTTPS tunnel URL
- [x] Update CSP connect-src to https://*.trycloudflare.com wildcard
- [x] Set RIH_RELAY_URL secret to HTTPS tunnel URL
- [x] Add relay.url.test.ts to validate tunnel reachability (107 tests pass)
- [x] Production build clean
- [x] Checkpoint and publish (checkpoint d0fef5a4 saved — ready to Publish)

## Upload Progress Enhancement (Speed + ETA)

- [x] Extend convertUpload.ts onProgress callback with bytes/speed/ETA metrics
- [x] Update Convert.tsx progress UI to show upload speed (MB/s) and time remaining
- [x] Verify visually, tests pass (116), checkpoint
