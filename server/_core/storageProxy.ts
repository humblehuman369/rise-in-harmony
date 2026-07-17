import type { Express, Request, Response } from "express";
import { ForbiddenError } from "@shared/_core/errors";
import { ENV } from "./env";
import { sdk } from "./sdk";

/**
 * Private object keys require an authenticated owner.
 * Public marketing / product assets (everything outside user-sounds/) stay open.
 */
const PRIVATE_PREFIX = "user-sounds/";

async function tryAuthenticate(req: Request) {
  try {
    return await sdk.authenticateRequest(req);
  } catch (error) {
    if (error instanceof ForbiddenError) return null;
    throw error;
  }
}

function isPrivateKey(key: string): boolean {
  return key === "user-sounds" || key.startsWith(PRIVATE_PREFIX);
}

/** Returns owning user id from `user-sounds/{userId}/...`, or null if unparseable. */
function ownerIdFromKey(key: string): number | null {
  if (!key.startsWith(PRIVATE_PREFIX)) return null;
  const rest = key.slice(PRIVATE_PREFIX.length);
  const segment = rest.split("/")[0];
  const id = parseInt(segment ?? "", 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req: Request, res: Response) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // Reject path traversal attempts
    if (key.includes("..") || key.includes("\\")) {
      res.status(400).send("Invalid storage key");
      return;
    }

    if (isPrivateKey(key)) {
      const user = await tryAuthenticate(req);
      if (!user || user.id <= 0) {
        res.status(401).send("Unauthorized");
        return;
      }
      const ownerId = ownerIdFromKey(key);
      // Admins may access any private object; users only their own prefix.
      if (ownerId === null || (user.role !== "admin" && ownerId !== user.id)) {
        res.status(403).send("Forbidden");
        return;
      }
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", isPrivateKey(key) ? "private, no-store" : "public, max-age=3600");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
