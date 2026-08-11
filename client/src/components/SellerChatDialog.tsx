import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import {
  SELLER_CHATS,
  STORE_SELLER_ID,
  STORE_SELLER_NAME,
  markSellerChatRead,
  sellerChatTimeLabel,
  sellerThreadId,
  sendSellerChatMessage,
  type SellerChatMessage,
} from "@/lib/sellerChat";
import { MessageCircle, Send, User as UserIcon, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface SellerChatDialogProps {
  /** Id do anúncio/produto. Se omitido, usamos o nome como chave da conversa. */
  productId?: string;
  productName: string;
  /** Id do vendedor dono do anúncio. Sem ele, a conversa vai para a Loja Eforte. */
  sellerId?: string;
  sellerName?: string;
  buttonLabel?: string;
  buttonClassName?: string;
}

export default function SellerChatDialog({
  productId,
  productName,
  sellerId,
  sellerName,
  buttonLabel = "Falar com Vendedor",
  buttonClassName = "",
}: SellerChatDialogProps) {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<SellerChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const resolvedSellerId = sellerId || STORE_SELLER_ID;
  const resolvedSellerName =
    sellerName || (resolvedSellerId === STORE_SELLER_ID ? STORE_SELLER_NAME : "Vendedor");
  const isStoreThread = resolvedSellerId === STORE_SELLER_ID;
  const isOwnListing = Boolean(user?.id && sellerId && user.id === sellerId);

  const threadId = useMemo(() => {
    if (!user?.id) return null;
    return sellerThreadId(resolvedSellerId, productId || productName, user.id);
  }, [user?.id, resolvedSellerId, productId, productName]);

  useEffect(() => {
    if (!isOpen || !threadId) return;
    const q = query(
      collection(db, SELLER_CHATS, threadId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SellerChatMessage)));
    });
    return () => unsub();
  }, [isOpen, threadId]);

  useEffect(() => {
    if (isOpen && threadId && messages.length > 0) {
      markSellerChatRead(threadId, "buyer");
    }
  }, [isOpen, threadId, messages.length]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const openChat = () => {
    if (!isAuthenticated || !user?.id) {
      toast.error("Faça login para falar com o vendedor.");
      navigate("/login");
      return;
    }
    if (isOwnListing) {
      toast.info("Este anúncio é seu. As mensagens dos compradores ficam no Painel do Vendedor.");
      navigate("/vendedor");
      return;
    }
    setIsOpen(true);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = message.trim();
    if (!msg || !user?.id || !threadId || sending) return;
    setSending(true);
    setMessage("");
    try {
      await sendSellerChatMessage({
        threadId,
        text: msg,
        senderId: user.id,
        senderName: user.name || "Cliente",
        senderRole: "buyer",
        thread: {
          productId: productId || productName,
          productName,
          sellerId: resolvedSellerId,
          sellerName: resolvedSellerName,
          buyerId: user.id,
          buyerName: user.name || "Cliente",
          buyerEmail: user.email || "",
          participants: [user.id, resolvedSellerId],
        },
      });
    } catch (err) {
      console.error("[SellerChat] Erro ao enviar mensagem:", err);
      setMessage(msg);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={openChat}
        className={
          buttonClassName ||
          "w-full bg-slate-900 border border-green-600/40 hover:border-green-500 text-green-400 font-bold text-[10px] sm:text-xs h-10 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1"
        }
      >
        <MessageCircle className="w-3.5 h-3.5 text-green-500" /> {buttonLabel}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-900 border-green-600/30 text-white w-[94vw] sm:max-w-md card-neon p-0 gap-0 overflow-hidden rounded-2xl z-[90]">
          <DialogHeader className="p-4 bg-gradient-to-r from-green-800 via-emerald-700 to-green-800 border-b border-green-500/30">
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-300" />
              {isStoreThread ? "Falar com a Loja" : "Falar com Vendedor"}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-green-100/80 flex items-center gap-1.5">
              <UserIcon className="w-3 h-3" />
              {productName} • {resolvedSellerName}
            </DialogDescription>
          </DialogHeader>

          <div className="px-3.5 py-2 bg-slate-950 border-b border-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <p className="text-[10px] text-slate-400 leading-tight">
              Conversa direta e privada com {isStoreThread ? "a loja" : "o vendedor"}. Combine tudo por
              aqui e finalize a compra pela plataforma para manter a garantia Eforte.
            </p>
          </div>

          <div ref={scrollRef} className="h-72 sm:h-80 overflow-y-auto p-3.5 space-y-3 bg-slate-950/60 flex-1">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-2">
                <MessageCircle className="w-10 h-10 text-slate-700" />
                <p className="text-xs text-slate-500">
                  Envie sua dúvida sobre <strong className="text-slate-300">{productName}</strong>.
                  {isStoreThread
                    ? " A equipe Eforte Games responde rapidinho! 🚀"
                    : ` ${resolvedSellerName} recebe sua mensagem no painel de vendedor.`}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === user?.id;
                const isFromSupport = msg.senderRole === "admin";
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[88%] p-3 rounded-2xl text-xs font-medium whitespace-pre-wrap leading-relaxed ${
                        isMine
                          ? "bg-green-700 text-white rounded-br-none shadow-md"
                          : isFromSupport
                          ? "bg-red-600 text-white rounded-bl-none shadow-md"
                          : "bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-0.5 px-1 font-mono">
                      {isMine ? "Você" : msg.senderName || resolvedSellerName}
                      {msg.timestamp ? ` • ${sellerChatTimeLabel(msg.timestamp)}` : ""}
                    </span>
                  </div>
                );
              })
            )}
            {sending && (
              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce" />
                Enviando...
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2 shrink-0 pb-4 sm:pb-3">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Pergunte sobre ${productName}...`}
              className="bg-slate-900 border-slate-800 text-white text-sm focus-visible:ring-green-600 h-11 rounded-xl px-3.5 flex-1"
              disabled={sending}
            />
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 h-11 px-4 text-xs font-black shrink-0 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
              disabled={sending || !message.trim()}
            >
              <span>Enviar</span>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
