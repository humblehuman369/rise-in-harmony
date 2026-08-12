/**
 * UTC boundary for the alarm dispatcher's DATETIME columns.
 *
 * The delivery ledger stores instants in MySQL `DATETIME` columns, which carry
 * no time zone. mysql2 will happily convert a JS `Date` using the *connection's*
 * time zone on write and back again on read, so the same row can read back as a
 * different instant on a connection whose `time_zone` differs — between the API
 * and the dispatcher, or after a Railway image change.
 *
 * Everything in `alarm_delivery_attempts`, `alarm_delivery_targets`,
 * `dispatcher_leases` and `dispatcher_heartbeats` is UTC, and this module is the
 * only place that converts. Rules:
 *
 *   - WRITE: always bind `toUtcSql(date)`, never a raw `Date`.
 *   - READ:  always select through `utcColumn()` so MySQL hands back a string,
 *            then parse it with `fromUtcSql`.
 *
 * Never compare a DATETIME column against `NOW()` in SQL — that is the server's
 * local clock. Bind `toUtcSql(now)` instead.
 */

/** MySQL DATETIME literal, e.g. `2026-07-06 11:30:00`. */
export type UtcSqlString = string;

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

/**
 * Format an instant as a UTC MySQL DATETIME literal.
 * Sub-second precision is dropped: the columns are second-resolution and alarm
 * scheduling is minute-resolution.
 */
export function toUtcSql(date: Date): UtcSqlString {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("toUtcSql received an invalid Date");
  }
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/** Nullable form, for optional columns like `nextAttemptAt`. */
export function toUtcSqlOrNull(date: Date | null | undefined): UtcSqlString | null {
  return date == null ? null : toUtcSql(date);
}

const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;

/**
 * Parse a UTC MySQL DATETIME back into a `Date`.
 *
 * Accepts a `Date` too: if the driver was configured to parse dates despite
 * `utcColumn()`, the value has already been built in the connection's zone and
 * we cannot recover the original text, so it is returned unchanged rather than
 * shifted a second time.
 */
export function fromUtcSql(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;

  const match = DATETIME_PATTERN.exec(value);
  if (!match) {
    throw new RangeError(`fromUtcSql could not parse MySQL DATETIME: ${value}`);
  }
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ),
  );
}

/**
 * SQL fragment that returns a DATETIME column as a plain string, bypassing
 * driver-level date parsing so `fromUtcSql` sees the stored text verbatim.
 *
 *   utcColumn("t.leaseExpiresAt")            -> DATE_FORMAT(...) AS `leaseExpiresAt`
 *   utcColumn("a.scheduledForUtc", "dueAt")  -> DATE_FORMAT(...) AS `dueAt`
 *
 * Column references are interpolated, so callers must pass literals only —
 * never user input.
 */
export function utcColumn(reference: string, alias?: string): string {
  const resolved = alias ?? reference.split(".").pop() ?? reference;
  return `DATE_FORMAT(${reference}, '%Y-%m-%d %H:%i:%s') AS \`${resolved}\``;
}

/** Truncate to the start of the minute in UTC. Alarms are minute-resolution. */
export function floorToUtcMinute(date: Date): Date {
  const floored = new Date(date.getTime());
  floored.setUTCSeconds(0, 0);
  return floored;
}
