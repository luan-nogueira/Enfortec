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
  serverTimestamp,
  setDoc,
  doc,
  getDocs
} from "firebase/firestore";
import { MessageCircle, X, Send, Bot, ShieldCheck, Zap, Trophy, ShoppingBag, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { containsLink, LINK_BLOCKED_MESSAGE } from "@/lib/textFilters";

// Catalog is now fetched dynamically from Firestore

const WA_NUMBER = "554384253691";
const WA_BASE = `https://wa.me/${WA_NUMBER}`;

function norm(t: string) {
  return t.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function fmt(price: number) {
  return price === 0 ? "A consultar" : `R$ ${price.toFixed(2).replace(".", ",")}`;
}

const STOP = new Set(["tem", "voce", "voces", "o", "de", "com", "jogo", "jogos",
  "disponivel", "a", "os", "as", "um", "uma", "para", "em", "no", "na", "que",
  "e", "do", "da", "game", "games", "ps4", "ps5", "quais", "todos", "lista",
  "algum", "tao", "ter", "qualquer", "sobre"]);

function aiAnswer(q: string, catalog: any[]): string {
  const nq = norm(q);

  if (/jogue com economia|secundaria|conta secundaria/.test(nq))
    return "⚡ **Jogue com Economia (Contas Secundárias)**!\n\nAs contas secundárias são a opção perfeita para jogar os lançamentos gastando muito menos.\n\n[👉 Ver Jogos em Jogue com Economia](/jogue-com-economia)";

  if (/platinador|clube|clube do platinador|assinatura/.test(nq))
    return "🏆 **Clube do Platinador VIP (R$ 35,00/mês)**!\n\n• **2 Sorteios por mês** de jogos no grupo VIP\n• **Desafios Semanais** de Platina acumulando ForteCoins\n\n[👉 Assinar Clube do Platinador](/platinador)";

  if (/vender|revendedor|comissao|escrow|anunciar/.test(nq))
    return "💼 **Vender sua conta ou Mídias Físicas na Eforte Games**!\n\n• **Revenda de Contas**: Comissão de 35% com retenção do valor em escrow até a entrega.\n• **Mídias Físicas / Consoles**: Taxa de 8% com intermediação segura.\n\n[👉 Virar Revendedor](/virar-vendedor)";

  if (/preciso de ajuda|ajuda com algum jogo|qual jogo deseja ajuda/.test(nq))
    return "Com certeza! Estou aqui para ajudar. 🎮\n\nSe você deseja ajuda com um jogo específico, digite o nome dele e eu vejo se temos disponível no nosso catálogo!\n\n[👉 Chamar no WhatsApp](" + WA_BASE + ")";

  if (/pagamento|pix|cartao|boleto|pagar|pago|mercadopago|mercado pago|infinitepay/.test(nq))
    return "Aceitamos **Pix**, **Cartão de Crédito**, **Boleto** e **Saldo Mercado Pago** via Mercado Pago. 💳\n\nVocê também pode usar suas **ForteCoins** como desconto! (10 FC = R$ 1,00 de desconto)";

  if (/fortecoin|moeda|coins|desconto/.test(nq))
    return "As **ForteCoins** são nossa moeda virtual! 🪙\n\nA cada compra você acumula pontos e pode usar como desconto em qualquer produto.\n\n**10 ForteCoins = R$ 1,00 de desconto**";

  if (/entrega|envio|prazo|frete|como recebo/.test(nq))
    return "Mídias digitais são enviadas via **WhatsApp ou e-mail** logo após a confirmação do pagamento. 📦\n\nProdutos físicos vão pelos Correios com rastreio.";

  if (/contato|whatsapp|telefone|suporte|falar com|atendimento|adm/.test(nq))
    return `Fale diretamente com a nossa equipe no WhatsApp:\n[👉 Abrir Suporte no WhatsApp](${WA_BASE})`;

  if (/oi|ola|olá|bom dia|boa tarde|boa noite|tudo bem/.test(nq))
    return "Olá! 👋 Sou o assistente inteligente da **Eforte Games**.\n\nComo posso te ajudar hoje? Escolha um atalho abaixo ou digite o nome do jogo!";

  const isListMode = /quais|lista|todos|tem algum|voces tem|disponivel/.test(nq);
  const keywords = nq.split(" ").filter(w => w.length > 2 && !STOP.has(w));

  const scored = catalog.map(g => {
    const nn = norm(g.name);
    let score = 0;
    if (nq.includes(nn)) score += 100;
    else if (nn.includes(nq) && nq.length >= 3) score += 80;
    if (keywords.length > 0) {
      const words = nn.split(" ");
      let hits = 0;
      for (const kw of keywords) {
        if (words.some(w => w.includes(kw) || kw.includes(w))) hits++;
      }
      score += (hits / keywords.length) * 60;
    }
    return { g, score };
  }).filter(x => x.score >= 15).sort((a, b) => b.score - a.score);

  if (scored.length === 0)
    return `Não encontrei esse jogo exatamente no catálogo padrão. 😕\n\nTente outro nome ou [fale com o atendimento no WhatsApp](${WA_BASE})!`;

  if (scored[0].score >= 80 && scored.length === 1 && !isListMode) {
    const g = scored[0].g;
    return `✅ Temos **${g.name}** disponível!\n\n💰 Valor: **${fmt(g.price)}**\n🎁 Ganhe +7 ForteCoins de Cashback nesta compra!\n\n[👉 Ver Mídias Digitais](/digital)`;
  }

  const top = scored.slice(0, 6);
  const list = top.map(x => `• **${x.g.name}** — ${fmt(x.g.price)}`).join("\n");
  const extra = scored.length > 6 ? `\n\n_...e mais ${scored.length - 6} resultados_` : "";
  return `Encontrei **${scored.length}** resultado(s):\n\n${list}${extra}\n\n[👉 Ver todos na Loja](/digital)`;
}

function parseBold(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) return <strong key={idx} className="font-extrabold text-white">{part}</strong>;
    return part;
  });
}

