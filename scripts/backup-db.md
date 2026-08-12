# MySQL logical backup & restore — Rise In Harmony

Phase 0 recoverability. **You run the production export yourself**; nothing here is automated
or wired into CI, and no command in this file is ever run against production by tooling.

The goal is a logical (`mysqldump`) backup that can be restored into an **isolated** database
to (a) prove the backup is real and (b) give staging a schema to migrate against.

---

## 0. Before you start

```bash
mysqldump --version
```

Match the client major version to the server (Railway MySQL is 8.x). A MySQL 5.7 client
dumping an 8.0 server produces subtly broken output.

Get the production connection string from **Railway → production environment → MySQL →
Variables → `MYSQL_URL`** (the public proxy URL, since you are connecting from your laptop).

```bash
# Keep the URL out of shell history: read it interactively.
read -rs PROD_MYSQL_URL && export PROD_MYSQL_URL
```

Parse it once into parts (`mysql://USER:PASS@HOST:PORT/DB`):

```bash
export PROD_HOST=$(echo "$PROD_MYSQL_URL" | sed -E 's|.*@([^:]+):.*|\1|')
export PROD_PORT=$(echo "$PROD_MYSQL_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
export PROD_USER=$(echo "$PROD_MYSQL_URL" | sed -E 's|mysql://([^:]+):.*|\1|')
export PROD_PASS=$(echo "$PROD_MYSQL_URL" | sed -E 's|mysql://[^:]+:([^@]+)@.*|\1|')
export PROD_DB=$(echo "$PROD_MYSQL_URL"   | sed -E 's|.*/([^?]+).*|\1|')
echo "host=$PROD_HOST port=$PROD_PORT db=$PROD_DB user=$PROD_USER"   # password intentionally not echoed
```

---

## 1. Export production (read-only)

`mysqldump` only reads. `--single-transaction` gives a consistent InnoDB snapshot **without
locking tables**, so production keeps serving traffic.

```bash
mkdir -p ~/rih-backups && cd ~/rih-backups

mysqldump \
  --host="$PROD_HOST" --port="$PROD_PORT" \
  --user="$PROD_USER" --password="$PROD_PASS" \
  --single-transaction \
  --quick \
  --set-gtid-purged=OFF \
  --column-statistics=0 \
  --default-character-set=utf8mb4 \
  --routines --events --triggers \
  --add-drop-table \
  "$PROD_DB" > "rih-prod-$(date -u +%Y%m%dT%H%M%SZ).sql"
```

Flag notes:

| Flag | Why |
|---|---|
| `--single-transaction` | Consistent snapshot, no write lock. **Required** — do not drop it. |
| `--quick` | Streams rows instead of buffering the whole table in RAM. |
| `--set-gtid-purged=OFF` | Without this the dump carries GTID state that breaks restore into a fresh server. |
| `--column-statistics=0` | Avoids a `mysqldump 8` vs. managed-server histogram error. Drop it if your client rejects the flag. |
| `--routines --events --triggers` | Captures schema objects a table-only dump silently loses. |
| `--add-drop-table` | Makes the restore idempotent into a scratch database. |

**Do not** use `--all-databases` — it drags in `mysql.user` and grant state that does not
belong in a restore target.

### Verify the dump before trusting it

```bash
DUMP=rih-prod-YYYYMMDDTHHMMSSZ.sql       # substitute your actual filename

ls -lh "$DUMP"
tail -1 "$DUMP"                          # must read: -- Dump completed on ...
grep -c 'CREATE TABLE' "$DUMP"           # expect 10 today (see §4)
```

A dump missing the `Dump completed` trailer is **truncated** — re-run it. Size alone proves
nothing.

### Encrypt and store

The dump contains every user record. Treat it as the most sensitive artifact in the project.

```bash
# Encrypt at rest (prompts for a passphrase; store that in your password manager).
gpg --symmetric --cipher-algo AES256 "$DUMP"
shred -u "$DUMP" 2>/dev/null || rm -P "$DUMP"    # remove the plaintext
```

Store `"$DUMP".gpg` **outside** the Railway project — a password-manager vault item or an
encrypted archive you control. Never commit it, never put it in the repo, never attach it to
an issue. Set yourself a reminder to delete it once staging validation is signed off.

---

## 2. Restore into an isolated database

**Never restore into production.** Target a scratch database — local Docker is the safest.

```bash
docker run --name rih-restore-test \
  -e MYSQL_ROOT_PASSWORD=localonly \
  -e MYSQL_DATABASE=rih_restore \
  -p 3307:3306 -d mysql:8

sleep 25   # let the server initialize

gpg --decrypt "$DUMP".gpg > /tmp/rih-restore.sql

mysql --host=127.0.0.1 --port=3307 --user=root --password=localonly \
      --default-character-set=utf8mb4 \
      rih_restore < /tmp/rih-restore.sql

rm -f /tmp/rih-restore.sql
```

To restore into **Railway staging MySQL** instead, swap the connection flags for the staging
values. Confirm the host is the staging one before pressing enter — this command is
destructive to its target.

---

## 3. Validate the restore

Schema shape:

```bash
mysql --host=127.0.0.1 --port=3307 --user=root --password=localonly rih_restore \
  -e "SELECT table_name, table_rows FROM information_schema.tables
      WHERE table_schema='rih_restore' ORDER BY table_name;"
```

Integrity spot-checks:

```bash
mysql --host=127.0.0.1 --port=3307 --user=root --password=localonly rih_restore <<'SQL'
SELECT 'users' AS t, COUNT(*) AS n FROM users
UNION ALL SELECT 'alarms', COUNT(*) FROM alarms
UNION ALL SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL SELECT 'studio_presets', COUNT(*) FROM studio_presets
UNION ALL SELECT 'subscription_events', COUNT(*) FROM subscription_events;

-- Orphan check: every alarm must resolve to a live user.
SELECT COUNT(*) AS orphaned_alarms
FROM alarms a LEFT JOIN users u ON u.id = a.userId
WHERE u.id IS NULL;

-- alarms.days must be valid JSON arrays; the dispatcher parses this column.
SELECT COUNT(*) AS bad_days_json FROM alarms WHERE JSON_VALID(days) = 0;
SQL
```

Expected: row counts match production's order of magnitude, `orphaned_alarms = 0`,
`bad_days_json = 0`.

Then confirm the migration history applies cleanly on top:

```bash
DATABASE_URL="mysql://root:localonly@127.0.0.1:3307/rih_restore" pnpm db:migrate
```

Tear down:

```bash
docker rm -f rih-restore-test
```

---

## 4. Current schema baseline

Ten tables as of this snapshot ([`drizzle/schema.ts`](../drizzle/schema.ts)):

`users`, `sessions`, `alarms`, `studio_presets`, `user_sounds`, `healing_favorites`,
`subscription_events`, `user_programs`, `program_day_completions`, `convert_jobs`

Sprint 1 adds five, **all additive**: `push_subscriptions`, `alarm_delivery_attempts`,
`alarm_delivery_targets`, `dispatcher_leases`, `dispatcher_heartbeats` — plus a nullable
`alarms.timezone` column. Nothing is dropped, renamed, or re-keyed, so a restore of this
backup remains forward-compatible.

---

## 5. Migration gate ordering

Apply in this order for every staging/production release:

1. Backup taken (or the target is a fresh staging database)
2. `pnpm db:migrate` exits `0` — **once per release, never per API instance at startup**
3. API deploy starts
4. `/readyz` returns 200
5. Smoke tests

If step 2 fails, stop. Do not deploy application code against a partially migrated schema.
