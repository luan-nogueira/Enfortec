import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getDb } from "./server/db";
import { digitalProducts } from "./drizzle/schema";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Configuração do Firebase extraída do projeto
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "enfortec-c9b78",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const dbFirestore = getFirestore(app);

async function migrate() {
  console.log("Iniciando migração dos jogos REAIS do Firebase para o PostgreSQL...");

  const dbPostgres = getDb();
  if (!dbPostgres) {
    console.error("Banco de dados PostgreSQL não conectado.");
    process.exit(1);
  }

  // 1. Apagar os dados de teste/dummy que foram inseridos incorretamente
  console.log("Limpando a tabela digitalProducts...");
  await dbPostgres.delete(digitalProducts);
  console.log("Tabela limpa!");

  // 2. Buscar dados reais do Firestore
  console.log("Buscando dados do Firebase...");
  const snapshot = await getDocs(collection(dbFirestore, "digital_products"));
  const firebaseGames = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log(`Encontrados ${firebaseGames.length} jogos no Firebase. Inserindo no PostgreSQL...`);

  let inserted = 0;
  for (const game of firebaseGames as any[]) {
    try {
      await dbPostgres.insert(digitalProducts).values({
        name: game.name || "Sem Nome",
        description: game.description || "",
        price: (game.price || 0).toString(),
        pricePrimary: game.pricePrimary ? game.pricePrimary.toString() : null,
        priceSecondary: game.priceSecondary ? game.priceSecondary.toString() : (game.price_secondary ? game.price_secondary.toString() : null),
        type: (game.category === "Assinaturas" || game.type === "assinatura") ? "assinatura" : (game.type || "jogo"),
        keyOrCode: game.keyOrCode || null,
        downloadUrl: game.downloadUrl || null,
        imageUrl: game.imageUrl || null,
        stock: game.stock !== undefined ? Number(game.stock) : 1,
        stockPrimary: game.stockPrimary !== undefined ? Number(game.stockPrimary) : 0,
        stockSecondary: game.stockSecondary !== undefined ? Number(game.stockSecondary) : 0,
        isActive: game.isActive !== undefined ? game.isActive : true,
        platform: game.platform || null,
        category: game.category || null,
        coverFit: game.coverFit || null,
        isPreVenda: game.isPreVenda || false,
        showInEconomia: game.showInEconomia || false,
        economiaLicenseType: game.economiaLicenseType || null,
      });
      inserted++;
      console.log(`[+] Migrado: ${game.name}`);
    } catch (e: any) {
      console.error(`[Erro] Falha ao migrar ${game.name}:`, e.message);
    }
  }

  console.log(`Migração de Mídias Digitais concluída! ${inserted} jogos inseridos com sucesso no PostgreSQL.`);

  // 3. Migrar Mídias Físicas (Usados)
  console.log("\nLimpando a tabela usedProducts...");
  const { usedProducts } = await import("./drizzle/schema");
  await dbPostgres.delete(usedProducts);
  
  console.log("Buscando mídias físicas (usados) do Firebase...");
  const usedSnapshot = await getDocs(collection(dbFirestore, "used_products"));
  const firebaseUsed = usedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  console.log(`Encontrados ${firebaseUsed.length} jogos físicos no Firebase. Inserindo no PostgreSQL...`);
  
  let usedInserted = 0;
  for (const game of firebaseUsed as any[]) {
    try {
      await dbPostgres.insert(usedProducts).values({
        sellerId: game.sellerId || 0, // Fallback se não existir
        name: game.name || "Sem Nome",
        description: game.description || "",
        price: (game.price || 0).toString(),
        condition: game.condition || "novo",
        images: game.images || (game.imageUrl ? [game.imageUrl] : []),
        status: game.status || "pendente",
        estado: game.estado || null,
        cidade: game.cidade || null,
        cep: game.cep || null,
        bairro: game.bairro || null,
      });
      usedInserted++;
      console.log(`[+] Migrado Físico: ${game.name}`);
    } catch (e: any) {
      console.error(`[Erro] Falha ao migrar físico ${game.name}:`, e.message);
    }
  }

  console.log(`Migração total concluída! Digitais: ${inserted} | Físicos: ${usedInserted}`);
  process.exit(0);
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});
