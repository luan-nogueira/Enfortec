import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users, sellers, products, usedProducts, digitalProducts, orders, reviews, coupons, platformSettings } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: any = null;
let _pool: any = null;

// Detect serverless environment (Vercel) - in serverless we cannot use a persistent pool
const IS_SERVERLESS = process.env.VERCEL === "1";

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  // In serverless, always create a fresh connection to avoid stale connections
  if (IS_SERVERLESS && process.env.DATABASE_URL) {
    try {
      const useSsl = !process.env.DATABASE_URL.includes("localhost") && !process.env.DATABASE_URL.includes("127.0.0.1");
      const connection = await mysql.createConnection({
        uri: process.env.DATABASE_URL,
        ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      });
      return drizzle(connection);
    } catch (error) {
      console.warn("[Database] Failed to create serverless connection:", error);
      return null;
    }
  }

  // In development/long-running server: use pool for connection reuse
  if (!_db && process.env.DATABASE_URL) {
    try {
      const useSsl = !process.env.DATABASE_URL.includes("localhost") && !process.env.DATABASE_URL.includes("127.0.0.1");
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot get user: database not available");
      return undefined;
    }

    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database Error] getUserByOpenId failed:", error);
    return undefined;
  }
}

// Products queries
export async function getActiveProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Sellers queries
export async function getSellerByUserId(userId: number) {
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

export async function getActiveSellers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sellers).where(eq(sellers.isActive, true)).orderBy(desc(sellers.rating));
}

// Used Products queries
export async function getApprovedUsedProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(usedProducts).where(eq(usedProducts.status, 'aprovado')).orderBy(desc(usedProducts.createdAt));
}

export async function getUsedProductsBySellerId(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(usedProducts).where(eq(usedProducts.sellerId, sellerId)).orderBy(desc(usedProducts.createdAt));
}

// Digital Products queries
export async function getActiveDigitalProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(digitalProducts).where(eq(digitalProducts.isActive, true)).orderBy(desc(digitalProducts.createdAt));
}

// Orders queries
export async function getOrdersByBuyerId(buyerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.buyerId, buyerId)).orderBy(desc(orders.createdAt));
}

export async function getOrdersBySellerId(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.sellerId, sellerId)).orderBy(desc(orders.createdAt));
}

// Coupons queries
export async function getCouponByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coupons).where(and(eq(coupons.code, code), eq(coupons.isActive, true))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Reviews queries
export async function getReviewsBySellerId(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.sellerId, sellerId)).orderBy(desc(reviews.createdAt));
}

// Platform Settings queries
export async function getPlatformSettings() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1);
  if (result.length === 0) {
    // Initialize if not exists
    await db.insert(platformSettings).values({ id: 1, commissionPercentage: "10" });
    return { id: 1, commissionPercentage: "10" };
  }
  return result[0];
}

export async function updatePlatformSettings(commissionPercentage: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(platformSettings).set({ commissionPercentage }).where(eq(platformSettings.id, 1));
}

// Balance, Order Confirmation, and Reviews (Escrow System)
export async function confirmOrderAndReview(orderId: number, buyerId: number, rating: number, comment?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = result[0];
  
  if (!order) {
    throw new Error("Pedido não encontrado");
  }
  
  if (order.buyerId !== buyerId) {
    throw new Error("Apenas o comprador pode confirmar o recebimento");
  }

  if (order.status !== 'pago' && order.status !== 'enviado') {
    throw new Error("Pedido não está em um estado válido para confirmação");
  }

  if (!order.sellerId) {
    throw new Error("Pedido não possui um vendedor associado");
  }

  // Get seller profile to update their rating stats
  const sellerProfileResult = await db.select().from(sellers).where(eq(sellers.userId, order.sellerId)).limit(1);
  const sellerProfile = sellerProfileResult[0];

  // Update order status
  await db.update(orders).set({ status: 'entregue' }).where(eq(orders.id, orderId));

  // Insert Review
  await db.insert(reviews).values({
    orderId: order.id,
    sellerId: sellerProfile?.id ?? order.sellerId, // Fallback to user ID if no specific seller profile
    buyerId: buyerId,
    rating: rating,
    comment: comment || null,
  });

  // Update Seller Rating if profile exists
  if (sellerProfile) {
    const currentTotalReviews = sellerProfile.totalReviews || 0;
    const currentRating = parseFloat(sellerProfile.rating || "0");
    const newTotalReviews = currentTotalReviews + 1;
    const newRating = ((currentRating * currentTotalReviews) + rating) / newTotalReviews;
    
    await db.update(sellers)
      .set({ 
        totalReviews: newTotalReviews, 
        rating: newRating.toFixed(2) 
      })
      .where(eq(sellers.id, sellerProfile.id));
  }

  // Add funds to seller balance (Escrow Release)
  const sellerUserResult = await db.select().from(users).where(eq(users.id, order.sellerId)).limit(1);
  const sellerUser = sellerUserResult[0];
  if (sellerUser) {
    const newBalance = (parseFloat(sellerUser.balance) + parseFloat(order.sellerAmount)).toString();
    await db.update(users).set({ balance: newBalance }).where(eq(users.id, order.sellerId));
  }

  return { success: true };
}
