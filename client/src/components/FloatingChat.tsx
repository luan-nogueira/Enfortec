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
  doc
} from "firebase/firestore";
import { MessageCircle, X, Send, Bot } from "lucide-react";

// ─── Client-side AI catalog ──────────────────────────────────────────────────
const CATALOG = [
  { name: "AGONY PS4/PS5", price: 9.90 },
  { name: "ASSASSIN'S CREED MIRAGE PS4/PS5", price: 59.90 },
  { name: "ASSASSIN'S CREED ODYSSEY PS4/PS5", price: 44.90 },
  { name: "ASSASSIN'S CREED ORIGINS PS4/PS5", price: 37.90 },
  { name: "ASSASSIN'S CREED SHADOWS PS5", price: 144.90 },
  { name: "ASSASSIN'S CREED SYNDICATE PS4/PS5", price: 59.99 },
  { name: "ASSASSIN'S CREED VALHALLA PS4/PS5", price: 50.00 },
  { name: "ATOMIC HEART PS4/PS5", price: 69.90 },
  { name: "AVATAR PS4/PS5", price: 74.90 },
  { name: "BATTLEFIELD 1 PS4/PS5", price: 34.90 },
  { name: "BATTLEFIELD 4 PS4/PS5", price: 29.90 },
  { name: "BATTLEFIELD V PS4/PS5", price: 36.90 },
  { name: "BLEACH REBIRTH OF SOULS PS5", price: 100.00 },
  { name: "CALL OF DUTY GHOSTS PS4/PS5", price: 99.90 },
  { name: "CALL OF DUTY VANGUARD PS4/PS5", price: 89.90 },
  { name: "CALL OF DUTY WW2 PS4/PS5", price: 100.00 },
  { name: "COD BLACK OPS 6 PS4/PS5", price: 80.00 },
  { name: "COD BLACK OPS 7 PS4/PS5", price: 120.00 },
  { name: "COD COLD WAR PS4/PS5", price: 80.00 },
  { name: "CRASH BANDICOOT TRILOGY PS4/PS5", price: 59.90 },
  { name: "CRASH NITRO KART PS4/PS5", price: 59.90 },
  { name: "DEAD ISLAND 2 PS4/PS5", price: 50.00 },
  { name: "DEAD SPACE PS5", price: 69.90 },
  { name: "DEMON SLAYER 2 PS4/PS5", price: 144.90 },
  { name: "DETROIT BECOME HUMAN PS4/PS5", price: 59.90 },
  { name: "DEVIL MAY CRY 5 PS5", price: 30.00 },
  { name: "DEVIL MAY CRY 5 + VERGIL PS4/PS5", price: 16.90 },
  { name: "DEVIL MAY CRY DEFINITIVE EDITION PS4", price: 36.90 },
  { name: "DIABLO 4 PS4/PS5", price: 100.00 },
  { name: "DIABLO ETERNAL COLLECTION PS4/PS5", price: 64.90 },
  { name: "DOOM DARK AGES PS5", price: 110.00 },
  { name: "DOOM ETERNAL PS4/PS5", price: 64.90 },
  { name: "DRAGON BALL KAKAROT PS4/PS5", price: 59.90 },
  { name: "DRAGON BALL SPARKING ZERO PS5", price: 174.90 },
  { name: "DYING LIGHT PS4/PS5", price: 20.00 },
  { name: "DYING LIGHT 2 PS4/PS5", price: 54.90 },
  { name: "DYING LIGHT THE BEAST PS5", price: 159.90 },
  { name: "EXPEDITION 33 PS5", price: 149.90 },
  { name: "FAR CRY 5 PS4/PS5", price: 30.00 },
  { name: "FAR CRY 6 PS4/PS5", price: 54.90 },
  { name: "FAR CRY NEW DAWN PS4/PS5", price: 24.90 },
  { name: "FINAL FANTASY XVI PS5", price: 119.90 },
  { name: "GHOST RECON WILDLANDS PS4/PS5", price: 34.90 },
  { name: "GOD OF WAR 2018 PS4/PS5", price: 59.90 },
  { name: "GOD OF WAR 3 REMASTER PS4/PS5", price: 36.99 },
  { name: "GTA V PS4/PS5", price: 59.90 },
  { name: "HELLBLADE 2 PS5", price: 70.00 },
  { name: "HI-FI RUSH PS5", price: 59.90 },
  { name: "HOGWARTS LEGACY PS4/PS5", price: 39.90 },
  { name: "HORIZON FORBIDDEN WEST PS4/PS5", price: 100.00 },
  { name: "JEDI FALLEN ORDER PS4/PS5", price: 44.99 },
  { name: "JUST CAUSE 4 PS4/PS5", price: 19.90 },
  { name: "MAFIA 3 PS4/PS5", price: 24.90 },
  { name: "MAFIA THE OLD COUNTRY PS5", price: 159.90 },
  { name: "MARTHA IS DEAD PS4/PS5", price: 40.00 },
  { name: "MORTAL KOMBAT 1 PS5", price: 69.90 },
  { name: "MORTAL KOMBAT 11 PS4/PS5", price: 20.00 },
  { name: "NARUTO STORM 4 PS4/PS5", price: 59.90 },
  { name: "NBA 2K26 PS4/PS5", price: 65.00 },
  { name: "PREY PS4/PS5", price: 27.90 },
  { name: "PRINCE OF PERSIA LOST CROWN PS4/PS5", price: 44.90 },
  { name: "REANIMAL PS5", price: 159.90 },
  { name: "RED DEAD REDEMPTION 2 PS4/PS5", price: 64.90 },
  { name: "SHADOW OF THE COLOSSUS PS4/PS5", price: 44.99 },
  { name: "SHADOW OF MORDOR PS4/PS5", price: 17.90 },
  { name: "SNIPER ELITE 4 PS4/PS5", price: 27.90 },
  { name: "SNIPER ELITE RESISTANCE PS4/PS5", price: 109.90 },
  { name: "STAR WARS OUTLAWS PS5", price: 69.90 },
  { name: "TEST DRIVE UNLIMITED SOLAR CROWN PS5", price: 44.90 },
  { name: "THE CREW MOTORFEST PS4/PS5", price: 55.00 },
  { name: "THE ELDER SCROLLS V SKYRIM PS4/PS5", price: 36.90 },
  { name: "THE LAST OF US PART I PS5", price: 120.00 },
  { name: "THE LAST OF US PART II PS4", price: 100.00 },
  { name: "THE LAST OF US REMASTERED PS4/PS5", price: 35.90 },
  { name: "THE ORDER 1886 PS4/PS5", price: 36.90 },
  { name: "TOM CLANCY GHOST RECON BREAKPOINT PS4/PS5", price: 39.90 },
  { name: "TONY HAWK'S PRO SKATER 1+2 PS4/PS5", price: 64.90 },
  { name: "UNCHARTED 4 + LOST LEGACY PS4", price: 69.90 },
  { name: "UNCHARTED LEGACY OF THIEVES PS5", price: 89.90 },
  { name: "WATCH DOGS LEGION PS4/PS5", price: 29.90 },
  { name: "WOLFENSTEIN THE NEW ORDER PS4/PS5", price: 16.90 },
  { name: "WUCHANG FALLEN FEATHERS PS5", price: 149.90 },
  { name: "WWE 2K26 PS5", price: 184.90 },
];

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

