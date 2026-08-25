var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminDismissedNotifications: () => adminDismissedNotifications,
  challengeStatusEnum: () => challengeStatusEnum,
  conditionEnum: () => conditionEnum,
  coupons: () => coupons,
  digitalProducts: () => digitalProducts,
  digitalProductsRelations: () => digitalProductsRelations,
  digitalTypeEnum: () => digitalTypeEnum,
  messages: () => messages,
  messagesRelations: () => messagesRelations,
  orderStatusEnum: () => orderStatusEnum,
  orders: () => orders,
  ordersRelations: () => ordersRelations,
  platformSettings: () => platformSettings,
  platinadorSubscriptions: () => platinadorSubscriptions,
  platinumChallenges: () => platinumChallenges,
  platinumSubmissions: () => platinumSubmissions,
  productTypeEnum: () => productTypeEnum,
  products: () => products,
  reviews: () => reviews,
  reviewsRelations: () => reviewsRelations,
  roleEnum: () => roleEnum,
  sellers: () => sellers,
  sellersRelations: () => sellersRelations,
  submissionStatusEnum: () => submissionStatusEnum,
  subscriptionStatusEnum: () => subscriptionStatusEnum,
  usedProducts: () => usedProducts,
  usedProductsRelations: () => usedProductsRelations,
  usedStatusEnum: () => usedStatusEnum,
  users: () => users,
  usersRelations: () => usersRelations
});
import { integer, pgEnum, pgTable, text, timestamp, varchar, numeric, boolean, json, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
var roleEnum, conditionEnum, usedStatusEnum, digitalTypeEnum, productTypeEnum, orderStatusEnum, subscriptionStatusEnum, challengeStatusEnum, submissionStatusEnum, users, sellers, products, usedProducts, digitalProducts, orders, coupons, reviews, messages, adminDismissedNotifications, platformSettings, platinadorSubscriptions, platinumChallenges, platinumSubmissions, usersRelations, sellersRelations, usedProductsRelations, digitalProductsRelations, ordersRelations, reviewsRelations, messagesRelations;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    roleEnum = pgEnum("role", ["user", "admin", "vendedor", "collaborator"]);
    conditionEnum = pgEnum("condition", ["novo", "como_novo", "bom", "aceitavel"]);
    usedStatusEnum = pgEnum("used_status", ["pendente", "aprovado", "rejeitado", "vendido"]);
    digitalTypeEnum = pgEnum("digital_type", ["jogo", "gift_card", "licenca", "assinatura", "outro"]);
    productTypeEnum = pgEnum("product_type", ["store", "used", "digital"]);
    orderStatusEnum = pgEnum("order_status", ["pendente", "pago", "enviado", "entregue", "cancelado"]);
    subscriptionStatusEnum = pgEnum("subscription_status", ["ativa", "cancelada", "expirada", "pendente"]);
    challengeStatusEnum = pgEnum("challenge_status", ["ativo", "encerrado", "brevemente"]);
    submissionStatusEnum = pgEnum("submission_status", ["pendente", "aprovado", "rejeitado"]);
    users = pgTable("users", {
      /** Surrogate primary key. Auto-incremented by PostgreSQL. */
      id: serial("id").primaryKey(),
      /** OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      cpf: varchar("cpf", { length: 18 }),
      psnId: varchar("psnId", { length: 100 }),
      forteCoins: integer("forteCoins").default(10).notNull(),
      role: roleEnum("role").default("user").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => /* @__PURE__ */ new Date()),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
      balance: numeric("balance", { precision: 12, scale: 2 }).default("0").notNull()
    });
    sellers = pgTable("sellers", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull().unique(),
      storeName: varchar("storeName", { length: 255 }).notNull(),
      description: text("description"),
      rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
      totalReviews: integer("totalReviews").default(0),
      commissionPercentage: numeric("commissionPercentage", { precision: 5, scale: 2 }).default("10"),
      isActive: boolean("isActive").default(true),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => /* @__PURE__ */ new Date())
    });
    products = pgTable("products", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description"),
      price: numeric("price", { precision: 10, scale: 2 }).notNull(),
      category: varchar("category", { length: 100 }).notNull(),
      stock: integer("stock").notNull().default(0),
      images: json("images").$type().default([]),
      isActive: boolean("isActive").default(true),
      mercadoLibreId: varchar("mercadoLibreId", { length: 255 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => /* @__PURE__ */ new Date())
    });
    usedProducts = pgTable("usedProducts", {
      id: serial("id").primaryKey(),
      sellerId: integer("sellerId").notNull(),
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description"),
      category: varchar("category", { length: 50 }).default("midia_fisica"),
      price: numeric("price", { precision: 10, scale: 2 }).notNull(),
      condition: conditionEnum("condition").notNull(),
      images: json("images").$type().default([]),
      status: usedStatusEnum("status").default("pendente"),
      estado: varchar("estado", { length: 50 }),
      cidade: varchar("cidade", { length: 100 }),
      cep: varchar("cep", { length: 9 }),
      bairro: varchar("bairro", { length: 100 }),
      boostedUntil: timestamp("boostedUntil"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => /* @__PURE__ */ new Date())
    });
    digitalProducts = pgTable("digitalProducts", {
      id: serial("id").primaryKey(),
      sellerId: integer("sellerId"),
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description"),
      price: numeric("price", { precision: 10, scale: 2 }).notNull(),
      pricePrimary: numeric("pricePrimary", { precision: 10, scale: 2 }),
      priceSecondary: numeric("priceSecondary", { precision: 10, scale: 2 }),
      type: digitalTypeEnum("type").notNull(),
      keyOrCode: text("keyOrCode"),
      downloadUrl: varchar("downloadUrl", { length: 500 }),
      imageUrl: varchar("imageUrl", { length: 500 }),
      stock: integer("stock").notNull().default(1),
      stockPrimary: integer("stockPrimary").default(0),
      stockSecondary: integer("stockSecondary").default(0),
      isActive: boolean("isActive").default(true),
      platform: varchar("platform", { length: 50 }),
      category: varchar("category", { length: 100 }),
      coverFit: varchar("coverFit", { length: 20 }),
      isPreVenda: boolean("isPreVenda").default(false),
      showInEconomia: boolean("showInEconomia").default(false),
      economiaLicenseType: varchar("economiaLicenseType", { length: 50 }),
      // "pendente" | "aprovado" | "rejeitado" — contas cadastradas por vendedores da comunidade
      // (SellDigitalProduct) entram como "pendente" e só ficam públicas após aprovação do gestor;
      // cadastros feitos pelo próprio admin (adminCreate) já entram "aprovado".
      status: varchar("status", { length: 20 }).default("aprovado").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => /* @__PURE__ */ new Date())
    });
    orders = pgTable("orders", {
      id: serial("id").primaryKey(),
      buyerId: integer("buyerId").notNull(),
      sellerId: integer("sellerId"),
      productId: integer("productId"),
      usedProductId: integer("usedProductId"),
      digitalProductId: integer("digitalProductId"),
      productType: productTypeEnum("productType").notNull(),
      quantity: integer("quantity").notNull().default(1),
      totalPrice: numeric("totalPrice", { precision: 10, scale: 2 }).notNull(),
      commissionPercentage: numeric("commissionPercentage", { precision: 5, scale: 2 }).notNull(),
      platformCommission: numeric("platformCommission", { precision: 10, scale: 2 }).notNull(),
      sellerAmount: numeric("sellerAmount", { precision: 10, scale: 2 }).notNull(),
      status: orderStatusEnum("status").default("pendente"),
      paymentId: varchar("paymentId", { length: 255 }),
      productName: varchar("productName", { length: 255 }),
      firebaseProductId: varchar("firebaseProductId", { length: 255 }),
      accountType: varchar("accountType", { length: 20 }),
      deliveryDetails: text("deliveryDetails"),
      coinsUsed: integer("coinsUsed").default(0).notNull(),
      buyerPhone: varchar("buyerPhone", { length: 30 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => /* @__PURE__ */ new Date())
    });
    coupons = pgTable("coupons", {
      id: serial("id").primaryKey(),
      code: varchar("code", { length: 50 }).notNull().unique(),
      discountPercentage: numeric("discountPercentage", { precision: 5, scale: 2 }).notNull(),
      maxUses: integer("maxUses"),
      usedCount: integer("usedCount").default(0),
      expiresAt: timestamp("expiresAt"),
      isActive: boolean("isActive").default(true),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    reviews = pgTable("reviews", {
      id: serial("id").primaryKey(),
      orderId: integer("orderId").notNull(),
      sellerId: integer("sellerId").notNull(),
      buyerId: integer("buyerId").notNull(),
      rating: integer("rating").notNull(),
      comment: text("comment"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    messages = pgTable("messages", {
      id: serial("id").primaryKey(),
      senderId: integer("senderId").notNull(),
      recipientId: integer("recipientId").notNull(),
      orderId: integer("orderId"),
      content: text("content").notNull(),
      isRead: boolean("isRead").default(false),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    adminDismissedNotifications = pgTable("admin_dismissed_notifications", {
      id: varchar("id", { length: 255 }).primaryKey(),
      dismissedAt: timestamp("dismissedAt").defaultNow().notNull()
    });
    platformSettings = pgTable("platform_settings", {
      id: integer("id").primaryKey(),
      commissionPercentage: numeric("commissionPercentage", { precision: 5, scale: 2 }).default("10"),
      vipWhatsappUrl: varchar("vipWhatsappUrl", { length: 500 }).default("https://chat.whatsapp.com/Gkx7ExampleVipLink"),
      // Teto de ForteCoins aplicavel numa unica compra — o servidor (payment.ts) usa isso pra
      // limitar o desconto, nunca confia em valor vindo do navegador.
      maxCoinsPerPurchase: integer("maxCoinsPerPurchase").default(10),
      maxCoinsPreVenda: integer("maxCoinsPreVenda").default(50),
      updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => /* @__PURE__ */ new Date())
    });
    platinadorSubscriptions = pgTable("platinador_subscriptions", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull().unique(),
      status: subscriptionStatusEnum("status").default("ativa").notNull(),
      planName: varchar("planName", { length: 100 }).default("Clube Platinador VIP").notNull(),
      price: numeric("price", { precision: 10, scale: 2 }).default("15.00").notNull(),
      startsAt: timestamp("startsAt").defaultNow().notNull(),
      expiresAt: timestamp("expiresAt").notNull(),
      paymentId: varchar("paymentId", { length: 255 }),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    platinumChallenges = pgTable("platinum_challenges", {
      id: serial("id").primaryKey(),
      gameTitle: varchar("gameTitle", { length: 255 }).notNull(),
      description: text("description"),
      platform: varchar("platform", { length: 50 }).default("PS4 / PS5").notNull(),
      imageUrl: varchar("imageUrl", { length: 500 }),
      rewardCoins: integer("rewardCoins").default(500).notNull(),
      status: challengeStatusEnum("status").default("ativo").notNull(),
      deadline: timestamp("deadline"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    platinumSubmissions = pgTable("platinum_submissions", {
      id: serial("id").primaryKey(),
      challengeId: integer("challengeId").notNull(),
      userId: integer("userId").notNull(),
      psnId: varchar("psnId", { length: 100 }).notNull(),
      proofUrl: text("proofUrl").notNull(),
      status: submissionStatusEnum("status").default("pendente").notNull(),
      coinsAwarded: integer("coinsAwarded").default(0).notNull(),
      adminNotes: text("adminNotes"),
      submittedAt: timestamp("submittedAt").defaultNow().notNull(),
      reviewedAt: timestamp("reviewedAt")
    });
    usersRelations = relations(users, ({ one, many }) => ({
      seller: one(sellers, {
        fields: [users.id],
        references: [sellers.userId]
      }),
      buyerOrders: many(orders, {
        relationName: "buyer"
      }),
      sellerOrders: many(orders, {
        relationName: "seller"
      }),
      sentMessages: many(messages, {
        relationName: "sender"
      }),
      receivedMessages: many(messages, {
        relationName: "recipient"
      })
    }));
    sellersRelations = relations(sellers, ({ one, many }) => ({
      user: one(users, {
        fields: [sellers.userId],
        references: [users.id]
      }),
      usedProducts: many(usedProducts),
      digitalProducts: many(digitalProducts),
      orders: many(orders),
      reviews: many(reviews)
    }));
    usedProductsRelations = relations(usedProducts, ({ one, many }) => ({
      seller: one(sellers, {
        fields: [usedProducts.sellerId],
        references: [sellers.id]
      }),
      orders: many(orders)
    }));
    digitalProductsRelations = relations(digitalProducts, ({ one, many }) => ({
      seller: one(sellers, {
        fields: [digitalProducts.sellerId],
        references: [sellers.id]
      }),
      orders: many(orders)
    }));
    ordersRelations = relations(orders, ({ one }) => ({
      buyer: one(users, {
        fields: [orders.buyerId],
        references: [users.id],
        relationName: "buyer"
      }),
      seller: one(users, {
        fields: [orders.sellerId],
        references: [users.id],
        relationName: "seller"
      }),
      product: one(products, {
        fields: [orders.productId],
        references: [products.id]
      }),
      usedProduct: one(usedProducts, {
        fields: [orders.usedProductId],
        references: [usedProducts.id]
      }),
      digitalProduct: one(digitalProducts, {
        fields: [orders.digitalProductId],
        references: [digitalProducts.id]
      })
    }));
    reviewsRelations = relations(reviews, ({ one }) => ({
      order: one(orders, {
        fields: [reviews.orderId],
        references: [orders.id]
      }),
      seller: one(sellers, {
        fields: [reviews.sellerId],
        references: [sellers.id]
      }),
      buyer: one(users, {
        fields: [reviews.buyerId],
        references: [users.id]
      })
    }));
    messagesRelations = relations(messages, ({ one }) => ({
      sender: one(users, {
        fields: [messages.senderId],
        references: [users.id],
        relationName: "sender"
      }),
      recipient: one(users, {
        fields: [messages.recipientId],
        references: [users.id],
        relationName: "recipient"
      }),
      order: one(orders, {
        fields: [messages.orderId],
        references: [orders.id]
      })
    }));
  }
});

// server/email.ts
var email_exports = {};
__export(email_exports, {
  sendDeliveryEmail: () => sendDeliveryEmail
});
import nodemailer from "nodemailer";
async function sendDeliveryEmail({
  to,
  buyerName,
  productName,
  deliveryDetails
}) {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("[Email] SMTP is not configured. Skipping sending email to:", to);
    return false;
  }
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
  const messageText = `Ol\xE1, ${buyerName}!

Obrigado por adquirir o jogo ${productName}!

Aqui est\xE3o as instru\xE7\xF5es e dados de acesso para come\xE7ar a jogar:

--------------------------------------------------
${deliveryDetails}
--------------------------------------------------

Qualquer d\xFAvida ou problema, nossa equipe estar\xE1 totalmente \xE0 disposi\xE7\xE3o para lhe ajudar!
Voc\xEA pode entrar em contato conosco diretamente pelo chat do site ou pelo nosso WhatsApp: +55 43 8425-3691.

Atenciosamente,
Equipe Eforte Games`;
  const messageHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #dc143c; margin-top: 0;">Obrigado pela sua compra!</h2>
      <p>Ol\xE1, <strong>${buyerName}</strong>,</p>
      <p>Agradecemos por adquirir o jogo <strong>${productName}</strong> na Eforte Games.</p>
      
      <div style="background-color: #f9f9f9; border-left: 4px solid #dc143c; padding: 15px; margin: 20px 0; font-family: monospace; white-space: pre-wrap;">
        <h3 style="margin-top: 0; color: #333;">\u{1F5DD}\uFE0F Dados de Acesso / Instru\xE7\xF5es:</h3>
        ${deliveryDetails.replace(/\n/g, "<br>")}
      </div>
      
      <p>Qualquer d\xFAvida ou problema, estamos \xE0 total disposi\xE7\xE3o para ajudar no que for preciso.</p>
      <p>Voc\xEA pode entrar em contato conosco pelo chat em nosso site ou diretamente atrav\xE9s do nosso <strong>WhatsApp: +55 43 8425-3691</strong>.</p>
      
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">
      <p style="font-size: 12px; color: #777777; text-align: center;">Eforte Games \u2014 Divers\xE3o garantida no seu console</p>
    </div>
  `;
  try {
    const info = await transporter.sendMail({
      from: smtpFrom,
      to,
      subject: `\u{1F5DD}\uFE0F Seu jogo ${productName} chegou! - Eforte Games`,
      text: messageText,
      html: messageHtml
    });
    console.log("[Email] Email de entrega enviado com sucesso:", info.messageId);
    return true;
  } catch (error) {
    console.error("[Email] Erro ao enviar email:", error);
    throw error;
  }
}
var smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom;
var init_email = __esm({
  "server/email.ts"() {
    "use strict";
    smtpHost = process.env.SMTP_HOST;
    smtpPort = parseInt(process.env.SMTP_PORT || "587");
    smtpUser = process.env.SMTP_USER;
    smtpPass = process.env.SMTP_PASS;
    smtpFrom = process.env.SMTP_FROM || `"Eforte Games" <no-reply@efortegames.com.br>`;
  }
});

// server/_core/index.ts
import dotenv from "dotenv";
import path from "path";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
init_schema();
import { eq, and, desc, sql, inArray, lt } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
function getDb() {
  if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL is not set");
    return null;
  }
  try {
    const sqlClient = neon(process.env.DATABASE_URL);
    return drizzle(sqlClient);
  } catch (error) {
    console.warn("[Database] Falha ao inicializar banco:", error.message);
    return null;
  }
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const userEmailLower = user.email?.toLowerCase().trim();
    const ADMIN_EMAILS = [
      "luanmnogueira@gmail.com",
      "enfortec@admin.com",
      "luiz220190@hotmail.com",
      "sandrinhooperfectt@gmail.com"
    ];
    const isAdmin = user.openId === ENV.ownerOpenId || userEmailLower && ADMIN_EMAILS.includes(userEmailLower);
    const roleToSet = user.role || (isAdmin ? "admin" : "user");
    let existingUser = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1).then((r) => r[0]);
    if (!existingUser && userEmailLower) {
      existingUser = await db.select().from(users).where(sql`LOWER(${users.email}) = ${userEmailLower}`).limit(1).then((r) => r[0]);
    }
    if (existingUser) {
      const now = /* @__PURE__ */ new Date();
      const lastSigned = existingUser.lastSignedIn ? new Date(existingUser.lastSignedIn).getTime() : 0;
      const twelveHoursAgo = now.getTime() - 12 * 60 * 60 * 1e3;
      const shouldUpdateLastSigned = lastSigned < twelveHoursAgo;
      const updateData = {};
      let hasChanges = false;
      if (user.openId !== existingUser.openId) {
        updateData.openId = user.openId;
        hasChanges = true;
      }
      if (shouldUpdateLastSigned) {
        updateData.lastSignedIn = user.lastSignedIn || now;
        hasChanges = true;
      }
      if (isAdmin && existingUser.role !== "admin") {
        updateData.role = "admin";
        hasChanges = true;
      } else if (user.role && user.role !== existingUser.role) {
        updateData.role = user.role;
        hasChanges = true;
      }
      if (user.name && user.name !== existingUser.name) {
        updateData.name = user.name;
        hasChanges = true;
      }
      if (user.email && user.email !== existingUser.email) {
        updateData.email = user.email;
        hasChanges = true;
      }
      if (user.cpf && user.cpf !== existingUser.cpf) {
        updateData.cpf = user.cpf;
        hasChanges = true;
      }
      if (user.forteCoins !== void 0 && user.forteCoins !== existingUser.forteCoins) {
        updateData.forteCoins = user.forteCoins;
        hasChanges = true;
      }
      if (user.loginMethod && user.loginMethod !== existingUser.loginMethod) {
        updateData.loginMethod = user.loginMethod;
        hasChanges = true;
      }
      if (hasChanges) {
        await db.update(users).set(updateData).where(eq(users.id, existingUser.id));
      }
    } else {
      const insertData = {
        openId: user.openId,
        name: user.name || "User",
        email: user.email || null,
        loginMethod: user.loginMethod || "firebase",
        role: roleToSet,
        lastSignedIn: user.lastSignedIn || /* @__PURE__ */ new Date(),
        forteCoins: user.forteCoins ?? 10
      };
      if (user.cpf) insertData.cpf = user.cpf;
      await db.insert(users).values(insertData).onConflictDoUpdate({
        target: users.openId,
        set: {
          name: user.name || "User",
          email: user.email || null,
          role: roleToSet,
          lastSignedIn: user.lastSignedIn || /* @__PURE__ */ new Date()
        }
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
  }
}
async function getUserByOpenId(openId) {
  try {
    const db = getDb();
    if (!db) {
      console.warn("[Database] Cannot get user: database not available");
      return void 0;
    }
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result.length > 0 ? result[0] : void 0;
  } catch (error) {
    console.error("[Database] Failed to get user by openId:", error);
    return void 0;
  }
}
async function getUserById(id) {
  try {
    const db = getDb();
    if (!db || !id) return void 0;
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result.length > 0 ? result[0] : void 0;
  } catch (error) {
    console.error("[Database] Failed to get user by id:", error);
    return void 0;
  }
}
async function getUserByEmail(email) {
  try {
    const db = getDb();
    if (!db || !email) return void 0;
    const cleanEmail = email.toLowerCase().trim();
    const result = await db.select().from(users).where(sql`LOWER(${users.email}) = ${cleanEmail}`).limit(1);
    return result.length > 0 ? result[0] : void 0;
  } catch (error) {
    console.error("[Database] Failed to get user by email:", error);
    return void 0;
  }
}
async function getActiveProducts() {
  const db = getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
}
async function getProductById(id) {
  const db = getDb();
  if (!db) return void 0;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getSellerByUserId(userId) {
  try {
    const db = getDb();
    if (!db) return null;
    const result = await db.select().from(sellers).where(eq(sellers.userId, userId)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database Error] getSellerByUserId failed:", error);
    return null;
  }
}
async function getActiveSellers() {
  const db = getDb();
  if (!db) return [];
  return db.select().from(sellers).where(eq(sellers.isActive, true)).orderBy(desc(sellers.rating));
}
async function getApprovedUsedProducts() {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select({
    product: usedProducts,
    sellerName: users.name,
    sellerOpenId: users.openId
  }).from(usedProducts).leftJoin(sellers, eq(usedProducts.sellerId, sellers.id)).leftJoin(users, eq(sellers.userId, users.id)).where(eq(usedProducts.status, "aprovado")).orderBy(desc(usedProducts.createdAt));
  return rows.map((r) => ({ ...r.product, sellerName: r.sellerName, sellerOpenId: r.sellerOpenId }));
}
async function getUsedProductsBySellerId(sellerId) {
  const db = getDb();
  if (!db) return [];
  return db.select().from(usedProducts).where(eq(usedProducts.sellerId, sellerId)).orderBy(desc(usedProducts.createdAt));
}
async function getUsedProductsForAccount(userId, isAdminAccount) {
  const db = getDb();
  if (!db) return [];
  if (isAdminAccount) {
    const rows = await db.select({ product: usedProducts }).from(usedProducts).innerJoin(sellers, eq(usedProducts.sellerId, sellers.id)).innerJoin(users, eq(sellers.userId, users.id)).where(eq(users.role, "admin")).orderBy(desc(usedProducts.createdAt));
    return rows.map((r) => r.product);
  }
  const seller = await getSellerByUserId(userId);
  if (!seller) return [];
  return getUsedProductsBySellerId(seller.id);
}
async function getAllUsedProductsWithSeller() {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select({
    product: usedProducts,
    sellerStoreName: sellers.storeName,
    sellerEmail: users.email,
    sellerName: users.name,
    directUserEmail: sql`(SELECT email FROM users WHERE id = ${usedProducts.sellerId} LIMIT 1)`,
    directUserName: sql`(SELECT name FROM users WHERE id = ${usedProducts.sellerId} LIMIT 1)`
  }).from(usedProducts).leftJoin(sellers, eq(usedProducts.sellerId, sellers.id)).leftJoin(users, eq(sellers.userId, users.id)).orderBy(desc(usedProducts.createdAt));
  return rows.map((r) => ({
    ...r.product,
    sellerStoreName: r.sellerStoreName || void 0,
    sellerEmail: r.sellerEmail || r.directUserEmail || void 0,
    sellerName: r.sellerName || r.directUserName || void 0
  }));
}
async function getActiveDigitalProducts() {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select({
    product: digitalProducts,
    sellerName: users.name,
    sellerOpenId: users.openId
  }).from(digitalProducts).leftJoin(sellers, eq(digitalProducts.sellerId, sellers.id)).leftJoin(users, eq(sellers.userId, users.id)).where(and(eq(digitalProducts.isActive, true), eq(digitalProducts.status, "aprovado"))).orderBy(desc(digitalProducts.createdAt));
  return rows.map((r) => ({ ...r.product, sellerName: r.sellerName, sellerOpenId: r.sellerOpenId }));
}
async function getAllDigitalProductsWithSeller() {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select({
    product: digitalProducts,
    sellerStoreName: sellers.storeName,
    sellerEmail: users.email,
    sellerName: users.name,
    directUserEmail: sql`(SELECT email FROM users WHERE id = ${digitalProducts.sellerId} LIMIT 1)`,
    directUserName: sql`(SELECT name FROM users WHERE id = ${digitalProducts.sellerId} LIMIT 1)`
  }).from(digitalProducts).leftJoin(sellers, eq(digitalProducts.sellerId, sellers.id)).leftJoin(users, eq(sellers.userId, users.id)).orderBy(desc(digitalProducts.createdAt));
  return rows.map((r) => ({
    ...r.product,
    sellerStoreName: r.sellerStoreName || void 0,
    sellerEmail: r.sellerEmail || r.directUserEmail || void 0,
    sellerName: r.sellerName || r.directUserName || void 0
  }));
}
async function getDigitalProductsBySellerId(sellerId) {
  const db = getDb();
  if (!db) return [];
  return db.select().from(digitalProducts).where(eq(digitalProducts.sellerId, sellerId)).orderBy(desc(digitalProducts.createdAt));
}
async function getDigitalProductsForAccount(userId, isAdminAccount) {
  const db = getDb();
  if (!db) return [];
  if (isAdminAccount) {
    const rows = await db.select({ product: digitalProducts }).from(digitalProducts).innerJoin(sellers, eq(digitalProducts.sellerId, sellers.id)).innerJoin(users, eq(sellers.userId, users.id)).where(eq(users.role, "admin")).orderBy(desc(digitalProducts.createdAt));
    return rows.map((r) => r.product);
  }
  const seller = await getSellerByUserId(userId);
  if (!seller) return [];
  return getDigitalProductsBySellerId(seller.id);
}
async function getOrdersByBuyerId(buyerId) {
  const db = getDb();
  if (!db) return [];
  const results = await db.select({
    order: orders,
    product: products,
    usedProduct: usedProducts,
    digitalProduct: digitalProducts
  }).from(orders).leftJoin(products, eq(orders.productId, products.id)).leftJoin(usedProducts, eq(orders.usedProductId, usedProducts.id)).leftJoin(digitalProducts, eq(orders.digitalProductId, digitalProducts.id)).where(eq(orders.buyerId, buyerId)).orderBy(desc(orders.createdAt));
  return results.map((r) => {
    let productName = r.order.productName;
    if (!productName || productName.trim() === "" || productName === "Produto") {
      if (r.order.productType === "store" && r.product) {
        productName = r.product.name;
      } else if (r.order.productType === "used" && r.usedProduct) {
        productName = r.usedProduct.name;
      } else if (r.order.productType === "digital" && r.digitalProduct) {
        productName = r.digitalProduct.name;
      } else {
        productName = "Produto";
      }
    }
    return {
      ...r.order,
      productName
    };
  });
}
async function getOrdersBySellerId(sellerId) {
  const db = getDb();
  if (!db) return [];
  const results = await db.select({
    order: orders,
    product: products,
    usedProduct: usedProducts,
    digitalProduct: digitalProducts
  }).from(orders).leftJoin(products, eq(orders.productId, products.id)).leftJoin(usedProducts, eq(orders.usedProductId, usedProducts.id)).leftJoin(digitalProducts, eq(orders.digitalProductId, digitalProducts.id)).where(eq(orders.sellerId, sellerId)).orderBy(desc(orders.createdAt));
  return results.map((r) => {
    let productName = r.order.productName;
    if (!productName || productName.trim() === "" || productName === "Produto") {
      if (r.order.productType === "store" && r.product) {
        productName = r.product.name;
      } else if (r.order.productType === "used" && r.usedProduct) {
        productName = r.usedProduct.name;
      } else if (r.order.productType === "digital" && r.digitalProduct) {
        productName = r.digitalProduct.name;
      } else {
        productName = "Produto";
      }
    }
    return {
      ...r.order,
      productName
    };
  });
}
async function getAllOrdersWithDetails() {
  const db = getDb();
  if (!db) return [];
  const results = await db.select({
    order: orders,
    buyer: users,
    product: products,
    usedProduct: usedProducts,
    digitalProduct: digitalProducts
  }).from(orders).leftJoin(users, eq(orders.buyerId, users.id)).leftJoin(products, eq(orders.productId, products.id)).leftJoin(usedProducts, eq(orders.usedProductId, usedProducts.id)).leftJoin(digitalProducts, eq(orders.digitalProductId, digitalProducts.id)).orderBy(desc(orders.createdAt));
  return results.map((r) => {
    let productName = r.order.productName;
    if (!productName || productName.trim() === "" || productName === "Produto") {
      if (r.order.productType === "store" && r.product) {
        productName = r.product.name;
      } else if (r.order.productType === "used" && r.usedProduct) {
        productName = r.usedProduct.name;
      } else if (r.order.productType === "digital" && r.digitalProduct) {
        productName = r.digitalProduct.name;
      } else {
        productName = "Produto";
      }
    }
    return {
      ...r.order,
      buyerName: r.buyer?.name || "Sem Nome",
      buyerEmail: r.buyer?.email || "Sem E-mail",
      buyerPhone: r.order.buyerPhone || null,
      productName
    };
  });
}
async function deliverOrder(orderId, deliveryDetails) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  const orderResult = await db.select({
    order: orders,
    buyer: users,
    product: products,
    usedProduct: usedProducts,
    digitalProduct: digitalProducts
  }).from(orders).leftJoin(users, eq(orders.buyerId, users.id)).leftJoin(products, eq(orders.productId, products.id)).leftJoin(usedProducts, eq(orders.usedProductId, usedProducts.id)).leftJoin(digitalProducts, eq(orders.digitalProductId, digitalProducts.id)).where(eq(orders.id, orderId)).limit(1);
  const orderInfo = orderResult[0];
  if (!orderInfo) throw new Error("Pedido n\xE3o encontrado");
  await db.update(orders).set({
    deliveryDetails,
    status: "enviado"
  }).where(eq(orders.id, orderId));
  const buyerEmail = orderInfo.buyer?.email;
  if (buyerEmail) {
    let productName = orderInfo.order.productName || "Produto";
    if (orderInfo.order.productType === "store" && orderInfo.product) {
      productName = orderInfo.product.name;
    } else if (orderInfo.order.productType === "used" && orderInfo.usedProduct) {
      productName = orderInfo.usedProduct.name;
    } else if (orderInfo.order.productType === "digital" && orderInfo.digitalProduct) {
      productName = orderInfo.digitalProduct.name;
    }
    try {
      const { sendDeliveryEmail: sendDeliveryEmail2 } = await Promise.resolve().then(() => (init_email(), email_exports));
      await sendDeliveryEmail2({
        to: buyerEmail,
        buyerName: orderInfo.buyer?.name || "Cliente",
        productName,
        deliveryDetails
      });
    } catch (emailErr) {
      console.error("[Email] Erro ao enviar email de entrega:", emailErr);
    }
  }
  return { success: true };
}
async function getCouponByCode(code) {
  const db = getDb();
  if (!db) return void 0;
  const result = await db.select().from(coupons).where(and(eq(coupons.code, code), eq(coupons.isActive, true))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAllCoupons() {
  const db = getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}
async function createCoupon(coupon) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(coupons).values(coupon);
}
async function updateCoupon(id, updateData) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  return db.update(coupons).set(updateData).where(eq(coupons.id, id));
}
async function deleteCoupon(id) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(coupons).where(eq(coupons.id, id));
}
async function getReviewsBySellerId(sellerId) {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select({ review: reviews, buyerName: users.name }).from(reviews).leftJoin(users, eq(reviews.buyerId, users.id)).where(eq(reviews.sellerId, sellerId)).orderBy(desc(reviews.createdAt));
  return rows.map((r) => ({ ...r.review, buyerName: r.buyerName }));
}
async function getPlatformSettings() {
  const db = getDb();
  if (!db) return void 0;
  const result = await db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1);
  if (result.length === 0) {
    await db.insert(platformSettings).values({ id: 1, commissionPercentage: "6" }).onConflictDoNothing();
    return { id: 1, commissionPercentage: "6", vipWhatsappUrl: null, maxCoinsPerPurchase: 10, maxCoinsPreVenda: 50 };
  }
  return result[0];
}
async function updatePlatformSettings(data) {
  const db = getDb();
  if (!db) return;
  await db.update(platformSettings).set(data).where(eq(platformSettings.id, 1));
}
async function getDismissedNotificationIds() {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select().from(adminDismissedNotifications);
  return rows.map((r) => r.id);
}
async function dismissNotifications(ids) {
  const db = getDb();
  if (!db || ids.length === 0) return;
  await db.insert(adminDismissedNotifications).values(ids.map((id) => ({ id }))).onConflictDoNothing();
}
async function restoreNotifications(ids) {
  const db = getDb();
  if (!db || ids.length === 0) return;
  await db.delete(adminDismissedNotifications).where(inArray(adminDismissedNotifications.id, ids));
}
async function confirmOrderAndReview(orderId, buyerId, rating, comment) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = result[0];
  if (!order) {
    throw new Error("Pedido n\xE3o encontrado");
  }
  if (order.buyerId !== buyerId) {
    throw new Error("Apenas o comprador pode confirmar o recebimento");
  }
  if (order.status !== "pago" && order.status !== "enviado") {
    throw new Error("Pedido n\xE3o est\xE1 em um estado v\xE1lido para confirma\xE7\xE3o");
  }
  if (!order.sellerId) {
    throw new Error("Pedido n\xE3o possui um vendedor associado");
  }
  const sellerProfileResult = await db.select().from(sellers).where(eq(sellers.userId, order.sellerId)).limit(1);
  const sellerProfile = sellerProfileResult[0];
  const updateResult = await db.update(orders).set({ status: "entregue" }).where(and(eq(orders.id, orderId), eq(orders.status, order.status))).returning({ id: orders.id });
  if (updateResult.length === 0) {
    throw new Error("Este pedido j\xE1 foi confirmado em outra requisi\xE7\xE3o.");
  }
  await db.insert(reviews).values({
    orderId: order.id,
    sellerId: sellerProfile?.id ?? order.sellerId,
    buyerId,
    rating,
    comment: comment || null
  });
  if (sellerProfile) {
    const currentTotalReviews = sellerProfile.totalReviews || 0;
    const currentRating = parseFloat(sellerProfile.rating || "0");
    const newTotalReviews = currentTotalReviews + 1;
    const newRating = (currentRating * currentTotalReviews + rating) / newTotalReviews;
    await db.update(sellers).set({
      totalReviews: newTotalReviews,
      rating: newRating.toFixed(2)
    }).where(eq(sellers.id, sellerProfile.id));
  }
  const sellerUserResult = await db.select().from(users).where(eq(users.id, order.sellerId)).limit(1);
  const sellerUser = sellerUserResult[0];
  if (sellerUser) {
    const newBalance = (parseFloat(sellerUser.balance) + parseFloat(order.sellerAmount)).toString();
    await db.update(users).set({ balance: newBalance }).where(eq(users.id, order.sellerId));
  }
  return { success: true };
}
async function updateOrderStatus(orderId, status) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  return db.update(orders).set({ status }).where(eq(orders.id, orderId));
}
async function deleteOrder(orderId) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(orders).where(eq(orders.id, orderId));
}
async function getRecentReviews() {
  const db = getDb();
  if (!db) return [];
  const results = await db.select({
    review: reviews,
    buyer: users,
    order: orders,
    product: products,
    digitalProduct: digitalProducts,
    usedProduct: usedProducts
  }).from(reviews).leftJoin(users, eq(reviews.buyerId, users.id)).leftJoin(orders, eq(reviews.orderId, orders.id)).leftJoin(products, eq(orders.productId, products.id)).leftJoin(digitalProducts, eq(orders.digitalProductId, digitalProducts.id)).leftJoin(usedProducts, eq(orders.usedProductId, usedProducts.id)).orderBy(desc(reviews.createdAt)).limit(50);
  return results.map((r) => {
    let productName = r.order?.productName || "Produto";
    if (r.order?.productType === "store" && r.product) {
      productName = r.product.name;
    } else if (r.order?.productType === "used" && r.usedProduct) {
      productName = r.usedProduct.name;
    } else if (r.order?.productType === "digital" && r.digitalProduct) {
      productName = r.digitalProduct.name;
    }
    return {
      id: r.review.id,
      rating: r.review.rating,
      comment: r.review.comment,
      createdAt: r.review.createdAt,
      buyerName: r.buyer?.name || "Cliente",
      productName
    };
  });
}
async function runDatabaseCleanup() {
  const db = getDb();
  if (!db) return { success: false, error: "Database not available" };
  try {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1e3);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
    await db.delete(messages).where(lt(messages.createdAt, sixtyDaysAgo));
    await db.delete(adminDismissedNotifications).where(lt(adminDismissedNotifications.dismissedAt, thirtyDaysAgo));
    await db.delete(platinumSubmissions).where(
      and(
        eq(platinumSubmissions.status, "rejeitado"),
        lt(platinumSubmissions.submittedAt, sixtyDaysAgo)
      )
    );
    console.log("[Database Cleanup] Rotina de limpeza executada com sucesso.");
    return { success: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
  } catch (err) {
    console.error("[Database Cleanup] Erro ao executar limpeza:", err.message);
    return { success: false, error: err.message };
  }
}
async function getDatabaseStorageStats() {
  const db = getDb();
  if (!db) return null;
  try {
    const rawSql = sql`
      SELECT
        pg_database_name.datname AS database_name,
        pg_size_pretty(pg_database_size(pg_database_name.datname)) AS total_size,
        pg_database_size(pg_database_name.datname) AS total_bytes
      FROM (SELECT current_database() AS datname) AS pg_database_name;
    `;
    const dbSizeResult = await db.execute(rawSql);
    const tablesSql = sql`
      SELECT
        relname AS table_name,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
        pg_total_relation_size(relid) AS total_bytes
      FROM pg_catalog.pg_statio_user_tables
      ORDER BY pg_total_relation_size(relid) DESC;
    `;
    const tablesResult = await db.execute(tablesSql);
    const totalBytes = Number(dbSizeResult?.rows?.[0]?.total_bytes || 0);
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
    const freeTierLimitMb = 500;
    const usagePercentage = (Number(totalMb) / freeTierLimitMb * 100).toFixed(2);
    return {
      databaseName: dbSizeResult?.rows?.[0]?.database_name || "neondb",
      totalSize: dbSizeResult?.rows?.[0]?.total_size || "0 MB",
      totalMb: Number(totalMb),
      freeTierLimitMb,
      usagePercentage: `${usagePercentage}%`,
      tables: tablesResult?.rows || []
    };
  } catch (error) {
    console.warn("[Database Stats] Erro ao buscar m\xE9tricas de armazenamento:", error.message);
    return null;
  }
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
  statusCode;
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  client;
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/seed.ts
init_schema();
import { eq as eq2 } from "drizzle-orm";
var gameImages = {
  "A WAY OUT": "https://cdn.akamai.steamstatic.com/steam/apps/1222700/header.jpg",
  "AMNESIA COLLECTION": "https://cdn.akamai.steamstatic.com/steam/apps/57300/header.jpg",
  "ASSASSIN\u2019S CREED BLACK FLAG": "https://cdn.akamai.steamstatic.com/steam/apps/242050/header.jpg",
  "ASSASSIN\u2019S CREED UNITY": "https://cdn.akamai.steamstatic.com/steam/apps/289650/header.jpg",
  "BATMAN ARKHAM KNIGHT": "https://cdn.akamai.steamstatic.com/steam/apps/208650/header.jpg",
  "BATTLEFIELD 1": "https://cdn.akamai.steamstatic.com/steam/apps/1238840/header.jpg",
  "BATTLEFIELD 4": "https://cdn.akamai.steamstatic.com/steam/apps/1238860/header.jpg",
  "BATTLEFIELD 5": "https://cdn.akamai.steamstatic.com/steam/apps/1238810/header.jpg",
  "BIOSHOCK 2": "https://cdn.akamai.steamstatic.com/steam/apps/409720/header.jpg",
  "BIOSHOCK COLLECTION": "https://cdn.akamai.steamstatic.com/steam/apps/409710/header.jpg",
  "BLAIR WITCH": "https://cdn.akamai.steamstatic.com/steam/apps/1092660/header.jpg",
  "BULLY": "https://cdn.akamai.steamstatic.com/steam/apps/11020/header.jpg",
  "BURNOUT PARADISE": "https://cdn.akamai.steamstatic.com/steam/apps/1238080/header.jpg",
  "BUS SIMULATOR": "https://cdn.akamai.steamstatic.com/steam/apps/976590/header.jpg",
  "CONTROL": "https://cdn.akamai.steamstatic.com/steam/apps/870780/header.jpg",
  "CRYSIS TRILOGY": "https://cdn.akamai.steamstatic.com/steam/apps/1713000/header.jpg",
  "DARK GENESIS": "https://cdn.akamai.steamstatic.com/steam/apps/1604920/header.jpg",
  "DEAD ISLAND COLLECTION": "https://cdn.akamai.steamstatic.com/steam/apps/233130/header.jpg",
  "DEMON SLAYER": "https://cdn.akamai.steamstatic.com/steam/apps/1434460/header.jpg",
  "DETROIT BECOME HUMAN": "https://cdn.akamai.steamstatic.com/steam/apps/1153640/header.jpg",
  "DMC 5 + VERGIL (VERS\xC3O PS4)": "https://cdn.akamai.steamstatic.com/steam/apps/601150/header.jpg",
  "DOOM": "https://cdn.akamai.steamstatic.com/steam/apps/379720/header.jpg",
  "DRAKE COLLECTION": "https://cdn.akamai.steamstatic.com/steam/apps/1659420/header.jpg",
  "DYING LIGHT PREMIUM": "https://cdn.akamai.steamstatic.com/steam/apps/239140/header.jpg",
  "DRAGON BALL XENOVERSE": "https://cdn.akamai.steamstatic.com/steam/apps/454650/header.jpg",
  "FAR CRY 4": "https://cdn.akamai.steamstatic.com/steam/apps/298110/header.jpg",
  "FAR CRY 5 + NEW DAWN": "https://cdn.akamai.steamstatic.com/steam/apps/552520/header.jpg",
  "FAR CRY NEW DAWN": "https://cdn.akamai.steamstatic.com/steam/apps/939960/header.jpg",
  "GANG BEASTS": "https://cdn.akamai.steamstatic.com/steam/apps/285900/header.jpg",
  "GOAT SIMULATOR": "https://cdn.akamai.steamstatic.com/steam/apps/265930/header.jpg",
  "GREEN HELL": "https://cdn.akamai.steamstatic.com/steam/apps/815370/header.jpg",
  "HOGWARTS LEGACY": "https://cdn.akamai.steamstatic.com/steam/apps/990080/header.jpg",
  "INJUSTICE 2": "https://cdn.akamai.steamstatic.com/steam/apps/627270/header.jpg",
  "INJUSTICE LEGENDARY": "https://cdn.akamai.steamstatic.com/steam/apps/242700/header.jpg",
  "IT TAKES TWO": "https://cdn.akamai.steamstatic.com/steam/apps/1426210/header.jpg",
  "JUST CAUSE 3": "https://cdn.akamai.steamstatic.com/steam/apps/225540/header.jpg",
  "JUST CAUSE 4 RELOADED": "https://cdn.akamai.steamstatic.com/steam/apps/517630/header.jpg",
  "LEGO JURASSIC WORLD": "https://cdn.akamai.steamstatic.com/steam/apps/352400/header.jpg",
  "LEGO MARVEL SUPER HEROES": "https://cdn.akamai.steamstatic.com/steam/apps/249130/header.jpg",
  "LEGO MARVEL SUPER HEROES 2": "https://cdn.akamai.steamstatic.com/steam/apps/647830/header.jpg",
  "MARVEL VS CAPCOM INFINITE": "https://cdn.akamai.steamstatic.com/steam/apps/493840/header.jpg",
  "MONSTER ENERGY SUPERCROSS 3": "https://cdn.akamai.steamstatic.com/steam/apps/1089830/header.jpg",
  "NEED FOR SPEED HEAT": "https://cdn.akamai.steamstatic.com/steam/apps/1222680/header.jpg",
  "NEED FOR SPEED RIVALS": "https://cdn.akamai.steamstatic.com/steam/apps/1262580/header.jpg",
  "OUTLAST": "https://cdn.akamai.steamstatic.com/steam/apps/238320/header.jpg",
  "OUTLAST 1 + 2 + DLC": "https://cdn.akamai.steamstatic.com/steam/apps/414700/header.jpg",
  "RED DEAD REDEMPTION 2": "https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg",
  "RESIDENT EVIL 3": "https://cdn.akamai.steamstatic.com/steam/apps/952060/header.jpg",
  "RESIDENT EVIL 6": "https://cdn.akamai.steamstatic.com/steam/apps/221040/header.jpg",
  "RESIDENT EVIL 7 GOLD": "https://cdn.akamai.steamstatic.com/steam/apps/418370/header.jpg",
  "RESIDENT EVIL REVELATIONS 2": "https://cdn.akamai.steamstatic.com/steam/apps/287290/header.jpg",
  "RIDE 4": "https://cdn.akamai.steamstatic.com/steam/apps/1259980/header.jpg",
  "RIDERS REPUBLIC": "https://cdn.akamai.steamstatic.com/steam/apps/2290180/header.jpg",
  "SAINTS ROW 4": "https://cdn.akamai.steamstatic.com/steam/apps/206420/header.jpg",
  "SHADOW OF THE COLOSSUS": "https://image.api.playstation.com/vulcan/img/rnd/202011/0302/N8f4iL5kQkH5cO64m0QxR8uL.png",
  "SLEEPING DOGS": "https://cdn.akamai.steamstatic.com/steam/apps/307690/header.jpg",
  "SNIPER CONTRACTS": "https://cdn.akamai.steamstatic.com/steam/apps/973580/header.jpg",
  "STAR WARS JEDI FALLEN ORDER": "https://cdn.akamai.steamstatic.com/steam/apps/1172380/header.jpg",
  "THE EVIL WITHIN 2": "https://cdn.akamai.steamstatic.com/steam/apps/601430/header.jpg",
  "THE WITCHER 3": "https://cdn.akamai.steamstatic.com/steam/apps/292030/header.jpg",
  "TONY HAWK\u2019S 1 + 2": "https://cdn.akamai.steamstatic.com/steam/apps/1904710/header.jpg",
  "TOMB RAIDER DEFINITIVE EDITION": "https://cdn.akamai.steamstatic.com/steam/apps/203160/header.jpg",
  "UNRAVEL TWO": "https://cdn.akamai.steamstatic.com/steam/apps/1222730/header.jpg",
  "WOLFENSTEIN THE NEW ORDER": "https://cdn.akamai.steamstatic.com/steam/apps/280500/header.jpg",
  "WORLD WAR Z (VERS\xC3O PS4)": "https://cdn.akamai.steamstatic.com/steam/apps/1522820/header.jpg",
  "XCOM 2": "https://cdn.akamai.steamstatic.com/steam/apps/268500/header.jpg",
  "ZOMBIE ARMY 4": "https://cdn.akamai.steamstatic.com/steam/apps/698060/header.jpg"
};
var games = Object.keys(gameImages);
function registerSeedRoute(app2) {
  app2.get("/api/seed-database-secret-eforte", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Banco de dados n\xE3o dispon\xEDvel! Verifique a vari\xE1vel DATABASE_URL." });
      }
      let insertedCount = 0;
      let updatedCount = 0;
      for (const game of games) {
        const imageUrl = gameImages[game] || "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=400";
        const existing = await db.select().from(digitalProducts).where(eq2(digitalProducts.name, game)).limit(1);
        if (existing.length > 0) {
          await db.update(digitalProducts).set({ imageUrl }).where(eq2(digitalProducts.name, game));
          updatedCount++;
          continue;
        }
        await db.insert(digitalProducts).values({
          name: game,
          description: "Jogo digital. Valor sob consulta/a combinar com o administrador.",
          price: "0.00",
          type: "jogo",
          keyOrCode: "A combinar com o administrador.",
          downloadUrl: "https://wa.me/554384253691",
          imageUrl,
          stock: 999,
          isActive: true
        });
        insertedCount++;
      }
      res.json({
        success: true,
        message: "Seeding conclu\xEDdo com sucesso!",
        insertedCount,
        updatedCount
      });
    } catch (err) {
      console.error("[SeedRoute] failed:", err);
      res.status(500).json({ error: err.message || "Erro desconhecido" });
    }
  });
}

// server/_core/ai.ts
function normalizeText(text2) {
  return text2.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[''"`´\-–—_+=*&%$#@!?,.:;\\\/\(\)\[\]\{\}]/g, " ").replace(/\s+/g, " ").trim();
}
var CATALOG = [
  { name: "AGONY PS4/PS5", price: 9.9 },
  { name: "ASSASSIN'S CREED MIRAGE PS4/PS5", price: 59.9 },
  { name: "ASSASSIN'S CREED ODYSSEY PS4/PS5", price: 44.9 },
  { name: "ASSASSIN'S CREED ORIGINS PS4/PS5", price: 37.9 },
  { name: "ASSASSIN'S CREED SHADOWS PS5", price: 144.9 },
  { name: "ASSASSIN'S CREED SYNDICATE PS4/PS5", price: 59.99 },
  { name: "ASSASSIN'S CREED VALHALLA PS4/PS5", price: 50 },
  { name: "ATOMIC HEART PS4/PS5", price: 69.9 },
  { name: "AVATAR PS4/PS5", price: 74.9 },
  { name: "BATTLEFIELD 1 PS4/PS5", price: 34.9 },
  { name: "BATTLEFIELD 4 PS4/PS5", price: 29.9 },
  { name: "BATTLEFIELD V PS4/PS5", price: 36.9 },
  { name: "BLEACH REBIRTH OF SOULS PS5", price: 100 },
  { name: "CALL OF DUTY GHOSTS PS4/PS5", price: 99.9 },
  { name: "CALL OF DUTY VANGUARD PS4/PS5", price: 89.9 },
  { name: "CALL OF DUTY WW2 PS4/PS5", price: 100 },
  { name: "COD BLACK OPS 6 PS4/PS5", price: 80 },
  { name: "COD BLACK OPS 7 PS4/PS5", price: 120 },
  { name: "COD COLD WAR PS4/PS5", price: 80 },
  { name: "CRASH BANDICOOT TRILOGY PS4/PS5", price: 59.9 },
  { name: "CRASH NITRO KART PS4/PS5", price: 59.9 },
  { name: "DEAD ISLAND 2 PS4/PS5", price: 50 },
  { name: "DEAD SPACE PS5", price: 69.9 },
  { name: "DEMON SLAYER 2 PS4/PS5", price: 144.9 },
  { name: "DETROIT BECOME HUMAN PS4/PS5", price: 59.9 },
  { name: "DEVIL MAY CRY 5 PS5", price: 30 },
  { name: "DEVIL MAY CRY 5 + VERGIL PS4/PS5", price: 16.9 },
  { name: "DEVIL MAY CRY DEFINITIVE EDITION PS4", price: 36.9 },
  { name: "DIABLO 4 PS4/PS5", price: 100 },
  { name: "DIABLO ETERNAL COLLECTION PS4/PS5", price: 64.9 },
  { name: "DOOM DARK AGES PS5", price: 110 },
  { name: "DOOM ETERNAL PS4/PS5", price: 64.9 },
  { name: "DRAGON BALL KAKAROT PS4/PS5", price: 59.9 },
  { name: "DRAGON BALL SPARKING ZERO PS5", price: 174.9 },
  { name: "DYING LIGHT PS4/PS5", price: 20 },
  { name: "DYING LIGHT 2 PS4/PS5", price: 54.9 },
  { name: "DYING LIGHT THE BEAST PS5", price: 159.9 },
  { name: "EXPEDITION 33 PS5", price: 149.9 },
  { name: "FAR CRY 5 PS4/PS5", price: 30 },
  { name: "FAR CRY 6 PS4/PS5", price: 54.9 },
  { name: "FAR CRY NEW DAWN PS4/PS5", price: 24.9 },
  { name: "FINAL FANTASY XVI PS5", price: 119.9 },
  { name: "GHOST RECON WILDLANDS PS4/PS5", price: 34.9 },
  { name: "GOD OF WAR 2018 PS4/PS5", price: 59.9 },
  { name: "GOD OF WAR 3 REMASTER PS4/PS5", price: 36.99 },
  { name: "GTA V PS4/PS5", price: 59.9 },
  { name: "HELLBLADE 2 PS5", price: 70 },
  { name: "HI-FI RUSH PS5", price: 59.9 },
  { name: "HOGWARTS LEGACY PS4/PS5", price: 39.9 },
  { name: "HORIZON FORBIDDEN WEST PS4/PS5", price: 100 },
  { name: "JEDI FALLEN ORDER PS4/PS5", price: 44.99 },
  { name: "JUST CAUSE 4 PS4/PS5", price: 19.9 },
  { name: "MAFIA 3 PS4/PS5", price: 24.9 },
  { name: "MAFIA THE OLD COUNTRY PS5", price: 159.9 },
  { name: "MARTHA IS DEAD PS4/PS5", price: 40 },
  { name: "MORTAL KOMBAT 1 PS5", price: 69.9 },
  { name: "MORTAL KOMBAT 11 PS4/PS5", price: 20 },
  { name: "NARUTO STORM 4 PS4/PS5", price: 59.9 },
  { name: "NBA 2K26 PS4/PS5", price: 65 },
  { name: "PREY PS4/PS5", price: 27.9 },
  { name: "PRINCE OF PERSIA LOST CROWN PS4/PS5", price: 44.9 },
  { name: "REANIMAL PS5", price: 159.9 },
  { name: "RED DEAD REDEMPTION 2 PS4/PS5", price: 64.9 },
  { name: "SHADOW OF THE COLOSSUS PS4/PS5", price: 44.99 },
  { name: "SHADOW OF MORDOR PS4/PS5", price: 17.9 },
  { name: "SNIPER ELITE 4 PS4/PS5", price: 27.9 },
  { name: "SNIPER ELITE RESISTANCE PS4/PS5", price: 109.9 },
  { name: "STAR WARS OUTLAWS PS5", price: 69.9 },
  { name: "TEST DRIVE UNLIMITED SOLAR CROWN PS5", price: 44.9 },
  { name: "THE CREW MOTORFEST PS4/PS5", price: 55 },
  { name: "THE ELDER SCROLLS V SKYRIM PS4/PS5", price: 36.9 },
  { name: "THE LAST OF US PART I PS5", price: 120 },
  { name: "THE LAST OF US PART II PS4", price: 100 },
  { name: "THE LAST OF US REMASTERED PS4/PS5", price: 35.9 },
  { name: "THE ORDER 1886 PS4/PS5", price: 36.9 },
  { name: "TOM CLANCY GHOST RECON BREAKPOINT PS4/PS5", price: 39.9 },
  { name: "TONY HAWK'S PRO SKATER 1+2 PS4/PS5", price: 64.9 },
  { name: "UNCHARTED 4 + LOST LEGACY PS4", price: 69.9 },
  { name: "UNCHARTED LEGACY OF THIEVES PS5", price: 89.9 },
  { name: "WATCH DOGS LEGION PS4/PS5", price: 29.9 },
  { name: "WOLFENSTEIN THE NEW ORDER PS4/PS5", price: 16.9 },
  { name: "WUCHANG FALLEN FEATHERS PS5", price: 149.9 },
  { name: "WWE 2K26 PS5", price: 184.9 }
];
var WA = "https://wa.me/554384253691";
function priceText(price) {
  return price === 0 ? "A definir com ADM" : `R$ ${price.toFixed(2).replace(".", ",")}`;
}
function registerAiRoute(app2) {
  app2.get("/api/ai", async (req, res) => {
    const query = req.query.q ?? "";
    if (!query) return res.status(400).json({ error: "Missing query parameter 'q'" });
    const nq = normalizeText(query);
    if (/pagamento|pix|cartao|boleto|pagar|pago/.test(nq)) {
      return res.json({ answer: "Aceitamos Pix, Cart\xE3o de Cr\xE9dito e Boleto. Todo pagamento \xE9 processado com seguran\xE7a via Mercado Pago." });
    }
    if (/entrega|envio|prazo|frete|como recebo/.test(nq)) {
      return res.json({ answer: "As m\xEDdias digitais (PS4/PS5) s\xE3o enviadas via WhatsApp ou e-mail logo ap\xF3s a aprova\xE7\xE3o do pagamento. Para usados f\xEDsicos o envio \xE9 pelos Correios com rastreio." });
    }
    if (/contato|whatsapp|telefone|suporte|falar com|atendimento|adm/.test(nq)) {
      return res.json({ answer: `Fale com a gente direto no WhatsApp! [Clique aqui para abrir o WhatsApp](${WA})` });
    }
    if (/como comprar|adquirir|vender|virar vendedor/.test(nq)) {
      return res.json({ answer: "Para comprar, navegue pelo cat\xE1logo de M\xEDdia Digital ou Usados e clique em 'Comprar via WhatsApp'. O pagamento \xE9 combinado diretamente com o administrador." });
    }
    const isListQuery = /quais|lista|todos|tem algum|voces tem|vocês tem|disponivel|disponível/.test(nq);
    const stopWords = /* @__PURE__ */ new Set(["tem", "voce", "voces", "o", "de", "com", "jogo", "jogos", "disponivel", "a", "os", "as", "um", "uma", "para", "em", "no", "na", "que", "e", "do", "da", "game", "games", "ps4", "ps5", "quais", "todos", "lista"]);
    const keywords = nq.split(" ").filter((w) => w.length > 2 && !stopWords.has(w));
    const scored = [];
    for (const game of CATALOG) {
      const nn = normalizeText(game.name);
      let score = 0;
      if (nq.includes(nn)) score += 100;
      else if (nn.includes(nq) && nq.length >= 3) score += 80;
      if (keywords.length > 0) {
        const nameWords = nn.split(" ");
        let matches = 0;
        for (const kw of keywords) {
          if (nameWords.some((nw) => nw.includes(kw) || kw.includes(nw))) matches++;
        }
        score += matches / keywords.length * 60;
      }
      if (score >= 15) scored.push({ game, score });
    }
    scored.sort((a, b) => b.score - a.score);
    if (scored.length === 0) {
      return res.json({
        answer: `N\xE3o encontrei esse t\xEDtulo no cat\xE1logo. Tente com outra grafia ou [fale com o ADM no WhatsApp](${WA}) para verificar se conseguimos!`
      });
    }
    if ((scored[0].score >= 80 || scored.length === 1) && !isListQuery) {
      const g = scored[0].game;
      const waLink = `${WA}?text=${encodeURIComponent(`Ol\xE1! Tenho interesse no jogo ${g.name} - ${priceText(g.price)}`)}`;
      return res.json({
        answer: `\u2705 Temos **${g.name}** dispon\xEDvel!

\u{1F4B0} Pre\xE7o: **${priceText(g.price)}**

[\u{1F449} Comprar via WhatsApp](${waLink})`
      });
    }
    const top = scored.slice(0, 8);
    const list = top.map((s) => `\u2022 **${s.game.name}** \u2014 ${priceText(s.game.price)}`).join("\n");
    const suffix = scored.length > 8 ? `

_(e mais ${scored.length - 8} outros...)_` : "";
    return res.json({
      answer: `Encontrei **${scored.length}** jogo(s) correspondente(s):

${list}${suffix}

Quer saber mais sobre algum? [Fale com o ADM no WhatsApp](${WA})`
    });
  });
}

// server/_core/payment.ts
import axios2 from "axios";
init_schema();

// server/_core/context.ts
import { createRemoteJWKSet, jwtVerify as jwtVerify2 } from "jose";
var JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);
var FIREBASE_PROJECT_ID = "enfortec-c9b78";
async function verifyFirebaseToken(token) {
  console.log("[FirebaseAuth] Attempting to verify token...");
  try {
    const { payload } = await jwtVerify2(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID
    });
    console.log("[FirebaseAuth] Token verified successfully, sub:", payload.sub);
    return payload;
  } catch (error) {
    console.error("[FirebaseAuth] Token verification failed:", error);
    return null;
  }
}
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
    console.log("[TRPC Server] OAuth cookie auth succeeded for user:", user?.id);
  } catch (error) {
    const authHeader = opts.req.headers.authorization;
    console.log("[TRPC Server] OAuth auth failed. Authorization Header:", authHeader ? `${authHeader.substring(0, 25)}...` : "none");
    console.log("[TRPC Server] Checking authHeader:", authHeader ? "present" : "missing");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      console.log("[TRPC Server] Firebase token received, length:", token.length);
      const decoded = await verifyFirebaseToken(token);
      console.log("[TRPC Server] Firebase Token decoded payload sub:", decoded?.sub || "none");
      if (decoded && decoded.sub) {
        const uid = decoded.sub;
        const email = decoded.email?.toLowerCase().trim();
        const name = decoded.name || email?.split("@")[0] || "User";
        try {
          user = await getUserByOpenId(uid) || (email ? await getUserByEmail(email) : void 0) || null;
          console.log("[TRPC Server] Database user lookup result:", user ? `found (id: ${user.id}, openId: ${user.openId})` : "not found");
          await upsertUser({
            openId: uid,
            name,
            email,
            loginMethod: "firebase",
            lastSignedIn: /* @__PURE__ */ new Date()
          });
          user = await getUserByOpenId(uid) || (email ? await getUserByEmail(email) : void 0) || null;
        } catch (dbErr) {
          console.error("[TRPC Server] User auth processing error:", dbErr);
        }
        if (!user) {
          user = {
            id: 999999,
            openId: uid,
            name,
            email: email || null,
            loginMethod: "firebase_fallback",
            cpf: null,
            psnId: null,
            forteCoins: 0,
            role: "user",
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date(),
            lastSignedIn: /* @__PURE__ */ new Date(),
            balance: "0.00"
          };
        }
      }
    }
  }
  const ADMIN_EMAILS = [
    "luanmnogueira@gmail.com",
    "enfortec@admin.com",
    "luiz220190@hotmail.com",
    "sandrinhooperfectt@gmail.com"
  ];
  if (user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    user.role = "admin";
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/payment.ts
import { eq as eq3 } from "drizzle-orm";
var PLATINADOR_SUBSCRIPTION_PRICE = 35;
function computeDigitalPrice(p, accountType) {
  const basePrice = parseFloat(p.price || "0");
  const secondaryPrice = p.priceSecondary ? parseFloat(p.priceSecondary) : 0;
  const hasSplit = secondaryPrice > 0;
  if (!hasSplit) {
    return Math.max(0, p.pricePrimary ? parseFloat(p.pricePrimary) : basePrice);
  }
  if (accountType === "secundaria") {
    return Math.max(0, secondaryPrice);
  }
  if (accountType === "primaria" && !p.pricePrimary) {
    throw new Error("Conta prim\xE1ria n\xE3o dispon\xEDvel para este produto.");
  }
  const primaryPrice = p.pricePrimary ? parseFloat(p.pricePrimary) : basePrice;
  return Math.max(0, primaryPrice);
}
function registerPaymentRoute(app2) {
  app2.get("/api/games/search-cover", async (req, res) => {
    try {
      const rawTerm = req.query.term;
      if (!rawTerm) {
        return res.status(400).json({ success: false, error: "Termo de busca \xE9 obrigat\xF3rio." });
      }
      const term = rawTerm.replace(/\b(PS4\/PS5|PS5|PS4|XBOX|PC)\b/gi, "").replace(/\b(MÍDIA|MIDIA|DIGITAL|CONTA|COMPARTILHADA|PRIMÁRIA|SECUNDÁRIA)\b/gi, "").trim();
      const steamUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term || rawTerm)}&l=portuguese&cc=BR`;
      const response = await axios2.get(steamUrl);
      const data = response.data;
      if (data && data.items && data.items.length > 0) {
        const item = data.items[0];
        const appId = item.id;
        const coverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
        return res.json({
          success: true,
          name: item.name,
          imageUrl: coverUrl,
          price: item.price ? item.price.final / 100 : 0
        });
      }
      return res.status(404).json({ success: false, error: "Jogo n\xE3o encontrado no Steam." });
    } catch (error) {
      console.error("[Cover Search] Erro ao buscar capa:", error.message);
      return res.status(500).json({ success: false, error: "Erro interno ao buscar capa do jogo." });
    }
  });
  app2.get("/api/admin/db-stats", async (req, res) => {
    try {
      const stats = await getDatabaseStorageStats();
      if (!stats) {
        return res.status(500).json({ success: false, error: "Falha ao obter m\xE9tricas do banco de dados." });
      }
      return res.json({ success: true, ...stats });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/admin/db-cleanup", async (req, res) => {
    try {
      const result = await runDatabaseCleanup();
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/test-mercadopago", async (req, res) => {
    const hasToken = !!process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const tokenPreview = process.env.MERCADO_PAGO_ACCESS_TOKEN ? `${process.env.MERCADO_PAGO_ACCESS_TOKEN.substring(0, 10)}...` : "N\xC3O CONFIGURADO";
    return res.json({
      configured: hasToken,
      tokenPreview,
      hasWebhookSecret: !!process.env.MERCADO_PAGO_WEBHOOK_SECRET,
      message: hasToken ? "Mercado Pago configurado com sucesso." : "MERCADO_PAGO_ACCESS_TOKEN ausente nas vari\xE1veis de ambiente."
    });
  });
  const handleCheckout = async (req, res) => {
    try {
      const { name, quantity = 1, redirectUrl, productType = "store", productId, sellerId, customer, couponCode, accountType, consoleType } = req.body;
      const customerPhone = customer?.phone_number || "";
      if (!name) {
        return res.status(400).json({ success: false, error: "Nome do produto \xE9 obrigat\xF3rio." });
      }
      let buyerId = 0;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const decoded = await verifyFirebaseToken(token);
        if (decoded && decoded.sub) {
          const user = await getUserByOpenId(decoded.sub);
          if (user) {
            buyerId = user.id;
          }
        }
      }
      let mysqlSellerId = null;
      if (sellerId) {
        const sellerUser = await getUserByOpenId(sellerId);
        if (sellerUser) {
          mysqlSellerId = sellerUser.id;
        }
      }
      const database = await getDb();
      if (!database) {
        return res.status(500).json({ success: false, error: "Banco de dados indispon\xEDvel." });
      }
      let verifiedPrice = null;
      let realProductName = null;
      let verifiedIsPreVenda = false;
      if (productType === "platinador") {
        verifiedPrice = PLATINADOR_SUBSCRIPTION_PRICE;
      } else if (productId) {
        const pid = parseInt(String(productId));
        if (!isNaN(pid)) {
          if (productType === "store") {
            const rows = await database.select().from(products).where(eq3(products.id, pid)).limit(1);
            if (rows[0]) {
              verifiedPrice = parseFloat(rows[0].price);
              realProductName = rows[0].name;
            }
          } else if (productType === "used") {
            const rows = await database.select().from(usedProducts).where(eq3(usedProducts.id, pid)).limit(1);
            if (rows[0]) {
              verifiedPrice = parseFloat(rows[0].price);
              realProductName = rows[0].name;
            }
          } else if (productType === "digital") {
            const rows = await database.select().from(digitalProducts).where(eq3(digitalProducts.id, pid)).limit(1);
            if (rows[0]) {
              verifiedPrice = computeDigitalPrice(rows[0], accountType);
              realProductName = rows[0].name;
              verifiedIsPreVenda = !!rows[0].isPreVenda;
            }
          }
        }
      }
      if (verifiedPrice === null) {
        console.warn(`[Checkout] Pre\xE7o n\xE3o p\xF4de ser verificado \u2014 productType=${productType}, productId=${productId}`);
        return res.status(400).json({ success: false, error: "N\xE3o foi poss\xEDvel confirmar o pre\xE7o deste produto. Atualize a p\xE1gina e tente novamente." });
      }
      let productNameStr = realProductName || name || "Produto";
      let resolvedConsoleType = consoleType;
      if (!resolvedConsoleType && name && typeof name === "string") {
        const upperName = name.toUpperCase();
        if (upperName.includes("(PS5)") || upperName.includes("- PS5") || upperName.includes(" PS5")) {
          resolvedConsoleType = "PS5";
        } else if (upperName.includes("(PS4)") || upperName.includes("- PS4") || upperName.includes(" PS4")) {
          resolvedConsoleType = "PS4";
        }
      }
      if (resolvedConsoleType && (resolvedConsoleType === "PS4" || resolvedConsoleType === "PS5")) {
        if (!productNameStr.toUpperCase().includes(`(${resolvedConsoleType})`) && !productNameStr.toUpperCase().includes(`- ${resolvedConsoleType}`)) {
          productNameStr += ` (${resolvedConsoleType})`;
        }
      }
      if (accountType === "secundaria") {
        if (!productNameStr.toLowerCase().includes("secund\xE1ria") && !productNameStr.toLowerCase().includes("secundaria")) {
          productNameStr += " (Conta Secund\xE1ria)";
        }
      } else if (accountType === "primaria") {
        if (!productNameStr.toLowerCase().includes("prim\xE1ria") && !productNameStr.toLowerCase().includes("primaria")) {
          productNameStr += " (Conta Prim\xE1ria)";
        }
      }
      const platformSettingsForCoins = await getPlatformSettings();
      const MAX_COINS_PER_PURCHASE = verifiedIsPreVenda ? platformSettingsForCoins?.maxCoinsPreVenda ?? 50 : platformSettingsForCoins?.maxCoinsPerPurchase ?? 10;
      let verifiedCoinsToUse = 0;
      if (buyerId > 0 && Number(req.body.coinsToUse) > 0) {
        const buyerRows = await database.select().from(users).where(eq3(users.id, buyerId)).limit(1);
        const realBalance = buyerRows[0]?.forteCoins || 0;
        verifiedCoinsToUse = Math.min(Math.floor(Number(req.body.coinsToUse)) || 0, realBalance, MAX_COINS_PER_PURCHASE);
      }
      let couponDiscount = 0;
      let validCouponCode = null;
      if (couponCode) {
        const coupon = await getCouponByCode(couponCode.toUpperCase().trim());
        if (coupon) {
          let isExpired = false;
          if (coupon.expiresAt) {
            const expiryDate = new Date(coupon.expiresAt);
            if (expiryDate.getUTCHours() === 0 && expiryDate.getUTCMinutes() === 0 && expiryDate.getUTCSeconds() === 0) {
              expiryDate.setUTCHours(23, 59, 59, 999);
            }
            isExpired = expiryDate.getTime() < Date.now();
          }
          const isExceeded = coupon.maxUses !== null && (coupon.usedCount || 0) >= coupon.maxUses;
          if (!isExpired && !isExceeded) {
            couponDiscount = verifiedPrice * (parseFloat(coupon.discountPercentage) / 100);
            validCouponCode = coupon.code;
          } else {
            console.warn(`[Checkout] Cupom ${couponCode} est\xE1 expirado ou esgotado.`);
          }
        } else {
          console.warn(`[Checkout] Cupom ${couponCode} n\xE3o foi encontrado ou est\xE1 inativo.`);
        }
      }
      const coinsDiscount = verifiedCoinsToUse * 0.1;
      const originalPrice = verifiedPrice;
      const finalPrice = Math.max(0, originalPrice - couponDiscount - coinsDiscount);
      if (finalPrice <= 0) {
        let commissionPct = "6.00";
        try {
          const settings = await getPlatformSettings();
          if (settings?.commissionPercentage) {
            commissionPct = settings.commissionPercentage;
          }
        } catch (settingsErr) {
          console.warn("[Checkout] Erro ao buscar comiss\xE3o das configura\xE7\xF5es:", settingsErr);
        }
        const insertValues = {
          buyerId,
          sellerId: mysqlSellerId,
          productType,
          quantity: Number(quantity) || 1,
          totalPrice: "0.00",
          commissionPercentage: commissionPct,
          platformCommission: "0.00",
          sellerAmount: "0.00",
          status: "pago",
          paymentId: `ForteCoins-100%-${Date.now()}`,
          coinsUsed: verifiedCoinsToUse,
          productName: productNameStr,
          accountType: accountType || null,
          firebaseProductId: productId ? String(productId) : null
        };
        if (productType === "store" && productId) {
          insertValues.productId = parseInt(productId) || null;
        } else if (productType === "used" && productId) {
          insertValues.usedProductId = parseInt(productId) || null;
        } else if (productType === "digital" && productId) {
          insertValues.digitalProductId = parseInt(productId) || null;
        }
        if (customerPhone) {
          insertValues.buyerPhone = customerPhone;
        }
        await database.insert(orders).values(insertValues);
        if (buyerId > 0) {
          const userResult = await database.select().from(users).where(eq3(users.id, buyerId)).limit(1);
          if (userResult.length > 0) {
            const usr = userResult[0];
            const netCoins = Math.max(0, (usr.forteCoins || 0) - verifiedCoinsToUse + 7);
            await database.update(users).set({ forteCoins: netCoins }).where(eq3(users.id, buyerId));
            console.log(`[Checkout 100%] updated user ${buyerId} coins: from ${usr.forteCoins} to ${netCoins}`);
          }
        }
        if (validCouponCode) {
          const couponResult = await database.select().from(coupons).where(eq3(coupons.code, validCouponCode)).limit(1);
          if (couponResult.length > 0) {
            const cp = couponResult[0];
            await database.update(coupons).set({ usedCount: (cp.usedCount || 0) + 1 }).where(eq3(coupons.id, cp.id));
          }
        }
        if (productType === "digital" && insertValues.digitalProductId) {
          const prod = await database.select().from(digitalProducts).where(eq3(digitalProducts.id, insertValues.digitalProductId)).limit(1);
          if (prod.length > 0) {
            const newStock = Math.max(0, (prod[0].stock || 1) - 1);
            await database.update(digitalProducts).set({ stock: newStock, isActive: newStock > 0 }).where(eq3(digitalProducts.id, insertValues.digitalProductId));
          }
        } else if (productType === "store" && insertValues.productId) {
          const prod = await database.select().from(products).where(eq3(products.id, insertValues.productId)).limit(1);
          if (prod.length > 0) {
            const newStock = Math.max(0, (prod[0].stock || 1) - 1);
            await database.update(products).set({ stock: newStock, isActive: newStock > 0 }).where(eq3(products.id, insertValues.productId));
          }
        }
        console.log("[Checkout] Compra 100% paga com moedas/cupom registrada com sucesso.");
        return res.json({ success: true, url: null, paidWithCoins: true });
      }
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!accessToken) {
        console.error("[Mercado Pago] MERCADO_PAGO_ACCESS_TOKEN n\xE3o configurado no ambiente.");
        return res.status(500).json({
          success: false,
          error: "Credenciais do Mercado Pago n\xE3o configuradas no servidor. Adicione o MERCADO_PAGO_ACCESS_TOKEN."
        });
      }
      const host = req.get("host") || "";
      const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
      const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
      const webhookUrl = `${protocol}://${host}/api/mercadopago/webhook${webhookSecret ? `?secret=${encodeURIComponent(webhookSecret)}` : ""}`;
      const returnUrl = redirectUrl || `${protocol}://${host}/minhas-compras`;
      const preferencePayload = {
        items: [
          {
            id: String(productId || "item"),
            title: productNameStr.substring(0, 250),
            quantity: Number(quantity) || 1,
            unit_price: Number(finalPrice.toFixed(2)),
            currency_id: "BRL"
          }
        ],
        back_urls: {
          success: returnUrl,
          pending: returnUrl,
          failure: returnUrl
        },
        auto_return: "approved",
        notification_url: webhookUrl,
        metadata: {
          buyer_id: buyerId,
          seller_id: mysqlSellerId,
          product_type: productType,
          product_id: productId ? String(productId) : null,
          coins_used: verifiedCoinsToUse,
          coupon_code: validCouponCode || null,
          product_name: productNameStr,
          buyer_phone: customerPhone || null,
          account_type: accountType || null,
          quantity: Number(quantity) || 1
        },
        statement_descriptor: "ENFORTEC GAMES"
      };
      if (customer && typeof customer === "object") {
        preferencePayload.payer = {
          name: customer.name || void 0,
          email: customer.email || void 0,
          phone: customer.phone_number ? { number: customer.phone_number.replace(/\D/g, "") } : void 0
        };
      }
      console.log("[Mercado Pago] Criando prefer\xEAncia:", JSON.stringify(preferencePayload));
      const mpResponse = await axios2.post("https://api.mercadopago.com/checkout/preferences", preferencePayload, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        timeout: 15e3
      });
      const initPoint = mpResponse.data.init_point || mpResponse.data.sandbox_init_point;
      console.log("[Mercado Pago] Prefer\xEAncia gerada com sucesso:", initPoint);
      return res.json({ success: true, url: initPoint, preferenceId: mpResponse.data.id });
    } catch (error) {
      console.error("[Mercado Pago Checkout] Erro:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || error.message || "Erro desconhecido ao gerar checkout";
      return res.status(500).json({ success: false, error: errorMsg });
    }
  };
  app2.post("/api/mercadopago/checkout", handleCheckout);
  app2.post("/api/infinitepay/checkout", handleCheckout);
  const handleWebhook = async (req, res) => {
    try {
      const expectedSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
      if (expectedSecret && req.query.secret !== expectedSecret) {
        console.warn("[Mercado Pago Webhook] Segredo de query incorreto ou ausente fornecido \u2014 ignorando.");
        return res.status(401).json({ received: false, error: "N\xE3o autorizado." });
      }
      const event = req.body || {};
      console.log("[Mercado Pago Webhook] Evento recebido:", JSON.stringify({ body: req.body, query: req.query }));
      let paymentId = event?.data?.id || event?.id || req.query?.["data.id"] || req.query?.id || null;
      const topic = event?.type || event?.topic || req.query?.type || req.query?.topic;
      if (!paymentId || topic && topic !== "payment" && topic !== "merchant_order" && event?.action !== "payment.created" && event?.action !== "payment.updated") {
        return res.status(200).json({ received: true, ignored: true });
      }
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!accessToken) {
        console.warn("[Mercado Pago Webhook] MERCADO_PAGO_ACCESS_TOKEN n\xE3o configurado no servidor.");
        return res.status(200).json({ received: true, error: "Token n\xE3o configurado" });
      }
      let paymentData = null;
      try {
        const resp = await axios2.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { "Authorization": `Bearer ${accessToken}` },
          timeout: 15e3
        });
        paymentData = resp.data;
      } catch (fetchErr) {
        console.error(`[Mercado Pago Webhook] Erro ao consultar pagamento #${paymentId}:`, fetchErr.response?.data || fetchErr.message);
        return res.status(200).json({ received: true, error: "Falha ao consultar pagamento na API" });
      }
      if (!paymentData) {
        return res.status(200).json({ received: true });
      }
      console.log(`[Mercado Pago Webhook] Pagamento #${paymentId} Status: ${paymentData.status} (${paymentData.status_detail})`);
      if (paymentData.status !== "approved") {
        console.log(`[Mercado Pago Webhook] Pagamento #${paymentId} com status "${paymentData.status}" \u2014 n\xE3o aprovado ainda.`);
        return res.status(200).json({ received: true, status: paymentData.status });
      }
      const totalPrice = paymentData.transaction_amount ? Number(paymentData.transaction_amount).toFixed(2) : "0.00";
      const metadata = paymentData.metadata || {};
      const buyerId = Number(metadata.buyer_id) || 0;
      const sellerId = metadata.seller_id ? Number(metadata.seller_id) : null;
      const productType = metadata.product_type || "store";
      const productIdString = metadata.product_id ? String(metadata.product_id) : null;
      const coinsUsedValue = Number(metadata.coins_used) || 0;
      const couponCodeValue = metadata.coupon_code || null;
      const productName = metadata.product_name || paymentData.description || "Produto Enfortec Games";
      const phone = metadata.buyer_phone || null;
      const accountType = metadata.account_type || null;
      const quantity = Number(metadata.quantity) || 1;
      const database = await getDb();
      if (!database) {
        console.warn("[Mercado Pago Webhook] Banco de dados indispon\xEDvel.");
        return res.status(200).json({ received: true, error: "Database offline" });
      }
      const existingOrder = await database.select().from(orders).where(eq3(orders.paymentId, String(paymentId))).limit(1);
      if (existingOrder.length > 0) {
        console.log(`[Mercado Pago Webhook] Pagamento #${paymentId} j\xE1 processado (pedido #${existingOrder[0].id}) \u2014 reenvio ignorado.`);
        return res.status(200).json({ received: true, duplicate: true });
      }
      if (productType === "platinador") {
        const existingSub = await database.select().from(platinadorSubscriptions).where(eq3(platinadorSubscriptions.paymentId, String(paymentId))).limit(1);
        if (existingSub.length > 0) {
          console.log(`[Mercado Pago Webhook] Assinatura do Platinador pra pagamento #${paymentId} j\xE1 processada.`);
          return res.status(200).json({ received: true, duplicate: true });
        }
        if (buyerId > 0) {
          const now = /* @__PURE__ */ new Date();
          const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
          const existing = await database.select().from(platinadorSubscriptions).where(eq3(platinadorSubscriptions.userId, buyerId)).limit(1);
          if (existing.length > 0) {
            await database.update(platinadorSubscriptions).set({
              status: "ativa",
              startsAt: now,
              expiresAt,
              paymentId: String(paymentId)
            }).where(eq3(platinadorSubscriptions.id, existing[0].id));
          } else {
            await database.insert(platinadorSubscriptions).values({
              userId: buyerId,
              status: "ativa",
              planName: "Clube Platinador VIP",
              price: totalPrice,
              startsAt: now,
              expiresAt,
              paymentId: String(paymentId)
            });
          }
          console.log(`[Mercado Pago Webhook] Assinatura Platinador ativada para usu\xE1rio #${buyerId} at\xE9 ${expiresAt.toISOString()}`);
        }
      } else {
        let commissionPct = "6.00";
        try {
          const settings = await getPlatformSettings();
          if (settings?.commissionPercentage) {
            commissionPct = settings.commissionPercentage;
          }
        } catch (settingsErr) {
          console.warn("[Mercado Pago Webhook] Erro ao buscar comiss\xE3o:", settingsErr);
        }
        const total = parseFloat(totalPrice);
        const pct = parseFloat(commissionPct) / 100;
        const platformCommission = (total * pct).toFixed(2);
        const sellerAmount = (total * (1 - pct)).toFixed(2);
        const insertValues = {
          buyerId,
          sellerId,
          productType,
          quantity,
          totalPrice,
          commissionPercentage: commissionPct,
          platformCommission,
          sellerAmount,
          status: "pago",
          paymentId: String(paymentId),
          coinsUsed: coinsUsedValue,
          productName,
          accountType: accountType || null,
          firebaseProductId: productIdString || null
        };
        if (productType === "store" && productIdString) {
          insertValues.productId = parseInt(productIdString) || null;
        } else if (productType === "used" && productIdString) {
          insertValues.usedProductId = parseInt(productIdString) || null;
        } else if (productType === "digital" && productIdString) {
          insertValues.digitalProductId = parseInt(productIdString) || null;
        }
        if (phone) {
          insertValues.buyerPhone = phone;
        }
        await database.insert(orders).values(insertValues);
        if (buyerId > 0) {
          const userResult = await database.select().from(users).where(eq3(users.id, buyerId)).limit(1);
          if (userResult.length > 0) {
            const usr = userResult[0];
            const netCoins = Math.max(0, (usr.forteCoins || 0) - coinsUsedValue + 7);
            await database.update(users).set({ forteCoins: netCoins }).where(eq3(users.id, buyerId));
            console.log(`[Mercado Pago Webhook] ForteCoins do usu\xE1rio #${buyerId} atualizadas: de ${usr.forteCoins} para ${netCoins}`);
          }
        }
        if (couponCodeValue) {
          const couponResult = await database.select().from(coupons).where(eq3(coupons.code, couponCodeValue)).limit(1);
          if (couponResult.length > 0) {
            const cp = couponResult[0];
            await database.update(coupons).set({ usedCount: (cp.usedCount || 0) + 1 }).where(eq3(coupons.id, cp.id));
          }
        }
        if (productType === "digital" && insertValues.digitalProductId) {
          const prod = await database.select().from(digitalProducts).where(eq3(digitalProducts.id, insertValues.digitalProductId)).limit(1);
          if (prod.length > 0) {
            const newStock = Math.max(0, (prod[0].stock || 1) - 1);
            await database.update(digitalProducts).set({ stock: newStock, isActive: newStock > 0 }).where(eq3(digitalProducts.id, insertValues.digitalProductId));
          }
        } else if (productType === "store" && insertValues.productId) {
          const prod = await database.select().from(products).where(eq3(products.id, insertValues.productId)).limit(1);
          if (prod.length > 0) {
            const newStock = Math.max(0, (prod[0].stock || 1) - 1);
            await database.update(products).set({ stock: newStock, isActive: newStock > 0 }).where(eq3(products.id, insertValues.productId));
          }
        }
        console.log(`[Mercado Pago Webhook] Pedido registrado no banco com sucesso (Pagamento #${paymentId}).`);
      }
      const adminPhone = "554384253691";
      const adminMsg = encodeURIComponent(
        `\u2705 Novo pagamento confirmado via Mercado Pago!

Produto: ${productName}
Valor: R$ ${parseFloat(totalPrice).toFixed(2).replace(".", ",")}
ID: ${paymentId || "N/A"}`
      );
      console.log(`[Mercado Pago Webhook] Link admin: https://wa.me/${adminPhone}?text=${adminMsg}`);
      return res.status(200).json({ received: true, success: true });
    } catch (error) {
      console.error("[Mercado Pago Webhook] Erro ao processar evento:", error.message);
      return res.status(200).json({ received: true, error: error.message });
    }
  };
  app2.all("/api/mercadopago/webhook", handleWebhook);
  app2.all("/api/mercadopago/ipn", handleWebhook);
  app2.all("/api/infinitepay/webhook", handleWebhook);
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";
init_schema();
import { eq as eq4, desc as desc2, sql as sql2 } from "drizzle-orm";
import { TRPCError as TRPCError3 } from "@trpc/server";
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    // O painel admin mostrava "Usuários Online" a partir da lista de usuários do Firestore,
    // que nunca recebe o campo lastSignedIn (só é atualizado no Postgres a cada requisição
    // autenticada) — o contador dava sempre 0 e só aparecia "1" por causa de um floor
    // artificial no front. Essa rota traz os usuários reais do Postgres, com a atividade
    // de verdade.
    adminListUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores" });
      const database = await getDb();
      if (!database) return [];
      return database.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        lastSignedIn: users.lastSignedIn,
        createdAt: users.createdAt
      }).from(users).orderBy(desc2(users.lastSignedIn));
    }),
    adminGetDatabaseStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores" });
      const stats = await getDatabaseStorageStats();
      return stats;
    }),
    adminRunDatabaseCleanup: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores" });
      const result = await runDatabaseCleanup();
      return result;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    }),
    updateProfile: protectedProcedure.input(z2.object({
      cpf: z2.string().min(11),
      name: z2.string().optional(),
      forteCoins: z2.number().optional()
    })).mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel." });
      const updateData = {};
      if (input.cpf) {
        const cleanCpf = input.cpf.replace(/\D/g, "");
        try {
          const existingUserWithCpf = await database.select().from(users).where(eq4(users.cpf, cleanCpf)).limit(1);
          if (ctx.user.role !== "admin" && existingUserWithCpf.length > 0 && existingUserWithCpf[0].id !== ctx.user.id && existingUserWithCpf[0].openId !== ctx.user.openId) {
            throw new TRPCError3({
              code: "BAD_REQUEST",
              message: "Este CPF j\xE1 est\xE1 vinculado a outra conta. N\xE3o \xE9 permitido o uso de um mesmo CPF em m\xFAltiplas contas."
            });
          }
        } catch (err) {
          if (err instanceof TRPCError3) throw err;
          console.warn("[updateProfile] Warning checking duplicate CPF in database:", err.message);
        }
        updateData.cpf = cleanCpf;
      }
      if (input.name) updateData.name = input.name;
      if (input.forteCoins !== void 0) updateData.forteCoins = input.forteCoins;
      try {
        if (ctx.user.openId) {
          await upsertUser({
            openId: ctx.user.openId,
            name: ctx.user.name || input.name || "User",
            email: ctx.user.email,
            ...updateData
          });
        } else if (ctx.user.id && ctx.user.id !== 999999) {
          await database.update(users).set(updateData).where(eq4(users.id, ctx.user.id));
        } else if (ctx.user.email) {
          await database.update(users).set(updateData).where(sql2`LOWER(${users.email}) = LOWER(${ctx.user.email.trim()})`);
        }
      } catch (dbErr) {
        console.error("[updateProfile] Error updating user profile in database:", dbErr);
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao salvar perfil no banco de dados. Tente novamente."
        });
      }
      return { success: true };
    }),
    adminUpdateRole: protectedProcedure.input(z2.object({
      openId: z2.string(),
      role: z2.enum(["user", "admin", "vendedor", "collaborator"])
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores podem alterar permiss\xF5es." });
      const database = await getDb();
      if (!database) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel." });
      const targetUser = await getUserByOpenId(input.openId);
      if (!targetUser) throw new TRPCError3({ code: "NOT_FOUND", message: "Usu\xE1rio n\xE3o encontrado no banco de dados." });
      await database.update(users).set({ role: input.role }).where(eq4(users.id, targetUser.id));
      return { success: true };
    }),
    adminCreditCoins: protectedProcedure.input(z2.object({
      openId: z2.string(),
      amount: z2.number()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores podem creditar ForteCoins." });
      const database = await getDb();
      if (!database) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel." });
      const targetUser = await getUserByOpenId(input.openId);
      if (!targetUser) throw new TRPCError3({ code: "NOT_FOUND", message: "Usu\xE1rio n\xE3o encontrado no banco de dados." });
      const newBalance = Math.max(0, (targetUser.forteCoins || 0) + input.amount);
      await database.update(users).set({ forteCoins: newBalance }).where(eq4(users.id, targetUser.id));
      return { success: true, newBalance };
    }),
    redeemCoins: protectedProcedure.input(z2.object({
      amount: z2.number().positive()
    })).mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel." });
      if ((ctx.user.forteCoins || 0) < input.amount) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Saldo de ForteCoins insuficiente." });
      }
      const newBalance = ctx.user.forteCoins - input.amount;
      await database.update(users).set({ forteCoins: newBalance }).where(eq4(users.id, ctx.user.id));
      return { success: true, newBalance };
    })
  }),
  // Products Router - for store's own physical products
  products: router({
    list: publicProcedure.query(() => getActiveProducts()),
    getById: publicProcedure.input(z2.number()).query(({ input }) => getProductById(input)),
    adminList: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "collaborator") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      return database.select().from(products).orderBy(desc2(products.createdAt));
    }),
    create: protectedProcedure.input(z2.object({
      name: z2.string().min(3),
      description: z2.string().optional(),
      price: z2.number().positive(),
      category: z2.string().min(1),
      stock: z2.number().min(0).optional(),
      images: z2.array(z2.string()).optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "collaborator") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      return database.insert(products).values({
        name: input.name,
        description: input.description,
        price: input.price.toString(),
        category: input.category,
        stock: input.stock ?? 0,
        images: input.images || []
      });
    }),
    update: protectedProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().min(3),
      description: z2.string().optional(),
      price: z2.number().positive(),
      category: z2.string().min(1),
      stock: z2.number().min(0).optional(),
      images: z2.array(z2.string()).optional(),
      isActive: z2.boolean().optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "collaborator") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      const updateValues = {
        name: input.name,
        description: input.description,
        price: input.price.toString(),
        category: input.category
      };
      if (input.stock !== void 0) updateValues.stock = input.stock;
      if (input.images !== void 0) updateValues.images = input.images;
      if (input.isActive !== void 0) updateValues.isActive = input.isActive;
      return database.update(products).set(updateValues).where(eq4(products.id, input.id));
    }),
    delete: protectedProcedure.input(z2.number()).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "collaborator") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      return database.delete(products).where(eq4(products.id, input));
    })
  }),
  // Sellers Router
  sellers: router({
    list: publicProcedure.query(() => getActiveSellers()),
    getByUserId: protectedProcedure.query(async ({ ctx }) => {
      const seller = await getSellerByUserId(ctx.user.id);
      return seller || null;
    }),
    create: protectedProcedure.input(z2.object({
      storeName: z2.string().min(3),
      description: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        const result = await database.insert(sellers).values({
          userId: ctx.user.id,
          storeName: input.storeName,
          description: input.description
        });
        return result;
      } catch (error) {
        console.error("[TRPC Sellers] Create seller database error, falling back to mock success:", error);
        return {
          insertId: 999999,
          affectedRows: 1,
          storeName: input.storeName
        };
      }
    })
  }),
  // Used Products Router
  usedProducts: router({
    list: publicProcedure.query(() => getApprovedUsedProducts()),
    getByUserId: protectedProcedure.query(({ ctx }) => getUsedProductsForAccount(ctx.user.id, ctx.user.role === "admin")),
    adminList: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      return getAllUsedProductsWithSeller();
    }),
    adminToggleBoost: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      const [product] = await database.select().from(usedProducts).where(eq4(usedProducts.id, input.id)).limit(1);
      if (!product) throw new TRPCError3({ code: "NOT_FOUND", message: "An\xFAncio n\xE3o encontrado" });
      const isCurrentlyBoosted = Boolean(product.boostedUntil && new Date(product.boostedUntil).getTime() > Date.now());
      const boostedUntil = isCurrentlyBoosted ? null : (() => {
        const d = /* @__PURE__ */ new Date();
        d.setDate(d.getDate() + 3);
        return d;
      })();
      await database.update(usedProducts).set({ boostedUntil }).where(eq4(usedProducts.id, input.id));
      return { success: true, boosted: !isCurrentlyBoosted };
    }),
    create: protectedProcedure.input(z2.object({
      name: z2.string().min(3),
      description: z2.string(),
      category: z2.string().optional(),
      price: z2.number().positive(),
      condition: z2.enum(["novo", "como_novo", "bom", "aceitavel"]),
      images: z2.array(z2.string()).optional(),
      cep: z2.string().optional(),
      estado: z2.string().optional(),
      cidade: z2.string().optional(),
      bairro: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      let seller = await getSellerByUserId(ctx.user.id);
      if (!seller) {
        const user = await getUserById(ctx.user.id);
        const storeName = user?.name || "Vendedor " + ctx.user.id;
        await database.insert(sellers).values({
          userId: ctx.user.id,
          storeName
        });
        seller = await getSellerByUserId(ctx.user.id);
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
        status: "aprovado"
      });
      return result;
    }),
    boost: protectedProcedure.input(z2.object({
      id: z2.number()
    })).mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      const productResult = await database.select().from(usedProducts).where(eq4(usedProducts.id, input.id)).limit(1);
      const product = productResult[0];
      if (!product) throw new TRPCError3({ code: "NOT_FOUND", message: "An\xFAncio n\xE3o encontrado" });
      if (ctx.user.role !== "admin") {
        const seller = await getSellerByUserId(ctx.user.id);
        if (!seller) throw new TRPCError3({ code: "FORBIDDEN", message: "User is not a seller" });
        if (product.sellerId !== seller.id) throw new TRPCError3({ code: "FORBIDDEN", message: "Este an\xFAncio n\xE3o pertence a voc\xEA" });
      }
      const BOOST_COST = 10;
      if ((ctx.user.forteCoins || 0) < BOOST_COST) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "ForteCoins insuficientes (necess\xE1rio 10 FC)" });
      }
      const boostedUntilDate = /* @__PURE__ */ new Date();
      boostedUntilDate.setDate(boostedUntilDate.getDate() + 3);
      await database.update(users).set({ forteCoins: ctx.user.forteCoins - BOOST_COST }).where(eq4(users.id, ctx.user.id));
      const result = await database.update(usedProducts).set({ boostedUntil: boostedUntilDate }).where(eq4(usedProducts.id, input.id));
      return result;
    }),
    delete: protectedProcedure.input(z2.object({
      id: z2.number()
    })).mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      const [product] = await database.select().from(usedProducts).where(eq4(usedProducts.id, input.id)).limit(1);
      if (!product) throw new Error("An\xFAncio n\xE3o encontrado");
      const seller = await getSellerByUserId(ctx.user.id);
      const adminEmails = ["luanmnogueira@gmail.com", "enfortec@admin.com", "luiz220190@hotmail.com", "sandrinhooperfectt@gmail.com"];
      const isAdmin = ctx.user.role === "admin" || ctx.user.email && adminEmails.includes(ctx.user.email.toLowerCase());
      const isOwner = seller && product.sellerId === seller.id;
      if (!isAdmin && !isOwner) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Sem permiss\xE3o para deletar este an\xFAncio" });
      }
      await database.delete(usedProducts).where(eq4(usedProducts.id, input.id));
      return { success: true };
    }),
    moveToDigital: protectedProcedure.input(z2.object({ usedProductId: z2.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      const usedRows = await database.select().from(usedProducts).where(eq4(usedProducts.id, input.usedProductId)).limit(1);
      if (!usedRows[0]) throw new TRPCError3({ code: "NOT_FOUND", message: "An\xFAncio n\xE3o encontrado" });
      const used = usedRows[0];
      const image = used.images && used.images.length > 0 ? used.images[0] : null;
      await database.insert(digitalProducts).values({
        sellerId: used.sellerId,
        name: used.name,
        description: used.description || "",
        price: used.price,
        pricePrimary: used.price,
        type: "jogo",
        platform: "PS4/PS5",
        imageUrl: image,
        isActive: true
      });
      await database.delete(usedProducts).where(eq4(usedProducts.id, input.usedProductId));
      return { success: true };
    })
  }),
  // Digital Products Router
  digitalProducts: router({
    list: publicProcedure.query(() => getActiveDigitalProducts()),
    getByUserId: protectedProcedure.query(({ ctx }) => getDigitalProductsForAccount(ctx.user.id, ctx.user.role === "admin")),
    create: protectedProcedure.input(z2.object({
      name: z2.string().min(3),
      description: z2.string(),
      price: z2.number().positive(),
      pricePrimary: z2.number().positive().optional(),
      priceSecondary: z2.number().positive().optional(),
      type: z2.enum(["jogo", "gift_card", "licenca", "assinatura", "outro"]),
      keyOrCode: z2.string().optional(),
      downloadUrl: z2.string().optional(),
      platform: z2.string().optional(),
      imageUrl: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      let seller = await getSellerByUserId(ctx.user.id);
      if (!seller) {
        const user = await getUserById(ctx.user.id);
        const storeName = user?.name || "Vendedor " + ctx.user.id;
        await database.insert(sellers).values({
          userId: ctx.user.id,
          storeName
        });
        seller = await getSellerByUserId(ctx.user.id);
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
        imageUrl: input.imageUrl || null,
        // Cadastro de conta pela comunidade sempre entra pendente: só fica visível na loja
        // pública depois que um gestor aprova na aba "Aprovar Contas" do painel admin.
        status: "pendente"
      });
      return result;
    }),
    adminSetStatus: protectedProcedure.input(z2.object({
      id: z2.number(),
      status: z2.enum(["aprovado", "rejeitado"])
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      await database.update(digitalProducts).set({ status: input.status }).where(eq4(digitalProducts.id, input.id));
      return { success: true };
    }),
    adminList: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      return getAllDigitalProductsWithSeller();
    }),
    adminCreate: protectedProcedure.input(z2.object({
      name: z2.string().min(3),
      description: z2.string().optional(),
      price: z2.number().positive(),
      pricePrimary: z2.number().nullable().optional(),
      priceSecondary: z2.number().nullable().optional(),
      type: z2.enum(["jogo", "gift_card", "licenca", "assinatura", "outro"]),
      imageUrl: z2.string().optional(),
      coverFit: z2.string().optional(),
      platform: z2.string().optional(),
      category: z2.string().optional(),
      stock: z2.number().min(0).optional(),
      isActive: z2.boolean().optional(),
      isPreVenda: z2.boolean().optional(),
      showInEconomia: z2.boolean().optional(),
      economiaLicenseType: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
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
        stock: input.stock !== void 0 ? input.stock : 1,
        isActive: input.isActive !== void 0 ? input.isActive : true,
        isPreVenda: input.isPreVenda,
        showInEconomia: input.showInEconomia,
        economiaLicenseType: input.economiaLicenseType,
        status: "aprovado"
      });
    }),
    adminUpdate: protectedProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().min(3),
      description: z2.string().optional(),
      price: z2.number().positive(),
      pricePrimary: z2.number().nullable().optional(),
      priceSecondary: z2.number().nullable().optional(),
      type: z2.enum(["jogo", "gift_card", "licenca", "assinatura", "outro"]),
      imageUrl: z2.string().optional(),
      coverFit: z2.string().optional(),
      platform: z2.string().optional(),
      category: z2.string().optional(),
      stock: z2.number().min(0).optional(),
      isActive: z2.boolean().optional(),
      isPreVenda: z2.boolean().optional(),
      showInEconomia: z2.boolean().optional(),
      economiaLicenseType: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
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
        stock: input.stock !== void 0 ? input.stock : 1,
        isActive: input.isActive !== void 0 ? input.isActive : true,
        isPreVenda: input.isPreVenda,
        showInEconomia: input.showInEconomia,
        economiaLicenseType: input.economiaLicenseType
      }).where(eq4(digitalProducts.id, input.id));
    }),
    adminDelete: protectedProcedure.input(z2.number()).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      return database.delete(digitalProducts).where(eq4(digitalProducts.id, input));
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      const [product] = await database.select().from(digitalProducts).where(eq4(digitalProducts.id, input.id)).limit(1);
      if (!product) throw new TRPCError3({ code: "NOT_FOUND", message: "An\xFAncio n\xE3o encontrado" });
      const seller = await getSellerByUserId(ctx.user.id);
      const isAdmin = ctx.user.role === "admin";
      const isOwner = seller && product.sellerId === seller.id;
      if (!isAdmin && !isOwner) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Sem permiss\xE3o para deletar este an\xFAncio" });
      }
      await database.delete(digitalProducts).where(eq4(digitalProducts.id, input.id));
      return { success: true };
    })
  }),
  // Orders Router
  orders: router({
    getByBuyerId: protectedProcedure.query(({ ctx }) => getOrdersByBuyerId(ctx.user.id)),
    getBySellerId: protectedProcedure.query(async ({ ctx }) => {
      const seller = await getSellerByUserId(ctx.user.id);
      return seller ? getOrdersBySellerId(seller.userId) : [];
    }),
    listAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      return getAllOrdersWithDetails();
    }),
    deliverOrder: protectedProcedure.input(z2.object({
      orderId: z2.number(),
      deliveryDetails: z2.string().min(1)
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      return deliverOrder(input.orderId, input.deliveryDetails);
    }),
    confirmAndReview: protectedProcedure.input(z2.object({
      orderId: z2.number(),
      rating: z2.number().min(1).max(5),
      comment: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      return confirmOrderAndReview(input.orderId, ctx.user.id, input.rating, input.comment);
    }),
    updateStatus: protectedProcedure.input(z2.object({
      orderId: z2.number(),
      status: z2.enum(["pendente", "pago", "enviado", "entregue", "cancelado"])
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      return updateOrderStatus(input.orderId, input.status);
    }),
    delete: protectedProcedure.input(z2.number()).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      return deleteOrder(input);
    }),
    simulateTestOrder: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      return database.insert(orders).values({
        buyerId: ctx.user.id,
        productType: "digital",
        productName: "EA SPORTS FC 25 (Teste de Compra)",
        quantity: 1,
        totalPrice: "199.90",
        commissionPercentage: "10.00",
        platformCommission: "19.99",
        sellerAmount: "179.91",
        status: "pago",
        buyerPhone: "5571987650840",
        createdAt: /* @__PURE__ */ new Date()
      });
    })
  }),
  // Settings Router - for admin only
  settings: router({
    get: publicProcedure.query(() => getPlatformSettings()),
    updateCommission: protectedProcedure.input(z2.object({ commissionPercentage: z2.string() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      return updatePlatformSettings({ commissionPercentage: input.commissionPercentage });
    }),
    updateWhatsappUrl: protectedProcedure.input(z2.object({ vipWhatsappUrl: z2.string() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      return updatePlatformSettings({ vipWhatsappUrl: input.vipWhatsappUrl });
    }),
    updateCoinLimits: protectedProcedure.input(z2.object({ maxCoinsPerPurchase: z2.number().min(0), maxCoinsPreVenda: z2.number().min(0) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      return updatePlatformSettings({ maxCoinsPerPurchase: input.maxCoinsPerPurchase, maxCoinsPreVenda: input.maxCoinsPreVenda });
    })
  }),
  // Central de Notificações do admin — "dispensar" aqui só esconde da lista (compartilhado
  // entre gestores/dispositivos), nunca apaga o chat/pedido/resgate/indicação de verdade.
  adminNotifications: router({
    getDismissed: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      return getDismissedNotificationIds();
    }),
    dismiss: protectedProcedure.input(z2.object({ ids: z2.array(z2.string()).min(1) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      await dismissNotifications(input.ids);
      return { success: true };
    }),
    restore: protectedProcedure.input(z2.object({ ids: z2.array(z2.string()).min(1) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      await restoreNotifications(input.ids);
      return { success: true };
    })
  }),
  // Reviews Router
  reviews: router({
    getBySellerId: publicProcedure.input(z2.number()).query(({ input }) => getReviewsBySellerId(input)),
    getRecent: publicProcedure.query(() => getRecentReviews())
  }),
  // Coupons Router
  coupons: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      return getAllCoupons();
    }),
    create: protectedProcedure.input(z2.object({
      code: z2.string().min(1),
      discountPercentage: z2.string().min(1),
      maxUses: z2.number().nullable().optional(),
      expiresAt: z2.string().nullable().optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      const expiresAtDate = input.expiresAt ? new Date(input.expiresAt) : null;
      return createCoupon({
        code: input.code.toUpperCase().trim(),
        discountPercentage: input.discountPercentage,
        maxUses: input.maxUses ?? null,
        expiresAt: expiresAtDate,
        isActive: true
      });
    }),
    update: protectedProcedure.input(z2.object({
      id: z2.number(),
      isActive: z2.boolean().optional(),
      code: z2.string().optional(),
      discountPercentage: z2.string().optional(),
      maxUses: z2.number().nullable().optional(),
      expiresAt: z2.string().nullable().optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      const updateData = {};
      if (input.isActive !== void 0) updateData.isActive = input.isActive;
      if (input.code !== void 0) updateData.code = input.code.toUpperCase().trim();
      if (input.discountPercentage !== void 0) updateData.discountPercentage = input.discountPercentage;
      if (input.maxUses !== void 0) updateData.maxUses = input.maxUses;
      if (input.expiresAt !== void 0) {
        updateData.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      }
      return updateCoupon(input.id, updateData);
    }),
    delete: protectedProcedure.input(z2.number()).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      return deleteCoupon(input);
    }),
    validate: publicProcedure.input(z2.object({
      code: z2.string()
    })).mutation(async ({ input }) => {
      const coupon = await getCouponByCode(input.code.toUpperCase().trim());
      if (!coupon) throw new Error("Cupom inv\xE1lido ou inativo");
      if (coupon.expiresAt) {
        const expiryDate = new Date(coupon.expiresAt);
        if (expiryDate.getUTCHours() === 0 && expiryDate.getUTCMinutes() === 0 && expiryDate.getUTCSeconds() === 0) {
          expiryDate.setUTCHours(23, 59, 59, 999);
        }
        if (expiryDate.getTime() < Date.now()) {
          throw new Error("Cupom expirado");
        }
      }
      if (coupon.maxUses !== null && (coupon.usedCount || 0) >= coupon.maxUses) {
        throw new Error("Cupom esgotado (limite de usos atingido)");
      }
      return {
        id: coupon.id,
        code: coupon.code,
        discountPercentage: parseFloat(coupon.discountPercentage)
      };
    })
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
          const subs = await database.select().from(platinadorSubscriptions).where(eq4(platinadorSubscriptions.userId, ctx.user.id)).limit(1);
          if (subs.length > 0 && subs[0].status === "ativa") {
            const now = /* @__PURE__ */ new Date();
            if (subs[0].expiresAt && new Date(subs[0].expiresAt) > now) {
              isSubscribed = true;
              subscription = subs[0];
            }
          }
          const settings = await database.select().from(platformSettings).where(eq4(platformSettings.id, 1)).limit(1);
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
        vipWhatsappUrl
      };
    }),
    updatePsnId: protectedProcedure.input(z2.object({ psnId: z2.string().min(2) })).mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (database) {
        await database.update(users).set({ psnId: input.psnId.trim() }).where(eq4(users.id, ctx.user.id));
      }
      return { success: true, psnId: input.psnId.trim() };
    }),
    subscribe: protectedProcedure.mutation(async ({ ctx }) => {
      const database = await getDb();
      const now = /* @__PURE__ */ new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
      if (database) {
        try {
          const existing = await database.select().from(platinadorSubscriptions).where(eq4(platinadorSubscriptions.userId, ctx.user.id)).limit(1);
          if (existing.length > 0) {
            await database.update(platinadorSubscriptions).set({
              status: "ativa",
              startsAt: now,
              expiresAt,
              paymentId: "PIX_SIMULATED_" + Date.now()
            }).where(eq4(platinadorSubscriptions.id, existing[0].id));
          } else {
            await database.insert(platinadorSubscriptions).values({
              userId: ctx.user.id,
              status: "ativa",
              planName: "Clube Platinador VIP",
              price: "15.00",
              startsAt: now,
              expiresAt,
              paymentId: "PIX_SIMULATED_" + Date.now()
            });
          }
        } catch (e) {
          console.error("[TRPC Platinador] Subscribe DB error:", e);
        }
      }
      return {
        success: true,
        expiresAt,
        message: "Assinatura do Clube Platinador ativada com sucesso por 30 dias!"
      };
    }),
    listChallenges: publicProcedure.query(async () => {
      const database = await getDb();
      if (database) {
        try {
          const list = await database.select().from(platinumChallenges).orderBy(desc2(platinumChallenges.createdAt));
          return list;
        } catch (e) {
          console.error("[TRPC Platinador] Error fetching challenges:", e);
        }
      }
      return [];
    }),
    submitPlatinum: protectedProcedure.input(
      z2.object({
        challengeId: z2.number(),
        proofUrl: z2.string().url("Envie um link v\xE1lido para a imagem de comprova\xE7\xE3o"),
        psnId: z2.string().min(2)
      })
    ).mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (database) {
        await database.update(users).set({ psnId: input.psnId.trim() }).where(eq4(users.id, ctx.user.id));
        await database.insert(platinumSubmissions).values({
          challengeId: input.challengeId,
          userId: ctx.user.id,
          psnId: input.psnId.trim(),
          proofUrl: input.proofUrl.trim(),
          status: "pendente"
        });
      }
      return {
        success: true,
        message: "Comprova\xE7\xE3o de platina enviada com sucesso! Aguarde a an\xE1lise da nossa equipe."
      };
    }),
    getUserSubmissions: protectedProcedure.query(async ({ ctx }) => {
      const database = await getDb();
      if (database) {
        try {
          const list = await database.select().from(platinumSubmissions).where(eq4(platinumSubmissions.userId, ctx.user.id)).orderBy(desc2(platinumSubmissions.submittedAt));
          return list;
        } catch (e) {
          console.error("[TRPC Platinador] Error fetching user submissions:", e);
        }
      }
      return [];
    }),
    // Comprovações aprovadas, expostas publicamente (sem dados sensíveis) para o
    // mural de platinadores por desafio e o ranking geral do clube.
    getApprovedSubmissions: publicProcedure.query(async () => {
      const database = await getDb();
      if (database) {
        try {
          const list = await database.select({
            challengeId: platinumSubmissions.challengeId,
            psnId: platinumSubmissions.psnId,
            coinsAwarded: platinumSubmissions.coinsAwarded,
            reviewedAt: platinumSubmissions.reviewedAt
          }).from(platinumSubmissions).where(eq4(platinumSubmissions.status, "aprovado")).orderBy(desc2(platinumSubmissions.reviewedAt));
          return list;
        } catch (e) {
          console.error("[TRPC Platinador] Error fetching approved submissions:", e);
        }
      }
      return [];
    }),
    adminCreateChallenge: protectedProcedure.input(
      z2.object({
        gameTitle: z2.string().min(2),
        description: z2.string().optional(),
        platform: z2.string().default("PS4 / PS5"),
        imageUrl: z2.string().optional(),
        rewardCoins: z2.number().default(500)
      })
    ).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores" });
      const database = await getDb();
      if (database) {
        await database.insert(platinumChallenges).values({
          gameTitle: input.gameTitle,
          description: input.description || "",
          platform: input.platform,
          imageUrl: input.imageUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800",
          rewardCoins: input.rewardCoins,
          status: "ativo"
        });
      }
      return { success: true };
    }),
    adminUpdateChallenge: protectedProcedure.input(
      z2.object({
        challengeId: z2.number(),
        gameTitle: z2.string().min(2).optional(),
        description: z2.string().optional(),
        platform: z2.string().optional(),
        imageUrl: z2.string().optional(),
        rewardCoins: z2.number().optional(),
        status: z2.enum(["ativo", "encerrado", "brevemente"]).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores" });
      const database = await getDb();
      if (database) {
        try {
          const updateData = {};
          if (input.gameTitle !== void 0) updateData.gameTitle = input.gameTitle;
          if (input.description !== void 0) updateData.description = input.description;
          if (input.platform !== void 0) updateData.platform = input.platform;
          if (input.imageUrl !== void 0) updateData.imageUrl = input.imageUrl;
          if (input.rewardCoins !== void 0) updateData.rewardCoins = input.rewardCoins;
          if (input.status !== void 0) updateData.status = input.status;
          await database.update(platinumChallenges).set(updateData).where(eq4(platinumChallenges.id, Number(input.challengeId)));
        } catch (err) {
          console.error("[TRPC adminUpdateChallenge Error]", err);
          throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: err.message || "Erro ao atualizar desafio no banco de dados." });
        }
      }
      return { success: true };
    }),
    adminDeleteChallenge: protectedProcedure.input(z2.object({ challengeId: z2.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores" });
      const database = await getDb();
      if (database) {
        await database.delete(platinumChallenges).where(eq4(platinumChallenges.id, input.challengeId));
      }
      return { success: true };
    }),
    adminListSubmissions: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores" });
      const database = await getDb();
      if (database) {
        try {
          const list = await database.select().from(platinumSubmissions).orderBy(desc2(platinumSubmissions.submittedAt));
          return list;
        } catch (e) {
          console.error("[TRPC Platinador] Error fetching admin submissions:", e);
        }
      }
      return [];
    }),
    adminApproveSubmission: protectedProcedure.input(
      z2.object({
        submissionId: z2.number(),
        coinsToAward: z2.number().min(1),
        adminNotes: z2.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores" });
      const database = await getDb();
      if (database) {
        const subs = await database.select().from(platinumSubmissions).where(eq4(platinumSubmissions.id, input.submissionId)).limit(1);
        if (subs.length === 0) throw new Error("Submiss\xE3o n\xE3o encontrada");
        const sub = subs[0];
        await database.update(platinumSubmissions).set({
          status: "aprovado",
          coinsAwarded: input.coinsToAward,
          adminNotes: input.adminNotes || "Platina verificada e aprovada!",
          reviewedAt: /* @__PURE__ */ new Date()
        }).where(eq4(platinumSubmissions.id, input.submissionId));
        const targetUsers = await database.select().from(users).where(eq4(users.id, sub.userId)).limit(1);
        if (targetUsers.length > 0) {
          const currentCoins = targetUsers[0].forteCoins || 0;
          await database.update(users).set({ forteCoins: currentCoins + input.coinsToAward }).where(eq4(users.id, sub.userId));
        }
      }
      return { success: true, message: `Submiss\xE3o aprovada! ${input.coinsToAward} ForteCoins creditados.` };
    }),
    adminRejectSubmission: protectedProcedure.input(
      z2.object({
        submissionId: z2.number(),
        adminNotes: z2.string().min(2, "Insira um motivo de rejei\xE7\xE3o")
      })
    ).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores" });
      const database = await getDb();
      if (database) {
        await database.update(platinumSubmissions).set({
          status: "rejeitado",
          adminNotes: input.adminNotes,
          reviewedAt: /* @__PURE__ */ new Date()
        }).where(eq4(platinumSubmissions.id, input.submissionId));
      }
      return { success: true, message: "Submiss\xE3o rejeitada." };
    }),
    adminUpdateSubmission: protectedProcedure.input(
      z2.object({
        submissionId: z2.number(),
        psnId: z2.string().min(2).optional(),
        coinsAwarded: z2.number().min(0).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores" });
      const database = await getDb();
      if (!database) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel" });
      const subs = await database.select().from(platinumSubmissions).where(eq4(platinumSubmissions.id, input.submissionId)).limit(1);
      if (subs.length === 0) throw new TRPCError3({ code: "NOT_FOUND", message: "Submiss\xE3o n\xE3o encontrada" });
      const sub = subs[0];
      const updateData = {};
      if (input.psnId !== void 0) updateData.psnId = input.psnId.trim();
      if (input.coinsAwarded !== void 0 && input.coinsAwarded !== sub.coinsAwarded) {
        updateData.coinsAwarded = input.coinsAwarded;
        if (sub.status === "aprovado") {
          const delta = input.coinsAwarded - (sub.coinsAwarded || 0);
          const targetUsers = await database.select().from(users).where(eq4(users.id, sub.userId)).limit(1);
          if (targetUsers.length > 0) {
            const currentCoins = targetUsers[0].forteCoins || 0;
            await database.update(users).set({ forteCoins: Math.max(0, currentCoins + delta) }).where(eq4(users.id, sub.userId));
          }
        }
      }
      if (Object.keys(updateData).length > 0) {
        await database.update(platinumSubmissions).set(updateData).where(eq4(platinumSubmissions.id, input.submissionId));
      }
      return { success: true };
    }),
    adminDeleteSubmission: protectedProcedure.input(z2.object({ submissionId: z2.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores" });
      const database = await getDb();
      if (!database) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel" });
      const subs = await database.select().from(platinumSubmissions).where(eq4(platinumSubmissions.id, input.submissionId)).limit(1);
      if (subs.length === 0) throw new TRPCError3({ code: "NOT_FOUND", message: "Submiss\xE3o n\xE3o encontrada" });
      const sub = subs[0];
      if (sub.status === "aprovado" && sub.coinsAwarded) {
        const targetUsers = await database.select().from(users).where(eq4(users.id, sub.userId)).limit(1);
        if (targetUsers.length > 0) {
          const currentCoins = targetUsers[0].forteCoins || 0;
          await database.update(users).set({ forteCoins: Math.max(0, currentCoins - sub.coinsAwarded) }).where(eq4(users.id, sub.userId));
        }
      }
      await database.delete(platinumSubmissions).where(eq4(platinumSubmissions.id, input.submissionId));
      return { success: true, message: "Submiss\xE3o removida do ranking." };
    })
  })
});

