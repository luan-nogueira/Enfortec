import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { ArrowLeft, Coins, Copy, Gift, HelpCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react";
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
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

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
      <nav className="bg-slate-950/90 backdrop-blur-md border-b border-red-700/20 sticky top-0 z-50 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Coins className="w-7 h-7 text-red-500 animate-bounce" />
              FORTE<span className="text-red-500">COINS</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-red-950/40 border border-red-600/30 px-4 py-2 rounded-xl">
            <Coins className="w-5 h-5 text-red-500" />
            <span className="font-bold text-white text-lg">{user.forteCoins} FC</span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-10 max-w-6xl">
        {/* Top Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          {/* Card 1: Balance Wallet */}
          <Card className="bg-slate-900/60 border-red-600/20 backdrop-blur-md p-6 flex flex-col justify-between card-neon md:col-span-1">
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
                  <h3 className="text-lg font-bold text-white">Indique amigos & Ganhe Prêmios</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Ganhe <strong className="text-red-500 font-bold">100 Fortecoins</strong> para cada amigo convidado que se cadastrar e realizar a compra de um jogo!
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
                <span>Ganhe +100 Fortecoins</span>
              </div>
            </div>
          </Card>

        </div>

        {/* Rewards Catalog */}
        <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2 uppercase tracking-tight italic">
          <Gift className="text-red-500 w-6 h-6" /> Loja de Resgate de Prêmios
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {PREDEFINED_PRIZES.map((prize) => (
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
          <Card className="bg-slate-900/40 border-slate-800 p-6 flex flex-col h-[400px]">
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
                          Pago (+100 FC)
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Redemption History */}
          <Card className="bg-slate-900/40 border-slate-800 p-6 flex flex-col h-[400px]">
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
