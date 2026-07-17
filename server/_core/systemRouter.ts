import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  /**
   * Lightweight liveness for tRPC clients.
   * Prefer GET /healthz and GET /readyz for load balancers.
   */
  health: publicProcedure
    .input(
      z
        .object({
          timestamp: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(() => ({
      ok: true as const,
      ts: Date.now(),
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
