import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import UserProfileButton from "@/components/UserProfileButton";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { ArrowLeft, Coins, Copy, Gift, HelpCircle, CheckCircle, Clock, AlertTriangle, LogOut, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface Prize {
  id: string;
  name: string;
  cost: number;
  description: string;
  badge: string;
}

const PREDEFINED_PRIZES: Prize[] = [
  { id: "steam_50", name: "Gift Card Steam R$ 50", cost: 500, description: "Código de ativação Steam para qualquer jogo.", badge: "Mais Popular" },
  { id: "psn_50", name: "Gift Card PSN R$ 50", cost: 500, description: "Crédito na PlayStation Store para comprar jogos e DLCs.", badge: "Console" },
  { id: "xbox_50", name: "Gift Card Xbox R$ 50", cost: 500, description: "Crédito Xbox para jogos, assinaturas ou passes.", badge: "Console" },
  { id: "steam_100", name: "Gift Card Steam R$ 100", cost: 1000, description: "Crédito em dobro para a maior plataforma de jogos de PC.", badge: "Super Valor" },
  { id: "netflix_50", name: "Gift Card Netflix R$ 50", cost: 500, description: "Assista a séries e filmes com mensalidades pagas.", badge: "Lazer" },
  { id: "random_game", name: "Jogo Digital Aleatório PC", cost: 300, description: "Uma chave digital aleatória da Steam garantindo um jogo.", badge: "Surpresa" }
];

export default function FortecoinsPage() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [prizesList, setPrizesList] = useState<any[]>([]);

  // Carregar prêmios do banco de dados (ou usar predefinidos como fallback)
  useEffect(() => {
    const q = collection(db, "prizes");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter((p: any) => p.isActive !== false);

      if (data.length > 0) {
        setPrizesList(data);
      } else {
        setPrizesList(PREDEFINED_PRIZES);
      }
    });

    return () => unsubscribe();
  }, []);

  // Redireciona se não estiver logado
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  // Carregar indicações do usuário
  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, "referrals"),
      where("referrerId", "==", user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReferrals(data);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Carregar resgates do usuário
  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, "redemptions"),
      where("userId", "==", user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRedemptions(data);
    });

    return () => unsubscribe();
  }, [user?.id]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-500 font-bold animate-pulse text-lg">Carregando carteira de Fortecoins...</div>
      </div>
    );
  }

  const isEligible = user.loginMethod === "google.com";

  const handleCopyLink = () => {
    const link = `${window.location.origin}/?ref=${user.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de indicação copiado com sucesso!");
  };

  const handleRedeem = async (prize: Prize) => {
    if (!isEligible) {
      toast.error("Você precisa estar logado com sua conta Google para participar!");
      return;
    }

    if (user.forteCoins < prize.cost) {
      toast.error("Saldo de Fortecoins insuficiente para resgatar este prêmio!");
      return;
    }

    setRedeemingId(prize.id);
    try {
      // 1. Obter saldo atualizado em tempo real para evitar double spend
      const userRef = doc(db, "users", user.id);
      const userSnap = await getDoc(userRef);
      const currentCoins = userSnap.data()?.forteCoins ?? 0;

      if (currentCoins < prize.cost) {
        toast.error("Saldo de Fortecoins insuficiente!");
        setRedeemingId(null);
        return;
      }

      // 2. Deduzir pontos
      await updateDoc(userRef, {
        forteCoins: currentCoins - prize.cost
      });

      // 3. Registrar o resgate
      await addDoc(collection(db, "redemptions"), {
        userId: user.id,
        userName: user.name || user.email,
        userEmail: user.email,
        prizeId: prize.id,
        prizeName: prize.name,
        cost: prize.cost,
        status: "pendente",
        code: null,
        createdAt: new Date().toISOString()
      });

      toast.success(`Resgate de "${prize.name}" solicitado com sucesso! O administrador enviará seu prêmio em breve.`);
    } catch (error) {
      console.error("Erro no resgate:", error);
      toast.error("Ocorreu um erro ao realizar o resgate. Tente novamente.");
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Header */}
      <nav className="bg-slate-950/90 backdrop-blur-md border-b border-red-700/20 sticky top-0 z-50 py-3">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-slate-400 hover:text-white w-8 h-8">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Coins className="w-5 h-5 sm:w-7 sm:h-7 text-red-500 animate-bounce" />
              FORTE<span className="text-red-500">COINS</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-600/30 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl">
              <Coins className="w-4 h-4 text-red-500" />
              <span className="font-bold text-white text-sm sm:text-lg">{user.forteCoins} FC</span>
            </div>
            <UserProfileButton />
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 sm:py-10 max-w-6xl pb-24 lg:pb-10">
        {/* Top Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-10">
          
          {/* Card 1: Balance Wallet */}
          <Card className="bg-slate-900/60 border-red-600/20 backdrop-blur-md p-6 flex flex-col justify-between card-neon md:col-span-1 h-fit">
            <div>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Seu Saldo</p>
              <div className="flex items-center gap-4 my-4">
                <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center border border-red-500/30 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                  <Coins className="w-9 h-9 text-red-500" />
                </div>
                <div>
                  <p className="text-4xl font-black text-white tracking-tight">{user.forteCoins}</p>
                  <p className="text-xs text-slate-500">Fortecoins Acumulados</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-800">
              {isEligible ? (
                <div className="flex items-center gap-2 text-green-500 text-xs font-semibold bg-green-500/10 p-2.5 rounded-lg border border-green-500/20">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Conta Google vinculada com sucesso.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 text-yellow-500 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Atenção: Acesso Restrito</span>
                  </div>
                  <span>Você deve fazer login com o Google para acumular e resgatar Fortecoins!</span>
                </div>
              )}
            </div>
          </Card>

          {/* Card 2: Invite Link Section */}
          <Card className="bg-slate-900/60 border-red-600/20 backdrop-blur-md p-6 flex flex-col justify-between card-neon md:col-span-2">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">Compartilhe para ganhar desconto</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Ganhe <strong className="text-red-500 font-bold">15 Fortecoins</strong> para cada amigo convidado que se cadastrar e realizar a compra de um jogo!
                  </p>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-2">Seu Link de Indicação</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-sm font-mono text-slate-300 select-all truncate">
                    {window.location.origin}/?ref={user.id}
                  </div>
                  <Button onClick={handleCopyLink} className="bg-red-600 hover:bg-red-700 text-white font-bold h-12 px-6 rounded-xl shrink-0 flex gap-2">
                    <Copy className="w-4 h-4" />
                    Copiar Link
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-800 text-center text-[10px] text-slate-400">
              <div>
                <span className="block text-red-500 font-bold text-base mb-0.5">1</span>
                <span>Compartilhe o Link</span>
              </div>
              <div>
                <span className="block text-red-500 font-bold text-base mb-0.5">2</span>
                <span>Amigo compra jogo</span>
              </div>
              <div>
                <span className="block text-red-500 font-bold text-base mb-0.5">3</span>
                <span>Ganhe +15 Fortecoins</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800">
              <label className="text-[10px] text-green-500 font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Comunidade VIP
              </label>
              <div className="bg-slate-950/50 border border-green-500/20 p-3 rounded-lg flex flex-col sm:flex-row items-center gap-3">
                <p className="text-[11px] sm:text-xs text-slate-300 font-medium flex-1 m-0">
                  Entre no nosso grupo do WhatsApp para ficar por dentro das promoções em primeira mão!
                </p>
                <Button 
                  onClick={() => window.open("https://chat.whatsapp.com/GczvlmlbhRk4rPak1pcaL3?s=cl&p=a&ilr=2", "_blank")} 
                  className="w-full sm:w-auto bg-[#25D366] hover:bg-[#1ebd5b] text-white font-bold h-8 sm:h-9 px-3 sm:px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-green-500/20 transition-all shrink-0 text-[10px] sm:text-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Entrar no Grupo
                </Button>
              </div>
            </div>
          </Card>

        </div>

        {/* Guia Como Funciona as ForteCoins */}
        <Card className="bg-slate-900/40 border-slate-800 p-6 mb-10 card-neon">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
            <div className="w-10 h-10 bg-red-950 border border-red-500/30 rounded-lg flex items-center justify-center text-red-500">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Como funciona o Programa ForteCoins?</h3>
              <p className="text-slate-400 text-xs sm:text-sm">Entenda como acumular, as regras de expiração e como usar suas moedas virtuais</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Como Ganhar */}
            <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
              <p className="text-red-500 font-bold text-sm sm:text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-950 text-red-500 flex items-center justify-center font-black text-xs">1</span>
                Como Acumular Moedas
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-350 list-none pl-0">
                <li className="flex items-start gap-2">
                  <span className="text-red-500">🛒</span>
                  <span><strong>Cashback de Compra:</strong> Cada compra realizada de jogo digital na Eforte Games adiciona automaticamente <strong>+7 ForteCoins</strong> na sua carteira.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">👥</span>
                  <span><strong>Indique Amigos:</strong> Compartilhe seu link exclusivo. Quando seu amigo se cadastrar e efetuar a primeira compra de jogo, você ganha <strong>+15 ForteCoins</strong>.</span>
                </li>
              </ul>
            </div>

            {/* Regras e Validade */}
            <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
              <p className="text-red-500 font-bold text-sm sm:text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-950 text-red-500 flex items-center justify-center font-black text-xs">2</span>
                Regras e Validade
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-350 list-none pl-0">
                <li className="flex items-start gap-2">
                  <span className="text-red-500">⏳</span>
                  <span><strong>Validade de 90 dias:</strong> As moedas acumuladas expiram após 90 dias da data de ganho e são removidas automaticamente da sua conta.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">🔐</span>
                  <span><strong>Conta Google Obrigatória:</strong> Apenas usuários autenticados via login social do Google são elegíveis para ganhar e resgatar prêmios por segurança.</span>
                </li>
              </ul>
            </div>

            {/* Como Resgatar */}
            <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
              <p className="text-red-500 font-bold text-sm sm:text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-950 text-red-500 flex items-center justify-center font-black text-xs">3</span>
                Como Resgatar Prêmios
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-350 list-none pl-0">
                <li className="flex items-start gap-2">
                  <span className="text-red-500">🎁</span>
                  <span><strong>Loja de Resgate:</strong> Troque suas moedas por Gift Cards da Steam, PSN, Xbox, Netflix ou jogos digitais PC logo abaixo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">💸</span>
                  <span><strong>Descontos na Loja:</strong> Use suas moedas diretamente no carrinho de compras da Loja Própria para obter descontos imediatos (10 moedas = R$ 1,00 de desconto).</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Rewards Catalog */}
        <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6 flex items-center gap-2 uppercase tracking-tight italic">
          <Gift className="text-red-500 w-5 h-5 sm:w-6 sm:h-6" /> Loja de Resgate
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {prizesList.map((prize) => (
            <Card key={prize.id} className="bg-slate-900 border-slate-800 hover:border-red-600/30 overflow-hidden flex flex-col justify-between transition-all group card-neon">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] bg-red-600/20 text-red-500 px-2 py-1 rounded font-bold uppercase tracking-wider">
                    {prize.badge}
                  </span>
                  <div className="flex items-center gap-1 text-red-500 font-black">
                    <Coins className="w-4 h-4" />
                    <span>{prize.cost} FC</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-red-400 transition-colors">{prize.name}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{prize.description}</p>
              </div>
              <div className="p-6 pt-0">
                <Button 
                  onClick={() => handleRedeem(prize)}
                  disabled={redeemingId !== null || user.forteCoins < prize.cost || !isEligible}
                  className={`w-full py-6 rounded-xl font-bold ${
                    user.forteCoins >= prize.cost && isEligible
                      ? "bg-red-700 hover:bg-red-800 text-white shadow-[0_4px_12px_rgba(220,38,38,0.2)]" 
                      : "bg-slate-800 text-slate-500 cursor-not-allowed border-none"
                  }`}
                >
                  {redeemingId === prize.id ? "Processando..." : 
                   !isEligible ? "Google Auth Necessária" :
                   user.forteCoins < prize.cost ? "Saldo Insuficiente" : "Resgatar Prêmio"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Referrals and claims history */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Invited Friends List */}
          <Card className="bg-slate-900/40 border-slate-800 p-4 sm:p-6 flex flex-col h-72 sm:h-[400px]">
            <h3 className="text-lg font-bold text-white mb-4 border-l-4 border-red-600 pl-3 uppercase tracking-wider text-sm italic">
              Amigos Indicados ({referrals.length})
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {referrals.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-sm">
                  <HelpCircle className="w-12 h-12 mb-2 opacity-30" />
                  Nenhum amigo indicado ainda. Compartilhe seu link!
                </div>
              ) : (
                referrals.map(ref => (
                  <div key={ref.id} className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white text-sm">{ref.inviteeName}</p>
                      <p className="text-[10px] text-slate-500">{ref.inviteeEmail}</p>
                    </div>
                    <div>
                      {ref.status === "pendente" ? (
                        <span className="flex items-center gap-1 text-[10px] bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-yellow-500/20">
                          <Clock className="w-3 h-3" />
                          Aguardando Compra
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-500 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-green-500/20">
                          <CheckCircle className="w-3 h-3" />
                          Pago (+15 FC)
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Redemption History */}
          <Card className="bg-slate-900/40 border-slate-800 p-4 sm:p-6 flex flex-col h-72 sm:h-[400px]">
            <h3 className="text-lg font-bold text-white mb-4 border-l-4 border-red-600 pl-3 uppercase tracking-wider text-sm italic">
              Meus Resgates ({redemptions.length})
            </h3>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {redemptions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-sm">
                  <Gift className="w-12 h-12 mb-2 opacity-30" />
                  Nenhum resgate efetuado ainda.
                </div>
              ) : (
                redemptions.map(red => (
                  <div key={red.id} className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white text-sm">{red.prizeName}</p>
                        <p className="text-[10px] text-slate-500">Resgatado em {new Date(red.createdAt).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div>
                        {red.status === "pendente" ? (
                          <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-yellow-500/20">
                            Pendente
                          </span>
                        ) : red.status === "recusado" ? (
                          <span className="text-[10px] bg-red-500/10 text-red-500 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-red-500/20">
                            Recusado
                          </span>
                        ) : (
                          <span className="text-[10px] bg-green-500/10 text-green-500 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-green-500/20">
                            Entregue
                          </span>
                        )}
                      </div>
                    </div>

                    {red.status === "entregue" && red.code && (
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 flex justify-between items-center gap-2">
                        <span className="text-xs font-mono text-green-400 select-all truncate">
                          Código: {red.code}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            navigator.clipboard.writeText(red.code);
                            toast.success("Código copiado!");
                          }}
                          className="h-7 text-slate-400 hover:text-white"
                        >
                          Copiar
                        </Button>
                      </div>
                    )}

                    {red.status === "recusado" && red.code && (
                      <div className="bg-red-950/20 p-2.5 rounded-lg border border-red-900/30">
                        <span className="text-xs font-semibold text-red-400">
                          Motivo da recusa: {red.code}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

        </div>
      </main>
    </div>
  );
}
