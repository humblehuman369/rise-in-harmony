# Production Hardening Status

Last updated: 2026-07-14

This document tracks security, reliability, and ops work completed against the
production-readiness review. Use it as a launch checklist and handoff note.

## Status overview

| Tier | Status | Summary |
| --- | --- | --- |
| **S0 Critical** | Done | IDOR, webhooks fail-closed, JWT boot checks, rate limits, storage auth, port bind, mobile assets CI |
| **S1 High** | Done | Session TTL, cookies, email HTML escape, delete/export, expiry, founder race, webhook idempotency, privacy |
| **S2 Medium** | Done | `lastSignedIn` throttle, DB pool, streak TZ, `/healthz` `/readyz`, premium gates, onboarding parity, frozen lockfile |
| **S3 Polish** | Done | Re-engagement cron, admin role UI/API, deps cleanup, env example, this checklist |

## S0 — Critical

- [x] Session `end` ownership (`userId` in WHERE)
- [x] RevenueCat webhook fail-closed + constant-time compare
- [x] `JWT_SECRET` ≥ 32 chars required in production
- [x] JSON body 1mb + `helmet` + rate limits
- [x] Production binds fixed `PORT` only
- [x] Private `user-sounds/*` storage requires owner auth
- [x] Mobile required audio assets CI gate

## S1 — High

- [x] Access JWT 7d / refresh 30d; mobile refresh re-issues pair
- [x] Production cookies: `SameSite=Lax` + `Secure`
- [x] Email HTML escaping
- [x] Account delete (Stripe cancel + RC revoke + cookie clear)
- [x] Full data export (sessions, alarms, presets, favorites, …)
- [x] Premium expiry enforcement
- [x] Founder seat atomic claim
- [x] Webhook `externalEventId` idempotency (run migration `0007`)
- [x] Production-safe ErrorBoundary
- [x] Privacy policy accuracy + claim language soft scrub
- [x] Structured JSON logger + expanded env warnings

## S2 — Medium

- [x] Throttled `lastSignedIn` (15 min)
- [x] mysql2 connection pool (`DB_POOL_SIZE`)
- [x] Streak calendar days in user timezone preference
- [x] `GET /healthz`, `GET /readyz`
- [x] `server/index.ts` shim → `_core`
- [x] Server premium gates (uploads, free sound limit)
- [x] Mobile tRPC wire format hardened
- [x] Shared onboarding frequency map (web + mobile)
- [x] CI `pnpm install --frozen-lockfile`

## S3 — Polish

- [x] Bulk re-engagement: `POST /api/scheduled/re-engagement`
- [x] Admin `setUserRole` + UI promote/demote
- [x] Admin “Run re-engagement” button
- [x] Removed accidental `add` npm dependency
- [x] `.env.example` + this hardening doc
- [x] `system.health` input optional (prefer HTTP healthz)

## Launch go/no-go

**Must be true before public paid traffic:**

1. Production env matches `.env.example` (especially `JWT_SECRET`, `DATABASE_URL`, webhook secrets)
2. Migration `0007_webhook_idempotency` applied
3. Stripe + RevenueCat webhooks verified end-to-end in staging
4. Mobile audio assets are real loops (not CI placeholders) for store builds
5. `/readyz` green behind the load balancer
6. Re-engagement cron registered (Manus Heartbeat or external with `CRON_SECRET`)

### Register re-engagement cron

**Option A — Manus Heartbeat** (platform cron, path must start with `/api/scheduled/`):

```
name: re-engagement-daily
cron: 0 0 15 * * *   # 15:00 UTC daily
path: /api/scheduled/re-engagement
method: POST
```

Auth uses the Manus cron session (`user.isCron`).

**Option B — External cron** (Railway, GitHub Actions, etc.):

```bash
curl -X POST "https://www.riseinharmony.com/api/scheduled/re-engagement" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"limit":100}'
```

## Phase 2 — Retain (implemented 2026-07-14)

- [x] Personal Resonance Insights (`insights.weekly`) + Dashboard card
- [x] Programs catalog + enroll/completeDay + web `/programs` + mobile screen
- [x] Wind-down alarm `kind` (`wake` | `wind_down`) with free tier 1 per kind
- [x] Streak freezes (1/month premium) + weekly-insights cron freezes refresh
- [x] Migration `0008_phase2_retain.sql`
- [ ] Register `POST /api/scheduled/weekly-insights` (Monday cron)

## Intentionally deferred

| Item | Why |
| --- | --- |
| MySQL → Postgres migration | Infrastructure project; schema still MySQL |
| Full refresh-token denylist | Needs token store table; TTL reduction is interim control |
| Aggressive UI package tree-shaking | Radix/shadcn kit used across app; remove only proven-dead routes |
| Sentry APM | Structured logs in place; add when on-call is staffed |
| Full e2e suite | Unit coverage expanded; Playwright deferred |

## Key scripts

```bash
pnpm check                 # typecheck
pnpm test                  # vitest (server)
pnpm check:mobile-assets   # required studio audio files
pnpm dev                   # server/_core + vite
pnpm build && pnpm start   # production bundle
```

## Security contacts

Report vulnerabilities to privacy@riseinharmony.com (or the address in Privacy Policy).
