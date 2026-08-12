import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserProfileButton from "@/components/UserProfileButton";
import SellerChatDialog from "@/components/SellerChatDialog";
import { Search, Star, ShoppingCart, ArrowLeft, Flame, User, Check, Package, Coins, MapPin, Shield, Trash2, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
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

const BRAZIL_STATES = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" }
];

function ProductCardSkeleton() {
  return (
    <div className="bg-slate-900/40 rounded-2xl sm:rounded-3xl border border-red-600/10 overflow-hidden flex flex-col h-full">
      <div className="aspect-[3/4] w-full skeleton-shimmer" />
      <div className="p-3 sm:p-6 flex-1 flex flex-col gap-3">
        <div className="h-3.5 w-4/5 rounded skeleton-shimmer" />
        <div className="h-2.5 w-1/2 rounded skeleton-shimmer" />
        <div className="h-8 w-2/3 rounded skeleton-shimmer mt-auto" />
        <div className="h-10 w-full rounded-xl skeleton-shimmer" />
      </div>
    </div>
  );
}

function getUsedProductImage(product: any): string | null {
  if (!product) return null;
  if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) {
    return product.images[0];
  }
  if (product.imageUrl) return product.imageUrl;
  return null;
}

function getUsedCategoryLabel(product: any): string {
  if (!product) return "MÍDIA FÍSICA / USADO";
  const cat = product.category || "";
  if (cat === "colecionavel") return "Action Figure / Colecionável";
  if (cat === "console") return "Console de Videogame";
  if (cat === "acessorio") return "Controle / Acessório";
  if (cat === "midia_fisica") return "Mídia Física";

  const desc = (product.description || "").toUpperCase();
  if (desc.includes("[COLECIONAVEL]")) return "Action Figure / Colecionável";
  if (desc.includes("[CONSOLE]")) return "Console de Videogame";
  if (desc.includes("[ACESSORIO]")) return "Controle / Acessório";
  if (desc.includes("[MIDIA_FISICA]")) return "Mídia Física";

  return "Desapego Gamer";
}

