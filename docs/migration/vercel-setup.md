# Vercel staging setup

Creates a **separate** Vercel project for the staging web client. Separate so its
deployment rules can never move the production web domain while Sprint 1 is in
progress.

Prerequisite: [railway-setup.md](./railway-setup.md) is done and
`https://api-staging.riseinharmony.com/readyz` returns 200.

---

## 0. Current state — already provisioned

The project exists. Created 2026-08-12 via the Vercel CLI.

| | |
|---|---|
| Team | **Play-in-432** (`play-in-432`) — same team as `truehz-player` / playin432.com |
| Project | **`rise-in-harmony-staging`** |
| Project ID | `prj_yAWUYG3H0sMmNm9CR7wagy5Drsvs` |
| Git | Connected to `humblehuman369/rise-in-harmony` |
| Root Directory | `.` (repository root — correct, see §1) |

Environment variables set for **Production + Preview** (all public `VITE_*`, no
secrets):

- `VITE_API_BASE_URL=https://api-staging.riseinharmony.com`
- `VITE_APP_ENV=staging`
- `VITE_POSTHOG_HOST=https://us.i.posthog.com`

Still to do by hand — **in this order**:

1. **Push `staging` to GitHub.** It only exists locally right now. Vercel cannot
   deploy, and cannot even offer `staging` in the Production Branch dropdown,
   until the branch exists on the remote.
2. **Settings → Git → Production Branch → `staging`** (§2.1).
3. **Settings → Git → Ignored Build Step** (§2.2).
4. `VITE_POSTHOG_KEY`, and the Manus `VITE_APP_ID` / `VITE_OAUTH_PORTAL_URL`
   values (§3) — omitted because they are account-specific.
5. Domain (§4), which needs DNS.

The dashboard shows Framework Preset "Other" with default build settings. That
is cosmetic: [`vercel.json`](../../vercel.json) pins `framework`, `buildCommand`
and `outputDirectory`, and vercel.json takes precedence over dashboard settings
at build time.

---

## 1. Import the project

1. Vercel → **Add New… → Project** → import `humblehuman369/rise-in-harmony`.
2. Name it **`rise-in-harmony-staging`**.
3. **Root Directory: leave at the repository root.** Do **not** set it to
   `client/`.

   > `vite.config.ts` lives at the root and aliases `@shared`, `@rih/shared-utils`,
   > `@rih/shared-types` and `@rih/ui-tokens` to root-level directories. A Vercel
   > root directory prevents access outside itself, so pointing it at `client/`
   > breaks the build. The web client is not yet an independent package — that
   > folder move is explicitly out of Sprint 1 scope.

4. Framework preset: **Vite** (should autodetect).

Build settings come from the committed [`vercel.json`](../../vercel.json), so
there is nothing to type:

```json
{
  "framework": "vite",
  "buildCommand": "pnpm build:web",
  "outputDirectory": "dist/public",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

If the dashboard shows different values, clear the overrides and let
`vercel.json` win — it is the version-controlled source of truth.

`build:web` runs `vite build` **only**. It does not build the API, does not
build the dispatcher, and no longer loads any Manus runtime plugin.

---

## 2. Git integration — keep it from fighting existing deploys

This is the part most likely to cause a surprise.

### 2.1 Production Branch

**Settings → Git → Production Branch: `staging`.**

Counter-intuitive but correct: this project's "production" deployment is the
staging site. It must never build from `main`.

Not settable from the CLI or `vercel.json` — it is a project setting. The
dropdown only lists branches that exist on the remote, so push `staging` first.

### 2.2 Ignored Build Step

Vercel builds on every push to any branch by default, including `main`. Add this
so only `staging` and PRs targeting it build:

```bash
if [ "$VERCEL_ENV" = "production" ] && [ "$VERCEL_GIT_COMMIT_REF" != "staging" ]; then exit 0; fi
```

(Exit code `0` = skip the build; `1` = build.)

> ⚠️ **Set this in the dashboard, per project — do NOT put it in `vercel.json`.**
>
> `vercel.json` supports both `ignoreCommand` and `git.deploymentEnabled`, so it
> is tempting to check this rule into the repo. Don't. That file is shared by
> every Vercel project built from this repository, including the **production**
> project created later, whose production branch will be `main`. A repo-level
> rule saying "skip unless the ref is `staging`" would evaluate the same way for
> that project and **silently block every production deployment**.
>
> Branch-routing rules belong to the project, not the repository. Only settings
> that are true for *all* projects built from this repo (build command, output
> directory, SPA rewrite) belong in `vercel.json`.

3. **Do not attach `www.riseinharmony.com` or the apex domain to this project.**
   Production web stays where it is until a deliberate, separately reviewed
   cutover.

4. Railway's GitHub integration also watches this repo. The two do not conflict —
   Railway builds the API and worker images, Vercel builds the static client, and
   neither consumes the other's output. What *would* conflict is attaching a
   production domain to both, so don't.

5. If you later add a GitHub Actions deploy workflow, disable Vercel's Git
   integration for that project first. Running both produces duplicate
   deployments racing for the same alias.

---

## 3. Environment variables

**Settings → Environment Variables**, applied to **Production** and **Preview**
in this project only.

| Name | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://api-staging.riseinharmony.com` |
| `VITE_APP_ENV` | `staging` |
| `VITE_RELEASE_SHA` | `$VERCEL_GIT_COMMIT_SHA` |
| `VITE_POSTHOG_KEY` | staging PostHog project key (publishable) |
| `VITE_POSTHOG_HOST` | `https://us.i.posthog.com` |
| `VITE_APP_ID` | current Manus app id — still needed until auth migrates |
| `VITE_OAUTH_PORTAL_URL` | current Manus portal URL — same |

