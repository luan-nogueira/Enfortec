import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { Shield, User, Store, Flame, ArrowLeft, Info, HelpCircle } from "lucide-react";

export default function BecomeSellerForm() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"cadastro" | "revenda">("cadastro");

  const { data: seller, isLoading: isCheckingSeller } = trpc.sellers.getByUserId.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createSellerMutation = trpc.sellers.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeName.trim()) {
      toast.error("Nome da loja é obrigatório");
      return;
    }

    setIsLoading(true);
    try {
      await createSellerMutation.mutateAsync({
        storeName: storeName.trim(),
        description: description.trim(),
      });
      toast.success("Loja de revendedor criada com sucesso!");
      navigate("/vendedor");
    } catch (error) {
      toast.error("Erro ao criar loja. Tente novamente.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNegotiateAccount = () => {
    const message = `Olá! Gostaria de negociar a revenda da minha conta para a Eforte Games. Confirmo que ela cumpre com todos os requisitos mínimos (e-mail da loja e desativação solicitada). Como prosseguimos?`;
    const phone = "554384253691";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (!isAuthenticated) {
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-200 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/")} 
              className="text-slate-400 hover:text-white hover:bg-slate-900/60"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-3xl font-black text-neon flex items-center gap-2">
                <Flame className="w-8 h-8 text-red-500" />
                Parcerias & Revenda
              </h1>
              <p className="text-slate-400 text-sm">Trabalhe conosco ou revenda seus itens para a nossa loja</p>
            </div>
          </div>

          {/* Custom Tabs */}
          <div className="flex border-b border-red-600/20 mb-8 bg-slate-900/40 p-1.5 rounded-xl gap-2">
            <button
              onClick={() => setActiveTab("cadastro")}
              className={`flex-1 py-3 text-sm font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === "cadastro"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/30"
              }`}
            >
              Ser Revendedor (Criar Loja)
            </button>
            <button
              onClick={() => setActiveTab("revenda")}
              className={`flex-1 py-3 text-sm font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === "revenda"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/30"
              }`}
            >
              Vender Minha Conta
            </button>
          </div>

          {/* Active Tab Content */}
          {activeTab === "cadastro" ? (
            <div className="bg-slate-900/60 backdrop-blur-md border border-red-600/20 rounded-3xl p-8 shadow-2xl card-neon">
              {isCheckingSeller ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">Verificando dados da loja...</p>
                </div>
              ) : seller ? (
                <div className="text-center py-8 space-y-6">
                  <div className="w-16 h-16 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 mx-auto">
                    <Store className="w-8 h-8 text-red-500 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Sua Loja está Ativa!</h2>
                    <p className="text-sm text-slate-400 mt-2">
                      Você já está cadastrado como revendedor parceiro (<strong>{seller.storeName}</strong>).
                    </p>
                  </div>
                  <div className="pt-4 flex gap-4 max-w-sm mx-auto">
                    <Button
                      onClick={() => navigate("/vendedor")}
                      className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-wider btn-neon"
                    >
                      Acessar Painel de Desapego
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
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Conta Conectada</p>
                    <p className="text-base font-bold text-white leading-tight">{user?.name || user?.email}</p>
                    <p className="text-xs text-slate-400">{user?.email}</p>
                  </div>
                </div>

                {/* Store Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-black text-white uppercase tracking-wider">
                    Nome da sua Loja/Marca *
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: Pedro Games Desapego"
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
                    Descrição/Apresentação da Loja
                  </label>
                  <textarea
                    placeholder="Conte um pouco sobre os jogos que pretende vender ou seu foco (ex: Apenas jogos digitais PS5, Gift cards, etc)..."
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
                    <p className="text-sm font-black text-red-400 uppercase tracking-wider">Taxa de Comissão Eforte</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Cobramos uma comissão padrão de <strong>10%</strong> sobre as vendas de produtos usados para manter a infraestrutura, suporte técnico e a intermediação segura dos pagamentos.
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
                    {isLoading ? "Criando Portal..." : "Ativar minha Loja"}
                  </Button>
                </div>
              </form>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/60 backdrop-blur-md border border-red-600/20 rounded-3xl p-8 shadow-2xl card-neon space-y-6">
              <div className="text-center max-w-lg mx-auto">
                <Store className="w-16 h-16 text-red-600 mx-auto mb-4 animate-bounce" />
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Queremos Comprar sua Conta!</h2>
                <p className="text-sm text-slate-400 mt-2">
                  Sabia que você pode ganhar dinheiro revendendo suas contas de jogos para a <strong>Eforte Games</strong>? Nós compramos de volta para revender aos nossos clientes.
                </p>
              </div>

              {/* Requirements Box */}
              <div className="bg-slate-950/80 border border-red-600/20 p-6 rounded-2xl space-y-4">
                <h3 className="text-xs font-black text-red-500 uppercase tracking-widest border-b border-red-600/10 pb-2">Requisitos Mínimos Obrigatórios</h3>
                
                <ul className="space-y-3.5">
                  <li className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">1</div>
                    <p className="text-slate-300 leading-tight">
                      A conta precisa ter sido adquirida originalmente em nossa loja (<strong>Eforte Games</strong>).
                    </p>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">2</div>
                    <p className="text-slate-300 leading-tight">
                      A conta deve estar configurada e vinculada ao <strong>e-mail oficial da nossa loja</strong>.
                    </p>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">3</div>
                    <p className="text-slate-300 leading-tight">
                      O cliente precisa solicitar e confirmar a <strong>desativação completa da conta</strong> junto à nossa equipe.
                    </p>
                  </li>
                </ul>
              </div>

              {/* CTA Support Box */}
              <div className="bg-red-950/20 border border-red-600/20 p-5 rounded-2xl text-center space-y-4">
                <HelpCircle className="w-8 h-8 text-red-500 mx-auto animate-pulse" />
                <div className="space-y-1">
                  <p className="text-sm font-black text-white uppercase tracking-wider">Tudo pronto para negociar?</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Se sua conta cumpre todos os requisitos acima, clique no botão abaixo para iniciar o atendimento pelo WhatsApp e fechar negócio agora mesmo!
                  </p>
                </div>
                
                <Button
                  onClick={handleNegotiateAccount}
                  className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black text-base uppercase tracking-wider rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-green-600/20"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.118-2.905-6.993C16.257 1.874 13.78 1.84 11.14 1.84 5.704 1.84 1.28 6.261 1.277 11.705c-.001 1.714.453 3.39 1.317 4.873L1.576 22.25l5.071-1.328z"/>
                  </svg>
                  Iniciar Negociação via WhatsApp
                </Button>
              </div>
            </div>
          )}

          {/* Benefits Grid */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/40 border border-red-600/5 p-6 rounded-2xl card-neon text-center">
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
