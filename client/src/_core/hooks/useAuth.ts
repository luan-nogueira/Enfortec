import { useCallback, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          try {
            // Buscar ou Criar documento do usuário no Firestore
            const userRef = doc(db, "users", user.uid);
            let userDoc = await getDoc(userRef);
            
            const isGoogleUser = user.providerData.some(p => p.providerId === "google.com");
            
            if (!userDoc.exists()) {
              const referredBy = localStorage.getItem("forte_referred_by");
              const validReferrer = (referredBy && referredBy !== user.uid) ? referredBy : null;
              
              // Se não existe, cria com role padrão
              const initialData = {
                uid: user.uid,
                email: user.email,
                name: user.displayName || user.email?.split('@')[0],
                role: "user", // Default role
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
              userDoc = await getDoc(userRef);
            }

            const userData = userDoc.data();
            let needsUpdate = false;
            const updateFields: any = {};
            
            if (userData?.forteCoins === undefined) {
              updateFields.forteCoins = 0;
              needsUpdate = true;
            }
            if (userData?.loginMethod === undefined) {
              updateFields.loginMethod = isGoogleUser ? "google.com" : "email/password";
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              await setDoc(userRef, updateFields, { merge: true });
            }

            const role = userData?.role || (user.email === "luanmnogueira@gmail.com" ? "admin" : "user");
            const finalForteCoins = userData?.forteCoins ?? (updateFields.forteCoins ?? 0);
            const finalLoginMethod = userData?.loginMethod ?? (updateFields.loginMethod ?? (isGoogleUser ? "google.com" : "email/password"));

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
          } catch (err) {
            console.error("Erro ao buscar dados do usuário:", err);
            setState({
              user: { id: user.uid, name: user.displayName || user.email, email: user.email, forteCoins: 0, referredBy: null, loginMethod: "email/password" },
              role: "user",
              loading: false,
              error: null,
              isAuthenticated: true,
              isAdmin: false,
              isCollaborator: false,
            });
          }
        } else {
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

    return () => unsubscribe();
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
