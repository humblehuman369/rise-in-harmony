# Alarm dispatcher — shadow mode runbook

How to validate the alarm dispatcher against reality before it is allowed to
send a single push, and how to back out.

---

## Read this first: what shadow mode is comparing against

Alarm delivery today is **already server-side Web Push**: an external minute-level cron calls
`POST /api/scheduled/fire-alarms`, which runs `fireAlarmsNow()` in `server/routers/push.ts`.

Shadow mode compares the dispatcher's computed occurrences against **what that legacy path
would have fired**. Two differences drive the whole exercise:

1. **Timezone.** `fireAlarmsNow()` compares `alarms.hour`/`minute` against the API container's
   local clock (`new Date().getHours()`). Every user is effectively on Railway time. The
   dispatcher uses per-alarm IANA `alarms.timezone`, falling back to `ALARM_DEFAULT_TIMEZONE`
   for rows not yet backfilled.

   **Expect the two to disagree** for any user whose zone differs from the API container's.
   That disagreement is the fix, not a regression — but you must confirm each difference is
   explained by timezone and not by a scheduling bug.

2. **Durability.** The legacy path has no ledger, so a missed tick drops alarms silently and a
   duplicate tick can double-send. The dispatcher records one occurrence per alarm per local
   slot and reconciles missed ticks within the grace window.

### Both are live at once — do not skip this

Unlike a greenfield rollout, the legacy cron **keeps sending while you validate**. So:

- Keep `ALARM_SHADOW_MODE=true` until you are ready to switch senders. Shadow mode writes no
  ledger rows and sends nothing, so it cannot double-send alongside the cron.
- **Turning shadow off while the external cron is still running WILL double-send** — users get
  two notifications per alarm. Retire the cron in the same change, or immediately before.
  This is the single most important ordering constraint in this runbook.

### Rollback is clean

The dispatcher is additive: new tables, one nullable column, a separate service. Stopping it
returns delivery entirely to the legacy cron path, which never stopped running.

## Phase A — apply the migration

Migrations apply from **API startup** in this repository, not from a CLI step — see
[railway-setup.md §5](./railway-setup.md). Deploying `rih-api` on the staging branch is what
applies `0016_alarm_dispatcher.sql`.

**Do not run `drizzle-kit migrate`** against this database; it uses an incompatible
`__drizzle_migrations` shape. See [dependency-ledger.md §2.2](./dependency-ledger.md).

After the deploy, verify the storage types — this is the detail that silently corrupts
scheduling if wrong:

```sql
SELECT COLUMN_NAME, DATA_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('alarm_delivery_attempts','alarm_delivery_targets',
                     'dispatcher_leases','dispatcher_heartbeats')
  AND COLUMN_NAME IN ('scheduledForUtc','completedAt','nextAttemptAt',
                      'leaseExpiresAt','sentAt','lastStartedAt',
                      'lastSuccessAt','lastErrorAt');
```

Every row must say **`datetime`**. Any `timestamp` means the wrong migration ran — stop.

Also confirm the runner recorded it, since it treats failure as non-fatal:

```sql
SELECT tag, applied_at FROM `__drizzle_migrations` ORDER BY id DESC LIMIT 3;
```

---

## Phase B — start the worker in shadow mode

`ALARM_SHADOW_MODE=true` is the default in `config.ts`, so a misconfigured
deploy fails safe. Confirm it explicitly anyway.

In shadow mode the worker:

- takes the leader lease and computes due occurrences
- logs each candidate with alarm id, timezone, UTC instant and local slot key
- writes a heartbeat
- **writes no ledger rows and sends no push**

The no-write behavior is deliberate: turning shadow off later cannot replay a
backlog of shadow-era occurrences, because none were recorded. (Covered by the
test *"leaves nothing to replay when shadow mode is turned off"*.)

Confirm from the deploy logs:

```
[alarm-dispatcher] starting … "shadowMode":true
[alarm-dispatcher] alarm timezone backfill status … "alarmsWithNullTimezone":N
[alarm-dispatcher] shadow due-occurrence preview … "count":0
```

And confirm nothing is being written:

```sql
SELECT COUNT(*) FROM alarm_delivery_attempts;  -- must stay 0 in shadow mode
SELECT COUNT(*) FROM alarm_delivery_targets;   -- must stay 0
```

