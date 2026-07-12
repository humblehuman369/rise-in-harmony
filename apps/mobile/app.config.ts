import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Dynamic Expo config.
 *
 * The static configuration lives in `app.json` and is passed in here as
 * `config`. We only override `extra`, so that all runtime configuration
 * (API base URL, analytics + billing keys) is sourced from EXPO_PUBLIC_*
 * environment variables at build time (local `.env` for dev, EAS secrets for
 * CI/production builds).
 *
 * The app reads these values at runtime via `Constants.expoConfig.extra.*`.
 * Key names here MUST stay in sync with `src/lib/api.ts`,
 * `src/hooks/useAnalytics.ts`, and `src/hooks/usePurchases.ts`.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "Rise In Harmony",
  slug: config.slug ?? "rise-in-harmony",
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://www.riseinharmony.com",
    oauthPortalUrl: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "https://manus.im",
    appId: process.env.EXPO_PUBLIC_APP_ID ?? "AtfyTVSdtA5G8ui7hAZ3a8",
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "",
    posthogHost:
      process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    revenueCatApiKeyIos: process.env.EXPO_PUBLIC_RC_API_KEY_IOS ?? "",
    revenueCatApiKeyAndroid: process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? "",
  },
});
