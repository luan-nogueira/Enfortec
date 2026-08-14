import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { containsLink, LINK_BLOCKED_MESSAGE } from "@/lib/textFilters";

/**
 * Conversas 1:1 entre comprador e vendedor.
 * Coleção separada de "chats" (que é o atendimento/bot da Eforte),
 * para que a conversa com o vendedor nunca se misture com o assistente.
 */
export const SELLER_CHATS = "seller_chats";

/** Produtos da loja/mídia digital não têm vendedor da comunidade: o "vendedor" é a própria loja. */
export const STORE_SELLER_ID = "loja";
export const STORE_SELLER_NAME = "Loja Eforte Games";

export type SellerChatRole = "buyer" | "seller" | "admin";

export type SellerChatMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: SellerChatRole;
  timestamp: any;
};

export type SellerChatThread = {
  id: string;
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  buyerEmail?: string;
  participants: string[];
  lastMessage?: string;
  lastSenderRole?: SellerChatRole;
  updatedAt?: any;
  unreadBySeller?: boolean;
  unreadByBuyer?: boolean;
};

const sanitize = (value: string) =>
  String(value || "sem-id")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 60) || "sem-id";

/** Uma conversa por (vendedor, produto, comprador). */
export function sellerThreadId(sellerId: string, productId: string, buyerId: string) {
  return `${sanitize(sellerId)}__${sanitize(productId)}__${sanitize(buyerId)}`;
}

export async function sendSellerChatMessage(params: {
  threadId: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: SellerChatRole;
  thread: Omit<SellerChatThread, "id">;
}) {
  const { threadId, text, senderId, senderName, senderRole, thread } = params;

  // Admin/suporte pode precisar mandar links (comprovantes, páginas de pagamento);
  // comprador e vendedor não — evita que combinem a venda fora da plataforma.
  if (senderRole !== "admin" && containsLink(text)) {
    throw new Error(LINK_BLOCKED_MESSAGE);
  }

  const threadRef = doc(db, SELLER_CHATS, threadId);

  await setDoc(
    threadRef,
    {
      ...thread,
      lastMessage: text,
      lastSenderRole: senderRole,
      updatedAt: serverTimestamp(),
      unreadBySeller: senderRole === "buyer",
      unreadByBuyer: senderRole !== "buyer",
    },
    { merge: true }
  );

  await addDoc(collection(db, SELLER_CHATS, threadId, "messages"), {
    text,
    senderId,
    senderName,
    senderRole,
    timestamp: serverTimestamp(),
  });
}

export async function markSellerChatRead(threadId: string, role: SellerChatRole) {
  const field = role === "buyer" ? "unreadByBuyer" : "unreadBySeller";
  try {
    await setDoc(doc(db, SELLER_CHATS, threadId), { [field]: false }, { merge: true });
  } catch (err) {
    console.warn("[sellerChat] Não foi possível marcar como lida:", err);
  }
}

export function sellerChatTimeLabel(timestamp: any) {
  const date = timestamp?.toDate?.() ?? (timestamp ? new Date(timestamp) : null);
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
