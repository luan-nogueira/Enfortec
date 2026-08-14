import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { auth } from "@/lib/firebase";
import "./index.css";

// Depois de um novo deploy, uma aba que já estava aberta ainda referencia os nomes de
// arquivo (hash) da versão antiga. Ao navegar pra uma rota que carrega sob demanda (lazy)
// um chunk que não existe mais, o Vite dispara esse evento em vez de travar silenciosamente
// — recarrega a página uma vez para pegar a versão atual. Guarda em sessionStorage pra não
// entrar em loop caso o recarregamento não resolva (problema de rede, por exemplo).
window.addEventListener("vite:preloadError", () => {
  const key = "forte_reloaded_after_preload_error";
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  window.location.reload();
});

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      async headers() {
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            const token = await currentUser.getIdToken();
            console.log("[TRPC Client] Firebase user found, sending token.");
            return {
              Authorization: `Bearer ${token}`,
            };
          } catch (e) {
            console.error("[TRPC Client] Failed to get Firebase ID token:", e);
          }
        } else {
          console.warn("[TRPC Client] auth.currentUser is null.");
        }
        return {};
      },
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
