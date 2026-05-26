import { useCallback, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { useLocation } from "wouter";

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
                  forteCoins: 0,
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
              let needsUpdate = false;
              const updateFields: any = {};
              
              if (userData?.forteCoins === undefined) {
                updateFields.forteCoins = 0;
                needsUpdate = true;
              }

              // Inserir 10.000 moedas para teste do admin apenas uma vez
              if ((user.email === "luanmnogueira@gmail.com" || user.email === "temp_admin@enfortec.com") && !userData?.hasSeededTestingCoins) {
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

              const role = userData?.role || (user.email === "luanmnogueira@gmail.com" ? "admin" : "user");
              const finalForteCoins = userData?.forteCoins ?? 0;
              const finalLoginMethod = userData?.loginMethod ?? (isGoogleUser ? "google.com" : "email/password");

              setState({
                user: { 
                  id: user.uid, 
                  name: userData?.name || user.email, 
                  email: user.email,
                  forteCoins: finalForteCoins,
                  referredBy: userData?.referredBy || null,
                  loginMethod: finalLoginMethod
                },
                role: role,
                loading: false,
                error: null,
                isAuthenticated: true,
                isAdmin: role === "admin" || user.email === "luanmnogueira@gmail.com",
                isCollaborator: role === "collaborator" || role === "admin" || user.email === "luanmnogueira@gmail.com",
              });
            });
          } catch (err: any) {
            console.error("Erro ao buscar dados do usuário:", err);
            setState({
              user: { id: user.uid, name: user.displayName || user.email, email: user.email, forteCoins: 0, referredBy: null, loginMethod: "email/password" },
              role: "user",
              loading: false,
              error: err,
              isAuthenticated: true,
              isAdmin: false,
              isCollaborator: false,
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
