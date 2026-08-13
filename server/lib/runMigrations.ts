/**
 * runMigrations — lightweight SQL migration runner
 *
 * Applies pending SQL files from the /drizzle directory in order.
 * Uses a simple `__drizzle_migrations` table to track which migrations
 * have already been applied (idempotent — safe to call on every startup).
 *
 * This avoids the need for drizzle-kit at runtime and works with the
 * existing Railway Dockerfile (no extra CLI tools needed).
 */
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";
import { log } from "./logger";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_TABLE = "__drizzle_migrations";

/**
 * Locate the checked-in migrations directory.
 *
 * A fixed `../../drizzle` only works under tsx in development, where this file
 * sits at `server/lib/`. The production image runs the esbuild bundle at
 * `/app/dist/index.js`, so the same relative path resolved to `/drizzle` — which
 * does not exist — and every production migration silently no-opped because the
 * caller treats a runner failure as non-fatal.
 *
 * Probe the realistic layouts instead and return the first that exists.
 */
/**
 * MySQL errors meaning "this object is already in the desired state".
 *
 * Matching on codes rather than text because drizzle wraps driver errors: its
 * `message` is only `Failed query: <sql>\nparams:`, with the real MySQL error on
 * `cause`. A message-only check therefore never matched, and the runner aborted
 * on the first already-applied statement instead of skipping it.
 */
const IDEMPOTENT_ERROR_CODES = new Set([
  "ER_TABLE_EXISTS_ERROR", // 1050 table already exists
  "ER_DUP_FIELDNAME", // 1060 duplicate column name
  "ER_DUP_KEYNAME", // 1061 duplicate key name
  "ER_DUP_ENTRY", // 1062 duplicate entry for key
  "ER_CANT_DROP_FIELD_OR_KEY", // 1091 can't DROP; check that it exists
  "ER_FK_DUP_NAME", // 1826 duplicate foreign key constraint name
]);

const IDEMPOTENT_ERROR_TEXT = [
  "already exists",
  "Duplicate column name",
  "Duplicate key name",
  "Duplicate entry",
  "Duplicate foreign key",
  "Can't DROP",
  "check that column/key exists",
];

/** Walk the cause chain — drizzle nests the driver error one or more levels down. */
function errorChain(err: unknown): unknown[] {
  const chain: unknown[] = [];
  let current = err;
  for (let depth = 0; current != null && depth < 5; depth++) {
    chain.push(current);
    current = (current as { cause?: unknown }).cause;
  }
  return chain;
}

/** True when the statement failed only because it had already been applied. */
function isAlreadyAppliedError(err: unknown): boolean {
  return errorChain(err).some(link => {
    const code = (link as { code?: string }).code;
    if (code && IDEMPOTENT_ERROR_CODES.has(code)) return true;
    const message = link instanceof Error ? link.message : String(link ?? "");
    return IDEMPOTENT_ERROR_TEXT.some(needle => message.includes(needle));
  });
}

/** Deepest driver message, for logging a failure that is genuinely fatal. */
function rootCauseMessage(err: unknown): string {
  const chain = errorChain(err);
  const deepest = chain[chain.length - 1];
  return deepest instanceof Error ? deepest.message : String(deepest ?? err);
}

/** Exported for tests only — these are internal helpers, not part of the API. */
export const __testing = { isAlreadyAppliedError, rootCauseMessage };

function resolveMigrationsDir(): string | null {
  const candidates = [
    join(process.cwd(), "drizzle"), // container: WORKDIR /app, migrations at /app/drizzle
    join(__dirname, "../../drizzle"), // dev under tsx: server/lib/../../drizzle
    join(__dirname, "../drizzle"), // bundled at /app/dist/index.js
    join(__dirname, "drizzle"),
  ];
  return candidates.find(existsSync) ?? null;
}

export async function runMigrations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any
): Promise<void> {
  if (!db) return;

  const MIGRATIONS_DIR = resolveMigrationsDir();
  if (!MIGRATIONS_DIR) {
    // Loud on purpose: this used to fail silently, so the schema could drift
    // arbitrarily far from the checked-in migrations without any signal.
    log.error("[migrations] Could not locate the drizzle/ directory — NO MIGRATIONS APPLIED", {
      cwd: process.cwd(),
      moduleDir: __dirname,
    });
    return;
  }
  log.info("[migrations] Using migrations directory", { dir: MIGRATIONS_DIR });

  try {
    // Ensure the migrations tracking table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`${MIGRATIONS_TABLE}\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`tag\` varchar(256) NOT NULL UNIQUE,
        \`applied_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get already-applied migrations
    const rows = await db.execute(`SELECT tag FROM \`${MIGRATIONS_TABLE}\``);
    const applied = new Set<string>(
      (Array.isArray(rows[0]) ? rows[0] : rows).map((r: { tag: string }) => r.tag)
    );

    // Read all .sql files in order
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith(".sql"))
      .sort();

    let applied_count = 0;
    for (const file of files) {
      const tag = file.replace(/\.sql$/, "");
      if (applied.has(tag)) continue;

      // Named fileSql, not sql — `sql` is drizzle's tagged template, imported above.
      const fileSql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");

      // Strip drizzle-kit statement-breakpoint markers before parsing.
      // These markers (-->  statement-breakpoint) are drizzle-kit specific
      // and cause MySQL syntax errors if passed through as-is.
      const cleanedSql = fileSql.replace(/--> *statement-breakpoint/g, "");
      // Split on statement boundaries (semicolons) and strip SQL comments.
      // Each statement is executed separately to handle multi-statement files.
      const statements = cleanedSql
        .split(/;[\s\n]*(?=(?:[^']*'[^']*')*[^']*$)/)
        .map(s => s.replace(/--[^\n]*/g, "").trim())
        .filter(s => s.length > 0);

      for (const stmt of statements) {
        try {
          await db.execute(stmt);
        } catch (err) {
          // Re-running a migration on an already-migrated database is expected:
          // this project has schema that predates the tracking table entirely.
          if (isAlreadyAppliedError(err)) {
            log.warn(`[migrations] ${tag}: skipping already-applied statement`);
            continue;
          }
          log.error(`[migrations] ${tag}: statement failed`, {
            error: rootCauseMessage(err),
            statement: stmt.slice(0, 200),
          });
          throw err;
        }
      }

      // Drizzle's execute() takes a single SQL value, not (text, params) — a
      // second array argument is ignored, leaving the ? placeholder unbound and
      // the insert failing. Use the tagged template so `tag` is bound properly.
      await db.execute(
        sql`INSERT IGNORE INTO __drizzle_migrations (tag) VALUES (${tag})`
      );
      log.info(`[migrations] Applied: ${tag}`);
      applied_count++;
    }

    if (applied_count === 0) {
      log.info("[migrations] All migrations already applied");
    } else {
      log.info(`[migrations] Applied ${applied_count} migration(s)`);
    }
  } catch (err) {
    log.warn("[migrations] Migration runner failed — continuing startup", {
      error: rootCauseMessage(err),
    });
    // Non-fatal: server still starts, but new columns may be missing
  }
}
