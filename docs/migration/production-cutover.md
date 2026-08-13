# Production cutover — what "riseinharmony.com is live on the new stack" requires

Sprint 1 deliberately built **staging only**. This is the plan for production.

Written 2026-08-13, after staging came up. Nothing here has been executed.

---

## Where production actually is today

Verified live, not assumed:

| | Current |
|---|---|
| `www.riseinharmony.com` | CNAME → `rihmobile-production.up.railway.app` → `69.46.46.105`, `server: railway-hikari` |
| apex `riseinharmony.com` | `A` → same Railway IP, **no valid certificate** (see §7) |
| `api.riseinharmony.com` | **does not exist** — the API is served through `www` |
| Railway `production` | `@rih/mobile` (combined web + API) and `MySQL`. No dispatcher, no split. |
| Vercel | only `rise-in-harmony-staging`. No production project. |
| Alarm delivery | external minute-cron → `/api/scheduled/fire-alarms` → `fireAlarmsNow()`, matching on the container's local clock |
| Migrations | **never applied by any deploy** — see §2 |
| Identity | Manus OAuth (`https://api.manus.im`) |
| Media | Manus CDN |

---

## The order that matters

Each phase gates the next. Skipping ahead is where outages come from.

```
1  Finish Sprint 1 (shadow validation)      ← multi-day, blocks everything
2  Production database backup + restore test ← blocks the merge to main
3  Merge staging → main                      ← first real migration run, ever
4  Build production Railway services         ← additive, no user impact
5  Build production Vercel project           ← additive, no user impact
6  DNS cutover                               ← the visible moment
7  Fix the apex certificate
8  Retire the cron + shadow off              ← must be ONE change
9  Leave Manus (OAuth, media, storage)       ← the long tail
```

---

## 1. Finish Sprint 1 first

Nothing below is safe until:

- [ ] Stripe **test** keys set on staging `rih-api`, secrets sealed
- [ ] 3+ days of shadow observation pass every criterion in [shadow-mode-runbook.md](./shadow-mode-runbook.md)
- [ ] Restart and duplicate-worker drills pass
- [ ] Every dispatcher/cron disagreement is explained by timezone, not by a scheduling bug
- [ ] CI's `promote-staging` job works (as of writing it did not promote `b9846d4`)

If shadow mode shows the dispatcher computing the wrong occurrences, **stop**. The whole point of Sprint 1 is to find that here rather than at 6am in production.

---

## 2. Production database backup — the highest-risk item in this document

Migrations have **never run in production**. `runMigrations` resolved `/drizzle`
instead of `/app/drizzle` in the bundled build, threw `ENOENT`, and the caller
treats that as non-fatal. Three separate bugs were fixed in Sprint 1
(`dc39b1c`, `62e9f5c`, `6119392`).

**Consequence: the first production deploy from `main` after the merge will
attempt all 19 migrations at once.**

Audited before shipping — all 19 files are pure additive DDL:

```
32 ALTER TABLE   13 CREATE TABLE   5 CREATE INDEX
 0 INSERT / UPDATE / DELETE / DROP / TRUNCATE / RENAME
```

and the runner now correctly skips `already exists` / `Duplicate column name`
through drizzle's error wrapper. So the expected outcome is "creates only what is
genuinely missing." But this has never executed against production data.

Required before the merge:

- [ ] Full logical backup per [scripts/backup-db.md](../../scripts/backup-db.md)
      (`brew install mysql-client` first — it is not installed)
- [ ] **Restore that dump into a scratch database and run the API against it**,
      so the migration run is observed somewhere disposable first
- [ ] Record which of the 19 migrations report `Applied` vs `skipping
      already-applied` in the scratch run — that is the expected production shape
- [ ] Keep the dump until production has been stable for a week

Do not treat a green deploy as proof. The runner is still non-fatal on failure;
check the logs for `[migrations] Applied N migration(s)`.

---

## 3. Merge `staging` → `main`

A reviewed PR, not a fast-forward. This carries every Sprint 1 change plus the
four bug fixes.

- [ ] PR from `staging` to `main`, reviewed
- [ ] CI green
- [ ] Merge
- [ ] **Watch the `@rih/mobile` deploy logs for the migration run** — this is the
      moment §2 was preparing for

Note `@rih/mobile` still deploys from `main` as a combined web+API service. The
merge does not by itself change what users see; `vercel.json` and the split build
scripts are inert until production services are pointed at them.

---

## 4. Production Railway services

Mirror staging, in the `production` environment. Additive — `@rih/mobile` keeps
serving users the whole time.

- [ ] `rih-api` — root `Dockerfile`, branch `main`, health check `/readyz`
- [ ] Production variable set (§3.1 of [railway-setup.md](./railway-setup.md)),
      with **live** Stripe keys this time
- [ ] **`RIH_VAPID_PUBLIC_KEY` / `RIH_VAPID_PRIVATE_KEY` — copy from `@rih/mobile`.
      Do NOT generate new ones.** See the warning below.
- [ ] `rih-alarm-dispatcher` — `RAILWAY_DOCKERFILE_PATH=Dockerfile.alarm-dispatcher`,
      **no domain**, `ALARM_SHADOW_MODE=true` initially, DB + VAPID + `ALARM_*` only
- [ ] `api.riseinharmony.com` custom domain on `rih-api` → add the CNAME + TXT
      Railway generates
- [ ] Verify `https://api.riseinharmony.com/readyz` → `{"ok":true,"db":true}`

