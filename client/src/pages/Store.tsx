import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Search, ShoppingCart, ArrowLeft, Flame, Package, Check, X, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Store() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [chosenVersion, setChosenVersion] = useState<"PS4" | "PS5" | null>(null);

  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "store_products"), orderBy("createdAt", "desc"));
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

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBuyClick = (product: any) => {
    setSelectedProduct(product);
    // Se só tiver um preço, já seleciona a versão automaticamente
    if (product.pricePS4 && !product.pricePS5) setChosenVersion("PS4");
    else if (!product.pricePS4 && product.pricePS5) setChosenVersion("PS5");
    else setChosenVersion(null);
  };

  const handleFinalizePurchase = async () => {
    if (!selectedProduct || !chosenVersion) return;
    
    const price = chosenVersion === "PS4" ? selectedProduct.pricePS4 : selectedProduct.pricePS5;
    
    setIsProcessingCheckout(true);
    try {
      const response = await fetch("/api/infinitepay/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: `${selectedProduct.name} (${chosenVersion})`,
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
      const message = `Olá! Quero comprar o produto: ${selectedProduct.name} (${chosenVersion}) no valor de R$ ${price.toFixed(2)}`;
      const phone = "5543984253691"; // Número atualizado
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    } finally {
      setIsProcessingCheckout(false);
      setSelectedProduct(null);
    }
  };

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
                <h1 className="text-3xl font-bold text-neon">Loja Própria</h1>
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
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-red-500/50" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900 border-red-600/30 text-white placeholder:text-slate-500"
              />
            </div>
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
              <div key={product.id} className="relative bg-slate-950 rounded-[2rem] overflow-hidden border border-red-600/20 shadow-2xl group transition-all hover:border-red-600/50">
                {/* Image Container with Logo Overlay */}
                <div className="relative h-80 overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                      <Package className="w-16 h-16 text-slate-800" />
                    </div>
                  )}
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                  
                  {/* Logo Overlay */}
                  <div className="absolute top-6 left-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    <div className="flex flex-col items-center">
                      <span className="text-white font-black text-2xl tracking-tight leading-none italic uppercase">EFORTE</span>
                      <span className="text-red-600 font-bold text-[8px] tracking-[0.4em] leading-none -mt-0.5 ml-1">GAMES</span>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6 bg-slate-950/40 backdrop-blur-md">
                  <h3 className="text-2xl font-black text-white mb-1 tracking-tight leading-tight line-clamp-1">{product.name}</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
                    {product.category || "JOGO DIGITAL"}
                  </p>
                  
                  <div className="h-[1px] bg-red-600/10 w-full mb-6" />

                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div className="space-y-3">
                        {product.pricePS4 && (
                          <div className="flex items-center gap-3">
                            <div className="bg-[#003791] px-2 py-1 rounded-md flex items-center justify-center w-14 shadow-lg border border-white/10">
                              <span className="text-white text-[10px] font-black italic tracking-tighter">PS4</span>
                            </div>
                            <span className="text-xl font-black text-red-600 tracking-tighter whitespace-nowrap">R$ {product.pricePS4.toFixed(2).replace('.', ',')}</span>
                          </div>
                        )}
                        {product.pricePS5 && (
                          <div className="flex items-center gap-3">
                            <div className="bg-white px-2 py-1 rounded-md flex items-center justify-center w-14 shadow-lg border border-black/10">
                              <span className="text-black text-[10px] font-black italic tracking-tighter">PS5</span>
                            </div>
                            <span className="text-xl font-black text-red-600 tracking-tighter whitespace-nowrap">R$ {product.pricePS5.toFixed(2).replace('.', ',')}</span>
                          </div>
                        )}
                        {!product.pricePS4 && !product.pricePS5 && (
                           <span className="text-lg font-black text-slate-500 italic">Sob Consulta</span>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${product.stock > 0 ? 'border-green-500/30 bg-green-500/10 text-green-500' : 'border-red-500/30 bg-red-500/10 text-red-500'} text-[10px] font-black uppercase tracking-wider`}>
                          {product.stock > 0 ? <Check className="w-3 h-3" strokeWidth={4} /> : <X className="w-3 h-3" strokeWidth={4} />}
                          {product.stock > 0 ? `Estoque: ${product.stock}` : "Esgotado"}
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleBuyClick(product)}
                      disabled={product.stock <= 0}
                      className={`w-full ${product.stock > 0 ? 'bg-red-600 hover:bg-red-700 shadow-[0_8px_20px_rgba(220,38,38,0.3)]' : 'bg-slate-800 cursor-not-allowed opacity-50'} text-white font-black text-xl h-14 rounded-2xl mt-2 transition-all active:scale-[0.95] border-b-4 border-red-800 flex items-center justify-center gap-3 group/btn`}
                    >
                      <ShoppingCart className="w-5 h-5 transition-transform group-hover/btn:scale-110" strokeWidth={3} />
                      {product.stock > 0 ? "Comprar" : "Indisponível"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Seleção de Versão */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white sm:max-w-[425px] card-neon">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-neon">Escolha a Versão</DialogTitle>
            <DialogDescription className="text-slate-400">
              Selecione qual versão do jogo você deseja adquirir.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="flex gap-4 items-start mb-6">
              <div className="w-20 h-20 rounded bg-slate-800 overflow-hidden border border-red-600/20">
                <img src={selectedProduct?.imageUrl} alt={selectedProduct?.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-white line-clamp-2">{selectedProduct?.name}</h4>
                <p className="text-xs text-slate-500">ID: {selectedProduct?.id.substring(0, 8)}</p>
              </div>
            </div>

            <div className="space-y-3">
              {selectedProduct?.pricePS4 && (
                <button
                  onClick={() => setChosenVersion("PS4")}
                  className={`w-full p-4 rounded-xl border transition-all flex justify-between items-center ${
                    chosenVersion === "PS4" 
                    ? "border-red-500 bg-red-500/10" 
                    : "border-slate-700 bg-slate-800 hover:border-red-500/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${chosenVersion === "PS4" ? "border-red-500 bg-red-500" : "border-slate-500"}`}>
                      {chosenVersion === "PS4" && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="font-bold">Versão PS4</span>
                  </div>
                  <span className="text-red-500 font-bold">R$ {selectedProduct.pricePS4.toFixed(2)}</span>
                </button>
              )}

              {selectedProduct?.pricePS5 && (
                <button
                  onClick={() => setChosenVersion("PS5")}
                  className={`w-full p-4 rounded-xl border transition-all flex justify-between items-center ${
                    chosenVersion === "PS5" 
                    ? "border-red-500 bg-red-500/10" 
                    : "border-slate-700 bg-slate-800 hover:border-red-500/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${chosenVersion === "PS5" ? "border-red-500 bg-red-500" : "border-slate-500"}`}>
                      {chosenVersion === "PS5" && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="font-bold">Versão PS5</span>
                  </div>
                  <span className="text-red-500 font-bold">R$ {selectedProduct.pricePS5.toFixed(2)}</span>
                </button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              disabled={!chosenVersion || isProcessingCheckout}
              onClick={handleFinalizePurchase}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 text-lg btn-neon"
            >
              {isProcessingCheckout ? "Gerando pagamento..." : "Confirmar e Ir para Checkout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