function aiAnswer(q: string): string {
  const nq = norm(q);

  // FAQ
  if (/preciso de ajuda|ajuda com algum jogo|qual jogo deseja ajuda/.test(nq))
    return "Com certeza! Estou aqui para ajudar. 🎮\n\nSe você deseja ajuda com um jogo específico, digite o nome dele e eu vejo se temos disponível.\n\nSe preferir falar diretamente com um atendente, clique aqui: [👉 Chamar no WhatsApp](" + WA_BASE + ")";
  if (/pagamento|pix|cartao|boleto|pagar|pago|infinitepay/.test(nq))
    return "Aceitamos **Pix**, **Cartão de Crédito** e **Boleto** via InfinitePay. 💳\n\nVocê também pode usar suas **ForteCoins** como desconto! (10 FC = R$ 1,00 de desconto)";
  if (/fortecoin|moeda|coins|desconto/.test(nq))
    return "As **ForteCoins** são nossa moeda virtual! 🪙\n\nA cada compra você acumula pontos e pode usar como desconto em qualquer produto.\n\n**10 ForteCoins = R$ 1,00 de desconto**\n\nAcesse a loja e marque a opção \"Usar ForteCoins\" no checkout.";
  if (/entrega|envio|prazo|frete|como recebo/.test(nq))
    return "Mídias digitais são enviadas via **WhatsApp ou e-mail** logo após a confirmação do pagamento. 📦\n\nProdutos físicos vão pelos Correios com rastreio.";
  if (/contato|whatsapp|telefone|suporte|falar com|atendimento|adm/.test(nq))
    return `Fale diretamente com a nossa equipe:\n[👉 Abrir WhatsApp](${WA_BASE})`;
  if (/como comprar|adquirir|onde comprar/.test(nq))
    return "É simples! 🛒\n\n1. Acesse nossa **[Loja](/loja)**\n2. Escolha o jogo e a versão (PS4/PS5)\n3. Preencha seus dados\n4. Use suas **ForteCoins** como desconto (opcional)\n5. Pague via Pix, Cartão ou Boleto";
  if (/oi|ola|olá|bom dia|boa tarde|boa noite|tudo bem/.test(nq))
    return "Olá! 👋 Sou o assistente da **Eforte Games**.\n\nPosso te ajudar a encontrar jogos, tirar dúvidas sobre pagamentos e muito mais. Pergunte o que quiser! 🎮";

  const isListMode = /quais|lista|todos|tem algum|voces tem|disponivel/.test(nq);
  const keywords = nq.split(" ").filter(w => w.length > 2 && !STOP.has(w));

  const scored = CATALOG.map(g => {
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
    return `Não encontrei esse jogo no catálogo. 😕\n\nTente outro nome ou [fale com o ADM no WhatsApp](${WA_BASE}) para verificar!`;

  if (scored[0].score >= 80 && scored.length === 1 && !isListMode) {
    const g = scored[0].g;
    return `✅ Temos **${g.name}** disponível!\n\n💰 Preço: **${fmt(g.price)}**\n🪙 Você pode usar **ForteCoins** como desconto no checkout!\n\n[👉 Ver na Loja](/loja)`;
  }

  const top = scored.slice(0, 7);
  const list = top.map(x => `• **${x.g.name}** — ${fmt(x.g.price)}`).join("\n");
  const extra = scored.length > 7 ? `\n\n_...e mais ${scored.length - 7} resultados_` : "";
  return `Encontrei **${scored.length}** jogo(s) no catálogo:\n\n${list}${extra}\n\n[👉 Ver todos na Loja](/loja)`;
}
// ─────────────────────────────────────────────────────────────────────────────


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
            className="text-red-400 hover:text-red-300 underline font-bold">
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

// ─── Component ───────────────────────────────────────────────────────────────
type Msg = { id: string; text: string; senderId: string; senderName: string; timestamp: any };

// Mensagens de boas-vindas automáticas do bot
const WELCOME_FLOW: { text: string; delay: number }[] = [
  { text: "Olá! 👋 Bem-vindo à **Eforte Games**! Preciso de ajuda?", delay: 600 },
  { text: "🎮 Precisa de ajuda com algum jogo?", delay: 1400 },
  { text: "🔍 Qual jogo deseja ajuda? Digite o nome abaixo ou clique em uma das opções rápidas!", delay: 2200 },
];

export default function FloatingChat() {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [showChips, setShowChips] = useState(false);
  const welcomeStarted = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Real-time messages for authenticated users
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

  // Fluxo de boas-vindas automático: envia as mensagens sequencialmente
  // Só dispara uma vez, quando o chat é aberto e ainda não há mensagens
  useEffect(() => {
    if (!isOpen || welcomeStarted.current) return;
    // Para usuários autenticados, aguarda o Firestore carregar antes de decidir
    // Se já tiver mensagens do Firestore, não exibe boas-vindas
    const delayCheck = setTimeout(() => {
      if (welcomeStarted.current) return;
      // Acessa o estado atual de messages via closure não é confiável;
      // usamos um pequeno delay para o Firestore ter chance de popular
      welcomeStarted.current = true;
      setShowChips(false);

      const timeouts: ReturnType<typeof setTimeout>[] = [];

      WELCOME_FLOW.forEach((step, idx) => {
        const tTyping = setTimeout(() => setThinking(true), step.delay - 500 < 0 ? 0 : step.delay - 500);
        const tMsg = setTimeout(() => {
          setThinking(false);
          setMessages(prev => {
            // Se já houver mensagens reais (do Firestore), não acrescenta as de boas-vindas
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
    }, isAuthenticated ? 800 : 100); // aguarda um pouco mais para usuários autenticados

    return () => clearTimeout(delayCheck);
  }, [isOpen, isAuthenticated]);

  const sendMessage = async (msg: string) => {
    if (!msg.trim() || thinking) return;

    const uid = isAuthenticated && user?.id ? user.id : "guest";
    const uname = isAuthenticated && user?.name ? user.name : "Visitante";

    // Optimistic user message (for guests; Firestore listener handles auth users)
    if (!isAuthenticated || !user?.id) {
      setMessages(prev => [...prev, {
        id: `u-${Date.now()}`, text: msg, senderId: uid, senderName: uname, timestamp: new Date()
      }]);
    }

    setThinking(true);

    // Simulate slight delay for natural feel
    await new Promise(r => setTimeout(r, 600));
    const answer = aiAnswer(msg);
    setThinking(false);

    if (isAuthenticated && user?.id) {
      // Persist to Firestore for logged-in users (admin can see it)
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
        // Fallback: show locally if Firestore fails
        setMessages(prev => [...prev,
          { id: `u-${Date.now()}`, text: msg, senderId: user.id, senderName: user.name, timestamp: new Date() },
          { id: `ai-${Date.now()}`, text: answer, senderId: "ai-support", senderName: "Assistente Eforte", timestamp: new Date() }
        ]);
      }
    } else {
      // Guest: local state only
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
  const currentUserName = isAuthenticated && user?.name ? user.name : "Visitante";

  return (
    <>
      {/* Frosted blurred background overlay when open */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[90] transition-all duration-500 cursor-pointer animate-in fade-in duration-300"
        />
      )}

      <div className={`fixed bottom-20 right-4 sm:bottom-6 sm:right-6 ${isOpen ? "z-[100]" : "z-[80]"} lg:bottom-6 lg:right-6`}>
        {/* Floating Button */}
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-[0_8px_30px_rgba(220,38,38,0.5)] flex items-center justify-center p-0 transition-all hover:scale-110 active:scale-95 group relative"
          >
            <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 border-2 border-slate-950 rounded-full animate-pulse" />
          </Button>
        )}

        {/* Chat Window */}
        {isOpen && (
          <Card className="w-[calc(100vw-2rem)] max-w-[360px] h-[520px] flex flex-col bg-slate-900 border-red-600/30 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-red-700 to-red-600 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-none">Assistente Eforte</p>
                <p className="text-[10px] text-green-300 font-bold uppercase tracking-widest mt-0.5">● Online agora</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={WA_BASE}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                title="Suporte no WhatsApp"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.118-2.905-6.993C16.257 1.874 13.78 1.84 11.14 1.84 5.704 1.84 1.28 6.261 1.277 11.705c-.001 1.714.453 3.39 1.317 4.873L1.576 22.25l5.071-1.328z"/>
                </svg>
              </a>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/80">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] p-3.5 rounded-2xl text-sm font-medium ${
                  msg.senderId === currentUserId
                    ? "bg-red-600 text-white rounded-br-none shadow-lg"
                    : "bg-slate-800 text-slate-200 rounded-bl-none border border-red-600/20"
                }`}>
                  {msg.senderId === "ai-support" && (
                    <span className="block text-[9px] text-red-400 font-bold uppercase tracking-wider mb-1.5">Assistente 🤖</span>
                  )}
                  {renderMessageText(msg.text)}
                </div>
              </div>
            ))}

            {/* Chips de ação rápida — aparecem após as mensagens de boas-vindas */}
            {showChips && messages.length === WELCOME_FLOW.length && (
              <div className="flex flex-col gap-2 pl-1 pr-2 mt-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Resposta rápida:</span>
                {[
                  { emoji: "🎮", label: "Sim, preciso de ajuda com um jogo!", query: "Preciso de ajuda" },
                  { emoji: "💳", label: "Como funciona o pagamento?", query: "Como funciona o pagamento" },
                  { emoji: "📦", label: "Como recebo meu jogo?", query: "Como recebo meu jogo" },
                  { emoji: "💬", label: "Falar com suporte", query: "contato" },
                ].map(chip => (
                  <button
                    key={chip.query}
                    type="button"
                    onClick={() => { setShowChips(false); handleSelectSuggestion(chip.query); }}
                    className="text-left text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-2.5 rounded-xl border border-red-600/15 hover:border-red-600/40 transition-all font-semibold cursor-pointer active:scale-95"
                  >
                    {chip.emoji} {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* Chips reaparecem após uma troca de mensagens se o usuário quiser continuar */}
            {!showChips && messages.length > 0 && messages[messages.length - 1]?.senderId === "ai-support" && !thinking && (
              <div className="flex flex-wrap gap-1.5 pl-1 pr-2 mt-1">
                {[
                  { emoji: "🎮", label: "Ver catálogo", query: "quais jogos vocês têm" },
                  { emoji: "💬", label: "Falar com suporte", query: "contato" },
                ].map(chip => (
                  <button
                    key={chip.query}
                    type="button"
                    onClick={() => handleSelectSuggestion(chip.query)}
                    className="text-xs bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700/60 hover:border-red-600/30 transition-all font-medium cursor-pointer active:scale-95"
                  >
                    {chip.emoji} {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* Typing indicator */}
            {thinking && (
              <div className="flex justify-start">
                <div className="p-3.5 rounded-2xl rounded-bl-none bg-slate-800 border border-red-600/10 flex gap-1.5 items-center">
                  <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider mr-1">Assistente 🤖</span>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>



          {/* Quick Support Banner above Input */}
          <div className="px-3 py-2 bg-slate-950/60 border-t border-red-600/10 flex justify-center flex-shrink-0">
            <a
              href={WA_BASE}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-black text-[11px] uppercase tracking-wider py-2 rounded-lg shadow-md transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.118-2.905-6.993C16.257 1.874 13.78 1.84 11.14 1.84 5.704 1.84 1.28 6.261 1.277 11.705c-.001 1.714.453 3.39 1.317 4.873L1.576 22.25l5.071-1.328z"/>
              </svg>
              Precisa de ajuda? Chamar no WhatsApp
            </a>
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-red-600/10 flex gap-2 flex-shrink-0">
            <Input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Pergunte sobre jogos, preços..."
              className="bg-slate-900 border-slate-700 text-white text-sm focus-visible:ring-red-600 h-10"
              disabled={thinking}
            />
            <Button type="submit" size="icon" className="bg-red-600 hover:bg-red-700 h-10 w-10 flex-shrink-0" disabled={thinking}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </Card>
      )}
      </div>
    </>
  );
}
