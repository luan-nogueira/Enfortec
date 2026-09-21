import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import UserProfileButton from "@/components/UserProfileButton";
import { db, storage } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Trophy, Flame, Coins, ExternalLink, Zap, Star, Gamepad2, ArrowLeft, Clock, Sparkles, Check, AlertCircle, Award, Upload, Image as ImageIcon, Medal, Users, Gift, Tag } from "lucide-react";

// Valor de cada ForteCoin no pagamento: 10 moedas = R$ 1,00 (mesma conta do checkout,
// server/_core/payment.ts). Se um dia isso mudar lá, muda aqui também.
const COIN_VALUE_BRL = 0.1;
const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Prêmios da loja de resgate (mesma coleção da página de ForteCoins). */
function usePrizes() {
  const [prizes, setPrizes] = useState<any[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "prizes"),
      (snap) => {
        setPrizes(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((p: any) => p.isActive !== false)
            .sort((a: any, b: any) => (a.cost || 0) - (b.cost || 0))
        );
      },
      () => setPrizes([])
    );
    return () => unsub();
  }, []);
  return prizes;
}

function useApprovedSubmissions() {
  const query = trpc.platinador.getApprovedSubmissions.useQuery();
  const approved = query.data || [];

  const byChallenge = new Map<number, typeof approved>();
  for (const sub of approved) {
    const list = byChallenge.get(sub.challengeId) || [];
    list.push(sub);
    byChallenge.set(sub.challengeId, list);
  }

  const byPlayer = new Map<string, { psnId: string; platinums: number; coins: number }>();
  for (const sub of approved) {
    const key = sub.psnId;
    const cur = byPlayer.get(key) || { psnId: sub.psnId, platinums: 0, coins: 0 };
    cur.platinums += 1;
    cur.coins += sub.coinsAwarded || 0;
    byPlayer.set(key, cur);
  }
  const ranking = Array.from(byPlayer.values()).sort((a, b) => b.platinums - a.platinums || b.coins - a.coins);

  return { isLoading: query.isLoading, byChallenge, ranking };
}

