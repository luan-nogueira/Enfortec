import { Express } from "express";

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''"`´\-–—_+=*&%$#@!?,.:;\\\/\(\)\[\]\{\}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Full PS4/PS5 game catalog — source of truth for AI answers
const CATALOG = [
  { name: "AGONY PS4/PS5", price: 9.90 },
  { name: "ASSASSIN'S CREED MIRAGE PS4/PS5", price: 59.90 },
  { name: "ASSASSIN'S CREED ODYSSEY PS4/PS5", price: 44.90 },
  { name: "ASSASSIN'S CREED ORIGINS PS4/PS5", price: 37.90 },
  { name: "ASSASSIN'S CREED SHADOWS PS5", price: 144.90 },
  { name: "ASSASSIN'S CREED SYNDICATE PS4/PS5", price: 59.99 },
  { name: "ASSASSIN'S CREED VALHALLA PS4/PS5", price: 50.00 },
  { name: "ATOMIC HEART PS4/PS5", price: 69.90 },
  { name: "AVATAR PS4/PS5", price: 74.90 },
  { name: "BATTLEFIELD 1 PS4/PS5", price: 34.90 },
  { name: "BATTLEFIELD 4 PS4/PS5", price: 29.90 },
  { name: "BATTLEFIELD V PS4/PS5", price: 36.90 },
  { name: "BLEACH REBIRTH OF SOULS PS5", price: 100.00 },
  { name: "CALL OF DUTY GHOSTS PS4/PS5", price: 99.90 },
  { name: "CALL OF DUTY VANGUARD PS4/PS5", price: 89.90 },
  { name: "CALL OF DUTY WW2 PS4/PS5", price: 100.00 },
  { name: "COD BLACK OPS 6 PS4/PS5", price: 80.00 },
  { name: "COD BLACK OPS 7 PS4/PS5", price: 120.00 },
  { name: "COD COLD WAR PS4/PS5", price: 80.00 },
  { name: "CRASH BANDICOOT TRILOGY PS4/PS5", price: 59.90 },
  { name: "CRASH NITRO KART PS4/PS5", price: 59.90 },
  { name: "DEAD ISLAND 2 PS4/PS5", price: 50.00 },
  { name: "DEAD SPACE PS5", price: 69.90 },
  { name: "DEMON SLAYER 2 PS4/PS5", price: 144.90 },
  { name: "DETROIT BECOME HUMAN PS4/PS5", price: 59.90 },
  { name: "DEVIL MAY CRY 5 PS5", price: 30.00 },
  { name: "DEVIL MAY CRY 5 + VERGIL PS4/PS5", price: 16.90 },
  { name: "DEVIL MAY CRY DEFINITIVE EDITION PS4", price: 36.90 },
  { name: "DIABLO 4 PS4/PS5", price: 100.00 },
  { name: "DIABLO ETERNAL COLLECTION PS4/PS5", price: 64.90 },
  { name: "DOOM DARK AGES PS5", price: 110.00 },
  { name: "DOOM ETERNAL PS4/PS5", price: 64.90 },
  { name: "DRAGON BALL KAKAROT PS4/PS5", price: 59.90 },
  { name: "DRAGON BALL SPARKING ZERO PS5", price: 174.90 },
  { name: "DYING LIGHT PS4/PS5", price: 20.00 },
  { name: "DYING LIGHT 2 PS4/PS5", price: 54.90 },
  { name: "DYING LIGHT THE BEAST PS5", price: 159.90 },
  { name: "EXPEDITION 33 PS5", price: 149.90 },
  { name: "FAR CRY 5 PS4/PS5", price: 30.00 },
  { name: "FAR CRY 6 PS4/PS5", price: 54.90 },
  { name: "FAR CRY NEW DAWN PS4/PS5", price: 24.90 },
  { name: "FINAL FANTASY XVI PS5", price: 119.90 },
  { name: "GHOST RECON WILDLANDS PS4/PS5", price: 34.90 },
  { name: "GOD OF WAR 2018 PS4/PS5", price: 59.90 },
  { name: "GOD OF WAR 3 REMASTER PS4/PS5", price: 36.99 },
  { name: "GTA V PS4/PS5", price: 59.90 },
  { name: "HELLBLADE 2 PS5", price: 70.00 },
  { name: "HI-FI RUSH PS5", price: 59.90 },
  { name: "HOGWARTS LEGACY PS4/PS5", price: 39.90 },
  { name: "HORIZON FORBIDDEN WEST PS4/PS5", price: 100.00 },
  { name: "JEDI FALLEN ORDER PS4/PS5", price: 44.99 },
  { name: "JUST CAUSE 4 PS4/PS5", price: 19.90 },
  { name: "MAFIA 3 PS4/PS5", price: 24.90 },
  { name: "MAFIA THE OLD COUNTRY PS5", price: 159.90 },
  { name: "MARTHA IS DEAD PS4/PS5", price: 40.00 },
  { name: "MORTAL KOMBAT 1 PS5", price: 69.90 },
  { name: "MORTAL KOMBAT 11 PS4/PS5", price: 20.00 },
  { name: "NARUTO STORM 4 PS4/PS5", price: 59.90 },
  { name: "NBA 2K26 PS4/PS5", price: 65.00 },
  { name: "PREY PS4/PS5", price: 27.90 },
  { name: "PRINCE OF PERSIA LOST CROWN PS4/PS5", price: 44.90 },
  { name: "REANIMAL PS5", price: 159.90 },
  { name: "RED DEAD REDEMPTION 2 PS4/PS5", price: 64.90 },
  { name: "SHADOW OF THE COLOSSUS PS4/PS5", price: 44.99 },
  { name: "SHADOW OF MORDOR PS4/PS5", price: 17.90 },
  { name: "SNIPER ELITE 4 PS4/PS5", price: 27.90 },
  { name: "SNIPER ELITE RESISTANCE PS4/PS5", price: 109.90 },
  { name: "STAR WARS OUTLAWS PS5", price: 69.90 },
  { name: "TEST DRIVE UNLIMITED SOLAR CROWN PS5", price: 44.90 },
  { name: "THE CREW MOTORFEST PS4/PS5", price: 55.00 },
  { name: "THE ELDER SCROLLS V SKYRIM PS4/PS5", price: 36.90 },
  { name: "THE LAST OF US PART I PS5", price: 120.00 },
  { name: "THE LAST OF US PART II PS4", price: 100.00 },
  { name: "THE LAST OF US REMASTERED PS4/PS5", price: 35.90 },
  { name: "THE ORDER 1886 PS4/PS5", price: 36.90 },
  { name: "TOM CLANCY GHOST RECON BREAKPOINT PS4/PS5", price: 39.90 },
  { name: "TONY HAWK'S PRO SKATER 1+2 PS4/PS5", price: 64.90 },
  { name: "UNCHARTED 4 + LOST LEGACY PS4", price: 69.90 },
  { name: "UNCHARTED LEGACY OF THIEVES PS5", price: 89.90 },
  { name: "WATCH DOGS LEGION PS4/PS5", price: 29.90 },
  { name: "WOLFENSTEIN THE NEW ORDER PS4/PS5", price: 16.90 },
  { name: "WUCHANG FALLEN FEATHERS PS5", price: 149.90 },
  { name: "WWE 2K26 PS5", price: 184.90 },
];

