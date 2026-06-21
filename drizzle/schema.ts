import { integer, pgEnum, pgTable, text, timestamp, varchar, numeric, boolean, json, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Core schema for the Enfortec marketplace.
 * Uses PostgreSQL (Neon) types.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin", "vendedor"]);
export const conditionEnum = pgEnum("condition", ["novo", "como_novo", "bom", "aceitavel"]);
export const usedStatusEnum = pgEnum("used_status", ["pendente", "aprovado", "rejeitado", "vendido"]);
export const digitalTypeEnum = pgEnum("digital_type", ["jogo", "gift_card", "licenca", "outro"]);
export const productTypeEnum = pgEnum("product_type", ["store", "used", "digital"]);
export const orderStatusEnum = pgEnum("order_status", ["pendente", "pago", "enviado", "entregue", "cancelado"]);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  /** Surrogate primary key. Auto-incremented by PostgreSQL. */
  id: serial("id").primaryKey(),
  /** OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  cpf: varchar("cpf", { length: 18 }),
  forteCoins: integer("forteCoins").default(10).notNull(),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Sellers table - for users who want to sell used products or digital items
export const sellers = pgTable("sellers", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  storeName: varchar("storeName", { length: 255 }).notNull(),
  description: text("description"),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: integer("totalReviews").default(0),
  commissionPercentage: numeric("commissionPercentage", { precision: 5, scale: 2 }).default("10"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = typeof sellers.$inferInsert;

// Products table - for store's own physical products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  stock: integer("stock").notNull().default(0),
  images: json("images").$type<string[]>().default([]),
  isActive: boolean("isActive").default(true),
  mercadoLibreId: varchar("mercadoLibreId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// Used Products table - for marketplace of used items
export const usedProducts = pgTable("usedProducts", {
  id: serial("id").primaryKey(),
  sellerId: integer("sellerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  condition: conditionEnum("condition").notNull(),
  images: json("images").$type<string[]>().default([]),
  status: usedStatusEnum("status").default("pendente"),
  estado: varchar("estado", { length: 50 }),
  cidade: varchar("cidade", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type UsedProduct = typeof usedProducts.$inferSelect;
export type InsertUsedProduct = typeof usedProducts.$inferInsert;

// Digital Products table - for games, gift cards, licenses
export const digitalProducts = pgTable("digitalProducts", {
  id: serial("id").primaryKey(),
  sellerId: integer("sellerId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  type: digitalTypeEnum("type").notNull(),
  keyOrCode: text("keyOrCode"),
  downloadUrl: varchar("downloadUrl", { length: 500 }),
  imageUrl: varchar("imageUrl", { length: 500 }),
  stock: integer("stock").notNull().default(1),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type DigitalProduct = typeof digitalProducts.$inferSelect;
export type InsertDigitalProduct = typeof digitalProducts.$inferInsert;

// Orders table - for all purchases
export const orders = pgTable("orders", {
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
  deliveryDetails: text("deliveryDetails"),
  coinsUsed: integer("coinsUsed").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// Discounts/Coupons table
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountPercentage: numeric("discountPercentage", { precision: 5, scale: 2 }).notNull(),
  maxUses: integer("maxUses"),
  usedCount: integer("usedCount").default(0),
  expiresAt: timestamp("expiresAt"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

// Reviews/Ratings table
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  sellerId: integer("sellerId").notNull(),
  buyerId: integer("buyerId").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// Messages table - for chat between buyer and seller
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("senderId").notNull(),
  recipientId: integer("recipientId").notNull(),
  orderId: integer("orderId"),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Global Settings table - singleton row (id=1) for commission and platform configs
export const platformSettings = pgTable("platform_settings", {
  id: integer("id").primaryKey(),
  commissionPercentage: numeric("commissionPercentage", { precision: 5, scale: 2 }).default("10"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type PlatformSettings = typeof platformSettings.$inferSelect;
export type InsertPlatformSettings = typeof platformSettings.$inferInsert;

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  seller: one(sellers, {
    fields: [users.id],
    references: [sellers.userId],
  }),
  buyerOrders: many(orders, {
    relationName: "buyer",
  }),
  sellerOrders: many(orders, {
    relationName: "seller",
  }),
  sentMessages: many(messages, {
    relationName: "sender",
  }),
  receivedMessages: many(messages, {
    relationName: "recipient",
  }),
}));

export const sellersRelations = relations(sellers, ({ one, many }) => ({
  user: one(users, {
    fields: [sellers.userId],
    references: [users.id],
  }),
  usedProducts: many(usedProducts),
  digitalProducts: many(digitalProducts),
  orders: many(orders),
  reviews: many(reviews),
}));

export const usedProductsRelations = relations(usedProducts, ({ one, many }) => ({
  seller: one(sellers, {
    fields: [usedProducts.sellerId],
    references: [sellers.id],
  }),
  orders: many(orders),
}));

export const digitalProductsRelations = relations(digitalProducts, ({ one, many }) => ({
  seller: one(sellers, {
    fields: [digitalProducts.sellerId],
    references: [sellers.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
    relationName: "buyer",
  }),
  seller: one(users, {
    fields: [orders.sellerId],
    references: [users.id],
    relationName: "seller",
  }),
  product: one(products, {
    fields: [orders.productId],
    references: [products.id],
  }),
  usedProduct: one(usedProducts, {
    fields: [orders.usedProductId],
    references: [usedProducts.id],
  }),
  digitalProduct: one(digitalProducts, {
    fields: [orders.digitalProductId],
    references: [digitalProducts.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  order: one(orders, {
    fields: [reviews.orderId],
    references: [orders.id],
  }),
  seller: one(sellers, {
    fields: [reviews.sellerId],
    references: [sellers.id],
  }),
  buyer: one(users, {
    fields: [reviews.buyerId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: "recipient",
  }),
  order: one(orders, {
    fields: [messages.orderId],
    references: [orders.id],
  }),
}));