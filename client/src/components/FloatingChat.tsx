import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  where,
  serverTimestamp,
  setDoc,
  doc
} from "firebase/firestore";
import { MessageCircle, X, Send, User } from "lucide-react";

function parseBold(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return <strong key={idx} className="font-extrabold text-white">{part}</strong>;
    }
    return part;
  });
}

function renderMessageText(text: string) {
  if (!text) return null;

  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const matches: { index: number; length: number; element: any }[] = [];
    let match;
    
    while ((match = linkRegex.exec(line)) !== null) {
      const [full, linkText, url] = match;
      matches.push({
        index: match.index,
        length: full.length,
        element: (
          <a
            key={`link-${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 hover:text-red-300 underline font-bold"
          >
            {linkText}
          </a>
        )
      });
    }

    let currentPos = 0;
    const lineParts: any[] = [];
    
    for (const m of matches) {
      if (m.index > currentPos) {
        const segment = line.substring(currentPos, m.index);
        lineParts.push(...parseBold(segment));
      }
      lineParts.push(m.element);
      currentPos = m.index + m.length;
    }
    
    if (currentPos < line.length) {
      const segment = line.substring(currentPos);
      lineParts.push(...parseBold(segment));
    }

    return (
      <div key={lineIdx} className={lineIdx > 0 ? "mt-1.5" : ""}>
        {lineParts.length > 0 ? lineParts : line}
      </div>
    );
  });
}

export default function FloatingChat() {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Escutar mensagens em tempo real
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    const q = query(
      collection(db, "chats", user.id, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(data);
    });

    return () => unsubscribe();
  }, [isOpen, user?.id]);

  // Scroll para o fim ao receber nova mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user?.id) return;

    const chatRef = doc(db, "chats", user.id);
    const msg = message;
    setMessage("");

    try {
      // 1. Atualiza/Cria o documento principal do chat para o Gestor ver
      await setDoc(chatRef, {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        lastMessage: msg,
        updatedAt: serverTimestamp(),
        unreadByAdmin: true
      }, { merge: true });

      // 2. Adiciona a mensagem do usuário na subcoleção
      await addDoc(collection(db, "chats", user.id, "messages"), {
        text: msg,
        senderId: user.id,
        senderName: user.name,
        timestamp: serverTimestamp()
      });

      // 3. Consulta a nossa rota de IA com a mensagem do usuário
      const response = await fetch(`/api/ai?q=${encodeURIComponent(msg)}`);
      if (response.ok) {
        const data = await response.json();
        const aiAnswer = data.answer;

        // 4. Adiciona a resposta da IA na subcoleção do Firestore
        await addDoc(collection(db, "chats", user.id, "messages"), {
          text: aiAnswer,
          senderId: "ai-support",
          senderName: "Suporte Eforte (IA)",
          timestamp: serverTimestamp()
        });

        // 5. Atualiza o documento principal do chat com a última resposta da IA
        await setDoc(chatRef, {
          lastMessage: aiAnswer,
          updatedAt: serverTimestamp(),
          unreadByAdmin: false // Respondido pela IA!
        }, { merge: true });
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  if (!isAuthenticated) return null; // Só mostra chat para logados

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {/* Botão Flutuante */}
      {!isOpen && (
        <Button 
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-[0_8px_30px_rgba(220,38,38,0.4)] flex items-center justify-center p-0 transition-all hover:scale-110 active:scale-95 group"
        >
          <MessageCircle className="w-8 h-8 text-white group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-slate-950 rounded-full animate-pulse" />
        </Button>
      )}

      {/* Janela de Chat */}
      {isOpen && (
        <Card className="w-[350px] h-[500px] flex flex-col bg-slate-900 border-red-600/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] card-neon overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-red-600/20 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center border border-red-600/30">
                <User className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-none">Suporte Eforte</p>
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-1">Online agora</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white h-8 w-8">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50"
          >
            {messages.length === 0 && (
              <div className="flex justify-start">
                <div className="max-w-[85%] p-3.5 rounded-2xl text-sm font-medium bg-slate-800 text-slate-200 rounded-bl-none border border-red-600/20 shadow-lg">
                  <span className="block text-[9px] text-red-500 font-bold uppercase tracking-wider mb-1">Assistente Virtual 🤖</span>
                  Olá, <b>{user.name}</b>! Sou o assistente virtual da Eforte Games.
                  <br /><br />
                  Você pode me perguntar se temos algum jogo disponível (ex: <i>"Tem A Way Out?"</i>) ou tirar dúvidas sobre pagamentos, envio e suporte!
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.senderId === user.id ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm font-medium ${
                  msg.senderId === user.id 
                    ? "bg-red-600 text-white rounded-br-none shadow-lg" 
                    : "bg-slate-800 text-slate-200 rounded-bl-none border border-red-600/10"
                }`}>
                  {msg.senderId === "ai-support" && (
                    <span className="block text-[9px] text-red-500 font-bold uppercase tracking-wider mb-1">Assistente Virtual 🤖</span>
                  )}
                  {renderMessageText(msg.text)}
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 bg-slate-950 border-t border-red-600/20 flex gap-2">
            <Input 
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="bg-slate-900 border-red-600/20 text-white text-sm focus-visible:ring-red-600 h-10"
            />
            <Button type="submit" size="icon" className="bg-red-600 hover:bg-red-700 h-10 w-10">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
