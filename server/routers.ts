import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { getDb } from "./db";
import { sellers, products, usedProducts, digitalProducts, orders, reviews } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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

  // Products Router - for store's own physical products
  products: router({
    list: publicProcedure.query(() => db.getActiveProducts()),
    getById: publicProcedure.input(z.number()).query(({ input }) => db.getProductById(input)),
  }),

  // Sellers Router
  sellers: router({
    list: publicProcedure.query(() => db.getActiveSellers()),
    getByUserId: protectedProcedure.query(async ({ ctx }) => {
      const seller = await db.getSellerByUserId(ctx.user.id);
      return seller || null;
    }),
    create: protectedProcedure
      .input(z.object({
        storeName: z.string().min(3),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        
        const result = await database.insert(sellers).values({
          userId: ctx.user.id,
          storeName: input.storeName,
          description: input.description,
        });
        return result;
      }),
  }),

  // Used Products Router
  usedProducts: router({
    list: publicProcedure.query(() => db.getApprovedUsedProducts()),
    getByUserId: protectedProcedure.query(({ ctx }) => db.getUsedProductsBySellerId(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(3),
        description: z.string(),
        price: z.number().positive(),
        condition: z.enum(["novo", "como_novo", "bom", "aceitavel"]),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        
        const seller = await db.getSellerByUserId(ctx.user.id);
        if (!seller) throw new Error("User is not a seller");
        
        const result = await database.insert(usedProducts).values({
          sellerId: seller.id,
          name: input.name,
          description: input.description,
          price: input.price.toString(),
          condition: input.condition,
          images: input.images || [],
        });
        return result;
      }),
  }),

  // Digital Products Router
  digitalProducts: router({
    list: publicProcedure.query(() => db.getActiveDigitalProducts()),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(3),
        description: z.string(),
        price: z.number().positive(),
        type: z.enum(["jogo", "gift_card", "licenca", "outro"]),
        keyOrCode: z.string().optional(),
        downloadUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        
        const seller = await db.getSellerByUserId(ctx.user.id);
        
        const result = await database.insert(digitalProducts).values({
          sellerId: seller?.id,
          name: input.name,
          description: input.description,
          price: input.price.toString(),
          type: input.type,
          keyOrCode: input.keyOrCode,
          downloadUrl: input.downloadUrl,
        });
        return result;
      }),
  }),

  // Orders Router
  orders: router({
    getByBuyerId: protectedProcedure.query(({ ctx }) => db.getOrdersByBuyerId(ctx.user.id)),
    getBySellerId: protectedProcedure.query(async ({ ctx }) => {
      const seller = await db.getSellerByUserId(ctx.user.id);
      return seller ? db.getOrdersBySellerId(seller.id) : [];
    }),
    confirmReceipt: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.confirmOrderReceipt(input);
      }),
  }),

  // Settings Router - for admin only
  settings: router({
    get: publicProcedure.query(() => db.getPlatformSettings()),
    update: protectedProcedure
      .input(z.object({
        commissionPercentage: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new Error("Unauthorized");
        return db.updatePlatformSettings(input.commissionPercentage);
      }),
  }),

  // Reviews Router
  reviews: router({
    getBySellerId: publicProcedure
      .input(z.number())
      .query(({ input }) => db.getReviewsBySellerId(input)),
  }),
});

export type AppRouter = typeof appRouter;
