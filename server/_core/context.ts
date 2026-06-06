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
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
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
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = await verifyFirebaseToken(token);
      console.log("[TRPC Server] Firebase Token decoded payload sub:", decoded?.sub || "none");
      
      if (decoded && decoded.sub) {
        const uid = decoded.sub;
        const email = decoded.email as string | undefined;
        const name = (decoded.name as string | undefined) || email?.split("@")[0] || "User";
        
        try {
          user = await db.getUserByOpenId(uid);
          console.log("[TRPC Server] Database user lookup result (by openId):", user ? `found (id: ${user.id})` : "not found");
          
          if (!user) {
            try {
              console.log("[TRPC Server] User not found in database, upserting...");
              await db.upsertUser({
                openId: uid,
                name: name,
                email: email,
                loginMethod: "firebase",
                lastSignedIn: new Date(),
              });
              user = await db.getUserByOpenId(uid);
              console.log("[TRPC Server] User upsert complete, user id:", user?.id);
            } catch (dbError) {
              console.error("[FirebaseAuth] Failed to upsert user in database:", dbError);
            }
          } else {
            try {
              await db.upsertUser({
                openId: uid,
                lastSignedIn: new Date(),
              });
            } catch (e) {
              console.error("[FirebaseAuth] Failed to update user lastSignedIn:", e);
            }
          }
        } catch (dbErr) {
          console.error("[TRPC Server] Database user lookup failed, falling back to local mock user:", dbErr);
          user = {
            id: 999999,
            openId: uid,
            name: name,
            email: email || null,
            loginMethod: "firebase_fallback",
            role: "user",
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
            balance: "0.00",
          };
        }
        
        if (!user) {
          console.log("[TRPC Server] SQL database unreachable or user not found, using Firebase user fallback.");
          user = {
            id: 999999,
            openId: uid,
            name: name,
            email: email || null,
            loginMethod: "firebase_fallback",
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

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
