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

## Upload Still Failing (Post-Tunnel)

- [x] Diagnose: relay/tunnel logs, prod deploy state, reproduce failure (root causes: relay v1 buffered uploads in RAM → OOM-killed on files >~120MB; quick-tunnel URL rotates on restart → static RIH_RELAY_URL goes stale)
- [x] Rewrite relay to v2 disk-streaming (request → /tmp → node:https streaming PUT to S3; flat ~76MB RSS on 500MB file)
- [x] Add GET /tunnel-url endpoint to relay; resolveRelayUrl() in convert.ts fetches live URL with 60s cache + static fallback
- [x] Decouple rih-tunnel unit from relay restarts; add MemoryMax=700M + Restart=always to relay unit
- [x] Rewrite relay.url.test.ts for dynamic discovery chain (expects relay v2)
- [x] Verify end-to-end: 100MB (3.2s), 150MB via tunnel, 500MB (12s) all HTTP 200 → S3; 116 tests pass; build clean
- [x] Confirm final rih-tunnel.service has no Requires= dependency (only After=network-online.target, Restart=always)
- [x] Re-verify full production path on final relay v2: 150MB through live HTTPS tunnel → HTTP 200 → S3, relay RSS 91MB
- [x] Checkpoint and deliver (checkpoint 67098329 saved — ready to Publish)

## Network Connect Error Fix (Robust Relay URL Resolution)

- [x] Add server-side health check in resolveRelayUrl: verify candidate URL responds before returning it
- [x] Extend last-known-good cache (10 min grace) and add discovery retry; throw clear PRECONDITION_FAILED instead of returning a dead URL
- [x] Client: pre-flight GET /health on relayUrl before XHR upload; clearer error message with the relay hostname
- [x] Update RIH_RELAY_URL secret + env.ts fallback to current live tunnel URL
- [x] Verify: 116 tests pass (relay.url.test.ts validates live discovery chain), build clean, /convert renders
- [x] Checkpoint and deliver (checkpoint b327c7f1 saved — ready to Publish)

## Definitive Fix: Upload Fails at 95% (browser-identical repro)

- [x] Reproduce the exact browser flow against production from an external vantage (90MB via tunnel was sufficient to reproduce: stalled at 55MB/240s, died at CF edge before reaching the relay; tunnel since removed so larger tunnel repro is moot)
- [x] Capture the failing hop: browser→tunnel (Cloudflare quick tunnel throttles/drops large bodies)
- [x] Implement the definitive fix (Caddy + Let's Encrypt direct HTTPS, tunnel removed)
- [x] Verify with a real large upload through the production path (150MB from sandbox + 400MB from VM → HTTP 200 → S3, relay RSS 83MB)
- [ ] Checkpoint and deliver
- [x] Root cause confirmed: Cloudflare quick tunnel throttles/drops large request bodies (90MB test stalled at 55MB after 240s and died at CF edge; relay→S3 leg is 25MB/s). Fix = remove tunnel from upload path.
- [x] Install Caddy on VM: HTTPS on 443 for 34-23-137-141.sslip.io with Let's Encrypt, reverse_proxy to localhost:4567 (2GB body, 30m timeouts)
- [x] Open ports 443/80 in ufw; disable rih-tunnel; update AGENTS.md
- [x] Update app: static relay URL with health-check gate, CSP connect-src → sslip.io + manus-analytics.com, env fallback + RIH_RELAY_URL secret updated, relay.url.test.ts rewritten (118 tests pass)
- [x] Verify large upload through the new HTTPS endpoint from outside the VM (150MB sandbox + 400MB VM, both HTTP 200)