function renderMessageText(text: string) {
  if (!text) return null;
  return text.split("\n").map((line, lineIdx) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const matches: { index: number; length: number; element: any }[] = [];
    let match;
    while ((match = linkRegex.exec(line)) !== null) {
      const [full, linkText, url] = match;
      matches.push({
        index: match.index,
        length: full.length,
        element: (
          <a key={`link-${match.index}`} href={url} target="_blank" rel="noopener noreferrer"
            className="text-red-400 hover:text-red-300 underline font-bold inline-flex items-center gap-1">
            {linkText}
          </a>
        )
      });
    }
    let pos = 0;
    const parts: any[] = [];
    for (const m of matches) {
      if (m.index > pos) parts.push(...parseBold(line.substring(pos, m.index)));
      parts.push(m.element);
      pos = m.index + m.length;
    }
    if (pos < line.length) parts.push(...parseBold(line.substring(pos)));
    return <div key={lineIdx} className={lineIdx > 0 ? "mt-1.5" : ""}>{parts.length > 0 ? parts : line}</div>;
  });
}

type Msg = { id: string; text: string; senderId: string; senderName: string; timestamp: any };

const WELCOME_FLOW: { text: string; delay: number }[] = [
  { text: "Olá! 👋 Bem-vindo à **Eforte Games**!", delay: 400 },
  { text: "🎮 Precisa de ajuda com algum jogo, conta ou pedido?", delay: 1100 },
];

// Atendentes do WhatsApp
const WA_ATTENDANTS = [
  {
    name: "Andre",
    role: "Suporte & Vendas",
    number: "554384253691",
    avatar: "A",
    color: "bg-red-600",
  },
  {
    name: "Sandro",
    role: "Suporte & Vendas",
    number: "5571987650840",
    avatar: "S",
    color: "bg-blue-600",
  },
];

