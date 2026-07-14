# Project TODO

- [x] Rebuild BreathingGuide from scratch — fix broken start/stop logic (commit 697fc7a)
- [x] Calm Breath: add adjustable cycle-duration slider 5–15 s (commit 5bd4069)
- [x] Sync webdev working copy with latest GitHub commits
- [x] Verify Breath Duration slider renders in dev preview (tested: slider 5–15s, cycle badge updates, hint text updates, 10s session runs, Stop works cleanly)
- [x] Save checkpoint so the change can be published to www.riseinharmony.com (checkpoint f9d45500)
- [x] Add Tuning Fork / Singing Bowl sound functionality to the 7-Chakra Journey (DDS engine: new 'fork' waveform in dds-processor.js; 3-way Sound selector in setup + live session toggle)
- [x] Fix pre-existing bug: guests were redirected to login when starting a Chakra Journey (session-logging mutations now use meta.noAuthRedirect)
- [x] Update Player.tsx Tone selector to Pure Tone / Tuning Fork / Singing Bowl (fork now uses authentic strike-and-decay timbre)
- [x] Verify Chakra Journey timbre feature in preview (guest start works, fork/bowl toggle live in session, TypeScript + 29 vitest tests pass)
- [ ] Checkpoint Chakra timbre feature + auth fix
- [ ] Finish and deliver the github-webdev-sync skill
