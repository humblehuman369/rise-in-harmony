/**
 * Regression tests for stale-job recovery (failStaleConvertJobs).
 *
 * Incident 2026-07-19: a job froze in `processing` when the Autoscale instance
 * lost CPU, and the reaper hard-failed it with TIMEOUT. The fix requeues a
 * stale job once (retryCount + 1) so a live worker can pick it up again, and
 * only fails permanently on the second reap.
 *
 * These tests run against the real database (same harness as other server
 * tests) using synthetic rows with a backdated updatedAt, and clean up after
 * themselves.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nanoid } from "nanoid";
import { getDb, failStaleConvertJobs } from "./db";
import { convertJobs, users } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

const marker = `stale-test-${nanoid(8)}`;
let testUserId: number;
const createdJobIds: number[] = [];

async function insertJob(opts: {
  retryCount: number;
  minutesAgo: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("db unavailable");
  const publicId = nanoid(16);
  await db.insert(convertJobs).values({
    publicId,
    userId: testUserId,
    status: "processing",
    stage: "processing",
    progressPct: 1,
    sourceKey: `convert/${testUserId}/${marker}/src.mp3`,
    sourceFilename: `${marker}.mp3`,
    targetPitchA: 432,
    pitchRatio: 432 / 440,
    cents: -31.77,
    retryCount: opts.retryCount,
  });
  const rows = await db
    .select()
    .from(convertJobs)
    .where(eq(convertJobs.publicId, publicId));
  const job = rows[0];
  if (!job) throw new Error("insert failed");
  // Backdate updatedAt directly (onUpdateNow would otherwise bump it).
  const backdated = new Date(Date.now() - opts.minutesAgo * 60 * 1000);
  await db.execute(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (await import("drizzle-orm")).sql`UPDATE convert_jobs SET updatedAt = ${backdated} WHERE id = ${job.id}`,
  );
  createdJobIds.push(job.id);
  return job.id;
}

async function getJob(id: number) {
  const db = await getDb();
  if (!db) throw new Error("db unavailable");
  const rows = await db
    .select()
    .from(convertJobs)
    .where(eq(convertJobs.id, id));
  return rows[0];
}

beforeAll(async () => {
  const db = await getDb();
  if (!db) throw new Error("db unavailable");
  await db.insert(users).values({ openId: `test-${marker}` });
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.openId, `test-${marker}`));
  testUserId = rows[0]!.id;
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  if (createdJobIds.length > 0) {
    await db.delete(convertJobs).where(inArray(convertJobs.id, createdJobIds));
  }
  await db.delete(users).where(eq(users.id, testUserId));
});

describe("failStaleConvertJobs requeue-once behavior", () => {
  it("requeues a first-time stale processing job instead of failing it", async () => {
    const id = await insertJob({ retryCount: 0, minutesAgo: 45 });
    const affected = await failStaleConvertJobs(30);
    expect(affected).toBeGreaterThanOrEqual(1);
    const job = await getJob(id);
    expect(job?.status).toBe("queued");
    expect(job?.stage).toBe("queued");
    expect(job?.retryCount).toBe(1);
    expect(job?.errorCode).toBeNull();
    // Remove from queue immediately so no worker (dev or prod) picks it up.
    const db = await getDb();
    await db!
      .update(convertJobs)
      .set({ status: "failed", stage: "error", errorCode: "TEST_CLEANUP" })
      .where(eq(convertJobs.id, id));
  });

  it("permanently fails a stale job that was already retried once", async () => {
    const id = await insertJob({ retryCount: 1, minutesAgo: 45 });
    await failStaleConvertJobs(30);
    const job = await getJob(id);
    expect(job?.status).toBe("failed");
    expect(job?.stage).toBe("error");
    expect(job?.errorCode).toBe("TIMEOUT");
    expect(job?.errorMessage).toContain("after retry");
  });

  it("does not touch fresh processing jobs", async () => {
    const id = await insertJob({ retryCount: 0, minutesAgo: 5 });
    await failStaleConvertJobs(30);
    const job = await getJob(id);
    expect(job?.status).toBe("processing");
    expect(job?.retryCount).toBe(0);
  });
});
