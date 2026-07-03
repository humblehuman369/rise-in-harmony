# Rise In Harmony — Mobile App (Expo / React Native)

This is the Expo React Native mobile app for Rise In Harmony. It shares design tokens, types, and utility functions with the web app via the monorepo packages in `../../packages/`.

---

## Prerequisites

Before running this app you need:

1. **Expo account** — [expo.dev](https://expo.dev) (free)
2. **EAS CLI** — `npm install -g eas-cli`
3. **Expo Go** on your device (for development builds) or a simulator
4. For production builds: **Apple Developer account** ($99/yr) and/or **Google Play Developer account** ($25 one-time)

---

## Setup

### 1. Install dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Configure EAS

```bash
cd apps/mobile
eas init
```

This creates your EAS project and fills in the `projectId` in `app.json`. Replace `REPLACE_WITH_YOUR_EAS_PROJECT_ID` with the generated ID.

### 3. Set environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
| :--- | :--- |
| `EXPO_PUBLIC_API_URL` | Rise In Harmony API base URL (e.g. `https://api.riseinharmony.com`) |
| `EXPO_PUBLIC_POSTHOG_KEY` | PostHog project API key |
| `EXPO_PUBLIC_RC_API_KEY_IOS` | RevenueCat iOS public API key |
| `EXPO_PUBLIC_RC_API_KEY_ANDROID` | RevenueCat Android public API key |

### 4. Add audio assets

Place the frequency audio files in `assets/sounds/`:

```
assets/sounds/
  174hz.mp3
  285hz.mp3
  396hz.mp3
  417hz.mp3
  432hz.mp3
  528hz.mp3
  639hz.mp3
  741hz.mp3
  852hz.mp3
  963hz.mp3
  alpha-binaural.mp3
  theta-binaural.mp3
  delta-binaural.mp3
  gentle_528hz.wav    ← used for alarm notification sound (Android res name must start with a letter, no hyphens)
```

Audio files should be 10-minute loops at 44.1kHz, 128kbps MP3. The `gentle_528hz.wav` alarm sound must be under 30 seconds for iOS notification delivery.

---

## Development

### Run on iOS Simulator

```bash
pnpm ios
```

### Run on Android Emulator

```bash
pnpm android
```

### Run with Expo Go (physical device)

```bash
pnpm start
# Scan the QR code with Expo Go
```

---

## Building

### Development build (includes dev client)

```bash
eas build --profile development --platform all
```

### Preview build (internal distribution)

```bash
eas build --profile preview --platform all
```

### Production build

```bash
eas build --profile production --platform all
```

---

## Submitting to Stores

Before submitting, ensure:
- `eas.json` has your Apple ID, App Store Connect App ID, and Apple Team ID
- `google-service-account.json` is present (download from Google Play Console → Setup → API access)
- The production build has passed QA

```bash
eas submit --profile production --platform all
```

---

## OTA Updates

After a production build is live, push code-only updates without a new store submission:

```bash
eas update --channel production --message "Fix: streak calculation"
```

OTA updates are limited to JavaScript changes. Native code changes (new packages, permission changes) require a new build.

---

## Architecture

```
apps/mobile/
  app/                    ← Expo Router file-based routes
    (tabs)/               ← Bottom tab navigator
      index.tsx           ← Home screen
      player.tsx          ← Frequency player
      meditation.tsx      ← Guided meditation library (12 sessions)
      studio.tsx          ← Sound Studio (layered mixer: frequency + music + nature)
      library.tsx         ← Frequency library (routable via Home; hidden from tab bar)
      alarm.tsx           ← Alarm scheduler
      dashboard.tsx       ← Stats & chakra map
    _layout.tsx           ← Root layout (providers)
    onboarding.tsx        ← First-launch onboarding
    paywall.tsx           ← Premium upgrade modal
    player/[id].tsx       ← Individual frequency player
    meditation/[id].tsx   ← Meditation session player (nature + frequency layers)
  src/
    hooks/
      useAudioPlayer.ts   ← expo-audio audio engine
      useMeditationPlayer.ts ← layered meditation audio + guidance timer
      useSoundStudio.ts   ← live synthesis engine (react-native-audio-api oscillators)
      useAlarmNotifications.ts  ← Alarm scheduling
      useAnalytics.ts     ← PostHog events
      usePurchases.ts     ← RevenueCat subscriptions
    store/
      authStore.ts        ← Zustand auth state (expo-secure-store)
    lib/
      api.ts              ← Typed API client with JWT refresh
  assets/
    sounds/               ← Frequency audio files (see Setup above)
```

---

## Key Dependencies

> Built on **Expo SDK 54** (React Native 0.81 / React 19). Production iOS builds use the Xcode 26 EAS image to satisfy Apple's April 2026 submission requirement.

| Package | Purpose |
| :--- | :--- |
| `expo-audio` | Frequency audio playback with background mode (replaces the deprecated `expo-av`) |
| `react-native-audio-api` | Web Audio API for RN — live sine/chord/drone synthesis in the Sound Studio |
| `expo-notifications` | Healing alarm scheduling (exact alarms) |
| `expo-secure-store` | JWT token storage (replaces AsyncStorage) |
| `expo-sqlite` | Offline-first local session database |
| `react-native-purchases` | RevenueCat subscription management |
| `expo-router` | File-based navigation |
| `posthog-react-native` | Analytics and feature flags |
| `zustand` | Lightweight global state |
| `@tanstack/react-query` | Server state management |
| `@rih/shared-types` | Shared TypeScript interfaces (monorepo) |
| `@rih/shared-utils` | Frequency catalog, streak calc, formatters |
| `@rih/ui-tokens` | Design tokens (colors, spacing, typography) |

---

## Android Alarm Reliability

Android 12+ requires `SCHEDULE_EXACT_ALARM` permission for reliable alarm delivery. The app requests this permission when the user creates their first alarm. Additionally:

- `RECEIVE_BOOT_COMPLETED` is declared in `app.json` to reschedule alarms after device restart
- `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` is requested to prevent the OS from killing the alarm task
- A foreground service with `FOREGROUND_SERVICE_MEDIA_PLAYBACK` type is used for audio playback during alarm delivery

See §5.3 of the development plan for the full Android alarm reliability implementation guide.
