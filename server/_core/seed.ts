import { Express } from "express";
import { getDb } from "../db";
import { digitalProducts } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const gameImages: Record<string, string> = {
  "A WAY OUT": "https://cdn.akamai.steamstatic.com/steam/apps/1222700/header.jpg",
  "AMNESIA COLLECTION": "https://cdn.akamai.steamstatic.com/steam/apps/57300/header.jpg",
  "ASSASSIN’S CREED BLACK FLAG": "https://cdn.akamai.steamstatic.com/steam/apps/242050/header.jpg",
  "ASSASSIN’S CREED UNITY": "https://cdn.akamai.steamstatic.com/steam/apps/289650/header.jpg",
  "BATMAN ARKHAM KNIGHT": "https://cdn.akamai.steamstatic.com/steam/apps/208650/header.jpg",
  "BATTLEFIELD 1": "https://cdn.akamai.steamstatic.com/steam/apps/1238840/header.jpg",
  "BATTLEFIELD 4": "https://cdn.akamai.steamstatic.com/steam/apps/1238860/header.jpg",
  "BATTLEFIELD 5": "https://cdn.akamai.steamstatic.com/steam/apps/1238810/header.jpg",
  "BIOSHOCK 2": "https://cdn.akamai.steamstatic.com/steam/apps/409720/header.jpg",
  "BIOSHOCK COLLECTION": "https://cdn.akamai.steamstatic.com/steam/apps/409710/header.jpg",
  "BLAIR WITCH": "https://cdn.akamai.steamstatic.com/steam/apps/1092660/header.jpg",
  "BULLY": "https://cdn.akamai.steamstatic.com/steam/apps/11020/header.jpg",
  "BURNOUT PARADISE": "https://cdn.akamai.steamstatic.com/steam/apps/1238080/header.jpg",
  "BUS SIMULATOR": "https://cdn.akamai.steamstatic.com/steam/apps/976590/header.jpg",
  "CONTROL": "https://cdn.akamai.steamstatic.com/steam/apps/870780/header.jpg",
  "CRYSIS TRILOGY": "https://cdn.akamai.steamstatic.com/steam/apps/1713000/header.jpg",
  "DARK GENESIS": "https://cdn.akamai.steamstatic.com/steam/apps/1604920/header.jpg",
  "DEAD ISLAND COLLECTION": "https://cdn.akamai.steamstatic.com/steam/apps/233130/header.jpg",
  "DEMON SLAYER": "https://cdn.akamai.steamstatic.com/steam/apps/1434460/header.jpg",
  "DETROIT BECOME HUMAN": "https://cdn.akamai.steamstatic.com/steam/apps/1153640/header.jpg",
  "DMC 5 + VERGIL (VERSÃO PS4)": "https://cdn.akamai.steamstatic.com/steam/apps/601150/header.jpg",
  "DOOM": "https://cdn.akamai.steamstatic.com/steam/apps/379720/header.jpg",
  "DRAKE COLLECTION": "https://cdn.akamai.steamstatic.com/steam/apps/1659420/header.jpg",
  "DYING LIGHT PREMIUM": "https://cdn.akamai.steamstatic.com/steam/apps/239140/header.jpg",
  "DRAGON BALL XENOVERSE": "https://cdn.akamai.steamstatic.com/steam/apps/454650/header.jpg",
  "FAR CRY 4": "https://cdn.akamai.steamstatic.com/steam/apps/298110/header.jpg",
  "FAR CRY 5 + NEW DAWN": "https://cdn.akamai.steamstatic.com/steam/apps/552520/header.jpg",
  "FAR CRY NEW DAWN": "https://cdn.akamai.steamstatic.com/steam/apps/939960/header.jpg",
  "GANG BEASTS": "https://cdn.akamai.steamstatic.com/steam/apps/285900/header.jpg",
  "GOAT SIMULATOR": "https://cdn.akamai.steamstatic.com/steam/apps/265930/header.jpg",
  "GREEN HELL": "https://cdn.akamai.steamstatic.com/steam/apps/815370/header.jpg",
  "HOGWARTS LEGACY": "https://cdn.akamai.steamstatic.com/steam/apps/990080/header.jpg",
  "INJUSTICE 2": "https://cdn.akamai.steamstatic.com/steam/apps/627270/header.jpg",
  "INJUSTICE LEGENDARY": "https://cdn.akamai.steamstatic.com/steam/apps/242700/header.jpg",
  "IT TAKES TWO": "https://cdn.akamai.steamstatic.com/steam/apps/1426210/header.jpg",
  "JUST CAUSE 3": "https://cdn.akamai.steamstatic.com/steam/apps/225540/header.jpg",
  "JUST CAUSE 4 RELOADED": "https://cdn.akamai.steamstatic.com/steam/apps/517630/header.jpg",
  "LEGO JURASSIC WORLD": "https://cdn.akamai.steamstatic.com/steam/apps/352400/header.jpg",
  "LEGO MARVEL SUPER HEROES": "https://cdn.akamai.steamstatic.com/steam/apps/249130/header.jpg",
  "LEGO MARVEL SUPER HEROES 2": "https://cdn.akamai.steamstatic.com/steam/apps/647830/header.jpg",
  "MARVEL VS CAPCOM INFINITE": "https://cdn.akamai.steamstatic.com/steam/apps/493840/header.jpg",
  "MONSTER ENERGY SUPERCROSS 3": "https://cdn.akamai.steamstatic.com/steam/apps/1089830/header.jpg",
  "NEED FOR SPEED HEAT": "https://cdn.akamai.steamstatic.com/steam/apps/1222680/header.jpg",
  "NEED FOR SPEED RIVALS": "https://cdn.akamai.steamstatic.com/steam/apps/1262580/header.jpg",
  "OUTLAST": "https://cdn.akamai.steamstatic.com/steam/apps/238320/header.jpg",
  "OUTLAST 1 + 2 + DLC": "https://cdn.akamai.steamstatic.com/steam/apps/414700/header.jpg",
  "RED DEAD REDEMPTION 2": "https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg",
  "RESIDENT EVIL 3": "https://cdn.akamai.steamstatic.com/steam/apps/952060/header.jpg",
  "RESIDENT EVIL 6": "https://cdn.akamai.steamstatic.com/steam/apps/221040/header.jpg",
  "RESIDENT EVIL 7 GOLD": "https://cdn.akamai.steamstatic.com/steam/apps/418370/header.jpg",
  "RESIDENT EVIL REVELATIONS 2": "https://cdn.akamai.steamstatic.com/steam/apps/287290/header.jpg",
  "RIDE 4": "https://cdn.akamai.steamstatic.com/steam/apps/1259980/header.jpg",
  "RIDERS REPUBLIC": "https://cdn.akamai.steamstatic.com/steam/apps/2290180/header.jpg",
  "SAINTS ROW 4": "https://cdn.akamai.steamstatic.com/steam/apps/206420/header.jpg",
  "SHADOW OF THE COLOSSUS": "https://image.api.playstation.com/vulcan/img/rnd/202011/0302/N8f4iL5kQkH5cO64m0QxR8uL.png",
  "SLEEPING DOGS": "https://cdn.akamai.steamstatic.com/steam/apps/307690/header.jpg",
  "SNIPER CONTRACTS": "https://cdn.akamai.steamstatic.com/steam/apps/973580/header.jpg",
  "STAR WARS JEDI FALLEN ORDER": "https://cdn.akamai.steamstatic.com/steam/apps/1172380/header.jpg",
  "THE EVIL WITHIN 2": "https://cdn.akamai.steamstatic.com/steam/apps/601430/header.jpg",
  "THE WITCHER 3": "https://cdn.akamai.steamstatic.com/steam/apps/292030/header.jpg",
  "TONY HAWK’S 1 + 2": "https://cdn.akamai.steamstatic.com/steam/apps/1904710/header.jpg",
  "TOMB RAIDER DEFINITIVE EDITION": "https://cdn.akamai.steamstatic.com/steam/apps/203160/header.jpg",
  "UNRAVEL TWO": "https://cdn.akamai.steamstatic.com/steam/apps/1222730/header.jpg",
  "WOLFENSTEIN THE NEW ORDER": "https://cdn.akamai.steamstatic.com/steam/apps/280500/header.jpg",
  "WORLD WAR Z (VERSÃO PS4)": "https://cdn.akamai.steamstatic.com/steam/apps/1522820/header.jpg",
  "XCOM 2": "https://cdn.akamai.steamstatic.com/steam/apps/268500/header.jpg",
  "ZOMBIE ARMY 4": "https://cdn.akamai.steamstatic.com/steam/apps/698060/header.jpg"
};