export default function PlatinadorPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Local state for modals & forms
  const [psnInput, setPsnInput] = useState("");
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingPsn, setIsUpdatingPsn] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const proofFileRef = useRef<HTMLInputElement>(null);

  const handleProofImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingProof(true);
    try {
      const fileRef = storageRef(storage, `platinador_proofs/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setProofUrl(url);
      toast.success("Imagem enviada com sucesso! URL preenchida automaticamente.");
    } catch (err: any) {
      toast.error("Erro ao fazer upload da imagem: " + (err.message || err));
    } finally {
      setIsUploadingProof(false);
    }
  };

  // Queries
  const statusQuery = trpc.platinador.getStatus.useQuery(undefined, {
    enabled: !!user,
  });
  const challengesQuery = trpc.platinador.listChallenges.useQuery();
  const submissionsQuery = trpc.platinador.getUserSubmissions.useQuery(undefined, {
    enabled: !!user,
  });
  const { byChallenge: completersByChallenge, ranking: platinadorRanking } = useApprovedSubmissions();
  const settingsQuery = trpc.settings.get.useQuery();
  const prizes = usePrizes();

  // Recompensa por platina, calculada a partir dos desafios que estão no ar — assim o texto
  // "o que você ganha" nunca fica diferente do que o admin cadastrou.
  const rewardValues = (challengesQuery.data || [])
    .map((c: any) => Number(c.rewardCoins) || 0)
    .filter((n: number) => n > 0);
  const minReward = rewardValues.length ? Math.min(...rewardValues) : 0;
  const maxReward = rewardValues.length ? Math.max(...rewardValues) : 0;
  // Teto de moedas por compra vem do servidor (configurável no admin), não é número fixo aqui.
  const maxCoinsPerPurchase: number | undefined = settingsQuery.data?.maxCoinsPerPurchase ?? undefined;
  const maxCoinsPreVenda: number | undefined = settingsQuery.data?.maxCoinsPreVenda ?? undefined;

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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 space-y-12 pb-36 lg:pb-16">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a060d] via-[#140508] to-[#0a0a0a] border border-[#dc143c]/40 p-5 sm:p-8 lg:p-12 shadow-2xl shadow-[#dc143c]/20">
          {/* Background Gaming Art & Trophy Glow */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1400')] bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#dc143c]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#dc143c]/20 border border-[#dc143c]/50 text-[#ff4d6d] text-xs font-black uppercase tracking-wider shadow-lg">
                <Trophy className="w-4 h-4 text-amber-400 animate-bounce" /> 🏆 Clube do Platinador Eforte Games
              </div>
              <h1 className="text-2xl sm:text-5xl font-black tracking-tight leading-tight">
                Jogue, Platine e Ganhe <span className="text-[#dc143c] drop-shadow-[0_0_15px_rgba(220,20,60,0.6)]">Prêmios & Descontos!</span>
              </h1>
              <p className="text-gray-200 text-sm sm:text-lg leading-relaxed">
                Participe dos <strong className="text-amber-400">Desafios de Platina abertos para todos</strong>, <strong className="text-white">de graça</strong>! Cumpra desafios na PSN, envie a comprovação, acumule <strong className="text-amber-400">ForteCoins</strong> para abater nas suas compras e entre no ranking de platinadores.
              </p>
              {/* O que se ganha, em uma olhada */}
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-full">
                  <Check className="w-3.5 h-3.5" /> 100% grátis, sem mensalidade
                </span>
                {maxReward > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-full">
                    <Coins className="w-3.5 h-3.5" /> {minReward === maxReward ? `+${maxReward}` : `+${minReward} a ${maxReward}`} ForteCoins por platina
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 bg-[#dc143c]/10 border border-[#dc143c]/30 text-[#ff4d6d] px-3 py-1.5 rounded-full">
                  <Gift className="w-3.5 h-3.5" /> Troque por descontos e prêmios
                </span>
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

        {/* O QUE VOCÊ GANHA */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              O que você <span className="text-[#dc143c]">ganha</span> no Clube
            </h2>
            <p className="text-gray-400 text-sm max-w-2xl mx-auto">
              Participar é grátis. Cada platina aprovada vira ForteCoins — e as ForteCoins viram desconto ou prêmio.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. ForteCoins por platina */}
            <div className="bg-[#121212] border border-amber-500/30 p-5 rounded-2xl space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Por cada platina aprovada</p>
              {maxReward > 0 ? (
                <>
                  <p className="text-2xl font-black text-amber-400">
                    +{minReward === maxReward ? maxReward : `${minReward} a ${maxReward}`} <span className="text-sm font-bold">ForteCoins</span>
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {minReward === maxReward
                      ? `Equivale a ${formatBRL(maxReward * COIN_VALUE_BRL)} em desconto.`
                      : `De ${formatBRL(minReward * COIN_VALUE_BRL)} a ${formatBRL(maxReward * COIN_VALUE_BRL)} em desconto, conforme o desafio.`}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400 leading-relaxed">
                  Cada desafio mostra quantas ForteCoins você recebe ao ter a platina aprovada.
                </p>
              )}
            </div>

            {/* 2. Desconto nas compras */}
            <div className="bg-[#121212] border border-emerald-500/30 p-5 rounded-2xl space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Desconto nas suas compras</p>
              <p className="text-2xl font-black text-emerald-400">
                10 FC = {formatBRL(10 * COIN_VALUE_BRL)}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Use suas moedas na hora de pagar.
                {maxCoinsPerPurchase !== undefined
                  ? ` Você pode usar até ${maxCoinsPerPurchase} ForteCoins por compra (${formatBRL(maxCoinsPerPurchase * COIN_VALUE_BRL)} de desconto)${maxCoinsPreVenda ? `, e até ${maxCoinsPreVenda} em pré-venda` : ""}.`
                  : " Há um limite de moedas por compra."}
              </p>
            </div>

            {/* 3. Prêmios */}
            <div className="bg-[#121212] border border-purple-500/30 p-5 rounded-2xl space-y-2 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Prêmios de verdade</p>
              <p className="text-2xl font-black text-purple-300">Loja de resgate</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Troque suas ForteCoins por prêmios, como gift card, jogo e PS Plus. O resgate exige login com a conta Google.
              </p>
              <button
                type="button"
                onClick={() => setLocation("/fortecoins")}
                className="mt-auto pt-1 text-left text-xs font-bold text-purple-300 hover:text-white transition-colors"
              >
                Ver loja de resgate →
              </button>
            </div>

            {/* 4. Ranking */}
            <div className="bg-[#121212] border border-[#dc143c]/30 p-5 rounded-2xl space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#dc143c]/10 text-[#dc143c] flex items-center justify-center">
                <Medal className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Reconhecimento</p>
              <p className="text-2xl font-black text-[#ff4d6d]">Ranking</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Sua PSN ID entra no Ranking dos Platinadores e aparece no mural de quem já conquistou cada desafio.
              </p>
            </div>
          </div>

          {/* Prévia dos prêmios: mostra quanto falta, em platinas, para cada um */}
          {prizes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-400" /> O que dá pra resgatar com suas ForteCoins
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {prizes.slice(0, 6).map((prize: any) => {
                  const cost = Number(prize.cost) || 0;
                  const soldOut = typeof prize.stock === "number" && prize.stock <= 0;
                  const platinumsNeeded = minReward > 0 ? Math.ceil(cost / minReward) : 0;
                  const missing = user ? Math.max(0, cost - forteCoins) : cost;
                  return (
                    <div
                      key={prize.id}
                      className={`bg-[#121212] border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-3 ${soldOut ? "opacity-50" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{prize.name}</p>
                        <p className="text-[11px] text-gray-500">
                          {soldOut
                            ? "Esgotado no momento"
                            : user && missing === 0
                            ? "Você já tem moedas para resgatar!"
                            : user
                            ? `Faltam ${missing} ForteCoins`
                            : platinumsNeeded > 0
                            ? `≈ ${platinumsNeeded} platina${platinumsNeeded !== 1 ? "s" : ""}`
                            : ""}
                        </p>
                      </div>
                      <span className="shrink-0 flex items-center gap-1 text-amber-400 font-black text-sm">
                        <Coins className="w-4 h-4" /> {cost}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-center text-[11px] text-gray-500 max-w-2xl mx-auto">
            A platina é conferida pela nossa equipe antes de as ForteCoins entrarem na sua carteira. As ForteCoins expiram 90 dias depois de ganhas.
          </p>
        </section>

        {/* COMO FUNCIONA */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Como funciona o <span className="text-[#dc143c]">Clube Platinador</span>?
            </h2>
            <p className="text-gray-400 text-sm max-w-2xl mx-auto">
              Ganhe prêmios e economize nos seus próximos jogos em 3 passos simples — sem mensalidade
            </p>
          </div>

          <div className="grid sm:grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#121212] border border-gray-800 p-6 rounded-2xl space-y-3 relative hover:border-[#dc143c]/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#dc143c]/10 text-[#dc143c] flex items-center justify-center font-black text-lg">
                1
              </div>
              <h3 className="font-bold text-white text-base">Vincule sua PSN ID</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Cadastre sua ID da PSN aqui na plataforma pra gente validar suas platinas.
              </p>
            </div>

            <div className="bg-[#121212] border border-gray-800 p-6 rounded-2xl space-y-3 relative hover:border-[#dc143c]/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black text-lg">
                2
              </div>
              <h3 className="font-bold text-white text-base">Platine & Comprove</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Jogue o game determinado, platine na sua PSN ID e envie a comprovação pela nossa plataforma.
              </p>
            </div>

            <div className="bg-[#121212] border border-gray-800 p-6 rounded-2xl space-y-3 relative hover:border-[#dc143c]/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-black text-lg">
                3
              </div>
              <h3 className="font-bold text-white text-base">Aprovação, Coins & Ranking</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Depois que a equipe confere, as ForteCoins caem na sua carteira e você entra no ranking. Aí é só usar no pagamento das compras ou trocar por prêmios!
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
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full">
              <Sparkles className="w-4 h-4 text-amber-400" /> Aberto para Todos
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
                    {/* O que o cliente leva ao platinar este jogo */}
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs">
                      <span className="text-amber-300 font-bold flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5" /> Você ganha +{challenge.rewardCoins} ForteCoins
                      </span>
                      <span className="text-gray-400 shrink-0">≈ {formatBRL((Number(challenge.rewardCoins) || 0) * COIN_VALUE_BRL)}</span>
                    </div>
                    {challenge.deadline && (
                      <p className="text-[11px] text-gray-500 flex items-center gap-1.5 pt-1">
                        <Clock className="w-3 h-3" /> Prazo: {new Date(challenge.deadline).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    {(() => {
                      const completers = completersByChallenge.get(challenge.id) || [];
                      if (completers.length === 0) return null;
                      return (
                        <div className="pt-2 mt-1 border-t border-gray-800/60">
                          <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 mb-1">
                            <Users className="w-3.5 h-3.5" /> {completers.length} platinador{completers.length !== 1 ? "es" : ""} já conquistou{completers.length !== 1 ? "aram" : ""} essa
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {completers.slice(0, 6).map((c, i) => (
                              <span key={i} className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                                {c.psnId}
                              </span>
                            ))}
                            {completers.length > 6 && (
                              <span className="text-[10px] text-gray-500 px-1.5 py-0.5">+{completers.length - 6}</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
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
                              Comprovação de Platina (Imagem ou URL)
                            </label>

                            {/* Upload de imagem */}
                            <div className="mb-2">
                              <input
                                ref={proofFileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleProofImageUpload}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={isUploadingProof}
                                onClick={() => proofFileRef.current?.click()}
                                className="w-full border border-dashed border-gray-700 hover:border-[#dc143c]/50 bg-[#0a0a0a] hover:bg-[#dc143c]/5 text-gray-400 hover:text-white text-xs h-10 flex items-center justify-center gap-2 rounded-lg transition-all"
                              >
                                {isUploadingProof ? (
                                  <><span className="animate-spin">⏳</span> Enviando imagem...</>
                                ) : (
                                  <><Upload className="w-4 h-4" /> Fazer Upload da Imagem (recomendado)</>
                                )}
                              </Button>
                            </div>

                            {/* Preview se imagem carregada */}
                            {proofUrl && proofUrl.startsWith("http") && (
                              <div className="mb-2 rounded-lg overflow-hidden border border-gray-800 max-h-32">
                                <img src={proofUrl} alt="Preview" className="w-full h-32 object-cover" />
                              </div>
                            )}

                            {/* Campo URL manual */}
                            <label className="text-[10px] text-gray-500 block mb-1">Ou cole o link/URL da foto:</label>
                            <Input
                              value={proofUrl}
                              onChange={(e) => setProofUrl(e.target.value)}
                              placeholder="Ex: https://imgur.com/sua-foto-platina.jpg"
                              required
                              className="bg-[#0a0a0a] border-gray-800 text-white text-sm"
                            />
                            <p className="text-[11px] text-gray-500 mt-1">
                              Envie o print onde apareça seu troféu de platina e sua PSN ID.
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

        {/* RANKING DE PLATINADORES */}
        {platinadorRanking.length > 0 && (
          <section className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center justify-center gap-2">
                <Medal className="w-7 h-7 text-amber-400" /> Ranking de <span className="text-[#dc143c]">Platinadores</span>
              </h2>
              <p className="text-gray-400 text-sm max-w-2xl mx-auto">
                Quem mais platinou no Clube Eforte Games até agora
              </p>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden max-w-2xl mx-auto">
              <div className="divide-y divide-gray-800">
                {platinadorRanking.slice(0, 10).map((player, index) => (
                  <div key={player.psnId} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                        index === 0 ? "bg-amber-400 text-black" :
                        index === 1 ? "bg-gray-300 text-black" :
                        index === 2 ? "bg-amber-700 text-white" :
                        "bg-gray-800 text-gray-400"
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-bold text-white text-sm">{player.psnId}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-gray-300 font-semibold">
                        <Trophy className="w-3.5 h-3.5 text-[#dc143c]" /> {player.platinums} platina{player.platinums !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                        <Coins className="w-3.5 h-3.5" /> {player.coins}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* HISTÓRICO DE SUBMISSÕES DO USUÁRIO */}
        {user && submissionsQuery.data && submissionsQuery.data.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-gray-800">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" /> Seu Histórico de Platinas Enviadas
            </h3>

            <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="divide-y divide-gray-800">
                {submissionsQuery.data.map((sub: any) => {
                  const challenge = challengesQuery.data?.find((ch: any) => ch.id === sub.challengeId);
                  return (
                  <div key={sub.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">
                          {challenge?.gameTitle || `Desafio #${sub.challengeId}`}
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
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
