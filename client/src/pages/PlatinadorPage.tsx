import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import UserProfileButton from "@/components/UserProfileButton";
import { Trophy, Flame, ShieldCheck, CheckCircle, Coins, MessageSquare, ExternalLink, Zap, Star, Gamepad2, ArrowLeft, Clock, Sparkles, Check, AlertCircle, Award } from "lucide-react";

export default function PlatinadorPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Local state for modals & forms
  const [psnInput, setPsnInput] = useState("");
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isUpdatingPsn, setIsUpdatingPsn] = useState(false);

  // Queries
  const statusQuery = trpc.platinador.getStatus.useQuery(undefined, {
    enabled: !!user,
  });
  const challengesQuery = trpc.platinador.listChallenges.useQuery();
  const submissionsQuery = trpc.platinador.getUserSubmissions.useQuery(undefined, {
    enabled: !!user,
  });

  // Mutations
  const updatePsnMutation = trpc.platinador.updatePsnId.useMutation({
    onSuccess: (data) => {
      toast.success(`PSN ID atualizado para "${data.psnId}"!`);
      statusQuery.refetch();
      setIsUpdatingPsn(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar PSN ID");
      setIsUpdatingPsn(false);
    },
  });

  const subscribeMutation = trpc.platinador.subscribe.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      statusQuery.refetch();
      setIsSubscribing(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao processar assinatura");
      setIsSubscribing(false);
    },
  });

  const submitPlatinumMutation = trpc.platinador.submitPlatinum.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      submissionsQuery.refetch();
      setSelectedChallenge(null);
      setProofUrl("");
      setIsSubmitting(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao enviar comprovação");
      setIsSubmitting(false);
    },
  });

  const handleUpdatePsn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!psnInput.trim()) return toast.error("Insira uma PSN ID válida");
    setIsUpdatingPsn(true);
    updatePsnMutation.mutate({ psnId: psnInput.trim() });
  };

  const handleSubscribe = async () => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    setIsSubscribing(true);
    try {
      const idToken = user.firebaseUser ? await user.firebaseUser.getIdToken() : "";
      const res = await fetch("/api/infinitepay/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name: "Assinatura Clube Platinador - R$ 15/mês",
          price: 15.00,
          quantity: 1,
          productType: "platinador",
          redirectUrl: `${window.location.origin}/platinador`
        })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        subscribeMutation.mutate();
      }
    } catch {
      subscribeMutation.mutate();
    }
  };

  const handleSubmitProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    const currentPsn = psnInput.trim() || statusQuery.data?.psnId || "";
    if (!currentPsn) {
      return toast.error("Por favor, preencha sua PSN ID antes de enviar a comprovação.");
    }
    if (!proofUrl.trim()) {
      return toast.error("Insira o link/URL com a imagem ou print de comprovação da platina.");
    }
    setIsSubmitting(true);
    submitPlatinumMutation.mutate({
      challengeId: selectedChallenge.id,
      proofUrl: proofUrl.trim(),
      psnId: currentPsn,
    });
  };

  const isSubscribed = statusQuery.data?.isSubscribed || false;
  const userPsnId = statusQuery.data?.psnId || "";
  const forteCoins = statusQuery.data?.forteCoins ?? (user?.forteCoins || 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      {/* Header Bar */}
      <header className="border-b border-[#dc143c]/20 bg-[#121212]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              className="text-gray-400 hover:text-white hover:bg-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation("/")}>
              <div className="bg-gradient-to-tr from-[#dc143c] to-[#ff4d6d] p-2 rounded-xl shadow-lg shadow-[#dc143c]/20">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                Área do <span className="text-[#dc143c]">Platinador</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden sm:flex items-center gap-2 bg-[#1a1a1a] border border-[#dc143c]/30 px-3 py-1.5 rounded-full text-xs font-semibold">
                <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-amber-400 font-bold">{forteCoins}</span>
                <span className="text-gray-400">ForteCoins</span>
              </div>
            )}
            {user ? (
              <UserProfileButton />
            ) : (
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                className="bg-[#dc143c] hover:bg-[#b01030] text-white font-semibold text-sm px-5 py-2 rounded-xl shadow-lg shadow-[#dc143c]/20"
              >
                Entrar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 space-y-12">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c080e] via-[#121212] to-[#0a0a0a] border border-[#dc143c]/30 p-5 sm:p-8 lg:p-12 shadow-2xl shadow-[#dc143c]/10">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#dc143c]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#dc143c]/10 border border-[#dc143c]/30 text-[#ff4d6d] text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Clube Exclusivo de Troféus
              </div>
              <h1 className="text-2xl sm:text-5xl font-black tracking-tight leading-tight">
                Jogue, Platine e Ganhe <span className="text-[#dc143c] drop-shadow-[0_0_15px_rgba(220,20,60,0.5)]">Descontos Reais</span> na Loja!
              </h1>
              <p className="text-gray-300 text-sm sm:text-lg leading-relaxed">
                Faça parte do <strong className="text-white">Clube do Platinador Eforte Games</strong> por apenas <span className="text-emerald-400 font-extrabold">R$ 15,00/mês</span>. Tenha acesso a um <strong className="text-[#ff4d6d]">Grupo VIP de WhatsApp</strong>, cumpra desafios semanais na PSN e acumule <strong className="text-amber-400">ForteCoins</strong> para abater em qualquer jogo ou produto!
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                {!isSubscribed ? (
                  <Button
                    onClick={handleSubscribe}
                    disabled={isSubscribing}
                    className="w-full sm:w-auto bg-gradient-to-r from-[#dc143c] to-[#ff4d6d] hover:from-[#b01030] hover:to-[#dc143c] text-white font-extrabold text-sm sm:text-base px-5 sm:px-8 py-4 sm:py-6 rounded-2xl shadow-xl shadow-[#dc143c]/30 transition-all hover:scale-105 whitespace-normal h-auto text-center flex items-center justify-center"
                  >
                    <Trophy className="w-5 h-5 mr-2 shrink-0" />
                    {isSubscribing ? "Processando..." : "Assinar Clube Platinador — R$ 15,00/mês"}
                  </Button>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-sm py-2 px-4 rounded-xl flex items-center gap-2 font-bold">
                      <CheckCircle className="w-4 h-4" /> Membro Platinador VIP Ativo
                    </Badge>
                    {statusQuery.data?.vipWhatsappUrl && (
                      <a
                        href={statusQuery.data.vipWhatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Acessar Grupo VIP no WhatsApp
                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* STATUS / PSN ID CARD */}
            <div className="lg:col-span-5">
              <Card className="bg-[#141414]/90 border-[#dc143c]/30 backdrop-blur-xl shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                    <Gamepad2 className="w-5 h-5 text-[#dc143c]" /> Seu Perfil de Platinador
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-xs">
                    Vincule sua ID da PSN para validação das platinas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                      Sua PSN Online ID (NIC / Tag)
                    </label>
                    <form onSubmit={handleUpdatePsn} className="flex gap-2">
                      <Input
                        value={psnInput || userPsnId}
                        onChange={(e) => setPsnInput(e.target.value)}
                        placeholder="Ex: SeuNomePSN_BR"
                        className="bg-[#0a0a0a] border-[#dc143c]/30 text-white focus:border-[#dc143c] text-sm"
                      />
                      <Button
                        type="submit"
                        disabled={isUpdatingPsn}
                        className="bg-[#dc143c] hover:bg-[#b01030] text-white text-xs px-4"
                      >
                        {isUpdatingPsn ? "Salvando..." : "Salvar"}
                      </Button>
                    </form>
                    {userPsnId && (
                      <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> ID da PSN cadastrada: <strong>{userPsnId}</strong>
                      </p>
                    )}
                  </div>

                  <div className="border-t border-gray-800 pt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Status da Assinatura:</span>
                      <span className={isSubscribed ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                        {isSubscribed ? "Ativa (R$ 15/mês)" : "Não Assinado"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Saldo ForteCoins:</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5" /> {forteCoins} coins
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* BENEFÍCIOS DO CLUBE */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Como funciona o <span className="text-[#dc143c]">Clube Platinador</span>?
            </h2>
            <p className="text-gray-400 text-sm max-w-2xl mx-auto">
              Ganhe prêmios e economize nos seus próximos jogos em apenas 4 passos simples
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#121212] border border-gray-800 p-6 rounded-2xl space-y-3 relative hover:border-[#dc143c]/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#dc143c]/10 text-[#dc143c] flex items-center justify-center font-black text-lg">
                1
              </div>
              <h3 className="font-bold text-white text-base">Assine por R$ 15/mês</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Faça parte do clube mensal e garante benefícios exclusivos e acesso imediato.
              </p>
            </div>

            <div className="bg-[#121212] border border-gray-800 p-6 rounded-2xl space-y-3 relative hover:border-[#dc143c]/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-lg">
                2
              </div>
              <h3 className="font-bold text-white text-base">Entre no Grupo VIP</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Troque dicas de troféus, guias de platina e receba os jogos desafiados do mês em primeira mão.
              </p>
            </div>

            <div className="bg-[#121212] border border-gray-800 p-6 rounded-2xl space-y-3 relative hover:border-[#dc143c]/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black text-lg">
                3
              </div>
              <h3 className="font-bold text-white text-base">Platine & Comprove</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Jogue o game determinado, platine na sua PSN ID e envie a comprovação pela nossa plataforma.
              </p>
            </div>

            <div className="bg-[#121212] border border-gray-800 p-6 rounded-2xl space-y-3 relative hover:border-[#dc143c]/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-black text-lg">
                4
              </div>
              <h3 className="font-bold text-white text-base">Ganhe ForteCoins & Troque</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Após aprovação, receba ForteCoins na conta para resgatar jogos digitais e descontos em compras!
              </p>
            </div>
          </div>
        </section>

        {/* DESAFIOS DE PLATINA EM DESTAQUE */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Flame className="w-6 h-6 text-[#dc143c]" /> Desafios de Platina Disponíveis
              </h2>
              <p className="text-gray-400 text-xs">
                Platine um destes jogos na sua conta PSN e envie a comprovação para receber suas ForteCoins
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challengesQuery.isLoading ? (
              <div className="col-span-full py-12 text-center text-gray-400">Carregando desafios...</div>
            ) : (
              challengesQuery.data?.map((challenge: any) => (
                <Card
                  key={challenge.id}
                  className="bg-[#121212] border-gray-800 hover:border-[#dc143c]/50 transition-all overflow-hidden flex flex-col group"
                >
                  <div className="relative h-48 overflow-hidden bg-black">
                    <img
                      src={challenge.imageUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800"}
                      alt={challenge.gameTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
                    <Badge className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white border-white/20 text-xs">
                      {challenge.platform}
                    </Badge>
                    <Badge className="absolute top-3 right-3 bg-amber-500 text-black font-extrabold text-xs flex items-center gap-1 shadow-md">
                      <Coins className="w-3.5 h-3.5 fill-black" /> +{challenge.rewardCoins} Coins
                    </Badge>
                  </div>

                  <CardHeader className="pt-4 pb-2">
                    <CardTitle className="text-lg font-bold text-white group-hover:text-[#dc143c] transition-colors">
                      {challenge.gameTitle}
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-xs line-clamp-2">
                      {challenge.description}
                    </CardDescription>
                  </CardHeader>

                  <CardFooter className="mt-auto pt-4 border-t border-gray-800/60">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => {
                            setSelectedChallenge(challenge);
                            setPsnInput(userPsnId);
                          }}
                          className="w-full bg-[#dc143c] hover:bg-[#b01030] text-white font-bold text-xs py-5 rounded-xl shadow-lg shadow-[#dc143c]/20"
                        >
                          <Trophy className="w-4 h-4 mr-2" /> Comprovar Platina
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#141414] border-[#dc143c]/30 text-white max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-400" /> Comprovação de Platina
                          </DialogTitle>
                          <DialogDescription className="text-gray-400 text-xs">
                            Enviar platina para: <strong className="text-white">{challenge.gameTitle}</strong> (+{challenge.rewardCoins} Coins)
                          </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmitProof} className="space-y-4 py-2">
                          <div>
                            <label className="text-xs font-semibold text-gray-300 block mb-1">
                              Sua PSN Online ID
                            </label>
                            <Input
                              value={psnInput}
                              onChange={(e) => setPsnInput(e.target.value)}
                              placeholder="Ex: SeuNomePSN_BR"
                              required
                              className="bg-[#0a0a0a] border-gray-800 text-white text-sm"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-300 block mb-1">
                              Link / URL da Foto de Comprovação
                            </label>
                            <Input
                              value={proofUrl}
                              onChange={(e) => setProofUrl(e.target.value)}
                              placeholder="Ex: https://imgur.com/sua-foto-platina.jpg"
                              required
                              className="bg-[#0a0a0a] border-gray-800 text-white text-sm"
                            />
                            <p className="text-[11px] text-gray-500 mt-1">
                              Você pode enviar o link do print no Imgur, Google Drive, Discord ou mídias sociais onde apareça seu troféu de platina e sua PSN ID.
                            </p>
                          </div>

                          <DialogFooter className="pt-2">
                            <Button
                              type="submit"
                              disabled={isSubmitting}
                              className="w-full bg-[#dc143c] hover:bg-[#b01030] text-white font-bold"
                            >
                              {isSubmitting ? "Enviando..." : "Enviar para Aprovação"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* HISTÓRICO DE SUBMISSÕES DO USUÁRIO */}
        {user && submissionsQuery.data && submissionsQuery.data.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-gray-800">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" /> Seu Histórico de Platinas Enviadas
            </h3>

            <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="divide-y divide-gray-800">
                {submissionsQuery.data.map((sub: any) => (
                  <div key={sub.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">
                          Desafio #{sub.challengeId}
                        </span>
                        <span className="text-xs text-gray-400">• PSN: {sub.psnId}</span>
                      </div>
                      <a
                        href={sub.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                      >
                        Ver imagem enviada <ExternalLink className="w-3 h-3" />
                      </a>
                      {sub.adminNotes && (
                        <p className="text-xs text-gray-400 italic">Nota admin: {sub.adminNotes}</p>
                      )}
                    </div>

                    <div>
                      {sub.status === "aprovado" && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                          + {sub.coinsAwarded} ForteCoins Aprovados
                        </Badge>
                      )}
                      {sub.status === "pendente" && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">
                          Em Análise
                        </Badge>
                      )}
                      {sub.status === "rejeitado" && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/40">
                          Rejeitado
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
