import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Run: npx tsx seed-firestore.ts
// Requires: GOOGLE_APPLICATION_CREDENTIALS or service account JSON

const games = [
  { name: "AGONY PS4/PS5", price: 9.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/cdn/UP3643/CUSA11335_00/6AJJ5GqsM3Gl9kAGCMuIhvJAn5bIj4DM.png" },
  { name: "ALIEN ROGUE INCURSION PS5", price: 84.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202301/1921/yAjXHBpxFRHPmqjmEzMXxVxn.png" },
  { name: "ASSASSIN'S CREED MIRAGE PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/c4af4f0c80d06c8a30e4f8484a1bc6b9d195db5e.png" },
  { name: "ASSASSIN'S CREED ODYSSEY PS4/PS5", price: 44.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/jB5hPkv7TGtCbpqHIgv8DwO0.png" },
  { name: "ASSASSIN'S CREED ORIGINS PS4/PS5", price: 37.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/eMPFvSiX4bsQ0SU4ufwBTkxv.png" },
  { name: "ASSASSIN'S CREED SHADOWS PS5", price: 144.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202310/1321/4d8eb09de80d1cce0b4fcb65540c3f880e9d8edf9143acb.png" },
  { name: "ASSASSIN'S CREED SYNDICATE PS4/PS5", price: 59.99, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/3GNYFXnqhieyNGEfMCnSVMoM.png" },
  { name: "ASSASSIN'S CREED VALHALLA PS4/PS5", price: 50.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0303/jt3X0TKH5d04yV5qjlDiN3Ei.png" },
  { name: "ATOMIC HEART PS4/PS5", price: 69.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202210/2000/nNbQLSrkJYAVVuoJH0bKF8Bn.png" },
  { name: "AVATAR PS4/PS5", price: 74.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202308/2319/7e3e0d0e77f50d0da7ba1ce47a0ed3d5d04e96c18b6e4d91.png" },
  { name: "BATTLEFIELD 1 PS4/PS5", price: 34.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/2bwK9eDr6lEiNmFMcFZVBXuZ.png" },
  { name: "BATTLEFIELD 4 PS4/PS5", price: 29.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/ZicIPnBDrZ8gZRi7Ll8KhKd3.png" },
  { name: "BATTLEFIELD V PS4/PS5", price: 36.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/6vNHU9WZYiHRXUUxk5b3k1y1.png" },
  { name: "BLEACH REBIRTH OF SOULS PS5", price: 100.00, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202309/2217/9ae0ac7e5de69c11a5e34ec9b7e9fec1c1be9f0e4527c62e.png" },
  { name: "CALL OF DUTY GHOSTS PS4/PS5", price: 99.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/cdn/UP0002/CUSA00006_00/ztPoAnxVLFNsG1FkpTsEt5pE2BOqfhvG.png" },
  { name: "CALL OF DUTY VANGUARD PS4/PS5", price: 89.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202109/1323/MFJTOl5M2FHIH0WOIjHYmBLM.png" },
  { name: "CALL OF DUTY WW2 PS4/PS5", price: 100.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/n6e28gU0TGU3XVpSUDWKSRrh.png" },
  { name: "COD BLACK OPS 6 PS4/PS5", price: 80.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202406/1000/df0c7e85d13b12a04bad43bba3148de793a527afe099df2b.png" },
  { name: "COD BLACK OPS 7 PS4/PS5", price: 120.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202406/1000/df0c7e85d13b12a04bad43bba3148de793a527afe099df2b.png" },
  { name: "COD COLD WAR PS4/PS5", price: 80.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202011/2917/cOmJDMWNBOCeZ9Coa3wHOkJp.png" },
  { name: "CRASH BANDICOOT TRILOGY PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/ByXVNqnkDQ0e6d0t3tXPhJXT.png" },
  { name: "CRASH NITRO KART PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/2718/VVjPR1q0B3w2qBBjOAT5ZIrc.png" },
  { name: "DEAD ISLAND 2 PS4/PS5", price: 50.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202212/0821/t7YKXWOXnFH8LlOzCQnnGBxE.png" },
  { name: "DEAD SPACE PS5", price: 69.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202210/2717/k2JicPEHfB2qHONk0EGXBnW4.png" },
  { name: "DEMON SLAYER 2 PS4/PS5", price: 144.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202208/1917/aTLa2FNTqnTHqTxFl6VJV6Dz.png" },
  { name: "DETROIT BECOME HUMAN PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/cXhQ63KtDd7Dyl7p0MHmrIb1.png" },
  { name: "DEVIL MAY CRY 5 PS5", price: 30.00, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202010/2614/AEvvFrHGCv8tVeUFsQO4nCBa.png" },
  { name: "DEVIL MAY CRY 5 + VERGIL PS4/PS5", price: 16.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202010/2614/AEvvFrHGCv8tVeUFsQO4nCBa.png" },
  { name: "DEVIL MAY CRY DEFINITIVE EDITION PS4", price: 36.90, platform: "PS4", imageUrl: "https://image.api.playstation.com/cdn/UP0102/CUSA01013_00/xEdzSHaOsWj9f9aPwVWXMvmUlR5VCQIN.png" },
  { name: "DIABLO 4 PS4/PS5", price: 100.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202208/2321/UMxITxYiMY27p9HxfH3XGWVx.png" },
  { name: "DIABLO ETERNAL COLLECTION PS4/PS5", price: 64.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/LxCUBfJxoZNJH7Qu0aECzTMB.png" },
  { name: "DOOM ETERNAL PS4/PS5", price: 64.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/xEkMtqvPhYxYL4bFi3WsUWm0.png" },
  { name: "DRAGON BALL KAKAROT PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/Fp1mFEKOvuMZ9XKhpnJVjJVW.png" },
  { name: "DRAGON BALL SPARKING ZERO PS5", price: 174.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202312/0611/5e3c1e04e5a5d1f123e30aab3a5d5cc0b35f4d5a.png" },
  { name: "DYING LIGHT PS4/PS5", price: 20.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/EGNJuylmGcMJmJjQfuFhd7Rx.png" },
  { name: "DYING LIGHT 2 PS4/PS5", price: 54.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202111/2917/LXXQjFfTjW2GmGHtLf4P5cXG.png" },
  { name: "FAR CRY 5 PS4/PS5", price: 30.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/7FMuzrNBl4TQYNWsHbwzAKVW.png" },
  { name: "FAR CRY 6 PS4/PS5", price: 54.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202108/1016/W2rJNLzRj0c6B8i3vj3h82CX.png" },
  { name: "FAR CRY NEW DAWN PS4/PS5", price: 24.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/Qd2xezK0r25iR2L7b5gVvqS0.png" },
  { name: "FINAL FANTASY XVI PS5", price: 119.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202212/1319/3FMiHKAXj0Mx6gjEY16a0X6E.png" },
  { name: "GHOST RECON WILDLANDS PS4/PS5", price: 34.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/5cPbSFBVjS3R8N7RL4v9bCvP.png" },
  { name: "GOD OF WAR 2018 PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0224/CEJPGKFrHQS2bWM73GBTFoB7.png" },
  { name: "GOD OF WAR 3 REMASTER PS4/PS5", price: 36.99, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202010/2218/H5R6S6K6W7uUeL172zR2w6jJ.png" },
  { name: "GTA V PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/VVzwK1oEzd5wZJxjsGQrFhMC.png" },
  { name: "HI-FI RUSH PS5", price: 59.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202303/1521/dGjkNy1lBz0DLHD63mPR2fRy.png" },
  { name: "HOGWARTS LEGACY PS4/PS5", price: 39.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202301/1609/jtkIOrGEv3EXmWYRJJWBRQaQ.png" },
  { name: "HORIZON FORBIDDEN WEST PS4/PS5", price: 100.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202107/2321/LNEKHhKrxFzHiFXwU6pLGPE2.png" },
  { name: "JEDI FALLEN ORDER PS4/PS5", price: 44.99, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/Qv9UfHBHV5gJTkzHaMhJjkdU.png" },
  { name: "JUST CAUSE 4 PS4/PS5", price: 19.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/KS5UJSiJMJaUmBwZDCq2TH5X.png" },
  { name: "MAFIA 3 PS4/PS5", price: 24.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/sHoX0s2gkMJlpFH5PUr8JWDY.png" },
  { name: "MARTHA IS DEAD PS4/PS5", price: 40.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202110/2920/YBRYFmq5UxkEqrz0nJPEJOTn.png" },
  { name: "MORTAL KOMBAT 1 PS5", price: 69.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202306/0812/9d0f3e4b2a1c5e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3.png" },
  { name: "MORTAL KOMBAT 11 PS4/PS5", price: 20.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/fMHYU1XYCZ3UXkpgBRuLmNPp.png" },
  { name: "NARUTO STORM 4 PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/z65dEO1vCfX4DynMNOsXGQrD.png" },
  { name: "NBA 2K26 PS4/PS5", price: 65.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202506/1011/placeholder_nba2k26.png" },
  { name: "PREY PS4/PS5", price: 27.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/Gzw7Rm2fREPJ4P4hqTd9oHkl.png" },
  { name: "PRINCE OF PERSIA LOST CROWN PS4/PS5", price: 44.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202309/0611/e2d4f3c5a7b8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.png" },
  { name: "RED DEAD REDEMPTION 2 PS4/PS5", price: 64.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/WSBm2mWYOA4r4bJwKPKqbFjR.png" },
  { name: "SHADOW OF THE COLOSSUS PS4/PS5", price: 44.99, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0302/N8f4iL5kQkH5cO64m0QxR8uL.png" },
  { name: "SHADOW OF MORDOR PS4/PS5", price: 17.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/cdn/UP1004/CUSA00207_00/aKLbcMJmHI7JC2IHxTqSV9dlzVJQVhKf.png" },
  { name: "SNIPER ELITE 4 PS4/PS5", price: 27.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/sZ6VmSpqNL7bIaAT3E17K7A3.png" },
  { name: "STAR WARS OUTLAWS PS5", price: 69.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4.png" },
  { name: "THE CREW MOTORFEST PS4/PS5", price: 55.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202307/1921/f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2.png" },
  { name: "THE ELDER SCROLLS V SKYRIM PS4/PS5", price: 36.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202111/1719/TYKPMn7ISGalqMqv6Y3RNGpz.png" },
  { name: "THE LAST OF US PART I PS5", price: 120.00, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202206/0321/NVU5FJ7GJvTBELPMeagHEZUt.png" },
  { name: "THE LAST OF US PART II PS4", price: 100.00, platform: "PS4", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/iyXT9t0uyxgLjmEqMZFq1TI9.png" },
  { name: "THE LAST OF US REMASTERED PS4/PS5", price: 35.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/cdn/UP9000/CUSA00552_00/pHepWgBDXBGLjIhYQHr6KMOM6cqHRXQd.png" },
  { name: "THE ORDER 1886 PS4/PS5", price: 36.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/cdn/UP9000/CUSA00422_00/V7tVhHY5zIz5pQdtNBNTdYbGkv5XWPAN.png" },
  { name: "TOM CLANCY GHOST RECON BREAKPOINT PS4/PS5", price: 39.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/QolEBjHaxZ3sPQxcvnHJIVFM.png" },
  { name: "TONY HAWK'S PRO SKATER 1+2 PS4/PS5", price: 64.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/dImGXjmTHSNImPMvOT2xVGFl.png" },
  { name: "UNCHARTED 4 + LOST LEGACY PS4", price: 69.90, platform: "PS4", imageUrl: "https://image.api.playstation.com/cdn/UP9000/CUSA04530_00/hqPoEq7PBmKfz99fKbkiGP5YPYIX5X17.png" },
  { name: "UNCHARTED LEGACY OF THIEVES PS5", price: 89.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202111/2917/T2ZXAZFCB6dBOBIEHMbXFhEq.png" },
  { name: "WATCH DOGS LEGION PS4/PS5", price: 29.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/NlV5MVamTuO8VZxBr65smWDy.png" },
  { name: "WOLFENSTEIN THE NEW ORDER PS4/PS5", price: 16.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/cdn/UP1001/CUSA00326_00/lMcIiAnXZT1UGRfI0cJoFDsYDCEoE8Z6.png" },
];

async function seed() {
  initializeApp();
  const firestore = getFirestore();
  const col = firestore.collection("digital_products");

  console.log(`Inserindo ${games.length} jogos no Firestore...`);
  let count = 0;

  for (const game of games) {
    const snapshot = await col.where("name", "==", game.name).limit(1).get();
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({ price: game.price, imageUrl: game.imageUrl, platform: game.platform });
      console.log(`[~] Atualizado: ${game.name}`);
    } else {
      await col.add({
        name: game.name,
        description: "Jogo PS4/PS5 - Mídia Digital. Entre em contato via WhatsApp para finalizar a compra.",
        price: game.price,
        type: "jogo",
        platform: game.platform,
        imageUrl: game.imageUrl,
        isActive: true,
        stock: 999,
        createdAt: new Date(),
      });
      console.log(`[+] Inserido: ${game.name}`);
    }
    count++;
  }

  console.log(`\nConcluído! ${count} jogos processados.`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
