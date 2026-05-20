import { Express } from "express";
import { getDb } from "../db";
import { digitalProducts } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Helper function to normalize strings for comparison (removes accents, punctuation, etc.)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[’'""`´\-–—_+=*&%$#@!?,.:;\\\/()\[\]{}]/g, " ") // Replace punctuation with space
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

export function registerAiRoute(app: Express) {
  app.get("/api/ai", async (req, res) => {
    const query = (req.query.q as string) ?? "";
    if (!query) {
      return res.status(400).json({ error: "Missing query parameter 'q'" });
    }

    const normalizedQuery = normalizeText(query);

    // 1. Check for standard FAQ questions before querying the database
    if (
      normalizedQuery.includes("pagamento") ||
      normalizedQuery.includes("pix") ||
      normalizedQuery.includes("cartao") ||
      normalizedQuery.includes("boleto") ||
      normalizedQuery.includes("pagar") ||
      normalizedQuery.includes("pago")
    ) {
      return res.json({
        answer: "Aceitamos Pix, Cartão de Crédito (com parcelamento) e Boleto Bancário. Todo o processamento é feito de forma segura pelo Mercado Pago.",
      });
    }

    if (
      normalizedQuery.includes("entrega") ||
      normalizedQuery.includes("envio") ||
      normalizedQuery.includes("prazo") ||
      normalizedQuery.includes("receber") ||
      normalizedQuery.includes("como recebo") ||
      normalizedQuery.includes("frete")
    ) {
      return res.json({
        answer: "As mídias digitais (chaves/código de ativação) são enviadas direto no seu e-mail ou WhatsApp cadastrado logo após a aprovação do pagamento. Para produtos físicos (usados), o envio é realizado via transportadora/Correios com código de rastreamento.",
      });
    }

    if (
      normalizedQuery.includes("contato") ||
      normalizedQuery.includes("whatsapp") ||
      normalizedQuery.includes("telefone") ||
      normalizedQuery.includes("suporte") ||
      normalizedQuery.includes("falar com") ||
      normalizedQuery.includes("atendimento") ||
      normalizedQuery.includes("adm")
    ) {
      return res.json({
        answer: "Você pode entrar em contato direto com a administração e suporte humano da Eforte Games pelo WhatsApp no número +55 43 8425-3691. Estamos à disposição para ajudar!",
      });
    }

    if (
      normalizedQuery.includes("como comprar") ||
      normalizedQuery.includes("comprar") ||
      normalizedQuery.includes("adquirir") ||
      normalizedQuery.includes("vender") ||
      normalizedQuery.includes("virar vendedor")
    ) {
      return res.json({
        answer: "Para comprar, basta navegar pelas seções da loja, adicionar os itens desejados ao carrinho e finalizar. Se você tem jogos usados para vender, você pode se cadastrar como Vendedor na opção 'Virar Vendedor' no menu e anunciar seus produtos!",
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Banco de dados não disponível" });
    }

    // Fetch all active products
    const products = await db
      .select()
      .from(digitalProducts)
      .where(eq(digitalProducts.isActive, true));

    // Filter out common Portuguese/English filler words for search matching
    const stopWords = new Set([
      "tem", "voce", "o", "de", "com", "jogo", "disponivel", "a", "os", "as",
      "um", "uma", "para", "em", "no", "na", "que", "e", "do", "da", "game",
      "games", "playstation", "xbox", "pc", "switch", "nintendo", "procurando"
    ]);

    const queryWords = normalizedQuery
      .split(" ")
      .filter((w) => w.length > 1 && !stopWords.has(w));

    interface ScoredProduct {
      product: typeof products[0];
      score: number;
    }

    const scoredProducts: ScoredProduct[] = [];

    for (const product of products) {
      const normalizedName = normalizeText(product.name);
      let score = 0;

      // Rule 1: Exact match of query inside name, or name inside query
      if (normalizedQuery.includes(normalizedName)) {
        score += 100;
      } else if (normalizedName.includes(normalizedQuery) && normalizedQuery.length >= 3) {
        score += 80;
      }

      // Rule 2: Substring matching for search keywords
      if (queryWords.length > 0) {
        let matchingWords = 0;
        const nameWords = normalizedName.split(" ");
        for (const word of queryWords) {
          if (nameWords.some((nw) => nw.includes(word) || word.includes(nw))) {
            matchingWords++;
          }
        }
        score += (matchingWords / queryWords.length) * 50;
      }

      if (score >= 20) {
        scoredProducts.push({ product, score });
      }
    }

    // Sort by score descending
    scoredProducts.sort((a, b) => b.score - a.score);

    if (scoredProducts.length === 0) {
      return res.json({
        answer: "Desculpe, não encontrei esse jogo no momento. Tente digitar o nome de outra forma ou contate o administrador no WhatsApp (+55 43 8425-3691) para ver se conseguimos encomendar!",
      });
    }

    // Best match is high score
    const bestMatch = scoredProducts[0];

    // If we have one highly confident match or only one result
    if (bestMatch.score >= 80 || scoredProducts.length === 1) {
      const matched = bestMatch.product;
      const priceText =
        Number(matched.price) === 0
          ? "A definir com ADM"
          : `R$ ${Number(matched.price).toFixed(2).replace(".", ",")}`;
      
      const whatsappLink = `https://wa.me/554384253691?text=${encodeURIComponent(
        `Olá! Tenho interesse no jogo ${matched.name} que vi no site.`
      )}`;

      return res.json({
        answer: `Sim! Temos o jogo **"${matched.name}"** disponível. \n\n💰 Preço: **${priceText}**.\n📦 Estoque: Sob consulta.\n\nVocê pode clicar no link abaixo para falar direto com o ADM no WhatsApp e combinar a compra:\n[Falar com ADM no WhatsApp](${whatsappLink})`,
        productId: matched.id,
      });
    }

    // Multiple possible matches
    const topMatches = scoredProducts.slice(0, 5).map((sp) => sp.product);
    const listText = topMatches
      .map((p) => {
        const priceText =
          Number(p.price) === 0
            ? "A definir com ADM"
            : `R$ ${Number(p.price).toFixed(2).replace(".", ",")}`;
        return `- **${p.name}** (Preço: ${priceText})`;
      })
      .join("\n");

    return res.json({
      answer: `Encontrei alguns jogos que podem ser o que você procura:\n\n${listText}\n\nQual deles você gostaria de saber mais?`,
    });
  });
}
