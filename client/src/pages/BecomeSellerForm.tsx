import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Shield, User, Store, Flame, ArrowLeft, Info, HelpCircle } from "lucide-react";

export default function BecomeSellerForm() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"cadastro" | "revenda">("cadastro");

  const [localSeller, setLocalSeller] = useState<{ storeName: string } | null>(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(`is_seller_generic`);
        return stored ? JSON.parse(stored) : null;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  useEffect(() => {
    if (user?.id) {
      try {
        const stored = localStorage.getItem(`is_seller_${user.id}`);
        if (stored) {
          setLocalSeller(JSON.parse(stored));
        } else if (localSeller) {
          localStorage.setItem(`is_seller_${user.id}`, JSON.stringify(localSeller));
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [user?.id, localSeller]);

  const [checkTimedOut, setCheckTimedOut] = useState(false);

  const { data: seller, isLoading: isCheckingSellerRaw } = trpc.sellers.getByUserId.useQuery(undefined, {
    enabled: isAuthenticated && !localSeller,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 min cache
    gcTime: 1000 * 60 * 10,
  });

  // Timeout de segurança: se demorar mais de 5s, libera a tela
  useEffect(() => {
    if (!isCheckingSellerRaw) return;
    const timer = setTimeout(() => setCheckTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [isCheckingSellerRaw]);

  // Só mostra loading se ainda está checando E não deu timeout
  const isCheckingSeller = isCheckingSellerRaw && !checkTimedOut;

  useEffect(() => {
    if (seller) {
      const targetKey = user?.id ? `is_seller_${user.id}` : `is_seller_generic`;
      localStorage.setItem(targetKey, JSON.stringify(seller));
      setLocalSeller(seller);
    }
  }, [seller, user?.id]);

  const activeSeller = seller || localSeller;

  const createSellerMutation = trpc.sellers.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (storeName.trim().length < 3) {
      toast.error("Nome da loja deve ter pelo menos 3 caracteres");
      return;
    }

    setIsLoading(true);
    try {
      await createSellerMutation.mutateAsync({
        storeName: storeName.trim(),
        description: description.trim(),
      });
      const targetKey = user?.id ? `is_seller_${user.id}` : `is_seller_generic`;
      localStorage.setItem(targetKey, JSON.stringify({ storeName: storeName.trim() }));
      toast.success("Loja de revendedor criada com sucesso!");
      navigate("/vendedor");
    } catch (error: any) {
      // Só faz fallback local se for falha de rede (servidor inacessível) — erros de
      // validação/servidor devem ser mostrados ao usuário, não escondidos como sucesso.
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.warn("[BecomeSellerForm] Network error, falling back to local registration:", error);
        const targetKey = user?.id ? `is_seller_${user.id}` : `is_seller_generic`;
        localStorage.setItem(targetKey, JSON.stringify({ storeName: storeName.trim() }));
        toast.success("Loja de revendedor criada com sucesso!");
        navigate("/vendedor");
      } else {
        toast.error(error?.message || "Erro ao criar loja de revendedor. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNegotiateAccount = () => {
    const message = `Olá! Gostaria de negociar a revenda da minha conta para a Eforte Games. Confirmo que ela cumpre com todos os requisitos mínimos (e-mail da loja e desativação solicitada). Como prosseguimos?`;
    const phone = "554384253691";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center card-neon bg-slate-900 p-8 rounded-xl max-w-md w-full border border-red-600/30">
          <Shield className="w-16 h-16 text-red-600 mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h1>
          <p className="text-slate-400 mb-6">Você precisa estar logado para acessar o portal de parcerias.</p>
          <Button onClick={() => navigate("/login")} className="w-full bg-red-600 hover:bg-red-700 btn-neon">Fazer Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-200 py-6 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-slate-400 hover:text-white hover:bg-slate-900/60 shrink-0"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <div>
              <h1 className="text-lg sm:text-3xl font-black text-neon flex items-center gap-2">
                <Flame className="w-5 h-5 sm:w-8 sm:h-8 text-red-500 shrink-0" />
                Parcerias & Revenda
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">Trabalhe conosco ou revenda seus itens para a nossa loja</p>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-red-600/20 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl card-neon">
              {isCheckingSeller ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">Verificando dados da loja...</p>
                </div>
              ) : activeSeller ? (
                <div className="text-center py-6 sm:py-8 space-y-4 sm:space-y-6">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 mx-auto">
                    <Store className="w-7 h-7 sm:w-8 sm:h-8 text-red-500 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight">Seu Perfil de Vendas está Ativo!</h2>
                    <p className="text-sm text-slate-400 mt-2">
                      Você já está cadastrado para vender contas (<strong>{activeSeller.storeName}</strong>).
                    </p>
                  </div>
                  <div className="pt-4 flex gap-4 max-w-sm mx-auto">
                    <Button
                      onClick={() => navigate("/vendedor")}
                      className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-wider btn-neon"
                    >
                      Acessar Painel de Vendas
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                {/* User Info */}
                <div className="bg-slate-950/80 border border-red-600/10 p-5 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20">
                    <User className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Conta Conectada</p>
                    <p className="text-base font-bold text-white leading-tight">{user?.name || user?.email}</p>
                    <p className="text-xs text-slate-400">{user?.email}</p>
                  </div>
                  {user?.cpf && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">CPF Parcerias</p>
                      <p className="text-sm font-semibold text-red-400">
                        ***.{user.cpf.substring(3, 6) || "###"}.{user.cpf.substring(6, 9) || "###"}-**
                      </p>
                    </div>
                  )}
                </div>

                {/* Store Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-black text-white uppercase tracking-wider">
                    Nome de Vendedor *
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: João Silva"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="bg-slate-950 border-red-600/20 text-white focus-visible:ring-red-600 h-12 rounded-xl text-base"
                    disabled={isLoading}
                  />
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Este nome será exibido nos seus anúncios
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-black text-white uppercase tracking-wider">
                    Quais contas pretende vender?
                  </label>
                  <textarea
                    placeholder="Conte quais jogos estão nas contas que você pretende revender..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-950 border border-red-600/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 text-white placeholder:text-slate-600 text-base"
                    disabled={isLoading}
                  />
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Máximo 500 caracteres
                  </p>
                </div>

                {/* Platform Commission info */}
                <div className="bg-red-950/20 border border-red-600/20 p-5 rounded-2xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-red-400 uppercase tracking-wider">Taxa de Comissão Eforte (35%) & Intermediação Segura</p>
                    <p className="text-sm text-slate-300 leading-relaxed text-justify">
                      Cobramos uma comissão padrão de <strong>35%</strong> sobre as vendas ativas. Em contas de terceiros intermediadas pela loja, o pagamento do comprador fica retido em escrow até a validação e avaliação. Após a aprovação do cliente, o valor é liberado ao vendedor menos a comissão de 35%. Negociações feitas de forma direta e sem intermediação do site são de risco exclusivo das partes.
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/")}
                    disabled={isLoading}
                    className="flex-1 h-12 border-red-700/50 text-red-500 hover:bg-red-950 rounded-xl font-bold"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-wider btn-neon"
                    disabled={isLoading}
                  >
                    {isLoading ? "Ativando..." : "Ativar Perfil de Vendas"}
                  </Button>
                </div>
              </form>
              )}
            </div>

          {/* Benefits Grid */}
          <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-slate-900/40 border border-red-600/5 p-5 sm:p-6 rounded-2xl card-neon text-center">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-bold text-white mb-1">Painel Completo</h3>
              <p className="text-xs text-slate-500">
                Acompanhe anúncios, desapegos e comissões do seu saldo em tempo real.
              </p>
            </div>
            <div className="bg-slate-900/40 border border-red-600/5 p-6 rounded-2xl card-neon text-center">
              <div className="text-3xl mb-2">💰</div>
              <h3 className="font-bold text-white mb-1">Retorno Garantido</h3>
              <p className="text-xs text-slate-500">
                Ganhe dinheiro indicando amigos, vendendo usados ou desapegando de contas antigas.
              </p>
            </div>
            <div className="bg-slate-900/40 border border-red-600/5 p-6 rounded-2xl card-neon text-center">
              <div className="text-3xl mb-2">🛡️</div>
              <h3 className="font-bold text-white mb-1">Negócio Seguro</h3>
              <p className="text-xs text-slate-500">
                Sua transação protegida com as melhores práticas de intermediação segura da Eforte.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
