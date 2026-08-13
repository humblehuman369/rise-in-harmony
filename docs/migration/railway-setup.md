# Railway staging setup

Click-by-click. Creates a `staging` environment with its own MySQL, the API
service, and the private alarm-dispatcher worker. **No production values are
touched, and nothing here changes production traffic.**

Prerequisite: the `staging` branch exists on GitHub and this sprint's PR is
merged into it.

> **Rule that matters most:** staging and production must never share a
> database, a VAPID keypair, or a Stripe secret. A staging device that subscribes
> with the production VAPID key will receive real users' alarm pushes.

---

## 1. Create the staging environment

1. Railway → your Rise In Harmony project → environment dropdown (top left).
2. **New Environment** → name it `staging`.
3. Choose **Empty environment**, not a fork of production. Forking copies
   production variables, which is exactly what we are avoiding.

If your access policy requires harder separation, create a separate Railway
*project* instead. Either is fine; sharing a database is not.

---

## 2. Add staging MySQL

1. In the `staging` environment: **+ New** → **Database** → **Add MySQL**.
2. Rename it `MySQL` (its default) so `${{MySQL.DATABASE_URL}}` references work.
3. Do **not** attach the production volume, and do not paste the production
   `DATABASE_URL` anywhere in this environment.

The private `DATABASE_URL` is what services use. The public proxy URL is only for
your laptop (restores, inspection) — never for app traffic.

---

## 3. Create the `rih-api` service

1. **+ New** → **GitHub Repo** → `humblehuman369/rise-in-harmony`.
2. Name the service **`rih-api`**.
3. **Settings → Source**: set **Branch = `staging`**. Enable automatic deploys.
4. **Settings → Build**: Builder = **Dockerfile**, path `Dockerfile`.

   > The existing root `Dockerfile` still builds web + API together via
   > `pnpm build` (kept as an alias of `build:legacy`, so nothing breaks today).
   > Once Vercel owns the web client, switch this service to an API-only build —
   > `pnpm build:api` / `pnpm start:api` — so Railway stops building Vite.
   > That switch is deliberately **not** part of this sprint.

5. **Settings → Deploy**:
   - **Health check path: `/readyz`**
   - Health check timeout: 300 seconds
   - Restart policy: **On failure**, max 3 retries

   > Use `/readyz`, not `/healthz`. `/healthz` is liveness only — it returns 200
   > as soon as the process is up, even with no database. `/readyz` returns 200
   > only after the MySQL pool answers, which is what should gate traffic to a
   > new deployment. (The Sprint brief said `/health`; this repo's actual routes
   > are `/healthz` and `/readyz` — see server/_core/index.ts.)

### 3.1 API variables

**Variables** tab → **Raw Editor** is fastest. Replace every `REPLACE_ME`.

```bash
NODE_ENV=production
APP_ENV=staging
PORT=3000
RELEASE_SHA=${{RAILWAY_GIT_COMMIT_SHA}}

DATABASE_URL=${{MySQL.DATABASE_URL}}

APP_URL=https://app-staging.riseinharmony.com
WEB_ORIGIN=https://app-staging.riseinharmony.com
API_PUBLIC_ORIGIN=https://api-staging.riseinharmony.com
CORS_ALLOWED_ORIGINS=https://app-staging.riseinharmony.com

JWT_SECRET=REPLACE_ME_32_PLUS_RANDOM_CHARS
CRON_SECRET=REPLACE_ME_RANDOM

# Stripe TEST mode only in staging
RIH_STRIPE_SECRET_KEY=sk_test_REPLACE_ME
RIH_STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME_STAGING_ENDPOINT

RESEND_API_KEY=re_REPLACE_ME_STAGING
RESEND_FROM_EMAIL=staging@riseinharmony.com

# Web Push — STAGING keypair, generated separately from production
RIH_VAPID_PUBLIC_KEY=REPLACE_ME_STAGING_PUBLIC
RIH_VAPID_PRIVATE_KEY=REPLACE_ME_STAGING_PRIVATE
RIH_VAPID_EMAIL=mailto:hello@riseinharmony.com

RIH_ADMIN_EMAILS=brad@geisen.cc

# Manus values, still required until the identity migration (out of scope here)
VITE_APP_ID=REPLACE_ME
OAUTH_SERVER_URL=REPLACE_ME
VITE_OAUTH_PORTAL_URL=REPLACE_ME
OWNER_OPEN_ID=REPLACE_ME
```

Generate the secrets:

```bash
openssl rand -base64 48
```

Generate the staging VAPID keypair:

```bash
npx web-push generate-vapid-keys
```

