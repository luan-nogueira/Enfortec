import { Express } from "express";
import axios from "axios";
import * as db from "../db";
import { orders } from "../../drizzle/schema";
import { verifyFirebaseToken } from "./context";

export function registerPaymentRoute(app: Express) {
  // ─── Checkout: cria link de pagamento InfinitePay ────────────────────────────
  app.post("/api/infinitepay/checkout", async (req, res) => {
    try {
      const { name, price, quantity = 1, redirectUrl, productType = "store", productId, sellerId } = req.body;

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

      // Converte preço para centavos (inteiro)
      const priceInCents = Math.round(parseFloat(price) * 100);

      // Constrói order_nsu compacto: buyerId_sellerId_productType_productId
      const orderNsu = `${buyerId}_${mysqlSellerId || "null"}_${productType}_${productId || "null"}`;

      const webhookUrl = `${req.protocol}://${req.get("host")}/api/infinitepay/webhook`;

      const payload = {
        handle,
        order_nsu: orderNsu,
        redirect_url: redirectUrl || `${req.protocol}://${req.get("host")}/minhas-compras`,
        webhook_url: webhookUrl,
        items: [
          {
            name,
            description: name,
            price: priceInCents,
            quantity: Number(quantity),
          },
        ],
      };

      console.log("[InfinitePay] Criando link com payload:", JSON.stringify(payload));

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

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

      if (orderNsu && typeof orderNsu === "string") {
        const parts = orderNsu.split("_");
        if (parts.length >= 4) {
          buyerId = parseInt(parts[0]) || 0;
          sellerId = parts[1] === "null" ? null : parseInt(parts[1]) || null;
          productType = (parts[2] as any) || "store";
          productIdString = parts[3] === "null" ? null : parts[3];
        }
      }

      console.log(`[InfinitePay Webhook] Pagamento confirmado — ID: ${paymentId}, Valor: R$${totalPrice}, Produto: ${productName}, Buyer: ${buyerId}, Seller: ${sellerId}, Tipo: ${productType}`);

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

        await database.insert(orders).values({
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
        });

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

