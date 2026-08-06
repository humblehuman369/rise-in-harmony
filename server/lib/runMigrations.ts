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
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { log } from "./logger";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Migrations live at /drizzle/*.sql relative to the repo root
const MIGRATIONS_DIR = join(__dirname, "../../drizzle");
const MIGRATIONS_TABLE = "__drizzle_migrations";

export async function runMigrations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any
): Promise<void> {
  if (!db) return;

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

      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");

      // Strip drizzle-kit statement-breakpoint markers before parsing.
      // These markers (-->  statement-breakpoint) are drizzle-kit specific
      // and cause MySQL syntax errors if passed through as-is.
      const cleanedSql = sql.replace(/--> *statement-breakpoint/g, "");
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
          // Ignore "column already exists" and "duplicate column" errors
          // so re-running migrations on an already-migrated DB is safe
          const msg = err instanceof Error ? err.message : String(err);
          if (
            msg.includes("Duplicate column name") ||
            msg.includes("already exists") ||
            msg.includes("Can't DROP") ||
            msg.includes("check that column/key exists") ||
            msg.includes("Duplicate entry") ||
            msg.includes("Duplicate key name")
          ) {
            log.warn(`[migrations] ${tag}: skipping already-applied statement`);
            continue;
          }
          throw err;
        }
      }

      await db.execute(
        `INSERT IGNORE INTO \`${MIGRATIONS_TABLE}\` (tag) VALUES (?)`,
        [tag]
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
      error: err instanceof Error ? err.message : String(err),
    });
    // Non-fatal: server still starts, but new columns may be missing
  }
}
