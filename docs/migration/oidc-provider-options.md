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

Given this is a small team shipping a consumer app on a deadline, and that the
genuinely risky part is the `users.openId` re-match rather than the login UI:

**Auth0** is the safest choice — its lazy-migration path directly addresses the
one thing most likely to go wrong, and it removes an entire operational burden
at a stage where that matters more than the per-MAU line item.

**Clerk** is the reasonable alternative if you would rather trade some
flexibility for speed and a nicer integration.

**Self-hosting is hard to justify here.** Running an IdP to save per-MAU fees is
a poor trade while the user base is small, and it is the option most likely to
turn into an incident during a migration that is already moving several other
things at once.

---

## Whatever you choose

- Public config (`VITE_AUTH_ISSUER`, `VITE_AUTH_CLIENT_ID`,
  `VITE_AUTH_REDIRECT_URI`, `VITE_AUTH_AUDIENCE`) is safe in Vercel.
  **Client secrets go to Railway only** — never a `VITE_*` or `EXPO_PUBLIC_*`
  variable.
- Use **separate tenants/applications** for staging and production.
- Do the migration behind a feature flag so a partially converted sign-in path
  cannot reach users mid-flight.
- Take a fresh database backup immediately before the identity cutover —
  see [scripts/backup-db.md](../../scripts/backup-db.md).
- Do not retire the Manus values until the new flow has run in production long
  enough that every active user has logged in at least once through it.
