/**
 * @deprecated Do not start this file in production.
 *
 * The real application server is `server/_core/index.ts`.
 * Package scripts already point there:
 *   - `pnpm dev`   → tsx watch server/_core/index.ts
 *   - `pnpm build` → esbuild server/_core/index.ts → dist/index.js
 *   - `pnpm start` → node dist/index.js
 *
 * This shim exists so accidental `node server/index.ts` still boots the API
 * instead of a static-only Express stub.
 */
import "./_core/index.ts";
