import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { collection, limitToLast, onSnapshot, orderBy, query } from "firebase/firestore";
import {
  TEAM_CHATS,
  TEAM_GENERAL_ID,
  directChatId,
  isThreadUnread,
  markTeamChatRead,
  sendTeamMessage,
  teamChatTimeLabel,
  type TeamChatMessage,
  type TeamChatThread,
  type TeamMember,
} from "@/lib/teamChat";
import { ArrowLeft, Send, User as UserIcon, Users } from "lucide-react";
import { toast } from "sonner";

const MAX_MESSAGE_LENGTH = 2000;

interface AdminTeamChatProps {
  me: { id: string; name: string };
  /** Todos os gestores que já têm conta no site (inclui o próprio usuário). */
  members: TeamMember[];
  threads: Record<string, TeamChatThread>;
}

export default function AdminTeamChat({ me, members, threads }: AdminTeamChatProps) {
  const [selectedId, setSelectedId] = useState<string>(TEAM_GENERAL_ID);
  // No celular a lista e a conversa não cabem juntas: alterna entre as duas.
  const [chatOpenOnMobile, setChatOpenOnMobile] = useState(false);
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const others = useMemo(
    () =>
      members
        .filter((m) => m.id !== me.id)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [members, me.id]
  );

  const conversations = useMemo(
    () => [
      { id: TEAM_GENERAL_ID, title: "Sala da Equipe", subtitle: "Todos os gestores", member: null as TeamMember | null },
      ...others.map((m) => ({
        id: directChatId(me.id, m.id),
        title: m.name,
        subtitle: m.email,
        member: m,
      })),
    ],
    [others, me.id]
  );

  const selected = conversations.find((c) => c.id === selectedId) || conversations[0];
  const selectedThread = threads[selected.id];
  const selectedUnread = isThreadUnread(selectedThread, me.id);

  useEffect(() => {
    const q = query(
      collection(db, TEAM_CHATS, selected.id, "messages"),
      orderBy("timestamp", "asc"),
      limitToLast(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map(
            (d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) } as TeamChatMessage)
          )
        );
      },
      (err) => console.error("[AdminTeamChat] Erro ao carregar mensagens:", err)
    );
    return () => {
      unsub();
      setMessages([]);
    };
  }, [selected.id]);

  // Marca como lida ao abrir a conversa / quando chega mensagem nova com a aba visível.
  useEffect(() => {
    if (!selectedUnread) return;
    const markIfVisible = () => {
      if (!document.hidden) markTeamChatRead(selected.id, me.id);
    };
    markIfVisible();
    document.addEventListener("visibilitychange", markIfVisible);
    return () => document.removeEventListener("visibilitychange", markIfVisible);
  }, [selected.id, selectedUnread, me.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, selected.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      await sendTeamMessage({
        chatId: selected.id,
        text: body,
        sender: me,
        participants: selected.member ? [me.id, selected.member.id] : undefined,
      });
    } catch (err: any) {
      console.error("[AdminTeamChat] Erro ao enviar:", err);
      setText(body);
      toast.error(
        err?.code === "permission-denied"
          ? "Sem permissão para enviar. As regras do Firestore precisam ser publicadas (firebase deploy --only firestore:rules)."
          : "Erro ao enviar a mensagem. Tente novamente."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,300px)_1fr] gap-4">
      {/* Lista de conversas */}
      <div className={`space-y-2 max-h-[32rem] overflow-y-auto pr-1 ${chatOpenOnMobile ? "hidden md:block" : ""}`}>
        {conversations.map((c) => {
          const thread = threads[c.id];
          const unread = isThreadUnread(thread, me.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedId(c.id);
                setChatOpenOnMobile(true);
              }}
              className={`w-full text-left p-3 rounded-xl border transition ${
                selected.id === c.id
                  ? "bg-slate-800 border-red-600/50"
                  : "bg-slate-900/60 border-slate-800 hover:border-red-600/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0 text-xs font-black text-white">
                  {c.member ? (
                    <UserIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  ) : (
                    <Users className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  )}
                  <span className="truncate">{c.title}</span>
                </span>
                {unread && (
                  <span className="shrink-0 text-[8px] font-black uppercase tracking-wider bg-red-600 text-white px-1.5 py-0.5 rounded-full">
                    Nova
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">{c.subtitle}</p>
              {thread?.lastMessage && (
                <p className="text-[11px] text-slate-400 truncate mt-1">
                  {thread.lastSenderId === me.id ? "Você: " : c.member ? "" : `${thread.lastSenderName}: `}
                  {thread.lastMessage}
                </p>
              )}
            </button>
          );
        })}

        {others.length === 0 && (
          <p className="text-[11px] text-slate-500 italic px-1 pt-2">
            Nenhum outro gestor com conta no site ainda. Cada gestor precisa ter entrado no site
            ao menos uma vez para aparecer aqui.
          </p>
        )}
      </div>

      {/* Conversa */}
      <div
        className={`flex-col bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden ${
          chatOpenOnMobile ? "flex" : "hidden md:flex"
        }`}
      >
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setChatOpenOnMobile(false)}
            className="md:hidden h-7 w-7 text-slate-400"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          {selected.member ? (
            <UserIcon className="w-4 h-4 text-red-500 shrink-0" />
          ) : (
            <Users className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-black text-white truncate">{selected.title}</p>
            <p className="text-[10px] text-slate-500 truncate">{selected.subtitle}</p>
          </div>
        </div>

        <div ref={scrollRef} className="h-96 overflow-y-auto p-3.5 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-xs text-slate-600 italic pt-10">
              Nenhuma mensagem ainda. Mande a primeira!
            </p>
          )}
          {messages.map((msg) => {
            const isMine = msg.senderId === me.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[88%] p-2.5 rounded-2xl text-xs font-medium whitespace-pre-wrap break-words leading-relaxed ${
                    isMine
                      ? "bg-red-700 text-white rounded-br-none shadow-md"
                      : "bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-500 mt-0.5 px-1 font-mono">
                  {isMine ? "Você" : msg.senderName}
                  {msg.timestamp ? ` • ${teamChatTimeLabel(msg.timestamp)}` : ""}
                </span>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSend} className="p-2.5 bg-slate-950 border-t border-slate-800 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder={selected.member ? `Mensagem para ${selected.title}...` : "Mensagem para a equipe..."}
            className="flex-1 min-w-0 h-9 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-red-600"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            className="bg-red-600 hover:bg-red-700 h-9 w-9 shrink-0 rounded-xl"
            disabled={sending || !text.trim()}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