**Seal** (Railway: variable → ⋯ → Seal) `JWT_SECRET`, `CRON_SECRET`,
`RIH_STRIPE_SECRET_KEY`, `RIH_STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, and
`RIH_VAPID_PRIVATE_KEY`. Sealed values cannot be read back — record them in your
password manager first.

**Never set on this service:** production `DATABASE_URL`, live Stripe keys, or
production VAPID keys.

---

## 4. Custom domain `api-staging.riseinharmony.com`

1. `rih-api` → **Settings → Networking → Custom Domain**.
2. Enter `api-staging.riseinharmony.com`.
3. Railway shows **two** records — a CNAME and a TXT. Add **both** at your DNS
   provider. Railway will not route the domain until both validate.

   | Type | Name | Value |
   |---|---|---|
   | CNAME | `api-staging` | *(value Railway shows)* |
   | TXT | *(host Railway shows)* | *(value Railway shows)* |

4. Wait for both to show **Valid** in Railway, then confirm:

```bash
curl -i https://api-staging.riseinharmony.com/readyz
```

Expect `200` and `{"ok":true,"db":true}`. A `503` with `db:false` means the
service is up but cannot reach MySQL — check `DATABASE_URL`.

---

## 5. Migrations

**Read [dependency-ledger.md §2.2](./dependency-ledger.md) before changing anything here.**

This repository applies migrations from **application startup**:
`server/_core/index.ts` calls `runMigrations(db)` on every API boot. That runner tracks
applied files by filename in `__drizzle_migrations` (`id`, `tag`, `applied_at`).

Consequences for staging:

- Deploying `rih-api` is what applies `0016_alarm_dispatcher.sql`. There is no separate
  migrate step to run, and the dispatcher does **not** run migrations.
- **Do not run `drizzle-kit migrate` against this database.** drizzle-kit uses a
  `__drizzle_migrations` table with different columns (`hash`, `created_at`). Same name,
  incompatible shape. `drizzle/meta/_journal.json` is also already out of sync — it stops at
  `0012` while `0013` and `0015` are applied — so drizzle-kit has no accurate picture of state.
- The runner treats migration failure as **non-fatal**: the API starts anyway, possibly with
  missing columns. So verify explicitly rather than trusting a green deploy.

After the first `rih-api` deploy on the staging branch, confirm the migration actually landed:

```sql
SELECT tag, applied_at FROM `__drizzle_migrations` ORDER BY id DESC LIMIT 5;
SHOW TABLES LIKE 'alarm_delivery%';
SHOW TABLES LIKE 'dispatcher%';
DESCRIBE alarms;   -- expect a nullable `timezone` varchar(64)
```

`scheduledForUtc`, `nextAttemptAt`, `leaseExpiresAt`, `sentAt`, `completedAt` and the
heartbeat columns must all report type **`datetime`**, not `timestamp`:

```sql
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('alarm_delivery_attempts','alarm_delivery_targets',
                     'dispatcher_leases','dispatcher_heartbeats');
```

Any `timestamp` there means the wrong migration ran — stop and investigate.

> Moving to a one-shot pre-deploy migration gate (the pattern the Sprint brief specifies) is a
> worthwhile change, but it means reconciling the two tracking tables and removing the startup
> call. That is its own piece of work and is deliberately **not** part of this sprint.

---

## 6. Create the `rih-alarm-dispatcher` service

1. **+ New** → **GitHub Repo** → the same repository.
2. Name it **`rih-alarm-dispatcher`**.
3. **Settings → Source**: Branch = `staging`.
4. **Settings → Build**: Builder = **Dockerfile**.
   - Add a service variable **`RAILWAY_DOCKERFILE_PATH=Dockerfile.alarm-dispatcher`**
   - Leave the **start command blank** — the Dockerfile's `CMD` starts the worker.
5. **Settings → Deploy**: Restart policy **On failure**, max retries 10.
   The worker exits non-zero on unrecoverable config errors, so a crash loop
   here is a real signal.
6. **Settings → Networking: do NOT generate a domain and do not add one.**
   The dispatcher takes no inbound traffic. If a domain exists, remove it.
7. Do **not** use Railway Cron. Cron cannot run more often than every five
   minutes and expects the task to exit; this is an always-on worker.

> **Do not put `deploy.startCommand` in `railway.json`.** That file applies to every service
> built from this repository, so a single start command overrides the `CMD` of whichever
> Dockerfile each service uses. It previously pinned `node dist/index.js`, which made
> `rih-alarm-dispatcher` build the worker image and then crash with
> `Cannot find module '/app/dist/index.js'`. Both Dockerfiles declare the correct `CMD`
> already, so the start command is left unset and each service starts itself.

### 6.1 Dispatcher variables — least privilege

This service gets a **much smaller** set than the API. Do not copy the API's
variables across.

```bash
NODE_ENV=production
APP_ENV=staging
RELEASE_SHA=${{RAILWAY_GIT_COMMIT_SHA}}
RAILWAY_DOCKERFILE_PATH=Dockerfile.alarm-dispatcher

