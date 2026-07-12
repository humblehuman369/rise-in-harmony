/**
 * Mobile Auth REST endpoints
 *
 * The mobile app uses Bearer token auth (stored in SecureStore) rather than
 * cookies. These REST endpoints provide the mobile app with:
 *   - GET  /api/auth/me      — return the authenticated user profile
 *   - POST /api/auth/refresh — refresh an expired token (placeholder)
 */
import type { Express, Request, Response } from "express";
import { sdk } from "./sdk";
import * as db from "../db";

export function registerMobileAuthRoutes(app: Express) {
  /**
   * GET /api/auth/me
   * Returns the authenticated user's profile based on Bearer token.
   * The mobile app calls this to validate its stored JWT and hydrate the user.
   */
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      // Fetch the full user record from the database
      const dbUser = await db.getUserByOpenId(user.openId);
      if (!dbUser) {
        res.status(401).json({ success: false, error: "User not found" });
        return;
      }

      res.json({
        success: true,
        data: {
          id: dbUser.id,
          openId: dbUser.openId,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          subscriptionTier: dbUser.subscriptionTier,
          createdAt: dbUser.createdAt,
        },
      });
    } catch (error) {
      res.status(401).json({ success: false, error: "Unauthorized" });
    }
  });

  /**
   * POST /api/auth/refresh
   * The mobile app's JWT is long-lived (1 year), so refresh is a no-op.
   * This endpoint exists so the mobile client's refresh logic doesn't 404.
   */
  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    // The mobile app stores the same session JWT as both access and refresh.
    // Since our JWTs are already long-lived, just validate the token.
    try {
      const body = req.body as { refreshToken?: string };
      if (!body.refreshToken) {
        res.status(400).json({ success: false, error: "Missing refreshToken" });
        return;
      }

      // Verify the token is still valid by checking it as a session
      const user = await sdk.authenticateRequest({
        headers: { authorization: `Bearer ${body.refreshToken}` },
      } as any);

      if (!user) {
        res.status(401).json({ success: false, error: "Invalid token" });
        return;
      }

      // Re-issue the same token (it's already long-lived)
      res.json({ accessToken: body.refreshToken });
    } catch (error) {
      res.status(401).json({ success: false, error: "Invalid token" });
    }
  });
}
