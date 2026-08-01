import { useState, useEffect, useRef } from "react";
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
import {
  collection,
  addDoc,
  doc,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { MessageCircle, Send, User as UserIcon } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type ChatMsg = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  sender?: string;
  timestamp: any;
};

interface SellerChatDialogProps {
  productName: string;
  sellerName?: string;
  buttonLabel?: string;
  buttonClassName?: string;
}

export default function SellerChatDialog({
  productName,
  sellerName,
  buttonLabel = "Falar com Vendedor",
  buttonClassName = "",
}: SellerChatDialogProps) {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    const q = query(collection(db, "chats", user.id, "messages"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMsg)));
    });
    return () => unsub();
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const openChat = () => {
    if (!isAuthenticated || !user?.id) {
      toast.error("Faça login para falar com o vendedor.");
      navigate("/login");
      return;
    }
    setIsOpen(true);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = message.trim();
    if (!msg || !user?.id || sending) return;
    setSending(true);
    setMessage("");
    try {
      const isFirst = messages.length === 0;
      const chatRef = doc(db, "chats", user.id);
      await setDoc(
        chatRef,
        {
          userId: user.id,
          userName: user.name || "Cliente",
          userEmail: user.email || "",
          topic: `Falar com Vendedor: ${productName}${sellerName ? ` (${sellerName})` : ""}`,
          lastMessage: msg,
          updatedAt: serverTimestamp(),
          unreadByAdmin: true,
          ...(sellerName ? { sellerName } : {}),
        },
        { merge: true }
      );
      await addDoc(collection(db, "chats", user.id, "messages"), {
        text: msg,
        senderId: user.id,
        senderName: user.name || "Cliente",
        timestamp: serverTimestamp(),
      });
      if (isFirst) {
        await addDoc(collection(db, "chats", user.id, "messages"), {
          text: `👋 Sua conversa sobre **${productName}** foi iniciada! A equipe Eforte Games vai te atender em instantes.`,
          senderId: "ai-support",
          senderName: "Assistente Eforte",
          timestamp: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("[SellerChat] Erro ao enviar mensagem:", err);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const currentUserId = user?.id || "guest";

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
        <DialogContent className="bg-slate-900 border-green-600/30 text-white sm:max-w-md card-neon p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 bg-gradient-to-r from-green-800 via-emerald-700 to-green-800 border-b border-green-500/30">
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-300" />
              Falar com Vendedor
            </DialogTitle>
            <DialogDescription className="text-[11px] text-green-100/80 flex items-center gap-1.5">
              <UserIcon className="w-3 h-3" />
              {productName}
              {sellerName ? ` • ${sellerName}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div ref={scrollRef} className="h-80 overflow-y-auto p-3.5 space-y-3 bg-slate-950/60 flex-1">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-2">
                <MessageCircle className="w-10 h-10 text-slate-700" />
                <p className="text-xs text-slate-500">
                  Envie sua dúvida sobre <strong className="text-slate-300">{productName}</strong>.
                  A equipe Eforte Games responde rapidinho! 🚀
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === currentUserId;
                const isAdmin = msg.senderId === "admin" || msg.sender === "admin";
                const isBot = msg.senderId === "ai-support";
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[88%] p-2.5 rounded-2xl text-xs font-medium whitespace-pre-wrap leading-relaxed ${
                        isMine
                          ? "bg-green-700 text-white rounded-br-none shadow-md"
                          : isAdmin
                          ? "bg-red-600 text-white rounded-bl-none shadow-md"
                          : "bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700"
                      }`}
                    >
                      {isBot && (
                        <span className="block text-[8px] text-green-400 font-black uppercase tracking-wider mb-1">
                          Eforte Bot 🤖
                        </span>
                      )}
                      {isAdmin && (
                        <span className="block text-[8px] text-red-200 font-black uppercase tracking-wider mb-1">
                          Gestor Eforte
                        </span>
                      )}
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-0.5 px-1 font-mono">
                      {isMine ? "Você" : isAdmin ? "Gestor" : isBot ? "Assistente" : msg.senderName || "Vendedor"}
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

          <form onSubmit={handleSend} className="p-2.5 bg-slate-950 border-t border-slate-800 flex gap-2 shrink-0">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Pergunte sobre ${productName}...`}
              className="bg-slate-900 border-slate-800 text-white text-xs focus-visible:ring-green-600 h-9 rounded-xl"
              disabled={sending}
            />
            <Button type="submit" size="icon" className="bg-green-600 hover:bg-green-700 h-9 w-9 shrink-0 rounded-xl" disabled={sending || !message.trim()}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