const games = Object.keys(gameImages);

export function registerSeedRoute(app: Express) {
  app.get("/api/seed-database-secret-eforte", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Banco de dados não disponível! Verifique a variável DATABASE_URL." });
      }

      let insertedCount = 0;
      let updatedCount = 0;

      for (const game of games) {
        const imageUrl = gameImages[game] || "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=400";
        const existing = await db
          .select()
          .from(digitalProducts)
          .where(eq(digitalProducts.name, game))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(digitalProducts)
            .set({ imageUrl })
            .where(eq(digitalProducts.name, game));
          updatedCount++;
          continue;
        }

        await db.insert(digitalProducts).values({
          name: game,
          description: "Jogo digital. Valor sob consulta/a combinar com o administrador.",
          price: "0.00",
          type: "jogo",
          keyOrCode: "A combinar com o administrador.",
          downloadUrl: "https://wa.me/554384253691",
          imageUrl,
          stock: 999,
          isActive: true,
        });

        insertedCount++;
      }

      res.json({
        success: true,
        message: "Seeding concluído com sucesso!",
        insertedCount,
        updatedCount,
      });
    } catch (err: any) {
      console.error("[SeedRoute] failed:", err);
      res.status(500).json({ error: err.message || "Erro desconhecido" });
    }
  });
}
