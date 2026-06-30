# Mobile App — Environment Setup

Before running or building the mobile app, create a `.env` file in this directory with the following variables:

```
# Base URL of the Rise In Harmony backend (no trailing slash)
# Development:  http://localhost:3000
# Production:   https://www.riseinharmony.com
EXPO_PUBLIC_API_URL=https://www.riseinharmony.com

# RevenueCat iOS public API key
# Get from: RevenueCat Dashboard → Apps → iOS App → Public API Key
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# RevenueCat Android public API key
# Get from: RevenueCat Dashboard → Apps → Android App → Public API Key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PostHog analytics project API key
# Get from: PostHog → Project Settings → Project API Key
EXPO_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PostHog host
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

These values are also referenced in `app.json` under the `extra` field — the app reads them at runtime via `Constants.expoConfig.extra`.

## EAS Secrets (for CI/CD builds)

For EAS Build, set secrets in the Expo dashboard instead of `.env`:

```
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://www.riseinharmony.com"
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "appl_..."
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "goog_..."
eas secret:create --scope project --name EXPO_PUBLIC_POSTHOG_KEY --value "phc_..."
```
