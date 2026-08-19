import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where, doc, deleteDoc } from "firebase/firestore";
import {
  SELLER_CHATS,
  STORE_SELLER_NAME,
  markSellerChatRead,
  sellerChatTimeLabel,
  sendSellerChatMessage,
  type SellerChatMessage,
  type SellerChatRole,
  type SellerChatThread,
} from "@/lib/sellerChat";
import { MessageCircle, Send, ArrowLeft, User as UserIcon, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface SellerChatsPanelProps {
  /** "seller": conversas dos meus anúncios · "buyer": conversas que iniciei · "admin": conversas da loja */
  role: SellerChatRole;
  emptyMessage?: string;
}

export default function SellerChatsPanel({ role, emptyMessage }: SellerChatsPanelProps) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<SellerChatThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SellerChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDeleteThread = (threadId: string, name: string) => {
    toast(`Excluir permanentemente a conversa com "${name}"? Isso libera espaço no banco de dados.`, {
      action: {
        label: "Excluir",
        onClick: async () => {
          try {
            await deleteDoc(doc(db, SELLER_CHATS, threadId));
            toast.success("Conversa excluída do banco!");
            if (selectedId === threadId) {
              setSelectedId(null);
            }
          } catch (err: any) {
            console.error("[SellerChatsPanel] Erro ao excluir conversa:", err);
            toast.error("Erro ao excluir conversa.");
          }
        },
      },
    });
  };

  useEffect(() => {
    if (role !== "admin" && !user?.id) return;
    const base = collection(db, SELLER_CHATS);
    const q =
      role === "admin"
        ? query(base)
        : role === "seller"
        ? query(base, where("sellerId", "==", user!.id))
        : query(base, where("buyerId", "==", user!.id));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SellerChatThread));
        // Ordena no cliente para não exigir índice composto no Firestore
        data.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
        setThreads(data);
      },
      (err) => console.error("[SellerChatsPanel] Erro ao carregar conversas:", err)
    );
    return () => unsub();
  }, [role, user?.id]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, SELLER_CHATS, selectedId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SellerChatMessage)));
    });
    return () => unsub();
  }, [selectedId]);

  useEffect(() => {
    if (selectedId) markSellerChatRead(selectedId, role);
  }, [selectedId, role, messages.length]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const selected = useMemo(
    () => threads.find((t) => t.id === selectedId) || null,
    [threads, selectedId]
  );

  const unreadKey = role === "buyer" ? "unreadByBuyer" : "unreadBySeller";

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = reply.trim();
    if (!text || !selected || sending) return;
    setSending(true);
    setReply("");
    try {
      await sendSellerChatMessage({
        threadId: selected.id,
        text,
        senderId: role === "admin" ? "admin" : user!.id,
        senderName:
          role === "admin" ? STORE_SELLER_NAME : user?.name || selected.sellerName || "Vendedor",
        senderRole: role,
        thread: {
          productId: selected.productId,
          productName: selected.productName,
          sellerId: selected.sellerId,
          sellerName: selected.sellerName,
          buyerId: selected.buyerId,
          buyerName: selected.buyerName,
          buyerEmail: selected.buyerEmail || "",
          participants: selected.participants || [selected.buyerId, selected.sellerId],
        },
      });
    } catch (err: any) {
      console.error("[SellerChatsPanel] Erro ao responder:", err);
      setReply(text);
      toast.error(err?.message || "Erro ao enviar a resposta. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const counterpartName = (thread: SellerChatThread) =>
    role === "buyer" ? thread.sellerName || "Vendedor" : thread.buyerName || "Comprador";

  if (threads.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-700">
        <MessageCircle className="w-10 h-10 text-slate-700 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">
          {emptyMessage || "Nenhuma conversa por aqui ainda."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,320px)_1fr] gap-4">
      {/* Lista de conversas */}
      <div
        className={`space-y-2 max-h-[28rem] overflow-y-auto pr-1 ${
          selected ? "hidden md:block" : ""
        }`}
      >
  const filteredThreads = useMemo(() => {
    if (!searchTerm.trim()) return threads;
    const term = searchTerm.toLowerCase().trim();
    return threads.filter(
      (t) =>
        (t.buyerName || "").toLowerCase().includes(term) ||
        (t.sellerName || "").toLowerCase().includes(term) ||
        (t.productName || "").toLowerCase().includes(term) ||
        (t.lastMessage || "").toLowerCase().includes(term)
    );
  }, [threads, searchTerm]);

  if (threads.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-700">
        <MessageCircle className="w-10 h-10 text-slate-700 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">
          {emptyMessage || "Nenhuma conversa por aqui ainda."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,320px)_1fr] gap-4">
      {/* Lista de conversas */}
      <div
        className={`space-y-2 max-h-[28rem] overflow-y-auto pr-1 ${
          selected ? "hidden md:block" : ""
        }`}
      >
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar conversas..."
            className="bg-slate-900 border-slate-800 text-white text-xs pl-8 h-8 rounded-lg"
          />
        </div>

        {filteredThreads.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6 italic">Nenhuma conversa encontrada.</p>
        ) : (
          filteredThreads.map((thread) => {
            const unread = Boolean((thread as any)[unreadKey]);
            return (
              <div
                key={thread.id}
                className={`relative group w-full text-left p-3 rounded-xl border transition ${
                  selectedId === thread.id
                    ? "bg-slate-800 border-green-600/50"
                    : "bg-slate-900/60 border-slate-800 hover:border-green-600/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(thread.id)}
                  className="w-full text-left pr-6"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-white truncate">
                      {counterpartName(thread)}
                    </span>
                    {unread && (
                      <span className="shrink-0 text-[8px] font-black uppercase tracking-wider bg-green-600 text-white px-1.5 py-0.5 rounded-full">
                        Nova
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">
                    {thread.productName}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-1">
                    {thread.lastSenderRole === "buyer" ? "" : "Você: "}
                    {thread.lastMessage}
                  </p>
                  <span className="text-[9px] text-slate-600 font-mono">
                    {sellerChatTimeLabel(thread.updatedAt)}
                  </span>
                </button>

                {role === "admin" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteThread(thread.id, counterpartName(thread));
                    }}
                    title="Excluir conversa (libera espaço no banco)"
                    className="absolute top-2 right-2 h-6 w-6 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Conversa */}
      {selected ? (
        <div className="flex flex-col bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setSelectedId(null)}
                className="md:hidden h-7 w-7 text-slate-400"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <UserIcon className="w-4 h-4 text-green-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">{counterpartName(selected)}</p>
                <p className="text-[10px] text-slate-500 truncate">
                  {selected.productName}
                  {role !== "buyer" && selected.buyerEmail ? ` • ${selected.buyerEmail}` : ""}
                </p>
              </div>
            </div>

            {role === "admin" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteThread(selected.id, counterpartName(selected))}
                className="bg-red-950/30 hover:bg-red-900/50 text-red-400 border-red-500/40 font-bold text-xs h-7 px-2.5 flex items-center gap-1.5 shrink-0"
              >
                <Trash2 className="w-3 h-3" /> Excluir Chat
              </Button>
            )}
          </div>

          <div ref={scrollRef} className="h-72 overflow-y-auto p-3.5 space-y-3">
            {messages.map((msg) => {
              const isMine =
                role === "admin" ? msg.senderRole === "admin" : msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[88%] p-2.5 rounded-2xl text-xs font-medium whitespace-pre-wrap leading-relaxed ${
                      isMine
                        ? "bg-green-700 text-white rounded-br-none shadow-md"
                        : "bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-0.5 px-1 font-mono">
                    {isMine ? "Você" : msg.senderName}
                    {msg.timestamp ? ` • ${sellerChatTimeLabel(msg.timestamp)}` : ""}
                  </span>
                </div>
              );
            })}
            {sending && (
              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce" />
                Enviando...
              </div>
            )}
          </div>

          <form onSubmit={handleReply} className="p-2.5 bg-slate-950 border-t border-slate-800 flex gap-2">
            <Input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Escreva sua resposta..."
              className="bg-slate-900 border-slate-800 text-white text-xs focus-visible:ring-green-600 h-9 rounded-xl"
              disabled={sending}
            />
            <Button
              type="submit"
              size="icon"
              className="bg-green-600 hover:bg-green-700 h-9 w-9 shrink-0 rounded-xl"
              disabled={sending || !reply.trim()}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex items-center justify-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-slate-600 text-xs">
          Selecione uma conversa para responder
        </div>
      )}
    </div>
  );
}