> ### ⚠️ Do not rotate the production VAPID keypair
>
> Verified 2026-08-13: `@rih/mobile` **already has a VAPID keypair** (public key
> 87 chars, fingerprint `ae8d7c9ccd67`; private key 43 chars). It is **not** the
> production pair generated during Sprint 1.
>
> A Web Push subscription is cryptographically bound to the VAPID key it was
> created with. Changing the server key does not invalidate subscriptions
> loudly — pushes simply stop being accepted, so **every alarm on every existing
> device silently stops firing**, with no error visible to the user until they
> miss a wake-up.
>
> So: the production `rih-api` and `rih-alarm-dispatcher` must be given the
> **existing** `@rih/mobile` keypair, copied across without being displayed:
>
> ```bash
> railway variables --service "@rih/mobile" --environment production --json \
>   | jq -r .RIH_VAPID_PRIVATE_KEY \
>   | railway variables --service rih-api --environment production \
>       --set-from-stdin RIH_VAPID_PRIVATE_KEY
> ```
>
> The pair in `~/rih-secrets/vapid-production.env` is therefore **unused**. Keep
> it only if you ever deliberately rotate — which requires every device to
> re-subscribe, so it is a user-visible migration, not a config change.
>
> Staging correctly uses its own distinct keypair: a staging device must never be
> able to receive production alarm pushes.

---

## 5. Production Vercel project

- [ ] New project `rise-in-harmony` (not `-staging`) in the **Rise-In-Harmony**
      team, root directory `.`, framework Vite
- [ ] Production Branch `main` — the default, so the bug that blocks staging
      (§2.1 of [vercel-setup.md](./vercel-setup.md)) may not apply here. Verify
      via the API rather than trusting the dashboard.
- [ ] `VITE_API_BASE_URL=https://api.riseinharmony.com`, `VITE_APP_ENV=production`,
      plus the PostHog and Manus values
- [ ] Deploy and verify on the `*.vercel.app` URL **before** touching DNS:
      SPA deep links, `/audio/*.mp3`, and a clean bundle scan
- [ ] If `promote-staging`-style automation is needed here too, generalise that job

---

## 6. DNS cutover — the visible moment

Only after §5 verifies on the Vercel URL.

- [ ] Lower `www` TTL to 600s **at least a day ahead**, so rollback is fast
- [ ] `www` CNAME: `rihmobile-production.up.railway.app` → the Vercel target
- [ ] Keep `@rih/mobile` running and untouched — it is the rollback
- [ ] Verify: sign-in, alarm create/edit, audio playback, Stripe checkout
- [ ] Watch for 24h before changing anything else

**Rollback:** point `www` back at `rihmobile-production.up.railway.app`. With a
600s TTL this is minutes, which is exactly why the TTL change comes first.

---

## 7. Fix the apex certificate

Pre-existing and live today: `https://riseinharmony.com` without `www` fails TLS.

```
curl: (60) SSL: no alternative certificate subject name matches
subject=CN=*.up.railway.app
```

The apex `A` record points at a shared Railway edge IP, but the apex was never
completed as a custom domain there, so no certificate was issued. Anyone typing
the bare domain gets a full-page browser warning.

- [ ] Either complete the apex as a custom domain on whichever service serves it,
      or replace the `A` record with a GoDaddy forwarding rule to `www`
- [ ] Verify `curl https://riseinharmony.com` returns 200 with a valid certificate

Worth doing regardless of the migration — it costs signups today.

---

## 8. Retire the cron and turn shadow off — one change

> **The single most dangerous step in this document.**
>
> Setting `ALARM_SHADOW_MODE=false` while the external minute-cron is still
> calling `/api/scheduled/fire-alarms` **double-sends every alarm**. Users get two
> notifications for every wake-up.

- [ ] Disable the external minute-level cron
- [ ] In the same change, set `ALARM_SHADOW_MODE=false` on the production dispatcher
- [ ] Watch the first morning wave closely — real users, real alarms
- [ ] `/api/scheduled/fire-alarms` **stays** as the authenticated break-glass
      adapter over `runDispatchCycle()`. Do not delete it.

Rollback: set `ALARM_SHADOW_MODE=true` and re-enable the cron, in that order.

---

## 9. Leaving Manus — the long tail

None of this blocks the DNS cutover, but the migration is not finished until it
is done. Each is its own piece of work.

| Dependency | Current | Notes |
|---|---|---|
| **OAuth / identity** | `https://api.manus.im` | The hardest. Options and tradeoffs in [oidc-provider-options.md](./oidc-provider-options.md). Requires a user-migration plan, not just a provider swap. |
| **Media CDN** | Manus CDN | Masters already exported and checksummed — see `media-export/manifest.json`. Still needs a new host and a catalog URL change. |
| **Forge storage** | `forge.butterfly-effect.dev` | Used by Convert. `Map.tsx` also references it but is dead code. |

> **Keep the Manus account alive until OAuth and storage are migrated.** Media is
> already safe locally; identity and storage are not.

---

## What is genuinely done

Staging is fully operational and proves the architecture:

```
app-staging.riseinharmony.com   Vercel, SPA rewrite, clean bundle
api-staging.riseinharmony.com   Railway, {"ok":true,"db":true}
rih-alarm-dispatcher            shadow mode, 30s loop, no domain, least privilege
MySQL-Bbsi                      private-only, 19 migrations applied
```

Production has been untouched throughout Sprint 1.
