import { eq, and, or, lte, desc, sql, inArray, like, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { InsertUser, InsertCoupon, users, sellers, products, usedProducts, digitalProducts, digitalProductAccounts, orders, reviews, coupons, platformSettings, adminDismissedNotifications, messages, platinumSubmissions } from "../drizzle/schema";
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
    const sqlClient = neon(process.env.DATABASE_URL);
    return drizzle(sqlClient);
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
    const userEmailLower = user.email?.toLowerCase().trim();
    const ADMIN_EMAILS = [
      "luanmnogueira@gmail.com",
      "enfortec@admin.com",
      "luiz220190@hotmail.com",
      "sandrinhooperfectt@gmail.com"
    ];

    const isAdmin = user.openId === ENV.ownerOpenId || (userEmailLower && ADMIN_EMAILS.includes(userEmailLower));
    const roleToSet = user.role || (isAdmin ? 'admin' : 'user');

    // Busca se já existe por openId ou por email
    let existingUser = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1).then(r => r[0]);
    if (!existingUser && userEmailLower) {
      existingUser = await db.select().from(users).where(sql`LOWER(${users.email}) = ${userEmailLower}`).limit(1).then(r => r[0]);
    }

    if (existingUser) {
      // Otimização para economizar armazenamento no Neon (evita dead tuples desnecessários):
      // Só atualiza lastSignedIn se o último registro for de mais de 12 horas atrás
      const now = new Date();
      const lastSigned = existingUser.lastSignedIn ? new Date(existingUser.lastSignedIn).getTime() : 0;
      const twelveHoursAgo = now.getTime() - 12 * 60 * 60 * 1000;
      const shouldUpdateLastSigned = lastSigned < twelveHoursAgo;

      const updateData: any = {};
      let hasChanges = false;

      if (user.openId !== existingUser.openId) {
        updateData.openId = user.openId;
        hasChanges = true;
      }
      if (shouldUpdateLastSigned) {
        updateData.lastSignedIn = user.lastSignedIn || now;
        hasChanges = true;
      }
      if (isAdmin && existingUser.role !== 'admin') {
        updateData.role = 'admin';
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
      if (user.forteCoins !== undefined && user.forteCoins !== existingUser.forteCoins) {
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
      const insertData: any = {
        openId: user.openId,
        name: user.name || "User",
        email: user.email || null,
        loginMethod: user.loginMethod || "firebase",
        role: roleToSet,
        lastSignedIn: user.lastSignedIn || new Date(),
        forteCoins: user.forteCoins ?? 10
      };
      if (user.cpf) insertData.cpf = user.cpf;

      await db.insert(users).values(insertData).onConflictDoUpdate({
        target: users.openId,
        set: {
          name: user.name || "User",
          email: user.email || null,
          role: roleToSet,
          lastSignedIn: user.lastSignedIn || new Date()
        }
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
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
    console.error("[Database] Failed to get user by openId:", error);
    return undefined;
  }
}

export async function getUserById(id: number) {
  try {
    const db = getDb();
    if (!db || !id) return undefined;
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get user by id:", error);
    return undefined;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const db = getDb();
    if (!db || !email) return undefined;
    const cleanEmail = email.toLowerCase().trim();
    const result = await db.select().from(users).where(sql`LOWER(${users.email}) = ${cleanEmail}`).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get user by email:", error);
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

/** Atualiza o telefone/WhatsApp de contato do próprio usuário logado. */
export async function updateUserPhone(userId: number, phone: string) {
  const database = getDb();
  if (!database) throw new Error("Database not available");
  await database.update(users).set({ phone }).where(eq(users.id, userId));
  return { success: true };
}

/** Bane um usuário: bloqueia qualquer ação autenticada dele e desativa a loja, se tiver. */
export async function banUser(userId: number) {
  const database = getDb();
  if (!database) throw new Error("Database not available");

  const target = await getUserById(userId);
  if (target?.role === "admin") {
    throw new Error("Não é possível banir uma conta de administrador.");
  }

  await database.update(users).set({ isBanned: true }).where(eq(users.id, userId));
  await database.update(sellers).set({ isActive: false }).where(eq(sellers.userId, userId));
  return { success: true };
}

/** Reverte o banimento: reativa o login e a loja (se ele tiver uma). */
export async function unbanUser(userId: number) {
  const database = getDb();
  if (!database) throw new Error("Database not available");
  await database.update(users).set({ isBanned: false }).where(eq(users.id, userId));
  await database.update(sellers).set({ isActive: true }).where(eq(sellers.userId, userId));
  return { success: true };
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

/**
 * Visão completa de uma loja/vendedor pro admin: dados de contato, produtos anunciados
 * (usados e digitais) e histórico de vendas. `sellerId` aqui é o PK da tabela `sellers`
 * (o mesmo "ID #7" já mostrado nos cards de produto no admin) — diferente de
 * `orders.sellerId`, que é o `users.id` direto, então o histórico de vendas usa
 * `seller.userId` pra buscar corretamente.
 */
export async function getSellerFullDetails(sellerId: number) {
  const db = getDb();
  if (!db) return null;

  const sellerResult = await db
    .select({ seller: sellers, user: users })
    .from(sellers)
    .leftJoin(users, eq(sellers.userId, users.id))
    .where(eq(sellers.id, sellerId))
    .limit(1);

  const row = sellerResult[0];
  if (!row) return null;

  const [usedProductsList, digitalProductsList, salesHistory] = await Promise.all([
    getUsedProductsBySellerId(sellerId),
    getDigitalProductsBySellerId(sellerId),
    row.seller.userId ? getOrdersBySellerId(row.seller.userId) : Promise.resolve([]),
  ]);

  return {
    seller: row.seller,
    contactName: row.user?.name || null,
    contactEmail: row.user?.email || null,
    contactPhone: row.user?.phone || null,
    isBanned: row.user?.isBanned ?? false,
    usedProducts: usedProductsList,
    digitalProducts: digitalProductsList,
    orders: salesHistory,
  };
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
  // Junta com sellers/users pra expor o nome real do vendedor (em vez do genérico
  // "Usuário Verificado") e o openId (uid do Firebase) — sem ele, o chat "Falar com
  // Vendedor" gravava o id interno da linha de sellers, que não bate com o uid usado
  // pelo painel do vendedor pra filtrar as conversas, e a mensagem nunca chegava.
  const rows = await db
    .select({
      product: usedProducts,
      sellerName: users.name,
      sellerOpenId: users.openId,
    })
    .from(usedProducts)
    .leftJoin(sellers, eq(usedProducts.sellerId, sellers.id))
    .leftJoin(users, eq(sellers.userId, users.id))
    .where(eq(usedProducts.status, 'aprovado'))
    .orderBy(desc(usedProducts.createdAt));
  return rows.map((r) => ({ ...r.product, sellerName: r.sellerName, sellerOpenId: r.sellerOpenId }));
}

export async function getUsedProductsBySellerId(sellerId: number) {
  const db = getDb();
  if (!db) return [];
  return db.select().from(usedProducts).where(eq(usedProducts.sellerId, sellerId)).orderBy(desc(usedProducts.createdAt));
}

/**
 * Anúncios físicos visíveis no painel "Meus Produtos" de uma conta.
 * Contas admin (Luan/André/Sandro) enxergam o estoque compartilhado da loja —
 * todos os anúncios cadastrados por QUALQUER conta admin, não só a própria —
 * já que os três gerenciam o mesmo negócio, não vendedores independentes.
 */
export async function getUsedProductsForAccount(userId: number, isAdminAccount: boolean) {
  const db = getDb();
  if (!db) return [];
  if (isAdminAccount) {
    const rows = await db
      .select({ product: usedProducts })
      .from(usedProducts)
      .innerJoin(sellers, eq(usedProducts.sellerId, sellers.id))
      .innerJoin(users, eq(sellers.userId, users.id))
      .where(eq(users.role, "admin"))
      .orderBy(desc(usedProducts.createdAt));
    return rows.map((r) => r.product);
  }
  const seller = await getSellerByUserId(userId);
  if (!seller) return [];
  return getUsedProductsBySellerId(seller.id);
}

export async function getAllUsedProductsWithSeller() {
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .select({
      product: usedProducts,
      sellerStoreName: sellers.storeName,
      sellerEmail: users.email,
      sellerName: users.name,
      directUserEmail: sql<string | null>`(SELECT email FROM users WHERE id = ${usedProducts.sellerId} LIMIT 1)`,
      directUserName: sql<string | null>`(SELECT name FROM users WHERE id = ${usedProducts.sellerId} LIMIT 1)`,
    })
    .from(usedProducts)
    .leftJoin(sellers, eq(usedProducts.sellerId, sellers.id))
    .leftJoin(users, eq(sellers.userId, users.id))
    .orderBy(desc(usedProducts.createdAt));
  return rows.map(r => ({
    ...r.product,
    sellerStoreName: r.sellerStoreName || undefined,
    sellerEmail: r.sellerEmail || r.directUserEmail || undefined,
    sellerName: r.sellerName || r.directUserName || undefined,
  }));
}

// Digital Products queries
export async function getActiveDigitalProducts() {
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .select({
      product: digitalProducts,
      sellerName: users.name,
      sellerOpenId: users.openId,
    })
    .from(digitalProducts)
    .leftJoin(sellers, eq(digitalProducts.sellerId, sellers.id))
    .leftJoin(users, eq(sellers.userId, users.id))
    .where(
      and(
        or(eq(digitalProducts.isActive, true), lte(digitalProducts.stock, 0)),
        eq(digitalProducts.status, "aprovado")
      )
    )
    .orderBy(desc(digitalProducts.createdAt));
  return rows.map((r) => {
    const p = r.product;
    const pricePrimary = (p.pricePrimary !== null && p.pricePrimary !== undefined && p.pricePrimary !== "")
      ? p.pricePrimary
      : (!p.priceSecondary && p.price ? p.price : null);
    return { ...p, pricePrimary, sellerName: r.sellerName, sellerOpenId: r.sellerOpenId };
  });
}

export async function getAllDigitalProducts() {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select().from(digitalProducts).orderBy(desc(digitalProducts.createdAt));
  return rows.map((p) => {
    const pricePrimary = (p.pricePrimary !== null && p.pricePrimary !== undefined && p.pricePrimary !== "")
      ? p.pricePrimary
      : (!p.priceSecondary && p.price ? p.price : null);
    return { ...p, pricePrimary };
  });
}

export async function getAllDigitalProductsWithSeller() {
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .select({
      product: digitalProducts,
      sellerStoreName: sellers.storeName,
      sellerEmail: users.email,
      sellerName: users.name,
      directUserEmail: sql<string | null>`(SELECT email FROM users WHERE id = ${digitalProducts.sellerId} LIMIT 1)`,
      directUserName: sql<string | null>`(SELECT name FROM users WHERE id = ${digitalProducts.sellerId} LIMIT 1)`,
    })
    .from(digitalProducts)
    .leftJoin(sellers, eq(digitalProducts.sellerId, sellers.id))
    .leftJoin(users, eq(sellers.userId, users.id))
    .orderBy(desc(digitalProducts.createdAt));
  return rows.map((r) => {
    const p = r.product;
    const pricePrimary = (p.pricePrimary !== null && p.pricePrimary !== undefined && p.pricePrimary !== "")
      ? p.pricePrimary
      : (!p.priceSecondary && p.price ? p.price : null);
    return {
      ...p,
      pricePrimary,
      sellerStoreName: r.sellerStoreName || undefined,
      sellerEmail: r.sellerEmail || r.directUserEmail || undefined,
      sellerName: r.sellerName || r.directUserName || undefined,
    };
  });
}

export async function getDigitalProductsBySellerId(sellerId: number) {
  const db = getDb();
  if (!db) return [];
  return db.select().from(digitalProducts).where(eq(digitalProducts.sellerId, sellerId)).orderBy(desc(digitalProducts.createdAt));
}

/** Mesma lógica de getUsedProductsForAccount, para contas digitais. */
export async function getDigitalProductsForAccount(userId: number, isAdminAccount: boolean) {
  const db = getDb();
  if (!db) return [];
  if (isAdminAccount) {
    const rows = await db
      .select({ product: digitalProducts })
      .from(digitalProducts)
      .innerJoin(sellers, eq(digitalProducts.sellerId, sellers.id))
      .innerJoin(users, eq(sellers.userId, users.id))
      .where(eq(users.role, "admin"))
      .orderBy(desc(digitalProducts.createdAt));
    return rows.map((r) => r.product);
  }
  const seller = await getSellerByUserId(userId);
  if (!seller) return [];
  return getDigitalProductsBySellerId(seller.id);
}

function deduplicateOrders<T extends { id: number; paymentId?: string | null }>(items: T[]): T[] {
  const seenPaymentIds = new Set<string>();
  const seenIds = new Set<number>();
  const deduped: T[] = [];

  for (const item of items) {
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);

    if (item.paymentId && item.paymentId.trim() !== "") {
      if (seenPaymentIds.has(item.paymentId)) {
        continue;
      }
      seenPaymentIds.add(item.paymentId);
    }
    deduped.push(item);
  }
  return deduped;
}

// Orders queries
export async function getOrdersByBuyerId(buyerId: number) {
  const db = getDb();
  if (!db) return [];

  // Junta com users (aliado) pra expor o openId (uid do Firebase) e nome do vendedor —
  // orders.sellerId já é o users.id direto (não sellers.id, diferente de usedProducts).
  // Sem isso o botão "Falar com Vendedor" de Minhas Compras não tinha pra quem mandar o
  // sellerId e a conversa caía sempre na Loja Eforte, mesmo em pedidos de vendedor real.
  const sellerUsers = alias(users, "sellerUsers");

  const results = await db
    .select({
      order: orders,
      product: products,
      usedProduct: usedProducts,
      digitalProduct: digitalProducts,
      sellerOpenId: sellerUsers.openId,
      sellerName: sellerUsers.name,
    })
    .from(orders)
    .leftJoin(products, eq(orders.productId, products.id))
    .leftJoin(usedProducts, eq(orders.usedProductId, usedProducts.id))
    .leftJoin(digitalProducts, eq(orders.digitalProductId, digitalProducts.id))
    .leftJoin(sellerUsers, eq(orders.sellerId, sellerUsers.id))
    .where(eq(orders.buyerId, buyerId))
    .orderBy(desc(orders.createdAt));

  const mapped = results.map(r => {
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
      productName,
      sellerOpenId: r.sellerOpenId,
      sellerName: r.sellerName,
    };
  });

  return deduplicateOrders(mapped);
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

  const mapped = results.map(r => {
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
      productName,
    };
  });

  return deduplicateOrders(mapped);
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

  const mapped = results.map(r => {
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
      buyerOpenId: r.buyer?.openId || null,
      productName,
    };
  });

  return deduplicateOrders(mapped);
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
    let productName = orderInfo.order.productName || "Produto";
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

/**
 * Reivindica atomicamente uma conta "disponivel" do pool de um jogo e a marca como
 * "entregue" para o pedido informado. A subquery com FOR UPDATE SKIP LOCKED dentro do
 * UPDATE garante, no próprio Postgres, que duas compras simultâneas nunca recebem a
 * mesma conta — mesmo sobre o driver HTTP do Neon, que executa cada chamada como uma
 * única instrução atômica (não precisa de BEGIN/COMMIT explícito).
 *
 * Também sobrescreve digitalProducts.stock com a contagem real de contas "disponivel"
 * restantes, mantendo esse campo (já usado em toda a loja/admin) sempre fiel à
 * realidade para jogos que usam esse pool.
 *
 * Retorna a conta reivindicada, ou null se não havia nenhuma "disponivel" (jogo não usa
 * o pool, ou o estoque zerou) — quem chama deve tratar null como "sem entrega
 * automática, segue pro fluxo manual existente".
 */
export async function claimDigitalProductAccount(
  database: any,
  digitalProductId: number,
  orderId: number
): Promise<{ email: string; password: string } | null> {
  const claimResult: any = await database.execute(sql`
    UPDATE "digitalProductAccounts"
    SET status = 'entregue', "orderId" = ${orderId}, "deliveredAt" = now()
    WHERE id = (
      SELECT id FROM "digitalProductAccounts"
      WHERE "digitalProductId" = ${digitalProductId} AND status = 'disponivel'
      ORDER BY id
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, email, password
  `);
  const claimedRows: any[] = Array.isArray(claimResult) ? claimResult : (claimResult?.rows ?? []);
  const claimed = claimedRows[0];
  if (!claimed) return null;

  await syncDigitalProductAccountStock(database, digitalProductId);

  return { email: claimed.email, password: claimed.password };
}

/**
 * Tenta entregar automaticamente uma conta do pool para um pedido de jogo digital recém
 * criado. Chamada nos dois pontos do fluxo de pagamento que confirmam uma compra digital
 * (server/_core/payment.ts: handleWebhook e o caminho 100% ForteCoins/cupom do
 * handleCheckout). Não lança erro se algo falhar no envio do email — só loga — pra nunca
 * quebrar o registro do pedido, que já aconteceu antes dessa chamada.
 */
export async function attemptAutoDeliverDigitalOrder(
  database: any,
  params: { orderId: number; digitalProductId: number; buyerId: number; productName: string }
) {
  const { orderId, digitalProductId, buyerId, productName } = params;

  const account = await claimDigitalProductAccount(database, digitalProductId, orderId);
  if (!account) return { delivered: false as const };

  const deliveryDetails = `Email: ${account.email}\nSenha: ${account.password}`;
  await database.update(orders).set({ deliveryDetails, status: "enviado" }).where(eq(orders.id, orderId));

  const buyerResult = await database.select().from(users).where(eq(users.id, buyerId)).limit(1);
  const buyer = buyerResult[0];
  if (buyer?.email) {
    try {
      const { sendDeliveryEmail } = await import("./email");
      await sendDeliveryEmail({
        to: buyer.email,
        buyerName: buyer.name || "Cliente",
        productName,
        deliveryDetails,
      });
    } catch (emailErr) {
      console.error("[Email] Erro ao enviar email de entrega automática:", emailErr);
    }
  }

  return { delivered: true as const, deliveryDetails };
}

/** Recalcula digitalProducts.stock a partir da contagem real de contas "disponivel". */
async function syncDigitalProductAccountStock(database: any, digitalProductId: number) {
  const countResult: any = await database.execute(sql`
    SELECT COUNT(*)::int AS count FROM "digitalProductAccounts"
    WHERE "digitalProductId" = ${digitalProductId} AND status = 'disponivel'
  `);
  const countRows: any[] = Array.isArray(countResult) ? countResult : (countResult?.rows ?? []);
  const remaining = countRows[0]?.count ?? 0;
  await database.update(digitalProducts).set({ stock: remaining }).where(eq(digitalProducts.id, digitalProductId));
  return remaining;
}

/** Resumo do pool de contas de TODOS os jogos de uma vez (pra aba "Estoque" do admin), sem N+1. */
export async function listDigitalProductAccountsSummary(): Promise<
  Record<number, { available: number; delivered: number }>
> {
  const database = getDb();
  if (!database) throw new Error("Database not available");

  const result: any = await database.execute(sql`
    SELECT "digitalProductId" AS "digitalProductId",
      COUNT(*) FILTER (WHERE status = 'disponivel')::int AS available,
      COUNT(*) FILTER (WHERE status = 'entregue')::int AS delivered
    FROM "digitalProductAccounts"
    GROUP BY "digitalProductId"
  `);
  const rows: any[] = Array.isArray(result) ? result : (result?.rows ?? []);

  const summary: Record<number, { available: number; delivered: number }> = {};
  for (const row of rows) {
    summary[row.digitalProductId] = { available: row.available, delivered: row.delivered };
  }
  return summary;
}

/** Lista as contas do pool de um jogo: disponíveis (com credenciais) + contagem de entregues. */
export async function listDigitalProductAccounts(digitalProductId: number) {
  const database = getDb();
  if (!database) throw new Error("Database not available");

  const available = await database
    .select({ id: digitalProductAccounts.id, email: digitalProductAccounts.email, password: digitalProductAccounts.password })
    .from(digitalProductAccounts)
    .where(and(eq(digitalProductAccounts.digitalProductId, digitalProductId), eq(digitalProductAccounts.status, "disponivel")))
    .orderBy(digitalProductAccounts.id);

  const deliveredCountResult = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(digitalProductAccounts)
    .where(and(eq(digitalProductAccounts.digitalProductId, digitalProductId), eq(digitalProductAccounts.status, "entregue")));

  return { available, deliveredCount: deliveredCountResult[0]?.count ?? 0 };
}

/** Adiciona várias contas de uma vez (uma por linha, "email:senha" ou "email;senha"). */
export async function addDigitalProductAccountsBulk(digitalProductId: number, rawText: string) {
  const database = getDb();
  if (!database) throw new Error("Database not available");

  const rows = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[:;]/);
      const email = parts[0]?.trim();
      const password = parts.slice(1).join(":").trim();
      return { email, password };
    })
    .filter((r) => r.email && r.password);

  if (rows.length === 0) return { inserted: 0, available: 0 };

  await database.insert(digitalProductAccounts).values(
    rows.map((r) => ({ digitalProductId, email: r.email, password: r.password }))
  );

  const remaining = await syncDigitalProductAccountStock(database, digitalProductId);
  return { inserted: rows.length, available: remaining };
}

