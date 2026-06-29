# Rise In Harmony — TODO

## Completed — Core Web App

- [x] Frequency Player with visualizer, volume, timer
- [x] Sound Studio with layered audio and presets
- [x] Alarm Scheduler with DB persistence
- [x] Frequency Library with chakra filter and Sanskrit pronunciation
- [x] Dashboard with streak calendar, charts, Chakra Map, weekly balance insight
- [x] 7-Chakra Journey guided sequence modal
- [x] Chakra affirmations overlay on Player
- [x] Quick Start Chakra Journey button
- [x] Onboarding modal
- [x] Premium paywall modal (triggered by locked frequencies)
- [x] Session journal (mood check-in, localStorage + DB)
- [x] Manus OAuth authentication
- [x] Full DB schema: users, sessions, alarms, studio_presets, subscription_events
- [x] tRPC routers: sessions, alarms, presets, subscription, auth, system
- [x] Server-side streak calculation in getUserStats
- [x] Dashboard currentStreak uses server value when authenticated
- [x] Auto-log Chakra Journey sessions to journal on sequence completion
- [x] Bulk import localStorage sessions to server on first login
- [x] Paywall trigger at end of 7-Chakra sequence completion screen

## Completed — Analytics & Events

- [x] PostHog analytics initialized with core events
- [x] PostHog: chakra_sequence_completed event
- [x] PostHog: alarm_fired event
- [x] PostHog: onboarding_completed event (all paths including skip)
- [x] PostHog feature flags (useFeatureFlag hook + pricing-test A/B flag in paywall)

## Completed — Email (Resend)

- [x] Welcome email on first login (with dedup via welcomeEmailSentAt)
- [x] Streak milestone email at 7-day and 30-day streaks (with dedup)
- [x] Re-engagement email after 7 days inactivity (with dedup)
- [x] SubscriptionConfirmEmail + TrialEndingEmail templates ready in email.ts
- [x] Email dedup schema fields migrated to DB

## Completed — Monetization

- [x] RevenueCat webhook handler (all event types, secret validation, subscription tier update)
- [x] RevenueCat Web Billing integration (web subscription checkout)

## Completed — Legal & UX

- [x] Privacy Policy page at /privacy
- [x] Privacy link in sidebar footer

## Completed — Infrastructure

- [x] pnpm workspace monorepo (pnpm-workspace.yaml)
- [x] Turborepo (turbo.json)
- [x] Shared packages: @rih/shared-types, @rih/shared-utils, @rih/ui-tokens
- [x] GitHub Actions: CI workflow (type check + Vitest for all packages)
- [x] GitHub Actions: deploy-api.yml (Railway deployment)
- [x] GitHub Actions: deploy-web.yml (Vercel/Manus deployment, updated for monorepo)
- [x] GitHub Actions: eas-build.yml (Expo EAS build + submit)
- [x] Railway PostgreSQL migration guide (references/railway-migration-guide.md)

## Completed — Mobile App Scaffold

- [x] apps/mobile/package.json with all Expo dependencies
- [x] apps/mobile/app.json with iOS/Android permissions and EAS config
- [x] apps/mobile/eas.json with development/preview/production build profiles
- [x] Expo Router layout with bottom tab navigation (5 tabs)
- [x] Home screen with Quick Start card, free frequencies, chakra journey preview
- [x] Library screen with full frequency list and premium lock
- [x] Player, Alarm, Dashboard tab stubs with implementation guides
- [x] Auth store (Zustand + expo-secure-store JWT storage)
- [x] useAudioPlayer hook (expo-av, background audio, fade-in, sleep timer)
- [x] useAlarmNotifications hook (expo-notifications, exact alarms, BOOT_COMPLETED)
- [x] usePurchases hook (RevenueCat react-native-purchases SDK)
- [x] useAnalytics hook (PostHog React Native, all events)
- [x] API client (typed fetch wrapper with JWT refresh)
- [x] Mobile README with full setup and submission guide

## Remaining — Mobile App Phase 1 (Requires Expo + Apple/Google accounts)

- [ ] Run `eas init` to generate EAS project ID (replace placeholder in app.json)
- [ ] Add frequency audio files to assets/sounds/ (13 MP3 files + 1 WAV alarm sound)
- [ ] Implement full Player screen (expo-av, waveform visualizer, affirmations)
- [ ] Implement Alarm screen (exact alarm scheduling, Android reliability)
- [ ] Implement Dashboard screen (charts, Chakra Map, streak calendar)
- [ ] Implement Onboarding screen
- [ ] Implement Paywall screen (RevenueCat packages, purchase flow)
- [ ] Configure RevenueCat products in App Store Connect + Google Play Console
- [ ] EAS development build and device testing
- [ ] EAS preview build for internal QA
- [ ] App Store Connect setup (app listing, screenshots, metadata)
- [ ] Google Play Console setup (app listing, data safety form)
- [ ] EAS production build + submit to both stores

## Remaining — Infrastructure (Requires Railway account)

- [ ] Create Railway project and PostgreSQL service
- [ ] Update drizzle.config.ts to PostgreSQL dialect
- [ ] Update server/db.ts to use pg driver
- [ ] Run pnpm db:push against Railway PostgreSQL
- [ ] Set all Railway environment secrets
- [ ] Verify health check endpoint returns 200

## Completed — Precision Frequency Engine (SRS v1.0)

- [x] DDS AudioWorklet processor (dds-processor.js) — double-precision phase accumulation (NFR-FREQ-004)
- [x] Phase-continuous frequency changes — no clicks/pops on parameter updates (FR-002)
- [x] All 4 waveforms: Sine, Square, Triangle, Sawtooth (FR-003)
- [x] Binaural beats mode — independent L/R channel frequencies, user-configurable base + beat Hz (FR-020)
- [x] Isochronic tones mode — adjustable pulse rate + duty cycle (FR-021)
- [x] Real-time oscilloscope display of generated waveform (FR-030)
- [x] Real-time FFT spectrum analyzer with parabolic-interpolated Hz readout + accuracy indicator (FR-031)
- [x] Custom frequency input 1–22,000 Hz at 0.01 Hz resolution (FR-001)
- [x] Favorites system with custom names, localStorage persistence (FR-011)
- [x] Sleep timer with smooth fade-out (FR-041)
- [x] Hardware disclaimer + headphone recommendation + medical disclaimer (NFR-FREQ-003)
- [x] Full preset library: all 9 Solfeggio + 432 Hz + 4 binaural brainwave states (FR-010)
- [x] Precision Player page at /precision with sidebar nav link
