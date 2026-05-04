import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
    loading: boolean;
    error: Error | null;
    isAuthenticated: boolean;
  }>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setState({
          user: user ? { id: user.uid, name: user.displayName || user.email, email: user.email } : null,
          loading: false,
          error: null,
          isAuthenticated: !!user,
        });
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
