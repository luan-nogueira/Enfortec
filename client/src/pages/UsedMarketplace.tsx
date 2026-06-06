import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Star, ShoppingCart, ArrowLeft, Flame, User, Check, Package, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function UsedMarketplace() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutProductId, setCheckoutProductId] = useState<string | null>(null);

  const [selectedBargainProduct, setSelectedBargainProduct] = useState<any | null>(null);
  const [bargainOffer, setBargainOffer] = useState("");

  const handleBargainClick = (product: any) => {
    setSelectedBargainProduct(product);
    setBargainOffer("");
  };

  const handleFinalizeBargain = () => {
    if (!selectedBargainProduct || !bargainOffer.trim()) return;
    const price = parseFloat(selectedBargainProduct.pricePS4 || selectedBargainProduct.pricePS5 || 0);
    const message = `Olá! Tenho interesse no produto usado: ${selectedBargainProduct.name} anunciado por ${selectedBargainProduct.sellerName || "vendedor"} (Preço original: R$ ${price.toFixed(2).replace('.', ',')}). Gostaria de pechinchar: você fecharia por R$ ${parseFloat(bargainOffer).toFixed(2).replace('.', ',')}?`;
    const phone = "5543984253691";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    setSelectedBargainProduct(null);
  };

  const handleBuyClick = async (product: any) => {
    const price = parseFloat(product.pricePS4 || product.pricePS5 || 0);
    if (price === 0) {
      const msg = encodeURIComponent(`Olá! Tenho interesse no jogo USADO: ${product.name} anunciado por ${product.sellerName || "vendedor"}. Como faço para comprar?`);
      window.open(`https://wa.me/5543984253691?text=${msg}`, '_blank');
      return;
    }

    setCheckoutProductId(product.id);
    try {
      const response = await fetch("/api/infinitepay/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: `${product.name} (Usado)`,
          price: price,
          redirectUrl: `${window.location.origin}/minhas-compras`
        })
      });

      const data = await response.json();
      if (response.ok && data.success && data.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error(data.error || "Erro ao gerar link de pagamento");
      }
    } catch (error) {
      console.warn("[Checkout] Fallback para WhatsApp devido a erro:", error);
      const msg = encodeURIComponent(`Olá! Tenho interesse no jogo USADO: ${product.name} anunciado por ${product.sellerName || "vendedor"}. Ainda está disponível?`);
      window.open(`https://wa.me/5543984253691?text=${msg}`, '_blank');
    } finally {
      setCheckoutProductId(null);
    }
  };
  
  useEffect(() => {
    const q = query(collection(db, "used_products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCondition = !selectedCondition || p.condition === selectedCondition;
    return matchesSearch && matchesCondition;
  });

  const conditions = [
    { value: "novo", label: "Novo" },
    { value: "como_novo", label: "Como Novo" },
    { value: "bom", label: "Bom" },
    { value: "aceitavel", label: "Aceitável" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-red-600/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/")}
                className="text-slate-300 hover:text-red-500"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center gap-2">
                <Flame className="w-6 h-6 text-red-500" />
                <h1 className="text-3xl font-bold text-neon">Marketplace de Usados</h1>
              </div>
            </div>
            {isAuthenticated && (
              <Button 
                variant="ghost" 
                className="text-slate-300 hover:text-white hover:bg-slate-900 flex items-center gap-2"
                onClick={() => navigate("/fortecoins")}
              >
                <Coins className="w-4 h-4 text-red-500" />
                <span>{user?.forteCoins ?? 0} FC</span>
              </Button>
            )}
          </div>
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-red-500/50" />
              <Input
                placeholder="Buscar produtos usados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900 border-red-600/30 text-white placeholder:text-slate-500"
              />
            </div>
            {isAuthenticated && (
              <Button onClick={() => navigate("/vendedor")} className="bg-red-600 hover:bg-red-700 text-white font-black btn-neon">
                <Package className="w-5 h-5 mr-2" />
                Vender meu Produto
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 border-b border-red-600/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCondition(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedCondition === null
                  ? "bg-red-600 text-white neon-glow"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-red-600/20"
              }`}
            >
              Todos
            </button>
            {conditions.map(condition => (
              <button
                key={condition.value}
                onClick={() => setSelectedCondition(condition.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedCondition === condition.value
                    ? "bg-red-600 text-white neon-glow"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-red-600/20"
                }`}
              >
                {condition.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">Carregando produtos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group relative bg-slate-900/40 rounded-3xl border border-red-600/10 overflow-hidden hover:border-red-600/40 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(220,38,38,0.15)] flex flex-col h-full"
              >
                {/* Image Section */}
                <div className="relative h-48 overflow-hidden bg-slate-950">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-800">
                      <ShoppingCart className="w-16 h-16" />
                    </div>
                  )}
                  
                  {/* Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-red-600 text-white text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-wider shadow-xl border border-white/10">
                      USADO
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-xl font-black text-white line-clamp-1 mb-1">{product.name}</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{product.category || "JOGO USADO"}</p>
                  </div>

                  <div className="flex items-center gap-2 mb-6 p-2 rounded-xl bg-slate-950/50 border border-red-600/5">
                    <div className="w-8 h-8 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20">
                      <User className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Vendido por:</span>
                      <span className="text-xs font-black text-white">{product.sellerName || "Usuário Verificado"}</span>
                    </div>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-2xl font-black text-red-500 tracking-tighter">
                          R$ {parseFloat(product.pricePS4 || product.pricePS5 || 0).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold italic">Valor Unitário</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-wider border border-green-500/20">
                        <Check className="w-3 h-3" strokeWidth={4} />
                        Disponível
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button 
                        onClick={() => handleBuyClick(product)}
                        disabled={checkoutProductId === product.id}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-lg h-12 rounded-2xl transition-all active:scale-95 shadow-lg border-b-4 border-red-800 flex items-center justify-center gap-3"
                      >
                        <ShoppingCart className="w-5 h-5" strokeWidth={3} />
                        {checkoutProductId === product.id ? "Processando..." : "Comprar com Pix/Cartão"}
                      </Button>
                      {parseFloat(product.pricePS4 || product.pricePS5 || 0) > 0 && (
                        <Button
                          onClick={() => handleBargainClick(product)}
                          className="w-full bg-slate-900 border border-red-600/30 hover:border-red-600/60 text-red-500 font-bold text-xs h-12 rounded-2xl flex items-center justify-center gap-1.5"
                        >
                          💸 Pechinchar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Pechincha */}
      <Dialog open={!!selectedBargainProduct} onOpenChange={(open) => !open && setSelectedBargainProduct(null)}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white sm:max-w-[425px] card-neon">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-neon flex items-center gap-2">💸 Fazer uma Pechincha</DialogTitle>
            <DialogDescription className="text-slate-400">
              Proponha sua oferta para este desapego. Se aprovado, fechamos o negócio!
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="flex gap-4 items-start mb-6">
              <div className="w-20 h-20 rounded bg-slate-800 overflow-hidden border border-red-600/20">
                <img src={selectedBargainProduct?.imageUrl} alt={selectedBargainProduct?.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-white line-clamp-2">{selectedBargainProduct?.name}</h4>
                <p className="text-xs text-slate-500">
                  Preço original: R$ {selectedBargainProduct ? parseFloat(selectedBargainProduct.pricePS4 || selectedBargainProduct.pricePS5 || 0).toFixed(2).replace('.', ',') : "0,00"}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm font-bold text-slate-300">Sua Oferta de Valor (R$)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 50.00"
                value={bargainOffer}
                onChange={(e) => setBargainOffer(e.target.value)}
                className="bg-slate-950 border-red-600/20 text-white focus-visible:ring-red-600 h-12 rounded-xl text-base"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              disabled={!bargainOffer.trim()}
              onClick={handleFinalizeBargain}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-lg rounded-xl shadow-lg shadow-green-600/20"
            >
              Enviar Proposta de Pechincha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
