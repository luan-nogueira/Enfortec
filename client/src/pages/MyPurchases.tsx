import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import SellerChatDialog from "@/components/SellerChatDialog";
import SellerChatsPanel from "@/components/SellerChatsPanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Package, Star, AlertCircle, MessageCircle, Clock, Zap } from "lucide-react";
import { getStoreStatus } from "@/lib/storeHours";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect } from "react";

type DeliveryHelpVideo = { title: string; url: string; platform: "ps4" | "ps5" | "ambos" };

/**
 * Detecta a plataforma do pedido (nome do produto costuma ter "(PS4)"/"(PS5)" quando o
 * comprador escolheu console num jogo PS4/PS5, ver resolvedConsoleType em payment.ts;
 * senão cai pro platform cadastrado no próprio jogo) e filtra só os materiais de ajuda
 * relevantes: os marcados "ambos" sempre aparecem, os de PS4/PS5 só quando batem.
 */
function getRelevantHelpVideos(videos: DeliveryHelpVideo[] | null | undefined, order: any): DeliveryHelpVideo[] {
  if (!videos || videos.length === 0) return [];

  const name = (order?.productName || "").toUpperCase();
  let platform: "ps4" | "ps5" | null = null;
  if (name.includes("(PS5)") || name.includes("- PS5")) platform = "ps5";
  else if (name.includes("(PS4)") || name.includes("- PS4")) platform = "ps4";
  else {
    const raw = (order?.digitalProductPlatform || "").toUpperCase();
    if (raw === "PS5") platform = "ps5";
    else if (raw === "PS4") platform = "ps4";
  }

  return videos.filter((v) => v.platform === "ambos" || v.platform === platform);
}

