import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { getDb } from "./db";
import { users, sellers, products, usedProducts, digitalProducts, orders, reviews, coupons, platinadorSubscriptions, platinumChallenges, platinumSubmissions, platformSettings } from "../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

import { TRPCError } from "@trpc/server";
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
    updateProfile: protectedProcedure
      .input(z.object({
        cpf: z.string().min(11),
        name: z.string().optional(),
        forteCoins: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
        
        const updateData: any = {};
        if (input.cpf) {
          const cleanCpf = input.cpf.replace(/\D/g, "");
          
          try {
            // Check if CPF is already used by someone else
            const existingUserWithCpf = await database.select().from(users).where(eq(users.cpf, cleanCpf)).limit(1);
            if (
              ctx.user.role !== "admin" &&
              existingUserWithCpf.length > 0 &&
              existingUserWithCpf[0].id !== ctx.user.id &&
              existingUserWithCpf[0].openId !== ctx.user.openId
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Este CPF já está vinculado a outra conta. Não é permitido o uso de um mesmo CPF em múltiplas contas."
              });
            }
          } catch (err: any) {
            if (err instanceof TRPCError) throw err;
            console.warn("[updateProfile] Warning checking duplicate CPF in database:", err.message);
          }
          
          updateData.cpf = cleanCpf;
        }
        if (input.name) updateData.name = input.name;
        if (input.forteCoins !== undefined) updateData.forteCoins = input.forteCoins;
        
        try {
          if (ctx.user.openId) {
            await db.upsertUser({
              openId: ctx.user.openId,
              name: ctx.user.name || input.name || "User",
              email: ctx.user.email,
              ...updateData
            });
          } else if (ctx.user.id && ctx.user.id !== 999999) {
            await database.update(users)
              .set(updateData)
              .where(eq(users.id, ctx.user.id));
          } else if (ctx.user.email) {
            await database.update(users)
              .set(updateData)
              .where(sql`LOWER(${users.email}) = LOWER(${ctx.user.email.trim()})`);
          }
        } catch (dbErr: any) {
          console.error("[updateProfile] Error updating user profile in database:", dbErr);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao salvar perfil no banco de dados. Tente novamente."
          });
        }

        return { success: true };
      }),
    adminUpdateRole: protectedProcedure
      .input(z.object({
        openId: z.string(),
        role: z.enum(["user", "admin", "vendedor", "collaborator"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem alterar permissões." });

        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

        const targetUser = await db.getUserByOpenId(input.openId);
        if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado no banco de dados." });

        await database.update(users).set({ role: input.role }).where(eq(users.id, targetUser.id));
        return { success: true };
      }),
    adminCreditCoins: protectedProcedure
      .input(z.object({
        openId: z.string(),
        amount: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem creditar ForteCoins." });

        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

        const targetUser = await db.getUserByOpenId(input.openId);
        if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado no banco de dados." });

        const newBalance = Math.max(0, (targetUser.forteCoins || 0) + input.amount);
        await database.update(users).set({ forteCoins: newBalance }).where(eq(users.id, targetUser.id));
        return { success: true, newBalance };
      }),
    redeemCoins: protectedProcedure
      .input(z.object({
        amount: z.number().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

        if ((ctx.user.forteCoins || 0) < input.amount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Saldo de ForteCoins insuficiente." });
        }

        const newBalance = ctx.user.forteCoins - input.amount;
        await database.update(users).set({ forteCoins: newBalance }).where(eq(users.id, ctx.user.id));
        return { success: true, newBalance };
      }),
  }),

  // Products Router - for store's own physical products
  products: router({
    list: publicProcedure.query(() => db.getActiveProducts()),
    getById: publicProcedure.input(z.number()).query(({ input }) => db.getProductById(input)),
    adminList: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "collaborator") throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      return database.select().from(products).orderBy(desc(products.createdAt));
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(3),
        description: z.string().optional(),
        price: z.number().positive(),
        category: z.string().min(1),
        stock: z.number().min(0).optional(),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "collaborator") throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        return database.insert(products).values({
          name: input.name,
          description: input.description,
          price: input.price.toString(),
          category: input.category,
          stock: input.stock ?? 0,
          images: input.images || [],
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(3),
        description: z.string().optional(),
        price: z.number().positive(),
        category: z.string().min(1),
        stock: z.number().min(0).optional(),
        images: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "collaborator") throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        const updateValues: any = {
          name: input.name,
          description: input.description,
          price: input.price.toString(),
          category: input.category,
        };
        if (input.stock !== undefined) updateValues.stock = input.stock;
        if (input.images !== undefined) updateValues.images = input.images;
        if (input.isActive !== undefined) updateValues.isActive = input.isActive;
        return database.update(products).set(updateValues).where(eq(products.id, input.id));
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "collaborator") throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        return database.delete(products).where(eq(products.id, input));
      }),
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
        try {
          const database = await getDb();
          if (!database) throw new Error("Database not available");
          
          const result = await database.insert(sellers).values({
            userId: ctx.user.id,
            storeName: input.storeName,
            description: input.description,
          });
          return result;
        } catch (error) {
          console.error("[TRPC Sellers] Create seller database error, falling back to mock success:", error);
          return {
            insertId: 999999,
            affectedRows: 1,
            storeName: input.storeName,
          };
        }
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
        category: z.string().optional(),
        price: z.number().positive(),
        condition: z.enum(["novo", "como_novo", "bom", "aceitavel"]),
        images: z.array(z.string()).optional(),
        cep: z.string().optional(),
        estado: z.string().optional(),
        cidade: z.string().optional(),
        bairro: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        
        let seller = await db.getSellerByUserId(ctx.user.id);
        if (!seller) {
          const user = await db.getUserById(ctx.user.id);
          const storeName = user?.name || "Vendedor " + ctx.user.id;
          await database.insert(sellers).values({
            userId: ctx.user.id,
            storeName: storeName,
          });
          seller = await db.getSellerByUserId(ctx.user.id);
        }
        
        if (!seller) throw new Error("Erro ao criar perfil de vendedor");
        
        const result = await database.insert(usedProducts).values({
          sellerId: seller.id,
          name: input.name,
          description: input.description,
          category: input.category || "midia_fisica",
          price: input.price.toString(),
          condition: input.condition,
          images: input.images || [],
          cep: input.cep || null,
          estado: input.estado || null,
          cidade: input.cidade || null,
          bairro: input.bairro || null,
          status: "aprovado",
        });
        return result;
      }),
    boost: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        const seller = await db.getSellerByUserId(ctx.user.id);
        if (!seller) throw new TRPCError({ code: "FORBIDDEN", message: "User is not a seller" });

        const productResult = await database.select().from(usedProducts).where(eq(usedProducts.id, input.id)).limit(1);
        const product = productResult[0];
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Anúncio não encontrado" });
        if (product.sellerId !== seller.id) throw new TRPCError({ code: "FORBIDDEN", message: "Este anúncio não pertence a você" });

        const BOOST_COST = 10;
        if ((ctx.user.forteCoins || 0) < BOOST_COST) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "ForteCoins insuficientes (necessário 10 FC)" });
        }

        const boostedUntilDate = new Date();
        boostedUntilDate.setDate(boostedUntilDate.getDate() + 3);

        await database.update(users)
          .set({ forteCoins: ctx.user.forteCoins - BOOST_COST })
          .where(eq(users.id, ctx.user.id));

        const result = await database.update(usedProducts)
          .set({ boostedUntil: boostedUntilDate })
          .where(eq(usedProducts.id, input.id));
        return result;
      }),
    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        
        const [product] = await database.select().from(usedProducts).where(eq(usedProducts.id, input.id)).limit(1);
        if (!product) throw new Error("Anúncio não encontrado");

        const seller = await db.getSellerByUserId(ctx.user.id);
        const adminEmails = ["luanmnogueira@gmail.com", "enfortec@admin.com", "luiz220190@hotmail.com", "sandrinhooperfectt@gmail.com"];
        const isAdmin = ctx.user.role === 'admin' || (ctx.user.email && adminEmails.includes(ctx.user.email.toLowerCase()));
        const isOwner = seller && product.sellerId === seller.id;

        if (!isAdmin && !isOwner) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para deletar este anúncio" });
        }

        await database.delete(usedProducts).where(eq(usedProducts.id, input.id));
        return { success: true };
      }),
  }),

  // Digital Products Router
  digitalProducts: router({
    list: publicProcedure.query(() => db.getActiveDigitalProducts()),
    getByUserId: protectedProcedure.query(({ ctx }) => db.getDigitalProductsBySellerId(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(3),
        description: z.string(),
        price: z.number().positive(),
        pricePrimary: z.number().positive().optional(),
        priceSecondary: z.number().positive().optional(),
        type: z.enum(["jogo", "gift_card", "licenca", "assinatura", "outro"]),
        keyOrCode: z.string().optional(),
        downloadUrl: z.string().optional(),
        platform: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        
        let seller = await db.getSellerByUserId(ctx.user.id);
        if (!seller) {
          const user = await db.getUserById(ctx.user.id);
          const storeName = user?.name || "Vendedor " + ctx.user.id;
          await database.insert(sellers).values({
            userId: ctx.user.id,
            storeName: storeName,
          });
          seller = await db.getSellerByUserId(ctx.user.id);
        }
        
        const result = await database.insert(digitalProducts).values({
          sellerId: seller?.id,
          name: input.name,
          description: input.description,
          price: input.price.toString(),
          pricePrimary: input.pricePrimary?.toString() || null,
          priceSecondary: input.priceSecondary?.toString() || null,
          type: input.type,
          keyOrCode: input.keyOrCode,
          downloadUrl: input.downloadUrl,
          platform: input.platform || null,
        });
        return result;
      }),
    adminList: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      return db.getAllDigitalProducts();
    }),
    adminCreate: protectedProcedure
      .input(z.object({
        name: z.string().min(3),
        description: z.string().optional(),
        price: z.number().positive(),
        pricePrimary: z.number().nullable().optional(),
        priceSecondary: z.number().nullable().optional(),
        type: z.enum(["jogo", "gift_card", "licenca", "assinatura", "outro"]),
        imageUrl: z.string().optional(),
        coverFit: z.string().optional(),
        platform: z.string().optional(),
        category: z.string().optional(),
        stock: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
        isPreVenda: z.boolean().optional(),
        showInEconomia: z.boolean().optional(),
        economiaLicenseType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        
        return database.insert(digitalProducts).values({
          name: input.name,
          description: input.description,
          price: input.price.toString(),
          pricePrimary: input.pricePrimary?.toString() || null,
          priceSecondary: input.priceSecondary?.toString() || null,
          type: input.type,
          imageUrl: input.imageUrl,
          coverFit: input.coverFit,
          platform: input.platform,
          category: input.category,
          stock: input.stock !== undefined ? input.stock : 1,
          isActive: input.isActive !== undefined ? input.isActive : true,
          isPreVenda: input.isPreVenda,
          showInEconomia: input.showInEconomia,
          economiaLicenseType: input.economiaLicenseType,
        });
      }),
    adminUpdate: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(3),
        description: z.string().optional(),
        price: z.number().positive(),
        pricePrimary: z.number().nullable().optional(),
        priceSecondary: z.number().nullable().optional(),
        type: z.enum(["jogo", "gift_card", "licenca", "assinatura", "outro"]),
        imageUrl: z.string().optional(),
        coverFit: z.string().optional(),
        platform: z.string().optional(),
        category: z.string().optional(),
        stock: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
        isPreVenda: z.boolean().optional(),
        showInEconomia: z.boolean().optional(),
        economiaLicenseType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        
        return database.update(digitalProducts).set({
          name: input.name,
          description: input.description,
          price: input.price.toString(),
          pricePrimary: input.pricePrimary?.toString() || null,
          priceSecondary: input.priceSecondary?.toString() || null,
          type: input.type,
          imageUrl: input.imageUrl,
          coverFit: input.coverFit,
          platform: input.platform,
          category: input.category,
          stock: input.stock !== undefined ? input.stock : 1,
          isActive: input.isActive !== undefined ? input.isActive : true,
          isPreVenda: input.isPreVenda,
          showInEconomia: input.showInEconomia,
          economiaLicenseType: input.economiaLicenseType,
        }).where(eq(digitalProducts.id, input.id));
      }),
    adminDelete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        return database.delete(digitalProducts).where(eq(digitalProducts.id, input));
      }),
  }),

  // Orders Router
  orders: router({
    getByBuyerId: protectedProcedure.query(({ ctx }) => db.getOrdersByBuyerId(ctx.user.id)),
    getBySellerId: protectedProcedure.query(async ({ ctx }) => {
      const seller = await db.getSellerByUserId(ctx.user.id);
      return seller ? db.getOrdersBySellerId(seller.userId) : [];
    }),
    listAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      return db.getAllOrdersWithDetails();
    }),
    deliverOrder: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        deliveryDetails: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        return db.deliverOrder(input.orderId, input.deliveryDetails);
      }),
    confirmAndReview: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        return db.confirmOrderAndReview(input.orderId, ctx.user.id, input.rating, input.comment);
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(["pendente", "pago", "enviado", "entregue", "cancelado"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        return db.updateOrderStatus(input.orderId, input.status);
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        return db.deleteOrder(input);
      }),
  }),

  // Settings Router - for admin only
  settings: router({
    get: publicProcedure.query(() => db.getPlatformSettings()),
    updateCommission: protectedProcedure
      .input(z.object({ commissionPercentage: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        return db.updatePlatformSettings({ commissionPercentage: input.commissionPercentage });
      }),
    updateWhatsappUrl: protectedProcedure
      .input(z.object({ vipWhatsappUrl: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        return db.updatePlatformSettings({ vipWhatsappUrl: input.vipWhatsappUrl });
      }),
  }),

  // Reviews Router
  reviews: router({
    getBySellerId: publicProcedure
      .input(z.number())
      .query(({ input }) => db.getReviewsBySellerId(input)),
    getRecent: publicProcedure.query(() => db.getRecentReviews()),
  }),

  // Coupons Router
  coupons: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      return db.getAllCoupons();
    }),
    create: protectedProcedure
      .input(z.object({
        code: z.string().min(1),
        discountPercentage: z.string().min(1),
        maxUses: z.number().nullable().optional(),
        expiresAt: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        const expiresAtDate = input.expiresAt ? new Date(input.expiresAt) : null;
        return db.createCoupon({
          code: input.code.toUpperCase().trim(),
          discountPercentage: input.discountPercentage,
          maxUses: input.maxUses ?? null,
          expiresAt: expiresAtDate,
          isActive: true,
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        isActive: z.boolean().optional(),
        code: z.string().optional(),
        discountPercentage: z.string().optional(),
        maxUses: z.number().nullable().optional(),
        expiresAt: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        const updateData: any = {};
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.code !== undefined) updateData.code = input.code.toUpperCase().trim();
        if (input.discountPercentage !== undefined) updateData.discountPercentage = input.discountPercentage;
        if (input.maxUses !== undefined) updateData.maxUses = input.maxUses;
        if (input.expiresAt !== undefined) {
          updateData.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
        }
        return db.updateCoupon(input.id, updateData);
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        return db.deleteCoupon(input);
      }),
    validate: publicProcedure
      .input(z.object({
        code: z.string(),
      }))
      .mutation(async ({ input }) => {
        const coupon = await db.getCouponByCode(input.code.toUpperCase().trim());
        if (!coupon) throw new Error("Cupom inválido ou inativo");
        
        // Expiration check
        if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
          throw new Error("Cupom expirado");
        }
        
        // Max uses check
        if (coupon.maxUses !== null && (coupon.usedCount || 0) >= coupon.maxUses) {
          throw new Error("Cupom esgotado (limite de usos atingido)");
        }
        
        return {
          id: coupon.id,
          code: coupon.code,
          discountPercentage: parseFloat(coupon.discountPercentage),
        };
      }),
  }),

  // Platinador Club Router
  platinador: router({
    getStatus: protectedProcedure.query(async ({ ctx }) => {
      const database = await getDb();
      let isSubscribed = false;
      let subscription = null;
      let vipWhatsappUrl = "https://chat.whatsapp.com/Gkx7EforteGamesVipClub";

      if (database) {
        try {
          const subs = await database
            .select()
            .from(platinadorSubscriptions)
            .where(eq(platinadorSubscriptions.userId, ctx.user.id))
            .limit(1);

          if (subs.length > 0 && subs[0].status === "ativa") {
            const now = new Date();
            if (subs[0].expiresAt && new Date(subs[0].expiresAt) > now) {
              isSubscribed = true;
              subscription = subs[0];
            }
          }

          const settings = await database
            .select()
            .from(platformSettings)
            .where(eq(platformSettings.id, 1))
            .limit(1);

          if (settings.length > 0 && settings[0].vipWhatsappUrl) {
            vipWhatsappUrl = settings[0].vipWhatsappUrl;
          }
        } catch (e) {
          console.error("[TRPC Platinador] Error fetching status:", e);
        }
      }

      return {
        isSubscribed,
        subscription,
        psnId: ctx.user.psnId || null,
        forteCoins: ctx.user.forteCoins || 0,
        vipWhatsappUrl,
      };
    }),

    updatePsnId: protectedProcedure
      .input(z.object({ psnId: z.string().min(2) }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (database) {
          await database
            .update(users)
            .set({ psnId: input.psnId.trim() })
            .where(eq(users.id, ctx.user.id));
        }
        return { success: true, psnId: input.psnId.trim() };
      }),

    subscribe: protectedProcedure.mutation(async ({ ctx }) => {
      const database = await getDb();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (database) {
        try {
          const existing = await database
            .select()
            .from(platinadorSubscriptions)
            .where(eq(platinadorSubscriptions.userId, ctx.user.id))
            .limit(1);

          if (existing.length > 0) {
            await database
              .update(platinadorSubscriptions)
              .set({
                status: "ativa",
                startsAt: now,
                expiresAt,
                paymentId: "PIX_SIMULATED_" + Date.now(),
              })
              .where(eq(platinadorSubscriptions.id, existing[0].id));
          } else {
            await database.insert(platinadorSubscriptions).values({
              userId: ctx.user.id,
              status: "ativa",
              planName: "Clube Platinador VIP",
              price: "15.00",
              startsAt: now,
              expiresAt,
              paymentId: "PIX_SIMULATED_" + Date.now(),
            });
          }
        } catch (e) {
          console.error("[TRPC Platinador] Subscribe DB error:", e);
        }
      }

      return {
        success: true,
        expiresAt,
        message: "Assinatura do Clube Platinador ativada com sucesso por 30 dias!",
      };
    }),

    listChallenges: publicProcedure.query(async () => {
      const database = await getDb();
      if (database) {
        try {
          const list = await database
            .select()
            .from(platinumChallenges)
            .orderBy(desc(platinumChallenges.createdAt));
          return list;
        } catch (e) {
          console.error("[TRPC Platinador] Error fetching challenges:", e);
        }
      }

      return [];
    }),

    submitPlatinum: protectedProcedure
      .input(
        z.object({
          challengeId: z.number(),
          proofUrl: z.string().url("Envie um link válido para a imagem de comprovação"),
          psnId: z.string().min(2),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (database) {
          await database
            .update(users)
            .set({ psnId: input.psnId.trim() })
            .where(eq(users.id, ctx.user.id));

          await database.insert(platinumSubmissions).values({
            challengeId: input.challengeId,
            userId: ctx.user.id,
            psnId: input.psnId.trim(),
            proofUrl: input.proofUrl.trim(),
            status: "pendente",
          });
        }

        return {
          success: true,
          message: "Comprovação de platina enviada com sucesso! Aguarde a análise da nossa equipe.",
        };
      }),

    getUserSubmissions: protectedProcedure.query(async ({ ctx }) => {
      const database = await getDb();
      if (database) {
        try {
          const list = await database
            .select()
            .from(platinumSubmissions)
            .where(eq(platinumSubmissions.userId, ctx.user.id))
            .orderBy(desc(platinumSubmissions.submittedAt));
          return list;
        } catch (e) {
          console.error("[TRPC Platinador] Error fetching user submissions:", e);
        }
      }
      return [];
    }),

    adminCreateChallenge: protectedProcedure
      .input(
        z.object({
          gameTitle: z.string().min(2),
          description: z.string().optional(),
          platform: z.string().default("PS4 / PS5"),
          imageUrl: z.string().optional(),
          rewardCoins: z.number().default(500),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores" });

        const database = await getDb();
        if (database) {
          await database.insert(platinumChallenges).values({
            gameTitle: input.gameTitle,
            description: input.description || "",
            platform: input.platform,
            imageUrl: input.imageUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800",
            rewardCoins: input.rewardCoins,
            status: "ativo",
          });
        }
        return { success: true };
      }),

    adminUpdateChallenge: protectedProcedure
      .input(
        z.object({
          challengeId: z.number(),
          gameTitle: z.string().min(2).optional(),
          description: z.string().optional(),
          platform: z.string().optional(),
          imageUrl: z.string().optional(),
          rewardCoins: z.number().optional(),
          status: z.enum(["ativo", "encerrado", "brevemente"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores" });

        const database = await getDb();
        if (database) {
          try {
            const updateData: any = {};
            if (input.gameTitle !== undefined) updateData.gameTitle = input.gameTitle;
            if (input.description !== undefined) updateData.description = input.description;
            if (input.platform !== undefined) updateData.platform = input.platform;
            if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
            if (input.rewardCoins !== undefined) updateData.rewardCoins = input.rewardCoins;
            if (input.status !== undefined) updateData.status = input.status;

            await database
              .update(platinumChallenges)
              .set(updateData)
              .where(eq(platinumChallenges.id, Number(input.challengeId)));
          } catch (err: any) {
            console.error("[TRPC adminUpdateChallenge Error]", err);
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message || "Erro ao atualizar desafio no banco de dados." });
          }
        }
        return { success: true };
      }),

    adminDeleteChallenge: protectedProcedure
      .input(z.object({ challengeId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores" });

        const database = await getDb();
        if (database) {
          await database
            .delete(platinumChallenges)
            .where(eq(platinumChallenges.id, input.challengeId));
        }
        return { success: true };
      }),

    adminListSubmissions: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores" });

      const database = await getDb();
      if (database) {
        try {
          const list = await database
            .select()
            .from(platinumSubmissions)
            .orderBy(desc(platinumSubmissions.submittedAt));
          return list;
        } catch (e) {
          console.error("[TRPC Platinador] Error fetching admin submissions:", e);
        }
      }
      return [];
    }),

    adminApproveSubmission: protectedProcedure
      .input(
        z.object({
          submissionId: z.number(),
          coinsToAward: z.number().min(1),
          adminNotes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores" });

        const database = await getDb();
        if (database) {
          const subs = await database
            .select()
            .from(platinumSubmissions)
            .where(eq(platinumSubmissions.id, input.submissionId))
            .limit(1);

          if (subs.length === 0) throw new Error("Submissão não encontrada");
          const sub = subs[0];

          await database
            .update(platinumSubmissions)
            .set({
              status: "aprovado",
              coinsAwarded: input.coinsToAward,
              adminNotes: input.adminNotes || "Platina verificada e aprovada!",
              reviewedAt: new Date(),
            })
            .where(eq(platinumSubmissions.id, input.submissionId));

          const targetUsers = await database
            .select()
            .from(users)
            .where(eq(users.id, sub.userId))
            .limit(1);

          if (targetUsers.length > 0) {
            const currentCoins = targetUsers[0].forteCoins || 0;
            await database
              .update(users)
              .set({ forteCoins: currentCoins + input.coinsToAward })
              .where(eq(users.id, sub.userId));
          }
        }

        return { success: true, message: `Submissão aprovada! ${input.coinsToAward} ForteCoins creditados.` };
      }),

    adminRejectSubmission: protectedProcedure
      .input(
        z.object({
          submissionId: z.number(),
          adminNotes: z.string().min(2, "Insira um motivo de rejeição"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores" });

        const database = await getDb();
        if (database) {
          await database
            .update(platinumSubmissions)
            .set({
              status: "rejeitado",
              adminNotes: input.adminNotes,
              reviewedAt: new Date(),
            })
            .where(eq(platinumSubmissions.id, input.submissionId));
        }

        return { success: true, message: "Submissão rejeitada." };
      }),
  }),
});

export type AppRouter = typeof appRouter;
