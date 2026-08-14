import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Avisa qualquer gestor/colaborador logado, em qualquer página do site (não só
 * dentro do painel /admin), quando um cliente inicia ou continua uma conversa
 * no chat de atendimento. Compartilhado entre todos os admins, já que hoje o
 * atendimento cai numa caixa única (sem roteamento por pessoa específica).
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
        toast(`💬 ${c.userName || "Um cliente"} quer falar com você`, {
          description: c.lastMessage || "Nova mensagem no chat de atendimento.",
          duration: 12000,
          action: {
            label: "Responder",
            onClick: () => navigate("/admin?tab=negociacoes"),
          },
        });
      });

      seenPendingIdsRef.current = new Set(pendingIds);
    });

    return () => unsub();
  }, [isAuthenticated, isAdmin, isCollaborator, loading, navigate]);

  return null;
}
