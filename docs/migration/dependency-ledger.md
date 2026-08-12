# Dependency Ledger — Manus → GitHub/Vercel/Railway/Expo

**Status:** Phase 0 snapshot, Sprint 1. Nothing in this document has been changed yet;
it records what production depends on today so nothing is discovered missing at cutover.

**Classification key**

| Class | Meaning | Where it may live |
|---|---|---|
| **server-secret** | Grants access to data, money, or send-authority. Compromise is an incident. | Railway service variables (sealed). Never in a bundle, never in GitHub. |
| **deploy-secret** | Only authorizes a CI/CD action. | GitHub Actions secrets, or omitted entirely if native Git integrations deploy. |
| **public-client** | Shipped inside the browser bundle or mobile binary by design. Assume the world can read it. | `VITE_*` / `EXPO_PUBLIC_*`, Vercel/EAS env. |

> **Rule:** a value is `public-client` because it is *safe* to publish, not because it is
> *convenient* to. `VITE_`/`EXPO_PUBLIC_` prefixes are compile-time inlined by Vite/Expo —
> putting a secret there publishes it.

---

## 1. Environment variables

### 1.1 Server secrets (Railway API today)

| Variable | Purpose | Class | Sprint 1 action | Owner |
|---|---|---|---|---|
| `DATABASE_URL` | MySQL connection (Railway MySQL) | **server-secret** | New, separate staging value. Never reuse prod. | Brad |
| `JWT_SECRET` | Signs app session tokens (≥32 chars) | **server-secret** | Fresh random value for staging. Rotate at auth cutover. | Brad |
| `RIH_STRIPE_SECRET_KEY` | Stripe API (live in prod) | **server-secret** | Staging uses Stripe **test** key. API only — never the dispatcher. | Brad |
| `RIH_STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures | **server-secret** | Separate test-mode endpoint secret for staging. | Brad |
| `REVENUECAT_SECRET_KEY` | RevenueCat server API (mobile entitlements) | **server-secret** | Staging RevenueCat project or leave unset in staging. | Brad |
| `REVENUECAT_WEBHOOK_SECRET` | Verifies RevenueCat webhooks | **server-secret** | As above. | Brad |
| `RESEND_API_KEY` | Transactional email send authority | **server-secret** | Staging key restricted to a test audience. | Brad |
| `CRON_SECRET` | Bearer token authorizing `POST /api/scheduled/*` | **server-secret** | Distinct staging value. Now also gates the alarm break-glass route. | Brad |
| `BUILT_IN_FORGE_API_KEY` | Manus Forge storage credential | **server-secret** | **Manus-coupled.** Retire with the media/storage migration (Sprint 2). | Brad |
| `RIH_RELAY_AUTH_SECRET` | Auth for the Convert relay worker | **server-secret** | Staging value if Convert is enabled in staging; otherwise unset. | Brad |
| `OWNER_OPEN_ID` | Manus identity of the owner account (admin bootstrap) | **server-secret** | **Manus-coupled.** Replaced by OIDC subject at auth cutover. | Brad |

### 1.2 Server configuration (non-secret)

| Variable | Purpose | Class | Sprint 1 action |
|---|---|---|---|
| `NODE_ENV` | Runtime mode | public/config | `staging` on the staging services. |
| `PORT` | API listen port | public/config | Railway-provided. API only; the dispatcher has no port. |
| `APP_URL` | Canonical UI origin used in emails | public/config | `https://app-staging.riseinharmony.com` in staging. |
| `DB_POOL_SIZE` | mysql2 pool size (default 10) | public/config | Leave default. Dispatcher can run lower. |
| `RIH_ADMIN_EMAILS` | Emails auto-promoted to admin on sign-in | public/config | Staging list only. Not a secret, but privacy-relevant. |
| `RESEND_FROM_EMAIL` | Verified sender address | public/config | Must be a **verified** staging sender; never spoof the prod From. |
| `OWNER_NAME` | Display name for owner bootstrap | public/config | — |
| `RIH_CONVERT_ENABLED` | Feature flag for TrueHz Convert | public/config | Off in staging unless Convert is being tested. |
| `CONVERT_WORKER_CONCURRENCY` / `CONVERT_STALE_MINUTES` | Convert DSP worker tuning | public/config | Defaults. |
| `RIH_RELAY_URL` | Convert relay endpoint | public/config | Staging relay or unset. |
| `REQUIRE_MOBILE_ASSETS` | Makes the mobile asset check fail hard | public/config | `true` in CI. |
| `RELEASE_SHA` | Git SHA for tracing deploys | public/config | **New in Sprint 1.** Set on API *and* dispatcher. |

### 1.3 New in Sprint 1 (alarm dispatcher + Web Push)

None of these exist in production today — Web Push is being introduced by this sprint.

| Variable | Purpose | Class | Goes to |
|---|---|---|---|
| `RIH_VAPID_PUBLIC_KEY` | VAPID public key, served to browsers | public-client (via API response) | API + dispatcher |
| `RIH_VAPID_PRIVATE_KEY` | Signs Web Push requests | **server-secret** | API + dispatcher **only** |
| `RIH_VAPID_EMAIL` | `mailto:` VAPID contact subject | public/config | API + dispatcher |
| `ALARM_SHADOW_MODE` | `true` = compute occurrences, never send | public/config | dispatcher |
| `ALARM_DEFAULT_TIMEZONE` | Fallback IANA zone for legacy NULL-timezone alarms | public/config | dispatcher (`America/New_York`) |
| `ALARM_DISPATCH_INTERVAL_MS` | Loop period (30s–60s) | public/config | dispatcher |
| `ALARM_DISPATCH_LEADER_LEASE_MS` | Leader lease; must exceed interval | public/config | dispatcher |
| `ALARM_DISPATCH_TARGET_LEASE_MS` | Per-target claim lease | public/config | dispatcher |
| `ALARM_DISPATCH_GRACE_MS` | Missed-tick reconciliation window | public/config | dispatcher |
| `ALARM_DISPATCH_BATCH_SIZE` / `_CONCURRENCY` / `ALARM_MAX_ATTEMPTS` | Throughput + retry bounds | public/config | dispatcher |
| `ALARM_DISPATCH_INSTANCE_ID` | Optional stable worker identity | public/config | dispatcher (auto-generated if unset) |

**Staging must use a separate VAPID keypair.** A staging device that subscribes with the
production key would receive production alarm pushes.

### 1.4 Public client config — web (`VITE_*`, inlined into the browser bundle)

| Variable | Purpose | Class | Sprint 1 action |
|---|---|---|---|
| `VITE_APP_ID` | Manus application id | public-client | **Manus-coupled.** Retire at auth cutover. |
| `VITE_OAUTH_PORTAL_URL` | Manus OAuth portal origin | public-client | **Manus-coupled.** Retire at auth cutover. |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | PostHog browser analytics | public-client | PostHog project keys are publishable by design. Use a staging project. |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus Forge key used by the Maps component | ⚠️ **see below** | Do not carry forward. |
| `VITE_FRONTEND_FORGE_API_URL` | Manus Forge base URL for maps | public-client | Retire with Forge. |
| `VITE_API_BASE_URL` | **New.** Staging API origin | public-client | `https://api-staging.riseinharmony.com` |
| `VITE_APP_ENV` | **New.** UI/telemetry environment label | public-client | `staging` |
| `VITE_RELEASE_SHA` | **New.** Build SHA for client error reports | public-client | CI-provided |

> ✅ **Finding — `VITE_FRONTEND_FORGE_API_KEY` — investigated, no action needed.**
> Named like a credential and inlined into the browser bundle by Vite, so it *would* be public.
> Investigated 2026-08-12:
> - It is referenced only by [`Map.tsx:89`](../../client/src/components/Map.tsx#L89), to load
>   Google Maps through the Manus Forge proxy `forge.butterfly-effect.dev/v1/maps/proxy`.
> - **`Map.tsx` is imported by nothing.** It is unreferenced dead code and does not appear in
>   the built bundle (`butterfly-effect.dev` is absent from `dist/public/assets/*.js`).
> - The variable **is not set** in `.env`, so even when rendered the URL carried `key=undefined`.
>
> **Nothing to revoke — no secret was ever shipped.** Do not set this variable in the new Vercel
> project. `Map.tsx` is pre-existing dead code; removing it is unrelated cleanup, not a Sprint 1
> concern, so it was left in place.

### 1.5 Public client config — mobile (`EXPO_PUBLIC_*`, inlined into the app binary)

| Variable | Purpose | Class | Sprint 1 action |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | API base URL for the Expo app | public-client | Staging build points at `api-staging`. |
| `EXPO_PUBLIC_APP_ID` | Manus application id | public-client | **Manus-coupled.** Retire at auth cutover. |
| `EXPO_PUBLIC_OAUTH_PORTAL_URL` | Manus OAuth portal | public-client | **Manus-coupled.** Retire at auth cutover. |
| `EXPO_PUBLIC_POSTHOG_KEY` / `_HOST` | PostHog mobile analytics | public-client | Publishable by design. |
| `EXPO_PUBLIC_RC_API_KEY_IOS` / `_ANDROID` | RevenueCat **public SDK** keys | public-client | Correct by design — these are the publishable SDK keys, distinct from `REVENUECAT_SECRET_KEY`. |

**Never** place `DATABASE_URL`, `JWT_SECRET`, Stripe/Resend/RevenueCat server keys, VAPID
private key, or storage write credentials in `VITE_*` or `EXPO_PUBLIC_*`.

---

## 2. Manus platform coupling

| Dependency | Where | What breaks without Manus | Retire in |
|---|---|---|---|
| `vite-plugin-manus-runtime@0.0.59` | `devDependencies`, [`vite.config.ts:7`](../../vite.config.ts#L7) | Production web build imports a Manus module. | **Sprint 1, Phase 1** |
| `vitePluginManusDebugCollector` (local plugin) | [`vite.config.ts:77`](../../vite.config.ts#L77) | Dev-only log collector writing `.manus-logs/`. | **Sprint 1, Phase 1** (gated dev-only) |
| Manus dev host allow-list | [`vite.config.ts:176`](../../vite.config.ts#L176) | Dev-server only; harmless but Manus-specific. | Sprint 2 |
| Manus OAuth (`OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`) | `server/_core/oauth.ts`, `sdk.ts` | **All sign-in stops.** | Out of Sprint 1 scope — see [oidc-provider-options.md](./oidc-provider-options.md) |
| Manus SDK request auth (`sdk.authenticateRequest`) | [`server/_core/sdk.ts`](../../server/_core/sdk.ts) | Cron identity + user auth resolution. | With auth cutover |
| Manus Forge storage (`BUILT_IN_FORGE_API_URL/KEY`) | [`server/storage.ts`](../../server/storage.ts) | User sound uploads + Convert artifacts. | Sprint 2 (media/storage) |
| `files.manuscdn.com` media masters | [`backgroundLoops.ts`](../../client/src/data/backgroundLoops.ts), `apps/mobile/src/hooks/useMeditationPlayer.ts` | **10 meditation/reiki masters 404.** | Sprint 2 — **mitigated now**, see §5 |
| CSP allow-list entries (`*.manus.im`, `*.manuscdn.com`, `*.manus-analytics.com`) | [`server/_core/index.ts`](../../server/_core/index.ts) | Media/analytics blocked by CSP if hosts change. | Update alongside media move |
| `client/public/__manus__/version.json` | Auto-generated, gitignored | Nothing. | Sprint 1 (drops out with the plugin) |

### 2.1 The minute-level alarm scheduler

Alarm delivery today is server-side Web Push, driven by an **external minute-level cron**
calling `POST /api/scheduled/fire-alarms`, which invokes `fireAlarmsNow()` in
[`server/routers/push.ts`](../../server/routers/push.ts).

Two properties of that path are why the dispatcher exists:

1. **It matches on the API container's local clock.** `fireAlarmsNow()` reads
   `new Date().getHours()` / `.getMinutes()` and compares them to `alarms.hour` / `alarms.minute`.
   Every user is therefore woken on Railway's clock, not their own. There is no per-alarm
   timezone — `alarms.timezone` is added by this sprint.
2. **A tick is the only source of truth.** There is no delivery ledger, so a missed cron tick
   silently drops that minute's alarms, a duplicate tick can double-send, and a crash
   mid-send leaves no record to reconcile. Retries are unbounded in the sense that nothing
   tracks attempts; a dead subscription is only removed when a 410 happens to surface.

The dispatcher replaces the *delivery* half of that path with per-alarm IANA timezones, a
durable occurrence ledger keyed on the local wall-clock slot, lease-based claiming, and
bounded retries. `fireAlarmsNow()` is removed from `push.ts`, which keeps subscription
management only.

**`/api/scheduled/fire-alarms` is preserved** and rewired to call the shared
`runDispatchCycle()`, so it remains an authenticated break-glass control with exactly the
same guarantees as the worker. The external cron should be retired only after the dispatcher
has been validated — see [shadow-mode-runbook.md](./shadow-mode-runbook.md).

### 2.2 Migrations run at API startup

[`server/lib/runMigrations.ts`](../../server/lib/runMigrations.ts) is invoked from
[`server/_core/index.ts:64`](../../server/_core/index.ts#L64), so **every API instance applies
pending migrations on boot**. It tracks applied files by filename in `__drizzle_migrations`
(`id`, `tag`, `applied_at`), swallows "already exists"/"duplicate column" errors, and treats a
failed migration as non-fatal — the server starts anyway, potentially with missing columns.

This conflicts with the Sprint brief in two ways worth an explicit decision:

- The brief specifies migrating **once per release, never from application startup**.
- The brief's `db:migrate` (`drizzle-kit migrate`) **cannot be used against this database**.
  drizzle-kit maintains its own `__drizzle_migrations` table with a different shape
  (`id`, `hash`, `created_at`). Same table name, incompatible columns.

Note also that `drizzle/meta/_journal.json` stops at `0012_alarm_ambient_meditation`, while
`0013_push_subscriptions.sql` and `0015_fix_alarm_columns_v2.sql` exist on disk and have been
applied by the custom runner. The journal is already out of sync with reality, so drizzle-kit
has no accurate picture of what is applied.

`0016_alarm_dispatcher.sql` is written to be safe under the **custom runner**: idempotent
(`CREATE TABLE IF NOT EXISTS`), and free of apostrophes in comments, because the runner splits
on semicolons with naive single-quote tracking *before* stripping comments.

---

## 3. Third-party integrations

| Integration | Endpoint / config | Class | Migration note |
|---|---|---|---|
| **Stripe webhooks** | `POST /api/stripe/webhook` ([`stripeWebhook.ts`](../../server/_core/stripeWebhook.ts)); idempotency table added in `0007_webhook_idempotency.sql` | server-secret | Staging needs its **own** test-mode endpoint pointed at `api-staging.riseinharmony.com`, with its own signing secret. Do not point the live endpoint at staging. |
| **RevenueCat webhooks** | [`server/revenuecat.ts`](../../server/revenuecat.ts) | server-secret | Same: separate staging webhook + secret, or disabled in staging. |
| **Resend** | [`server/email.ts`](../../server/email.ts), `RESEND_FROM_EMAIL` | server-secret | Sender domain DNS (SPF/DKIM) is tied to the domain, not the host — unaffected by the Railway/Vercel move. Use a staging-safe From and a restricted key. |
| **PostHog** | `posthog-js` (browser), `posthog-node` (server) | mixed | Browser key is publishable; use a separate staging project so staging events don't pollute prod funnels. |
| **Web Push (VAPID)** | New this sprint | server-secret (private key) | Generate **two** keypairs: staging and production. |

---

## 4. DNS records

Current registrar/DNS provider: **confirm before Phase 3** (not derivable from the repo).

| Record | Today | Target state | When |
|---|---|---|---|
| `www.riseinharmony.com` | Manus-served web | Vercel (production project) | **Out of Sprint 1 scope** |
| `riseinharmony.com` (apex) | Manus | Vercel apex or redirect to `www` | Out of scope |
| `api.riseinharmony.com` | Railway API (if already attached — verify) | Unchanged, stays Railway | — |
| `api-staging.riseinharmony.com` | — | **New:** Railway CNAME + TXT validation | Phase 3 |
| `app-staging.riseinharmony.com` | — | **New:** Vercel CNAME | Phase 3 |
| `convert.riseinharmony.com` | Host-based route handled in [`index.ts:105`](../../server/_core/index.ts#L105) | Preserve behavior; confirm where it points | Verify in Phase 3 |
| Resend SPF / DKIM / DMARC | On the sending domain | **Unchanged** — do not touch during the host move | — |

Railway requires **both** the CNAME and the TXT validation record before it will route a
custom domain. Add them together.

---

## 5. Media (Manus CDN)

10 MP3 masters are streamed from `files.manuscdn.com`. They exist nowhere else we control,
which is why the export was pulled forward into Phase 0.

- Exporter: [`scripts/download-manus-media.ts`](../../scripts/download-manus-media.ts) (`pnpm media:export`)
- Output: `media-export/` — **gitignored**
- Record: `media-export/manifest.json` — **committed** (slug, sha256, byte size, content type, source URL, referencing files)
- Status: **10/10 exported, 428.6 MB, all sha256-distinct, all verified as MP3+ID3.**

Catalog URLs are **unchanged** in Sprint 1. The manifest lets a future re-host be verified
byte-for-byte against what Manus actually served.

---

## 6. GitHub

| Item | Today | Sprint 1 change |
|---|---|---|
| Repo | `humblehuman369/rise-in-harmony` | Becomes the source of truth for CI + deploy triggers. |
| Workflow | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — typecheck, server vitest, mobile typecheck/jest/assets. Verification only; no deploys. | Extended with `build:web`, `build:api`, `build:alarm-dispatcher` so a PR fails if any artifact fails to build. |
| Branches | `main` (+ `mobile-sdk54-upgrade`) | **New `staging`** branch. Feature branches → `staging`; `staging` → `main` is the promotion PR. |
| Actions secrets | None required today | Only add `VERCEL_TOKEN` / `RAILWAY_TOKEN` (**deploy-secret**) *if* Actions deploy via CLI. Native Git integrations make them unnecessary. **GitHub is never the store for runtime secrets.** |

---

## 7. Open items requiring Brad

These cannot be resolved from the repository.

1. **DNS provider + current record set** — needed before adding staging CNAME/TXT.
2. **Whether `api.riseinharmony.com` is already attached to Railway production.**
3. **Production `DATABASE_URL` export** — see [`scripts/backup-db.md`](../../scripts/backup-db.md). Run it yourself; it is not automated here.
   **`mysqldump` is not installed on this machine** — install it first: `brew install mysql-client`
   then `echo 'export PATH="/opt/homebrew/opt/mysql-client/bin:$PATH"' >> ~/.zshrc`.
4. **Stripe dashboard:** create the test-mode webhook endpoint for staging.
5. ~~**VAPID keypairs**~~ — **done 2026-08-12.** Two distinct keypairs generated and validated
   against `web-push` and the dispatcher config loader. Written to `~/rih-secrets/vapid-staging.env`
   and `~/rih-secrets/vapid-production.env` (mode 600, outside the repo, never in git).
   Move them into your password manager, then seal the private keys in Railway.
6. **PostHog:** create a staging project, or accept mixed events.
7. ~~**`VITE_FRONTEND_FORGE_API_KEY`**~~ — **resolved, no action.** See §1.4: dead code, never
   shipped, variable unset. Nothing to revoke.
8. **Manus account retention:** keep access alive until Forge storage and OAuth are migrated — media is already safe (§5), those two are not.
9. **Vercel account scope** — the authenticated Vercel account (`humblehuman369`) currently
   exposes only the `dealscope` team, which holds DealScope/InvestIQ projects. There is no Rise
   In Harmony project and no obvious correct owner for one. Confirm which team/account should own
   `rise-in-harmony-staging` before creating it.
