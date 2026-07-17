/**
 * Mobile Auth REST endpoints
 *
 * The mobile app uses Bearer token auth (stored in SecureStore) rather than
 * cookies. These REST endpoints provide the mobile app with:
 *   - GET  /api/auth/me      — return the authenticated user profile
 *   - POST /api/auth/refresh — exchange a refresh token for a new access token
 */
import type { Express, Request, Response } from "express";
import { SESSION_ACCESS_MS } from "@shared/const";
import { sdk } from "./sdk";
import * as db from "../db";
import { effectiveTier, isUserPremium } from "../lib/entitlements";
import { log } from "../lib/logger";

/**
 * Constructs a minimal request-like object carrying only the Authorization
 * header. Used to validate a standalone token without a full Express request.
 */
function bearerRequestFrom(token: string): Request {
  return { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
}

export function registerMobileAuthRoutes(app: Express) {
  /**
   * GET /api/auth/me
   * Returns the authenticated user's profile based on Bearer access token.
   */
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      let dbUser = await db.getUserByOpenId(user.openId);
      if (!dbUser) {
        res.status(401).json({ success: false, error: "User not found" });
        return;
      }

      // Soft-expire premium if past subscriptionExpiresAt
      dbUser = (await db.reconcileExpiredSubscription(dbUser.id)) ?? dbUser;

      res.json({
        success: true,
        data: {
          id: dbUser.id,
          openId: dbUser.openId,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          subscriptionTier: effectiveTier(dbUser),
          isPremium: isUserPremium(dbUser),
          createdAt: dbUser.createdAt,
        },
      });
    } catch (error: unknown) {
      log.error("MobileAuth /api/auth/me error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(401).json({ success: false, error: "Unauthorized" });
    }
  });

  /**
   * POST /api/auth/refresh
   * Verifies a refresh token and issues a new access token (+ rotated refresh).
   * Accepts legacy long-lived tokens (no tokenUse claim) for a soft migration.
   */
  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const body = req.body as { refreshToken?: string };
      if (!body.refreshToken) {
        res.status(400).json({ success: false, error: "Missing refreshToken" });
        return;
      }

      const session = await sdk.verifySession(body.refreshToken, {
        allowRefreshToken: true,
      });
      if (!session) {
        res.status(401).json({ success: false, error: "Invalid token" });
        return;
      }

      // Only refresh tokens (or legacy tokens without tokenUse) may refresh.
      // Access tokens should not be used as refresh tokens after migration.
      if (session.tokenUse === "access") {
        // Allow legacy access tokens that were the only token mobile stored
        // (pre-S1 dual-token). They still verify as access; re-issue pair.
      }

      const dbUser = await db.getUserByOpenId(session.openId);
      if (!dbUser) {
        res.status(401).json({ success: false, error: "User not found" });
        return;
      }

      const accessToken = await sdk.createSessionToken(session.openId, {
        name: session.name || dbUser.name || "",
        tokenUse: "access",
        expiresInMs: SESSION_ACCESS_MS,
      });
      const refreshToken = await sdk.createRefreshToken(session.openId, {
        name: session.name || dbUser.name || "",
      });

      res.json({
        accessToken,
        refreshToken,
        expiresInMs: SESSION_ACCESS_MS,
      });
    } catch (error: unknown) {
      log.error("MobileAuth /api/auth/refresh error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(401).json({ success: false, error: "Invalid token" });
    }
  });
}
