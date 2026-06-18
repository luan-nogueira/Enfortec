import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, getDoc, updateDoc } from "firebase/firestore";
import { Search, ShoppingCart, ArrowLeft, Flame, Package, Check, X, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
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
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [chosenVersion, setChosenVersion] = useState<"PS4" | "PS5" | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [useCoins, setUseCoins] = useState(false);

  // Estados para cupons no checkout
  const [couponCode, setCouponCode] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const validateCouponMutation = trpc.coupons.validate.useMutation();

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError(null);
    setIsValidatingCoupon(true);
    try {
      const res = await validateCouponMutation.mutateAsync({ code: couponCode });
      setDiscountPercentage(res.discountPercentage);
      setAppliedCoupon(res.code);
      toast.success(`Cupom ${res.code} aplicado com sucesso!`);
    } catch (err: any) {
      setCouponError(err.message || "Cupom inválido.");
      setDiscountPercentage(0);
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      setCustomerName(user?.name || "");
      setCustomerEmail(user?.email || "");
      setCustomerPhone(localStorage.getItem("customerPhone") || "");
      setUseCoins(false);
      setCouponCode("");
      setDiscountPercentage(0);
      setAppliedCoupon(null);
      setCouponError(null);
    }
  }, [selectedProduct, user]);

  const [selectedBargainProduct, setSelectedBargainProduct] = useState<any | null>(null);
  const [chosenBargainVersion, setChosenBargainVersion] = useState<"PS4" | "PS5" | null>(null);
  const [bargainOffer, setBargainOffer] = useState("");

  const handleBargainClick = (product: any) => {
    setSelectedBargainProduct(product);
    setBargainOffer("");
    if (product.pricePS4 && !product.pricePS5) setChosenBargainVersion("PS4");
    else if (!product.pricePS4 && product.pricePS5) setChosenBargainVersion("PS5");
    else setChosenBargainVersion(null);
  };

  const handleFinalizeBargain = () => {
    if (!selectedBargainProduct || !chosenBargainVersion || !bargainOffer.trim()) return;
    const originalPrice = chosenBargainVersion === "PS4" ? selectedBargainProduct.pricePS4 : selectedBargainProduct.pricePS5;
    const message = `Olá! Tenho interesse no produto: ${selectedBargainProduct.name} (${chosenBargainVersion}) (Preço original: R$ ${originalPrice.toFixed(2)}). Gostaria de pechinchar: você fecharia por R$ ${parseFloat(bargainOffer).toFixed(2)}?`;
    const phone = "5543984253691";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    setSelectedBargainProduct(null);
  };

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
    setCheckoutError(null);
    // Se só tiver um preço, já seleciona a versão automaticamente
    if (product.pricePS4 && !product.pricePS5) setChosenVersion("PS4");
    else if (!product.pricePS4 && product.pricePS5) setChosenVersion("PS5");
    else setChosenVersion(null);
  };

  const handleFinalizePurchase = async () => {
    if (!selectedProduct || !chosenVersion) return;
    
    const price = chosenVersion === "PS4" ? selectedProduct.pricePS4 : selectedProduct.pricePS5;
    
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
          name: `${selectedProduct.name} (${chosenVersion})`,
          price: price,
          redirectUrl: `${window.location.origin}/minhas-compras`,
          productType: "store",
          productId: selectedProduct.id,
          sellerId: null,
          coinsToUse: coinsToUse,
          couponCode: appliedCoupon || undefined,
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
        const message = `Olá! Quero comprar o produto: ${selectedProduct.name} (${chosenVersion}) no valor de R$ ${price.toFixed(2)}`;
        const phone = "5543984253691";
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
        setSelectedProduct(null);
      } else {
        setCheckoutError(error.message || "Erro desconhecido ao processar pagamento.");
      }
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const price = chosenVersion 
    ? (chosenVersion === "PS4" ? selectedProduct?.pricePS4 : selectedProduct?.pricePS5) || 0
    : 0;
  const couponDiscount = appliedCoupon ? price * (discountPercentage / 100) : 0;
  const priceAfterCoupon = Math.max(0, price - couponDiscount);
  const coinsToUseVal = useCoins ? Math.min(user?.forteCoins || 0, Math.ceil(priceAfterCoupon * 10)) : 0;
  const coinDiscount = coinsToUseVal * 0.10;
  const finalPriceVal = Math.max(0, priceAfterCoupon - coinDiscount);

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
                <h1 className="text-lg sm:text-3xl font-bold text-neon">Loja Própria</h1>
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
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 sm:w-5 sm:h-5 text-red-500/50" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 sm:pl-10 bg-slate-900 border-red-600/30 text-white placeholder:text-slate-500 h-10"
              />
            </div>
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
              <div key={product.id} className="relative bg-slate-950 rounded-2xl sm:rounded-[2rem] overflow-hidden border border-red-600/20 shadow-2xl group transition-all hover:border-red-600/50 flex flex-col h-full">
                {/* Image Container with Logo Overlay */}
                <div className="relative h-40 sm:h-80 overflow-hidden">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className={`w-full h-full ${product.coverFit === 'contain' ? 'object-contain bg-slate-900/60 p-2' : 'object-cover'} transition-transform duration-700 group-hover:scale-110`} 
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                      <Package className="w-16 h-16 text-slate-800" />
                    </div>
                  )}
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                  
                  {/* Logo Overlay */}
                  <div className="absolute top-3 left-3 sm:top-6 sm:left-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    <div className="flex flex-col items-center">
                      <span className="text-white font-black text-xs sm:text-2xl tracking-tight leading-none italic uppercase">EFORTE</span>
                      <span className="text-red-600 font-bold text-[5px] sm:text-[8px] tracking-[0.4em] leading-none -mt-0.5 ml-0.5 sm:ml-1">GAMES</span>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-3 sm:p-6 bg-slate-950/40 backdrop-blur-md flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm sm:text-2xl font-black text-white mb-0.5 sm:mb-1 tracking-tight leading-tight line-clamp-2 sm:line-clamp-1">{product.name}</h3>
                    <p className="text-slate-500 text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.2em] mb-2 sm:mb-4">
                      {product.category || "JOGO DIGITAL"}
                    </p>
                    
                    <div className="h-[1px] bg-red-600/10 w-full mb-3 sm:mb-6" />
                  </div>

                  <div className="flex flex-col gap-3 sm:gap-4 mt-auto">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2.5">
                      <div className="space-y-1.5 sm:space-y-3">
                        {product.pricePS4 && (
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="bg-[#003791] px-1.5 py-0.5 sm:px-2 sm:py-1 rounded flex items-center justify-center w-10 sm:w-14 shadow-lg border border-white/10">
                              <span className="text-white text-[8px] sm:text-[10px] font-black italic tracking-tighter">PS4</span>
                            </div>
                            <span className="text-sm sm:text-xl font-black text-red-600 tracking-tighter whitespace-nowrap">R$ {product.pricePS4.toFixed(2).replace('.', ',')}</span>
                          </div>
                        )}
                        {product.pricePS5 && (
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="bg-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded flex items-center justify-center w-10 sm:w-14 shadow-lg border border-black/10">
                              <span className="text-black text-[8px] sm:text-[10px] font-black italic tracking-tighter">PS5</span>
                            </div>
                            <span className="text-sm sm:text-xl font-black text-red-600 tracking-tighter whitespace-nowrap">R$ {product.pricePS5.toFixed(2).replace('.', ',')}</span>
                          </div>
                        )}
                        {!product.pricePS4 && !product.pricePS5 && (
                           <span className="text-xs sm:text-lg font-black text-slate-500 italic">Sob Consulta</span>
                        )}
                      </div>

                      <div className="flex flex-col items-start sm:items-end gap-2">
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-full border ${product.stock > 0 ? 'border-green-500/30 bg-green-500/10 text-green-500' : 'border-red-500/30 bg-red-500/10 text-red-500'} text-[8px] sm:text-[10px] font-black uppercase tracking-wider`}>
                          {product.stock > 0 ? <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" strokeWidth={4} /> : <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" strokeWidth={4} />}
                          {product.stock > 0 ? `Estoque: ${product.stock}` : "Esgotado"}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1.5 sm:gap-2">
                      <Button 
                        onClick={() => handleBuyClick(product)}
                        disabled={product.stock <= 0}
                        className={`flex-[2] ${product.stock > 0 ? 'bg-red-600 hover:bg-red-700 shadow-[0_8px_20px_rgba(220,38,38,0.3)]' : 'bg-slate-800 cursor-not-allowed opacity-50'} text-white font-black text-[10px] sm:text-sm h-10 sm:h-12 rounded-lg sm:rounded-xl mt-2 transition-all active:scale-[0.95] border-b-2 sm:border-b-4 border-red-800 flex items-center justify-center gap-1.5 sm:gap-2 group/btn`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover/btn:scale-110" strokeWidth={3} />
                        {product.stock > 0 ? "Comprar" : "Indisponível"}
                      </Button>
                      {product.stock > 0 && (
                        <Button
                          onClick={() => handleBargainClick(product)}
                          className="flex-1 bg-slate-900 border border-red-600/30 hover:border-red-600/60 text-red-500 font-bold text-[10px] sm:text-xs h-10 sm:h-12 rounded-lg sm:rounded-xl mt-2 transition-all active:scale-[0.95] flex items-center justify-center gap-1"
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
              <div className="w-20 h-20 rounded bg-slate-800 overflow-hidden border border-red-600/20 flex items-center justify-center">
                <img 
                  src={selectedProduct?.imageUrl} 
                  alt={selectedProduct?.name} 
                  className={`w-full h-full ${selectedProduct?.coverFit === 'contain' ? 'object-contain p-1' : 'object-cover'}`} 
                />
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

            {chosenVersion && (
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

                {/* Cupom de Desconto */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3.5 space-y-2.5 mt-4 animate-in fade-in duration-200">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Cupom de Desconto</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: EFORTE10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="bg-slate-950 border-slate-800 focus-visible:ring-red-600 h-10"
                      disabled={!!appliedCoupon}
                    />
                    {appliedCoupon ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setDiscountPercentage(0);
                          setCouponCode("");
                        }}
                        className="border-red-600/30 text-red-500 hover:bg-red-950 h-10 px-4 text-xs font-bold"
                      >
                        Remover
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon || !couponCode.trim()}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-4 text-xs"
                      >
                        {isValidatingCoupon ? "..." : "Aplicar"}
                      </Button>
                    )}
                  </div>
                  {couponError && <p className="text-red-400 text-[10px] mt-1">❌ {couponError}</p>}
                  {appliedCoupon && <p className="text-green-400 text-[10px] mt-1">✅ Cupom {appliedCoupon} aplicado: {discountPercentage}% de desconto!</p>}
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
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-500">
                      <span>Desconto Cupom ({discountPercentage}%):</span>
                      <span>- R$ {couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {useCoins && coinDiscount > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>Desconto ForteCoins:</span>
                      <span>- R$ {coinDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-black text-white mt-1 pt-1 border-t border-slate-800">
                    <span>Total Final:</span>
                    <span>R$ {finalPriceVal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col gap-3">
            {checkoutError && (
              <div className="w-full bg-red-950/60 border border-red-500/40 rounded-xl px-4 py-3 text-sm text-red-300">
                ⚠️ {checkoutError}
              </div>
            )}
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

      {/* Modal de Pechincha */}
      <Dialog open={!!selectedBargainProduct} onOpenChange={(open) => !open && setSelectedBargainProduct(null)}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white sm:max-w-[425px] card-neon">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-neon flex items-center gap-2">💸 Fazer uma Pechincha</DialogTitle>
            <DialogDescription className="text-slate-400">
              Proponha sua oferta para o administrador. Se aprovado, fechamos o negócio!
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="flex gap-4 items-start mb-6">
              <div className="w-20 h-20 rounded bg-slate-800 overflow-hidden border border-red-600/20">
                <img src={selectedBargainProduct?.imageUrl} alt={selectedBargainProduct?.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-white line-clamp-2">{selectedBargainProduct?.name}</h4>
                <p className="text-xs text-slate-500">Qual versão você quer propor?</p>
              </div>
            </div>

            <div className="space-y-3">
              {selectedBargainProduct?.pricePS4 && (
                <button
                  type="button"
                  onClick={() => setChosenBargainVersion("PS4")}
                  className={`w-full p-3.5 rounded-xl border transition-all flex justify-between items-center ${
                    chosenBargainVersion === "PS4" 
                    ? "border-red-500 bg-red-500/10" 
                    : "border-slate-700 bg-slate-800 hover:border-red-500/50"
                  }`}
                >
                  <span className="font-bold">Versão PS4</span>
                  <span className="text-slate-400 font-bold">R$ {selectedBargainProduct.pricePS4.toFixed(2)}</span>
                </button>
              )}

              {selectedBargainProduct?.pricePS5 && (
                <button
                  type="button"
                  onClick={() => setChosenBargainVersion("PS5")}
                  className={`w-full p-3.5 rounded-xl border transition-all flex justify-between items-center ${
                    chosenBargainVersion === "PS5" 
                    ? "border-red-500 bg-red-500/10" 
                    : "border-slate-700 bg-slate-800 hover:border-red-500/50"
                  }`}
                >
                  <span className="font-bold">Versão PS5</span>
                  <span className="text-slate-400 font-bold">R$ {selectedBargainProduct.pricePS5.toFixed(2)}</span>
                </button>
              )}
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
              disabled={!chosenBargainVersion || !bargainOffer.trim()}
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
