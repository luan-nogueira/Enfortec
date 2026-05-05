import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
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
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Sellers table - for users who want to sell used products or digital items
export const sellers = mysqlTable("sellers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  storeName: varchar("storeName", { length: 255 }).notNull(),
  description: text("description"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: int("totalReviews").default(0),
  commissionPercentage: decimal("commissionPercentage", { precision: 5, scale: 2 }).default("10"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = typeof sellers.$inferInsert;

// Products table - for store's own physical products
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  stock: int("stock").notNull().default(0),
  images: json("images").$type<string[]>().default([]),
  isActive: boolean("isActive").default(true),
  mercadoLibreId: varchar("mercadoLibreId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// Used Products table - for marketplace of used items
export const usedProducts = mysqlTable("usedProducts", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  condition: mysqlEnum("condition", ["novo", "como_novo", "bom", "aceitavel"]).notNull(),
  images: json("images").$type<string[]>().default([]),
  status: mysqlEnum("status", ["pendente", "aprovado", "rejeitado", "vendido"]).default("pendente"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UsedProduct = typeof usedProducts.$inferSelect;
export type InsertUsedProduct = typeof usedProducts.$inferInsert;

// Digital Products table - for games, gift cards, licenses
export const digitalProducts = mysqlTable("digitalProducts", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["jogo", "gift_card", "licenca", "outro"]).notNull(),
  keyOrCode: text("keyOrCode"),
  downloadUrl: varchar("downloadUrl", { length: 500 }),
  stock: int("stock").notNull().default(1),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DigitalProduct = typeof digitalProducts.$inferSelect;
export type InsertDigitalProduct = typeof digitalProducts.$inferInsert;

// Orders table - for all purchases
export const orders = mysqlTable("orders", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// Discounts/Coupons table
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountPercentage: decimal("discountPercentage", { precision: 5, scale: 2 }).notNull(),
  maxUses: int("maxUses"),
  usedCount: int("usedCount").default(0),
  expiresAt: timestamp("expiresAt"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

// Reviews/Ratings table
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  sellerId: int("sellerId").notNull(),
  buyerId: int("buyerId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// Messages table - for chat between buyer and seller
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId").notNull(),
  orderId: int("orderId"),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Global Settings table - for commission and other platform configs
export const platformSettings = mysqlTable("platform_settings", {
  id: int("id").autoincrement().primaryKey(),
  commissionPercentage: decimal("commissionPercentage", { precision: 5, scale: 2 }).default("10"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformSettings = typeof platformSettings.$inferSelect;
export type InsertPlatformSettings = typeof platformSettings.$inferInsert;

// Relations
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