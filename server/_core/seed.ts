import { Express } from "express";
import { getDb } from "../db";
import { digitalProducts } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const games = [
  "A WAY OUT",
  "AMNESIA COLLECTION",
  "ASSASSIN’S CREED BLACK FLAG",
  "ASSASSIN’S CREED UNITY",
  "BATMAN ARKHAM KNIGHT",
  "BATTLEFIELD 1",
  "BATTLEFIELD 4",
  "BATTLEFIELD 5",
  "BIOSHOCK 2",
  "BIOSHOCK COLLECTION",
  "BLAIR WITCH",
  "BULLY",
  "BURNOUT PARADISE",
  "BUS SIMULATOR",
  "CONTROL",
  "CRYSIS TRILOGY",
  "DARK GENESIS",
  "DEAD ISLAND COLLECTION",
  "DEMON SLAYER",
  "DETROIT BECOME HUMAN",
  "DMC 5 + VERGIL (VERSÃO PS4)",
  "DOOM",
  "DRAKE COLLECTION",
  "DYING LIGHT PREMIUM",
  "DRAGON BALL XENOVERSE",
  "FAR CRY 4",
  "FAR CRY 5 + NEW DAWN",
  "FAR CRY NEW DAWN",
  "GANG BEASTS",
  "GOAT SIMULATOR",
  "GREEN HELL",
  "HOGWARTS LEGACY",
  "INJUSTICE 2",
  "INJUSTICE LEGENDARY",
  "IT TAKES TWO",
  "JUST CAUSE 3",
  "JUST CAUSE 4 RELOADED",
  "LEGO JURASSIC WORLD",
  "LEGO MARVEL SUPER HEROES",
  "LEGO MARVEL SUPER HEROES 2",
  "MARVEL VS CAPCOM INFINITE",
  "MONSTER ENERGY SUPERCROSS 3",
  "NEED FOR SPEED HEAT",
  "NEED FOR SPEED RIVALS",
  "OUTLAST",
  "OUTLAST 1 + 2 + DLC",
  "RED DEAD REDEMPTION 2",
  "RESIDENT EVIL 3",
  "RESIDENT EVIL 6",
  "RESIDENT EVIL 7 GOLD",
  "RESIDENT EVIL REVELATIONS 2",
  "RIDE 4",
  "RIDERS REPUBLIC",
  "SAINTS ROW 4",
  "SHADOW OF THE COLOSSUS",
  "SLEEPING DOGS",
  "SNIPER CONTRACTS",
  "STAR WARS JEDI FALLEN ORDER",
  "THE EVIL WITHIN 2",
  "THE WITCHER 3",
  "TONY HAWK’S 1 + 2",
  "TOMB RAIDER DEFINITIVE EDITION",
  "UNRAVEL TWO",
  "WOLFENSTEIN THE NEW ORDER",
  "WORLD WAR Z (VERSÃO PS4)",
  "XCOM 2",
  "ZOMBIE ARMY 4"
];

export function registerSeedRoute(app: Express) {
  app.get("/api/seed-database-secret-eforte", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Banco de dados não disponível! Verifique a variável DATABASE_URL." });
      }

      let insertedCount = 0;
      let skippedCount = 0;

      for (const game of games) {
        const existing = await db
          .select()
          .from(digitalProducts)
          .where(eq(digitalProducts.name, game))
          .limit(1);

        if (existing.length > 0) {
          skippedCount++;
          continue;
        }

        await db.insert(digitalProducts).values({
          name: game,
          description: "Jogo digital. Valor sob consulta/a combinar com o administrador.",
          price: "0.00",
          type: "jogo",
          keyOrCode: "A combinar com o administrador.",
          downloadUrl: "https://wa.me/554384253691",
          stock: 999,
          isActive: true,
        });

        insertedCount++;
      }

      res.json({
        success: true,
        message: "Seeding concluído com sucesso!",
        insertedCount,
        skippedCount,
      });
    } catch (err: any) {
      console.error("[SeedRoute] failed:", err);
      res.status(500).json({ error: err.message || "Erro desconhecido" });
    }
  });
}