### Never set here

`DATABASE_URL`, `JWT_SECRET`, `CRON_SECRET`, `RIH_STRIPE_SECRET_KEY`,
`RIH_STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `REVENUECAT_SECRET_KEY`,
`RIH_VAPID_PRIVATE_KEY`, `BUILT_IN_FORGE_API_KEY`, or any OIDC client secret.

**Every `VITE_*` value is compiled into the JavaScript bundle and served to every
visitor.** The `VITE_` prefix is not a security boundary — it is the opposite,
an explicit marker that the value is public.

`scripts/check-web-bundle.mjs` runs in CI and fails the build if a Manus runtime
marker or a secret-shaped value reaches `dist/public`. It is a backstop, not
permission to be careless.

> Note: `VITE_FRONTEND_FORGE_API_KEY` exists in the current app
> (`client/src/components/Map.tsx`). It is already public by virtue of being a
> `VITE_` var. Do not carry it into this project without first deciding whether
> that credential needs revoking — see the dependency ledger, §1.4.

### No API functions

Do not add anything under `api/` and do not define Vercel Functions. Vercel
serves static assets only; all API traffic goes to Railway. `vercel.json`
deliberately declares no functions.

---

## 4. Domain

1. **Settings → Domains** → add `app-staging.riseinharmony.com`.
2. Add the CNAME Vercel shows at your DNS provider.
3. Wait for **Valid Configuration**, then confirm HTTPS is issued.

---

## 5. Verify deep links survive a hard refresh

This is the acceptance criterion for the SPA rewrite. Open each URL **directly**
in a new tab (typing the URL, not clicking through the app), then hard-refresh
(Cmd-Shift-R):

- `https://app-staging.riseinharmony.com/alarm`
- `https://app-staging.riseinharmony.com/studio`
- `https://app-staging.riseinharmony.com/gift`

Each must render the app, not a 404. Without the rewrite these paths do not
exist as files and Vercel would 404 them.

Also confirm assets still resolve — the catch-all rewrite is safe because Vercel
checks the filesystem *before* applying rewrites, so real files win:

```bash
curl -sI https://app-staging.riseinharmony.com/audio/binaural-432.mp3 | head -1
# expect: HTTP/2 200   (not a 200 that is actually index.html)

curl -s https://app-staging.riseinharmony.com/audio/binaural-432.mp3 | head -c 4 | xxd | head -1
# expect binary audio, not "<!DO"
```

---

## 6. Verify the bundle is clean

```bash
curl -s https://app-staging.riseinharmony.com/ | grep -i "umami\|__manus__" || echo "clean"
```

Expect `clean`. The Manus-injected umami analytics tag was removed in Phase 1 —
its `%VITE_ANALYTICS_ENDPOINT%` placeholder was never defined in this repo, so
on Vercel it would have produced a literal `/%VITE_ANALYTICS_ENDPOINT%/umami`
request 404ing on every page load.

Locally, the same gate CI runs:

```bash
pnpm build:web && node scripts/check-web-bundle.mjs
```

---

## 7. Connect web → API

1. In Railway `rih-api`, set `CORS_ALLOWED_ORIGINS` to exactly
   `https://app-staging.riseinharmony.com`.
2. If you want Vercel **preview** URLs to reach the staging API, add those exact
   origins too. Preview URLs are per-deployment and change every push, so prefer
   testing on the stable staging domain rather than allowing a wildcard.
   **Never use `*` with credentialed requests.**
3. Verify a real preflight:

```bash
curl -i -X OPTIONS https://api-staging.riseinharmony.com/api/trpc/auth.me \
  -H "Origin: https://app-staging.riseinharmony.com" \
  -H "Access-Control-Request-Method: GET"
```

Expect `access-control-allow-origin` echoing the staging origin exactly — not
`*`, and not a reflected arbitrary origin. Confirm a wrong origin is rejected:

```bash
curl -i -X OPTIONS https://api-staging.riseinharmony.com/api/trpc/auth.me \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: GET"
```

---

## 8. Verification checklist

| Check | Expected |
|---|---|
| `/alarm`, `/studio`, `/gift` after hard refresh | App renders, no 404 |
| `/audio/binaural-432.mp3` | Real MP3 bytes, not index.html |
| Page source | No `__manus__`, no umami tag |
| `node scripts/check-web-bundle.mjs` | Passes |
| Vercel env vars | `VITE_*` only, no secrets |
| Domains attached to this project | `app-staging` only — **never `www`** |
| Push to `main` | Does **not** trigger a build here |
| CORS preflight from staging origin | Exact-origin allow, wrong origin rejected |
