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
          console.log("[TRPC Server] Database user lookup result:", user ? `found (id: ${user.id}, openId: ${user.openId})` : "not found");
          
          await db.upsertUser({
            openId: uid,
            name: name,
            email: email,
            loginMethod: "firebase",
            lastSignedIn: new Date(),
          });
          
          user = (await db.getUserByOpenId(uid)) || (email ? await db.getUserByEmail(email) : undefined) || null;
        } catch (dbErr) {
          console.error("[TRPC Server] User auth processing error:", dbErr);
        }
        
        if (!user) {
          user = {
            id: 999999,
            openId: uid,
            name: name,
            email: email || null,
            loginMethod: "firebase_fallback",
            cpf: null,
            psnId: null,
            forteCoins: 0,
            role: "user",
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
            balance: "0.00",
          };
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
