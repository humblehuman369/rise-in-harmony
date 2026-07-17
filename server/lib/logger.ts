/**
 * Lightweight structured logger (JSON lines).
 * Swap for pino/winston later without changing call sites.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

function emit(level: LogLevel, msg: string, meta?: LogMeta) {
  const line = JSON.stringify({
    level,
    msg,
    ts: new Date().toISOString(),
    service: "rise-in-harmony",
    ...(meta ?? {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, meta?: LogMeta) => emit("debug", msg, meta),
  info: (msg: string, meta?: LogMeta) => emit("info", msg, meta),
  warn: (msg: string, meta?: LogMeta) => emit("warn", msg, meta),
  error: (msg: string, meta?: LogMeta) => emit("error", msg, meta),
};