DATABASE_URL=${{MySQL.DATABASE_URL}}

# Same STAGING keypair as rih-api
RIH_VAPID_PUBLIC_KEY=REPLACE_ME_STAGING_PUBLIC
RIH_VAPID_PRIVATE_KEY=REPLACE_ME_STAGING_PRIVATE
RIH_VAPID_EMAIL=mailto:hello@riseinharmony.com

# Start in shadow mode. Do not change this until the runbook's exit criteria pass.
ALARM_SHADOW_MODE=true
ALARM_DEFAULT_TIMEZONE=America/New_York

ALARM_DISPATCH_INTERVAL_MS=30000
ALARM_DISPATCH_LEADER_LEASE_MS=90000
ALARM_DISPATCH_TARGET_LEASE_MS=90000
ALARM_DISPATCH_GRACE_MS=600000
ALARM_DISPATCH_BATCH_SIZE=100
ALARM_DISPATCH_CONCURRENCY=8
ALARM_MAX_ATTEMPTS=3
```

Seal `RIH_VAPID_PRIVATE_KEY`.

**The dispatcher must NOT receive** `RIH_STRIPE_SECRET_KEY`,
`RIH_STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `REVENUECAT_SECRET_KEY`,
`BUILT_IN_FORGE_API_KEY`, `JWT_SECRET`, or any identity client secret. It sends
push notifications; nothing else. Least privilege is the whole point of running
it as a separate service.

Constraint the process enforces at startup, so get it right:
`LEADER_LEASE_MS > INTERVAL_MS`, and `TARGET_LEASE_MS >= LEADER_LEASE_MS`.
It exits non-zero otherwise rather than running with a lease that expires
between ticks.

### 6.2 Confirm the worker is alive

Deploy logs should show, within one interval:

```
[alarm-dispatcher] starting                        … "shadowMode":true
[alarm-dispatcher] alarm timezone backfill status  … "alarmsWithNullTimezone":N
[alarm-dispatcher] shadow due-occurrence preview   … "count":0
```

That middle line is the backfill watch: it counts alarms still lacking a device
timezone. It should trend toward zero as clients re-save alarms.

Then check the heartbeat row:

```sql
SELECT serviceName, instanceId, releaseSha, lastSuccessAt, lastErrorAt, summaryJson
FROM dispatcher_heartbeats;
```

`lastSuccessAt` should advance every `ALARM_DISPATCH_INTERVAL_MS`.

---

## 7. Monitoring

Alert when the worker goes quiet. With a 30s interval, "two intervals plus
buffer" is about 3 minutes:

```sql
SELECT TIMESTAMPDIFF(SECOND, lastSuccessAt, UTC_TIMESTAMP()) AS staleness_seconds
FROM dispatcher_heartbeats
WHERE serviceName = 'alarm-dispatcher';
```

Page if `staleness_seconds > 180`, or if the row is missing entirely.

`lastSuccessAt` is deliberately preserved when a cycle errors, so you can tell
"was working, now failing" from "never worked".

---

## 8. Stripe test webhook

1. Stripe Dashboard → **Test mode** → Developers → Webhooks → Add endpoint.
2. URL: `https://api-staging.riseinharmony.com/api/stripe/webhook`
3. Subscribe to the same events production uses.
4. Copy the signing secret into staging `RIH_STRIPE_WEBHOOK_SECRET`.

Do not point the live-mode endpoint at staging.

---

## 9. Verification checklist

| Check | Expected |
|---|---|
| `curl https://api-staging.riseinharmony.com/readyz` | `200 {"ok":true,"db":true}` |
| `rih-alarm-dispatcher` Networking tab | **No domain of any kind** |
| `DESCRIBE alarm_delivery_attempts` | `scheduledForUtc` is `datetime` |
| `dispatcher_heartbeats.lastSuccessAt` | Advancing every interval |
| Dispatcher variables | No Stripe / Resend / RevenueCat / Forge / JWT values |
| Staging vs production VAPID public key | **Different** |
| Staging vs production `DATABASE_URL` | **Different** |
| Dispatcher logs | `"shadowMode":true` |

---

## 10. What is deliberately NOT done here

- Production domain changes. `www` and `api` stay exactly as they are.
- Turning shadow mode off — see [shadow-mode-runbook.md](./shadow-mode-runbook.md).
- Switching `rih-api` to the API-only build (Vercel must own the web client first).
- Replacing Manus OAuth — see [oidc-provider-options.md](./oidc-provider-options.md).