const WA = "https://wa.me/554384253691";

function priceText(price: number) {
  return price === 0 ? "A definir com ADM" : `R$ ${price.toFixed(2).replace(".", ",")}`;
}

export function registerAiRoute(app: Express) {
  app.get("/api/ai", async (req, res) => {
    const query = (req.query.q as string) ?? "";
    if (!query) return res.status(400).json({ error: "Missing query parameter 'q'" });

    const nq = normalizeText(query);

    // --- FAQ shortcuts ---
    if (/pagamento|pix|cartao|boleto|pagar|pago/.test(nq)) {
      return res.json({ answer: "Aceitamos Pix, Cartão de Crédito e Boleto. Todo pagamento é processado com segurança via Mercado Pago." });
    }
    if (/entrega|envio|prazo|frete|como recebo/.test(nq)) {
      return res.json({ answer: "As mídias digitais (PS4/PS5) são enviadas via WhatsApp ou e-mail logo após a aprovação do pagamento. Para usados físicos o envio é pelos Correios com rastreio." });
    }
    if (/contato|whatsapp|telefone|suporte|falar com|atendimento|adm/.test(nq)) {
      return res.json({ answer: `Fale com a gente direto no WhatsApp! [Clique aqui para abrir o WhatsApp](${WA})` });
    }
    if (/como comprar|adquirir|vender|virar vendedor/.test(nq)) {
      return res.json({ answer: "Para comprar, navegue pelo catálogo de Mídia Digital ou Usados e clique em 'Comprar via WhatsApp'. O pagamento é combinado diretamente com o administrador." });
    }

    // --- Check for "quais" / "lista" / "todos" --- list mode
    const isListQuery = /quais|lista|todos|tem algum|voces tem|vocês tem|disponivel|disponível/.test(nq);

    // Extract search keywords
    const stopWords = new Set(["tem", "voce", "voces", "o", "de", "com", "jogo", "jogos", "disponivel", "a", "os", "as", "um", "uma", "para", "em", "no", "na", "que", "e", "do", "da", "game", "games", "ps4", "ps5", "quais", "todos", "lista"]);
    const keywords = nq.split(" ").filter(w => w.length > 2 && !stopWords.has(w));

    interface Scored { game: typeof CATALOG[0]; score: number; }
    const scored: Scored[] = [];

    for (const game of CATALOG) {
      const nn = normalizeText(game.name);
      let score = 0;

      if (nq.includes(nn)) score += 100;
      else if (nn.includes(nq) && nq.length >= 3) score += 80;

      if (keywords.length > 0) {
        const nameWords = nn.split(" ");
        let matches = 0;
        for (const kw of keywords) {
          if (nameWords.some(nw => nw.includes(kw) || kw.includes(nw))) matches++;
        }
        score += (matches / keywords.length) * 60;
      }

      if (score >= 15) scored.push({ game, score });
    }

    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return res.json({
        answer: `Não encontrei esse título no catálogo. Tente com outra grafia ou [fale com o ADM no WhatsApp](${WA}) para verificar se conseguimos!`,
      });
    }

    // Single strong match
    if ((scored[0].score >= 80 || scored.length === 1) && !isListQuery) {
      const g = scored[0].game;
      const waLink = `${WA}?text=${encodeURIComponent(`Olá! Tenho interesse no jogo ${g.name} - ${priceText(g.price)}`)}`;
      return res.json({
        answer: `✅ Temos **${g.name}** disponível!\n\n💰 Preço: **${priceText(g.price)}**\n\n[👉 Comprar via WhatsApp](${waLink})`,
      });
    }

    // Multiple matches or list query
    const top = scored.slice(0, 8);
    const list = top.map(s => `• **${s.game.name}** — ${priceText(s.game.price)}`).join("\n");
    const suffix = scored.length > 8 ? `\n\n_(e mais ${scored.length - 8} outros...)_` : "";

    return res.json({
      answer: `Encontrei **${scored.length}** jogo(s) correspondente(s):\n\n${list}${suffix}\n\nQuer saber mais sobre algum? [Fale com o ADM no WhatsApp](${WA})`,
    });
  });
}
