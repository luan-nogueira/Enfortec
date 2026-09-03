import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Gamepad2, Star, X, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { playNotificationChime, flashTabTitle } from "@/lib/soundAndNotifications";

export default function OrderDeliveredNotifier() {
  const { isAuthenticated, user, loading } = useAuth();
  const [location, navigate] = useLocation();
  const [dismissedOrderIds, setDismissedOrderIds] = useState<number[]>(() => {
    try {
      const stored = sessionStorage.getItem("dismissed_delivered_orders");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const previousDeliveredIdsRef = useRef<Set<number>>(new Set());
  const hasInitializedRef = useRef(false);

  // Consulta pedidos do comprador a cada 20 segundos em background
  const { data: orders } = trpc.orders.getByBuyerId.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
    refetchInterval: 20000,
  });

  // Filtra pedidos com status "enviado" (já entregues com acesso, aguardando avaliação)
  const deliveredOrders = (orders || []).filter(
    (o: any) => o.status === "enviado" && !dismissedOrderIds.includes(o.id)
  );

  // Toca o som e pisca a aba apenas na PRIMEIRA vez que um pedido muda para "enviado"
  useEffect(() => {
    if (!orders) return;

    const currentDeliveredIds = new Set(
      orders.filter((o: any) => o.status === "enviado").map((o: any) => o.id as number)
    );

    if (!hasInitializedRef.current) {
      previousDeliveredIdsRef.current = currentDeliveredIds;
      hasInitializedRef.current = true;
      return;
    }

    // Identifica novos pedidos entregues em tempo real
    let hasNewDelivery = false;
    currentDeliveredIds.forEach((id) => {
      if (!previousDeliveredIdsRef.current.has(id)) {
        hasNewDelivery = true;
      }
    });

    if (hasNewDelivery) {
      playNotificationChime();
      flashTabTitle("Jogo Entregue! 🎮");
    }

    previousDeliveredIdsRef.current = currentDeliveredIds;
  }, [orders]);

  // Não exibe se estiver na página de Minhas Compras, no painel admin ou se não houver pedidos pendentes
  if (
    !isAuthenticated ||
    loading ||
    location === "/minhas-compras" ||
    location.startsWith("/admin") ||
    location.startsWith("/colaborador") ||
    deliveredOrders.length === 0
  ) {
    return null;
  }

  // Pega o pedido pendente mais recente
  const currentOrder = deliveredOrders[0];
  const pendingCount = deliveredOrders.length;

  const handleDismiss = () => {
    const updated = [...dismissedOrderIds, currentOrder.id];
    setDismissedOrderIds(updated);
    try {
      sessionStorage.setItem("dismissed_delivered_orders", JSON.stringify(updated));
    } catch {}
  };

  const handleGoToPurchases = () => {
    navigate("/minhas-compras");
  };

  const productName = currentOrder.productName || (
    currentOrder.productType === "store" ? "Produto da Loja" :
    currentOrder.productType === "digital" ? "Jogo de Mídia Digital" : "Produto Usado"
  );

  return (
    <div className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-40 sm:max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="bg-slate-900/95 border-2 border-emerald-500/50 rounded-2xl p-4 shadow-[0_10px_35px_rgba(16,185,129,0.35)] backdrop-blur-xl relative overflow-hidden">
        {/* Luz ambiente de destaque no topo */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Botão de Fechar */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg transition-colors z-10"
          title="Fechar aviso por agora"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <Gamepad2 className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>

          <div className="flex-1 pr-4 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" /> Entrega Concluída!
              </span>
              {pendingCount > 1 && (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  +{pendingCount - 1} pendente{pendingCount > 2 ? "s" : ""}
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-white leading-tight line-clamp-1">
              {productName}
            </h4>

            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              Seus dados de acesso já estão disponíveis. Acesse para testar e avaliar o atendimento!
            </p>
          </div>
        </div>

        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center gap-2">
          <Button
            onClick={handleGoToPurchases}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs h-9 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5 transition-all"
          >
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span>Ver Acesso & Avaliar</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>

          <Button
            onClick={handleDismiss}
            variant="ghost"
            className="text-xs text-slate-400 hover:text-slate-200 h-9 px-2.5 rounded-xl"
          >
            Depois
          </Button>
        </div>
      </div>
    </div>
  );
}
