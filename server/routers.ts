import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  submissions: router({
    save: publicProcedure
      .input(z.object({
        problemTitle: z.string(),
        language: z.string(),
        code: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.saveCodeSubmission({
          userId: ctx.user?.id || null,
          problemTitle: input.problemTitle,
          language: input.language,
          code: input.code,
        });
        return { success: true };
      }),
    list: publicProcedure.query(async ({ ctx }) => {
      return await db.getRecentSubmissions(ctx.user?.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
