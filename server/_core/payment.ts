import { Express } from "express";
import axios from "axios";

export function registerPaymentRoute(app: Express) {
  app.post("/api/infinitepay/checkout", async (req, res) => {
    try {
      const { name, price, quantity = 1, redirectUrl } = req.body;

      if (!name || price === undefined) {
        return res.status(400).json({ success: false, error: "Nome e preço são obrigatórios." });
      }

      // Convert price to cents (integer)
      const priceInCents = Math.round(parseFloat(price) * 100);
      const handle = process.env.INFINITE_PAY_HANDLE || "efortegames";

      const payload = {
        handle,
        redirect_url: redirectUrl || `${req.protocol}://${req.get('host')}/minhas-compras`,
        items: [
          {
            name,
            price: priceInCents,
            quantity: Number(quantity)
          }
        ]
      };

      console.log("[InfinitePay] Criando link com payload:", JSON.stringify(payload));

      const { data } = await axios.post("https://api.checkout.infinitepay.io/links", payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (data.success === false) {
        console.error("[InfinitePay] Erro retornado pela API:", data);
        return res.status(400).json({ success: false, error: data.message || "Erro da API InfinitePay" });
      }

      return res.json({ success: true, url: data.url });
    } catch (error: any) {
      console.error("[InfinitePay] Erro interno na geração do checkout:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || error.message || "Erro desconhecido";
      return res.status(500).json({ success: false, error: errorMsg });
    }
  });
}
