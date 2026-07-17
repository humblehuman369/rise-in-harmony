import { COOKIE_NAME, SESSION_ACCESS_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { markWelcomeEmailSent } from "../db";
import { sendWelcomeEmail } from "../email";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Shared OAuth exchange logic: validates code/state, upserts the user,
 * and returns access (+ refresh for mobile) tokens + user info.
 */
async function exchangeAndUpsertUser(code: string, state: string) {
  const tokenResponse = await sdk.exchangeCodeForToken(code, state);
  const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }

  const { isNewUser } = await db.upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn: new Date(),
  });

  const sessionToken = await sdk.createSessionToken(userInfo.openId, {
    name: userInfo.name || "",
    expiresInMs: SESSION_ACCESS_MS,
    tokenUse: "access",
  });
  const refreshToken = await sdk.createRefreshToken(userInfo.openId, {
    name: userInfo.name || "",
  });

  return { userInfo, isNewUser, sessionToken, refreshToken };
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const { userInfo, isNewUser, sessionToken } =
        await exchangeAndUpsertUser(code, state);

      // Send welcome email to brand-new users (fire-and-forget, never block the redirect)
      if (isNewUser && userInfo.email) {
        const freshUser = await db.getUserByOpenId(userInfo.openId);
        if (freshUser && !freshUser.welcomeEmailSentAt) {
          sendWelcomeEmail(userInfo.email, userInfo.name || "friend", "morning")
            .then(() => markWelcomeEmailSent(freshUser.id))
            .catch((err) => console.warn("[Email] Welcome email failed:", err));
        }
      }

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: SESSION_ACCESS_MS,
      });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  /**
   * Mobile OAuth callback — same exchange flow as web but redirects to the app
   * via deep link (riseharmony://auth?token=<jwt>) instead of setting a cookie.
   * The mobile app opens the OAuth portal with redirectUri pointing here.
   */
  app.get("/api/oauth/callback-mobile", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const { sessionToken, refreshToken } = await exchangeAndUpsertUser(
        code,
        state
      );
      // Redirect to the mobile app via deep link with access + refresh tokens
      const deepLink =
        `riseharmony://auth?token=${encodeURIComponent(sessionToken)}` +
        `&refresh=${encodeURIComponent(refreshToken)}`;
      res.redirect(302, deepLink);
    } catch (error) {
      console.error("[OAuth] Mobile callback failed", error);
      // Redirect to app with error so it can show a message
      res.redirect(302, "riseharmony://auth?error=login_failed");
    }
  });
}