---

## Phase C — seed test alarms

Sign in to `app-staging` and create alarms that exercise the real edges. Set
each a few minutes out, then confirm the shadow log names it at the right UTC
instant.

| # | Alarm | Purpose |
|---|---|---|
| 1 | Daily, your local zone | Baseline |
| 2 | Weekdays only | Day-of-week filtering |
| 3 | Second device, same account | Multi-target fan-out |
| 4 | Account whose device reports a non-US zone | Timezone independence |
| 5 | An alarm left with `timezone` NULL (see below) | Fallback path |
| 6 | Disabled alarm | Must never appear |

For #4, change your OS timezone, hard-refresh, then save the alarm — the client
sends `Intl.DateTimeFormat().resolvedOptions().timeZone` on save.

For #5, blank one deliberately to exercise `ALARM_DEFAULT_TIMEZONE`:

```sql
UPDATE alarms SET timezone = NULL WHERE id = <your test alarm id>;
```

Watch the backfill counter fall as you re-save alarms:

```sql
SELECT COUNT(*) AS total, SUM(timezone IS NULL) AS still_null FROM alarms;
```

---

## Phase D — observe for at least 3 days

Three days is the minimum because it covers a weekday/weekend boundary and gives
each recurring alarm several firings. Longer is better.

Each day, for each test alarm, check the shadow log line:

```json
{
  "msg": "[alarm-dispatcher] shadow due-occurrence preview",
  "count": 2,
  "occurrences": [
    { "alarmId": 41, "timezone": "America/New_York",
      "scheduledForUtc": "2026-08-15T11:30:00.000Z",
      "scheduledLocalKey": "America/New_York:2026-08-15T07:30" }
  ]
}
```

Verify per occurrence:

- `scheduledLocalKey` local time **equals what the user set**
- `scheduledForUtc` is the correct UTC instant for that zone **on that date**
  (DST offsets change through the year — check the date, not just the zone)
- disabled alarms never appear
- an alarm appears **once** per day, not once per tick
- a NULL-timezone alarm resolves using `ALARM_DEFAULT_TIMEZONE`

Cross-check one by hand:

```bash
TZ=America/New_York date -d '2026-08-15T11:30:00Z'   # macOS: use `date -jf`
```

Also confirm liveness held the whole time:

```sql
SELECT lastSuccessAt, lastErrorAt, lastErrorSummary FROM dispatcher_heartbeats;
```

`lastErrorAt` should be NULL. If it isn't, read `lastErrorSummary` and fix
before proceeding.

### DST — worth an explicit test

Both edges are unit-tested (`recurrence.test.ts`), but if a real DST transition
falls inside your observation window, verify it live:

- **Fall back** (repeated 01:00–02:00 local): an alarm at 01:30 must produce
  **one** occurrence, at the first 01:30.
- **Spring forward** (missing 02:00–03:00 local): an alarm at 02:30 must produce
  **zero** occurrences that day.

To test off-cycle, create an alarm in a zone whose transition is imminent.

---

## Exit criteria — all must hold before shadow mode goes off

- [ ] ≥3 consecutive days observed with no gap in `lastSuccessAt`
- [ ] Every test alarm's `scheduledLocalKey` matched the configured local time, every day
- [ ] Every `scheduledForUtc` was the correct UTC instant for its zone and date
- [ ] Exactly one occurrence per alarm per firing — never one per tick
- [ ] Disabled alarms never appeared
- [ ] NULL-timezone alarm used `ALARM_DEFAULT_TIMEZONE` as expected
- [ ] `alarm_delivery_attempts` and `alarm_delivery_targets` still contain **0 rows**
- [ ] `lastErrorAt` is NULL
- [ ] Staging VAPID public key differs from production's
- [ ] Dispatcher service has **no** public domain
- [ ] Dispatcher has no Stripe / Resend / RevenueCat / Forge / JWT variables
- [ ] A restart mid-window recovered without duplicate occurrences (Phase E)
- [ ] `pnpm test:alarm-dispatcher` green on the deployed commit
- [ ] Every disagreement with the legacy cron is explained by timezone, not by a scheduling bug
- [ ] **A plan is in place to retire the external minute-level cron in the same change that
      sets `ALARM_SHADOW_MODE=false`.** Leaving both senders live double-sends every alarm.

