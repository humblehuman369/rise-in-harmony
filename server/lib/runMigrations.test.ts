import { describe, expect, it } from "vitest";
import { __testing } from "./runMigrations";

const { isAlreadyAppliedError, rootCauseMessage } = __testing;

/** Shape drizzle produces: a wrapper whose message hides the driver error on `cause`. */
function drizzleError(sqlText: string, cause: unknown): Error {
  const err = new Error(`Failed query: ${sqlText}\nparams: `);
  (err as Error & { cause?: unknown }).cause = cause;
  return err;
}

function mysqlError(message: string, code: string): Error {
  const err = new Error(message);
  (err as Error & { code?: string }).code = code;
  return err;
}

describe("isAlreadyAppliedError", () => {
  it("sees through drizzle's wrapper to a duplicate-table error", () => {
    // The exact shape that aborted the staging run: drizzle's message says only
    // "Failed query: CREATE TABLE `alarms` ...", so a message-only check missed it.
    const err = drizzleError(
      "CREATE TABLE `alarms` (...)",
      mysqlError("Table 'alarms' already exists", "ER_TABLE_EXISTS_ERROR"),
    );
    expect(err.message).not.toContain("already exists"); // guards the regression
    expect(isAlreadyAppliedError(err)).toBe(true);
  });

  it.each([
    ["ER_TABLE_EXISTS_ERROR", "Table 'x' already exists"],
    ["ER_DUP_FIELDNAME", "Duplicate column name 'timezone'"],
    ["ER_DUP_KEYNAME", "Duplicate key name 'idx_x'"],
    ["ER_DUP_ENTRY", "Duplicate entry '1' for key 'PRIMARY'"],
    ["ER_CANT_DROP_FIELD_OR_KEY", "Can't DROP 'x'; check that column/key exists"],
    ["ER_FK_DUP_NAME", "Duplicate foreign key constraint name 'fk_x'"],
  ])("treats %s as already-applied", (code, message) => {
    expect(isAlreadyAppliedError(drizzleError("ALTER TABLE x", mysqlError(message, code)))).toBe(
      true,
    );
  });

  it("matches on message text when no driver code is present", () => {
    expect(isAlreadyAppliedError(new Error("Table 'alarms' already exists"))).toBe(true);
  });

  it("does NOT swallow a genuine failure", () => {
    // A syntax error or a missing referenced table must still abort the run.
    const err = drizzleError(
      "CREATE TABLE `x` (...)",
      mysqlError("You have an error in your SQL syntax", "ER_PARSE_ERROR"),
    );
    expect(isAlreadyAppliedError(err)).toBe(false);
  });

  it("does NOT swallow a missing foreign-key target", () => {
    const err = drizzleError(
      "CREATE TABLE `alarm_delivery_targets` (...)",
      mysqlError("Failed to open the referenced table 'push_subscriptions'", "ER_NO_REFERENCED_ROW"),
    );
    expect(isAlreadyAppliedError(err)).toBe(false);
  });

  it("tolerates null, undefined and non-Error values", () => {
    expect(isAlreadyAppliedError(null)).toBe(false);
    expect(isAlreadyAppliedError(undefined)).toBe(false);
    expect(isAlreadyAppliedError("boom")).toBe(false);
  });

  it("terminates on a self-referential cause chain", () => {
    const a = new Error("a") as Error & { cause?: unknown };
    a.cause = a;
    expect(() => isAlreadyAppliedError(a)).not.toThrow();
  });
});

describe("rootCauseMessage", () => {
  it("reports the driver error, not drizzle's opaque wrapper", () => {
    const err = drizzleError("CREATE TABLE `x`", mysqlError("Unknown column 'y'", "ER_BAD_FIELD_ERROR"));
    expect(rootCauseMessage(err)).toBe("Unknown column 'y'");
  });

  it("falls back to the error itself when there is no cause", () => {
    expect(rootCauseMessage(new Error("plain failure"))).toBe("plain failure");
  });
});
