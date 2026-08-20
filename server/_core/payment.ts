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
  // Produto de preço único, sem o split Primária/Secundária cadastrado (a maioria do
  // catálogo) — accountType não se aplica a ele, cobra sempre o preço base. Sem essa saída,
  // o bloqueio de "primária indisponível" abaixo (pensado só pra quem tem Secundária mas
  // não tem Primária) acabava barrando também esses produtos normais, já que o front manda
  // accountType="primaria" por padrão pra qualquer jogo, split ou não.
  const hasSplit = secondaryPrice > 0;
  if (!hasSplit) {
    return Math.max(0, p.pricePrimary ? parseFloat(p.pricePrimary) : basePrice);
  }
  if (accountType === "secundaria") {
    return Math.max(0, secondaryPrice);
  }
  // Produto sem preço primária cadastrado (só tem conta secundária): não deixa cobrar
  // como se a conta primária existisse, mesmo que "price" (base) tenha algum valor.
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

      // Limpa marcas de plataforma e formato para evitar falsos positivos no Steam (ex: "GTA V PS4/PS5" -> "GTA V")
      const term = rawTerm
        .replace(/\b(PS4\/PS5|PS5|PS4|XBOX|PC)\b/gi, "")
        .replace(/\b(MÍDIA|MIDIA|DIGITAL|CONTA|COMPARTILHADA|PRIMÁRIA|SECUNDÁRIA)\b/gi, "")
        .trim();

      // Consulta a API de busca pública do Steam
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

  // Rota temporária de diagnóstico do InfinitePay
  app.get("/api/test-infinitepay", async (req, res) => {
    const handle = process.env.INFINITE_PAY_HANDLE || "andre-luiz-srs";
    const payload = {
      handle,
      redirect_url: "https://enfortecgames.vercel.app/minhas-compras",
      order_nsu: "test_" + Date.now(),
      items: [
        {
          quantity: 1,
          price: 1000,
          description: "Test Product"
        }
      ]
    };

    const results: any = {};

    // Teste 1: links
    try {
      const response = await axios.post("https://api.checkout.infinitepay.io/links", payload, {
        headers: { "Content-Type": "application/json" }
      });
      results.links = { status: response.status, data: response.data };
    } catch (e: any) {
      results.links = { error: e.message, response: e.response?.data };
    }

    // Teste 2: v1/links
    try {
      const response = await axios.post("https://api.checkout.infinitepay.io/v1/links", payload, {
        headers: { "Content-Type": "application/json" }
      });
      results.v1_links = { status: response.status, data: response.data };
    } catch (e: any) {
      results.v1_links = { error: e.message, response: e.response?.data };
    }

    return res.json({
      configuredHandle: handle,
      hasApiKey: !!process.env.INFINITE_PAY_API_KEY,
      results
    });
  });

  // ─── Checkout: cria link de pagamento InfinitePay ────────────────────────────
  app.post("/api/infinitepay/checkout", async (req, res) => {
    try {
      const { name, quantity = 1, redirectUrl, productType = "store", productId, sellerId, customer, couponCode, accountType, consoleType } = req.body;
      const customerPhone: string = customer?.phone_number || "";
      // price/coinsToUse também chegam no body, mas são só o que o comprador VIU na tela —
      // nunca são usados pra calcular o valor cobrado. O valor real é sempre recalculado
      // abaixo a partir do banco (preço do produto + saldo real de ForteCoins do comprador).
      // Sem isso, bastava editar a requisição no navegador pra comprar qualquer coisa por
      // R$0,01 (ou de graça, informando um monte de ForteCoins que nem existiam no saldo).

      if (!name) {
        return res.status(400).json({ success: false, error: "Nome do produto é obrigatório." });
      }

      const apiKey = process.env.INFINITE_PAY_API_KEY;
      const handle = process.env.INFINITE_PAY_HANDLE || "andre-luiz-srs";

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

      // Tenta obter o ID do vendedor (MySQL) a partir do sellerId (Firebase UID)
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
      if (consoleType && (consoleType === "PS4" || consoleType === "PS5")) {
        if (!productNameStr.toUpperCase().includes(`(${consoleType})`) && !productNameStr.toUpperCase().includes(`- ${consoleType}`)) {
          productNameStr += ` (${consoleType})`;
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

      // ── ForteCoins verificadas no servidor (nunca confia no `coinsToUse` do cliente) ──
      // Além do saldo real, existe um teto por compra — sem isso, um saldo grande de
      // ForteCoins (ex: 449, acumulado por indicação/bônus) cobria o preço inteiro e o
      // produto saía de graça. Teto configurável em Admin > Config ForteCoins (10 FC / 50 FC
      // em pré-venda por padrão).
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

      // Se o desconto cobrir 100% do preço do jogo, finaliza diretamente sem InfinitePay
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
            quantity: 1,
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

          // Deduct coins used and reward 7 coins cashback in PostgreSQL
          if (buyerId > 0) {
            const userResult = await database.select().from(users).where(eq(users.id, buyerId)).limit(1);
            if (userResult.length > 0) {
              const usr = userResult[0];
              const netCoins = Math.max(0, (usr.forteCoins || 0) - verifiedCoinsToUse + 7);
              await database.update(users).set({ forteCoins: netCoins }).where(eq(users.id, buyerId));
              console.log(`[Checkout 100%] updated user ${buyerId} coins: from ${usr.forteCoins} to ${netCoins} (-${verifiedCoinsToUse} + 7 cashback)`);
            }
          }

          // Incrementa usos do cupom se foi utilizado
          if (validCouponCode) {
            const couponResult = await database.select().from(coupons).where(eq(coupons.code, validCouponCode)).limit(1);
            if (couponResult.length > 0) {
              const cp = couponResult[0];
              await database.update(coupons).set({ usedCount: (cp.usedCount || 0) + 1 }).where(eq(coupons.id, cp.id));
            }
          }

          // Decrement stock for the purchased product
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

      // Converte preço para centavos (inteiro)
      const priceInCents = Math.round(finalPrice * 100);

      // Constrói order_nsu compacto: buyerId_sellerId_productType_productId_coinsToUse_couponCode
      // Codifica o nome do produto em base64 para incluir no NSU sem quebrar o split por "_"
      const productNameBase64 = Buffer.from(productNameStr).toString("base64");
      // parts: buyerId_sellerId_productType_productId_coinsUsed_coupon_productName_phone_accountType_quantity
      const phoneBase64 = customerPhone ? Buffer.from(customerPhone).toString("base64") : "nophone";
      const accTypeVal = accountType || "noacc";
      const qtyVal = Number(quantity) || 1;
      const orderNsu = `${buyerId}_${mysqlSellerId}_${productType}_${productId || "null"}_${verifiedCoinsToUse}_${validCouponCode || "nocoupon"}_${productNameBase64}_${phoneBase64}_${accTypeVal}_${qtyVal}`;

      const host = req.get("host") || "";
      const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
      // O webhook não tem como saber sozinho que a chamada realmente veio do InfinitePay
      // (não há assinatura enviada por eles) — por isso embutimos um segredo só nosso na
      // própria URL, que viaja só de servidor pra servidor e nunca é exposto ao navegador
      // do comprador. Sem isso, qualquer um podia chamar o webhook direto e fabricar um
      // pedido "pago" sem pagar nada.
      const webhookSecret = process.env.INFINITE_PAY_WEBHOOK_SECRET;
      const webhookUrl = `${protocol}://${host}/api/infinitepay/webhook${webhookSecret ? `?secret=${encodeURIComponent(webhookSecret)}` : ""}`;

      const payload: any = {
        handle,
        order_nsu: orderNsu,
        redirect_url: redirectUrl || `${req.protocol}://${req.get("host")}/minhas-compras`,
        webhook_url: webhookUrl,
        items: [
          {
            description: name,
            price: priceInCents,
            quantity: Number(quantity),
          },
        ],
      };

      // Adiciona o comprador pré-preenchido se fornecido
      if (customer && typeof customer === "object") {
        payload.customer = {
          name: customer.name,
          email: customer.email,
          phone_number: customer.phone_number,
        };
      }

      console.log("[InfinitePay] Criando link com payload:", JSON.stringify(payload));

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const { data } = await axios.post("https://api.checkout.infinitepay.io/links", payload, {
        headers,
      });

      if (data.success === false) {
        console.error("[InfinitePay] Erro retornado pela API:", data);
        return res.status(400).json({ success: false, error: data.message || "Erro da API InfinitePay" });
      }

      console.log("[InfinitePay] Link gerado com sucesso:", data.url);
      return res.json({ success: true, url: data.url });
    } catch (error: any) {
      console.error("[InfinitePay] Erro interno na geração do checkout:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || error.message || "Erro desconhecido";
      return res.status(500).json({ success: false, error: errorMsg });
    }
  });

  // ─── Webhook: recebe notificações de pagamento confirmado ────────────────────
  app.post("/api/infinitepay/webhook", async (req, res) => {
    try {
      // Só aceita a chamada se trouxer o segredo que nós mesmos geramos e embutimos na
      // webhook_url na hora de criar o link de pagamento (ver acima). Isso é o que garante
      // que só o InfinitePay (ou quem tiver essa URL exata) consegue confirmar um pagamento
      // — sem essa checagem, qualquer requisição direta pra essa rota fabricava um pedido
      // "pago" de graça, sem passar por nenhum pagamento real.
      //
      // Enquanto INFINITE_PAY_WEBHOOK_SECRET não estiver configurado no ambiente (variável
      // nova, precisa ser adicionada nas configurações do projeto na Vercel), o webhook
      // continua processando normalmente — sem isso, subir este código sem a variável já
      // configurada derrubaria a confirmação de TODO pagamento real. Assim que a variável
      // for definida, a checagem passa a valer sozinha, sem precisar mexer em mais nada.
      const expectedSecret = process.env.INFINITE_PAY_WEBHOOK_SECRET;
      if (expectedSecret && req.query.secret !== expectedSecret) {
        console.warn("[InfinitePay Webhook] Segredo de query incorreto ou ausente fornecido — ignorando.");
        return res.status(401).json({ received: false, error: "Não autorizado." });
      }

      const event = req.body;
      console.log("[InfinitePay Webhook] Evento recebido:", JSON.stringify(event));

      // InfinitePay envia o webhook APÓS o pagamento ser aprovado, sem campo "type"/"status".
      // Aceita os formatos conhecidos: eventos com type/status OU o payload padrão do webhook
      // (que contém order_nsu + transaction_nsu/invoice_slug e não tem type/status)
      const hasWebhookPayload =
        !!event?.order_nsu && (!!event?.transaction_nsu || !!event?.invoice_slug);
      const isPaid =
        event?.type === "charge.paid" ||
        event?.type === "payment.approved" ||
        event?.status === "paid" ||
        event?.status === "approved" ||
        hasWebhookPayload;

      if (!isPaid) {
        console.log("[InfinitePay Webhook] Evento ignorado (não é pagamento aprovado):", event?.type || event?.status || "sem status");
        return res.status(200).json({ received: true });
      }

      // Extraindo dados do evento
      const paymentId = event?.id || event?.charge_id || event?.payment_id || event?.transaction_nsu || event?.invoice_slug || null;
      const totalPrice = event?.amount
        ? (event.amount / 100).toFixed(2)
        : event?.total_amount
        ? String(event.total_amount)
        : event?.paid_amount
        ? (event.paid_amount / 100).toFixed(2)
        : "0.00";

      const productName = event?.items?.[0]?.name || event?.items?.[0]?.description || event?.description || "Produto Eforte Games";

      // Tenta obter o order_nsu do payload do webhook
      const orderNsu =
        event?.order_nsu ||
        event?.data?.order_nsu ||
        event?.payment?.order_nsu ||
        event?.charge?.order_nsu ||
        event?.object?.order_nsu ||
        null;

      let buyerId = 0;
      let sellerId: number | null = null;
      let productType: "store" | "used" | "digital" = "store";
      let productIdString: string | null = null;
      let coinsUsedValue = 0;
      let couponCodeValue: string | null = null;
      let productNameFromNsu: string = event?.items?.[0]?.name || event?.items?.[0]?.description || event?.description || "Produto Eforte Games";
      let phoneFromNsu: string | null = null;
      let accountTypeFromNsu: string | null = null;
      let quantityFromNsu = 1;

      if (orderNsu && typeof orderNsu === "string") {
        const parts = orderNsu.split("_");
        if (parts.length >= 4) {
          buyerId = parseInt(parts[0]) || 0;
          sellerId = parts[1] === "null" ? null : parseInt(parts[1]) || null;
          productType = (parts[2] as any) || "store";
          productIdString = parts[3] === "null" ? null : parts[3];
        }
        if (parts.length >= 5) {
          coinsUsedValue = parseInt(parts[4]) || 0;
        }
        if (parts.length >= 6) {
          couponCodeValue = parts[5] === "nocoupon" ? null : parts[5];
        }
        if (parts.length >= 7) {
          try {
            productNameFromNsu = Buffer.from(parts[6], "base64").toString("utf-8");
          } catch { /* mantém o nome padrão */ }
        }
        // parts[7] = phone
        if (parts.length >= 8 && parts[7] !== "nophone") {
          try {
            const decoded = Buffer.from(parts[7], "base64").toString("utf-8");
            phoneFromNsu = decoded !== "nophone" ? decoded : null;
          } catch { /* ignora */ }
        }
        if (parts.length >= 9 && parts[8] !== "noacc") {
          accountTypeFromNsu = parts[8];
        }
        if (parts.length >= 10) {
          quantityFromNsu = parseInt(parts[9]) || 1;
        }
      }

      console.log(`[InfinitePay Webhook] Pagamento confirmado — ID: ${paymentId}, Valor: R$${totalPrice}, Produto: ${productName}, Buyer: ${buyerId}, Seller: ${sellerId}, Tipo: ${productType}, Moedas usadas: ${coinsUsedValue}, Cupom: ${couponCodeValue}`);

      // Registra o pedido no banco com status "pago"
      const database = await db.getDb();

      // Idempotência: o InfinitePay pode reenviar o mesmo webhook mais de uma vez (é a
      // forma deles garantirem que o evento chegou). Sem checar isso, um reenvio cria um
      // segundo pedido "pago" pra uma cobrança real única — e se o comprador confirmar o
      // recebimento dos dois, o vendedor seria pago em dobro por uma venda só.
      if (database && paymentId) {
        const existingOrder = await database.select().from(orders).where(eq(orders.paymentId, String(paymentId))).limit(1);
        if (existingOrder.length > 0) {
          console.log(`[InfinitePay Webhook] Pagamento ${paymentId} já processado (pedido #${existingOrder[0].id}) — reenvio ignorado.`);
          return res.status(200).json({ received: true, duplicate: true });
        }
        if ((productType as string) === "platinador") {
          const existingSub = await database.select().from(platinadorSubscriptions).where(eq(platinadorSubscriptions.paymentId, String(paymentId))).limit(1);
          if (existingSub.length > 0) {
            console.log(`[InfinitePay Webhook] Assinatura do Platinador pra pagamento ${paymentId} já processada — reenvio ignorado.`);
            return res.status(200).json({ received: true, duplicate: true });
          }
        }
      }

      if (database && (productType as string) === "platinador") {
        // Assinatura Clube Platinador: não é um "pedido" de produto (a tabela orders só aceita
        // productType store/used/digital), então ativamos/renovamos a assinatura diretamente.
        if (buyerId > 0) {
          const now = new Date();
          const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          const existing = await database
            .select()
            .from(platinadorSubscriptions)
            .where(eq(platinadorSubscriptions.userId, buyerId))
            .limit(1);

          if (existing.length > 0) {
            await database
              .update(platinadorSubscriptions)
              .set({ status: "ativa", startsAt: now, expiresAt, paymentId: paymentId ? String(paymentId) : null })
              .where(eq(platinadorSubscriptions.id, existing[0].id));
          } else {
            await database.insert(platinadorSubscriptions).values({
              userId: buyerId,
              status: "ativa",
              planName: "Clube Platinador VIP",
              price: totalPrice,
              startsAt: now,
              expiresAt,
              paymentId: paymentId ? String(paymentId) : null,
            });
          }
          console.log(`[InfinitePay Webhook] Assinatura Platinador ativada/renovada para o usuário ${buyerId} até ${expiresAt.toISOString()}.`);
        } else {
          console.warn("[InfinitePay Webhook] Pagamento Platinador recebido sem buyerId identificável — assinatura não pôde ser ativada automaticamente.");
        }
      } else if (database) {
        // Tenta obter a comissão real do banco
        let commissionPct = "6.00";
        try {
          const settings = await db.getPlatformSettings();
          if (settings?.commissionPercentage) {
            commissionPct = settings.commissionPercentage;
          }
        } catch (settingsErr) {
          console.warn("[InfinitePay Webhook] Erro ao buscar comissão das configurações:", settingsErr);
        }

        const total = parseFloat(totalPrice);
        const pct = parseFloat(commissionPct) / 100;
        const platformCommission = (total * pct).toFixed(2);
        const sellerAmount = (total * (1 - pct)).toFixed(2);

        const insertValues: any = {
          buyerId: buyerId,
          sellerId: sellerId,
          productType: productType,
          quantity: quantityFromNsu,
          totalPrice: totalPrice,
          commissionPercentage: commissionPct,
          platformCommission: platformCommission,
          sellerAmount: sellerAmount,
          status: "pago",
          paymentId: paymentId ? String(paymentId) : null,
          coinsUsed: coinsUsedValue,
          productName: productNameFromNsu,
          accountType: accountTypeFromNsu || null,
          firebaseProductId: productIdString || null,
        };

        if (productType === "store" && productIdString) {
          insertValues.productId = parseInt(productIdString) || null;
        } else if (productType === "used" && productIdString) {
          insertValues.usedProductId = parseInt(productIdString) || null;
        } else if (productType === "digital" && productIdString) {
          insertValues.digitalProductId = parseInt(productIdString) || null;
        }

        if (phoneFromNsu) {
          insertValues.buyerPhone = phoneFromNsu;
        }

        await database.insert(orders).values(insertValues);

        // Deduct coins used and reward 7 coins cashback in PostgreSQL
        if (buyerId > 0) {
          const userResult = await database.select().from(users).where(eq(users.id, buyerId)).limit(1);
          if (userResult.length > 0) {
            const usr = userResult[0];
            const netCoins = Math.max(0, (usr.forteCoins || 0) - coinsUsedValue + 7);
            await database.update(users).set({ forteCoins: netCoins }).where(eq(users.id, buyerId));
            console.log(`[Webhook] updated user ${buyerId} coins: from ${usr.forteCoins} to ${netCoins} (-${coinsUsedValue} + 7 cashback)`);
          }
        }

        // Increment coupon count if one was used
        if (couponCodeValue) {
          const couponResult = await database.select().from(coupons).where(eq(coupons.code, couponCodeValue)).limit(1);
          if (couponResult.length > 0) {
            const cp = couponResult[0];
            await database.update(coupons).set({ usedCount: (cp.usedCount || 0) + 1 }).where(eq(coupons.id, cp.id));
            console.log(`[Webhook] incremented coupon ${couponCodeValue} usage count to ${(cp.usedCount || 0) + 1}`);
          }
        }

        // Decrement stock for the purchased product
        if (productType === "digital" && insertValues.digitalProductId) {
          const prod = await database.select().from(digitalProducts).where(eq(digitalProducts.id, insertValues.digitalProductId)).limit(1);
          if (prod.length > 0) {
            const newStock = Math.max(0, (prod[0].stock || 1) - 1);
            await database.update(digitalProducts).set({ stock: newStock, isActive: newStock > 0 }).where(eq(digitalProducts.id, insertValues.digitalProductId));
            console.log(`[Webhook] decremented digital product ${insertValues.digitalProductId} stock to ${newStock}`);
          }
        } else if (productType === "store" && insertValues.productId) {
          const prod = await database.select().from(products).where(eq(products.id, insertValues.productId)).limit(1);
          if (prod.length > 0) {
            const newStock = Math.max(0, (prod[0].stock || 1) - 1);
            await database.update(products).set({ stock: newStock, isActive: newStock > 0 }).where(eq(products.id, insertValues.productId));
            console.log(`[Webhook] decremented store product ${insertValues.productId} stock to ${newStock}`);
          }
        }

        console.log("[InfinitePay Webhook] Pedido registrado no banco com sucesso.");
      } else {
        console.warn("[InfinitePay Webhook] Banco indisponível — pedido não registrado no MySQL.");
      }

      // Notificação via WhatsApp para o admin (opcional)
      const adminPhone = "554384253691";
      const adminMsg = encodeURIComponent(
        `✅ Novo pagamento confirmado!\n\nProduto: ${productName}\nValor: R$ ${parseFloat(totalPrice).toFixed(2).replace(".", ",")}\nID: ${paymentId || "N/A"}`
      );
      console.log(`[InfinitePay Webhook] Link de notificação admin: https://wa.me/${adminPhone}?text=${adminMsg}`);

      return res.status(200).json({ received: true, success: true });
    } catch (error: any) {
      console.error("[InfinitePay Webhook] Erro ao processar evento:", error.message);
      // Sempre retorna 200 para o InfinitePay não reenviar o webhook indefinidamente
      return res.status(200).json({ received: true, error: error.message });
    }
  });

}

