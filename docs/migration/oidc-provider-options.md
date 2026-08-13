# Identity provider options — for a decision, not for this sprint

Replacing Manus OAuth is **out of Sprint 1 scope**. This exists so the decision
can be made deliberately rather than under time pressure when Manus access ends.

---

## What is actually coupled today

| Piece | Where |
|---|---|
| `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL` | Manus OAuth endpoints + client id |
| `sdk.authenticateRequest(req)` | `server/_core/sdk.ts` — resolves a request to a user, **and** the `isCron` identity used by `/api/scheduled/*` |
| `OWNER_OPEN_ID` | Owner/admin bootstrap |
| `users.openId` (varchar 64, **unique, NOT NULL**) | The Manus subject, stored on every user row |
| `sessionStorage["manus-cookie"]`, `localStorage["manus-runtime-user-info"]` | Client-side session glue |
| `EXPO_PUBLIC_APP_ID`, `EXPO_PUBLIC_OAUTH_PORTAL_URL` | Same flow in the Expo app |

**The migration's hard part is `users.openId`, not the login button.** Every
user row is keyed to a Manus subject. A new provider issues *different* subject
identifiers, so unless users can be re-matched (almost certainly by verified
email), they will land on new accounts and lose their sessions, streaks,
presets, and subscription linkage.

Plan the identity-mapping step before choosing a vendor. In practice:

- add a nullable `users.authSubject` + `users.authProvider` (additive, safe)
- on first login through the new provider, match on **verified** email and
  populate them
- keep `openId` untouched as the historical key — never repoint the primary key
- decide explicitly what happens for a user whose Manus account had no email, or
  an unverified one

Also note: `/api/scheduled/*` currently accepts *either* `CRON_SECRET` **or** the
Manus cron identity. Once Manus is gone, `CRON_SECRET` becomes the only path —
make sure it is set everywhere before removing the SDK.

---

## Two constraints that narrow the field before any vendor comparison

### A. Sign in with Apple is effectively mandatory

App Store Review Guideline **4.8** requires an app that offers third-party or
social sign-in (Google, Facebook, etc.) to also offer an equivalent
privacy-preserving option. In practice that means **Sign in with Apple**.

This applies here: `apps/mobile/app/login.tsx` is a real sign-in screen and
v1.2.0 is in review. So the requirement is not "support Google" — it is
**support Google *and* Apple**, inside Expo.

That filter matters more than pricing:

- It rules out building a direct Google OAuth flow with no broker. That looks
  cheapest until you own Apple Sign-In, token refresh, and session revocation
  yourself.
- It makes Expo/React Native support a hard requirement of the vendor choice,
  not a nice-to-have. Web-first SDKs with a thin RN wrapper tend to be where the
  time goes.
- Apple's flow can return `email` only on **first** authorization, and users may
  choose a private relay address. Both interact badly with an email-based
  re-match — see below.

### B. There are no passwords to migrate

Every user authenticates through brokered OAuth via Manus. There are no local
password hashes.

This is worth stating plainly because it **changes the vendor calculus**: the
lazy/trickle migration features that providers advertise most heavily exist to
avoid forcing password resets. That is not a problem this project has.

What matters instead is whether the *upstream* identity is preserved. If a user
signed in through Manus → Google, they will return through `<new provider>` →
Google as the same Google account with the same verified email. The re-match is
then an email join, not a credential migration — considerably easier than a
generic "migrate your users" story implies.

### Measured, 2026-08-13 — production

The whole plan depended on one number. It has been read (read-only, aggregates
only):

```
users total       2
with email        2
NO email          0
loginMethod       email 1 · google 1
paying users      1   (0 without email)
```

**Two users.** Both have a usable email. Nobody is unmatchable.

This collapses the migration problem. There is no orphaned cohort, no
account-linking edge case, no need for lazy or trickle migration, and no risk of
a paying customer losing subscription linkage through a failed re-match. If the
automated path ever misbehaved, two accounts can be reconciled by hand in
minutes.

It also means the `users.openId` re-match — described above as "the migration's
hard part" — **is not hard here**. That framing was written before the row count
was known and is accurate in general; it is disproportionate for this database.

One detail still worth carrying: `loginMethod` shows **one `email` and one
`google`**, so Manus brokered email/password as well as Google. A provider
configured for Google and Apple only would leave the email/password user without
their original route. With n=1 that is a conversation, not a migration plan.

Re-run before deciding if significant time passes:

```sql
SELECT COUNT(*) AS total, SUM(email IS NULL OR email = '') AS no_email FROM users;
SELECT loginMethod, COUNT(*) FROM users GROUP BY loginMethod ORDER BY 2 DESC;
```

---

## The three realistic options

### 1. Auth0 / Okta CIC

**Best when you want the migration to be someone else's problem.**

| | |
|---|---|
| **For** | Real OIDC. Mature bulk user import, including a "lazy migration" mode that imports users on first successful login. Social + passwordless + MFA out of the box. Rules/Actions can run custom logic during login, which is useful for the `openId` re-match. Well-documented Expo/React Native support. |
| **Against** | Most expensive as you grow — pricing steps up sharply past the free MAU tier and again for enterprise features. Heaviest vendor lock-in of the three. Configuration surface is large enough to misconfigure quietly. |
| **Cost shape** | Free to a few thousand MAU, then per-MAU. |
| **Migration fit** | **Strongest.** The lazy-migration path is close to purpose-built for the `openId` problem. |

