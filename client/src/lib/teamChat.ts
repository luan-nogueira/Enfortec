import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { isAdminEmail } from "@/_core/hooks/useAuth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

/**
 * Chat interno entre gestores (admin ↔ admin). Coleção separada de "chats" (atendimento ao
 * cliente) e "seller_chats" (comprador ↔ vendedor): nada daqui aparece para clientes, e as
 * regras do Firestore só liberam a leitura/escrita para gestores.
 *
 * - "geral": sala única com todos os gestores.
 * - conversa direta: id = uids dos dois gestores em ordem alfabética.
 */
export const TEAM_CHATS = "admin_chats";
export const TEAM_GENERAL_ID = "geral";

export type TeamMember = { id: string; name: string; email: string };

export type TeamChatMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: any;
};

export type TeamChatThread = {
  id: string;
  type?: "group" | "direct";
  participants?: string[];
  lastMessage?: string;
  lastSenderId?: string;
  lastSenderName?: string;
  updatedAt?: any;
  /** uid → quando aquele gestor leu a conversa pela última vez */
  readAt?: Record<string, any>;
};

/**
 * Mesmo critério de "gestor" usado no resto do sistema: role "admin" gravado no usuário
 * OU e-mail na lista fixa do código. Checar só o role deixa de fora quem é gestor por e-mail.
 */
export function isTeamAdmin(user: { role?: string | null; email?: string | null }) {
  return user.role === "admin" || isAdminEmail(user.email);
}

export function directChatId(uidA: string, uidB: string) {
  return [uidA, uidB].sort().join("__");
}

const toMillis = (value: any): number => value?.toMillis?.() ?? 0;

/** Tem mensagem de outro gestor que eu ainda não li? */
export function isThreadUnread(thread: TeamChatThread | undefined, myId: string) {
  if (!thread || !myId || !thread.lastSenderId || thread.lastSenderId === myId) return false;
  if (thread.type === "direct" && !thread.participants?.includes(myId)) return false;
  const lastMessageAt = toMillis(thread.updatedAt);
  if (!lastMessageAt) return false;
  return lastMessageAt > toMillis(thread.readAt?.[myId]);
}

export async function sendTeamMessage(params: {
  chatId: string;
  text: string;
  sender: { id: string; name: string };
  /** Só nas conversas diretas: os dois uids. */
  participants?: string[];
}) {
  const { chatId, text, sender, participants } = params;

  await setDoc(
    doc(db, TEAM_CHATS, chatId),
    {
      type: chatId === TEAM_GENERAL_ID ? "group" : "direct",
      ...(participants ? { participants } : {}),
      lastMessage: text.slice(0, 200),
      lastSenderId: sender.id,
      lastSenderName: sender.name,
      updatedAt: serverTimestamp(),
      readAt: { [sender.id]: serverTimestamp() },
    },
    { merge: true }
  );

  await addDoc(collection(db, TEAM_CHATS, chatId, "messages"), {
    text,
    senderId: sender.id,
    senderName: sender.name,
    timestamp: serverTimestamp(),
  });
}

export async function markTeamChatRead(chatId: string, myId: string) {
  try {
    await setDoc(
      doc(db, TEAM_CHATS, chatId),
      { readAt: { [myId]: serverTimestamp() } },
      { merge: true }
    );
  } catch (err) {
    console.warn("[teamChat] Não foi possível marcar como lida:", err);
  }
}

export function teamChatTimeLabel(timestamp: any) {
  const date = timestamp?.toDate?.() ?? (timestamp ? new Date(timestamp) : null);
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Assina todas as conversas da equipe (poucas: a sala geral + uma por dupla de gestores).
 * Só liga para gestores — para qualquer outro usuário as regras negariam a leitura.
 */
export function useTeamChatThreads(enabled: boolean) {
  const [threads, setThreads] = useState<Record<string, TeamChatThread>>({});

  useEffect(() => {
    if (!enabled) {
      setThreads({});
      return;
    }
    const unsub = onSnapshot(
      collection(db, TEAM_CHATS),
      (snap) => {
        const next: Record<string, TeamChatThread> = {};
        snap.docs.forEach((d) => {
          // "estimate": enquanto o servidor não confirma, o timestamp vem estimado em vez de
          // null — sem isso a conversa recém-lida continuaria "não lida" até a confirmação.
          next[d.id] = { id: d.id, ...d.data({ serverTimestamps: "estimate" }) } as TeamChatThread;
        });
        setThreads(next);
      },
      (err) => console.error("[teamChat] Erro ao carregar conversas da equipe:", err)
    );
    return () => unsub();
  }, [enabled]);

  return threads;
}
