# Rise In Harmony — Project TODO

## Production hardening (S0–S3) — 2026-07-14

- [x] S0 critical security (IDOR, webhooks, JWT, rate limits, storage, assets CI)
- [x] S1 high (sessions, compliance export/delete, expiry, cookies, privacy)
- [x] S2 medium (pool, streak TZ, healthz, premium gates, onboarding parity)
- [x] S3 polish (re-engagement cron, admin roles, .env.example, PRODUCTION_HARDENING.md)
- [ ] Apply migration `drizzle/0007_webhook_idempotency.sql` in staging/prod
- [ ] Apply migration `drizzle/0008_phase2_retain.sql` (programs, freezes, alarm kind)
- [ ] Register daily re-engagement Heartbeat or external cron with `CRON_SECRET`
- [ ] Register Monday weekly-insights cron (`/api/scheduled/weekly-insights`)
- [ ] Replace placeholder mobile MP3s with production audio before store submit

## Phase 2 — Retain (2026-07-14)

- [x] Resonance insights API + Dashboard card
- [x] Programs catalog + tRPC + web page + mobile screen
- [x] Wind-down alarm kind
- [x] Streak freezes (premium monthly)
- [x] Weekly insight email + freeze replenish cron endpoint

See `PRODUCTION_HARDENING.md` for the full checklist.

## Completed — Initial Setup & Core Features

- [x] Set up project structure and dependencies
- [x] Implement frequency player with DDS synthesis
- [x] Build alarm clock with healing frequency fade-in
- [x] Create meditation catalog with 12 guided sessions
- [x] Add Chakra morning sequence
- [x] Implement sleep timer
- [x] Build studio mixing interface
- [x] Add premium subscription with RevenueCat
- [x] Implement Stripe payment integration
- [x] Create landing page with hero, features, testimonials
- [x] Add user authentication with Manus OAuth
- [x] Build admin dashboard
- [x] Add analytics with PostHog

## Completed — Visualizer & Volume Control

- [x] Create FrequencyVisualizer component with animated waveform rings
- [x] Add enhanced volume control slider with visual feedback and haptics
- [x] Integrate visualizer and volume slider into studio and player screens
- [x] Integrate visualizer into meditation screen (meditation uses multi-layer mixing sliders, not single volume)

## Bug Fix — Premium User Cannot Access Pro Features

- [x] Investigate and fix: paid premium subscription user unable to access Pro features

## In Progress — Full Body Scan & Release Meditation Track Overhaul

- [x] Update Full Body Scan & Release: duration 15→60 min, expand guidance to 30 steps
- [x] Update web client meditations.ts (client/src/data/meditations.ts) to match
- [x] Commit, push to GitHub, save checkpoint

## Completed — Sleep Preparation Meditation Track Overhaul

- [x] Create meditationSynth.ts — procedural nature synths (night/forest/ocean/rain/river/cave) and music synths (drone/ambient/crystal)
- [x] Rewrite useMeditationPlayer.ts — replace expo-audio MP3 looping with DDS procedural synthesis (3 layers: nature, music, frequency)
- [x] Update Sleep Preparation meditation: duration 20→60 min, guidance 9→30 steps
- [x] Verify meditation/[id].tsx screen compatibility with new hook signature
- [x] Push to GitHub and save webdev checkpoint

## In Progress — Guided Voice for Breathing Patterns

- [x] Generate TTS audio for 4-7-8 breathing pattern (intro + each phase cue + completion)
- [x] Generate TTS audio for Box Breathing pattern (intro + each phase cue + completion)
- [x] Generate TTS audio for Calm Breath pattern (intro + each phase cue + completion)
- [x] Upload all audio files to CDN via manus-upload-file --webdev
- [x] Add guided voice toggle to BreathingGuide component
- [x] Integrate expo-audio playback of phase cues in sync with breathing timer
- [x] Commit, push to GitHub, save checkpoint

## Completed — Sleep Preparation Recorded Soundscape (New Recording)

- [x] Analyze uploaded SleepPreparation.wav (A-root ambient, 3:33, Suno recording)
- [x] Tune recording for 200Hz Delta carrier: gentle -6dB notch at 200Hz, -21 LUFS normalization, seamless loop crossfade, MP3 encode
- [x] Upload processed sleep-preparation.mp3 to webdev storage (/manus-storage/sleep-preparation_921174c5.mp3)
- [x] Register "sleep-preparation" loop in client/src/data/backgroundLoops.ts (LIBRARY_LOOP_URLS)
- [x] Add "sleep-preparation" to NatureSound union + RECORDED_NATURE_URLS recorded playback path in useSoundStudio.ts
- [x] Set Sleep Preparation soundscape to "sleep-preparation" in client meditations.ts and shared-utils meditations.ts
- [x] Add "sleep-preparation" to NatureSoundscape type in packages/shared-types
- [x] Mobile fallback: map "sleep-preparation" to night synth in apps/mobile meditationSynth.ts
- [x] Fix play() race: studioPlay now accepts setting overrides; Meditation.tsx passes soundscape/volumes directly
- [x] Vitest spec for new soundscape wiring (server/sleep-preparation-soundscape.test.ts) — 34/34 pass
- [x] Verify in browser: MP3 loads and plays with 200Hz Delta Waves layer
- [x] Commit + push to GitHub, save webdev checkpoint

## Completed — Four New Recorded Soundscapes (soundscape-replacer skill)

- [x] Determine carrier frequency for each target meditation (Deep Focus, 4-7-8 Anxiety Reset, 7-Chakra Morning Activation, Morning Breath Awakening)
- [x] Analyze/process/verify DeepFocusMeditation.wav (tuned to its carrier)
- [x] Analyze/process/verify 4-7-8AnxietyReset.wav (tuned to its carrier)
- [x] Analyze/process/verify SevenChakraDawn.wav (tuned to its carrier)
- [x] Analyze/process/verify MorningBreathAwakening.wav (tuned to its carrier)
- [x] Upload all four processed MP3s to webdev storage
- [x] Register keys in backgroundLoops.ts, RECORDED_NATURE_URLS, type unions, meditations data (client + shared), mobile fallbacks
- [x] Extend vitest spec for all four new soundscapes
- [x] Browser-verify playback for at least one meditation end-to-end
- [x] Commit, push to GitHub, save webdev checkpoint