### 2. Clerk

**Best for shipping fastest with the smallest amount of your own code.**

| | |
|---|---|
| **For** | Drop-in React components; a working sign-in page in an afternoon. Good Expo support. Session management, device management and MFA included. Pleasant DX and clear docs. |
| **Against** | Most opinionated — you adopt Clerk's user model and its components, so its shape leaks into your UI. Migration tooling is decent but less flexible than Auth0's for a custom re-match. Per-MAU pricing that gets meaningful at scale. |
| **Cost shape** | Generous free tier, then per-MAU. |
| **Migration fit** | Good, if email matching is sufficient. Awkward if you need unusual re-match logic. |

### 3. Self-hosted Keycloak or Ory Hydra

**Best if you want no per-user cost and full control, and are willing to run it.**

| | |
|---|---|
| **For** | No per-MAU fee. Complete control over the user table and the token lifecycle, so the `openId` re-match is just your own code. No vendor can change pricing or deprecate your flow. Data stays in your infrastructure. |
| **Against** | **You now operate an identity provider.** Uptime, patching, key rotation, backups, and security response are yours — and an IdP outage is a total outage. Keycloak is resource-hungry for a small app; it would be the largest thing in your Railway project. Realistically the slowest of the three to reach production. |
| **Cost shape** | Infrastructure only, but ongoing operational time is the real cost. |
| **Migration fit** | Most flexible, least assisted. |

---

## Recommendation

> **Revised twice.** The first draft recommended Auth0 for its lazy-migration
> path — reasoning that does not survive contact with the code, since there are
> no passwords to migrate. The second revision branched on the count of users
> without an email. That count has now been measured: **two users, both with
> email**. Both revisions are recorded rather than overwritten, because the
> earlier reasoning was cited during planning.

**Pick on Apple/Expo support, developer experience and price. Migration
complexity is not a factor at this size.**

**Clerk** is the straightforward choice: first-class Expo support (which
Guideline 4.8 makes non-negotiable), Google and Apple as configuration rather
than integration work, and a free tier that comfortably covers two users.

**Auth0** is equally defensible. Its advantage here is not migration tooling —
that advantage evaporated with the row count — but breadth if you expect to need
enterprise connections or fine-grained Actions later.

**Still not recommended: rolling your own on Google.** Guideline 4.8 makes Apple
mandatory, so you would own two providers, token refresh and session revocation.
That trade does not improve with a small user base; it just means less to lose
when it breaks.

**Still not recommended: self-hosting.** Running an IdP for two users is not a
serious proposal.

### What this changes about sequencing

Identity replacement was ranked the riskiest item in the migration on the
assumption of a real user base. With two users and one paying customer, the
practical risk is **one person's access and subscription**, which is worth being
careful about but is not a reason to defer for months.

It is still sensible to do it after the production cutover — fewer moving parts
at once — but it can be scheduled on convenience rather than treated as a
high-stakes operation. Notify the affected user, migrate, confirm they can sign
in and that their subscription still resolves.

---

## Whatever you choose

- Public config (`VITE_AUTH_ISSUER`, `VITE_AUTH_CLIENT_ID`,
  `VITE_AUTH_REDIRECT_URI`, `VITE_AUTH_AUDIENCE`) is safe in Vercel.
  **Client secrets go to Railway only** — never a `VITE_*` or `EXPO_PUBLIC_*`
  variable. Those prefixes are compile-time inlined, so a secret placed there is
  published to every browser.
- **Enable Apple alongside Google from day one** (§A). Retrofitting it after an
  App Store rejection means a second identity migration for users who already
  moved once.
- **Handle Apple's private relay addresses explicitly.** Apple returns `email`
  only on first authorization, and the user may substitute a
  `@privaterelay.appleid.com` address. Persist it on first sign-in — you will not
  get a second chance — and do not assume it matches the address a user has on
  file from Google.
- **Separate tenants, not one tenant with two applications.** Connections,
  branding and rules are tenant-level and would otherwise leak between staging
  and production.
- **Mind the environment naming.** In the `rise-in-harmony-staging` Vercel
  project, the *Production* environment is the staging site, so **both** its
  environments take the staging tenant. Only the future production project takes
  the production tenant.
- **Allow-list preview callbacks.** Vercel preview URLs are per-deployment, so
  either register a wildcard for the non-production tenant or accept that sign-in
  only works on the stable domains. This is the same class of problem that makes
  Manus sign-in unreliable on `app-staging` today.
- Use **separate tenants/applications** for staging and production.
- Do the migration behind a feature flag so a partially converted sign-in path
  cannot reach users mid-flight.
- Take a fresh database backup immediately before the identity cutover —
  see [scripts/backup-db.md](../../scripts/backup-db.md).
- Do not retire the Manus values until the new flow has run in production long
  enough that every active user has logged in at least once through it.
