/**
 * check-web-bundle.mjs — release gate for the Vercel web artifact.
 *
 * Vite inlines VITE_* values at build time, so a secret placed in a VITE_ var is
 * published to every visitor. This asserts two things about `dist/public`:
 *
 *   1. No Manus runtime module or /__manus__/ asset survived the build.
 *   2. No server secret leaked into the bundle — checked both by value-shape
 *      (mysql://, sk_live_, whsec_ …) and, more precisely, by confirming that
 *      the literal value of any server-secret env var present in this
 *      environment does not appear anywhere in the output.
 *
 * Run after `pnpm build:web`:  node scripts/check-web-bundle.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = path.join(PROJECT_ROOT, "dist/public");

/** Manus coupling that must not reach the production web build. */
const FORBIDDEN_SUBSTRINGS = [
  "vite-plugin-manus-runtime",
  "/__manus__/",
  ".manus-logs",
];

/** Shapes of credentials that are never safe in a browser bundle. */
const FORBIDDEN_PATTERNS = [
  { label: "MySQL connection string", re: /mysql:\/\/[^\s"'`]*:[^\s"'`]*@/ },
  { label: "Stripe live secret key", re: /\bsk_live_[A-Za-z0-9]{10,}/ },
  { label: "Stripe test secret key", re: /\bsk_test_[A-Za-z0-9]{10,}/ },
  { label: "Stripe restricted key", re: /\brk_live_[A-Za-z0-9]{10,}/ },
  { label: "Stripe webhook signing secret", re: /\bwhsec_[A-Za-z0-9]{10,}/ },
  { label: "Resend API key", re: /\bre_[A-Za-z0-9]{20,}/ },
];

/**
 * Server-only env vars. If one is set while this runs, its literal value must
 * not appear in the bundle. This catches a secret smuggled in under any name.
 */
const SERVER_SECRET_ENV = [
  "DATABASE_URL",
  "JWT_SECRET",
  "CRON_SECRET",
  "RIH_STRIPE_SECRET_KEY",
  "RIH_STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "REVENUECAT_SECRET_KEY",
  "REVENUECAT_WEBHOOK_SECRET",
  "RIH_VAPID_PRIVATE_KEY",
  "RIH_RELAY_AUTH_SECRET",
  "BUILT_IN_FORGE_API_KEY",
];

/** Short values would cause false positives; ignore them. */
const MIN_SECRET_LENGTH = 12;

function collectFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectFiles(full));
    } else if (/\.(js|mjs|cjs|css|html|json|map|txt)$/i.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

function main() {
  if (!fs.existsSync(BUILD_DIR)) {
    console.error(`✗ ${path.relative(PROJECT_ROOT, BUILD_DIR)} not found — run \`pnpm build:web\` first.`);
    process.exit(1);
  }

  const files = collectFiles(BUILD_DIR);
  if (files.length === 0) {
    console.error("✗ Build output contains no scannable files.");
    process.exit(1);
  }

  const secretValues = SERVER_SECRET_ENV.flatMap((name) => {
    const value = process.env[name];
    return value && value.trim().length >= MIN_SECRET_LENGTH
      ? [{ name, value: value.trim() }]
      : [];
  });

  const violations = [];

  for (const file of files) {
    const relative = path.relative(PROJECT_ROOT, file);
    const content = fs.readFileSync(file, "utf8");

    for (const needle of FORBIDDEN_SUBSTRINGS) {
      if (content.includes(needle)) {
        violations.push(`${relative}: contains Manus marker "${needle}"`);
      }
    }

    for (const { label, re } of FORBIDDEN_PATTERNS) {
      if (re.test(content)) {
        violations.push(`${relative}: matches ${label}`);
      }
    }

    for (const { name } of secretValues.filter(({ value }) => content.includes(value))) {
      violations.push(`${relative}: contains the literal value of ${name}`);
    }
  }

  if (violations.length > 0) {
    console.error("✗ Web bundle failed the release gate:\n");
    for (const violation of violations) console.error(`  - ${violation}`);
    console.error(
      "\nA VITE_* value is compiled into the browser bundle and is public. " +
        "Move the offending value to a Railway server variable.",
    );
    process.exit(1);
  }

  console.log(
    `✓ Web bundle clean: ${files.length} file(s) scanned, no Manus runtime, ` +
      `no secret-shaped values, ${secretValues.length} env secret(s) cross-checked.`,
  );
}

main();
