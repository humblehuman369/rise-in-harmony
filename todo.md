# Rise In Harmony — TODO

## Completed Features
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
- [x] PostHog analytics initialized with core events
- [x] Server-side streak calculation in getUserStats (currentStreak field)
- [x] Dashboard currentStreak uses server value when authenticated
- [x] Track `chakra_sequence_completed` PostHog event (wired in ChakraSequence.tsx)
- [x] Track `alarm_fired` PostHog event (wired in useAlarmNotifications)
- [x] Track `onboarding_completed` PostHog event (all paths including skip)
- [x] WelcomeEmail — sent on first login via Resend with dedup (welcomeEmailSentAt)
- [x] StreakMilestoneEmail — sent at 7-day and 30-day streaks with dedup (lastStreakMilestoneDays)
- [x] ReEngagementEmail — checkReEngagement procedure with 7-day dedup (lastReEngagementEmailAt)
- [x] SubscriptionConfirmEmail + TrialEndingEmail templates ready in email.ts
- [x] Privacy Policy page at /privacy
- [x] Privacy Policy link in sidebar footer
- [x] Email dedup schema fields: welcomeEmailSentAt, lastStreakMilestoneEmailAt, lastStreakMilestoneDays, lastReEngagementEmailAt
- [x] DB migration pushed (0001_lowly_brother_voodoo.sql)

## Remaining Web Work

### Data / Backend
- [x] Auto-log Chakra Journey sessions to journal on sequence completion
- [x] Bulk import localStorage sessions to server on first login

### Monetization
- [x] Paywall trigger at end of 7-Chakra sequence completion screen
- [ ] RevenueCat Web Billing integration (web subscription checkout)
- [ ] RevenueCat webhook handler updating subscriptions table

### Analytics
- [x] PostHog feature flags for A/B testing (useFeatureFlag hook + reloadFeatureFlags on login)

### Infrastructure (external — requires service accounts)
- [ ] Monorepo restructure (pnpm workspaces + Turborepo)
- [ ] Railway PostgreSQL migration
- [ ] GitHub Actions CI/CD workflows
- [ ] Expo React Native mobile app (iOS + Android)
- [ ] EAS Build configuration
- [ ] App Store / Google Play submission
