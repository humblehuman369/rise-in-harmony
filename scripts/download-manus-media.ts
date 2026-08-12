/**
 * download-manus-media.ts — Phase 0 safety export.
 *
 * Downloads every streamed MP3 master that the catalog currently serves from the
 * Manus CDN into `media-export/`, and writes `media-export/manifest.json` with
 * slug, sha256, byte size, content type, and source URL.
 *
 * This runs in Phase 0 on purpose: Manus access could disappear before the media
 * phase, and these masters are not stored anywhere else we control.
 *
 * It does NOT change any catalog URL. Re-hosting is a later sprint.
 *
 *   pnpm media:export           # download missing files, verify existing ones
 *   pnpm media:export --force   # re-download everything
 *
 * The MP3s stay out of git (see .gitignore); the manifest is committed so we can
 * verify a future re-host byte-for-byte against what Manus served.
 */
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(PROJECT_ROOT, "media-export");
const MANIFEST_PATH = path.join(OUT_DIR, "manifest.json");

/**
 * Catalog sources scanned for remote masters. Each file maps a slug to a URL;
 * only absolute Manus CDN URLs are exported (local `/audio/*` paths already
 * live in the repo under client/public).
 */
const CATALOG_SOURCES = [
  "client/src/data/backgroundLoops.ts",
  "apps/mobile/src/hooks/useMeditationPlayer.ts",
];

const MANUS_URL = /https:\/\/files\.manuscdn\.com\/[^"'`\s]+/;
/** Matches `"slug": "https://files.manuscdn.com/..."` entries in a catalog map. */
const CATALOG_ENTRY = new RegExp(
  String.raw`["']([\w.-]+)["']\s*:\s*["'](${MANUS_URL.source})["']`,
  "g",
);

interface MediaEntry {
  slug: string;
  sourceUrl: string;
  /** Catalog files that reference this URL. */
  referencedBy: string[];
}

interface ManifestRecord {
  slug: string;
  file: string;
  sourceUrl: string;
  sha256: string;
  bytes: number;
  contentType: string | null;
  downloadedAt: string;
  referencedBy: string[];
}

async function collectCatalogEntries(): Promise<MediaEntry[]> {
  const bySlug = new Map<string, MediaEntry>();

  for (const relative of CATALOG_SOURCES) {
    const absolute = path.join(PROJECT_ROOT, relative);
    let source: string;
    try {
      source = await fs.readFile(absolute, "utf8");
    } catch {
      console.warn(`! catalog source not found, skipping: ${relative}`);
      continue;
    }

    for (const match of source.matchAll(CATALOG_ENTRY)) {
      const [, slug, sourceUrl] = match;
      const existing = bySlug.get(slug);
      if (existing) {
        if (existing.sourceUrl !== sourceUrl) {
          throw new Error(
            `Slug "${slug}" maps to two different URLs:\n  ${existing.sourceUrl}\n  ${sourceUrl}`,
          );
        }
        existing.referencedBy.push(relative);
        continue;
      }
      bySlug.set(slug, { slug, sourceUrl, referencedBy: [relative] });
    }
  }

  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Any manuscdn URL in the catalog files that no slug regex captured. */
async function findUnmatchedUrls(entries: MediaEntry[]): Promise<string[]> {
  const known = new Set(entries.map((entry) => entry.sourceUrl));
  const unmatched = new Set<string>();

  for (const relative of CATALOG_SOURCES) {
    let source: string;
    try {
      source = await fs.readFile(path.join(PROJECT_ROOT, relative), "utf8");
    } catch {
      continue;
    }
    for (const match of source.matchAll(new RegExp(MANUS_URL.source, "g"))) {
      if (!known.has(match[0])) unmatched.add(match[0]);
    }
  }

  return [...unmatched];
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readIfExists(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

async function download(url: string): Promise<{ body: Buffer; contentType: string | null }> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.byteLength === 0) {
    throw new Error("empty response body");
  }
  return { body, contentType: response.headers.get("content-type") };
}

async function main() {
  const force = process.argv.includes("--force");

  const entries = await collectCatalogEntries();
  if (entries.length === 0) {
    throw new Error(
      "No Manus CDN media found in the catalog. If the catalog moved, update CATALOG_SOURCES.",
    );
  }

  const unmatched = await findUnmatchedUrls(entries);
  if (unmatched.length > 0) {
    console.warn(
      `! ${unmatched.length} Manus URL(s) present but not in a "slug": "url" map — export them by hand:`,
    );
    for (const url of unmatched) console.warn(`    ${url}`);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`Exporting ${entries.length} master(s) to ${path.relative(PROJECT_ROOT, OUT_DIR)}/\n`);

  const manifest: ManifestRecord[] = [];
  const failures: { slug: string; error: string }[] = [];

  for (const entry of entries) {
    const fileName = `${entry.slug}.mp3`;
    const filePath = path.join(OUT_DIR, fileName);

    try {
      let body = force ? null : await readIfExists(filePath);
      let contentType: string | null = null;

      if (body) {
        console.log(`= ${entry.slug} (already exported, ${body.byteLength} bytes)`);
      } else {
        const result = await download(entry.sourceUrl);
        body = result.body;
        contentType = result.contentType;
        await fs.writeFile(filePath, body);
        console.log(`✓ ${entry.slug} (${body.byteLength} bytes)`);
      }

      manifest.push({
        slug: entry.slug,
        file: fileName,
        sourceUrl: entry.sourceUrl,
        sha256: sha256(body),
        bytes: body.byteLength,
        contentType,
        downloadedAt: new Date().toISOString(),
        referencedBy: entry.referencedBy,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`✗ ${entry.slug}: ${message}`);
      failures.push({ slug: entry.slug, error: message });
    }
  }

  await fs.writeFile(
    MANIFEST_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note: "Phase 0 Manus CDN export. Audio files are gitignored; this manifest is the checked-in record.",
        catalogSources: CATALOG_SOURCES,
        totalBytes: manifest.reduce((sum, record) => sum + record.bytes, 0),
        count: manifest.length,
        media: manifest,
        ...(failures.length > 0 ? { failures } : {}),
        ...(unmatched.length > 0 ? { unmatchedUrls: unmatched } : {}),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const totalMb = (manifest.reduce((sum, r) => sum + r.bytes, 0) / 1024 / 1024).toFixed(1);
  console.log(`\nManifest: ${path.relative(PROJECT_ROOT, MANIFEST_PATH)}`);
  console.log(`Exported ${manifest.length}/${entries.length} file(s), ${totalMb} MB total.`);

  if (failures.length > 0) {
    console.error(`\n${failures.length} download(s) failed — re-run before trusting this export.`);
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
