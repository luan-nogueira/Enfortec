import dotenv from "dotenv";
import path from "path";
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { getDb } from "./server/db";
import { digitalProducts } from "./drizzle/schema";
import { eq } from "drizzle-orm";

const games: Array<{ name: string; price: string; imageUrl: string }> = [
  { name: "AGONY PS4/PS5", price: "9.90", imageUrl: "https://image.api.playstation.com/cdn/UP3643/CUSA11335_00/6AJJ5GqsM3Gl9kAGCMuIhvJAn5bIj4DM.png" },
  { name: "ALIEN ROGUE PS5", price: "84.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202301/1921/yAjXHBpxFRHPmqjmEzMXxVxn.png" },
  { name: "ASSASSIN'S CREED MIRAGE PS4/PS5", price: "59.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/c4af4f0c80d06c8a30e4f8484a1bc6b9d195db5e.png" },
  { name: "ASSASSIN'S CREED ODYSSEY PS4/PS5", price: "44.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/jB5hPkv7TGtCbpqHIgv8DwO0.png" },
  { name: "ASSASSIN'S CREED ORIGINS PS4/PS5", price: "37.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/eMPFvSiX4bsQ0SU4ufwBTkxv.png" },
  { name: "ASSASSIN'S CREED SHADOWS PS5", price: "144.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202310/1321/4d8eb09de80d1cce0b4fcb65540c3f880e9d8edf9143acb.png" },
  { name: "ASSASSIN'S CREED SYNDICATE PS4/PS5", price: "59.99", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/3GNYFXnqhieyNGEfMCnSVMoM.png" },
  { name: "ASSASSIN'S CREED VALHALLA PS4/PS5", price: "50.00", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0303/jt3X0TKH5d04yV5qjlDiN3Ei.png" },
  { name: "ATOMIC HEART PS4/PS5", price: "69.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202210/2000/nNbQLSrkJYAVVuoJH0bKF8Bn.png" },
  { name: "AVATAR PS4/PS5", price: "74.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202308/2319/7e3e0d0e77f50d0da7ba1ce47a0ed3d5d04e96c18b6e4d91.png" },
  { name: "BATTLEFIELD 1 PS4/PS5", price: "34.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/2bwK9eDr6lEiNmFMcFZVBXuZ.png" },
  { name: "BATTLEFIELD 4 PS4/PS5", price: "29.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/ZicIPnBDrZ8gZRi7Ll8KhKd3.png" },
  { name: "BATTLEFIELD V PS4/PS5", price: "36.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/6vNHU9WZYiHRXUUxk5b3k1y1.png" },
  { name: "BLEACH REBIRTH PS5", price: "100.00", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202309/2217/9ae0ac7e5de69c11a5e34ec9b7e9fec1c1be9f0e4527c62e.png" },
  { name: "CALL OF DUTY GHOSTS PS4/PS5", price: "99.90", imageUrl: "https://image.api.playstation.com/cdn/UP0002/CUSA00006_00/ztPoAnxVLFNsG1FkpTsEt5pE2BOqfhvG.png" },
  { name: "CALL OF DUTY VANGUARD PS4/PS5", price: "89.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202109/1323/MFJTOl5M2FHIH0WOIjHYmBLM.png" },
  { name: "CALL OF DUTY WW2 PS4/PS5", price: "100.00", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/n6e28gU0TGU3XVpSUDWKSRrh.png" },
  { name: "COD BLACK OPS 6 PS4/PS5", price: "80.00", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202406/1000/df0c7e85d13b12a04bad43bba3148de793a527afe099df2b.png" },
  { name: "COD BLACK OPS 7 PS4/PS5", price: "120.00", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202406/1000/df0c7e85d13b12a04bad43bba3148de793a527afe099df2b.png" },
  { name: "COD COLD WAR PS4/PS5", price: "80.00", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202011/2917/cOmJDMWNBOCeZ9Coa3wHOkJp.png" },
  { name: "CRASH BANDICOOT TRILOGY PS4/PS5", price: "59.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/ByXVNqnkDQ0e6d0t3tXPhJXT.png" },
  { name: "CRASH NITRO PS4/PS5", price: "59.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/2718/VVjPR1q0B3w2qBBjOAT5ZIrc.png" },
  { name: "DEAD ISLAND 2 PS4/PS5", price: "50.00", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202212/0821/t7YKXWOXnFH8LlOzCQnnGBxE.png" },
  { name: "DEAD SPACE PS5", price: "69.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202210/2717/k2JicPEHfB2qHONk0EGXBnW4.png" },
  { name: "DEMON SLAYER 2 PS4/PS5", price: "144.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202208/1917/aTLa2FNTqnTHqTxFl6VJV6Dz.png" },
  { name: "DETROIT BECOME HUMAN PS4/PS5", price: "59.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/cXhQ63KtDd7Dyl7p0MHmrIb1.png" },
  { name: "DEVIL MAY CRY 5 PS5", price: "30.00", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202010/2614/AEvvFrHGCv8tVeUFsQO4nCBa.png" },
  { name: "DEVIL MAY CRY 5 + VERGIL PS4/PS5", price: "16.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202010/2614/AEvvFrHGCv8tVeUFsQO4nCBa.png" },
  { name: "DEVIL MAY CRY DEFINITIVE EDITION PS4/PS5", price: "36.90", imageUrl: "https://image.api.playstation.com/cdn/UP0102/CUSA01013_00/xEdzSHaOsWj9f9aPwVWXMvmUlR5VCQIN.png" },
  { name: "DIABLO 4 PS4/PS5", price: "100.00", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202208/2321/UMxITxYiMY27p9HxfH3XGWVx.png" },
  { name: "DIABLO ETERNAL COLLECTION PS4/PS5", price: "64.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/LxCUBfJxoZNJH7Qu0aECzTMB.png" },
  { name: "DOOM DARK AGES PS5", price: "110.00", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202410/0218/8a3f9e7bcf9e17e0e6c44e6d7c8e6f5e8e5e4d3c2b1a0f.png" },
  { name: "DOOM ETERNAL PS4/PS5", price: "64.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/xEkMtqvPhYxYL4bFi3WsUWm0.png" },
  { name: "DRAGON BALL KAKAROT PS4/PS5", price: "59.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/Fp1mFEKOvuMZ9XKhpnJVjJVW.png" },
  { name: "DRAGON BALL SPARKING ZERO PS5", price: "174.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202406/2619/0a86cfef3d6e4ae1f8e5ca3c38e2ce5f4d5c8b9a7e6f5d4.png" },
  { name: "DYING LIGHT PS4/PS5", price: "20.00", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/EGNJuylmGcMJmJjQfuFhd7Rx.png" },
  { name: "DYING LIGHT 2 PS4/PS5", price: "54.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202111/2917/LXXQjFfTjW2GmGHtLf4P5cXG.png" },
  { name: "DYING LIGHT THE BEAST PS5", price: "159.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202404/1011/3e2d1c0b9a8f7e6d5c4b3a2910f8e7d6c5b4a3928170f6e.png" },
  { name: "EXPEDITION 33 PS5", price: "149.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202501/2117/e8d7c6b5a4938271605f4e3d2c1b0a9f8e7d6c5b4a392817.png" },
  { name: "FAR CRY 5 PS4/PS5", price: "30.00", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/7FMuzrNBl4TQYNWsHbwzAKVW.png" },
  { name: "FAR CRY 6 PS4/PS5", price: "54.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202108/1016/W2rJNLzRj0c6B8i3vj3h82CX.png" },
  { name: "FAR CRY NEW DAWN PS4/PS5", price: "24.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/Qd2xezK0r25iR2L7b5gVvqS0.png" },
  { name: "FINAL FANTASY XVI PS5", price: "119.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202212/1319/3FMiHKAXj0Mx6gjEY16a0X6E.png" },
  { name: "GHOST RECON WILDLANDS PS4/PS5", price: "34.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/5cPbSFBVjS3R8N7RL4v9bCvP.png" },
  { name: "GOD OF WAR 2018 PS4/PS5", price: "59.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0224/CEJPGKFrHQS2bWM73GBTFoB7.png" },
  { name: "GOD OF WAR 3 REMASTER PS4/PS5", price: "36.99", imageUrl: "https://image.api.playstation.com/cdn/UP9000/CUSA01399_00/rLAIvMd8sGVkjrFR7VTNQ6mqdl3h91YH.png" },
  { name: "GTA V PS4/PS5", price: "59.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/VVzwK1oEzd5wZJxjsGQrFhMC.png" },
  { name: "HELLBLADE 2 PS5", price: "70.00", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202405/2319/5e4d3c2b1a0f9e8d7c6b5a4938271605f4e3d2c1b0a9f8e.png" },
  { name: "HI-FI RUSH PS5", price: "59.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202303/1521/ba05d5b7a09e77571e4e0f1f2e2b8e5e6f3c4d1a2b3c4d5.png" },
  { name: "HOGWARTS LEGACY PS4/PS5", price: "39.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202301/1609/58ea0f4d30190de8bdf3c3a3b4d5e6f7a8b9c0d1e2f3a4b5.png" },
  { name: "HORIZON FORBIDDEN WEST PS4/PS5", price: "100.00", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202107/2321/LNEKHhKrxFzHiFXwU6pLGPE2.png" },
  { name: "JEDI FALLEN ORDER PS4/PS5", price: "44.99", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/Qv9UfHBHV5gJTkzHaMhJjkdU.png" },
  { name: "JUST CAUSE 4 PS4/PS5", price: "19.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/KS5UJSiJMJaUmBwZDCq2TH5X.png" },
  { name: "MAFIA 3 PS4/PS5", price: "24.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/sHoX0s2gkMJlpFH5PUr8JWDY.png" },
  { name: "MAFIA THE OLD COUNTRY PS5", price: "159.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202503/2713/4e3d2c1b0a9f8e7d6c5b4a392817160504f3e2d1c0b9a8f7.png" },
  { name: "MARTHA IS DEAD PS4/PS5", price: "40.00", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202110/2920/YBRYFmq5UxkEqrz0nJPEJOTn.png" },
  { name: "MORTAL KOMBAT 1 PS5", price: "69.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202306/0812/d7b0ec4c6f7f3a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f.png" },
  { name: "MORTAL KOMBAT 11 PS4/PS5", price: "20.00", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/fMHYU1XYCZ3UXkpgBRuLmNPp.png" },
  { name: "NARUTO STORM 4 PS4/PS5", price: "59.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/z65dEO1vCfX4DynMNOsXGQrD.png" },
  { name: "NBA 2K26 PS4/PS5", price: "65.00", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202507/0811/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f.png" },
  { name: "PREY PS4/PS5", price: "27.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/Gzw7Rm2fREPJ4P4hqTd9oHkl.png" },
  { name: "PRINCE OF PERSIA LOST CROWN PS4/PS5", price: "44.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202309/0611/8d7c6b5a4938271605f4e3d2c1b0a9f8e7d6c5b4a392817.png" },
  { name: "REANIMAL PS5", price: "159.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202504/1011/9f8e7d6c5b4a3928171605f4e3d2c1b0a9f8e7d6c5b4a392.png" },
  { name: "RED DEAD REDEMPTION 2 PS4/PS5", price: "64.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/WSBm2mWYOA4r4bJwKPKqbFjR.png" },
  { name: "SHADOW OF THE COLOSSUS PS4/PS5", price: "44.99", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0302/N8f4iL5kQkH5cO64m0QxR8uL.png" },
  { name: "SHADOW OF MORDOR PS4/PS5", price: "17.90", imageUrl: "https://image.api.playstation.com/cdn/UP1004/CUSA00207_00/aKLbcMJmHI7JC2IHxTqSV9dlzVJQVhKf.png" },
  { name: "SNIPER ELITE 4 PS4/PS5", price: "27.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/sZ6VmSpqNL7bIaAT3E17K7A3.png" },
  { name: "SNIPER ELITE RESISTANCE PS4/PS5", price: "109.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202412/1019/3c2b1a0f9e8d7c6b5a4938271605f4e3d2c1b0a9f8e7d6c5.png" },
  { name: "STAR WARS OUTLAWS PS5", price: "69.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/3e2d1c0b9a8f7e6d5c4b3a2910f8e7d6c5b4a3928170f6e5.png" },
  { name: "TEST DRIVE UNLIMITED SOLAR CROWN PS5", price: "44.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202304/0415/5d4c3b2a1908f7e6d5c4b3a2918170f6e5d4c3b2a1908f7e.png" },
  { name: "THE CREW MOTORFEST PS4/PS5", price: "55.00", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202307/1921/a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6.png" },
  { name: "THE ELDER SCROLLS V SKYRIM PS4/PS5", price: "36.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202111/1719/TYKPMn7ISGalqMqv6Y3RNGpz.png" },
  { name: "THE LAST OF US PART I PS5", price: "120.00", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202206/0321/NVU5FJ7GJvTBELPMeagHEZUt.png" },
  { name: "THE LAST OF US PART II PS4", price: "100.00", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/iyXT9t0uyxgLjmEqMZFq1TI9.png" },
  { name: "THE LAST OF US REMASTERED PS4/PS5", price: "35.90", imageUrl: "https://image.api.playstation.com/cdn/UP9000/CUSA00552_00/pHepWgBDXBGLjIhYQHr6KMOM6cqHRXQd.png" },
  { name: "THE ORDER 1886 PS4/PS5", price: "36.90", imageUrl: "https://image.api.playstation.com/cdn/UP9000/CUSA00422_00/V7tVhHY5zIz5pQdtNBNTdYbGkv5XWPAN.png" },
  { name: "TOM CLANCY GHOST RECON BREAKPOINT PS4/PS5", price: "39.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/QolEBjHaxZ3sPQxcvnHJIVFM.png" },
  { name: "TONY HAWK'S PRO SKATER 1+2 PS4/PS5", price: "64.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/dImGXjmTHSNImPMvOT2xVGFl.png" },
  { name: "UNCHARTED 4 + LOST LEGACY PS4", price: "69.90", imageUrl: "https://image.api.playstation.com/cdn/UP9000/CUSA04530_00/hqPoEq7PBmKfz99fKbkiGP5YPYIX5X17.png" },
  { name: "UNCHARTED LEGACY OF THIEVES PS5", price: "89.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202111/2917/T2ZXAZFCB6dBOBIEHMbXFhEq.png" },
  { name: "WATCH DOGS LEGION PS4/PS5", price: "29.90", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/NlV5MVamTuO8VZxBr65smWDy.png" },
  { name: "WOLFENSTEIN THE NEW ORDER PS4/PS5", price: "16.90", imageUrl: "https://image.api.playstation.com/cdn/UP1001/CUSA00326_00/lMcIiAnXZT1UGRfI0cJoFDsYDCEoE8Z6.png" },
  { name: "WUCHANG FALLEN FEATHERS PS5", price: "149.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202503/1411/8e7d6c5b4a3928171605f4e3d2c1b0a9f8e7d6c5b4a39281.png" },
  { name: "WWE 2K26 PS5", price: "184.90", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202503/2614/7d6c5b4a392817160504f3e2d1c0b9a8f7e6d5c4b3a29281.png" },
];

async function seed() {
  console.log("Iniciando inserção dos jogos PS4/PS5...");

  const db = await getDb();
  if (!db) {
    console.error("Banco de dados não disponível! Verifique DATABASE_URL.");
    process.exit(1);
  }

  let inserted = 0;
  let updated = 0;

  for (const game of games) {
    const existing = await db
      .select()
      .from(digitalProducts)
      .where(eq(digitalProducts.name, game.name))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(digitalProducts)
        .set({ imageUrl: game.imageUrl, price: game.price })
        .where(eq(digitalProducts.name, game.name));
      console.log(`[~] Atualizado: ${game.name}`);
      updated++;
      continue;
    }

    await db.insert(digitalProducts).values({
      name: game.name,
      description: `Jogo digital PS4/PS5 - Mídia Digital. Entre em contato para finalizar a compra.`,
      price: game.price,
      type: "jogo",
      keyOrCode: "A combinar após pagamento.",
      downloadUrl: "https://wa.me/554384253691",
      imageUrl: game.imageUrl,
      stock: 999,
      isActive: true,
    });

    console.log(`[+] Inserido: ${game.name}`);
    inserted++;
  }

  console.log(`\nConcluído! Inseridos: ${inserted}, Atualizados: ${updated}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
