import { eq, and, desc } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { InsertUser, InsertCoupon, users, sellers, products, usedProducts, digitalProducts, orders, reviews, coupons, platformSettings } from "../drizzle/schema";
import { ENV } from './_core/env';

/**
 * Returns a Drizzle ORM instance connected to Neon (PostgreSQL).
 * Neon serverless uses HTTP — no persistent connections needed.
 */
export function getDb() {
  if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL is not set");
    return null;
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    return drizzle(sql);
  } catch (error: any) {
    console.warn("[Database] Falha ao inicializar banco:", error.message);
    return null;
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "cpf"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.forteCoins !== undefined) {
      values.forteCoins = user.forteCoins;
      updateSet.forteCoins = user.forteCoins;
    }

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

    // PostgreSQL: onConflictDoUpdate (replaces MySQL's onDuplicateKeyUpdate)
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  try {
    const db = getDb();
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
  const db = getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
}

export async function getProductById(id: number) {
  const db = getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Sellers queries
export async function getSellerByUserId(userId: number) {
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

export async function getActiveSellers() {
  const db = getDb();
  if (!db) return [];
  return db.select().from(sellers).where(eq(sellers.isActive, true)).orderBy(desc(sellers.rating));
}

// Used Products queries
export async function getApprovedUsedProducts() {
  const db = getDb();
  if (!db) return [];
  return db.select().from(usedProducts).where(eq(usedProducts.status, 'aprovado')).orderBy(desc(usedProducts.createdAt));
}

export async function getUsedProductsBySellerId(sellerId: number) {
  const db = getDb();
  if (!db) return [];
  return db.select().from(usedProducts).where(eq(usedProducts.sellerId, sellerId)).orderBy(desc(usedProducts.createdAt));
}

// Digital Products queries
export async function getActiveDigitalProducts() {
  const db = getDb();
  if (!db) return [];
  return db.select().from(digitalProducts).where(eq(digitalProducts.isActive, true)).orderBy(desc(digitalProducts.createdAt));
}

// Orders queries
export async function getOrdersByBuyerId(buyerId: number) {
  const db = getDb();
  if (!db) return [];
  
  const results = await db
    .select({
      order: orders,
      product: products,
      usedProduct: usedProducts,
      digitalProduct: digitalProducts,
    })
    .from(orders)
    .leftJoin(products, eq(orders.productId, products.id))
    .leftJoin(usedProducts, eq(orders.usedProductId, usedProducts.id))
    .leftJoin(digitalProducts, eq(orders.digitalProductId, digitalProducts.id))
    .where(eq(orders.buyerId, buyerId))
    .orderBy(desc(orders.createdAt));

  return results.map(r => {
    let productName = "Produto";
    if (r.order.productType === "store" && r.product) {
      productName = r.product.name;
    } else if (r.order.productType === "used" && r.usedProduct) {
      productName = r.usedProduct.name;
    } else if (r.order.productType === "digital" && r.digitalProduct) {
      productName = r.digitalProduct.name;
    }
    return {
      ...r.order,
      productName,
    };
  });
}

export async function getOrdersBySellerId(sellerId: number) {
  const db = getDb();
  if (!db) return [];

  const results = await db
    .select({
      order: orders,
      product: products,
      usedProduct: usedProducts,
      digitalProduct: digitalProducts,
    })
    .from(orders)
    .leftJoin(products, eq(orders.productId, products.id))
    .leftJoin(usedProducts, eq(orders.usedProductId, usedProducts.id))
    .leftJoin(digitalProducts, eq(orders.digitalProductId, digitalProducts.id))
    .where(eq(orders.sellerId, sellerId))
    .orderBy(desc(orders.createdAt));

  return results.map(r => {
    let productName = "Produto";
    if (r.order.productType === "store" && r.product) {
      productName = r.product.name;
    } else if (r.order.productType === "used" && r.usedProduct) {
      productName = r.usedProduct.name;
    } else if (r.order.productType === "digital" && r.digitalProduct) {
      productName = r.digitalProduct.name;
    }
    return {
      ...r.order,
      productName,
    };
  });
}

export async function getAllOrdersWithDetails() {
  const db = getDb();
  if (!db) return [];

  const results = await db
    .select({
      order: orders,
      buyer: users,
      product: products,
      usedProduct: usedProducts,
      digitalProduct: digitalProducts,
    })
    .from(orders)
    .leftJoin(users, eq(orders.buyerId, users.id))
    .leftJoin(products, eq(orders.productId, products.id))
    .leftJoin(usedProducts, eq(orders.usedProductId, usedProducts.id))
    .leftJoin(digitalProducts, eq(orders.digitalProductId, digitalProducts.id))
    .orderBy(desc(orders.createdAt));

  return results.map(r => {
    let productName = "Produto";
    if (r.order.productType === "store" && r.product) {
      productName = r.product.name;
    } else if (r.order.productType === "used" && r.usedProduct) {
      productName = r.usedProduct.name;
    } else if (r.order.productType === "digital" && r.digitalProduct) {
      productName = r.digitalProduct.name;
    }
    return {
      ...r.order,
      buyerName: r.buyer?.name || "Sem Nome",
      buyerEmail: r.buyer?.email || "Sem E-mail",
      productName,
    };
  });
}

export async function deliverOrder(orderId: number, deliveryDetails: string) {
  const db = getDb();
  if (!db) throw new Error("Database not available");

  // Fetch order with buyer email and product name
  const orderResult = await db
    .select({
      order: orders,
      buyer: users,
      product: products,
      usedProduct: usedProducts,
      digitalProduct: digitalProducts,
    })
    .from(orders)
    .leftJoin(users, eq(orders.buyerId, users.id))
    .leftJoin(products, eq(orders.productId, products.id))
    .leftJoin(usedProducts, eq(orders.usedProductId, usedProducts.id))
    .leftJoin(digitalProducts, eq(orders.digitalProductId, digitalProducts.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  const orderInfo = orderResult[0];
  if (!orderInfo) throw new Error("Pedido não encontrado");

  await db
    .update(orders)
    .set({
      deliveryDetails,
      status: "enviado",
    })
    .where(eq(orders.id, orderId));

  // Send email asynchronously
  const buyerEmail = orderInfo.buyer?.email;
  if (buyerEmail) {
    let productName = "Produto";
    if (orderInfo.order.productType === "store" && orderInfo.product) {
      productName = orderInfo.product.name;
    } else if (orderInfo.order.productType === "used" && orderInfo.usedProduct) {
      productName = orderInfo.usedProduct.name;
    } else if (orderInfo.order.productType === "digital" && orderInfo.digitalProduct) {
      productName = orderInfo.digitalProduct.name;
    }

    try {
      const { sendDeliveryEmail } = await import("./email");
      await sendDeliveryEmail({
        to: buyerEmail,
        buyerName: orderInfo.buyer?.name || "Cliente",
        productName,
        deliveryDetails,
      });
    } catch (emailErr) {
      console.error("[Email] Erro ao enviar email de entrega:", emailErr);
    }
  }

  return { success: true };
}

// Coupons queries
export async function getCouponByCode(code: string) {
  const db = getDb();
  if (!db) return undefined;
  const result = await db.select().from(coupons).where(and(eq(coupons.code, code), eq(coupons.isActive, true))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllCoupons() {
  const db = getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function createCoupon(coupon: InsertCoupon) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(coupons).values(coupon);
}

export async function updateCoupon(id: number, updateData: Partial<InsertCoupon>) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  return db.update(coupons).set(updateData).where(eq(coupons.id, id));
}

export async function deleteCoupon(id: number) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(coupons).where(eq(coupons.id, id));
}

// Reviews queries
export async function getReviewsBySellerId(sellerId: number) {
  const db = getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.sellerId, sellerId)).orderBy(desc(reviews.createdAt));
}

// Platform Settings queries
export async function getPlatformSettings() {
  const db = getDb();
  if (!db) return undefined;
  const result = await db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1);
  if (result.length === 0) {
    // Initialize singleton row if not exists
    await db.insert(platformSettings).values({ id: 1, commissionPercentage: "10" }).onConflictDoNothing();
    return { id: 1, commissionPercentage: "10" };
  }
  return result[0];
}

export async function updatePlatformSettings(commissionPercentage: string) {
  const db = getDb();
  if (!db) return;
  await db.update(platformSettings).set({ commissionPercentage }).where(eq(platformSettings.id, 1));
}

// Balance, Order Confirmation, and Reviews (Escrow System)
export async function confirmOrderAndReview(orderId: number, buyerId: number, rating: number, comment?: string) {
  const db = getDb();
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
    sellerId: sellerProfile?.id ?? order.sellerId,
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
