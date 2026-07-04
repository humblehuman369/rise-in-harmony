# Mobile App — Environment Setup

Before running or building the mobile app, create a `.env` file in this directory with the following variables.

**How this is wired:** `app.config.ts` reads these `EXPO_PUBLIC_*` variables at build time and injects them into `expo.extra`. The app then reads them at runtime via `Constants.expoConfig.extra.*` (see `src/lib/api.ts`, `src/hooks/useAnalytics.ts`, `src/hooks/usePurchases.ts`). The variable names below are the single source of truth — do not rename one without updating `app.config.ts`.

```
# Base URL of the Rise In Harmony backend (no trailing slash)
# Development:  http://localhost:3000
# Production:   https://www.riseinharmony.com
EXPO_PUBLIC_API_URL=https://www.riseinharmony.com

# RevenueCat iOS public API key
# Get from: RevenueCat Dashboard → Apps → iOS App → Public API Key
EXPO_PUBLIC_RC_API_KEY_IOS=appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# RevenueCat Android public API key
# Get from: RevenueCat Dashboard → Apps → Android App → Public API Key
EXPO_PUBLIC_RC_API_KEY_ANDROID=goog_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PostHog analytics project API key
# Get from: PostHog → Project Settings → Project API Key
EXPO_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PostHog host (US cloud shown; use https://eu.i.posthog.com for EU)
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## EAS Secrets (for CI/CD builds)

For EAS Build, set secrets in the Expo dashboard instead of `.env`:

```
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://www.riseinharmony.com"
eas secret:create --scope project --name EXPO_PUBLIC_RC_API_KEY_IOS --value "appl_..."
eas secret:create --scope project --name EXPO_PUBLIC_RC_API_KEY_ANDROID --value "goog_..."
eas secret:create --scope project --name EXPO_PUBLIC_POSTHOG_KEY --value "phc_..."
eas secret:create --scope project --name EXPO_PUBLIC_POSTHOG_HOST --value "https://us.i.posthog.com"
```
