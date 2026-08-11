import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserProfileButton from "@/components/UserProfileButton";
import { Search, Gamepad2, Sparkles, Shield, Coins, Tag, Flame, Star, ShoppingCart, ArrowLeft, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, limit } from "firebase/firestore";

export default function JogueComEconomia() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<"primaria" | "secundaria">("secundaria");
  const [useCoins, setUseCoins] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  useEffect(() => {
    const qDigital = query(collection(db, "digital_products"));
    const unsubDigital = onSnapshot(qDigital, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => p.isActive !== false);
      setProducts(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao buscar jogos em JogueComEconomia:", error);
      setIsLoading(false);
    });

    return () => unsubDigital();
  }, []);

  // Filter products: show only products explicitly enabled for Economia
  const filteredProducts = products.filter((product) => {
    if (product.showInEconomia !== true) return false;
    if (searchTerm.trim() === "") return true;
    return product.name?.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    const priceA = Number(a.priceSecondary || a.pricePrimary || a.price || 0);
    const priceB = Number(b.priceSecondary || b.pricePrimary || b.price || 0);
    return priceA - priceB; // Lowest price first
  });

  const isPrimaryAvailable = (prod: any) => {
    if (!prod) return false;
    const lic = prod.economiaLicenseType;
    if (lic === "secundaria") return false;
    if (lic === "primaria" || lic === "ambas") return true;
    const pPrimary = Number(prod.pricePrimary ?? prod.price_primary);
    return pPrimary > 0;
  };

  const isSecondaryAvailable = (prod: any) => {
    if (!prod) return false;
    const lic = prod.economiaLicenseType;
    if (lic === "primaria") return false;
    if (lic === "secundaria" || lic === "ambas") return true;
    const pSec = Number(prod.priceSecondary ?? prod.price_secondary);
    return pSec > 0 || !isPrimaryAvailable(prod);
  };

  const handleOpenBuyModal = (product: any) => {
    setSelectedProduct(product);
    const allowPrim = isPrimaryAvailable(product);
    const allowSec = isSecondaryAvailable(product);
    if (!allowPrim && allowSec) {
      setSelectedAccountType("secundaria");
    } else if (allowPrim && !allowSec) {
      setSelectedAccountType("primaria");
    } else {
      setSelectedAccountType(product.economiaLicenseType === "primaria" ? "primaria" : "secundaria");
    }
  };

  const getItemPrice = (product: any, accType: "primaria" | "secundaria") => {
    const secPrice = Number(product.priceSecondary ?? product.price_secondary);
    const primPrice = Number(product.pricePrimary ?? product.price_primary ?? product.price);
    if (accType === "secundaria") {
      return secPrice > 0 ? secPrice : Number(product.price || 0);
    }
    return primPrice > 0 ? primPrice : (secPrice > 0 ? secPrice : Number(product.price || 0));
  };

  const handleCheckout = async () => {
    if (!selectedProduct) return;
    setIsProcessingCheckout(true);
    try {
      const basePrice = getItemPrice(selectedProduct, selectedAccountType);
      let finalPrice = basePrice;
      let coinsUsed = 0;

      if (useCoins && user && user.forteCoins > 0) {
        coinsUsed = Math.min(user.forteCoins, Math.floor(basePrice));
        finalPrice = Math.max(0, basePrice - coinsUsed);
      }

      const accountLabel = selectedAccountType === "primaria" ? "Conta Primária" : "Conta Secundária";

      const res = await fetch("/api/infinitepay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${selectedProduct.name} - ${accountLabel}`,
          price: finalPrice,
          quantity: 1,
          productType: "digital",
          productId: selectedProduct.id,
          accountType: selectedAccountType,
          coinsUsed: coinsUsed,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Erro ao gerar link de pagamento.");
      }
    } catch (err) {
      console.error("Erro checkout:", err);
      toast.error("Ocorreu um erro no checkout.");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top Navbar */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex justify-between items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="Eforte Games Logo" className="w-9 h-9 object-contain rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.3)] border border-slate-800 bg-slate-950" />
            <span className="text-xl font-black tracking-tight">EFORTE<span className="text-red-500">GAMES</span></span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/digital")} className="text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar ao Catálogo
            </Button>
            {isAuthenticated ? (
              <UserProfileButton />
            ) : (
              <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => navigate("/login")}>
                Entrar
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-12 px-4 overflow-hidden bg-gradient-to-b from-red-950/30 via-slate-950 to-slate-950 border-b border-red-950/50">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-xs uppercase tracking-wider mb-4 animate-pulse">
            <Zap className="w-4 h-4" /> Ofertas Exclusivas em Contas Digitais
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 uppercase">
            Jogue com <span className="text-red-500">Economia</span> 🎮
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed mb-6">
            Acesse seus jogos favoritos no PS4 e PS5 pagando muito menos! Todas as contas possuem **Garantia Eforte Games**, ativação rápida e suporte exclusivo.
          </p>

          {/* Search Box */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar jogo econômico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-6 bg-slate-900/90 border-slate-800 text-white rounded-2xl text-base focus:border-red-500 focus:ring-red-500/20"
            />
          </div>
        </div>
      </section>

      {/* Product List Section */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Tag className="w-6 h-6 text-red-500" /> Catálogo de Jogos Econômicos
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">Ordenado do menor preço para o maior</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
            {filteredProducts.length} jogos disponíveis
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="h-64 bg-slate-900/50 animate-pulse rounded-xl border border-slate-800" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
            <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-300">Nenhum jogo encontrado</h3>
            <p className="text-sm text-slate-500 mt-1">Tente buscar por outro nome de jogo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredProducts.map((product) => {
              const licenseType = product.economiaLicenseType || "secundaria";
              const secPrice = Number(product.priceSecondary ?? product.price_secondary ?? product.price);
              const primPrice = Number(product.pricePrimary ?? product.price_primary ?? product.price);
              const hasSecondary = secPrice > 0;

              return (
                <div
                  key={product.id}
                  className="group relative bg-slate-900/80 rounded-xl border border-slate-800 hover:border-red-500/50 transition-all duration-300 flex flex-col overflow-hidden shadow-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                >
                  {/* Badge */}
                  <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                    <span className={`text-white font-black text-[10px] uppercase px-2 py-0.5 rounded shadow ${
                      licenseType === "primaria" ? "bg-blue-600" : licenseType === "ambas" ? "bg-purple-600" : "bg-red-600"
                    }`}>
                      {licenseType === "primaria" ? "Conta Primária" : licenseType === "ambas" ? "Primária ou Secundária" : "Conta Secundária"}
                    </span>
                    <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                      🎁 +7 FC Cashback
                    </span>
                  </div>

                  {/* Image Container */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
                    <img
                      src={product.imageUrl || "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=600"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                  </div>

                  {/* Details */}
                  <div className="p-3.5 flex flex-col flex-1 justify-between bg-slate-900/90">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          {product.platform || "PS4 / PS5"}
                        </span>
                        <span className="text-[9px] font-bold text-green-400 bg-green-950/60 px-1.5 py-0.5 rounded border border-green-800/40 flex items-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5" /> Verificado
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-white line-clamp-2 group-hover:text-red-400 transition-colors leading-tight">
                        {product.name}
                      </h3>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800">
                      {licenseType === "ambas" ? (
                        <div className="space-y-0.5 text-[11px] mb-2 bg-slate-950/60 p-2 rounded border border-slate-800">
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-bold">👤 Primária:</span>
                            <span className="text-red-400 font-bold">R$ {primPrice.toFixed(2)}</span>
                          </div>
                          {hasSecondary && (
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-bold">👥 Secundária:</span>
                              <span className="text-slate-200 font-bold">R$ {secPrice.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      ) : licenseType === "primaria" ? (
                        <div className="flex items-baseline justify-between mt-0.5">
                          <span className="text-[10px] text-slate-400 font-medium">Primária:</span>
                          <span className="text-lg font-black text-red-500">
                            R$ {primPrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <div>
                          {primPrice > secPrice && (
                            <div className="text-[10px] text-slate-500 line-through">
                              Primária: R$ {primPrice.toFixed(2)}
                            </div>
                          )}
                          <div className="flex items-baseline justify-between mt-0.5">
                            <span className="text-[10px] text-slate-400 font-medium">Secundária:</span>
                            <span className="text-lg font-black text-red-500">
                              R$ {secPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={() => handleOpenBuyModal(product)}
                        className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 rounded-lg transition-all shadow-md"
                      >
                        {licenseType === "primaria" ? "Comprar Primária" : licenseType === "ambas" ? "Comprar / Escolher Licença" : "Comprar Secundária"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Checkout Dialog */}
      {selectedProduct && (
        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="w-[92vw] sm:max-w-md bg-slate-900 border-slate-800 text-white max-h-[85dvh] overflow-y-auto scrollbar-thin scrollbar-thumb-red-600/50 p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-red-500" /> Finalizar Compra
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Escolha o tipo de licença e confirme os detalhes da compra de {selectedProduct.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-3">
                <img
                  src={selectedProduct.imageUrl || "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=200"}
                  alt={selectedProduct.name}
                  className="w-12 h-16 object-cover rounded"
                />
                <div>
                  <h4 className="font-bold text-sm text-white">{selectedProduct.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Plataforma: {selectedProduct.platform || "PS4 / PS5"}</p>
                  <p className="text-base font-black text-red-500 mt-1">
                    Valor: R$ {getItemPrice(selectedProduct, selectedAccountType).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Seletor de Conta Primária vs Secundária */}
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Escolha o Tipo de Licença *
                </label>
                {(() => {
                  const primAllowed = isPrimaryAvailable(selectedProduct);
                  const secAllowed = isSecondaryAvailable(selectedProduct);

                  return (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={!primAllowed}
                        onClick={() => primAllowed && setSelectedAccountType("primaria")}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          !primAllowed
                            ? "bg-slate-950 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed"
                            : selectedAccountType === "primaria"
                            ? "bg-red-600/20 border-red-500 text-white shadow-md font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="text-xs font-bold flex justify-between items-center">
                          <span>👤 Primária</span>
                          {selectedAccountType === "primaria" && primAllowed && <span className="text-[8px] bg-red-600 text-white px-1 rounded">OK</span>}
                        </div>
                        <div className="text-xs font-black mt-1">
                          {primAllowed ? <span className="text-red-400">R$ {getItemPrice(selectedProduct, "primaria").toFixed(2)}</span> : <span className="text-slate-600 text-[10px]">Indisponível</span>}
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={!secAllowed}
                        onClick={() => secAllowed && setSelectedAccountType("secundaria")}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          !secAllowed
                            ? "bg-slate-950 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed"
                            : selectedAccountType === "secundaria"
                            ? "bg-red-600/20 border-red-500 text-white shadow-md font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="text-xs font-bold flex justify-between items-center">
                          <span>👥 Secundária</span>
                          {selectedAccountType === "secundaria" && secAllowed && <span className="text-[8px] bg-red-600 text-white px-1 rounded">OK</span>}
                        </div>
                        <div className="text-xs font-black mt-1">
                          {secAllowed ? <span className="text-red-400">R$ {getItemPrice(selectedProduct, "secundaria").toFixed(2)}</span> : <span className="text-slate-600 text-[10px]">Indisponível</span>}
                        </div>
                      </button>
                    </div>
                  );
                })()}
              </div>

              {user && user.forteCoins > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-slate-200">Usar meus {user.forteCoins} ForteCoins como desconto</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={useCoins}
                    onChange={(e) => setUseCoins(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                  />
                </div>
              )}

              <div className="p-3 bg-slate-950/50 rounded-lg text-[11px] text-slate-400 space-y-1">
                <p className="flex items-center gap-1 text-slate-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-400" /> Garantia Eforte Games
                </p>
                <p>• Entrega rápida dos dados de acesso após confirmação do pagamento.</p>
                <p>• Suporte total via WhatsApp e Chat da loja.</p>
              </div>

              {/* WhatsApp direct support button */}
              <button
                type="button"
                onClick={() => {
                  const msg = encodeURIComponent(`Olá! Tenho uma dúvida antes de finalizar a compra do jogo "${selectedProduct.name}". Podem me ajudar?`);
                  window.open(`https://wa.me/554384253691?text=${msg}`, "_blank");
                }}
                className="w-full py-2 bg-green-950/40 border border-green-800/40 hover:bg-green-900/50 text-green-400 font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                💬 Dúvidas sobre ativação? Fale no WhatsApp
              </button>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)} className="text-slate-400">
                Cancelar
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={isProcessingCheckout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                {isProcessingCheckout ? "Processando..." : "Confirmar e Pagar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
