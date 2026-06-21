import { Express } from "express";
import axios from "axios";
import * as db from "../db";
import { orders, users, coupons } from "../../drizzle/schema";
import { verifyFirebaseToken } from "./context";
import { eq } from "drizzle-orm";

export function registerPaymentRoute(app: Express) {
  // Rota de busca automática de capas de jogos no Steam
  app.get("/api/games/search-cover", async (req, res) => {
    try {
      const term = req.query.term as string;
      if (!term) {
        return res.status(400).json({ success: false, error: "Termo de busca é obrigatório." });
      }

      // Consulta a API de busca pública do Steam
      const steamUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=portuguese&cc=BR`;
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
      const { name, price, quantity = 1, redirectUrl, productType = "store", productId, sellerId, customer, coinsToUse = 0, couponCode } = req.body;
      const productNameStr: string = name || "Produto";

      if (!name || price === undefined) {
        return res.status(400).json({ success: false, error: "Nome e preço são obrigatórios." });
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

      // Valida o cupom se fornecido
      let couponDiscount = 0;
      let validCouponCode: string | null = null;
      if (couponCode) {
        const coupon = await db.getCouponByCode(couponCode.toUpperCase().trim());
        if (coupon) {
          const isExpired = coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now();
          const isExceeded = coupon.maxUses !== null && (coupon.usedCount || 0) >= coupon.maxUses;
          
          if (!isExpired && !isExceeded) {
            couponDiscount = parseFloat(price) * (parseFloat(coupon.discountPercentage) / 100);
            validCouponCode = coupon.code;
          } else {
            console.warn(`[Checkout] Cupom ${couponCode} está expirado ou esgotado.`);
          }
        } else {
          console.warn(`[Checkout] Cupom ${couponCode} não foi encontrado ou está inativo.`);
        }
      }

      // Calcula o desconto: 10 ForteCoins = R$ 1,00
      const coinsDiscount = Number(coinsToUse) * 0.10;
      const originalPrice = parseFloat(price);
      const finalPrice = Math.max(0, originalPrice - couponDiscount - coinsDiscount);

      // Se o desconto cobrir 100% do preço do jogo, finaliza diretamente sem InfinitePay
      if (finalPrice <= 0) {
        const database = await db.getDb();
        if (database) {
          let commissionPct = "10.00";
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
            coinsUsed: Number(coinsToUse),
            productName: productNameStr,
            firebaseProductId: productId ? String(productId) : null,
          };

          if (productType === "store" && productId) {
            insertValues.productId = parseInt(productId) || null;
          } else if (productType === "used" && productId) {
            insertValues.usedProductId = parseInt(productId) || null;
          } else if (productType === "digital" && productId) {
            insertValues.digitalProductId = parseInt(productId) || null;
          }

          await database.insert(orders).values(insertValues);
          
          // Deduct coins used and reward 7 coins cashback in PostgreSQL
          if (buyerId > 0) {
            const userResult = await database.select().from(users).where(eq(users.id, buyerId)).limit(1);
            if (userResult.length > 0) {
              const usr = userResult[0];
              const netCoins = Math.max(0, (usr.forteCoins || 0) - Number(coinsToUse) + 7);
              await database.update(users).set({ forteCoins: netCoins }).where(eq(users.id, buyerId));
              console.log(`[Checkout 100%] updated user ${buyerId} coins: from ${usr.forteCoins} to ${netCoins} (-${coinsToUse} + 7 cashback)`);
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

          console.log("[Checkout] Compra 100% paga com moedas/cupom registrada com sucesso.");
          return res.json({ success: true, url: null, paidWithCoins: true });
        } else {
          return res.status(500).json({ success: false, error: "Banco de dados indisponível." });
        }
      }

      // Converte preço para centavos (inteiro)
      const priceInCents = Math.round(finalPrice * 100);

      // Constrói order_nsu compacto: buyerId_sellerId_productType_productId_coinsToUse_couponCode
      // Codifica o nome do produto em base64 para incluir no NSU sem quebrar o split por "_"
      const productNameB64 = Buffer.from(productNameStr).toString("base64");
      const orderNsu = `${buyerId}_${mysqlSellerId || "null"}_${productType}_${productId || "null"}_${coinsToUse}_${validCouponCode || "nocoupon"}_${productNameB64}`;

      const host = req.get("host") || "";
      const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
      const webhookUrl = `${protocol}://${host}/api/infinitepay/webhook`;

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
      const event = req.body;
      console.log("[InfinitePay Webhook] Evento recebido:", JSON.stringify(event));

      // InfinitePay envia eventos do tipo "charge.paid" ou "payment.approved"
      const isPaid =
        event?.type === "charge.paid" ||
        event?.type === "payment.approved" ||
        event?.status === "paid" ||
        event?.status === "approved";

      if (!isPaid) {
        console.log("[InfinitePay Webhook] Evento ignorado (não é pagamento aprovado):", event?.type || event?.status);
        return res.status(200).json({ received: true });
      }

      // Extraindo dados do evento
      const paymentId = event?.id || event?.charge_id || event?.payment_id || null;
      const totalPrice = event?.amount
        ? (event.amount / 100).toFixed(2)
        : event?.total_amount
        ? String(event.total_amount)
        : "0.00";

      const productName = event?.items?.[0]?.name || event?.description || "Produto Eforte Games";

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
      let productNameFromNsu: string = event?.items?.[0]?.name || event?.description || "Produto Eforte Games";

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
      }

      console.log(`[InfinitePay Webhook] Pagamento confirmado — ID: ${paymentId}, Valor: R$${totalPrice}, Produto: ${productName}, Buyer: ${buyerId}, Seller: ${sellerId}, Tipo: ${productType}, Moedas usadas: ${coinsUsedValue}, Cupom: ${couponCodeValue}`);

      // Registra o pedido no banco com status "pago"
      const database = await db.getDb();
      if (database) {
        // Tenta obter a comissão real do banco
        let commissionPct = "10.00";
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
          quantity: 1,
          totalPrice: totalPrice,
          commissionPercentage: commissionPct,
          platformCommission: platformCommission,
          sellerAmount: sellerAmount,
          status: "pago",
          paymentId: paymentId ? String(paymentId) : null,
          coinsUsed: coinsUsedValue,
          productName: productNameFromNsu,
          firebaseProductId: productIdString || null,
        };

        if (productType === "store" && productIdString) {
          insertValues.productId = parseInt(productIdString) || null;
        } else if (productType === "used" && productIdString) {
          insertValues.usedProductId = parseInt(productIdString) || null;
        } else if (productType === "digital" && productIdString) {
          insertValues.digitalProductId = parseInt(productIdString) || null;
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