/** Remove uma conta ainda não entregue (contas já usadas em um pedido ficam preservadas). */
export async function removeDigitalProductAccount(id: number) {
  const database = getDb();
  if (!database) throw new Error("Database not available");

  const existing = await database.select().from(digitalProductAccounts).where(eq(digitalProductAccounts.id, id)).limit(1);
  const account = existing[0];
  if (!account) throw new Error("Conta não encontrada");
  if (account.status !== "disponivel") throw new Error("Essa conta já foi entregue em um pedido e não pode ser removida");

  await database.delete(digitalProductAccounts).where(eq(digitalProductAccounts.id, id));
  const remaining = await syncDigitalProductAccountStock(database, account.digitalProductId);
  return { available: remaining };
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
  const rows = await db
    .select({ review: reviews, buyerName: users.name })
    .from(reviews)
    .leftJoin(users, eq(reviews.buyerId, users.id))
    .where(eq(reviews.sellerId, sellerId))
    .orderBy(desc(reviews.createdAt));
  return rows.map((r) => ({ ...r.review, buyerName: r.buyerName }));
}

// Platform Settings queries
export async function getPlatformSettings() {
  const db = getDb();
  if (!db) return undefined;
  const result = await db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1);
  if (result.length === 0) {
    // Initialize singleton row if not exists
    await db.insert(platformSettings).values({ id: 1, commissionPercentage: "6" }).onConflictDoNothing();
    return {
      id: 1, commissionPercentage: "6", vipWhatsappUrl: null, maxCoinsPerPurchase: 10, maxCoinsPreVenda: 50,
      supportWhatsapp: "554384253691", deliveryHelpVideo1Url: null, deliveryHelpVideo2Url: null,
    };
  }
  return result[0];
}

