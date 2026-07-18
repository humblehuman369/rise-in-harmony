import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerMobileAuthRoutes } from "./mobileAuth";
import { registerOAuthRoutes } from "./oauth";
import { registerSoundsUpload } from "./soundsUpload";
import { registerConvertUpload } from "./convertUpload";
import { registerStorageProxy } from "./storageProxy";
import { registerStripeWebhook } from "./stripeWebhook";
import { registerScheduledRoutes } from "./scheduled";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { assertCriticalEnv, ENV } from "./env";
import { serveStatic, setupVite } from "./vite";
import { getDb } from "../db";
import { pingPool } from "../lib/dbPool";
import { log } from "../lib/logger";
import { sql } from "drizzle-orm";
import { startConvertWorker } from "../lib/convert/worker";
import { isConvertEnabled } from "../lib/convert/limits";

/** JSON/urlencoded body limit for API routes (uploads use a dedicated raw route). */
const API_BODY_LIMIT = "1mb";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function resolveListenPort(preferredPort: number): Promise<number> {
  // Production must bind the configured PORT only — silent fallback breaks
  // health checks and load balancers.
  if (ENV.isProduction) {
    return Promise.resolve(preferredPort);
  }
  return findAvailablePort(preferredPort);
}

async function startServer() {
  assertCriticalEnv();

  const app = express();
  const server = createServer(app);

  // Behind reverse proxies (Manus, Railway, Cloudflare) so rate-limit + secure
  // cookies see the real client IP / proto.
  if (ENV.isProduction) {
    app.set("trust proxy", 1);
  }

  // ── Health / readiness (no auth, no rate limit) ───────────────────────────
  // Liveness: process is up
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true, service: "rise-in-harmony" });
  });
  // Readiness: process + DB pool can serve traffic
  app.get("/readyz", async (_req, res) => {
    const dbConfigured = Boolean(process.env.DATABASE_URL);
    if (!dbConfigured) {
      // Dev without DB is still "ready" for static/demo; production requires DB.
      if (ENV.isProduction) {
        res.status(503).json({ ok: false, db: false, reason: "DATABASE_URL missing" });
        return;
      }
      res.status(200).json({ ok: true, db: false, mode: "degraded" });
      return;
    }
    const alive = await pingPool();
    if (!alive) {
      res.status(503).json({ ok: false, db: false });
      return;
    }
    // Optional cheap query through drizzle to ensure the pool wires correctly
    try {
      const db = await getDb();
      if (db) await db.execute(sql`SELECT 1`);
      res.status(200).json({ ok: true, db: true });
    } catch (err) {
      log.warn("readyz db query failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(503).json({ ok: false, db: false });
    }
  });

  // convert.* host → land on /convert (Phase 4 subdomain productization)
  app.use((req, res, next) => {
    const host = String(req.headers.host ?? "");
    if (
      host.startsWith("convert.") &&
      (req.path === "/" || req.path === "")
    ) {
      res.redirect(302, "/convert");
      return;
    }
    next();
  });

  // Security headers. Production CSP must allow analytics + Manus OAuth/storage.
  // (Helmet defaults blocked us.i.posthog.com — console CSP errors.)
  app.use(
    helmet({
      contentSecurityPolicy: ENV.isProduction
        ? {
            useDefaults: true,
            directives: {
              "default-src": ["'self'"],
              "script-src": [
                "'self'",
                "'unsafe-inline'",
                "https://us.i.posthog.com",
                "https://*.posthog.com",
                "https://fonts.googleapis.com",
                "https://manus-analytics.com",
                "https://*.manus-analytics.com",
              ],
              "script-src-elem": [
                "'self'",
                "'unsafe-inline'",
                "https://us.i.posthog.com",
                "https://*.posthog.com",
                "https://manus-analytics.com",
                "https://*.manus-analytics.com",
              ],
              "connect-src": [
                "'self'",
                "https://us.i.posthog.com",
                "https://*.posthog.com",
                "https://manus.im",
                "https://*.manus.im",
                "https://*.manuscdn.com",
                "https://*.amazonaws.com",
                "https://*.r2.cloudflarestorage.com",
                "blob:",
              ],
              "img-src": ["'self'", "data:", "blob:", "https:"],
              "media-src": ["'self'", "blob:", "https:", "data:"],
              "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
              "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
              "frame-src": ["'self'", "https://manus.im", "https://*.manus.im"],
              "worker-src": ["'self'", "blob:"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Stripe webhook must be registered BEFORE the JSON body parser —
  // signature verification needs the raw request bytes.
  registerStripeWebhook(app);

  // General API rate limit (skips Stripe webhooks which have their own abuse controls).
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: ENV.isProduction ? 300 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    skip: req => {
      const url = req.originalUrl || req.url || "";
      return url.includes("/api/stripe/webhook");
    },
  });
  app.use("/api/", apiLimiter);

  // Stricter limit on auth-adjacent routes (token refresh / OAuth exchange abuse).
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: ENV.isProduction ? 60 : 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many auth attempts, please try again later." },
  });
  app.use("/api/auth/", authLimiter);
  app.use("/api/oauth/", authLimiter);

  // Upload-specific rate limit (expensive storage writes).
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: ENV.isProduction ? 30 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Upload limit exceeded, please try again later." },
  });
  app.use("/api/sounds/upload", uploadLimiter);
  // Convert uploads are larger / heavier — tighter hourly cap in production.
  const convertUploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: ENV.isProduction ? 20 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Convert upload limit exceeded, please try again later." },
  });
  app.use("/api/convert/upload", convertUploadLimiter);
  app.use("/api/convert/upload/chunk", convertUploadLimiter);
  app.use("/api/convert/upload/finalize", convertUploadLimiter);

  // Keep API bodies small; large audio uploads use express.raw on their own route.
  app.use(express.json({ limit: API_BODY_LIMIT }));
  app.use(express.urlencoded({ limit: API_BODY_LIMIT, extended: true }));

  registerStorageProxy(app);
  registerMobileAuthRoutes(app);
  registerOAuthRoutes(app);
  registerSoundsUpload(app);
  registerConvertUpload(app);
  // Cron callbacks (Manus Heartbeat / external CRON_SECRET)
  registerScheduledRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  if (Number.isNaN(preferredPort) || preferredPort < 1 || preferredPort > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
  }

  const port = await resolveListenPort(preferredPort);

  if (!ENV.isProduction && port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    if (isConvertEnabled()) {
      startConvertWorker();
    } else {
      log.info("convert worker not started (RIH_CONVERT_ENABLED off)");
    }
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[Server] Port ${port} is already in use. In production the process will exit.`
      );
    }
    console.error("[Server] listen error:", err);
    process.exit(1);
  });
}

startServer().catch(err => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
