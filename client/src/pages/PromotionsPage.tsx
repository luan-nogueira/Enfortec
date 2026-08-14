import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import UserProfileButton from "@/components/UserProfileButton";
import { ArrowLeft, Flame, Gamepad2, Gift, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";

export default function PromotionsPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<"jogo" | "gift_card_playstation" | "gift_card_xbox">("jogo");
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to real-time promotions
    const q = query(
      collection(db, "promocoes"),
      where("isActive", "==", true),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPromotions(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao escutar promoções:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredPromotions = promotions.filter(
    (p) => p.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-950/20 via-slate-950 to-slate-950 border-b border-red-600/20">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-white hover:text-red-300 px-1.5 sm:px-2 shrink-0 h-8 sm:h-9"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">Voltar</span>
              </Button>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <Flame className="w-4 h-4 sm:w-6 sm:h-6 text-red-500 animate-pulse shrink-0" />
                <h1 className="text-xs sm:text-2xl md:text-3xl font-black text-neon tracking-tight uppercase truncate">
                  Promoções Imperdíveis
                </h1>
              </div>
            </div>
            {isAuthenticated && (
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-slate-300 hover:text-white hover:bg-slate-900/40 flex items-center gap-1 px-2 sm:px-3 h-8 sm:h-9"
                  onClick={() => navigate("/fortecoins")}
                >
                  <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold whitespace-nowrap">{user?.forteCoins ?? 0} FC</span>
                </Button>
                <div className="shrink-0">
                  <UserProfileButton />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="bg-slate-900/40 border-b border-red-600/10 py-4">
        <div className="container mx-auto px-4 flex justify-center gap-3 flex-wrap">
          <button
            onClick={() => setSelectedCategory("jogo")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 border uppercase tracking-wider ${
              selectedCategory === "jogo"
                ? "bg-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                : "bg-slate-950 text-slate-400 hover:bg-slate-900 border-slate-800"
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            Jogos
          </button>
          <button
            onClick={() => setSelectedCategory("gift_card_playstation")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 border uppercase tracking-wider ${
              selectedCategory === "gift_card_playstation"
                ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                : "bg-slate-950 text-slate-400 hover:bg-slate-900 border-slate-800"
            }`}
          >
            <Gift className="w-4 h-4" />
            Gift Card PlayStation
          </button>
          <button
            onClick={() => setSelectedCategory("gift_card_xbox")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 border uppercase tracking-wider ${
              selectedCategory === "gift_card_xbox"
                ? "bg-green-600 text-white border-green-500 shadow-[0_0_15px_rgba(22,163,74,0.3)]"
                : "bg-slate-950 text-slate-400 hover:bg-slate-900 border-slate-800"
            }`}
          >
            <Gift className="w-4 h-4" />
            Gift Card Xbox
          </button>
        </div>
      </div>

      {/* Main Promotions Grid */}
      <div className="container mx-auto px-4 py-12 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-neon bg-slate-900/60 rounded-2xl h-80 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/20 border border-slate-800 rounded-2xl p-8 max-w-xl mx-auto card-neon">
            <Flame className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Sem Promoções Ativas</h3>
            <p className="text-slate-400 text-sm">
              Não há ofertas disponíveis nesta categoria no momento. Volte mais tarde para conferir as novidades!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPromotions.map((promo) => (
              <div
                key={promo.id}
                className="card-neon bg-slate-900 border border-red-600/10 rounded-2xl overflow-hidden flex flex-col justify-between hover:-translate-y-1.5 hover:shadow-[0_0_20px_rgba(220,38,38,0.25)] hover:border-red-500/50 transition-all duration-300"
              >
                <div className="relative h-48 bg-slate-950 overflow-hidden border-b border-slate-800">
                  {promo.imageUrl ? (
                    <img
                      src={promo.imageUrl}
                      alt={promo.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-900">
                      <Flame className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] bg-gradient-to-r from-red-600 to-red-500 border border-red-400/20 text-white font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-lg">
                      Oferta
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                      {promo.title}
                    </h3>
                    <p className="text-slate-400 text-xs line-clamp-3 mb-4 leading-relaxed">
                      {promo.description}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-baseline gap-2">
                      {promo.oldPrice && (
                        <span className="text-slate-500 line-through text-sm">
                          R$ {parseFloat(promo.oldPrice).toFixed(2).replace(".", ",")}
                        </span>
                      )}
                      <span className="text-2xl font-black text-red-500">
                        R$ {parseFloat(promo.price).toFixed(2).replace(".", ",")}
                      </span>
                    </div>

                    <Button
                      onClick={() => {
                        if (promo.link) {
                          if (promo.link.startsWith("http")) {
                            window.open(promo.link, "_blank");
                          } else {
                            navigate(promo.link);
                          }
                        } else {
                          // Whatsapp redirect default helper
                          const msg = encodeURIComponent(
                            `Olá! Vi a promoção "${promo.title}" por R$ ${parseFloat(promo.price).toFixed(2).replace(".", ",")} no site. Gostaria de comprar!`
                          );
                          window.open(`https://wa.me/554384253691?text=${msg}`, "_blank");
                        }
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11 text-sm btn-neon uppercase tracking-wider rounded-xl"
                    >
                      Aproveitar Oferta
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
