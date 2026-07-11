import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { healingFavorites } from "../../drizzle/schema";

export const healingFavoritesRouter = router({
  /** List all favorites for the current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(healingFavorites)
      .where(eq(healingFavorites.userId, ctx.user.id))
      .orderBy(healingFavorites.createdAt);
  }),

  /** Toggle — add if not present, remove if present. Returns new favorited state. */
  toggle: protectedProcedure
    .input(
      z.object({
        frequencyId: z.string().min(1).max(64),
        hz: z.number().min(0.01).max(100000),
        name: z.string().min(1).max(128),
        category: z.string().min(1).max(64),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const existing = await db
        .select({ id: healingFavorites.id })
        .from(healingFavorites)
        .where(
          and(
            eq(healingFavorites.userId, ctx.user.id),
            eq(healingFavorites.frequencyId, input.frequencyId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .delete(healingFavorites)
          .where(
            and(
              eq(healingFavorites.userId, ctx.user.id),
              eq(healingFavorites.frequencyId, input.frequencyId),
            ),
          );
        return { isFavorited: false };
      } else {
        await db.insert(healingFavorites).values({
          userId: ctx.user.id,
          frequencyId: input.frequencyId,
          hz: input.hz,
          name: input.name,
          category: input.category,
        });
        return { isFavorited: true };
      }
    }),

  /** Remove a specific frequency from favorites */
  remove: protectedProcedure
    .input(z.object({ frequencyId: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db
        .delete(healingFavorites)
        .where(
          and(
            eq(healingFavorites.userId, ctx.user.id),
            eq(healingFavorites.frequencyId, input.frequencyId),
          ),
        );
      return { success: true };
    }),
});