export async function updatePlatformSettings(data: {
  commissionPercentage?: string,
  vipWhatsappUrl?: string,
  maxCoinsPerPurchase?: number,
  maxCoinsPreVenda?: number,
  supportWhatsapp?: string,
  deliveryHelpVideo1Url?: string | null,
  deliveryHelpVideo2Url?: string | null,
}) {
  const db = getDb();
  if (!db) return;
  await db.update(platformSettings).set(data).where(eq(platformSettings.id, 1));
}

// IDs dispensados na Central de Notificações do admin — nunca apaga o chat/pedido/
// resgate/indicação de verdade, só a marcação de "não mostrar mais" na lista.
export async function getDismissedNotificationIds(): Promise<string[]> {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select().from(adminDismissedNotifications);
  return rows.map(r => r.id);
}

export async function dismissNotifications(ids: string[]) {
  const db = getDb();
  if (!db || ids.length === 0) return;
  await db.insert(adminDismissedNotifications).values(ids.map(id => ({ id }))).onConflictDoNothing();
}

export async function restoreNotifications(ids: string[]) {
  const db = getDb();
  if (!db || ids.length === 0) return;
  await db.delete(adminDismissedNotifications).where(inArray(adminDismissedNotifications.id, ids));
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

  // Update order status — condicionado ao status que acabamos de ler (compare-and-swap).
  // Sem essa trava, duas requisições concorrentes (clique duplo, retry de rede) passavam
  // pela checagem de status acima antes de qualquer uma escrever, e as duas creditavam o
  // saldo do vendedor — pagando a mesma venda duas vezes.
  const updateResult = await db
    .update(orders)
    .set({ status: 'entregue' })
    .where(and(eq(orders.id, orderId), eq(orders.status, order.status)))
    .returning({ id: orders.id });

  if (updateResult.length === 0) {
    throw new Error("Este pedido já foi confirmado em outra requisição.");
  }

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

export async function updateOrderStatus(orderId: number, status: "pendente" | "pago" | "enviado" | "entregue" | "cancelado") {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  return db.update(orders).set({ status }).where(eq(orders.id, orderId));
}

export async function deleteOrder(orderId: number) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(orders).where(eq(orders.id, orderId));
}

