import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/_core/hooks/useAuth";
import { notifyAdmin } from "@/lib/soundAndNotifications";

/**
 * Avisa qualquer gestor/colaborador logado, em qualquer página do site (não só
 * dentro do painel /admin), quando um cliente inicia ou continua uma conversa
 * no chat de atendimento com Pop-up nativo no Windows, som e toast.
 */
export default function GlobalChatNotifier() {
  const { isAuthenticated, isAdmin, isCollaborator, loading } = useAuth();
  const [, navigate] = useLocation();
  const seenPendingIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (loading || !isAuthenticated || (!isAdmin && !isCollaborator)) {
      seenPendingIdsRef.current = null;
      return;
    }

    const unsub = onSnapshot(collection(db, "chats"), (snapshot) => {
      const chats = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as any));
      const pendingIds = chats.filter((c) => c.unreadByAdmin).map((c) => c.id as string);

      // Na primeira carga só registra o que já existe, sem alertar — senão
      // toda pendência antiga viraria balão assim que o gestor abrisse o site.
      if (seenPendingIdsRef.current === null) {
        seenPendingIdsRef.current = new Set(pendingIds);
        return;
      }

      const newOnes = chats.filter((c) => c.unreadByAdmin && !seenPendingIdsRef.current!.has(c.id));
      newOnes.forEach((c) => {
        const title = `💬 Mensagem de ${c.userName || "Cliente"}`;
        const body = c.lastMessage || "Nova mensagem no chat de atendimento.";
        notifyAdmin({
          title,
          body,
          tag: `chat-${c.id}`,
          onClickUrl: "/admin?tab=negociacoes",
          actionLabel: "Responder",
          onAction: () => navigate("/admin?tab=negociacoes"),
        });
      });

      seenPendingIdsRef.current = new Set(pendingIds);
    });

    return () => unsub();
  }, [isAuthenticated, isAdmin, isCollaborator, loading, navigate]);

  return null;
}
