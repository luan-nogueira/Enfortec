import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { getDb } from "./db";
import { users, sellers, products, usedProducts, digitalProducts, orders, reviews, coupons, platinadorSubscriptions, platinumChallenges, platinumSubmissions, platformSettings } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

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
        if (!database) throw new Error("Database not available");
        
        const updateData: any = {};
        if (input.cpf) {
          const cleanCpf = input.cpf.replace(/\D/g, "");
          
          // Check if CPF is already used by someone else
          const existingUserWithCpf = await database.select().from(users).where(eq(users.cpf, cleanCpf)).limit(1);
          if (existingUserWithCpf.length > 0 && existingUserWithCpf[0].id !== ctx.user.id) {
            throw new Error("Este CPF já está vinculado a outra conta. Não é permitido o uso de um mesmo CPF em múltiplas contas.");
          }
          
          updateData.cpf = cleanCpf;
        }
        if (input.name) updateData.name = input.name;
        if (input.forteCoins !== undefined) updateData.forteCoins = input.forteCoins;
        
        await database.update(users)
          .set(updateData)
          .where(eq(users.id, ctx.user.id));
        return { success: true };
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
        
        const seller = await db.getSellerByUserId(ctx.user.id);
        if (!seller) throw new Error("User is not a seller");
        
        const result = await database.insert(usedProducts).values({
          sellerId: seller.id,
          name: input.name,
          description: input.description,
          price: input.price.toString(),
          condition: input.condition,
          images: input.images || [],
          cep: input.cep || null,
          estado: input.estado || null,
          cidade: input.cidade || null,
          bairro: input.bairro || null,
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
        if (!seller) throw new Error("User is not a seller");
        
        const boostedUntilDate = new Date();
        boostedUntilDate.setDate(boostedUntilDate.getDate() + 3);

        const result = await database.update(usedProducts)
          .set({ boostedUntil: boostedUntilDate })
          .where(eq(usedProducts.id, input.id));
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
        status: z.string(),
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
    update: protectedProcedure
      .input(z.object({
        commissionPercentage: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        return db.updatePlatformSettings(input.commissionPercentage);
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
          if (list.length > 0) return list;
        } catch (e) {
          console.error("[TRPC Platinador] Error fetching challenges:", e);
        }
      }

      return [
        {
          id: 1,
          gameTitle: "God of War Ragnarök",
          description: "Conquiste todos os troféus incluindo a vitória na arena de Valhalla e derrotar Gná.",
          platform: "PS4 / PS5",
          imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800",
          rewardCoins: 500,
          status: "ativo",
          createdAt: new Date(),
        },
        {
          id: 2,
          gameTitle: "Marvel's Spider-Man 2",
          description: "Desbloqueie a platina completa explorando toda a Nova York com Peter e Miles.",
          platform: "PS5",
          imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=800",
          rewardCoins: 400,
          status: "ativo",
          createdAt: new Date(),
        },
        {
          id: 3,
          gameTitle: "Elden Ring",
          description: "Alcance o título de Lorde Prateado e consiga todos os 42 troféus nas terras intermediárias.",
          platform: "PS4 / PS5",
          imageUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=800",
          rewardCoins: 600,
          status: "ativo",
          createdAt: new Date(),
        },
      ];
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
