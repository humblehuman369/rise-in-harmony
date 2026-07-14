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
- [x] Checkpoint Chakra timbre feature + auth fix (checkpoint 3dbc5baa; guest start verified — zero unauthorized calls, only auth.me fires)
- [x] Finish and deliver the github-webdev-sync skill (validated; script tested against live site)
- [ ] Fix: Tuning Fork must be the sustained pure tone (pre-existing behavior), not a strike/"ding" sound
- [ ] Fix: Chakra Journey Sound selector must offer only two options — Tuning Fork / Singing Bowl (remove Pure Tone as separate third option)
- [ ] Restore Player.tsx Tone selector to its original two options (Tuning Fork = sustained pure tone, Singing Bowl)
- [ ] Verify corrected sound options in preview and checkpoint
