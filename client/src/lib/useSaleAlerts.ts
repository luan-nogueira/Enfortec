import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { notifyAdmin } from "@/lib/soundAndNotifications";

export type SaleAlert = {
  id: number;
  createdAt: any;
  status: string | null;
  productName: string;
  buyerName: string;
};

// Guarda o último pedido já "visto" neste navegador: ao reabrir o painel, vendas que entraram
// enquanto ele estava fechado viram um aviso de "vendas novas desde a última visita".
const STORAGE_KEY = "sale_alerts_last_seen_id_v1";
const POLL_MS = 25_000;
const SUMMARY_THRESHOLD = 3;

function readLastSeen(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function storeLastSeen(id: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(id));
  } catch {}
}

/**
 * Avisa de VENDA NOVA nos painéis (admin e suporte). Detecta pelo número do pedido — não pelo
 * status —, porque com a entrega automática o pedido vira "enviado" cerca de 1 segundo depois
 * de pago e um alerta baseado em "pago" nunca enxergava a venda.
 *
 * A cada ~25s (só com a aba visível, e na hora em que ela volta a ficar visível) pergunta ao
 * servidor "há pedido depois do #X?". A resposta é de poucos bytes, então dá pra checar bem
 * mais rápido que baixar a lista inteira de vendas, gastando bem menos do banco.
 */
export function useSaleAlerts({
  enabled,
  onNewSales,
}: {
  enabled: boolean;
  onNewSales: (sales: SaleAlert[]) => void;
}) {
  const utils = trpc.useUtils();
  const onNewSalesRef = useRef(onNewSales);
  onNewSalesRef.current = onNewSales;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastId: number | null = readLastSeen();

    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(tick, POLL_MS);
    };

    const tick = async () => {
      if (cancelled || running) return;
      if (typeof document !== "undefined" && document.hidden) {
        schedule();
        return;
      }
      running = true;
      try {
        // staleTime 0: o cache global do app guarda respostas por 3 minutos, e aqui a graça é
        // justamente perguntar de novo a cada vez.
        const res = await utils.support.saleAlerts.fetch(
          { afterId: lastId ?? undefined },
          { staleTime: 0 }
        );
        if (cancelled) return;
        if (lastId === null) {
          // Primeira vez neste navegador: só marca o ponto de partida, sem avisar de venda antiga.
          lastId = res.latestId;
          storeLastSeen(lastId);
        } else if (res.sales.length > 0) {
          lastId = res.latestId;
          storeLastSeen(lastId);
          onNewSalesRef.current(res.sales as SaleAlert[]);
        }
      } catch (err: any) {
        const code = err?.data?.code;
        if (code === "FORBIDDEN" || code === "UNAUTHORIZED") {
          // Conta sem permissão pra este aviso: para de perguntar em vez de errar a cada 25s.
          cancelled = true;
          return;
        }
        console.warn("[SaleAlerts] Falha ao checar vendas novas (tenta de novo):", err?.message || err);
      } finally {
        running = false;
        schedule();
      }
    };

    const onVisible = () => {
      if (document.hidden || cancelled) return;
      if (timer) clearTimeout(timer);
      tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, utils]);
}

/**
 * Mostra o aviso (som + pop-up + toast) de vendas novas. Se entraram várias de uma vez —
 * normalmente porque o painel ficou fechado um tempo — mostra um aviso só, resumido, em vez de
 * disparar vários sons seguidos.
 */
export function announceNewSales(
  sales: SaleAlert[],
  opts: { playSound: boolean; onAction?: () => void; onClickUrl?: string }
) {
  if (sales.length === 0) return;
  if (sales.length > SUMMARY_THRESHOLD) {
    notifyAdmin({
      title: `🛒 ${sales.length}${sales.length >= 20 ? "+" : ""} vendas novas`,
      body: "Entraram desde a última vez que você abriu o painel.",
      tag: "sale_summary",
      onClickUrl: opts.onClickUrl,
      actionLabel: "Ver",
      onAction: opts.onAction,
      playSound: opts.playSound,
    });
    return;
  }
  sales.forEach((s) => {
    notifyAdmin({
      title: `🛒 Nova venda #${s.id}`,
      body: `${s.buyerName} • ${s.productName}`,
      tag: `sale_${s.id}`,
      onClickUrl: opts.onClickUrl,
      actionLabel: "Ver",
      onAction: opts.onAction,
      playSound: opts.playSound,
    });
  });
}
