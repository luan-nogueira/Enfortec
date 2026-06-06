var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
var users, sellers, products, usedProducts, digitalProducts, orders, coupons, reviews, messages, platformSettings, usersRelations, sellersRelations, usedProductsRelations, digitalProductsRelations, ordersRelations, reviewsRelations, messagesRelations;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
      /**
       * Surrogate primary key. Auto-incremented numeric value managed by the database.
       * Use this for relations between tables.
       */
      id: int("id").autoincrement().primaryKey(),
      /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: mysqlEnum("role", ["user", "admin", "vendedor"]).default("user").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
      balance: decimal("balance", { precision: 12, scale: 2 }).default("0").notNull()
    });
    sellers = mysqlTable("sellers", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull().unique(),
      storeName: varchar("storeName", { length: 255 }).notNull(),
      description: text("description"),
      rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
      totalReviews: int("totalReviews").default(0),
      commissionPercentage: decimal("commissionPercentage", { precision: 5, scale: 2 }).default("10"),
      isActive: boolean("isActive").default(true),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    products = mysqlTable("products", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description"),
      price: decimal("price", { precision: 10, scale: 2 }).notNull(),
      category: varchar("category", { length: 100 }).notNull(),
      stock: int("stock").notNull().default(0),
      images: json("images").$type().default([]),
      isActive: boolean("isActive").default(true),
      mercadoLibreId: varchar("mercadoLibreId", { length: 255 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    usedProducts = mysqlTable("usedProducts", {
      id: int("id").autoincrement().primaryKey(),
      sellerId: int("sellerId").notNull(),
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description"),
      price: decimal("price", { precision: 10, scale: 2 }).notNull(),
      condition: mysqlEnum("condition", ["novo", "como_novo", "bom", "aceitavel"]).notNull(),
      images: json("images").$type().default([]),
      status: mysqlEnum("status", ["pendente", "aprovado", "rejeitado", "vendido"]).default("pendente"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    digitalProducts = mysqlTable("digitalProducts", {
      id: int("id").autoincrement().primaryKey(),
      sellerId: int("sellerId"),
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description"),
      price: decimal("price", { precision: 10, scale: 2 }).notNull(),
      type: mysqlEnum("type", ["jogo", "gift_card", "licenca", "outro"]).notNull(),
      keyOrCode: text("keyOrCode"),
      downloadUrl: varchar("downloadUrl", { length: 500 }),
      imageUrl: varchar("imageUrl", { length: 500 }),
      stock: int("stock").notNull().default(1),
      isActive: boolean("isActive").default(true),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    orders = mysqlTable("orders", {
      id: int("id").autoincrement().primaryKey(),
      buyerId: int("buyerId").notNull(),
      sellerId: int("sellerId"),
      productId: int("productId"),
      usedProductId: int("usedProductId"),
      digitalProductId: int("digitalProductId"),
      productType: mysqlEnum("productType", ["store", "used", "digital"]).notNull(),
      quantity: int("quantity").notNull().default(1),
      totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
      commissionPercentage: decimal("commissionPercentage", { precision: 5, scale: 2 }).notNull(),
      platformCommission: decimal("platformCommission", { precision: 10, scale: 2 }).notNull(),
      sellerAmount: decimal("sellerAmount", { precision: 10, scale: 2 }).notNull(),
      status: mysqlEnum("status", ["pendente", "pago", "enviado", "entregue", "cancelado"]).default("pendente"),
      paymentId: varchar("paymentId", { length: 255 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    coupons = mysqlTable("coupons", {
      id: int("id").autoincrement().primaryKey(),
      code: varchar("code", { length: 50 }).notNull().unique(),
      discountPercentage: decimal("discountPercentage", { precision: 5, scale: 2 }).notNull(),
      maxUses: int("maxUses"),
      usedCount: int("usedCount").default(0),
      expiresAt: timestamp("expiresAt"),
      isActive: boolean("isActive").default(true),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    reviews = mysqlTable("reviews", {
      id: int("id").autoincrement().primaryKey(),
      orderId: int("orderId").notNull(),
      sellerId: int("sellerId").notNull(),
      buyerId: int("buyerId").notNull(),
      rating: int("rating").notNull(),
      comment: text("comment"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    messages = mysqlTable("messages", {
      id: int("id").autoincrement().primaryKey(),
      senderId: int("senderId").notNull(),
      recipientId: int("recipientId").notNull(),
      orderId: int("orderId"),
      content: text("content").notNull(),
      isRead: boolean("isRead").default(false),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    platformSettings = mysqlTable("platform_settings", {
      id: int("id").autoincrement().primaryKey(),
      commissionPercentage: decimal("commissionPercentage", { precision: 5, scale: 2 }).default("10"),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
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

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  confirmOrderAndReview: () => confirmOrderAndReview,
  getActiveDigitalProducts: () => getActiveDigitalProducts,
  getActiveProducts: () => getActiveProducts,
  getActiveSellers: () => getActiveSellers,
  getApprovedUsedProducts: () => getApprovedUsedProducts,
  getCouponByCode: () => getCouponByCode,
  getDb: () => getDb,
  getOrdersByBuyerId: () => getOrdersByBuyerId,
  getOrdersBySellerId: () => getOrdersBySellerId,
  getPlatformSettings: () => getPlatformSettings,
  getProductById: () => getProductById,
  getReviewsBySellerId: () => getReviewsBySellerId,
  getSellerByUserId: () => getSellerByUserId,
  getUsedProductsBySellerId: () => getUsedProductsBySellerId,
  getUserByOpenId: () => getUserByOpenId,
  updatePlatformSettings: () => updatePlatformSettings,
  upsertUser: () => upsertUser
});
import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
async function getDb() {
  if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL is not set");
    return null;
  }
  try {
    const useSsl = !process.env.DATABASE_URL.includes("localhost") && !process.env.DATABASE_URL.includes("127.0.0.1");
    const connection = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      connectTimeout: 1e4,
      ...useSsl ? { ssl: { rejectUnauthorized: false } } : {}
    });
    return drizzle(connection);
  } catch (error) {
    console.warn("[Database] Failed to create connection:", error);
    return null;
  }
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot get user: database not available");
      return void 0;
    }
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result.length > 0 ? result[0] : void 0;
  } catch (error) {
    console.error("[Database Error] getUserByOpenId failed:", error);
    return void 0;
  }
}
async function getActiveProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
}
async function getProductById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getSellerByUserId(userId) {
  try {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(sellers).where(eq(sellers.userId, userId)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database Error] getSellerByUserId failed:", error);
    return null;
  }
}
async function getActiveSellers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sellers).where(eq(sellers.isActive, true)).orderBy(desc(sellers.rating));
}
async function getApprovedUsedProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(usedProducts).where(eq(usedProducts.status, "aprovado")).orderBy(desc(usedProducts.createdAt));
}
async function getUsedProductsBySellerId(sellerId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(usedProducts).where(eq(usedProducts.sellerId, sellerId)).orderBy(desc(usedProducts.createdAt));
}
async function getActiveDigitalProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(digitalProducts).where(eq(digitalProducts.isActive, true)).orderBy(desc(digitalProducts.createdAt));
}
async function getOrdersByBuyerId(buyerId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.buyerId, buyerId)).orderBy(desc(orders.createdAt));
}
async function getOrdersBySellerId(sellerId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.sellerId, sellerId)).orderBy(desc(orders.createdAt));
}
async function getCouponByCode(code) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(coupons).where(and(eq(coupons.code, code), eq(coupons.isActive, true))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getReviewsBySellerId(sellerId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.sellerId, sellerId)).orderBy(desc(reviews.createdAt));
}
async function getPlatformSettings() {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1);
  if (result.length === 0) {
    await db.insert(platformSettings).values({ id: 1, commissionPercentage: "10" });
    return { id: 1, commissionPercentage: "10" };
  }
  return result[0];
}
async function updatePlatformSettings(commissionPercentage) {
  const db = await getDb();
  if (!db) return;
  await db.update(platformSettings).set({ commissionPercentage }).where(eq(platformSettings.id, 1));
}
async function confirmOrderAndReview(orderId, buyerId, rating, comment) {
  const db = await getDb();
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
  await db.update(orders).set({ status: "entregue" }).where(eq(orders.id, orderId));
  await db.insert(reviews).values({
    orderId: order.id,
    sellerId: sellerProfile?.id ?? order.sellerId,
    // Fallback to user ID if no specific seller profile
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
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
  }
});

// server/_core/index.ts
import "dotenv/config";
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

// server/_core/oauth.ts
init_db();

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
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
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
init_env();
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
init_db();
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
function registerPaymentRoute(app2) {
  app2.post("/api/infinitepay/checkout", async (req, res) => {
    try {
      const { name, price, quantity = 1, redirectUrl } = req.body;
      if (!name || price === void 0) {
        return res.status(400).json({ success: false, error: "Nome e pre\xE7o s\xE3o obrigat\xF3rios." });
      }
      const priceInCents = Math.round(parseFloat(price) * 100);
      const handle = process.env.INFINITE_PAY_HANDLE || "efortegames";
      const payload = {
        handle,
        redirect_url: redirectUrl || `${req.protocol}://${req.get("host")}/minhas-compras`,
        items: [
          {
            name,
            price: priceInCents,
            quantity: Number(quantity)
          }
        ]
      };
      console.log("[InfinitePay] Criando link com payload:", JSON.stringify(payload));
      const { data } = await axios2.post("https://api.checkout.infinitepay.io/links", payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (data.success === false) {
        console.error("[InfinitePay] Erro retornado pela API:", data);
        return res.status(400).json({ success: false, error: data.message || "Erro da API InfinitePay" });
      }
      return res.json({ success: true, url: data.url });
    } catch (error) {
      console.error("[InfinitePay] Erro interno na gera\xE7\xE3o do checkout:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || error.message || "Erro desconhecido";
      return res.status(500).json({ success: false, error: errorMsg });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
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
init_db();
init_db();
init_schema();
import { z as z2 } from "zod";
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  // Products Router - for store's own physical products
  products: router({
    list: publicProcedure.query(() => getActiveProducts()),
    getById: publicProcedure.input(z2.number()).query(({ input }) => getProductById(input))
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
    getByUserId: protectedProcedure.query(({ ctx }) => getUsedProductsBySellerId(ctx.user.id)),
    create: protectedProcedure.input(z2.object({
      name: z2.string().min(3),
      description: z2.string(),
      price: z2.number().positive(),
      condition: z2.enum(["novo", "como_novo", "bom", "aceitavel"]),
      images: z2.array(z2.string()).optional()
    })).mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller) throw new Error("User is not a seller");
      const result = await database.insert(usedProducts).values({
        sellerId: seller.id,
        name: input.name,
        description: input.description,
        price: input.price.toString(),
        condition: input.condition,
        images: input.images || []
      });
      return result;
    })
  }),
  // Digital Products Router
  digitalProducts: router({
    list: publicProcedure.query(() => getActiveDigitalProducts()),
    create: protectedProcedure.input(z2.object({
      name: z2.string().min(3),
      description: z2.string(),
      price: z2.number().positive(),
      type: z2.enum(["jogo", "gift_card", "licenca", "outro"]),
      keyOrCode: z2.string().optional(),
      downloadUrl: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      const seller = await getSellerByUserId(ctx.user.id);
      const result = await database.insert(digitalProducts).values({
        sellerId: seller?.id,
        name: input.name,
        description: input.description,
        price: input.price.toString(),
        type: input.type,
        keyOrCode: input.keyOrCode,
        downloadUrl: input.downloadUrl
      });
      return result;
    })
  }),
  // Orders Router
  orders: router({
    getByBuyerId: protectedProcedure.query(({ ctx }) => getOrdersByBuyerId(ctx.user.id)),
    getBySellerId: protectedProcedure.query(async ({ ctx }) => {
      const seller = await getSellerByUserId(ctx.user.id);
      return seller ? getOrdersBySellerId(seller.id) : [];
    }),
    confirmAndReview: protectedProcedure.input(z2.object({
      orderId: z2.number(),
      rating: z2.number().min(1).max(5),
      comment: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      return confirmOrderAndReview(input.orderId, ctx.user.id, input.rating, input.comment);
    })
  }),
  // Settings Router - for admin only
  settings: router({
    get: publicProcedure.query(() => getPlatformSettings()),
    update: protectedProcedure.input(z2.object({
      commissionPercentage: z2.string()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Unauthorized");
      return updatePlatformSettings(input.commissionPercentage);
    })
  }),
  // Reviews Router
  reviews: router({
    getBySellerId: publicProcedure.input(z2.number()).query(({ input }) => getReviewsBySellerId(input))
  })
});

// server/_core/context.ts
init_db();
import { createRemoteJWKSet, jwtVerify as jwtVerify2 } from "jose";
var JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);
var FIREBASE_PROJECT_ID = "enfortec-c9b78";
async function verifyFirebaseToken(token) {
  try {
    const { payload } = await jwtVerify2(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID
    });
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
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = await verifyFirebaseToken(token);
      console.log("[TRPC Server] Firebase Token decoded payload sub:", decoded?.sub || "none");
      if (decoded && decoded.sub) {
        const uid = decoded.sub;
        const email = decoded.email;
        const name = decoded.name || email?.split("@")[0] || "User";
        try {
          user = await getUserByOpenId(uid);
          console.log("[TRPC Server] Database user lookup result (by openId):", user ? `found (id: ${user.id})` : "not found");
          if (!user) {
            try {
              console.log("[TRPC Server] User not found in database, upserting...");
              await upsertUser({
                openId: uid,
                name,
                email,
                loginMethod: "firebase",
                lastSignedIn: /* @__PURE__ */ new Date()
              });
              user = await getUserByOpenId(uid);
              console.log("[TRPC Server] User upsert complete, user id:", user?.id);
            } catch (dbError) {
              console.error("[FirebaseAuth] Failed to upsert user in database:", dbError);
            }
          } else {
            try {
              await upsertUser({
                openId: uid,
                lastSignedIn: /* @__PURE__ */ new Date()
              });
            } catch (e) {
              console.error("[FirebaseAuth] Failed to update user lastSignedIn:", e);
            }
          }
        } catch (dbErr) {
          console.error("[TRPC Server] Database user lookup failed, falling back to local mock user:", dbErr);
          user = {
            id: 999999,
            openId: uid,
            name,
            email: email || null,
            loginMethod: "firebase_fallback",
            role: "user",
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date(),
            lastSignedIn: /* @__PURE__ */ new Date(),
            balance: "0.00"
          };
        }
        if (!user) {
          console.log("[TRPC Server] SQL database unreachable or user not found, using Firebase user fallback.");
          user = {
            id: 999999,
            openId: uid,
            name,
            email: email || null,
            loginMethod: "firebase_fallback",
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
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/index.ts
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
app.get("/api/test-db", async (req, res) => {
  try {
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const db = await getDb2();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database instance is null (DATABASE_URL missing?)" });
    }
    const result = await db.execute("SELECT 1");
    return res.json({ success: true, result });
  } catch (err) {
    console.error("[TestDB Error]", err);
    return res.status(500).json({
      success: false,
      error: err.message,
      cause: err.cause ? { message: err.cause.message, code: err.cause.code } : null,
      originalError: err.originalError ? { message: err.originalError.message, code: err.originalError.code, errno: err.originalError.errno, sqlState: err.originalError.sqlState } : null,
      keys: Object.keys(err),
      errJson: JSON.stringify(err, Object.getOwnPropertyNames(err)),
      stack: err.stack
    });
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
async function startServer() {
  const server = createServer(app);
  if (process.env.NODE_ENV === "development") {
    const viteModule = "./vite.js";
    const { setupVite } = await import(viteModule);
    await setupVite(app, server);
  } else if (process.env.VERCEL !== "1") {
    const viteModule = "./vite.js";
    const { serveStatic } = await import(viteModule);
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
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