---

## Phase E — restart and duplicate-worker drill

Do this in shadow mode, before going active.

**Restart recovery.** Redeploy the dispatcher mid-window. On restart it should
log `starting`, re-acquire the lease, and continue. No duplicate occurrences for
the same alarm/day should appear in the log.

**Duplicate worker.** Temporarily scale the service to 2 replicas. Only one
instance should do work each tick; the other logs:

```
[alarm-dispatcher] skipped cycle; another instance owns leader lease
```

Scale back to 1. (The leader lease is unit-tested, but a live check confirms
both replicas actually see the same database.)

---

## Phase F — going active on staging

1. Set `ALARM_SHADOW_MODE=false` on **staging only**. Redeploy.
2. Watch the first cycle:

```sql
SELECT a.id, a.alarmId, a.scheduledForUtc, a.scheduledLocalKey, a.status,
       t.status AS targetStatus, t.attemptCount, t.providerStatus, t.lastErrorCode
FROM alarm_delivery_attempts a
LEFT JOIN alarm_delivery_targets t ON t.deliveryAttemptId = a.id
ORDER BY a.id DESC LIMIT 20;
```

3. Confirm on a real device:
   - the notification arrives at the right local time
   - **exactly one** notification per alarm per day, per device
   - two devices on one account each get one
   - `providerStatus` is 201; `attemptCount` is 1

4. Deliberately break a subscription (revoke notification permission, or delete
   the browser's service worker) and confirm the 410 path:
   - target becomes `terminal_failed`
   - the row in `push_subscriptions` is removed
   - the delivery target survives with `pushSubscriptionId = NULL`
   - no unbounded retrying

Production stays in shadow mode until staging has run active cleanly for a full
week including a weekend.

---

## Rollback

**Fast, safe, and complete — the dispatcher is additive.**

### Level 1 — stop sending (seconds)

Set `ALARM_SHADOW_MODE=true` and redeploy. The worker keeps observing but sends
nothing. In-flight claimed targets simply expire their leases; nothing is lost.

### Level 2 — stop the worker (seconds)

Railway → `rih-alarm-dispatcher` → **Remove/Stop** the deployment.

Alarm delivery reverts entirely to the legacy path: the external minute-level cron calling
`/api/scheduled/fire-alarms`. **Provided you have not yet retired that cron, there is nothing
to restart** and users see no interruption — they simply go back to being scheduled on the API
container's clock.

If you have already retired the cron, re-enable it *before* stopping the worker, or alarms
stop firing altogether.

### Level 3 — schema

Leave it. The migration is additive: a nullable `alarms.timezone` and five new
tables that simply go idle. The API build from before this sprint runs fine
against the migrated schema. **Do not write a down-migration** — dropping tables
to undo a stopped worker risks far more than it fixes.

### If you need one manual dispatch cycle

The break-glass route runs the same `runDispatchCycle()`, so all the same
guarantees apply:

```bash
curl -X POST https://api-staging.riseinharmony.com/api/scheduled/fire-alarms \
  -H "Authorization: Bearer $CRON_SECRET"
```

It is **not** a scheduler — do not put it on a timer. If the worker is healthy
it holds the lease and this returns `skippedBecauseLeaderBusy: true`, which is
correct behavior, not an error.

---

## Production promotion

Only after staging has been active and clean for a week:

1. Generate a **separate production VAPID keypair**. Never reuse staging's.
2. Create `rih-alarm-dispatcher` in the production environment with
   `ALARM_SHADOW_MODE=true`.
3. Apply the migration to production **behind a fresh backup**
   ([scripts/backup-db.md](../../scripts/backup-db.md)).
4. Repeat Phases C–E against production traffic. Production has real alarms with
   NULL timezones — watch the backfill counter and expect it to fall slowly, as
   it only drops when a user re-saves an alarm.
5. Consider whether `ALARM_DEFAULT_TIMEZONE=America/New_York` is acceptable for
   your actual user distribution before going active. Every NULL-timezone alarm
   fires on New York's clock. If a meaningful share of users are elsewhere, they
   get woken at the wrong hour — backfill first, or gate delivery to alarms that
   have a real timezone.
6. Only then set `ALARM_SHADOW_MODE=false` in production.
