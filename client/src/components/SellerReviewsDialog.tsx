import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Star, User as UserIcon } from "lucide-react";

interface SellerReviewsDialogProps {
  /** Id da linha em "sellers" (não o id do usuário) — mesmo id usado em product.sellerId. */
  sellerId?: number;
  sellerName?: string;
}

export default function SellerReviewsDialog({ sellerId, sellerName }: SellerReviewsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: reviews, isLoading } = trpc.reviews.getBySellerId.useQuery(sellerId as number, {
    enabled: isOpen && !!sellerId,
  });

  const label = (
    <div className="flex flex-col">
      <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Vendido por:</span>
      <span className="text-[10px] sm:text-xs font-black text-white line-clamp-1">{sellerName || "Usuário Verificado"}</span>
    </div>
  );

  if (!sellerId) return label;

  const avgRating =
    reviews && reviews.length > 0 ? reviews.reduce((acc, r: any) => acc + r.rating, 0) / reviews.length : null;

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="flex flex-col text-left hover:opacity-80 transition-opacity">
        <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Vendido por:</span>
        <span className="text-[10px] sm:text-xs font-black text-white line-clamp-1 underline decoration-dotted decoration-slate-600 underline-offset-2">
          {sellerName || "Usuário Verificado"}
        </span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-red-500" /> {sellerName || "Vendedor"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              {avgRating !== null ? (
                <span className="flex items-center gap-1 text-yellow-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-yellow-400" /> {avgRating.toFixed(1)} ({reviews!.length} avaliaç{reviews!.length === 1 ? "ão" : "ões"})
                </span>
              ) : (
                "Ainda sem avaliações"
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-3">
            {isLoading ? (
              <p className="text-xs text-slate-500 text-center py-6">Carregando avaliações...</p>
            ) : !reviews || reviews.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Esse vendedor ainda não recebeu avaliações.</p>
            ) : (
              reviews.map((r: any) => (
                <div key={r.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{r.buyerName || "Comprador"}</span>
                    <span className="flex items-center gap-0.5 text-yellow-400 text-xs font-bold">
                      <Star className="w-3 h-3 fill-yellow-400" /> {r.rating}
                    </span>
                  </div>
                  {r.comment && <p className="text-xs text-slate-400">{r.comment}</p>}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
