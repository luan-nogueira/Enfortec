import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { createRemoteJWKSet, jwtVerify } from "jose";
import * as db from "../db";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

const FIREBASE_PROJECT_ID = "enfortec-c9b78";

export async function verifyFirebaseToken(token: string) {
  console.log("[FirebaseAuth] Attempting to verify token...");
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    console.log("[FirebaseAuth] Token verified successfully, sub:", payload.sub);
    return payload;
  } catch (error) {
    console.error("[FirebaseAuth] Token verification failed:", error);
    return null;
  }
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // 1. Try traditional OAuth session cookie
    user = await sdk.authenticateRequest(opts.req);
    console.log("[TRPC Server] OAuth cookie auth succeeded for user:", user?.id);
  } catch (error) {
    // 2. Fallback to Firebase ID Token in Authorization header
    const authHeader = opts.req.headers.authorization;
    console.log("[TRPC Server] OAuth auth failed. Authorization Header:", authHeader ? `${authHeader.substring(0, 25)}...` : "none");
    
    console.log("[TRPC Server] Checking authHeader:", authHeader ? "present" : "missing");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      console.log("[TRPC Server] Firebase token received, length:", token.length);
      const decoded = await verifyFirebaseToken(token);
      console.log("[TRPC Server] Firebase Token decoded payload sub:", decoded?.sub || "none");
      
      if (decoded && decoded.sub) {
        const uid = decoded.sub;
        const email = (decoded.email as string | undefined)?.toLowerCase().trim();
        const name = (decoded.name as string | undefined) || email?.split("@")[0] || "User";
        
        try {
          user = (await db.getUserByOpenId(uid)) || (email ? await db.getUserByEmail(email) : undefined) || null;
          
          if (!user) {
            // Usuário novo: insere no Postgres uma única vez
            await db.upsertUser({
              openId: uid,
              name: name,
              email: email,
              loginMethod: "firebase",
              lastSignedIn: new Date(),
            });
            user = (await db.getUserByOpenId(uid)) || (email ? await db.getUserByEmail(email) : undefined) || null;
          } else {
            // Otimização Neon: Só atualiza lastSignedIn se o último registro tiver mais de 12 horas
            const lastSigned = user.lastSignedIn ? new Date(user.lastSignedIn).getTime() : 0;
            const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
            if (lastSigned < twelveHoursAgo) {
              // Executa em background sem bloquear o request
              db.upsertUser({
                openId: uid,
                name: user.name || name,
                email: user.email || email,
                loginMethod: user.loginMethod || "firebase",
                lastSignedIn: new Date(),
              }).catch(() => {});
            }
          }
        } catch (dbErr) {
          console.error("[TRPC Server] User auth processing error:", dbErr);
        }
        
        if (!user) {
          // Não inventa um usuário fantasma aqui: um objeto fake antigo usava sempre o MESMO
          // id fixo (999999) pra qualquer pessoa que caísse nesse caminho (erro passageiro no
          // Postgres, ou upsert que falhou), o que misturava dados de gente diferente sob o
          // mesmo id E pulava a checagem de "conta banida" (esse objeto fake nunca tinha
          // isBanned=true, então um banido escapava do bloqueio nesse cenário). Deixando
          // `user` null, a requisição autenticada cai como UNAUTHORIZED (ver requireUser em
          // trpc.ts) e a pessoa só tenta de novo — chato, mas seguro.
          console.error(`[TRPC Server] Não foi possível carregar/criar o usuário do Postgres (uid: ${uid}). Tratando esta requisição como não autenticada.`);
        }
      }
    }
  }

  const ADMIN_EMAILS = [
    "luanmnogueira@gmail.com",
    "enfortec@admin.com",
    "luiz220190@hotmail.com",
    "sandrinhooperfectt@gmail.com"
  ];

  if (user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    user.role = "admin";
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
