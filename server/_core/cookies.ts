import type { CookieOptions, Request } from "express";
import { ENV } from "./env";

function isSecureRequest(req: Request) {
  if (ENV.isProduction) return true;

  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

/**
 * Session cookie options.
 * Production first-party: SameSite=Lax + Secure.
 * Non-production may use SameSite=None when needed for iframe/preview hosts.
 */
export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);

  if (ENV.isProduction) {
    return {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
    };
  }

  // Dev / preview: keep cross-site cookie option when the request is HTTPS
  // (Manus iframe preview), otherwise Lax for plain localhost.
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