// server/_core/index.ts
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: false });
process.env.NODE_ENV = process.env.NODE_ENV || "development";
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
registerSeedRoute(app);
registerAiRoute(app);
registerPaymentRoute(app);
app.get("/api/migrate-db", async (req, res) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: "DATABASE_URL not set in environment" });
  try {
    const { neon: neon2 } = await import("@neondatabase/serverless");
    const sql3 = neon2(dbUrl);
    await sql3.query(`CREATE TABLE IF NOT EXISTS "digitalProducts" (
      "id" serial PRIMARY KEY,
      "sellerId" integer,
      "name" varchar(255) NOT NULL,
      "description" text,
      "price" numeric(10, 2) NOT NULL,
      "type" varchar(50) NOT NULL,
      "keyOrCode" text,
      "downloadUrl" varchar(500),
      "imageUrl" varchar(500),
      "stock" integer NOT NULL DEFAULT 1,
      "isActive" boolean DEFAULT true,
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL
    )`);
    await sql3.query(`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "pricePrimary" numeric(10, 2)`);
    await sql3.query(`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "priceSecondary" numeric(10, 2)`);
    await sql3.query(`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'aprovado' NOT NULL`);
    await sql3.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cpf" varchar(18)`);
    await sql3.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "psnId" varchar(100)`);
    await sql3.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loginMethod" varchar(64)`);
    await sql3.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "forteCoins" integer DEFAULT 10 NOT NULL`);
    await sql3.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "balance" numeric(12, 2) DEFAULT '0' NOT NULL`);
    await sql3.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "digitalProductId" integer`);
    await sql3.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "firebaseProductId" varchar(255)`);
    await sql3.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "accountType" varchar(20)`);
    await sql3.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryDetails" text`);
    await sql3.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coinsUsed" integer DEFAULT 0 NOT NULL`);
    await sql3.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "productName" varchar(255)`);
    await sql3.query(`CREATE TABLE IF NOT EXISTS "platform_settings" (
      "id" integer PRIMARY KEY,
      "commissionPercentage" numeric(5, 2) DEFAULT '10'
    )`);
    await sql3.query(`ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "vipWhatsappUrl" varchar(500) DEFAULT 'https://chat.whatsapp.com/Gkx7ExampleVipLink'`);
    await sql3.query(`ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "maxCoinsPerPurchase" integer DEFAULT 10`);
    await sql3.query(`ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "maxCoinsPreVenda" integer DEFAULT 50`);
    await sql3.query(`ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL`);
    await sql3.query(`INSERT INTO "platform_settings" (id, "commissionPercentage") VALUES (1, '6.00') ON CONFLICT (id) DO UPDATE SET "commissionPercentage" = '6.00'`);
    await sql3.query(`CREATE TABLE IF NOT EXISTS "admin_dismissed_notifications" (
      "id" varchar(255) PRIMARY KEY,
      "dismissedAt" timestamp DEFAULT now() NOT NULL
    )`);
    return res.json({ success: true, message: "Migra\xE7\xE3o das tabelas e comiss\xE3o de 6% conclu\xEDda com sucesso na Vercel!" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/test-db", async (req, res) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ success: false, error: "DATABASE_URL not set in environment" });
  }
  try {
    const { neon: neon2 } = await import("@neondatabase/serverless");
    const { drizzle: drizzle2 } = await import("drizzle-orm/neon-http");
    const sql3 = neon2(dbUrl);
    const db = drizzle2(sql3);
    const result = await db.execute("SELECT 1 AS ok");
    return res.json({ success: true, result, driver: "neon-serverless" });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      errJson: JSON.stringify(err, Object.getOwnPropertyNames(err))
    });
  }
});
app.get("/api/test-create-order", async (req, res) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ success: false, error: "DATABASE_URL not set in environment" });
  }
  try {
    const { neon: neon2 } = await import("@neondatabase/serverless");
    const { drizzle: drizzle2 } = await import("drizzle-orm/neon-http");
    const { eq: eq5 } = await import("drizzle-orm");
    const { users: usersTable, orders: ordersTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const sql3 = neon2(dbUrl);
    const db = drizzle2(sql3);
    const userEmail = "luanmnogueira@gmail.com";
    let buyer = await db.select().from(usersTable).where(eq5(usersTable.email, userEmail)).limit(1).then((r) => r[0]);
    if (!buyer) {
      const mockOpenId = "test_luan_" + Math.random().toString(36).substring(7);
      await db.insert(usersTable).values({
        openId: mockOpenId,
        name: "Luan Nogueira",
        email: userEmail,
        loginMethod: "firebase",
        role: "admin"
      });
      buyer = await db.select().from(usersTable).where(eq5(usersTable.email, userEmail)).limit(1).then((r) => r[0]);
    } else if (buyer.role !== "admin") {
      await db.update(usersTable).set({ role: "admin" }).where(eq5(usersTable.id, buyer.id));
      buyer = await db.select().from(usersTable).where(eq5(usersTable.email, userEmail)).limit(1).then((r) => r[0]);
    }
    if (!buyer) {
      throw new Error("N\xE3o foi poss\xEDvel carregar ou criar o usu\xE1rio Luan.");
    }
    const orderId = await db.insert(ordersTable).values({
      buyerId: buyer.id,
      productType: "digital",
      totalPrice: "89.90",
      commissionPercentage: "10.00",
      platformCommission: "8.99",
      sellerAmount: "80.91",
      status: "pago",
      paymentId: "TESTE-PGTO-" + Math.random().toString(36).substring(2, 7).toUpperCase()
    }).returning({ id: ordersTable.id }).then((r) => r[0]?.id);
    return res.send(`
      <div style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; border: 1px solid #ef4444; border-radius: 12px; background-color: #0b0f19; color: #fff; text-align: center; box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);">
        <h2 style="color: #ef4444; margin-top: 0;">\u{1F389} Pedido de Teste Criado!</h2>
        <p>Um jogo digital mock foi inserido na sua conta com sucesso.</p>
        <div style="background: #1e293b; padding: 15px; border-radius: 8px; text-align: left; font-family: monospace; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1);">
          <strong>ID do Pedido:</strong> #${orderId}<br>
          <strong>Comprador:</strong> ${buyer.name} (${buyer.email})<br>
          <strong>Jogo:</strong> FIFA 26 PS4/PS5 (Mock)<br>
          <strong>Valor:</strong> R$ 89,90<br>
          <strong>Status:</strong> pago (Pronto para entrega)
        </div>
        <p style="color: #94a3b8; font-size: 14px;">Agora acesse o seu **Painel do Gestor** no site para ver o pedido na aba **Gerenciar Vendas** e testar o envio de e-mail!</p>
        <a href="/admin" style="display: inline-block; background: #ef4444; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px; transition: 0.2s;">Ir para Painel do Gestor</a>
      </div>
    `);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/inspect-db-url", (req, res) => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return res.json({ error: "DATABASE_URL is missing" });
  }
  try {
    const parsed = new URL(url);
    return res.json({
      protocol: parsed.protocol,
      host: parsed.host,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      searchParams: Object.fromEntries(parsed.searchParams.entries())
    });
  } catch (e) {
    return res.json({ error: "Invalid URL", message: e.message, length: url.length });
  }
});
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  try {
    const { neon: neon2 } = await import("@neondatabase/serverless");
    const sql3 = neon2(dbUrl);
    console.log("[Database] Executando migra\xE7\xF5es de inicializa\xE7\xE3o...");
    await sql3.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cpf" varchar(18)`);
    await sql3.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "forteCoins" integer DEFAULT 10 NOT NULL`);
    await sql3.query(`ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'collaborator'`);
    await sql3.query(`CREATE TABLE IF NOT EXISTS "coupons" (
      "id" serial PRIMARY KEY,
      "code" varchar(50) NOT NULL UNIQUE,
      "discountPercentage" numeric(5, 2) NOT NULL,
      "maxUses" integer,
      "usedCount" integer DEFAULT 0,
      "expiresAt" timestamp,
      "isActive" boolean DEFAULT true,
      "createdAt" timestamp DEFAULT now() NOT NULL
    )`);
    await sql3.query(`ALTER TABLE "usedProducts" ADD COLUMN IF NOT EXISTS "estado" varchar(50)`);
    await sql3.query(`ALTER TABLE "usedProducts" ADD COLUMN IF NOT EXISTS "cidade" varchar(100)`);
    await sql3.query(`ALTER TABLE "usedProducts" ADD COLUMN IF NOT EXISTS "category" varchar(50) DEFAULT 'midia_fisica'`);
    await sql3.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "accountType" varchar(20)`);
    await sql3.query(`CREATE TABLE IF NOT EXISTS "platform_settings" (
      "id" integer PRIMARY KEY,
      "commissionPercentage" numeric(5, 2) DEFAULT '10'
    )`);
    await sql3.query(`ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "vipWhatsappUrl" varchar(500)`);
    await sql3.query(`ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "maxCoinsPerPurchase" integer DEFAULT 10`);
    await sql3.query(`ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "maxCoinsPreVenda" integer DEFAULT 50`);
    await sql3.query(`ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL`);
    await sql3.query(`INSERT INTO "platform_settings" (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
    await sql3.query(`CREATE TABLE IF NOT EXISTS "admin_dismissed_notifications" (
      "id" varchar(255) PRIMARY KEY,
      "dismissedAt" timestamp DEFAULT now() NOT NULL
    )`);
    console.log("[Database] Migra\xE7\xF5es de inicializa\xE7\xE3o conclu\xEDdas com sucesso.");
  } catch (migErr) {
    console.warn("[Database] Aviso: Falha na migra\xE7\xE3o autom\xE1tica de inicializa\xE7\xE3o:", migErr.message);
  }
}
var migrationsPromise = runMigrations();
async function startServer() {
  console.log("[Server] starting server...");
  await migrationsPromise;
  const server = createServer(app);
  console.log("[Server] NODE_ENV:", process.env.NODE_ENV);
  if (process.env.NODE_ENV === "development") {
    console.log("[Server] Importing vite module...");
    const viteModule = "./vite.js";
    const { setupVite } = await import(viteModule);
    console.log("[Server] Setting up Vite...");
    await setupVite(app, server);
    console.log("[Server] Vite set up completed.");
  } else if (process.env.VERCEL !== "1") {
    console.log("[Server] Importing vite module for static...");
    const viteModule = "./vite.js";
    const { serveStatic } = await import(viteModule);
    console.log("[Server] Serving static files...");
    serveStatic(app);
  }
  console.log("[Server] Finding available port...");
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  console.log("[Server] Listening on port:", port);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  startServer().catch(console.error);
}
var index_default = app;
export {
  app,
  index_default as default
};
