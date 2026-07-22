import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Reviews() {
  const [, navigate] = useLocation();
  const { data: reviews, isLoading } = trpc.reviews.getRecent.useQuery();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-slate-950 border-b border-red-600/20">
        <div className="container mx-auto px-4 py-6 sm:py-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-white hover:text-red-300 px-2"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Voltar</span>
            </Button>
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
              <h1 className="text-2xl sm:text-4xl font-bold text-neon">Avaliações</h1>
            </div>
          </div>
          <p className="text-slate-400 mt-4 max-w-2xl text-sm sm:text-base">
            Veja o que nossos clientes estão achando dos jogos e da experiência de compra na Enfortec.
          </p>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-neon p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full skeleton-shimmer" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 skeleton-shimmer rounded w-1/2" />
                    <div className="h-3 skeleton-shimmer rounded w-1/3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 skeleton-shimmer rounded w-full" />
                  <div className="h-3 skeleton-shimmer rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : !reviews || reviews.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-slate-800">
            <MessageSquare className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhuma avaliação ainda</h3>
            <p className="text-slate-400">Seja o primeiro a avaliar uma compra!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {reviews.map((review: any) => (
              <div key={review.id} className="card-neon p-5 flex flex-col h-full bg-slate-900/80 hover:bg-slate-800 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-red-500 font-bold text-sm uppercase">
                      {review.buyerName?.charAt(0) || "C"}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">
                        {review.buyerName || "Cliente Oculto"}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {format(new Date(review.createdAt), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          review.rating >= star
                            ? "text-yellow-500 fill-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]"
                            : "text-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="mb-3 flex-1">
                  <p className="text-slate-300 text-sm font-medium italic">
                    "{review.comment ? review.comment : "Ótima compra!"}"
                  </p>
                </div>

                <div className="mt-auto pt-3 border-t border-slate-800/50">
                  <p className="text-xs text-slate-400 line-clamp-1">
                    <span className="text-slate-500">Produto:</span> <span className="font-semibold text-slate-300">{review.productName}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
