/**
 * Shared mysql2 connection pool for Drizzle.
 */
import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";

let _pool: Pool | null = null;

export function getPoolConfig() {
  const connectionLimit = Math.min(
    50,
    Math.max(2, parseInt(process.env.DB_POOL_SIZE || "10", 10) || 10)
  );
  return {
    connectionLimit,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    // Idle connections recycled to avoid stale MySQL wait_timeout drops
    maxIdle: connectionLimit,
    idleTimeout: 60_000,
  };
}

export function getMysqlPool(databaseUrl: string): Pool {
  if (_pool) return _pool;
  _pool = mysql.createPool({
    uri: databaseUrl,
    ...getPoolConfig(),
  });
  return _pool;
}

/** Best-effort pool health check for readiness probes. */
export async function pingPool(databaseUrl?: string): Promise<boolean> {
  const url = databaseUrl || process.env.DATABASE_URL;
  if (!url) return false;
  try {
    const pool = getMysqlPool(url);
    const conn = await pool.getConnection();
    try {
      await conn.ping();
      return true;
    } finally {
      conn.release();
    }
  } catch {
    return false;
  }
}

/** Test-only: reset singleton between tests. */
export function __resetPoolForTests() {
  if (_pool) {
    void _pool.end().catch(() => undefined);
  }
  _pool = null;
}
