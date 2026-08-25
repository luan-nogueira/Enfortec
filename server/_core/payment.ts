import { Express } from "express";
import axios from "axios";
import * as db from "../db";
import { orders, users, coupons, platinadorSubscriptions, products, usedProducts, digitalProducts } from "../../drizzle/schema";
import { verifyFirebaseToken } from "./context";
import { eq } from "drizzle-orm";

const PLATINADOR_SUBSCRIPTION_PRICE = 35.0;

// Preço da conta primária/secundária de um produto digital, com a mesma regra usada
// no front (client/src/pages/DigitalMedia.tsx: getProductPrice) — precisa bater
// exatamente, senão o preço "verificado" no servidor diverge do que foi cobrado.
function computeDigitalPrice(p: { price: string; pricePrimary: string | null; priceSecondary: string | null }, accountType?: string): number {
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
    throw new Error("Conta primária não disponível para este produto.");
  }
  const primaryPrice = p.pricePrimary ? parseFloat(p.pricePrimary) : basePrice;
  return Math.max(0, primaryPrice);
}

export function registerPaymentRoute(app: Express) {
  // Rota de busca automática de capas de jogos no Steam
  app.get("/api/games/search-cover", async (req, res) => {
    try {
      const rawTerm = req.query.term as string;
      if (!rawTerm) {
        return res.status(400).json({ success: false, error: "Termo de busca é obrigatório." });
      }

      const term = rawTerm
        .replace(/\b(PS4\/PS5|PS5|PS4|XBOX|PC)\b/gi, "")
        .replace(/\b(MÍDIA|MIDIA|DIGITAL|CONTA|COMPARTILHADA|PRIMÁRIA|SECUNDÁRIA)\b/gi, "")
        .trim();

      const steamUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term || rawTerm)}&l=portuguese&cc=BR`;
      const response = await axios.get(steamUrl);
      const data = response.data;

      if (data && data.items && data.items.length > 0) {
        const item = data.items[0];
        const appId = item.id;
        const coverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
        
        return res.json({
          success: true,
          name: item.name,
          imageUrl: coverUrl,
          price: item.price ? (item.price.final / 100) : 0
        });
      }

      return res.status(404).json({ success: false, error: "Jogo não encontrado no Steam." });
    } catch (error: any) {
      console.error("[Cover Search] Erro ao buscar capa:", error.message);
      return res.status(500).json({ success: false, error: "Erro interno ao buscar capa do jogo." });
    }
  });

  // ─── Diagnóstico & Estatísticas de Armazenamento do Banco (PostgreSQL Neon) ────
  app.get("/api/admin/db-stats", async (req, res) => {
    try {
      const stats = await db.getDatabaseStorageStats();
      if (!stats) {
        return res.status(500).json({ success: false, error: "Falha ao obter métricas do banco de dados." });
      }
      return res.json({ success: true, ...stats });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── Limpeza Periódica de Dados Antigos (Chat, Notificações dispensadas) ───────
  app.post("/api/admin/db-cleanup", async (req, res) => {
    try {
      const result = await db.runDatabaseCleanup();
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── Diagnóstico do Mercado Pago ──────────────────────────────────────────────
  app.get("/api/test-mercadopago", async (req, res) => {
    const hasToken = !!process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const tokenPreview = process.env.MERCADO_PAGO_ACCESS_TOKEN
      ? `${process.env.MERCADO_PAGO_ACCESS_TOKEN.substring(0, 10)}...`
      : "NÃO CONFIGURADO";

    return res.json({
      configured: hasToken,
      tokenPreview,
      hasWebhookSecret: !!process.env.MERCADO_PAGO_WEBHOOK_SECRET,
      message: hasToken ? "Mercado Pago configurado com sucesso." : "MERCADO_PAGO_ACCESS_TOKEN ausente nas variáveis de ambiente."
    });
  });

  // ─── Handler Unificado de Checkout (Mercado Pago com fallback) ────────────────
  const handleCheckout = async (req: any, res: any) => {
    try {
      const { name, quantity = 1, redirectUrl, productType = "store", productId, sellerId, customer, couponCode, accountType, consoleType } = req.body;
      const customerPhone: string = customer?.phone_number || "";

      if (!name) {
        return res.status(400).json({ success: false, error: "Nome do produto é obrigatório." });
      }

      // Tenta obter o ID do comprador a partir do token Firebase
      let buyerId = 0;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const decoded = await verifyFirebaseToken(token);
        if (decoded && decoded.sub) {
          const user = await db.getUserByOpenId(decoded.sub);
          if (user) {
            buyerId = user.id;
          }
        }
      }

      // Tenta obter o ID do vendedor (PostgreSQL) a partir do sellerId (Firebase UID)
      let mysqlSellerId: number | null = null;
      if (sellerId) {
        const sellerUser = await db.getUserByOpenId(sellerId);
        if (sellerUser) {
          mysqlSellerId = sellerUser.id;
        }
      }

      const database = await db.getDb();
      if (!database) {
        return res.status(500).json({ success: false, error: "Banco de dados indisponível." });
      }

      // ── Preço verificado no servidor (nunca confia no `price` enviado pelo cliente) ──
      let verifiedPrice: number | null = null;
      let realProductName: string | null = null;
      let verifiedIsPreVenda = false;
      if (productType === "platinador") {
        verifiedPrice = PLATINADOR_SUBSCRIPTION_PRICE;
      } else if (productId) {
        const pid = parseInt(String(productId));
        if (!isNaN(pid)) {
          if (productType === "store") {
            const rows = await database.select().from(products).where(eq(products.id, pid)).limit(1);
            if (rows[0]) { verifiedPrice = parseFloat(rows[0].price); realProductName = rows[0].name; }
          } else if (productType === "used") {
            const rows = await database.select().from(usedProducts).where(eq(usedProducts.id, pid)).limit(1);
            if (rows[0]) { verifiedPrice = parseFloat(rows[0].price); realProductName = rows[0].name; }
          } else if (productType === "digital") {
            const rows = await database.select().from(digitalProducts).where(eq(digitalProducts.id, pid)).limit(1);
            if (rows[0]) { verifiedPrice = computeDigitalPrice(rows[0], accountType); realProductName = rows[0].name; verifiedIsPreVenda = !!rows[0].isPreVenda; }
          }
        }
      }

      if (verifiedPrice === null) {
        console.warn(`[Checkout] Preço não pôde ser verificado — productType=${productType}, productId=${productId}`);
        return res.status(400).json({ success: false, error: "Não foi possível confirmar o preço deste produto. Atualize a página e tente novamente." });
      }

      let productNameStr: string = realProductName || name || "Produto";

      // Detecta consoleType (PS4 ou PS5) se enviado explicitamente ou se embutido no nome do produto
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
        if (!productNameStr.toLowerCase().includes("secundária") && !productNameStr.toLowerCase().includes("secundaria")) {
          productNameStr += " (Conta Secundária)";
        }
      } else if (accountType === "primaria") {
        if (!productNameStr.toLowerCase().includes("primária") && !productNameStr.toLowerCase().includes("primaria")) {
          productNameStr += " (Conta Primária)";
        }
      }

      // ── ForteCoins verificadas no servidor ──
      const platformSettingsForCoins = await db.getPlatformSettings();
      const MAX_COINS_PER_PURCHASE = verifiedIsPreVenda
        ? (platformSettingsForCoins?.maxCoinsPreVenda ?? 50)
        : (platformSettingsForCoins?.maxCoinsPerPurchase ?? 10);
      let verifiedCoinsToUse = 0;
      if (buyerId > 0 && Number(req.body.coinsToUse) > 0) {
        const buyerRows = await database.select().from(users).where(eq(users.id, buyerId)).limit(1);
        const realBalance = buyerRows[0]?.forteCoins || 0;
        verifiedCoinsToUse = Math.min(Math.floor(Number(req.body.coinsToUse)) || 0, realBalance, MAX_COINS_PER_PURCHASE);
      }

      // Valida o cupom se fornecido
      let couponDiscount = 0;
      let validCouponCode: string | null = null;
      if (couponCode) {
        const coupon = await db.getCouponByCode(couponCode.toUpperCase().trim());
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
            console.warn(`[Checkout] Cupom ${couponCode} está expirado ou esgotado.`);
          }
        } else {
          console.warn(`[Checkout] Cupom ${couponCode} não foi encontrado ou está inativo.`);
        }
      }

      // Calcula o desconto: 10 ForteCoins = R$ 1,00
      const coinsDiscount = verifiedCoinsToUse * 0.10;
      const originalPrice = verifiedPrice;
      const finalPrice = Math.max(0, originalPrice - couponDiscount - coinsDiscount);

      // Se o desconto cobrir 100% do preço do produto, finaliza diretamente sem gateway
      if (finalPrice <= 0) {
        let commissionPct = "6.00";
        try {
          const settings = await db.getPlatformSettings();
          if (settings?.commissionPercentage) {
            commissionPct = settings.commissionPercentage;
          }
        } catch (settingsErr) {
          console.warn("[Checkout] Erro ao buscar comissão das configurações:", settingsErr);
        }

        const insertValues: any = {
          buyerId: buyerId,
          sellerId: mysqlSellerId,
          productType: productType,
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
          firebaseProductId: productId ? String(productId) : null,
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

        // Deduz ForteCoins usadas e concede 7 coins de cashback
        if (buyerId > 0) {
          const userResult = await database.select().from(users).where(eq(users.id, buyerId)).limit(1);
          if (userResult.length > 0) {
            const usr = userResult[0];
            const netCoins = Math.max(0, (usr.forteCoins || 0) - verifiedCoinsToUse + 7);
            await database.update(users).set({ forteCoins: netCoins }).where(eq(users.id, buyerId));
            console.log(`[Checkout 100%] updated user ${buyerId} coins: from ${usr.forteCoins} to ${netCoins}`);
          }
        }

        // Incrementa contagem do cupom se foi utilizado
        if (validCouponCode) {
          const couponResult = await database.select().from(coupons).where(eq(coupons.code, validCouponCode)).limit(1);
          if (couponResult.length > 0) {
            const cp = couponResult[0];
            await database.update(coupons).set({ usedCount: (cp.usedCount || 0) + 1 }).where(eq(coupons.id, cp.id));
          }
        }

        // Baixa no estoque
        if (productType === "digital" && insertValues.digitalProductId) {
          const prod = await database.select().from(digitalProducts).where(eq(digitalProducts.id, insertValues.digitalProductId)).limit(1);
          if (prod.length > 0) {
            const newStock = Math.max(0, (prod[0].stock || 1) - 1);
            await database.update(digitalProducts).set({ stock: newStock, isActive: newStock > 0 }).where(eq(digitalProducts.id, insertValues.digitalProductId));
          }
        } else if (productType === "store" && insertValues.productId) {
          const prod = await database.select().from(products).where(eq(products.id, insertValues.productId)).limit(1);
          if (prod.length > 0) {
            const newStock = Math.max(0, (prod[0].stock || 1) - 1);
            await database.update(products).set({ stock: newStock, isActive: newStock > 0 }).where(eq(products.id, insertValues.productId));
          }
        }

        console.log("[Checkout] Compra 100% paga com moedas/cupom registrada com sucesso.");
        return res.json({ success: true, url: null, paidWithCoins: true });
      }

      // ─── Criação de Preferência de Pagamento no Mercado Pago (Checkout Pro) ────
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!accessToken) {
        console.error("[Mercado Pago] MERCADO_PAGO_ACCESS_TOKEN não configurado no ambiente.");
        return res.status(500).json({
          success: false,
          error: "Credenciais do Mercado Pago não configuradas no servidor. Adicione o MERCADO_PAGO_ACCESS_TOKEN."
        });
      }

      const host = req.get("host") || "";
      const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
      const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
      const webhookUrl = `${protocol}://${host}/api/mercadopago/webhook${webhookSecret ? `?secret=${encodeURIComponent(webhookSecret)}` : ""}`;
      const returnUrl = redirectUrl || `${protocol}://${host}/minhas-compras`;

      const preferencePayload: any = {
        items: [
          {
            id: String(productId || "item"),
            title: productNameStr.substring(0, 250),
            quantity: Number(quantity) || 1,
            unit_price: Number(finalPrice.toFixed(2)),
            currency_id: "BRL",
          }
        ],
        back_urls: {
          success: returnUrl,
          pending: returnUrl,
          failure: returnUrl,
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
          quantity: Number(quantity) || 1,
        },
        statement_descriptor: "ENFORTEC GAMES",
      };

      if (customer && typeof customer === "object") {
        preferencePayload.payer = {
          name: customer.name || undefined,
          email: customer.email || undefined,
          phone: customer.phone_number ? { number: customer.phone_number.replace(/\D/g, "") } : undefined
        };
      }

      console.log("[Mercado Pago] Criando preferência:", JSON.stringify(preferencePayload));

      const mpResponse = await axios.post("https://api.mercadopago.com/checkout/preferences", preferencePayload, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        timeout: 15000
      });

      const initPoint = mpResponse.data.init_point || mpResponse.data.sandbox_init_point;
      console.log("[Mercado Pago] Preferência gerada com sucesso:", initPoint);

      return res.json({ success: true, url: initPoint, preferenceId: mpResponse.data.id });
    } catch (error: any) {
      console.error("[Mercado Pago Checkout] Erro:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || error.message || "Erro desconhecido ao gerar checkout";
      return res.status(500).json({ success: false, error: errorMsg });
    }
  };

  // Rotas de Checkout
  app.post("/api/mercadopago/checkout", handleCheckout);
  app.post("/api/infinitepay/checkout", handleCheckout); // Mantido como alias de compatibilidade

  // Trava de concorrência em memória (Mutex) para evitar inserção duplicada por webhooks simultâneos do Mercado Pago
  const activeProcessingPaymentIds = new Set<string>();

  // ─── Webhook Mercado Pago: recebe notificações de pagamento confirmado ───────
  const handleWebhook = async (req: any, res: any) => {
    let paymentIdToUnlock: string | null = null;
    try {
      const expectedSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
      if (expectedSecret && req.query.secret !== expectedSecret) {
        console.warn("[Mercado Pago Webhook] Segredo de query incorreto ou ausente fornecido — ignorando.");
        return res.status(401).json({ received: false, error: "Não autorizado." });
      }

      const event = req.body || {};
      console.log("[Mercado Pago Webhook] Evento recebido:", JSON.stringify({ body: req.body, query: req.query }));

      // Obter ID do pagamento no webhook v2 ou IPN query
      let paymentId =
        event?.data?.id ||
        event?.id ||
        req.query?.["data.id"] ||
        req.query?.id ||
        null;

      const topic = event?.type || event?.topic || req.query?.type || req.query?.topic;

      // Confirma recebimento de eventos de health check ou que não sejam pagamentos diretos
      if (!paymentId || (topic && topic !== "payment" && topic !== "merchant_order" && event?.action !== "payment.created" && event?.action !== "payment.updated")) {
        return res.status(200).json({ received: true, ignored: true });
      }

      const strPaymentId = String(paymentId);
      if (activeProcessingPaymentIds.has(strPaymentId)) {
        console.log(`[Mercado Pago Webhook] Pagamento #${strPaymentId} já está sendo processado em paralelo por outra requisição. Reenvio ignorado.`);
        return res.status(200).json({ received: true, inProgress: true });
      }
      activeProcessingPaymentIds.add(strPaymentId);
      paymentIdToUnlock = strPaymentId;

      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!accessToken) {
        console.warn("[Mercado Pago Webhook] MERCADO_PAGO_ACCESS_TOKEN não configurado no servidor.");
        return res.status(200).json({ received: true, error: "Token não configurado" });
      }

      // Consulta os dados verificados diretamente na API do Mercado Pago (Segurança Total)
      let paymentData: any = null;
      try {
        const resp = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { "Authorization": `Bearer ${accessToken}` },
          timeout: 15000
        });
        paymentData = resp.data;
      } catch (fetchErr: any) {
        console.error(`[Mercado Pago Webhook] Erro ao consultar pagamento #${paymentId}:`, fetchErr.response?.data || fetchErr.message);
        return res.status(200).json({ received: true, error: "Falha ao consultar pagamento na API" });
      }

      if (!paymentData) {
        return res.status(200).json({ received: true });
      }

      console.log(`[Mercado Pago Webhook] Pagamento #${paymentId} Status: ${paymentData.status} (${paymentData.status_detail})`);

      // Só processa pedidos quando aprovados
      if (paymentData.status !== "approved") {
        console.log(`[Mercado Pago Webhook] Pagamento #${paymentId} com status "${paymentData.status}" — não aprovado ainda.`);
        return res.status(200).json({ received: true, status: paymentData.status });
      }

      const totalPrice = paymentData.transaction_amount
        ? Number(paymentData.transaction_amount).toFixed(2)
        : "0.00";

      const metadata = paymentData.metadata || {};
      const buyerId = Number(metadata.buyer_id) || 0;
      const sellerId = metadata.seller_id ? Number(metadata.seller_id) : null;
      const productType: "store" | "used" | "digital" | "platinador" = metadata.product_type || "store";
      const productIdString = metadata.product_id ? String(metadata.product_id) : null;
      const coinsUsedValue = Number(metadata.coins_used) || 0;
      const couponCodeValue = metadata.coupon_code || null;
      const productName = metadata.product_name || paymentData.description || "Produto Enfortec Games";
      const phone = metadata.buyer_phone || null;
      const accountType = metadata.account_type || null;
      const quantity = Number(metadata.quantity) || 1;

      const database = await db.getDb();
      if (!database) {
        console.warn("[Mercado Pago Webhook] Banco de dados indisponível.");
        return res.status(200).json({ received: true, error: "Database offline" });
      }

      // Idempotência: verifica se o pagamento já foi registrado
      const existingOrder = await database.select().from(orders).where(eq(orders.paymentId, String(paymentId))).limit(1);
      if (existingOrder.length > 0) {
        console.log(`[Mercado Pago Webhook] Pagamento #${paymentId} já processado (pedido #${existingOrder[0].id}) — reenvio ignorado.`);
        return res.status(200).json({ received: true, duplicate: true });
      }

      if (productType === "platinador") {
        const existingSub = await database.select().from(platinadorSubscriptions).where(eq(platinadorSubscriptions.paymentId, String(paymentId))).limit(1);
        if (existingSub.length > 0) {
          console.log(`[Mercado Pago Webhook] Assinatura do Platinador pra pagamento #${paymentId} já processada.`);
          return res.status(200).json({ received: true, duplicate: true });
        }

        if (buyerId > 0) {
          const now = new Date();
          const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          const existing = await database.select().from(platinadorSubscriptions).where(eq(platinadorSubscriptions.userId, buyerId)).limit(1);

          if (existing.length > 0) {
            await database.update(platinadorSubscriptions).set({
              status: "ativa",
              startsAt: now,
              expiresAt,
              paymentId: String(paymentId)
            }).where(eq(platinadorSubscriptions.id, existing[0].id));
          } else {
            await database.insert(platinadorSubscriptions).values({
              userId: buyerId,
              status: "ativa",
              planName: "Clube Platinador VIP",
              price: totalPrice,
              startsAt: now,
              expiresAt,
              paymentId: String(paymentId),
            });
          }
          console.log(`[Mercado Pago Webhook] Assinatura Platinador ativada para usuário #${buyerId} até ${expiresAt.toISOString()}`);
        }
      } else {
        let commissionPct = "6.00";
        try {
          const settings = await db.getPlatformSettings();
          if (settings?.commissionPercentage) {
            commissionPct = settings.commissionPercentage;
          }
        } catch (settingsErr) {
          console.warn("[Mercado Pago Webhook] Erro ao buscar comissão:", settingsErr);
        }

        const total = parseFloat(totalPrice);
        const pct = parseFloat(commissionPct) / 100;
        const platformCommission = (total * pct).toFixed(2);
        const sellerAmount = (total * (1 - pct)).toFixed(2);

        const insertValues: any = {
          buyerId: buyerId,
          sellerId: sellerId,
          productType: productType,
          quantity: quantity,
          totalPrice: totalPrice,
          commissionPercentage: commissionPct,
          platformCommission: platformCommission,
          sellerAmount: sellerAmount,
          status: "pago",
          paymentId: String(paymentId),
          coinsUsed: coinsUsedValue,
          productName: productName,
          accountType: accountType || null,
          firebaseProductId: productIdString || null,
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

        // Atualiza ForteCoins (dedução de moedas usadas + 7 moedas de cashback)
        if (buyerId > 0) {
          const userResult = await database.select().from(users).where(eq(users.id, buyerId)).limit(1);
          if (userResult.length > 0) {
            const usr = userResult[0];
            const netCoins = Math.max(0, (usr.forteCoins || 0) - coinsUsedValue + 7);
            await database.update(users).set({ forteCoins: netCoins }).where(eq(users.id, buyerId));
            console.log(`[Mercado Pago Webhook] ForteCoins do usuário #${buyerId} atualizadas: de ${usr.forteCoins} para ${netCoins}`);
          }
        }

        // Incrementa uso de cupom se foi aplicado
        if (couponCodeValue) {
          const couponResult = await database.select().from(coupons).where(eq(coupons.code, couponCodeValue)).limit(1);
          if (couponResult.length > 0) {
            const cp = couponResult[0];
            await database.update(coupons).set({ usedCount: (cp.usedCount || 0) + 1 }).where(eq(coupons.id, cp.id));
          }
        }

        // Baixa no estoque
        if (productType === "digital" && insertValues.digitalProductId) {
          const prod = await database.select().from(digitalProducts).where(eq(digitalProducts.id, insertValues.digitalProductId)).limit(1);
          if (prod.length > 0) {
            const newStock = Math.max(0, (prod[0].stock || 1) - 1);
            await database.update(digitalProducts).set({ stock: newStock, isActive: newStock > 0 }).where(eq(digitalProducts.id, insertValues.digitalProductId));
          }
        } else if (productType === "store" && insertValues.productId) {
          const prod = await database.select().from(products).where(eq(products.id, insertValues.productId)).limit(1);
          if (prod.length > 0) {
            const newStock = Math.max(0, (prod[0].stock || 1) - 1);
            await database.update(products).set({ stock: newStock, isActive: newStock > 0 }).where(eq(products.id, insertValues.productId));
          }
        }

        console.log(`[Mercado Pago Webhook] Pedido registrado no banco com sucesso (Pagamento #${paymentId}).`);
      }

      // Notificação WhatsApp para o admin
      const adminPhone = "554384253691";
      const adminMsg = encodeURIComponent(
        `✅ Novo pagamento confirmado via Mercado Pago!\n\nProduto: ${productName}\nValor: R$ ${parseFloat(totalPrice).toFixed(2).replace(".", ",")}\nID: ${paymentId || "N/A"}`
      );
      console.log(`[Mercado Pago Webhook] Link admin: https://wa.me/${adminPhone}?text=${adminMsg}`);

      return res.status(200).json({ received: true, success: true });
    } catch (error: any) {
      console.error("[Mercado Pago Webhook] Erro ao processar evento:", error.message);
      return res.status(200).json({ received: true, error: error.message });
    } finally {
      if (paymentIdToUnlock) {
        activeProcessingPaymentIds.delete(paymentIdToUnlock);
      }
    }
  };

  // Rotas de Webhook
  app.all("/api/mercadopago/webhook", handleWebhook);
  app.all("/api/mercadopago/ipn", handleWebhook);
  app.all("/api/infinitepay/webhook", handleWebhook); // Mantido como fallback
}
