/**
 * Alarm dispatcher worker entry point.
 *
 * This is a dedicated Railway service (`rih-alarm-dispatcher`), not part of the
 * API process. It has no HTTP listener and no public domain — it reaches MySQL
 * over Railway's private network and talks outbound to push providers only.
 *
 * It is deliberately NOT a Railway cron job: cron cannot run more often than
 * every five minutes and expects the task to exit, whereas alarm delivery needs
 * a bounded 30–60s loop with lease-based recovery.
 *
 *   pnpm build:alarm-dispatcher && pnpm start:alarm-dispatcher
 */
import { loadDispatcherConfig } from "../alarm-dispatcher/config";
import { runDispatchCycle } from "../alarm-dispatcher/dispatch-cycle";
import { AlarmDispatchRepository } from "../alarm-dispatcher/repository";
import { WebPushGateway } from "../alarm-dispatcher/web-push-gateway";
import { getMysqlPool } from "../lib/dbPool";
import { log } from "../lib/logger";

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, Math.max(0, ms));
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the alarm dispatcher");
  }

  const config = loadDispatcherConfig();
  const pool = getMysqlPool(process.env.DATABASE_URL);
  const repo = new AlarmDispatchRepository(pool);
  const push = new WebPushGateway(config);
  const abort = new AbortController();
  const releaseSha = process.env.RELEASE_SHA;

  const shutdown = (signal: string) => {
    log.info("[alarm-dispatcher] shutdown requested", {
      signal,
      instanceId: config.instanceId,
    });
    abort.abort();
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  log.info("[alarm-dispatcher] starting", {
    instanceId: config.instanceId,
    intervalMs: config.intervalMs,
    shadowMode: config.shadowMode,
    defaultTimezone: config.defaultTimezone,
    releaseSha,
  });

  // Backfill watch: alarms created before alarms.timezone existed fall back to
  // ALARM_DEFAULT_TIMEZONE, which is wrong for anyone outside that zone. This
  // count should trend to zero as clients re-save. Non-fatal if it fails.
  try {
    const { nullTimezone, total } = await repo.countAlarmsWithNullTimezone();
    log.info("[alarm-dispatcher] alarm timezone backfill status", {
      alarmsWithNullTimezone: nullTimezone,
      totalAlarms: total,
      fallbackTimezone: config.defaultTimezone,
      percentComplete: total > 0 ? Math.round(((total - nullTimezone) / total) * 100) : 100,
    });
  } catch (error) {
    log.warn("[alarm-dispatcher] could not read timezone backfill status", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    while (!abort.signal.aborted) {
      const cycleStartedAt = Date.now();
      try {
        await runDispatchCycle({ now: () => new Date(), repo, push, config, log, releaseSha });
      } catch (error) {
        // Stay alive on recoverable database/provider errors: the next bounded
        // loop reclaims expired leases and retries. Heartbeat + logs carry the
        // failure to monitoring.
        log.error("[alarm-dispatcher] cycle crashed; will retry next interval", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      await sleep(config.intervalMs - (Date.now() - cycleStartedAt), abort.signal);
    }
  } finally {
    await repo.releaseLeaderLease(config.instanceId).catch(() => undefined);
    await pool.end().catch(() => undefined);
    log.info("[alarm-dispatcher] stopped", { instanceId: config.instanceId });
  }
}

void main().catch((error) => {
  // Configuration errors are unrecoverable: exit non-zero so Railway's restart
  // policy surfaces a crash-looping service instead of a silently idle one.
  log.error("[alarm-dispatcher] failed during startup", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
