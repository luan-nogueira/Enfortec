import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import UserProfileButton from "@/components/UserProfileButton";
import { getNotificationPermission, requestNotificationPermission } from "@/lib/soundAndNotifications";
import { announceNewSales, useSaleAlerts } from "@/lib/useSaleAlerts";
import { ArrowLeft, Bell, BellOff, Check, Copy, Headset, MessageCircle, Phone, ShieldAlert, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

type Filter = "a_contatar" | "contatados" | "todos";

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  pago: { text: "Pago — aguardando entrega", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  enviado: { text: "Entregue ao cliente", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  entregue: { text: "Confirmado pelo cliente", className: "bg-green-500/15 text-green-400 border-green-500/30" },
};

const SOUND_KEY = "support_sound_enabled";

function buildWhatsAppLink(order: any) {
  const digits = String(order.buyerPhone || "").replace(/\D/g, "");
  if (!digits) return null;
  const firstName = String(order.buyerName || "").split(" ")[0] || "tudo bem";
  const intro = `Olá, ${firstName}! Aqui é do suporte da Eforte Games.`;
  const body =
    order.status === "pago"
      ? `Recebemos o pagamento do seu pedido #${order.id} (${order.productName}) e já estamos preparando a entrega. Qualquer dúvida é só me chamar por aqui!`
      : `Vi que você comprou ${order.productName} (pedido #${order.id}) e seu acesso já está disponível em "Minhas Compras". Consegui te ajudar com o acesso ao jogo? Posso ajudar com a instalação por aqui!`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(`${intro} ${body}`)}`;
}

function formatWhen(value: any) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function SupportDashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<Filter>("a_contatar");
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const [permission, setPermission] = useState(getNotificationPermission());

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/login");
  }, [loading, isAuthenticated, navigate]);

  const salesQuery = trpc.support.listSales.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    // A lista pesa ~50 KB, então quem avisa de venda nova é o useSaleAlerts (consulta de poucos
    // bytes a cada ~25s), que manda recarregar esta lista quando entra pedido. Aqui só uma
    // atualização de segurança a cada 5 min (aba visível) e ao voltar pra aba.
    refetchInterval: () => (typeof document !== "undefined" && !document.hidden ? 300000 : false),
    refetchOnWindowFocus: true,
  });
  const markContacted = trpc.support.markContacted.useMutation({
    onSuccess: () => salesQuery.refetch(),
    onError: (err: any) => toast.error(err?.message || "Não foi possível atualizar."),
  });

  const sales = (salesQuery.data || []) as any[];

  const forbidden = (salesQuery.error as any)?.data?.code === "FORBIDDEN";

  // Aviso (som + pop-up) de venda nova, por número de pedido (não por status: a entrega
  // automática já deixa o pedido "enviado" em ~1s). Recarrega a lista quando entra venda.
  useSaleAlerts({
    enabled: isAuthenticated && !forbidden,
    onNewSales: (newSales) => {
      salesQuery.refetch();
      announceNewSales(newSales, { playSound: soundEnabled, onClickUrl: "/suporte" });
    },
  });

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "1" : "0");
    } catch {}
  };

  const enableBrowserAlerts = async () => {
    const granted = await requestNotificationPermission();
    setPermission(getNotificationPermission());
    if (!granted) toast.warning("Permissão negada. Libere as notificações nas configurações do navegador.");
  };

  const pendingCount = useMemo(() => sales.filter((s) => !s.supportContactedAt).length, [sales]);
  const visible = useMemo(() => {
    if (filter === "a_contatar") return sales.filter((s) => !s.supportContactedAt);
    if (filter === "contatados") return sales.filter((s) => !!s.supportContactedAt);
    return sales;
  }, [sales, filter]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-slate-400 hover:text-white shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <Headset className="w-5 h-5 text-red-500 shrink-0" />
              <h1 className="font-black text-lg truncate">Painel do Suporte</h1>
              {pendingCount > 0 && (
                <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full shrink-0">
                  {pendingCount} a contatar
                </span>
              )}
            </div>
          </div>
          <UserProfileButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {forbidden ? (
          <div className="rounded-2xl border border-red-800/40 bg-red-950/20 p-6 text-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-red-500 mx-auto" />
            <p className="font-bold">Sem acesso ao Painel do Suporte</p>
            <p className="text-sm text-slate-400">Peça a um administrador para liberar o cargo de Suporte na sua conta.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                {([
                  ["a_contatar", `A contatar (${pendingCount})`],
                  ["contatados", "Contatados"],
                  ["todos", "Todos"],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                      filter === key ? "bg-red-600 text-white" : "text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={toggleSound} className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-300">
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 mr-1.5" /> : <VolumeX className="w-3.5 h-3.5 mr-1.5" />}
                  {soundEnabled ? "Som ligado" : "Som desligado"}
                </Button>
                {permission !== "granted" && permission !== "unsupported" && (
                  <Button variant="outline" size="sm" onClick={enableBrowserAlerts} className="h-8 text-xs border-amber-600/40 bg-amber-950/20 text-amber-400">
                    <Bell className="w-3.5 h-3.5 mr-1.5" /> Ativar avisos
                  </Button>
                )}
                {permission === "denied" && <BellOff className="w-4 h-4 text-slate-500 self-center" />}
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Os avisos de venda nova só tocam com esta página aberta no navegador (ela confere a cada ~25 segundos). Se você ficar fora, ao voltar aparece um resumo das vendas que entraram.
            </p>

            {salesQuery.isLoading ? (
              <p className="text-center text-slate-500 py-10 text-sm">Carregando vendas...</p>
            ) : visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-slate-500 text-sm">
                {filter === "a_contatar" ? "Tudo em dia! Nenhuma venda esperando contato. 🎉" : "Nada por aqui."}
              </div>
            ) : (
              visible.map((order) => {
                const status = STATUS_LABEL[order.status] || { text: order.status, className: "bg-slate-800 text-slate-300 border-slate-700" };
                const wa = buildWhatsAppLink(order);
                const done = !!order.supportContactedAt;
                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border p-4 space-y-3 ${done ? "border-slate-800 bg-slate-900/40 opacity-80" : "border-red-600/30 bg-slate-900/70"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-500 font-mono">Pedido #{order.id} • {formatWhen(order.createdAt)}</p>
                        <p className="font-bold text-white leading-tight">{order.productName}</p>
                        {order.accountType && (
                          <p className="text-[11px] text-slate-400">Conta {order.accountType === "primaria" ? "primária" : order.accountType === "secundaria" ? "secundária" : order.accountType}</p>
                        )}
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.className}`}>{status.text}</span>
                    </div>

                    <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 space-y-1.5">
                      <p className="text-sm font-semibold">{order.buyerName}</p>
                      {order.buyerEmail && <p className="text-xs text-slate-400 break-all">{order.buyerEmail}</p>}
                      {order.buyerPhone ? (
                        <p className="text-xs text-slate-300 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-500" /> {order.buyerPhone}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-400">Cliente não informou telefone.</p>
                      )}
                    </div>

                    {order.deliveryDetails && (
                      <details className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                        <summary className="text-xs font-bold text-slate-300 cursor-pointer select-none">Ver dados de acesso entregues</summary>
                        <pre className="mt-2 text-[11px] text-slate-300 whitespace-pre-wrap break-words font-mono">{order.deliveryDetails}</pre>
                        <Button variant="ghost" size="sm" onClick={() => copy(order.deliveryDetails)} className="mt-2 h-7 text-[11px] text-slate-400 hover:text-white px-2">
                          <Copy className="w-3 h-3 mr-1" /> Copiar
                        </Button>
                      </details>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {wa && (
                        <Button
                          asChild
                          className="bg-green-600 hover:bg-green-700 text-white font-bold h-10 rounded-xl text-xs flex-1 min-w-[150px]"
                        >
                          <a href={wa} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="w-4 h-4 mr-1.5" /> Chamar no WhatsApp
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        disabled={markContacted.isPending}
                        onClick={() => markContacted.mutate({ orderId: order.id, contacted: !done })}
                        className={`h-10 rounded-xl text-xs flex-1 min-w-[150px] ${done ? "border-slate-700 text-slate-400" : "border-red-600/40 text-red-400 hover:bg-red-950/30"}`}
                      >
                        <Check className="w-4 h-4 mr-1.5" />
                        {done ? `Contatado ${formatWhen(order.supportContactedAt)} — desfazer` : "Marcar como contatado"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </main>
    </div>
  );
}
