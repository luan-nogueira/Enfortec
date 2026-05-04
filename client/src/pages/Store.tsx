import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Search, ShoppingCart, ArrowLeft, Flame, Package } from "lucide-react";
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
import { Check } from "lucide-react";

export default function Store() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [chosenVersion, setChosenVersion] = useState<"PS4" | "PS5" | null>(null);

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

  const handleFinalizePurchase = () => {
    if (!selectedProduct || !chosenVersion) return;
    
    const price = chosenVersion === "PS4" ? selectedProduct.pricePS4 : selectedProduct.pricePS5;
    const message = `Olá! Quero comprar o produto: ${selectedProduct.name} (${chosenVersion}) no valor de R$ ${price.toFixed(2)}`;
    const phone = "5543984253691"; // Número atualizado
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-red-600/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
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
              <div key={product.id} className="card-neon p-0 overflow-hidden hover:scale-105 transition-transform cursor-pointer border-red-600/30">
                <div className="bg-slate-900 border-b border-red-600/20 h-48 flex items-center justify-center">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-12 h-12 text-slate-600" />
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{product.name}</h3>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2 min-h-[40px]">{product.description}</p>
                  
                  <div className="flex justify-between items-center mb-4 min-h-[48px]">
                    <div className="flex flex-col text-red-500 font-bold">
                      {product.pricePS4 ? <span>PS4: R$ {product.pricePS4.toFixed(2)}</span> : null}
                      {product.pricePS5 ? <span>PS5: R$ {product.pricePS5.toFixed(2)}</span> : null}
                      {!product.pricePS4 && !product.pricePS5 && <span>Sob Consulta</span>}
                    </div>
                    <span className="text-xs bg-red-600/20 text-red-400 px-2 py-1 rounded">
                      Em estoque
                    </span>
                  </div>
                  <Button 
                    onClick={() => handleBuyClick(product)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold btn-neon"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Comprar
                  </Button>
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
              disabled={!chosenVersion}
              onClick={handleFinalizePurchase}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 text-lg btn-neon"
            >
              Confirmar e Ir para Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
