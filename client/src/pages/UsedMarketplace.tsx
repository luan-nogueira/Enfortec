import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Star, ShoppingCart, ArrowLeft, Flame, User, Check, Package, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
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
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [useCoins, setUseCoins] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      setCustomerName(user?.name || "");
      setCustomerEmail(user?.email || "");
      setCustomerPhone(localStorage.getItem("customerPhone") || "");
      setUseCoins(false);
    }
  }, [selectedProduct, user]);

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

  const handleBuyClick = (product: any) => {
    const price = parseFloat(product.pricePS4 || product.pricePS5 || 0);
    if (price === 0) {
      const msg = encodeURIComponent(`Olá! Tenho interesse no jogo USADO: ${product.name} anunciado por ${product.sellerName || "vendedor"}. Como faço para comprar?`);
      window.open(`https://wa.me/5543984253691?text=${msg}`, '_blank');
      return;
    }

    setSelectedProduct(product);
    setCheckoutError(null);
  };

  const handleFinalizePurchase = async () => {
    if (!selectedProduct) return;
    const price = parseFloat(selectedProduct.pricePS4 || selectedProduct.pricePS5 || 0);

    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setCheckoutError("Por favor, preencha todos os dados de contato (Nome, E-mail e WhatsApp).");
      return;
    }

    setIsProcessingCheckout(true);
    setCheckoutError(null);

    const coinsToUse = useCoins ? Math.min(user?.forteCoins || 0, Math.ceil(price * 10)) : 0;
    let coinsDeducted = false;

    try {
      // 1. Débito imediato de moedas no Firestore para segurança
      if (coinsToUse > 0 && user?.id) {
        const userRef = doc(db, "users", user.id);
        const userSnap = await getDoc(userRef);
        const currentCoins = userSnap.data()?.forteCoins ?? 0;
        
        if (currentCoins < coinsToUse) {
          setCheckoutError("Saldo de ForteCoins insuficiente.");
          setIsProcessingCheckout(false);
          return;
        }

        await updateDoc(userRef, {
          forteCoins: currentCoins - coinsToUse,
          pendingRefund: {
            coins: coinsToUse,
            expiresAt: Date.now() + 15 * 60 * 1000 // expira em 15 minutos
          }
        });
        coinsDeducted = true;
      }

      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const formattedPhone = customerPhone.startsWith("+") 
        ? customerPhone 
        : `+55${customerPhone.replace(/\D/g, "")}`;

      const response = await fetch("/api/infinitepay/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: `${selectedProduct.name} (Usado)`,
          price: price,
          redirectUrl: `${window.location.origin}/minhas-compras`,
          productType: "used",
          productId: selectedProduct.id,
          sellerId: selectedProduct.sellerId || null,
          coinsToUse: coinsToUse,
          customer: {
            name: customerName,
            email: customerEmail,
            phone_number: formattedPhone
          }
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Salva telefone no localStorage para compras futuras
        localStorage.setItem("customerPhone", customerPhone);

        if (data.url) {
          window.open(data.url, "_blank");
        } else if (data.paidWithCoins) {
          // Compra 100% paga com moedas
          if (user?.id) {
            const userRef = doc(db, "users", user.id);
            await updateDoc(userRef, {
              pendingRefund: null
            });
          }
          toast.success("Compra efetuada com sucesso usando ForteCoins!");
          navigate("/minhas-compras");
        }
        setSelectedProduct(null);
      } else {
        const errorMsg = data.error || "Erro ao gerar link de pagamento. Tente novamente.";
        console.error("[Checkout] Erro da API:", errorMsg);
        setCheckoutError(errorMsg);

        // Estorna moedas em caso de erro da API
        if (coinsDeducted && user?.id) {
          const userRef = doc(db, "users", user.id);
          const userSnap = await getDoc(userRef);
          const currentCoins = userSnap.data()?.forteCoins ?? 0;
          await updateDoc(userRef, {
            forteCoins: currentCoins + coinsToUse,
            pendingRefund: null
          });
          coinsDeducted = false;
        }
      }
    } catch (error: any) {
      // Estorna moedas em caso de falha de rede
      if (coinsDeducted && user?.id) {
        try {
          const userRef = doc(db, "users", user.id);
          const userSnap = await getDoc(userRef);
          const currentCoins = userSnap.data()?.forteCoins ?? 0;
          await updateDoc(userRef, {
            forteCoins: currentCoins + coinsToUse,
            pendingRefund: null
          });
        } catch (refundErr) {
          console.error("[Checkout] Erro ao estornar moedas:", refundErr);
        }
      }

      // Só vai para WhatsApp se for erro de rede (servidor offline)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        const msg = encodeURIComponent(`Olá! Tenho interesse no jogo USADO: ${selectedProduct.name} anunciado por ${selectedProduct.sellerName || "vendedor"}. Ainda está disponível?`);
        window.open(`https://wa.me/5543984253691?text=${msg}`, '_blank');
        setSelectedProduct(null);
      } else {
        setCheckoutError(error.message || "Erro desconhecido ao processar pagamento.");
      }
    } finally {
      setIsProcessingCheckout(false);
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

  const price = selectedProduct ? parseFloat(selectedProduct.pricePS4 || selectedProduct.pricePS5 || 0) : 0;
  const coinsToUseVal = useCoins ? Math.min(user?.forteCoins || 0, Math.ceil(price * 10)) : 0;
  const coinDiscount = coinsToUseVal * 0.10;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-red-600/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 sm:py-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/")}
                className="text-slate-300 hover:text-red-500 px-2"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                <h1 className="text-base sm:text-3xl font-bold text-neon">Marketplace de Usados</h1>
              </div>
            </div>
            {isAuthenticated && (
              <Button 
                variant="ghost" 
                className="text-slate-300 hover:text-white hover:bg-slate-900 flex items-center gap-1.5 px-2 sm:px-4"
                onClick={() => navigate("/fortecoins")}
              >
                <Coins className="w-4 h-4 text-red-500" />
                <span className="text-sm">{user?.forteCoins ?? 0} FC</span>
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 sm:w-5 sm:h-5 text-red-500/50" />
              <Input
                placeholder="Buscar produtos usados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 sm:pl-10 bg-slate-900 border-red-600/30 text-white placeholder:text-slate-500 h-10"
              />
            </div>
            {isAuthenticated && (
              <Button onClick={() => navigate("/vendedor")} className="bg-red-600 hover:bg-red-700 text-white font-black btn-neon text-xs sm:text-sm h-10">
                <Package className="w-4 h-4 mr-1.5" />
                Vender meu Produto
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 border-b border-red-600/20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCondition(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
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
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
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
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12 pb-24 lg:pb-12">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">Carregando produtos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group relative bg-slate-900/40 rounded-2xl sm:rounded-3xl border border-red-600/10 overflow-hidden hover:border-red-600/40 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(220,38,38,0.15)] flex flex-col h-full"
              >
                {/* Image Section */}
                <div className="relative h-32 sm:h-48 overflow-hidden bg-slate-950">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-800">
                      <ShoppingCart className="w-10 h-10 sm:w-16 sm:h-16" />
                    </div>
                  )}
                  
                  {/* Badge */}
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
                    <span className="bg-red-600 text-white text-[8px] sm:text-[10px] px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-full font-black uppercase tracking-wider shadow-xl border border-white/10">
                      USADO
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-16 sm:h-24 bg-gradient-to-t from-slate-950 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-3 sm:p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm sm:text-xl font-black text-white line-clamp-2 sm:line-clamp-1 mb-0.5 sm:mb-1">{product.name}</h3>
                    <p className="text-slate-500 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest">{product.category || "JOGO USADO"}</p>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 my-3 sm:my-6 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-950/50 border border-red-600/5">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Vendido por:</span>
                      <span className="text-[10px] sm:text-xs font-black text-white line-clamp-1">{product.sellerName || "Usuário Verificado"}</span>
                    </div>
                  </div>

                  <div className="mt-auto space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-base sm:text-2xl font-black text-red-500 tracking-tighter">
                          R$ {parseFloat(product.pricePS4 || product.pricePS5 || 0).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold italic">Valor Unitário</span>
                      </div>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded-full bg-green-500/10 text-green-500 text-[8px] sm:text-[10px] font-black uppercase tracking-wider border border-green-500/20">
                        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" strokeWidth={4} />
                        <span className="hidden sm:inline">Disponível</span>
                        <span className="sm:hidden">Sim</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 sm:gap-2">
                      <Button 
                        onClick={() => handleBuyClick(product)}
                        disabled={isProcessingCheckout && selectedProduct?.id === product.id}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-lg h-10 sm:h-12 rounded-xl sm:rounded-2xl transition-all active:scale-95 shadow-lg border-b-2 sm:border-b-4 border-red-800 flex items-center justify-center gap-1.5 sm:gap-3"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 sm:w-5 sm:h-5" strokeWidth={3} />
                        {(isProcessingCheckout && selectedProduct?.id === product.id) ? "..." : "Comprar"}
                      </Button>
                      {selectedProduct?.id === product.id && checkoutError && (
                        <p className="text-red-400 text-[10px] text-center">⚠️ {checkoutError}</p>
                      )}
                      {parseFloat(product.pricePS4 || product.pricePS5 || 0) > 0 && (
                        <Button
                          onClick={() => handleBargainClick(product)}
                          className="w-full bg-slate-900 border border-red-600/30 hover:border-red-600/60 text-red-500 font-bold text-[10px] sm:text-xs h-10 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1"
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

      {/* Modal de Confirmação de Compra */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white sm:max-w-[425px] card-neon">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-neon flex items-center gap-2">🎮 Confirmar Compra</DialogTitle>
            <DialogDescription className="text-slate-400">
              Preencha os dados de contato e escolha se deseja aplicar ForteCoins.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div className="flex gap-4 items-start mb-6">
              <div className="w-20 h-20 rounded bg-slate-800 overflow-hidden border border-red-600/20">
                <img src={selectedProduct?.imageUrl} alt={selectedProduct?.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-white line-clamp-2">{selectedProduct?.name}</h4>
                <p className="text-xs text-slate-500">{selectedProduct?.category || "Jogo Usado"}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
              <h4 className="font-bold text-sm text-slate-300 flex items-center gap-2">
                <span>📋 Dados para Entrega (WhatsApp/Contato)</span>
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Nome Completo</label>
                  <Input
                    autoComplete="name"
                    placeholder="Ex: João da Silva"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-red-600 h-10"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">E-mail</label>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="Ex: joao@email.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-red-600 h-10"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">WhatsApp / Telefone (com DDD)</label>
                  <Input
                    type="tel"
                    autoComplete="tel"
                    placeholder="Ex: 11999998888"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-red-600 h-10"
                  />
                </div>
              </div>

              {isAuthenticated && user?.forteCoins > 0 && (
                <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3.5 space-y-2.5 mt-4">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useCoins}
                      onChange={(e) => setUseCoins(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm font-bold text-white flex items-center gap-1">
                      <Coins className="w-4 h-4 text-red-500" /> Usar minhas ForteCoins
                    </span>
                  </label>
                  
                  {useCoins && (
                    <div className="text-xs text-slate-300 space-y-1 pl-6">
                      <p>Saldo disponível: <strong className="text-white">{user.forteCoins} FC</strong></p>
                      <p>Desconto a aplicar: <strong className="text-red-500">R$ {coinDiscount.toFixed(2)}</strong> (usando {coinsToUseVal} FC)</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="pt-2">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Subtotal:</span>
                  <span>R$ {price.toFixed(2)}</span>
                </div>
                {useCoins && coinDiscount > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>Desconto ForteCoins:</span>
                    <span>- R$ {coinDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black text-white mt-1 pt-1 border-t border-slate-800">
                  <span>Total Final:</span>
                  <span>R$ {Math.max(0, price - coinDiscount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-3">
            {checkoutError && (
              <div className="w-full bg-red-950/60 border border-red-500/40 rounded-xl px-4 py-3 text-sm text-red-300">
                ⚠️ {checkoutError}
              </div>
            )}
            <Button 
              disabled={isProcessingCheckout}
              onClick={handleFinalizePurchase}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 text-lg btn-neon"
            >
              {isProcessingCheckout ? "Gerando pagamento..." : "Confirmar e Ir para Checkout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