export async function getRecentReviews() {
  const db = getDb();
  if (!db) return [];
  
  const results = await db.select({
    review: reviews,
    buyer: users,
    order: orders,
    product: products,
    digitalProduct: digitalProducts,
    usedProduct: usedProducts,
  })
  .from(reviews)
  .leftJoin(users, eq(reviews.buyerId, users.id))
  .leftJoin(orders, eq(reviews.orderId, orders.id))
  .leftJoin(products, eq(orders.productId, products.id))
  .leftJoin(digitalProducts, eq(orders.digitalProductId, digitalProducts.id))
  .leftJoin(usedProducts, eq(orders.usedProductId, usedProducts.id))
  .orderBy(desc(reviews.createdAt))
  .limit(50);

  return results.map(r => {
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
      productName: productName,
    };
  });
}

/**
 * Rotina de limpeza periódica de dados temporários e logs antigos
 * Mantém o banco de dados leve e sempre dentro do plano gratuito (< 500 MB).
 */
export async function runDatabaseCleanup() {
  const db = getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Apaga mensagens de chat antigas (> 60 dias)
    await db.delete(messages).where(lt(messages.createdAt, sixtyDaysAgo));

    // 2. Apaga notificações dispensadas antigas (> 30 dias)
    await db.delete(adminDismissedNotifications).where(lt(adminDismissedNotifications.dismissedAt, thirtyDaysAgo));

    // 3. Apaga submissões de platina rejeitadas antigas (> 60 dias)
    await db.delete(platinumSubmissions).where(
      and(
        eq(platinumSubmissions.status, "rejeitado"),
        lt(platinumSubmissions.submittedAt, sixtyDaysAgo)
      )
    );

    console.log("[Database Cleanup] Rotina de limpeza executada com sucesso.");
    return { success: true, timestamp: new Date().toISOString() };
  } catch (err: any) {
    console.error("[Database Cleanup] Erro ao executar limpeza:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Consulta estatísticas detalhadas de uso de armazenamento do PostgreSQL (Neon)
 */
export async function getDatabaseStorageStats() {
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
    const dbSizeResult: any = await db.execute(rawSql);

    const tablesSql = sql`
      SELECT
        relname AS table_name,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
        pg_total_relation_size(relid) AS total_bytes
      FROM pg_catalog.pg_statio_user_tables
      ORDER BY pg_total_relation_size(relid) DESC;
    `;
    const tablesResult: any = await db.execute(tablesSql);

    const totalBytes = Number(dbSizeResult?.rows?.[0]?.total_bytes || 0);
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
    const freeTierLimitMb = 500; // Plano gratuito Neon 500 MB
    const usagePercentage = ((Number(totalMb) / freeTierLimitMb) * 100).toFixed(2);

    return {
      databaseName: dbSizeResult?.rows?.[0]?.database_name || "neondb",
      totalSize: dbSizeResult?.rows?.[0]?.total_size || "0 MB",
      totalMb: Number(totalMb),
      freeTierLimitMb,
      usagePercentage: `${usagePercentage}%`,
      tables: tablesResult?.rows || []
    };
  } catch (error: any) {
    console.warn("[Database Stats] Erro ao buscar métricas de armazenamento:", error.message);
    return null;
  }
}

