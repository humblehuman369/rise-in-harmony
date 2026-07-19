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
- [x] Checkpoint and deliver (checkpoint dd1dd639 saved — ready to Publish)
- [x] Root cause confirmed: Cloudflare quick tunnel throttles/drops large request bodies (90MB test stalled at 55MB after 240s and died at CF edge; relay→S3 leg is 25MB/s). Fix = remove tunnel from upload path.
- [x] Install Caddy on VM: HTTPS on 443 for 34-23-137-141.sslip.io with Let's Encrypt, reverse_proxy to localhost:4567 (2GB body, 30m timeouts)
- [x] Open ports 443/80 in ufw; disable rih-tunnel; update AGENTS.md
- [x] Update app: static relay URL with health-check gate, CSP connect-src → sslip.io + manus-analytics.com, env fallback + RIH_RELAY_URL secret updated, relay.url.test.ts rewritten (118 tests pass)
- [x] Verify large upload through the new HTTPS endpoint from outside the VM (150MB sandbox + 400MB VM, both HTTP 200)

## Pinpointed Fix: net::ERR_SSL_BAD_* on /upload + Invalid URL TypeError (user DevTools evidence)

- [x] Diagnose: user's "health" row returned 106kB/10s = own-origin SPA HTML (real relay /health is 36 bytes) → relayUrl in the running tab was empty/invalid (stale browser-cached token response from an older deployment); fetch(url+"/health") resolved relative to own origin and falsely passed; upload XHR then failed and the error handler crashed on new URL(invalid)
- [x] Verify infra NOT at fault — concrete outputs saved to /home/ubuntu/relay-evidence-*.txt: openssl s_client → Verify return code 0 (ok), CN=34-23-137-141.sslip.io, issuer Let's Encrypt, TLSv1.3; curl /health → HTTP 200 {"ok":true,"v":2}; curl OPTIONS /upload with Origin https://www.riseinharmony.com → HTTP 204 with correct access-control-allow-* headers via Caddy
- [x] Note: stale-cached-token-response is the best-supported inference (106kB/10s "health" row = own-origin SPA HTML, real /health is 36 bytes JSON); regardless of which path produced the invalid relayUrl, sanitizeRelayUrl + no-store + JSON-strict health check close every such path
- [x] Fix client: sanitizeRelayUrl() validates server URL (must be absolute https) with hard fallback to https://34-23-137-141.sslip.io
- [x] Fix client: token fetch uses cache:"no-store" + _ts cache-buster (browser can never reuse stale response)
- [x] Fix client: health pre-flight now requires JSON body {ok:true} — rejects own-origin HTML impostor
- [x] Fix client: safeHostname() — XHR error handler can no longer crash on invalid URL
- [x] Fix server: getRelayToken sets Cache-Control: no-store
- [x] VM cleanup: removed stale tunnel-url.txt (relay /tunnel-url no longer advertises dead tunnel)
- [x] New relay.sanitize.test.ts contract tests (8 tests); 126 tests pass; tsc clean; build clean
- [x] Checkpoint and deliver (checkpoint f72b2a90 saved — ready to Publish)

## "Token has expired" on Upload (relay 401, user report)

- [x] Diagnose with relay-side evidence: relay log shows `401: malformed token (1 parts, len 9)`; Caddy access log shows `X-Auth-Token: undefined` — the browser sent the literal string "undefined" (9 chars)
- [x] Root cause: server uses superjson transformer so getRelayToken payload is nested under `result.data.json`, but the raw-fetch client parsed `result.data.token` → undefined → header "undefined" → relay 401 → client mapped 401 to "Upload token expired"
- [x] Fix client: parse `result.data.json` (with fallback to `result.data`), validate token against `^\d{9,12}\.[0-9a-f]{64}$` before sending, clear error if invalid
- [x] Infra: added verbose 401-reason logging to relay verifyToken; enabled Caddy access log (/var/log/caddy/relay-access.log); updated AGENTS.md
- [x] Add regression test for superjson response-shape parsing (server/relay.tokenshape.test.ts, 7 tests incl. live wire-contract check against dev server)
- [x] Run full test suite + tsc + build (133/133 pass, tsc clean, build clean, fix marker present in client bundle)
- [x] Verify the fixed flow end-to-end: server/relay.e2e-parse.test.ts calls the REAL getRelayToken procedure, serializes its output byte-for-byte as the browser wire format, runs it through the identical client parsing, and completes a REAL upload to the live relay (HTTP 200); also proves the pre-fix parsing yields the literal "undefined" from the same payload
- [x] Update VM AGENTS.md with new Caddy access log + relay 401-reason logging
- [x] Checkpoint and deliver (checkpoint 6ad911de — ready to Publish)

## Post-token-fix upload issues (user report 2026-07-19)

- [x] Diagnose attempt 1: Caddy log 04:39:41 — POST /upload status 0 after 0.52s with a VALID token; relay journal "Upload error: aborted" — browser/HTTP2 stream aborted early (transient); client showed generic "Network error"
- [x] Diagnose attempt 2: upload SUCCEEDED (Chakra-sleep.mp3, 37.5 MB → 200 in 5.67s, stored at convert-uploads/Chakra-sleep_e78fd761.mp3) but convert_jobs table is EMPTY — relay returns key `convert-uploads/<file>` while assertSourceKey requires `convert/{userId}/...` → createJob rejected with "Invalid sourceKey" → UI reset ("audio disappeared")
- [x] Fix key mismatch: relay accepts validated x-file-key header (^convert/[A-Za-z0-9._/-]{1,400}$, no .. or //), stores at exactly that key; legacy convert-uploads/ fallback kept; deployed + restarted + curl-verified on VM
- [x] getRelayToken now returns keyPrefix = convert/{userId}/{nanoid12}/ so stored keys satisfy assertSourceKey
- [x] Client passes x-file-key; on createJob failure keeps upload in pendingUpload state with "Retry conversion" / "Dismiss" banner (no re-upload of huge files)
- [x] Client auto-retries the relay POST once (1.5s backoff) on transient network error (fixes attempt-1 failure)
- [x] Relay restricts x-file-key to convert/ prefix; traversal + foreign prefixes fall back to safe legacy key (security-tested)
- [x] Tests updated: e2e-parse now asserts exact per-user key round-trip, legacy fallback, and traversal rejection (138/138 pass, tsc clean, build clean)
- [x] VM AGENTS.md updated with x-file-key protocol + incident #2 notes
- [ ] Checkpoint and deliver