export default function MyPurchases() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: orders, isLoading, refetch } = trpc.orders.getByBuyerId.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: platformSettings } = trpc.settings.get.useQuery();

  useEffect(() => {
    if (user?.pendingRefund && orders && orders.length > 0) {
      // Se há um pedido pago, enviado ou entregue, limpa o pendingRefund
      const hasPaidOrder = orders.some(
        (o: any) => o.status === "pago" || o.status === "enviado" || o.status === "entregue"
      );
      if (hasPaidOrder) {
        const userRef = doc(db, "users", user.id);
        updateDoc(userRef, {
          pendingRefund: null
        }).catch(err => console.error("Erro ao limpar pendingRefund:", err));
      }
    }
  }, [user, orders]);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");

  const selectedOrder = (orders as any[] | undefined)?.find((o: any) => o.id === selectedOrderId);
  const selectedOrderHasSeller = !!selectedOrder?.sellerId;

  const confirmMutation = trpc.orders.confirmAndReview.useMutation({
    onSuccess: () => {
      toast.success(
        selectedOrderHasSeller
          ? "Recebimento confirmado! O vendedor foi avaliado e o pagamento foi liberado com sucesso."
          : "Obrigado pela avaliação!"
      );
      refetch();
      setReviewModalOpen(false);
      setSelectedOrderId(null);
      setRating(5);
      setComment("");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao confirmar recebimento");
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Verificando autenticação...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  const handleOpenReview = (orderId: number) => {
    setSelectedOrderId(orderId);
    setRating(5);
    setComment("");
    setReviewModalOpen(true);
  };

  const submitReview = () => {
    if (!selectedOrderId) return;
    confirmMutation.mutate({
      orderId: selectedOrderId,
      rating,
      comment,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 pt-24 pb-28 lg:pb-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-red-500" />
            Minhas Compras
          </h1>
          <Button variant="outline" onClick={() => navigate("/")} className="border-red-700/50 text-red-500 hover:bg-red-950">
            Voltar
          </Button>
        </div>

        {/* Banner de Horário de Atendimento da Loja */}
        {(() => {
          const storeStatus = getStoreStatus();
          if (storeStatus.isOpen) return null;
          return (
            <div className="mb-6 p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl flex items-start gap-3 shadow-lg">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-sm font-black text-amber-400 uppercase tracking-wider">Aviso de Horário de Atendimento</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  A loja encerrou o atendimento de hoje (<strong>Horário de Funcionamento: Segunda a Sábado até 22:00 / Domingos até 16:00</strong>).
                  As mídias digitais compradas fora do horário serão entregues {storeStatus.nextOpeningText} assim que a loja abrir!
                </p>
              </div>
            </div>
          );
        })()}

        {isLoading ? (
          <div className="text-center text-slate-400 py-12">Carregando suas compras...</div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800">
            <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhuma compra encontrada</h3>
            <p className="text-slate-400 mb-6">Você ainda não realizou nenhuma compra na plataforma.</p>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => navigate("/")}>
              Explorar Anúncios
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-red-900/50">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-slate-500">#{order.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider
                      ${order.status === 'pendente' ? 'bg-yellow-500/10 text-yellow-500' :
                        order.status === 'pago' ? 'bg-blue-500/10 text-blue-500' :
                        order.status === 'enviado' ? 'bg-purple-500/10 text-purple-500' :
                        order.status === 'entregue' ? 'bg-green-500/10 text-green-500' :
                        'bg-red-500/10 text-red-500'}`}>
                      {order.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {order.productName || (
                      order.productType === 'store' ? 'Produto da Loja' :
                      order.productType === 'digital' ? 'Produto Digital' : 'Produto Usado'
                    )}
                  </h3>
                  <p className="text-slate-400 text-sm">Comprado em {new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                  
                  {(order.status === 'enviado' || order.status === 'entregue') && order.deliveryDetails && (
                    <div className="mt-4 p-4 bg-red-950/20 border border-red-500/20 rounded-lg max-w-xl">
                      <p className="text-xs font-black text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span>🗝️ Dados de Acesso / Instruções:</span>
                      </p>
                      <pre className="text-slate-200 text-xs font-mono whitespace-pre-wrap select-all bg-slate-950/40 p-2.5 rounded border border-red-950/40">
                        {order.deliveryDetails}
                      </pre>
                      {(() => {
                        const relevantVideos = getRelevantHelpVideos(platformSettings?.deliveryHelpVideos, order);
                        return (relevantVideos.length > 0 || platformSettings?.supportWhatsapp) && (
                        <div className="mt-3 pt-3 border-t border-red-950/40">
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">Deu algum problema pra acessar?</p>
                          <div className="flex flex-wrap gap-2">
                            {relevantVideos.map((video, idx) => (
                              <a
                                key={idx}
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-slate-900 border border-slate-700 hover:border-red-500/50 text-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                              >
                                ▶️ {video.title}
                              </a>
                            ))}
                            {platformSettings?.supportWhatsapp && (
                              <a
                                href={`https://wa.me/${platformSettings.supportWhatsapp}?text=${encodeURIComponent(`Olá! Tive um problema com a conta entregue do pedido #${order.id} (${order.productName || "meu pedido"}). Pode me ajudar?`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                              >
                                💬 Falar no WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                        );
                      })()}
                    </div>
                  )}
                  {/* Retenção/liberação de escrow só existe quando há um vendedor terceiro real —
                      compras do catálogo próprio da Eforte (sellerId nulo) não têm esse conceito:
                      é entregue automaticamente, sem precisar o comprador "liberar" nada. */}
                  {order.sellerId && (order.status === 'pago' || order.status === 'enviado') && (
                    <div className="mt-2 text-xs text-amber-400 font-bold bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <span>🔒 Valor Retido em Segurança pela EforteGames</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
                  <div className="text-xl font-bold text-neon">
                    R$ {Number(order.totalPrice).toFixed(2)}
                  </div>

                  <SellerChatDialog
                    productId={`pedido-${order.id}`}
                    productName={order.productName || "Pedido #" + order.id}
                    sellerId={order.sellerOpenId || undefined}
                    sellerName={order.sellerName || undefined}
                    buttonLabel="Falar sobre o Pedido"
                    buttonClassName="w-full md:w-auto bg-slate-900 border border-green-600/40 hover:border-green-500 text-green-400 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5"
                  />
                  
                  {(order.status === 'pago' || order.status === 'enviado') ? (
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-green-600/20 w-full md:w-auto"
                      onClick={() => handleOpenReview(order.id)}
                      disabled={confirmMutation.isPending}
                    >
                      {order.sellerId ? "⭐ Avaliar Vendedor & Liberar Pagamento" : "⭐ Avaliar Compra"}
                    </Button>
                  ) : order.status === 'entregue' && order.sellerId ? (
                    <div className="flex items-center text-green-500 text-sm font-bold bg-green-950/40 border border-green-800/40 px-3 py-1.5 rounded-lg">
                      <Star className="w-4 h-4 mr-1.5 fill-current" /> Recebido & Valor Liberado
                    </div>
                  ) : order.status === 'entregue' ? (
                    <div className="flex items-center text-green-500 text-sm font-bold bg-green-950/40 border border-green-800/40 px-3 py-1.5 rounded-lg">
                      <Star className="w-4 h-4 mr-1.5 fill-current" /> Avaliado, obrigado!
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Conversas diretas com vendedores */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
            <MessageCircle className="w-5 h-5 text-green-500" />
            Minhas Conversas com Vendedores
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Respostas dos vendedores aos seus contatos por "Falar Vendedor".
          </p>
          <SellerChatsPanel
            role="buyer"
            emptyMessage="Você ainda não iniciou nenhuma conversa com vendedores."
          />
        </div>

        {/* Modal de Avaliação / Escrow */}
        <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Confirmar e Avaliar
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {selectedOrderHasSeller
                  ? "O pagamento só será liberado ao vendedor após você confirmar o recebimento e avaliar a compra."
                  : "Conta pra gente como foi a sua experiência — sua avaliação aparece na página pública de Avaliações."}
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">{selectedOrderHasSeller ? "Sua Nota para o Vendedor" : "Sua Nota"}</label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-10 h-10 ${rating >= star ? 'text-yellow-500 fill-yellow-500' : 'text-slate-700'}`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-300">Deixe um Comentário (Opcional)</label>
                  <span className={`text-xs ${comment.length >= 20 ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                    {comment.length}/20
                  </span>
                </div>
                <Textarea 
                  placeholder="Até 20 caracteres."
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 20))}
                  maxLength={20}
                  className="bg-slate-950 border-slate-800 resize-none h-24"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setReviewModalOpen(false)} className="border-slate-700 hover:bg-slate-800 w-full sm:w-auto">
                Cancelar
              </Button>
              <Button 
                onClick={submitReview} 
                disabled={confirmMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              >
                {confirmMutation.isPending ? "Confirmando..." : selectedOrderHasSeller ? "Confirmar e Liberar Pagamento" : "Enviar Avaliação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