export default function FloatingChat() {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [showChips, setShowChips] = useState(false);
  const [showWaSelector, setShowWaSelector] = useState(false);
  const welcomeStarted = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [catalog, setCatalog] = useState<{name: string; price: number}[]>([]);
  const [mobileViewport, setMobileViewport] = useState<{ height: number; offsetTop: number } | null>(null);
  const [isPageScrolling, setIsPageScrolling] = useState(false);

  // O botão flutuante fica fixo no canto inferior direito em toda página, então em
  // telas de conteúdo longo (guias, grades de produto) ele acaba tampando texto/preço
  // por baixo. Encolher/apagar ele enquanto a página está sendo rolada evita isso sem
  // precisar reservar espaço em cada página individualmente.
  useEffect(() => {
    if (isOpen) return;
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setIsPageScrolling(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsPageScrolling(false), 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timeout);
    };
  }, [isOpen]);

  // No mobile, elementos fixos acompanham o layout viewport (tela toda) e não o
  // visual viewport (área acima do teclado), deixando um vão entre o input e o teclado.
  // Aqui sincronizamos a altura/posição do painel com o visualViewport em tempo real.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!isOpen || !vv || window.innerWidth >= 640) {
      setMobileViewport(null);
      return;
    }
    const update = () => setMobileViewport({ height: vv.height, offsetTop: vv.offsetTop });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [isOpen]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const snap = await getDocs(collection(db, "digital_products"));
        const products = snap.docs.map(doc => {
          const data = doc.data();
          return { name: data.name, price: Number(data.price) || 0 };
        });
        setCatalog(products);
      } catch (err) {
        console.error("Error fetching catalog for chat:", err);
      }
    };
    fetchCatalog();
  }, []);

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !user?.id) return;
    const q = query(collection(db, "chats", user.id, "messages"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Msg)));
    });
    return () => unsub();
  }, [isOpen, isAuthenticated, user?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    if (!isOpen || welcomeStarted.current) return;
    const delayCheck = setTimeout(() => {
      if (welcomeStarted.current) return;
      welcomeStarted.current = true;
      setShowChips(false);

      const timeouts: ReturnType<typeof setTimeout>[] = [];

      WELCOME_FLOW.forEach((step, idx) => {
        const tTyping = setTimeout(() => setThinking(true), step.delay - 400 < 0 ? 0 : step.delay - 400);
        const tMsg = setTimeout(() => {
          setThinking(false);
          setMessages(prev => {
            if (prev.length > 0 && !prev[0]?.id?.startsWith("welcome-")) return prev;
            return [
              ...prev,
              {
                id: `welcome-${idx}`,
                text: step.text,
                senderId: "ai-support",
                senderName: "Assistente Eforte",
                timestamp: new Date(),
              },
            ];
          });
          if (idx === WELCOME_FLOW.length - 1) {
            setShowChips(true);
          }
        }, step.delay);
        timeouts.push(tTyping, tMsg);
      });

      return () => timeouts.forEach(clearTimeout);
    }, isAuthenticated ? 600 : 100);

    return () => clearTimeout(delayCheck);
  }, [isOpen, isAuthenticated]);

  const sendMessage = async (msg: string) => {
    if (!msg.trim() || thinking) return;

    if (containsLink(msg)) {
      toast.error(LINK_BLOCKED_MESSAGE);
      return;
    }

    const uid = isAuthenticated && user?.id ? user.id : "guest";
    const uname = isAuthenticated && user?.name ? user.name : "Visitante";

    if (!isAuthenticated || !user?.id) {
      setMessages(prev => [...prev, {
        id: `u-${Date.now()}`, text: msg, senderId: uid, senderName: uname, timestamp: new Date()
      }]);
    }

    setThinking(true);
    await new Promise(r => setTimeout(r, 450));
    const answer = aiAnswer(msg, catalog);
    setThinking(false);

    if (isAuthenticated && user?.id) {
      const chatRef = doc(db, "chats", user.id);
      try {
        await setDoc(chatRef, {
          userId: user.id, userName: user.name, userEmail: user.email || "",
          lastMessage: msg, updatedAt: serverTimestamp(), unreadByAdmin: true
        }, { merge: true });
        await addDoc(collection(db, "chats", user.id, "messages"), {
          text: msg, senderId: user.id, senderName: user.name, timestamp: serverTimestamp()
        });
        await addDoc(collection(db, "chats", user.id, "messages"), {
          text: answer, senderId: "ai-support", senderName: "Assistente Eforte", timestamp: serverTimestamp()
        });
        await setDoc(chatRef, { lastMessage: answer, updatedAt: serverTimestamp(), unreadByAdmin: false }, { merge: true });
      } catch {
        setMessages(prev => [...prev,
          { id: `u-${Date.now()}`, text: msg, senderId: user.id, senderName: user.name, timestamp: new Date() },
          { id: `ai-${Date.now()}`, text: answer, senderId: "ai-support", senderName: "Assistente Eforte", timestamp: new Date() }
        ]);
      }
    } else {
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`, text: answer, senderId: "ai-support", senderName: "Assistente Eforte", timestamp: new Date()
      }]);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || thinking) return;
    const msg = message.trim();
    setMessage("");
    await sendMessage(msg);
  };

  const handleSelectSuggestion = async (text: string) => {
    await sendMessage(text);
  };

  const currentUserId = isAuthenticated && user?.id ? user.id : "guest";

  return (
    <>
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[90] transition-all duration-300 cursor-pointer animate-in fade-in"
        />
      )}

      <div className={`fixed ${isOpen ? "inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2" : "bottom-20 right-4 sm:bottom-6 sm:right-6"} ${isOpen ? "z-[10000]" : "z-30"}`}>
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_8px_25px_rgba(220,38,38,0.5)] flex items-center justify-center p-0 transition-all duration-300 hover:scale-110 active:scale-95 group relative border border-red-400/30 ${
              isPageScrolling ? "opacity-40 scale-75" : "opacity-100 scale-100"
            }`}
          >
            <MessageCircle className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-950 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </Button>
        )}

        {isOpen && (
          <Card
            style={mobileViewport ? { height: `${mobileViewport.height}px`, marginTop: `${mobileViewport.offsetTop}px` } : undefined}
            className="w-full h-full sm:w-[600px] sm:max-w-none sm:h-[650px] flex flex-col gap-0 py-0 bg-slate-900 border-red-600/40 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden sm:rounded-2xl animate-in zoom-in-95 duration-200 rounded-none border-0 sm:border">
            {/* Header */}
            <div className="p-3.5 bg-gradient-to-r from-red-700 via-red-600 to-red-700 flex justify-between items-center shrink-0 border-b border-red-500/30 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-950/80 border border-red-400/30 flex items-center justify-center shadow-inner">
                  <Bot className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-xs font-black text-white leading-none tracking-wide">Assistente Eforte 🤖</p>
                  <p className="text-[9px] text-emerald-300 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Atendimento IA 24h
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowWaSelector(v => !v)}
                  className="w-8 h-8 rounded-lg bg-green-600/80 hover:bg-green-600 flex items-center justify-center text-white transition-colors shadow"
                  title="Atendimento no WhatsApp"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.118-2.905-6.993C16.257 1.874 13.78 1.84 11.14 1.84 5.704 1.84 1.28 6.261 1.277 11.705c-.001 1.714.453 3.39 1.317 4.873L1.576 22.25l5.071-1.328z"/>
                  </svg>
                </button>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 rounded-lg">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Modal de Seleção de Atendente */}
              {showWaSelector && (
                <div className="absolute top-14 right-3 z-50 bg-slate-900 border border-green-500/30 rounded-2xl shadow-2xl p-4 w-64 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-[10px] text-green-400 font-black uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.118-2.905-6.993C16.257 1.874 13.78 1.84 11.14 1.84 5.704 1.84 1.28 6.261 1.277 11.705c-.001 1.714.453 3.39 1.317 4.873L1.576 22.25l5.071-1.328z"/></svg>
                    Com quem deseja falar?
                  </p>
                  <div className="space-y-2">
                    {WA_ATTENDANTS.map(att => (
                      <a
                        key={att.name}
                        href={`https://wa.me/${att.number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowWaSelector(false)}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800 hover:bg-green-900/40 border border-slate-700 hover:border-green-500/40 transition-all group"
                      >
                        <div className={`w-9 h-9 rounded-full ${att.color} flex items-center justify-center text-white font-black text-sm shrink-0`}>
                          {att.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-black text-xs group-hover:text-green-300 transition-colors">{att.name}</p>
                          <p className="text-slate-400 text-[10px]">{att.role}</p>
                        </div>
                        <svg className="w-4 h-4 fill-current text-green-500 shrink-0" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.118-2.905-6.993C16.257 1.874 13.78 1.84 11.14 1.84 5.704 1.84 1.28 6.261 1.277 11.705c-.001 1.714.453 3.39 1.317 4.873L1.576 22.25l5.071-1.328z"/></svg>
                      </a>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowWaSelector(false)}
                    className="mt-3 w-full text-[10px] text-slate-500 hover:text-slate-300 font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* Quick Topic Chips Bar */}
            <div className="px-2.5 py-1.5 bg-slate-950 border-b border-slate-800 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              {[
                { label: "⚡ Economia", query: "Jogue com Economia" },
                { label: "🏆 Platinador", query: "Clube do Platinador" },
                { label: "💼 Revender", query: "Vender minha conta" },
                { label: "📦 Entregas", query: "como recebo meu jogo" },
              ].map(topic => (
                <button
                  key={topic.query}
                  onClick={() => handleSelectSuggestion(topic.query)}
                  className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-900 border border-slate-800 hover:border-red-500/40 text-slate-300 hover:text-white whitespace-nowrap transition-all shrink-0"
                >
                  {topic.label}
                </button>
              ))}
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-950/60">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] p-3 rounded-2xl text-xs font-medium ${
                    msg.senderId === currentUserId
                      ? "bg-red-600 text-white rounded-br-none shadow-md"
                      : "bg-slate-900 text-slate-200 rounded-bl-none border border-slate-800"
                  }`}>
                    {msg.senderId === "ai-support" && (
                      <span className="block text-[8px] text-red-400 font-black uppercase tracking-wider mb-1">Eforte Bot 🤖</span>
                    )}
                    {msg.senderId === "admin" && (
                      <span className="block text-[8px] text-emerald-400 font-black uppercase tracking-wider mb-1">Gestor Eforte</span>
                    )}
                    {renderMessageText(msg.text)}
                  </div>
                </div>
              ))}

              {/* Dynamic Action Chips */}
              {showChips && messages.length === WELCOME_FLOW.length && (
                <div className="flex flex-col gap-1.5 pl-1 pr-2 mt-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Como posso ajudar?</span>
                  {[
                    { emoji: "⚡", label: "Ver Jogos Secundários (Jogue com Economia)", query: "Jogue com Economia" },
                    { emoji: "🏆", label: "Assinar Clube do Platinador VIP", query: "Clube do Platinador" },
                    { emoji: "💼", label: "Como Vender / Anunciar minha conta", query: "Vender minha conta" },
                    { emoji: "💬", label: "Falar com Atendente no WhatsApp", query: "contato" },
                  ].map(chip => (
                    <button
                      key={chip.query}
                      type="button"
                      onClick={() => { setShowChips(false); handleSelectSuggestion(chip.query); }}
                      className="text-left text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white px-3 py-2 rounded-xl border border-slate-800 hover:border-red-500/40 transition-all font-semibold cursor-pointer active:scale-95 shadow-sm"
                    >
                      {chip.emoji} {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Typing indicator */}
              {thinking && (
                <div className="flex justify-start">
                  <div className="p-2.5 rounded-2xl rounded-bl-none bg-slate-900 border border-slate-800 flex gap-1.5 items-center">
                    <span className="text-[8px] text-red-400 font-bold uppercase tracking-wider mr-1">Eforte Bot 🤖</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Direct WhatsApp Callout Banner */}
            <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 flex justify-center shrink-0">
              <button
                onClick={() => setShowWaSelector(v => !v)}
                className="flex items-center justify-center gap-2 w-full bg-green-600/90 hover:bg-green-600 text-white font-black text-[10px] uppercase tracking-wider py-2 rounded-lg shadow transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.118-2.905-6.993C16.257 1.874 13.78 1.84 11.14 1.84 5.704 1.84 1.28 6.261 1.277 11.705c-.001 1.714.453 3.39 1.317 4.873L1.576 22.25l5.071-1.328z"/>
                </svg>
                Atendimento Direto no WhatsApp
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-2.5 bg-slate-950 border-t border-slate-800 flex gap-2 shrink-0">
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Pergunte sobre jogos, preços..."
                className="bg-slate-900 border-slate-800 text-white text-xs focus-visible:ring-red-600 h-9 rounded-xl"
                disabled={thinking}
              />
              <Button type="submit" size="icon" className="bg-red-600 hover:bg-red-700 h-9 w-9 shrink-0 rounded-xl" disabled={thinking}>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
