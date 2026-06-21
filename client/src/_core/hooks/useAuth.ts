import { useCallback, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  const [, navigate] = useLocation();

  const [state, setState] = useState<{
    user: any;
    role: string | null;
    loading: boolean;
    error: Error | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isCollaborator: boolean;
  }>({
    user: null,
    role: null,
    loading: true,
    error: null,
    isAuthenticated: false,
    isAdmin: false,
    isCollaborator: false,
  });

  const pgUserQuery = trpc.auth.me.useQuery(undefined, {
    enabled: state.isAuthenticated && !!auth.currentUser,
    refetchInterval: 5000,
  });
  const pgUser = pgUserQuery.data;

  useEffect(() => {
    if (state.isAuthenticated && pgUser && auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      getDoc(userRef).then(async (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const updates: any = {};
          let hasUpdates = false;

          if (pgUser.forteCoins !== undefined && pgUser.forteCoins !== userData.forteCoins) {
            updates.forteCoins = pgUser.forteCoins;
            hasUpdates = true;
          }

          if (pgUser.cpf !== undefined && pgUser.cpf !== userData.cpf) {
            updates.cpf = pgUser.cpf;
            hasUpdates = true;
          }

          if (hasUpdates) {
            console.log("[Sync] Sincronizando dados Postgres -> Firestore:", updates);
            await setDoc(userRef, updates, { merge: true });
          }
        }
      });
    }
  }, [pgUser, state.isAuthenticated]);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          try {
            const userRef = doc(db, "users", user.uid);
            
            // Escutar alterações do documento do usuário em tempo real
            unsubscribeUserDoc = onSnapshot(userRef, async (userDoc) => {
              const isGoogleUser = user.providerData.some(p => p.providerId === "google.com");
              
              if (!userDoc.exists()) {
                const referredBy = localStorage.getItem("forte_referred_by");
                const validReferrer = (referredBy && referredBy !== user.uid) ? referredBy : null;
                
                const initialData = {
                  uid: user.uid,
                  email: user.email,
                  name: user.displayName || user.email?.split('@')[0],
                  role: "user",
                  createdAt: new Date().toISOString(),
                  forteCoins: 10,
                  referredBy: validReferrer,
                  loginMethod: isGoogleUser ? "google.com" : "email/password"
                };
                await setDoc(userRef, initialData);
                
                if (validReferrer) {
                  const referralRef = doc(db, "referrals", user.uid);
                  await setDoc(referralRef, {
                    id: user.uid,
                    referrerId: validReferrer,
                    inviteeName: initialData.name,
                    inviteeEmail: initialData.email,
                    status: "pendente",
                    createdAt: new Date().toISOString()
                  });
                  localStorage.removeItem("forte_referred_by");
                }
                return;
              }

              const userData = userDoc.data();
              
              // Reembolso automático de ForteCoins se o checkout expirou
              if (userData?.pendingRefund && typeof userData.pendingRefund === "object") {
                const { coins, expiresAt } = userData.pendingRefund;
                if (Date.now() > expiresAt) {
                  const currentCoins = userData.forteCoins ?? 0;
                  console.log(`[useAuth] Checkout expirado. Reembolsando ${coins} ForteCoins.`);
                  await setDoc(userRef, {
                    forteCoins: currentCoins + coins,
                    pendingRefund: null
                  }, { merge: true });
                  toast.warning(`Seu tempo de checkout expirou. ${coins} ForteCoins foram devolvidas ao seu saldo.`);
                  return;
                }
              }

              let needsUpdate = false;
              const updateFields: any = {};
              
              if (userData?.forteCoins === undefined) {
                updateFields.forteCoins = 10;
                needsUpdate = true;
              }

              // Inserir 10.000 moedas para teste do admin apenas uma vez
              if ((user.email === "luanmnogueira@gmail.com" || user.email === "enfortec@admin.com" || user.email === "temp_admin@enfortec.com") && !userData?.hasSeededTestingCoins) {
                updateFields.forteCoins = 10000;
                updateFields.hasSeededTestingCoins = true;
                needsUpdate = true;
              }
              
              if (userData?.loginMethod === undefined) {
                updateFields.loginMethod = isGoogleUser ? "google.com" : "email/password";
                needsUpdate = true;
              }
              
              if (needsUpdate) {
                await setDoc(userRef, updateFields, { merge: true });
                return;
              }

              // 1. Inicializar ou carregar histórico de moedas para controle de expiração de 90 dias
              let coinsHistory = userData?.coinsHistory || [];
              let hasCoinsHistoryChanges = false;
              let currentCoinsVal = userData?.forteCoins ?? 0;

              if (!userData?.coinsHistory) {
                coinsHistory = [{
                  id: "initial_balance_" + Date.now(),
                  amount: currentCoinsVal,
                  createdAt: userData?.createdAt || new Date().toISOString(),
                  expired: false
                }];
                hasCoinsHistoryChanges = true;
              }

              // 2. Calcular a soma de moedas ativas no histórico
              let activeCoinsSum = coinsHistory.filter((h: any) => !h.expired).reduce((sum: number, h: any) => sum + h.amount, 0);

              // 3. Sincronizar se moedas foram ganhas ou gastas
              if (currentCoinsVal > activeCoinsSum) {
                const diff = currentCoinsVal - activeCoinsSum;
                coinsHistory = [
                  ...coinsHistory,
                  {
                    id: "earn_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
                    amount: diff,
                    createdAt: new Date().toISOString(),
                    expired: false
                  }
                ];
                hasCoinsHistoryChanges = true;
              } else if (currentCoinsVal < activeCoinsSum) {
                let toConsume = activeCoinsSum - currentCoinsVal;
                coinsHistory = coinsHistory.map((h: any) => {
                  if (h.expired || toConsume <= 0) return h;
                  if (h.amount <= toConsume) {
                    toConsume -= h.amount;
                    return { ...h, amount: 0, expired: true };
                  } else {
                    const remaining = h.amount - toConsume;
                    toConsume = 0;
                    return { ...h, amount: remaining };
                  }
                });
                hasCoinsHistoryChanges = true;
              }

              // 4. Verificar expiração de 90 dias
              const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
              const nowTime = Date.now();
              let expiredCount = 0;
              
              coinsHistory = coinsHistory.map((h: any) => {
                if (!h.expired && h.amount > 0) {
                  const createdTime = new Date(h.createdAt).getTime();
                  if (createdTime + NINETY_DAYS < nowTime) {
                    expiredCount += h.amount;
                    return { ...h, amount: 0, expired: true, expiredAt: new Date().toISOString() };
                  }
                }
                return h;
              });

              if (expiredCount > 0) {
                currentCoinsVal = Math.max(0, currentCoinsVal - expiredCount);
                hasCoinsHistoryChanges = true;
                
                setTimeout(() => {
                  toast.warning(`${expiredCount} ForteCoins expiraram por limite de validade de 90 dias.`);
                }, 1000);
              }

              // 5. Salvar no Firestore se houver mudanças no histórico ou saldo
              if (hasCoinsHistoryChanges) {
                await setDoc(userRef, {
                  forteCoins: currentCoinsVal,
                  coinsHistory
                }, { merge: true });
                return;
              }

              const role = userData?.role || ((user.email === "luanmnogueira@gmail.com" || user.email === "enfortec@admin.com") ? "admin" : "user");
              const finalForteCoins = userData?.forteCoins ?? 0;
              const finalLoginMethod = userData?.loginMethod ?? (isGoogleUser ? "google.com" : "email/password");

              setState({
                user: { 
                  id: user.uid, 
                  name: userData?.name || user.email, 
                  email: user.email,
                  forteCoins: finalForteCoins,
                  cpf: userData?.cpf || null,
                  referredBy: userData?.referredBy || null,
                  loginMethod: finalLoginMethod,
                  acceptedForteCoinsTerms: userData?.acceptedForteCoinsTerms || false,
                  acceptedGamesTerms: userData?.acceptedGamesTerms || false
                },
                role: role,
                loading: false,
                error: null,
                isAuthenticated: true,
                isAdmin: role === "admin" || user.email === "luanmnogueira@gmail.com" || user.email === "enfortec@admin.com",
                isCollaborator: role === "collaborator" || role === "admin" || user.email === "luanmnogueira@gmail.com" || user.email === "enfortec@admin.com",
              });
            });
          } catch (err: any) {
            console.error("Erro ao buscar dados do usuário:", err);
            setState({
              user: { 
                id: user.uid, 
                name: user.displayName || user.email, 
                email: user.email, 
                forteCoins: 10, 
                cpf: null, 
                referredBy: null, 
                loginMethod: "email/password",
                acceptedForteCoinsTerms: false,
                acceptedGamesTerms: false
              },
              role: "user",
              loading: false,
              error: err,
              isAuthenticated: true,
              isAdmin: user.email === "luanmnogueira@gmail.com" || user.email === "enfortec@admin.com",
              isCollaborator: user.email === "luanmnogueira@gmail.com" || user.email === "enfortec@admin.com",
            });
          }
        } else {
          if (unsubscribeUserDoc) {
            unsubscribeUserDoc();
            unsubscribeUserDoc = null;
          }
          setState({
            user: null,
            role: null,
            loading: false,
            error: null,
            isAuthenticated: false,
            isAdmin: false,
            isCollaborator: false,
          });
        }
      },
      (error) => {
        setState((prev) => ({ ...prev, loading: false, error }));
      }
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, []);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (!state.isAuthenticated) {
      navigate(redirectPath);
    }
  }, [redirectOnUnauthenticated, redirectPath, state.loading, state.isAuthenticated, navigate]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      navigate(redirectPath);
    } catch (error) {
      console.error("Logout failed", error);
    }
  }, [navigate, redirectPath]);

  return {
    ...state,
    refresh: () => {}, // Firebase auto-updates
    logout,
  };
}