export default function UsedMarketplace() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  
  // Localização do Comprador
  const [buyerCep, setBuyerCep] = useState("");
  const [buyerEstado, setBuyerEstado] = useState<string | null>(null);
  const [buyerCidade, setBuyerCidade] = useState<string | null>(null);
  const [buyerBairro, setBuyerBairro] = useState<string | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutProductId, setCheckoutProductId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const ADMIN_EMAILS = ["luanmnogueira@gmail.com", "enfortec@admin.com", "luiz220190@hotmail.com", "sandrinhooperfectt@gmail.com"];
  const isAdmin = (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) || user?.role === "admin";

  const deleteUsedProductMutation = trpc.usedProducts.delete.useMutation();
  const trpcUtils = trpc.useUtils();

  const handleDeleteProduct = (id: number | string) => {
    toast("Deletar este anúncio?", {
      action: {
        label: "Deletar",
        onClick: async () => {
          try {
            await deleteUsedProductMutation.mutateAsync({ id: Number(id) });
            toast.success("Anúncio deletado com sucesso!");
            trpcUtils.usedProducts.list.invalidate();
          } catch (error: any) {
            toast.error(error?.message || "Erro ao deletar anúncio.");
            console.error(error);
          }
        }
      }
    });
  };

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
      setCouponCode("");
      setDiscountPercentage(0);
      setAppliedCoupon(null);
      setCouponError(null);
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
    const price = parseFloat(selectedBargainProduct.price || 0);
    const message = `Olá! Tenho interesse no produto usado: ${selectedBargainProduct.name} anunciado por ${selectedBargainProduct.sellerName || "vendedor"} (Preço original: R$ ${price.toFixed(2).replace('.', ',')}). Gostaria de pechinchar: você fecharia por R$ ${parseFloat(bargainOffer).toFixed(2).replace('.', ',')}?`;
    const phone = "5543984253691";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    setSelectedBargainProduct(null);
  };

  const handleBuyClick = (product: any) => {
    const price = parseFloat(product.price || 0);
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
    const price = parseFloat(selectedProduct.price || 0);

    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setCheckoutError("Por favor, preencha todos os dados de contato (Nome, E-mail e WhatsApp).");
      return;
    }

    setIsProcessingCheckout(true);
    setCheckoutError(null);

    try {
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
          coinsToUse: 0,
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
        }
        setSelectedProduct(null);
      } else {
        const errorMsg = data.error || "Erro ao gerar link de pagamento. Tente novamente.";
        console.error("[Checkout] Erro da API:", errorMsg);
        setCheckoutError(errorMsg);
      }
    } catch (error: any) {
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
  
  const { data: trpcProducts, isLoading: isTrpcLoading } = trpc.usedProducts.list.useQuery();

  useEffect(() => {
    if (trpcProducts) {
      setProducts(trpcProducts);
      setIsLoading(false);
    }
  }, [trpcProducts]);

  const handleBuyerCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 5) {
      value = value.replace(/^(\d{5})(\d)/, "$1-$2");
    }
    if (value.length > 9) {
      value = value.slice(0, 9);
    }
    setBuyerCep(value);

    if (value.length === 9) {
      const cleanCep = value.replace("-", "");
      try {
        setIsSearchingCep(true);
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setBuyerEstado(data.uf);
          setBuyerCidade(data.localidade);
          setBuyerBairro(data.bairro);
          toast.success(`Mostrando produtos em ${data.bairro}, ${data.localidade} - ${data.uf}`);
        } else {
          toast.error("CEP não encontrado");
          setBuyerEstado(null);
          setBuyerCidade(null);
          setBuyerBairro(null);
        }
      } catch (error) {
        toast.error("Erro ao buscar CEP");
      } finally {
        setIsSearchingCep(false);
      }
    } else if (value.length === 0) {
      setBuyerEstado(null);
      setBuyerCidade(null);
      setBuyerBairro(null);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCondition = !selectedCondition || p.condition === selectedCondition;
    
    let matchesCategory = true;
    if (selectedCategory) {
      const cat = p.category || "";
      const desc = (p.description || "").toLowerCase();
      matchesCategory = cat === selectedCategory || desc.includes(`[${selectedCategory.toLowerCase()}]`);
    }

    // Filtro por CEP (Bairro/Cidade/Estado) se o usuário digitou o CEP, ou filtro por estado selecionado manualmente
    let matchesLocation = true;
    if (buyerBairro && buyerCidade) {
      // Se buscou por CEP, mostra produtos do mesmo Bairro ou no mínimo mesma Cidade
      const sameBairro = p.bairro?.toLowerCase() === buyerBairro.toLowerCase();
      const sameCidade = p.cidade?.toLowerCase() === buyerCidade.toLowerCase();
      matchesLocation = sameBairro || sameCidade;
    } else if (selectedState) {
      matchesLocation = p.estado === selectedState;
    }

    return matchesSearch && matchesCondition && matchesCategory && matchesLocation;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const isABoosted = Boolean(a.boostedUntil && new Date(a.boostedUntil).getTime() > Date.now());
    const isBBoosted = Boolean(b.boostedUntil && new Date(b.boostedUntil).getTime() > Date.now());
    if (isABoosted && !isBBoosted) return -1;
    if (!isABoosted && isBBoosted) return 1;
    return 0; // ambos turbinados ou nenhum turbinado, mantém a ordem original (createdAt decrescente)
  });

  const usedCategories = [
    { value: "midia_fisica", label: "📦 Mídias Físicas" },
    { value: "colecionavel", label: "🧸 Action Figures & Colecionáveis" },
    { value: "console", label: "🎮 Consoles" },
    { value: "acessorio", label: "🎧 Controles & Acessórios" },
  ];

  const conditions = [
    { value: "novo", label: "Novo" },
    { value: "como_novo", label: "Como Novo" },
    { value: "bom", label: "Bom" },
    { value: "aceitavel", label: "Aceitável" },
  ];

  const price = selectedProduct ? parseFloat(selectedProduct.price || 0) : 0;
  const couponDiscount = appliedCoupon ? price * (discountPercentage / 100) : 0;
  const finalPriceVal = Math.max(0, price - couponDiscount);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 overflow-x-hidden w-full max-w-full">
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
                <h1 className="text-base sm:text-3xl font-bold text-neon">Revenda de Jogos Físicos, Consoles e Acessórios 📦</h1>
              </div>
            </div>
            {isAuthenticated && (
              <div className="flex items-center gap-3">
                <UserProfileButton />
              </div>
            )}
          </div>

          {/* Intermediary Guarantee Banner */}
          <div className="mb-3 p-3 bg-red-950/30 border border-red-600/30 rounded-xl flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500 shrink-0" />
              <span>
                <strong>Garantia Intermediada Eforte (8% taxa)</strong>: O valor fica retido na loja e só é liberado ao vendedor após o comprador receber e avaliar o item.
              </span>
            </div>
          </div>

          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 sm:w-5 sm:h-5 text-red-500/50" />
              <Input
                placeholder="Buscar jogos em disco, consoles ou acessórios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 sm:pl-10 bg-slate-900 border-red-600/30 text-white placeholder:text-slate-500 h-10"
              />
            </div>
            {isAuthenticated && (
              <Button onClick={() => navigate("/vendedor/novo-produto-usado")} className="bg-red-600 hover:bg-red-700 text-white font-black btn-neon text-xs sm:text-sm h-10">
                <Package className="w-4 h-4 mr-1.5" />
                Anunciar Físico / Console
              </Button>
            )}
          </div>

          {/* Busca Local por CEP */}
          <div className="mt-4 flex gap-2 flex-col sm:flex-row items-center">
            <div className="flex-1 relative max-w-sm">
              <MapPin className="absolute left-3 top-3 w-4 h-4 sm:w-5 sm:h-5 text-red-500/50" />
              <Input
                placeholder="Digite seu CEP para busca local"
                value={buyerCep}
                onChange={handleBuyerCepChange}
                disabled={isSearchingCep}
                className="pl-9 sm:pl-10 bg-slate-900 border-red-600/30 text-white placeholder:text-slate-500 h-10"
              />
            </div>
            {buyerBairro && buyerCidade && (
              <div className="text-sm text-slate-300 flex items-center gap-2">
                <span className="text-red-500 font-semibold flex items-center">
                  <Check className="w-4 h-4 mr-1" /> Localização ativa:
                </span>
                {buyerBairro}, {buyerCidade} - {buyerEstado}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 border-b border-red-600/20">
        <div className="container mx-auto px-4 py-3 space-y-3">
          {/* Category Tabs */}
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none items-center">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider shrink-0 mr-1">Categoria:</span>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
                selectedCategory === null
                  ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              Todas as Categorias
            </button>
            {usedCategories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
                  selectedCategory === cat.value
                    ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Condition & Location Filters */}
          <div className="flex gap-1.5 sm:gap-2 flex-wrap items-center pt-1 border-t border-slate-800/60">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider shrink-0 mr-1">Estado do Item:</span>
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

            <span className="w-px h-6 bg-slate-800 mx-2 hidden sm:inline"></span>

            <div className="flex gap-2 items-center">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">📍 Estado:</span>
              <select
                value={selectedState || ""}
                onChange={(e) => setSelectedState(e.target.value || null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 border border-red-600/20 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
              >
                <option value="">Todos os Estados</option>
                {BRAZIL_STATES.map(st => (
                  <option key={st.uf} value={st.uf}>{st.name} ({st.uf})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12 pb-24 lg:pb-12">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {sortedProducts.map((product) => {
              const mainImg = getUsedProductImage(product);
              const categoryLabel = getUsedCategoryLabel(product);

              return (
                <div
                  key={product.id}
                  className={`group relative bg-slate-900/40 rounded-2xl sm:rounded-3xl border overflow-hidden transition-all duration-500 flex flex-col h-full ${
                    Boolean(product.boostedUntil && new Date(product.boostedUntil).getTime() > Date.now())
                      ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(234,179,8,0.4)]'
                      : 'border-red-600/10 hover:border-red-600/40 hover:shadow-[0_20px_50px_rgba(220,38,38,0.15)]'
                  }`}
                >
                  {/* Image Section with vertical case cover aspect ratio */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                    {mainImg ? (
                      <img 
                        src={mainImg} 
                        alt={product.name} 
                        className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-800">
                        <ShoppingCart className="w-10 h-10 sm:w-16 sm:h-16" />
                      </div>
                    )}
                    
                    {/* Badge */}
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex gap-1 sm:gap-2 flex-col items-end">
                      {Boolean(product.boostedUntil && new Date(product.boostedUntil).getTime() > Date.now()) && (
                        <span className="bg-yellow-500 text-slate-950 text-[8px] sm:text-[10px] px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-full font-black uppercase tracking-wider shadow-xl border border-white/10 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-slate-950" /> DESTAQUE
                        </span>
                      )}
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
                      <p className="text-red-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">{categoryLabel}</p>
                    {product.bairro && product.cidade ? (
                      <span className="flex items-center text-[10px] sm:text-xs text-slate-400 max-w-[50%] truncate">
                        <MapPin className="w-3 h-3 mr-1" />
                        {product.bairro}, {product.cidade}
                      </span>
                    ) : product.cidade ? (
                      <span className="flex items-center text-[10px] sm:text-xs text-slate-400 max-w-[50%] truncate">
                        <MapPin className="w-3 h-3 mr-1" />
                        {product.cidade}
                      </span>
                    ) : null}
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
                          R$ {parseFloat(product.price || 0).toFixed(2).replace('.', ',')}
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
                      {(isAdmin || user?.id === product.sellerId) && (
                        <Button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="w-full bg-slate-800 hover:bg-red-800 text-slate-300 font-bold text-xs sm:text-sm h-10 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 border border-red-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Apagar Anúncio
                        </Button>
                      )}
                      {user?.id && user.id === product.sellerId ? (
                        <Button
                          onClick={() => navigate("/vendedor")}
                          className="w-full bg-slate-900 border border-amber-500/30 hover:border-amber-500/60 text-amber-400 font-bold text-xs sm:text-sm h-10 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5"
                        >
                          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Seu anúncio · Gerenciar no Painel
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleBuyClick(product)}
                            disabled={isProcessingCheckout && selectedProduct?.id === product.id}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-lg h-10 sm:h-12 rounded-xl sm:rounded-2xl transition-all active:scale-95 shadow-lg border-b-2 sm:border-b-4 border-red-800 flex items-center justify-center gap-1.5 sm:gap-3"
                          >
                            <ShoppingCart className="w-3.5 h-3.5 sm:w-5 sm:h-5" strokeWidth={3} />
                            {(isProcessingCheckout && selectedProduct?.id === product.id) ? "..." : "Comprar com Garantia"}
                          </Button>
                          {selectedProduct?.id === product.id && checkoutError && (
                            <p className="text-red-400 text-[10px] text-center">⚠️ {checkoutError}</p>
                          )}

                          <div className="grid grid-cols-2 gap-1.5">
                            <SellerChatDialog
                              productId={product.id}
                              productName={product.name}
                              sellerId={product.sellerId || undefined}
                              sellerName={product.sellerName || "Vendedor"}
                              buttonLabel="Vendedor"
                            />
                            {parseFloat(product.price || 0) > 0 && (
                              <Button
                                onClick={() => handleBargainClick(product)}
                                className="w-full bg-slate-900 border border-red-600/30 hover:border-red-600/60 text-red-500 font-bold text-[10px] sm:text-xs h-10 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1"
                              >
                                💸 Pechinchar
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Compra */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white sm:max-w-[425px] card-neon max-h-[85dvh] overflow-y-auto scrollbar-thin scrollbar-thumb-red-600/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-neon flex items-center gap-2">🎮 Confirmar Compra</DialogTitle>
            <DialogDescription className="text-slate-400">
              Pagamento intermediado com retenção de valor segura pela EforteGames.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div className="flex gap-4 items-start mb-4">
              <div className="w-20 h-20 rounded bg-slate-800 overflow-hidden border border-red-600/20 shrink-0">
                {getUsedProductImage(selectedProduct) ? (
                  <img src={getUsedProductImage(selectedProduct)!} alt={selectedProduct?.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <ShoppingCart className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-bold text-white line-clamp-2">{selectedProduct?.name}</h4>
                <p className="text-xs text-red-400 font-bold uppercase">{getUsedCategoryLabel(selectedProduct)}</p>
                <p className="text-xs text-slate-400 mt-1">Anunciado por: <strong className="text-white">{selectedProduct?.sellerName || "Vendedor"}</strong></p>
              </div>
            </div>

            {/* Escrow Guarantee Banner */}
            <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl space-y-1 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <Shield className="w-4 h-4 text-red-500 shrink-0" />
                <span>Garantia de Pagamento Retido EforteGames</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ao comprar, o seu dinheiro fica <strong>retido em segurança com a loja EforteGames</strong>. O vendedor efetua o envio e o valor só é liberado para o vendedor após você receber o item e <strong>avaliar o vendedor em "Minhas Compras"</strong>!
              </p>
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

              {/* Cupom de Desconto */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3.5 space-y-2.5 mt-4">
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
                <div className="flex justify-between text-lg font-black text-white mt-1 pt-1 border-t border-slate-800">
                  <span>Total Final:</span>
                  <span>R$ {finalPriceVal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-3 p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-[10px] text-red-300 leading-tight">
              <strong>AVISO IMPORTANTE:</strong> A EforteGames não se responsabiliza por negociações que não foram intermediadas pela loja. Caso o cliente queira intermediação da loja, o valor ficará retido até o comprador receber e avaliar o item, liberando assim o pagamento ao vendedor.
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-3 pb-4 sm:pb-0">
            {checkoutError && (
              <div className="w-full bg-red-950/60 border border-red-500/40 rounded-xl px-4 py-3 text-sm text-red-300">
                ⚠️ {checkoutError}
              </div>
            )}
            <Button 
              disabled={isProcessingCheckout}
              onClick={handleFinalizePurchase}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 text-lg btn-neon disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessingCheckout ? "Gerando pagamento..." : "Confirmar e Ir para Checkout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Pechincha */}
      <Dialog open={!!selectedBargainProduct} onOpenChange={(open) => !open && setSelectedBargainProduct(null)}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white sm:max-w-[425px] card-neon max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-neon flex items-center gap-2">💸 Fazer uma Pechincha</DialogTitle>
            <DialogDescription className="text-slate-400">
              Proponha sua oferta para este desapego. Se aprovado, fechamos o negócio!
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="flex gap-4 items-start mb-6">
              <div className="w-20 h-20 rounded bg-slate-800 overflow-hidden border border-red-600/20 shrink-0">
                {getUsedProductImage(selectedBargainProduct) ? (
                  <img src={getUsedProductImage(selectedBargainProduct)!} alt={selectedBargainProduct?.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <ShoppingCart className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-bold text-white line-clamp-2">{selectedBargainProduct?.name}</h4>
                <p className="text-xs text-slate-500">
                  Preço original: R$ {selectedBargainProduct ? parseFloat(selectedBargainProduct.price || 0).toFixed(2).replace('.', ',') : "0,00"}
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

          <DialogFooter className="pb-4 sm:pb-0">
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
