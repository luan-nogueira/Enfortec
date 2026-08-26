import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "@/lib/firebase";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, query, orderBy, serverTimestamp, addDoc, getDoc } from "firebase/firestore";
import { useLocation } from "wouter";
import { Shield, User, UserCheck, UserPlus, ArrowLeft, Plus, X, Lock, Mail, Trash2, MessageCircle, Send, Coins, Gift, Check, Clock, LogOut, Gamepad2, Edit, Menu, BarChart3, Users, ShoppingBag, Tag, Image, Percent, Ban, Trophy, ExternalLink, Flame, Copy, Settings, Bell, Filter, CheckCircle2, ShieldAlert, Package, Store, Star, MapPin, Search } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";
import SellerChatsPanel from "@/components/SellerChatsPanel";
import { STORE_SELLER_NAME } from "@/lib/sellerChat";
import { getStoreStatus } from "@/lib/storeHours";
import {
  notifyAdmin,
  playNotificationChime,
  requestNotificationPermission,
  getNotificationPermission,
  NotificationPermissionState,
} from "@/lib/soundAndNotifications";

function PlatinadorAdminTab() {
  const [gameTitle, setGameTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardCoins, setRewardCoins] = useState("500");
  const [imageUrl, setImageUrl] = useState("");
  const [platform, setPlatform] = useState("PS4 / PS5");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para edição de desafio
  const [editingChallenge, setEditingChallenge] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCoins, setEditCoins] = useState("500");
  const [editImage, setEditImage] = useState("");
  const [editPlatform, setEditPlatform] = useState("PS4 / PS5");
  const [editStatus, setEditStatus] = useState<"ativo" | "encerrado" | "brevemente">("ativo");

  // Modal genérico pra substituir os prompt() nativos do navegador (feios e fora do
  // padrão visual) por um input com o mesmo tema do resto do painel.
  const [promptModal, setPromptModal] = useState<{
    title: string;
    placeholder?: string;
    confirmLabel?: string;
    onConfirm: (value: string) => void;
  } | null>(null);
  const [promptValue, setPromptValue] = useState("");

  const openPrompt = (config: { title: string; defaultValue?: string; placeholder?: string; confirmLabel?: string; onConfirm: (value: string) => void }) => {
    setPromptValue(config.defaultValue || "");
    setPromptModal({ title: config.title, placeholder: config.placeholder, confirmLabel: config.confirmLabel, onConfirm: config.onConfirm });
  };

  const confirmPrompt = () => {
    if (!promptModal) return;
    promptModal.onConfirm(promptValue);
    setPromptModal(null);
  };

  const challengesQuery = trpc.platinador.listChallenges.useQuery();
  const submissionsQuery = trpc.platinador.adminListSubmissions.useQuery();

  // Link do Grupo VIP no WhatsApp — mesmo campo (platformSettings.vipWhatsappUrl) já
  // editável em "Sistema > Link WhatsApp & ForteCoins", replicado aqui pra ficar junto
  // do resto da gestão do Clube Platinador.
  const platformSettingsQuery = trpc.settings.get.useQuery();
  const [vipWhatsappUrlInput, setVipWhatsappUrlInput] = useState("");
  useEffect(() => {
    if (platformSettingsQuery.data?.vipWhatsappUrl !== undefined) {
      setVipWhatsappUrlInput(platformSettingsQuery.data.vipWhatsappUrl || "");
    }
  }, [platformSettingsQuery.data?.vipWhatsappUrl]);

  const updateWhatsappUrlMutation = trpc.settings.updateWhatsappUrl.useMutation({
    onSuccess: () => {
      toast.success("Link do Grupo VIP salvo com sucesso!");
      platformSettingsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar o link do grupo."),
  });

  const createChallengeMutation = trpc.platinador.adminCreateChallenge.useMutation({
    onSuccess: () => {
      toast.success("Desafio de platina cadastrado com sucesso!");
      setGameTitle("");
      setDescription("");
      setImageUrl("");
      setIsSubmitting(false);
      challengesQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar desafio");
      setIsSubmitting(false);
    },
  });

  const updateChallengeMutation = trpc.platinador.adminUpdateChallenge.useMutation({
    onSuccess: () => {
      toast.success("Desafio atualizado com sucesso!");
      setEditingChallenge(null);
      challengesQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar desafio");
    },
  });

  const deleteChallengeMutation = trpc.platinador.adminDeleteChallenge.useMutation({
    onSuccess: () => {
      toast.success("Desafio excluído com sucesso!");
      challengesQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir desafio");
    },
  });

  const approveMutation = trpc.platinador.adminApproveSubmission.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message);
      submissionsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao aprovar platina");
    },
  });

  const rejectMutation = trpc.platinador.adminRejectSubmission.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message);
      submissionsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao rejeitar");
    },
  });

  const updateSubmissionMutation = trpc.platinador.adminUpdateSubmission.useMutation({
    onError: (err: any) => toast.error(err.message || "Erro ao atualizar."),
  });

  const deleteSubmissionMutation = trpc.platinador.adminDeleteSubmission.useMutation({
    onError: (err: any) => toast.error(err.message || "Erro ao remover."),
  });

  // Ranking do Clube: agrupa as submissões aprovadas por PSN ID (mesma lógica
  // da página pública), mas guardando os IDs das submissões pra permitir
  // editar/remover o jogador diretamente daqui.
  const platinadorRanking = useMemo(() => {
    const map = new Map<string, { psnId: string; platinums: number; coins: number; submissionIds: number[] }>();
    (submissionsQuery.data || []).forEach((sub: any) => {
      if (sub.status !== "aprovado") return;
      const cur = map.get(sub.psnId) || { psnId: sub.psnId, platinums: 0, coins: 0, submissionIds: [] as number[] };
      cur.platinums += 1;
      cur.coins += sub.coinsAwarded || 0;
      cur.submissionIds.push(sub.id);
      map.set(sub.psnId, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.platinums - a.platinums || b.coins - a.coins);
  }, [submissionsQuery.data]);

  const handleEditSubmissionPsnId = (submissionId: number, currentPsnId: string) => {
    openPrompt({
      title: "Novo PSN ID",
      defaultValue: currentPsnId,
      confirmLabel: "Salvar",
      onConfirm: (newPsnId) => {
        if (!newPsnId.trim() || newPsnId.trim() === currentPsnId) return;
        updateSubmissionMutation.mutate(
          { submissionId, psnId: newPsnId.trim() },
          { onSuccess: () => { submissionsQuery.refetch(); toast.success("PSN ID atualizado!"); } }
        );
      },
    });
  };

  const handleDeleteSubmission = (sub: any) => {
    toast(`Remover esta platina de "${sub.psnId}" do ranking?${sub.coinsAwarded ? ` Estorna ${sub.coinsAwarded} ForteCoins do saldo dele.` : ""}`, {
      action: {
        label: "Remover",
        onClick: () => {
          deleteSubmissionMutation.mutate(
            { submissionId: sub.id },
            { onSuccess: () => { submissionsQuery.refetch(); toast.success("Platina removida do ranking."); } }
          );
        },
      },
    });
  };

  const handleRenamePlayer = (player: { psnId: string; submissionIds: number[] }) => {
    openPrompt({
      title: "Novo PSN ID",
      defaultValue: player.psnId,
      confirmLabel: "Salvar",
      onConfirm: (newPsnId) => {
        if (!newPsnId.trim() || newPsnId.trim() === player.psnId) return;
        Promise.all(
          player.submissionIds.map(id => updateSubmissionMutation.mutateAsync({ submissionId: id, psnId: newPsnId.trim() }))
        ).then(() => {
          submissionsQuery.refetch();
          toast.success("PSN ID atualizado no ranking!");
        });
      },
    });
  };

  const handleRemovePlayer = (player: { psnId: string; platinums: number; coins: number; submissionIds: number[] }) => {
    toast(`Remover "${player.psnId}" do ranking? Isso apaga ${player.platinums} platina(s) aprovada(s) e estorna ${player.coins} ForteCoins do saldo dele.`, {
      action: {
        label: "Remover",
        onClick: () => {
          Promise.all(
            player.submissionIds.map(id => deleteSubmissionMutation.mutateAsync({ submissionId: id }))
          ).then(() => {
            submissionsQuery.refetch();
            toast.success(`"${player.psnId}" removido do ranking.`);
          });
        },
      },
    });
  };

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameTitle.trim()) return toast.error("Insira o nome do jogo");
    setIsSubmitting(true);
    createChallengeMutation.mutate({
      gameTitle: gameTitle.trim(),
      description: description.trim(),
      platform,
      imageUrl: imageUrl.trim() || undefined,
      rewardCoins: Number(rewardCoins) || 500,
    });
  };

  const handleOpenEdit = (ch: any) => {
    setEditingChallenge(ch);
    setEditTitle(ch.gameTitle || "");
    setEditDesc(ch.description || "");
    setEditCoins(String(ch.rewardCoins || 500));
    setEditImage(ch.imageUrl || "");
    setEditPlatform(ch.platform || "PS4 / PS5");
    setEditStatus(ch.status || "ativo");
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChallenge) return;
    updateChallengeMutation.mutate({
      challengeId: Number(editingChallenge.id),
      gameTitle: editTitle.trim(),
      description: editDesc.trim(),
      platform: editPlatform,
      imageUrl: editImage.trim(),
      rewardCoins: Number(editCoins) || 500,
      status: editStatus,
    });
  };

  const handleDeleteChallenge = (ch: any) => {
    toast(`Excluir desafio "${ch.gameTitle}"?`, {
      action: {
        label: "Excluir",
        onClick: () => {
          deleteChallengeMutation.mutate({ challengeId: ch.id });
        },
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Link do Grupo VIP no WhatsApp */}
      <Card className="bg-[#121212] border-emerald-600/30 p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <MessageCircle className="text-emerald-500 w-5 h-5" /> Link do Grupo VIP no WhatsApp
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          É o link que aparece pro assinante clicar em "Acessar Grupo VIP no WhatsApp" na página do Clube Platinador.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={vipWhatsappUrlInput}
            onChange={(e) => setVipWhatsappUrlInput(e.target.value)}
            placeholder="https://chat.whatsapp.com/..."
            className="bg-slate-950 border-emerald-600/20 text-white flex-1"
          />
          <Button
            onClick={() => updateWhatsappUrlMutation.mutate({ vipWhatsappUrl: vipWhatsappUrlInput.trim() })}
            disabled={updateWhatsappUrlMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white shrink-0"
          >
            {updateWhatsappUrlMutation.isPending ? "Salvando..." : "Salvar Link"}
          </Button>
        </div>
      </Card>

      {/* Form Criar Novo Desafio */}
      <Card className="bg-[#121212] border-red-600/30 p-6 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Trophy className="text-red-500" /> Cadastrar Novo Desafio de Platina
        </h3>
        <form onSubmit={handleCreateChallenge} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-slate-300 font-bold uppercase">Nome do Jogo *</Label>
            <Input value={gameTitle} onChange={(e) => setGameTitle(e.target.value)} placeholder="Ex: God of War Ragnarök" className="bg-slate-950 border-red-600/20 text-white mt-1" required />
          </div>
          <div>
            <Label className="text-xs text-slate-300 font-bold uppercase">Plataforma</Label>
            <Input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Ex: PS4 / PS5" className="bg-slate-950 border-red-600/20 text-white mt-1" />
          </div>
          <div>
            <Label className="text-xs text-slate-300 font-bold uppercase">Recompensa em ForteCoins *</Label>
            <Input type="number" value={rewardCoins} onChange={(e) => setRewardCoins(e.target.value)} placeholder="Ex: 500" className="bg-slate-950 border-red-600/20 text-white mt-1" required />
          </div>
          <div>
            <Label className="text-xs text-slate-300 font-bold uppercase">Imagem da Capa (URL ou Upload)</Label>
            <div className="flex gap-2 mt-1">
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="bg-slate-950 border-red-600/20 text-white flex-1" />
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setIsSubmitting(true);
                      const storageRef = ref(storage, `platinador_challenges/${Date.now()}_${file.name}`);
                      const snapshot = await uploadBytes(storageRef, file);
                      const url = await getDownloadURL(snapshot.ref);
                      setImageUrl(url);
                      toast.success("Imagem enviada!");
                    } catch (err: any) {
                      toast.error("Erro ao enviar imagem");
                    } finally {
                      setIsSubmitting(false);
                      e.target.value = '';
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Button type="button" variant="outline" className="bg-slate-900 border-slate-700 text-slate-300 h-10 px-3 hover:bg-slate-800">
                  Upload
                </Button>
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs text-slate-300 font-bold uppercase">Descrição do Desafio</Label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Conquiste todos os troféus..." className="w-full h-20 p-3 bg-slate-950 border border-red-600/20 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 mt-1" />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 font-bold px-6 btn-neon text-white">
              {isSubmitting ? "Cadastrando..." : "Publicar Desafio no Clube"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Gerenciamento de Desafios de Platina Existentes */}
      <Card className="bg-[#121212] border-red-600/30 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Gamepad2 className="text-red-500" /> Desafios de Platina Cadastrados
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {challengesQuery.data?.length || 0} desafios disponíveis
          </span>
        </div>

        {challengesQuery.isLoading ? (
          <p className="text-slate-400 text-sm">Carregando desafios...</p>
        ) : !challengesQuery.data || challengesQuery.data.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">Nenhum desafio de platina cadastrado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challengesQuery.data.map((ch: any) => (
              <div key={ch.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-4 flex flex-col justify-between space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="w-16 h-20 rounded bg-slate-900 overflow-hidden shrink-0 border border-slate-800">
                    <img src={ch.imageUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200"} alt={ch.gameTitle} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        {ch.platform || "PS4 / PS5"}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        ch.status === "ativo" ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40" : "bg-amber-950/80 text-amber-400 border border-amber-800/40"
                      }`}>
                        {ch.status === "ativo" ? "Ativo" : ch.status === "brevemente" ? "Em breve" : "Encerrado"}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-sm line-clamp-1 truncate">{ch.gameTitle}</h4>
                    <p className="text-xs text-amber-400 font-bold mt-1 flex items-center gap-1">
                      <Coins className="w-3 h-3" /> +{ch.rewardCoins} ForteCoins
                    </p>
                    {ch.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-tight">{ch.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                  <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(ch)} className="text-xs text-slate-300 hover:text-white hover:bg-slate-900 h-8 px-2.5">
                    <Edit className="w-3.5 h-3.5 mr-1 text-blue-400" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteChallenge(ch)} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 h-8 px-2.5">
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Ranking do Clube Platinador */}
      <Card className="bg-[#121212] border-red-600/30 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-amber-400" /> Ranking do Clube Platinador
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {platinadorRanking.length} jogador{platinadorRanking.length !== 1 ? "es" : ""} no ranking
          </span>
        </div>

        {platinadorRanking.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">Nenhuma platina aprovada ainda — o ranking aparece aqui assim que a primeira comprovação for aprovada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs text-slate-400 uppercase">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3 text-white">PSN ID</th>
                  <th className="p-3">Platinas</th>
                  <th className="p-3">ForteCoins Ganhos</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {platinadorRanking.map((player, idx) => (
                  <tr key={player.psnId} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-400">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </td>
                    <td className="p-3 font-bold text-white">{player.psnId}</td>
                    <td className="p-3">{player.platinums}</td>
                    <td className="p-3 text-amber-400 font-bold">{player.coins} FC</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => handleRenamePlayer(player)} className="text-xs text-slate-300 hover:text-white hover:bg-slate-900 h-8 px-2.5">
                          <Edit className="w-3.5 h-3.5 mr-1 text-blue-400" /> Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRemovePlayer(player)} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 h-8 px-2.5">
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Comprovações de Platina para Aprovação */}
      <Card className="bg-[#121212] border-red-600/30 p-6 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Coins className="text-amber-400" /> Comprovações de Platina para Aprovação
        </h3>
        {submissionsQuery.isLoading ? (
          <p className="text-slate-400 text-sm">Carregando solicitações...</p>
        ) : !submissionsQuery.data || submissionsQuery.data.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">Nenhuma comprovação enviada no momento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs text-slate-400 uppercase">
                <tr>
                  <th className="p-3">ID / Data</th>
                  <th className="text-white p-3">PSN ID</th>
                  <th className="p-3">Desafio</th>
                  <th className="p-3">Comprovante</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {submissionsQuery.data.map((sub: any) => {
                  const challenge = challengesQuery.data?.find((ch: any) => ch.id === sub.challengeId);
                  const rewardCoins = challenge?.rewardCoins ?? 500;
                  return (
                  <tr key={sub.id} className="hover:bg-slate-800/40">
                    <td className="p-3 text-xs">#{sub.id}<br /><span className="text-[10px] text-slate-500">{new Date(sub.submittedAt).toLocaleDateString("pt-BR")}</span></td>
                    <td className="p-3 font-bold text-white">{sub.psnId}</td>
                    <td className="p-3 text-xs text-slate-400">{challenge?.gameTitle || `#${sub.challengeId}`}</td>
                    <td className="p-3">
                      <a href={sub.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                        Ver Foto <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="p-3">
                      {sub.status === "aprovado" && <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded font-bold">Aprovado (+{sub.coinsAwarded} Coins)</span>}
                      {sub.status === "pendente" && <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded font-bold">Pendente</span>}
                      {sub.status === "rejeitado" && <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded font-bold">Rejeitado</span>}
                    </td>
                    <td className="p-3 text-right">
                      {sub.status === "pendente" && (
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" onClick={() => approveMutation.mutate({ submissionId: sub.id, coinsToAward: rewardCoins })} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
                            Aprovar (+{rewardCoins} Coins)
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openPrompt({
                              title: "Motivo da Rejeição",
                              placeholder: "Ex: Foto ilegível",
                              confirmLabel: "Rejeitar",
                              onConfirm: (reason) => rejectMutation.mutate({ submissionId: sub.id, adminNotes: reason.trim() || "Foto ilegível" }),
                            })}
                            className="text-xs font-bold"
                          >
                            Rejeitar
                          </Button>
                        </div>
                      )}
                      {sub.status === "aprovado" && (
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" title="Editar PSN ID" onClick={() => handleEditSubmissionPsnId(sub.id, sub.psnId)} className="text-xs text-slate-300 hover:text-white hover:bg-slate-900 h-8 px-2">
                            <Edit className="w-3.5 h-3.5 text-blue-400" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Remover esta platina" onClick={() => handleDeleteSubmission(sub)} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 h-8 px-2">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Editar Desafio de Platina */}
      {editingChallenge && (
        <Dialog open={!!editingChallenge} onOpenChange={(open) => !open && setEditingChallenge(null)}>
          <DialogContent className="bg-slate-900 border-red-600/30 text-white sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-400" /> Editar Desafio de Platina
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Altere as informações do desafio selecionado.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-4 my-2">
              <div>
                <Label className="text-xs text-slate-300 font-bold uppercase">Nome do Jogo *</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className="bg-slate-950 border-slate-800 text-white mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-300 font-bold uppercase">Plataforma</Label>
                  <Input value={editPlatform} onChange={(e) => setEditPlatform(e.target.value)} className="bg-slate-950 border-slate-800 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-slate-300 font-bold uppercase">Recompensa FC *</Label>
                  <Input type="number" value={editCoins} onChange={(e) => setEditCoins(e.target.value)} required className="bg-slate-950 border-slate-800 text-white mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-300 font-bold uppercase">Status do Desafio</Label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md h-10 px-3 text-sm text-white mt-1"
                >
                  <option value="ativo">Ativo (Disponível)</option>
                  <option value="brevemente">Em Breve</option>
                  <option value="encerrado">Encerrado</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-300 font-bold uppercase">Imagem da Capa (URL ou Upload)</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={editImage} onChange={(e) => setEditImage(e.target.value)} className="bg-slate-950 border-slate-800 text-white flex-1" />
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const storageRef = ref(storage, `platinador_challenges/${Date.now()}_${file.name}`);
                          const snapshot = await uploadBytes(storageRef, file);
                          const url = await getDownloadURL(snapshot.ref);
                          setEditImage(url);
                          toast.success("Imagem enviada!");
                        } catch (err: any) {
                          toast.error("Erro ao enviar imagem");
                        } finally {
                          e.target.value = '';
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Button type="button" variant="outline" className="bg-slate-900 border-slate-700 text-slate-300 h-10 px-3 hover:bg-slate-800">
                      Upload
                    </Button>
                  </div>
                </div>
                {editImage && (
                  <div className="mt-3 flex justify-center">
                    <div className="relative w-32 h-32 rounded-lg border border-slate-800 overflow-hidden bg-slate-900">
                      <img src={editImage} alt="Preview" className="w-full h-full object-contain p-1" />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs text-slate-300 font-bold uppercase">Descrição do Desafio</Label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full h-20 p-3 bg-slate-950 border border-slate-800 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 mt-1" />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditingChallenge(null)} className="text-slate-400">
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateChallengeMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                  {updateChallengeMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal genérico de input (substitui os prompt() nativos do navegador) */}
      <Dialog open={!!promptModal} onOpenChange={(open) => { if (!open) setPromptModal(null); }}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white sm:max-w-sm card-neon">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neon">{promptModal?.title}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            placeholder={promptModal?.placeholder}
            onKeyDown={(e) => { if (e.key === "Enter") confirmPrompt(); }}
            className="bg-slate-950 border-red-600/20 text-white"
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPromptModal(null)} className="text-slate-400 hover:text-white">
              Cancelar
            </Button>
            <Button onClick={confirmPrompt} className="bg-red-600 hover:bg-red-700 font-bold btn-neon">
              {promptModal?.confirmLabel || "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminDashboard() {

  const { user, isAuthenticated, isAdmin, isCollaborator, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const normalizeAdminTab = (tab: string | null) => {
    if (!tab) return "visao-geral";
    if (tab === "mensagens" || tab === "chat" || tab === "chats") return "negociacoes";
    return tab;
  };
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = new URLSearchParams(window.location.search).get("tab");
    return normalizeAdminTab(tabFromUrl);
  });

  useEffect(() => {
    const handleUrlTab = () => {
      const tabFromUrl = new URLSearchParams(window.location.search).get("tab");
      if (tabFromUrl) {
        setActiveTab(normalizeAdminTab(tabFromUrl));
      }
    };
    handleUrlTab();
    window.addEventListener("popstate", handleUrlTab);
    return () => window.removeEventListener("popstate", handleUrlTab);
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Helpers to calculate sales stats
  const getSalesStats = () => {
    if (!sales) return { total: 0, today: 0, week: 0, month: 0, count: 0, todayCount: 0, weekCount: 0, monthCount: 0 };
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    
    let total = 0;
    let today = 0;
    let week = 0;
    let month = 0;
    let count = 0;
    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    
    const paidStatuses = ["pago", "enviado", "entregue"];
    
    sales.forEach((sale: any) => {
      if (!paidStatuses.includes(sale.status)) return;
      
      const price = parseFloat(sale.totalPrice || "0");
      const timestamp = new Date(sale.createdAt).getTime();
      
      total += price;
      count += 1;
      
      if (timestamp >= startOfToday) {
        today += price;
        todayCount += 1;
      }
      if (timestamp >= oneWeekAgo) {
        week += price;
        weekCount += 1;
      }
      if (timestamp >= oneMonthAgo) {
        month += price;
        monthCount += 1;
      }
    });
    
    return { total, today, week, month, count, todayCount, weekCount, monthCount };
  };

  const getChartData = () => {
    if (!sales) return [];
    
    const days = 7;
    const data = [];
    const paidStatuses = ["pago", "enviado", "entregue"];
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
      
      let amount = 0;
      let count = 0;
      
      sales.forEach((sale: any) => {
        if (!paidStatuses.includes(sale.status)) return;
        const timestamp = new Date(sale.createdAt).getTime();
        if (timestamp >= startOfDay && timestamp < endOfDay) {
          amount += parseFloat(sale.totalPrice || "0");
          count += 1;
        }
      });
      
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      data.push({ name: label, Faturamento: amount, Vendas: count });
    }
    
    return data;
  };

  // --- Cupons CRUD ---
  const { data: dbCoupons, refetch: refetchCoupons } = trpc.coupons.list.useQuery(undefined, {
    enabled: isAuthenticated && isAdmin,
  });
  const createCouponMutation = trpc.coupons.create.useMutation();
  const updateCouponMutation = trpc.coupons.update.useMutation();
  const deleteCouponMutation = trpc.coupons.delete.useMutation();

  const [couponCodeForm, setCouponCodeForm] = useState("");
  const [couponDiscountForm, setCouponDiscountForm] = useState("");
  const [couponMaxUsesForm, setCouponMaxUsesForm] = useState("");
  const [couponExpiresForm, setCouponExpiresForm] = useState("");
  const [showCouponModal, setShowCouponModal] = useState(false);

  // --- Promos CRUD ---
  const [promosList, setPromosList] = useState<any[]>([]);
  const [promoTitle, setPromoTitle] = useState("");
  const [promoImage, setPromoImage] = useState("");
  const [promoLink, setPromoLink] = useState("");
  const [promoCountdown, setPromoCountdown] = useState("");
  const [promoPosition, setPromoPosition] = useState<"main" | "sidebar_top" | "sidebar_bottom" | "platinador">("main");
  const [promoIsActive, setPromoIsActive] = useState(true);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [uploadingPromoImage, setUploadingPromoImage] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);

  // --- Aba Promoções (PromotionsPage Deals) CRUD ---
  const [dealsList, setDealsList] = useState<any[]>([]);
  const [dealTitle, setDealTitle] = useState("");
  const [dealDescription, setDealDescription] = useState("");
  const [dealCategory, setDealCategory] = useState<"jogo" | "gift_card_playstation" | "gift_card_xbox">("jogo");
  const [dealPrice, setDealPrice] = useState("");
  const [dealOldPrice, setDealOldPrice] = useState("");
  const [dealImageUrl, setDealImageUrl] = useState("");
  const [dealLink, setDealLink] = useState("");
  const [dealIsActive, setDealIsActive] = useState(true);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [uploadingDealImage, setUploadingDealImage] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    const unsubPromos = onSnapshot(collection(db, "promos"), (snap) => {
      setPromosList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubPromos();
  }, [isAuthenticated, isAdmin]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    const unsubDeals = onSnapshot(collection(db, "promocoes"), (snap) => {
      setDealsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    });
    return () => unsubDeals();
  }, [isAuthenticated, isAdmin]);

  const handleDealImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDealImage(true);
    try {
      const storageRef = ref(storage, `promocoes_images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setDealImageUrl(url);
      toast.success("Imagem da promoção enviada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao fazer upload da imagem da promoção:", error);
      toast.error("Erro ao fazer upload da imagem: " + (error.message || error));
    } finally {
      setUploadingDealImage(false);
    }
  };

  const resetDealForm = () => {
    setDealTitle("");
    setDealDescription("");
    setDealCategory("jogo");
    setDealPrice("");
    setDealOldPrice("");
    setDealImageUrl("");
    setDealLink("");
    setDealIsActive(true);
    setEditingDealId(null);
  };

  const openEditDeal = (deal: any) => {
    setEditingDealId(deal.id);
    setDealTitle(deal.title || "");
    setDealDescription(deal.description || "");
    setDealCategory(deal.category || "jogo");
    setDealPrice(deal.price ? String(deal.price) : "");
    setDealOldPrice(deal.oldPrice ? String(deal.oldPrice) : "");
    setDealImageUrl(deal.imageUrl || "");
    setDealLink(deal.link || "");
    setDealIsActive(deal.isActive ?? true);
    setShowDealModal(true);
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealTitle.trim() || !dealPrice.trim()) {
      toast.warning("Título e preço são obrigatórios.");
      return;
    }

    try {
      const dealData = {
        title: dealTitle.trim(),
        description: dealDescription.trim(),
        category: dealCategory,
        price: Number(dealPrice),
        oldPrice: dealOldPrice ? Number(dealOldPrice) : null,
        imageUrl: dealImageUrl.trim(),
        link: dealLink.trim(),
        isActive: dealIsActive
      };

      if (editingDealId) {
        await updateDoc(doc(db, "promocoes", editingDealId), dealData);
        toast.success("Promoção atualizada com sucesso!");
      } else {
        await addDoc(collection(db, "promocoes"), {
          ...dealData,
          createdAt: new Date().toISOString()
        });
        toast.success("Promoção criada com sucesso!");
      }
      setShowDealModal(false);
      resetDealForm();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar promoção.");
    }
  };

  const handleToggleDealActive = async (id: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, "promocoes", id), { isActive: !currentActive });
      toast.success("Estado da promoção atualizado com sucesso!");
    } catch (err) {
      toast.error("Erro ao atualizar estado da promoção.");
    }
  };

  const handleDeleteDeal = (dealId: string) => {
    toast("Tem certeza que deseja excluir permanentemente esta promoção?", {
      action: {
        label: "Excluir",
        onClick: async () => {
          try {
            await deleteDoc(doc(db, "promocoes", dealId));
            toast.success("Promoção excluída com sucesso!");
          } catch (error) {
            console.error("Erro ao excluir promoção:", error);
            toast.error("Erro ao excluir promoção.");
          }
        }
      }
    });
  };

  const handlePromoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPromoImage(true);
    try {
      const storageRef = ref(storage, `promos_banners/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setPromoImage(url);
      toast.success("Imagem do banner enviada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao fazer upload da imagem do banner:", error);
      toast.error("Erro ao fazer upload da imagem: " + (error.message || error));
    } finally {
      setUploadingPromoImage(false);
    }
  };

  const resetPromoForm = () => {
    setPromoTitle("");
    setPromoImage("");
    setPromoLink("");
    setPromoCountdown("");
    setPromoPosition("main");
    setPromoIsActive(true);
    setEditingPromoId(null);
  };

  const formatLocalDatetimeInput = (dateInput: any) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const openEditPromo = (promo: any) => {
    setEditingPromoId(promo.id);
    setPromoTitle(promo.title || "");
    setPromoImage(promo.imageUrl || "");
    setPromoLink(promo.link || "");
    setPromoCountdown(formatLocalDatetimeInput(promo.expiresAt));
    setPromoPosition(promo.position || "main");
    setPromoIsActive(promo.isActive ?? true);
    setShowPromoModal(true);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCouponMutation.mutateAsync({
        code: couponCodeForm.toUpperCase().trim(),
        discountPercentage: couponDiscountForm,
        maxUses: couponMaxUsesForm ? parseInt(couponMaxUsesForm) : null,
        expiresAt: couponExpiresForm ? new Date(`${couponExpiresForm}T23:59:59`).toISOString() : null,
      });
      toast.success("Cupom criado com sucesso!");
      refetchCoupons();
      setShowCouponModal(false);
      setCouponCodeForm("");
      setCouponDiscountForm("");
      setCouponMaxUsesForm("");
      setCouponExpiresForm("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar cupom.");
    }
  };

  const handleToggleCouponActive = async (id: number, currentActive: boolean) => {
    try {
      await updateCouponMutation.mutateAsync({ id, isActive: !currentActive });
      toast.success("Estado do cupom atualizado!");
      refetchCoupons();
    } catch (err) {
      toast.error("Erro ao atualizar cupom.");
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este cupom?")) return;
    try {
      await deleteCouponMutation.mutateAsync(id);
      toast.success("Cupom deletado com sucesso!");
      refetchCoupons();
    } catch (err) {
      toast.error("Erro ao deletar cupom.");
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim() || !promoImage.trim()) {
      toast.warning("Título e imagem do banner são obrigatórios.");
      return;
    }
    try {
      const promoData = {
        title: promoTitle.trim(),
        imageUrl: promoImage.trim(),
        link: promoLink.trim(),
        expiresAt: promoCountdown ? new Date(promoCountdown).toISOString() : null,
        position: promoPosition,
        isActive: promoIsActive
      };

      if (editingPromoId) {
        await updateDoc(doc(db, "promos", editingPromoId), promoData);
        toast.success("Banner promocional atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "promos"), {
          ...promoData,
          isActive: true,
          createdAt: new Date().toISOString()
        });
        toast.success("Banner promocional criado com sucesso!");
      }
      setShowPromoModal(false);
      resetPromoForm();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar banner promocional.");
    }
  };

  const handleTogglePromoActive = async (id: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, "promos", id), { isActive: !currentActive });
      toast.success("Estado do banner atualizado!");
    } catch (err) {
      toast.error("Erro ao atualizar banner.");
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este banner promocional?")) return;
    try {
      await deleteDoc(doc(db, "promos", id));
      toast.success("Banner promocional deletado!");
    } catch (err) {
      toast.error("Erro ao deletar banner.");
    }
  };

  const handleImportDefaultBanners = async () => {
    try {
      const defaultBanners = [
        {
          title: "ELDEN RING PS4/PS5",
          imageUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1200",
          link: "/digital?search=Elden%20Ring",
          position: "main",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          title: "MORTAL KOMBAT 1 PS5",
          imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200",
          link: "/digital?search=Mortal%20Kombat%201",
          position: "main",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          title: "JOGUE COM ECONOMIA - Mídia Secundária",
          imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600",
          link: "/economia",
          position: "sidebar_top",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          title: "Indique e Ganhe ForteCoins",
          imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600",
          link: "/fortecoins",
          position: "sidebar_bottom",
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];

      for (const b of defaultBanners) {
        await addDoc(collection(db, "promos"), b);
      }
      toast.success("Banners padrão carregados no banco com sucesso! Agora você pode alterá-los livremente.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar banners padrão.");
    }
  };

  // Delivery Game States
  const [deliverGameOpen, setDeliverGameOpen] = useState(false);
  const [selectedDeliverOrder, setSelectedDeliverOrder] = useState<any>(null);
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  const { data: sales, isLoading: loadingSales, refetch: refetchSales } = trpc.orders.listAll.useQuery(undefined, {
    enabled: isAuthenticated && isAdmin,
    // Pedidos não são real-time (vêm do Postgres via tRPC, diferente do resto que é Firestore
    // onSnapshot) — sem polling, uma venda nova só apareceria depois de recarregar a página.
    refetchInterval: 15000,
  });

  const deliverOrderMutation = trpc.orders.deliverOrder.useMutation({
    onSuccess: () => {
      refetchSales();
      setDeliverGameOpen(false);
      setShowDeliverModal(false);
      setSelectedDeliveryOrder(null);
      setDeliveryDetailsInput("");
      toast.success("Dados do jogo salvos e enviados com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao entregar o jogo: " + (err.message || "Erro desconhecido"));
    }
  });

  const updateOrderStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      refetchSales();
      toast.success("Status do pedido atualizado com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar pedido: " + (err.message || "Erro desconhecido"));
    }
  });

  const deleteOrderMutation = trpc.orders.delete.useMutation({
    onSuccess: () => {
      refetchSales();
      toast.success("Pedido excluído permanentemente!");
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir pedido: " + (err.message || "Erro desconhecido"));
    }
  });

  const simulateTestOrderMutation = trpc.orders.simulateTestOrder.useMutation({
    onSuccess: () => {
      refetchSales();
      toast.success("Compra de teste gerada com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao simular compra: " + (err.message || "Erro desconhecido"));
    }
  });

  const handleUpdateSaleStatus = (orderId: number, status: "pendente" | "pago" | "enviado" | "entregue" | "cancelado") => {
    if (confirm(`Tem certeza que deseja mudar o status deste pedido para '${status}'?`)) {
      updateOrderStatusMutation.mutate({ orderId, status });
    }
  };

  const handleDeleteSale = (orderId: number) => {
    if (confirm("Tem certeza que deseja EXCLUIR PERMANENTEMENTE este pedido? Esta ação não pode ser desfeita.")) {
      deleteOrderMutation.mutate(orderId);
    }
  };

  const handleDeliverGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeliverOrder) return;
    if (!deliveryInstructions.trim()) {
      toast.warning("As instruções ou chave do jogo não podem ser vazias.");
      return;
    }
    deliverOrderMutation.mutate({
      orderId: selectedDeliverOrder.id,
      deliveryDetails: deliveryInstructions.trim()
    });
  };

  const adminUpdateRoleMutation = trpc.auth.adminUpdateRole.useMutation();
  const adminCreditCoinsMutation = trpc.auth.adminCreditCoins.useMutation();

  // Mídia Física / Usados
  const adminUsedProductsQuery = trpc.usedProducts.adminList.useQuery(undefined, { enabled: !!(isAuthenticated && isAdmin) });
  const usedProductsListAdmin = adminUsedProductsQuery.data || [];
  const adminToggleUsedBoostMutation = trpc.usedProducts.adminToggleBoost.useMutation({
    onSuccess: (data) => {
      toast.success(data.boosted ? "Anúncio destacado por 3 dias!" : "Destaque removido.");
      adminUsedProductsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao destacar anúncio."),
  });
  const adminDeleteUsedProductMutation = trpc.usedProducts.delete.useMutation({
    onSuccess: () => {
      toast.success("Anúncio removido com sucesso!");
      adminUsedProductsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao remover anúncio."),
  });
  const handleDeleteUsedProduct = (id: number, name: string) => {
    toast(`Tem certeza que deseja excluir o anúncio "${name}"?`, {
      action: {
        label: "Excluir",
        onClick: () => adminDeleteUsedProductMutation.mutate({ id }),
      },
    });
  };

  // Jogos
  const adminDigitalProductsQuery = trpc.digitalProducts.adminList.useQuery(undefined, { enabled: !!(isAuthenticated && isAdmin) });
  const gamesList = adminDigitalProductsQuery.data || [];
  const [gameSearchQuery, setGameSearchQuery] = useState("");

  // Usuários reais (Postgres) com atividade de verdade — a lista de "users" do Firestore
  // (usada em Gerenciar Acessos) nunca recebe lastSignedIn, então "Usuários Online" na
  // Visão Geral sempre dava 0 ali. Atualiza a cada 30s pra ficar razoavelmente ao vivo.
  const adminUsersQuery = trpc.auth.adminListUsers.useQuery(undefined, {
    enabled: !!(isAuthenticated && isAdmin),
    refetchInterval: 30000,
  });
  const realUsers = adminUsersQuery.data || [];

  // Mutation dedicada pro cadastro em lote — sem os callbacks de sucesso/erro da mutation
  // de "Adicionar Jogo" (que fecham o modal errado e disparariam um toast por jogo).
  const batchCreateGameMutation = trpc.digitalProducts.adminCreate.useMutation();

  const adminCreateGameMutation = trpc.digitalProducts.adminCreate.useMutation({
    onSuccess: () => {
      toast.success("Produto/Jogo cadastrado com sucesso!");
      adminDigitalProductsQuery.refetch();
      setShowGameModal(false);
      resetGameForm();
      setAddingGame(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar jogo.");
      setAddingGame(false);
    }
  });

  const adminUpdateGameMutation = trpc.digitalProducts.adminUpdate.useMutation({
    onSuccess: () => {
      toast.success("Produto/Jogo atualizado com sucesso!");
      adminDigitalProductsQuery.refetch();
      setShowGameModal(false);
      resetGameForm();
      setAddingGame(false);
      setEditingGameId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar jogo.");
      setAddingGame(false);
    }
  });

  const adminDeleteGameMutation = trpc.digitalProducts.adminDelete.useMutation({
    onSuccess: () => {
      toast.success("Jogo excluído com sucesso!");
      adminDigitalProductsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir jogo.");
    }
  });

  const adminSetDigitalStatusMutation = trpc.digitalProducts.adminSetStatus.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(variables.status === "aprovado" ? "Conta aprovada e publicada na loja!" : "Conta rejeitada.");
      adminDigitalProductsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar status da conta.");
    }
  });

  const [showGameModal, setShowGameModal] = useState(false);
  const [gameName, setGameName] = useState("");
  const [gamePrice, setGamePrice] = useState(0);
  const [gamePricePrimary, setGamePricePrimary] = useState<string | number>("");
  const [gamePriceSecondary, setGamePriceSecondary] = useState<string | number>("");
  const [gamePlatform, setGamePlatform] = useState("");
  const [gameCategory, setGameCategory] = useState("");
  const [gameImageUrl, setGameImageUrl] = useState("");
  const [gameStock, setGameStock] = useState(999);
  const [gameIsActive, setGameIsActive] = useState(true);
  const [gameIsPreVenda, setGameIsPreVenda] = useState(false);
  const [gameShowInEconomia, setGameShowInEconomia] = useState(false);
  const [gameEconomiaLicenseType, setGameEconomiaLicenseType] = useState<"secundaria" | "primaria" | "ambas">("secundaria");
  const [gameCoverFit, setGameCoverFit] = useState<"cover" | "contain">("cover");
  const [addingGame, setAddingGame] = useState(false);
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSearchingCover, setIsSearchingCover] = useState(false);

  const handleSearchCoverAuto = async (overrideTerm?: string) => {
    const term = overrideTerm || gameName;
    if (!term || term.trim().length < 2) {
      toast.warning("Digite o nome do jogo para buscar a capa.");
      return;
    }
    setIsSearchingCover(true);
    try {
      const res = await fetch(`/api/games/search-cover?term=${encodeURIComponent(term.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.imageUrl) {
          setGameImageUrl(data.imageUrl);
          toast.success("Capa encontrada automaticamente na internet!");
        } else {
          toast.info("Capa não encontrada automaticamente.");
        }
      }
    } catch (err) {
      console.error("Erro ao buscar capa:", err);
    } finally {
      setIsSearchingCover(false);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `digital_products_covers/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setGameImageUrl(url);
      toast.success("Imagem enviada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao fazer upload da imagem:", error);
      toast.error("Erro ao fazer upload da imagem: " + (error.message || error));
    } finally {
      setUploadingImage(false);
    }
  };

  // Cadastro em Lote
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchRawText, setBatchRawText] = useState("");
  const [batchGames, setBatchGames] = useState<any[]>([]);
  const [isProcessingBatchSearch, setIsProcessingBatchSearch] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [batchSaveProgress, setBatchSaveProgress] = useState(0);

  const handleProcessBatchText = () => {
    if (!batchRawText.trim()) {
      toast.warning("Por favor, insira pelo menos um jogo.");
      return;
    }

    const lines = batchRawText.split("\n");
    const parsedGames: any[] = [];

    lines.forEach((line, index) => {
      let text = line.trim();
      if (!text) return;

      // Filtra/Ignora cabeçalhos, avisos ou decorações de WhatsApp
      if (
        text.startsWith("🎮") || 
        text.startsWith("💥") || 
        text.startsWith("🎁") || 
        text.startsWith("⚠️") || 
        text.startsWith("🚨")
      ) return;

      if (
        text.includes("PROMOÇÃO") || 
        text.includes("ESCOLHA QUALQUER") || 
        text.includes("VALOR NEGOCIÁVEL") || 
        text.includes("Levou 4") || 
        text.includes("O combo deve") || 
        text.includes("POUQUÍSSIMAS") ||
        text.includes("DAYS OF PLAY") || 
        text.includes("ENCERRA DIA")
      ) return;

      // Se começa com emojis e não tem números, provavelmente é um cabeçalho de categoria
      if (/^\p{Emoji}/u.test(text) && !/\d/.test(text)) {
        return;
      }

      // Remove marcadores de lista no início da linha (como *, -, •, +)
      text = text.replace(/^[*•\-+]\s*/, "").trim();

      if (!text) return;

      const lowerText = text.toLowerCase();
      if (
        lowerText.startsWith("ação e aventura") || 
        lowerText.startsWith("terror e sobrevivência") || 
        lowerText.startsWith("tiro") || 
        lowerText.startsWith("corrida") || 
        lowerText.startsWith("rpg") || 
        lowerText.startsWith("outros")
      ) {
        return;
      }

      let name = "";
      let price = 0;
      let pricePrimary = 0;
      let priceSecondary: number | null = null;
      let platform = "PS4/PS5";
      let stock = 999;

      // Caso A: Se a linha contiver ponto e vírgula, tratamos como delimitador clássico
      if (text.includes(";")) {
        const parts = text.split(";");
        name = parts[0]?.trim() || "";
        if (parts.length >= 5) {
          pricePrimary = parts[1] ? parseFloat(parts[1].trim().replace(",", ".")) : 0;
          priceSecondary = parts[2] ? parseFloat(parts[2].trim().replace(",", ".")) : null;
          platform = parts[3]?.trim() || "PS4/PS5";
          stock = parts[4] ? parseInt(parts[4].trim()) : 999;
          price = pricePrimary;
        } else {
          pricePrimary = parts[1] ? parseFloat(parts[1].trim().replace(",", ".")) : 0;
          platform = parts[2]?.trim() || "PS4/PS5";
          stock = parts[3] ? parseInt(parts[3].trim()) : 999;
          price = pricePrimary;
        }
      } else {
        // Caso B: Parse inteligente do texto corrido (ex: "A Plague Tale Requiem PS5 74 90")
        let nameAndPlatform = text;
        const doubleNumberRegex = /\s+(\d+)\s+(\d{2})$/; // ex: "74 90" ou "134 90"
        const singlePriceRegex = /\s+(\d+[,.]\d{2})$/;   // ex: "24.90" ou "24,90"
        const simpleIntRegex = /\s+(\d+)$/;              // ex: "20" ou "60"

        if (doubleNumberRegex.test(text)) {
          const match = text.match(doubleNumberRegex)!;
          price = parseFloat(`${match[1]}.${match[2]}`);
          pricePrimary = price;
          nameAndPlatform = text.replace(doubleNumberRegex, "").trim();
        } else if (singlePriceRegex.test(text)) {
          const match = text.match(singlePriceRegex)!;
          price = parseFloat(match[1].replace(",", "."));
          pricePrimary = price;
          nameAndPlatform = text.replace(singlePriceRegex, "").trim();
        } else if (simpleIntRegex.test(text)) {
          const match = text.match(simpleIntRegex)!;
          price = parseFloat(match[1]);
          pricePrimary = price;
          nameAndPlatform = text.replace(simpleIntRegex, "").trim();
        }

        // Tenta extrair plataforma do final do nome
        const platformRegex = /\s*\(?(PS4\s*[\/\-&eE]?\s*PS5|PS5\s*[\/\-&eE]?\s*PS4|PS5|PS4)\)?$/i;
        if (platformRegex.test(nameAndPlatform)) {
          const match = nameAndPlatform.match(platformRegex)!;
          platform = match[1].toUpperCase().replace(/\s+/g, "/"); // Normaliza para PS4/PS5, PS5 ou PS4
          name = nameAndPlatform.replace(platformRegex, "").trim();
        } else {
          name = nameAndPlatform;
        }

        // Se o preço for 0, mas estivermos na promoção secundária ou semelhante, podemos dar um valor padrão como 33.30
        if (price === 0) {
          price = 33.30;
          pricePrimary = 33.30;
        }
      }

      if (name) {
        parsedGames.push({
          id: `batch-${index}-${Date.now()}`,
          name,
          price: isNaN(price) ? 33.30 : price,
          pricePrimary: isNaN(pricePrimary) ? 33.30 : pricePrimary,
          priceSecondary: priceSecondary,
          platform: platform || "PS4/PS5",
          stock: isNaN(stock) ? 999 : stock,
          imageUrl: "",
          status: "pending",
          errorMsg: ""
        });
      }
    });

    // Marca jogos que já existem no catálogo (comparação por nome normalizado, ignorando
    // acentos/plataforma/maiúsculas) pra não duplicar o mesmo jogo cadastrado sem querer.
    const normalizeGameName = (n: string) => {
      const noAccents = (n || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      return noAccents
        .replace(/\b(ps4\/ps5|ps5|ps4|xbox|pc)\b/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    };

    const existingNames = new Set(gamesList.map((g: any) => normalizeGameName(g.name)));
    const seenInBatch = new Set<string>();
    const gamesWithDuplicateFlag = parsedGames.map((g) => {
      const norm = normalizeGameName(g.name);
      const isDuplicate = existingNames.has(norm) || seenInBatch.has(norm);
      seenInBatch.add(norm);
      return { ...g, isDuplicate };
    });

    const duplicateCount = gamesWithDuplicateFlag.filter((g) => g.isDuplicate).length;
    if (duplicateCount > 0) {
      toast.warning(`${duplicateCount} jogo${duplicateCount > 1 ? "s" : ""} já ${duplicateCount > 1 ? "existem" : "existe"} no catálogo (marcado${duplicateCount > 1 ? "s" : ""} em amarelo). Remova se não quiser duplicar.`);
    }

    setBatchGames(gamesWithDuplicateFlag);
    triggerBatchCoverSearch(gamesWithDuplicateFlag);
  };

  const triggerBatchCoverSearch = async (games: any[]) => {
    setIsProcessingBatchSearch(true);
    const updatedGames = [...games];

    updatedGames.forEach(g => {
      g.status = "searching";
    });
    setBatchGames([...updatedGames]);

    const promises = updatedGames.map(async (game, idx) => {
      try {
        const response = await fetch(`/api/games/search-cover?term=${encodeURIComponent(game.name)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.imageUrl) {
            updatedGames[idx].imageUrl = data.imageUrl;
            updatedGames[idx].status = "found";
          } else {
            updatedGames[idx].status = "error";
            updatedGames[idx].errorMsg = "Capa não encontrada";
          }
        } else {
          updatedGames[idx].status = "error";
          updatedGames[idx].errorMsg = "Jogo não encontrado";
        }
      } catch (err) {
        updatedGames[idx].status = "error";
        updatedGames[idx].errorMsg = "Erro na busca";
      }
      setBatchGames([...updatedGames]);
    });

    await Promise.all(promises);
    setIsProcessingBatchSearch(false);
  };

  const handleBatchImageUpload = async (gameId: string, file: File) => {
    const updated = [...batchGames];
    const index = updated.findIndex(g => g.id === gameId);
    if (index === -1) return;

    updated[index].status = "searching";
    setBatchGames([...updated]);

    try {
      const storageRef = ref(storage, `digital_products_covers/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      updated[index].imageUrl = url;
      updated[index].status = "found";
    } catch (error: any) {
      console.error(error);
      updated[index].status = "error";
      updated[index].errorMsg = "Erro no upload";
    } finally {
      setBatchGames([...updated]);
    }
  };

  const handleSaveBatchGames = async () => {
    if (batchGames.length === 0) return;
    setIsSavingBatch(true);
    setBatchSaveProgress(0);

    // Cadastra no Postgres (mesmo banco que alimenta o catálogo real do site e a lista
    // "Gerenciar Jogos") — antes isso ia pro Firestore, uma base que nada mais lê hoje,
    // então os jogos "cadastrados com sucesso" nunca apareciam em lugar nenhum.
    let count = 0;
    const failed: string[] = [];
    for (const game of batchGames) {
      try {
        await batchCreateGameMutation.mutateAsync({
          name: game.name.trim(),
          price: Number(game.price) || 33.30,
          pricePrimary: null,
          priceSecondary: null,
          type: "jogo",
          platform: game.platform?.trim() || "PS4/PS5",
          imageUrl: game.imageUrl?.trim() || undefined,
          coverFit: "cover",
          stock: Number(game.stock) || 999,
          isActive: true,
          isPreVenda: false,
        });
        count++;
      } catch (err: any) {
        console.error(`Erro ao cadastrar "${game.name}":`, err);
        failed.push(game.name);
      }
      setBatchSaveProgress(Math.round(((count + failed.length) / batchGames.length) * 100));
    }

    adminDigitalProductsQuery.refetch();
    setIsSavingBatch(false);
    setBatchSaveProgress(0);

    if (failed.length === 0) {
      toast.success(`${count} jogos cadastrados com sucesso!`);
      setShowBatchModal(false);
      setBatchRawText("");
      setBatchGames([]);
    } else {
      toast.error(`Cadastrados: ${count} de ${batchGames.length}. Falharam: ${failed.join(", ")}`);
      // Mantém só os que falharam na lista pra tentar de novo, sem perder o que já deu certo.
      setBatchGames(batchGames.filter((g) => failed.includes(g.name)));
    }
  };

  // Indicações & Prêmios
  const [allReferrals, setAllReferrals] = useState<any[]>([]);
  const [allRedemptions, setAllRedemptions] = useState<any[]>([]);
  const [allPrizes, setAllPrizes] = useState<any[]>([]);

  // --- Configurações de ForteCoins ---
  const [fcConfig, setFcConfig] = useState({
    referralReward: 15,
    purchaseReward: 5,
    platinadorReward: 500,
    reviewReward: 3,
    coinValue: 0.10,
  });
  const [savingFcConfig, setSavingFcConfig] = useState(false);

  // Teto de ForteCoins por compra — é o valor que o SERVIDOR realmente aplica no checkout
  // (server/_core/payment.ts), diferente do fcConfig acima que só fica salvo pra referência
  // (Firestore) e não é lido pelo checkout de verdade.
  const coinLimitsQuery = trpc.settings.get.useQuery();
  const [maxCoinsInput, setMaxCoinsInput] = useState({ maxCoinsPerPurchase: 10, maxCoinsPreVenda: 50 });
  useEffect(() => {
    if (coinLimitsQuery.data?.maxCoinsPerPurchase !== undefined) {
      setMaxCoinsInput({
        maxCoinsPerPurchase: coinLimitsQuery.data.maxCoinsPerPurchase ?? 10,
        maxCoinsPreVenda: coinLimitsQuery.data.maxCoinsPreVenda ?? 50,
      });
    }
  }, [coinLimitsQuery.data?.maxCoinsPerPurchase, coinLimitsQuery.data?.maxCoinsPreVenda]);

  const updateCoinLimitsMutation = trpc.settings.updateCoinLimits.useMutation({
    onSuccess: () => {
      toast.success("Teto de ForteCoins por compra salvo com sucesso!");
      coinLimitsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar o teto de ForteCoins."),
  });

  // --- Configurações de WhatsApp e Grupos ---
  const [waConfig, setWaConfig] = useState({
    groupUrl: "https://chat.whatsapp.com/GczvlmlbhRk4rPak1pcaL3?s=cl&p=a&ilr=2",
    supportNumber: "554384253691"
  });
  const [savingWaConfig, setSavingWaConfig] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    const unsubFc = onSnapshot(doc(db, "settings", "fortecoins"), (snap) => {
      if (snap.exists()) {
        setFcConfig(prev => ({ ...prev, ...snap.data() }));
      }
    });
    const unsubWa = onSnapshot(doc(db, "settings", "whatsapp"), (snap) => {
      if (snap.exists()) {
        setWaConfig(prev => ({ ...prev, ...snap.data() }));
      }
    });
    return () => {
      unsubFc();
      unsubWa();
    };
  }, [isAuthenticated, isAdmin]);

  const handleSaveFcConfig = async () => {
    setSavingFcConfig(true);
    try {
      await setDoc(doc(db, "settings", "fortecoins"), fcConfig, { merge: true });
      toast.success("Configurações de ForteCoins salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar config de ForteCoins:", err);
      toast.error("Erro ao salvar configurações.");
    } finally {
      setSavingFcConfig(false);
    }
  };

  const updateWhatsappUrlMutation = trpc.settings.updateWhatsappUrl.useMutation();

  const handleSaveWaConfig = async () => {
    setSavingWaConfig(true);
    try {
      await setDoc(doc(db, "settings", "whatsapp"), waConfig, { merge: true });
      await updateWhatsappUrlMutation.mutateAsync({ vipWhatsappUrl: waConfig.groupUrl });
      toast.success("Link do Grupo e Número do WhatsApp salvos com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar config do WhatsApp:", err);
      toast.error("Erro ao salvar configurações do WhatsApp.");
    } finally {
      setSavingWaConfig(false);
    }
  };

  // --- Manutenção do Site ---
  const [maintenanceConfig, setMaintenanceConfig] = useState({
    isActive: false,
    title: "Estamos em Manutenção",
    message: "Voltamos em breve. A loja está recebendo novos produtos e ajustes no sistema."
  });
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    const unsub = onSnapshot(doc(db, "settings", "maintenance"), (docSnap) => {
      if (docSnap.exists()) {
        setMaintenanceConfig(docSnap.data() as any);
      }
    });
    return () => unsub();
  }, [isAuthenticated, isAdmin]);

  const handleSaveMaintenance = async () => {
    setSavingMaintenance(true);
    try {
      await setDoc(doc(db, "settings", "maintenance"), maintenanceConfig, { merge: true });
      toast.success("Configurações de manutenção salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar config de manutenção:", err);
      toast.error("Erro ao salvar configurações de manutenção.");
    } finally {
      setSavingMaintenance(false);
    }
  };

  // --- Negociações & Chats (Atendimento e Negociações de Mídia Física) ---
  const [allChats, setAllChats] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<{ id: string; name: string; email?: string; topic?: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [chatFilter, setChatFilter] = useState<"todas" | "nao_lidas">("todas");

  const handleDeleteChat = (chatId: string, userName: string) => {
    toast(`Excluir permanentemente a conversa com "${userName}"? Isso libera espaço no banco de dados (Firestore).`, {
      action: {
        label: "Excluir",
        onClick: async () => {
          try {
            await deleteDoc(doc(db, "chats", chatId));
            toast.success("Conversa excluída do banco de dados!");
            if (selectedChatUser?.id === chatId) {
              setSelectedChatUser(null);
            }
          } catch (err: any) {
            console.error("Erro ao excluir conversa:", err);
            toast.error("Erro ao excluir conversa.");
          }
        },
      },
    });
  };

  const filteredChats = useMemo(() => {
    return allChats.filter((chat) => {
      if (chatFilter === "nao_lidas" && !chat.unreadByAdmin) return false;
      if (!chatSearch.trim()) return true;
      const term = chatSearch.toLowerCase().trim();
      const name = (chat.userName || "").toLowerCase();
      const email = (chat.userEmail || "").toLowerCase();
      const msg = (chat.lastMessage || "").toLowerCase();
      const topic = (chat.topic || "").toLowerCase();
      return name.includes(term) || email.includes(term) || msg.includes(term) || topic.includes(term);
    });
  }, [allChats, chatFilter, chatSearch]);

  useEffect(() => {
    if (!isAuthenticated || (!isAdmin && !isCollaborator)) return;
    const qChats = collection(db, "chats");
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllChats(data);
    });
    return () => unsubChats();
  }, [isAuthenticated, isAdmin, isCollaborator]);

  useEffect(() => {
    if (!selectedChatUser) return;
    const qMsg = query(collection(db, "chats", selectedChatUser.id, "messages"), orderBy("timestamp", "asc"));
    const unsubMsg = onSnapshot(qMsg, (snapshot) => {
      setChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    // Marca conversa como lida pelo gestor
    updateDoc(doc(db, "chats", selectedChatUser.id), { unreadByAdmin: false }).catch(() => {});
    return () => unsubMsg();
  }, [selectedChatUser]);

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatUser || !adminReplyText.trim()) return;
    setSendingReply(true);
    try {
      const chatRef = doc(db, "chats", selectedChatUser.id);
      await setDoc(chatRef, {
        userId: selectedChatUser.id,
        userName: selectedChatUser.name,
        userEmail: selectedChatUser.email || "",
        lastMessage: adminReplyText.trim(),
        updatedAt: serverTimestamp(),
        unreadByAdmin: false
      }, { merge: true });

      await addDoc(collection(db, "chats", selectedChatUser.id, "messages"), {
        text: adminReplyText.trim(),
        sender: "admin",
        senderId: "admin",
        senderName: "Gestor Eforte",
        isRead: true,
        timestamp: serverTimestamp()
      });

      setAdminReplyText("");
      toast.success("Mensagem enviada com sucesso!");
    } catch (err) {
      console.error("Erro ao enviar mensagem do gestor:", err);
      toast.error("Erro ao enviar mensagem.");
    } finally {
      setSendingReply(false);
    }
  };

  // --- Feed Unificado de Notificações & Atividades ---
  const [notifFilter, setNotifFilter] = useState<string>("todas");
  const [notifSearch, setNotifSearch] = useState("");

  // "Apagar" aqui só tira da Central de Notificações — guardado no servidor (compartilhado
  // entre gestores/dispositivos, não é mais só o localStorage de um navegador) — nunca apaga
  // o chat, pedido, resgate ou indicação de verdade, só a marcação de "não mostrar mais".
  const dismissedNotifQuery = trpc.adminNotifications.getDismissed.useQuery(undefined, {
    enabled: !!(isAuthenticated && isAdmin),
  });
  const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (dismissedNotifQuery.data) {
      setDismissedNotifIds(new Set(dismissedNotifQuery.data));
    }
  }, [dismissedNotifQuery.data]);

  const dismissMutation = trpc.adminNotifications.dismiss.useMutation();
  const restoreMutation = trpc.adminNotifications.restore.useMutation();

  const [notifSelectMode, setNotifSelectMode] = useState(false);
  const [selectedNotifIds, setSelectedNotifIds] = useState<Set<string>>(new Set());
  const toggleNotifSelected = (id: string) => {
    setSelectedNotifIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Aplica a dispensa na hora (otimista) e sincroniza com o servidor em segundo plano.
  // "Desfazer" no toast por alguns segundos reverte dos dois lados antes de virar definitivo.
  const applyDismiss = (ids: string[], successMsg: string) => {
    if (ids.length === 0) return;
    setDismissedNotifIds(prev => new Set([...prev, ...ids]));
    dismissMutation.mutate({ ids }, { onError: () => dismissedNotifQuery.refetch() });
    setSelectedNotifIds(new Set());
    setNotifSelectMode(false);
    toast.success(successMsg, {
      duration: 5000,
      action: {
        label: "Desfazer",
        onClick: () => {
          setDismissedNotifIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => next.delete(id));
            return next;
          });
          restoreMutation.mutate({ ids }, { onError: () => dismissedNotifQuery.refetch() });
        },
      },
    });
  };

  const dismissOneNotif = (id: string) => applyDismiss([id], "Notificação removida da lista.");
  const dismissSelectedNotifs = () => applyDismiss([...selectedNotifIds], `${selectedNotifIds.size} notificaç${selectedNotifIds.size === 1 ? "ão removida" : "ões removidas"} da lista.`);
  const dismissAllVisibleNotifs = (visibleIds: string[]) => {
    toast(`Apagar ${visibleIds.length} notificaç${visibleIds.length === 1 ? "ão" : "ões"} da lista? Isso não apaga chats, pedidos ou resgates de verdade, só limpa aqui.`, {
      action: {
        label: "Apagar Tudo",
        onClick: () => applyDismiss(visibleIds, "Notificações apagadas da lista."),
      },
    });
  };

  // Alertas sonoros e pop-ups nativos do Windows
  const [permState, setPermState] = useState<NotificationPermissionState>(() => getNotificationPermission());
  const [notifSoundEnabled, setNotifSoundEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem("admin_notif_sound_enabled");
      return stored === null ? true : stored === "1";
    } catch {
      return true;
    }
  });

  const handleToggleOrRequestNotifs = async () => {
    if (permState !== "granted") {
      const granted = await requestNotificationPermission();
      setPermState(getNotificationPermission());
      if (granted) {
        setNotifSoundEnabled(true);
        localStorage.setItem("admin_notif_sound_enabled", "1");
      }
    } else {
      const next = !notifSoundEnabled;
      setNotifSoundEnabled(next);
      localStorage.setItem("admin_notif_sound_enabled", next ? "1" : "0");
      if (next) {
        playNotificationChime();
        toast.success("Alertas sonoros e pop-ups ativados!");
      } else {
        toast.info("Alertas sonoros pausados temporariamente.");
      }
    }
  };

  const handleTestWindowsNotification = () => {
    notifyAdmin({
      title: "🛒 Teste de Notificação no Windows!",
      body: "Seu Windows está configurado perfeitamente! Os pedidos e chats da Eforte Games aparecerão assim.",
      onClickUrl: "/admin?tab=compras_pendentes",
      actionLabel: "Abrir Pedidos",
      onAction: () => setActiveTab("compras_pendentes"),
    });
  };

  const notificationFeed = useMemo(() => {
    const feed: any[] = [];

    // 1. Resgates de Gift Cards & Prêmios
    allRedemptions.forEach((red) => {
      feed.push({
        id: `red_${red.id}`,
        rawId: red.id,
        category: "resgate",
        title: `🎁 Resgate de Gift Card: ${red.prizeName}`,
        subtitle: `Solicitado por: ${red.userName || red.userEmail} (${red.userEmail || ''}) • Custo: ${red.cost} ForteCoins`,
        status: red.status || "pendente",
        timestamp: red.createdAt ? new Date(red.createdAt).getTime() : Date.now(),
        createdAtStr: red.createdAt ? new Date(red.createdAt).toLocaleString("pt-BR") : "Recente",
        data: red
      });
    });

    // 2. Chats e Mensagens
    allChats.forEach((chat) => {
      feed.push({
        id: `chat_${chat.id}`,
        rawId: chat.id,
        category: "mensagem",
        title: `💬 Conversa com ${chat.userName || "Cliente"}`,
        subtitle: `${chat.lastMessage || "Nova conversa ou negociação iniciada"}`,
        status: chat.unreadByAdmin ? "pendente" : "lido",
        timestamp: chat.updatedAt?.toDate ? chat.updatedAt.toDate().getTime() : Date.now(),
        createdAtStr: chat.updatedAt?.toDate ? chat.updatedAt.toDate().toLocaleString("pt-BR") : "Recente",
        data: chat
      });
    });

    // 3. Indicações de Amigos
    allReferrals.forEach((ref) => {
      feed.push({
        id: `ref_${ref.id}`,
        rawId: ref.id,
        category: "indicacao",
        title: `💰 Indicação de Amigo (Padrinho: ${ref.referrerName || 'Usuário'})`,
        subtitle: `Amigo Indicado: ${ref.inviteeName || ref.inviteeEmail}`,
        status: ref.status || "pendente",
        timestamp: ref.createdAt ? new Date(ref.createdAt).getTime() : Date.now(),
        createdAtStr: ref.createdAt ? new Date(ref.createdAt).toLocaleString("pt-BR") : "Recente",
        data: ref
      });
    });

    // 4. Vendas / Pedidos
    (sales || []).forEach((sale: any) => {
      feed.push({
        id: `sale_${sale.id}`,
        rawId: sale.id,
        category: "pedido",
        title: `🛒 Pedido de Jogo #${sale.id}: ${sale.gameTitle || sale.productName || 'Jogo'}`,
        subtitle: `Cliente: ${sale.customerName || sale.customerEmail} • R$ ${sale.totalPrice || '0'}`,
        status: sale.status || "pendente",
        timestamp: sale.createdAt ? new Date(sale.createdAt).getTime() : Date.now(),
        createdAtStr: sale.createdAt ? new Date(sale.createdAt).toLocaleString("pt-BR") : "Recente",
        data: sale
      });
    });

    return feed.sort((a, b) => b.timestamp - a.timestamp);
  }, [allRedemptions, allChats, allReferrals, sales]);

  const visibleNotificationFeed = useMemo(() => {
    return notificationFeed.filter(item => !dismissedNotifIds.has(item.id));
  }, [notificationFeed, dismissedNotifIds]);

  const pendingNotifCount = useMemo(() => {
    return visibleNotificationFeed.filter(item => item.status === "pendente").length;
  }, [visibleNotificationFeed]);

  // Pop-up em tempo real: dispara um toast quando surge uma notificação pendente
  // nova (venda, resgate, indicação) enquanto o gestor está com o painel aberto.
  // Mensagens de chat ficam por conta do GlobalChatNotifier (App.tsx), que já
  // avisa em qualquer página do site — evita balão duplicado aqui dentro do /admin.
  // Na primeira carga só registra o que já existe, sem alertar — senão toda
  // pendência antiga viraria um pop-up ao abrir o painel.
  const seenNotifIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const pendingIds = notificationFeed.filter(n => n.status === "pendente").map(n => n.id as string);

    if (seenNotifIdsRef.current === null) {
      seenNotifIdsRef.current = new Set(pendingIds);
      return;
    }

    const newOnes = notificationFeed.filter(n => n.status === "pendente" && n.category !== "mensagem" && !seenNotifIdsRef.current!.has(n.id));
    newOnes.forEach(n => {
      notifyAdmin({
        title: n.title,
        body: n.subtitle,
        tag: n.id,
        onClickUrl: `/admin?tab=notificacoes`,
        actionLabel: "Ver",
        onAction: () => setActiveTab("notificacoes"),
        playSound: notifSoundEnabled,
      });
    });

    seenNotifIdsRef.current = new Set(pendingIds);
  }, [notificationFeed, notifSoundEnabled]);

  const menuItems = useMemo(() => [
    { value: "visao-geral", label: "Visão Geral", icon: BarChart3 },
    {
      value: "notificacoes",
      label: "🔔 Central de Notificações",
      icon: Bell,
      badge: pendingNotifCount > 0,
      section: "Atendimento",
    },
    {
      value: "compras_pendentes",
      label: "🛒 Compras Pendentes",
      icon: ShoppingBag,
      badge: (sales || []).some((o: any) => o.status === "pago" || o.status === "pendente"),
      section: "Atendimento",
    },
    {
      value: "negociacoes",
      label: "Negociações & Mensagens",
      icon: MessageCircle,
      badge: allChats.some(c => c.unreadByAdmin),
      section: "Atendimento",
    },
    {
      value: "aprovar_contas",
      label: "✅ Aprovar Contas",
      icon: Gamepad2,
      badge: gamesList.some((g: any) => g.status === "pendente"),
      section: "Catálogo",
    },
    { value: "jogos", label: "Gerenciar Jogos", icon: Gamepad2, section: "Catálogo" },
    { value: "midia_fisica", label: "Mídia Física / Usados", icon: Package, section: "Catálogo" },
    { value: "vendas", label: "Gerenciar Vendas", icon: ShoppingBag, section: "Vendas & Clube" },
    { value: "premios", label: "Gerenciar Prêmios", icon: Gift, section: "Vendas & Clube" },
    { value: "platinador", label: "Clube Platinador", icon: Trophy, section: "Vendas & Clube" },
    { value: "usuarios", label: "Gerenciar Acessos", icon: Users, section: "Clientes" },
    {
      value: "referrals",
      label: "Indicações & Prêmios",
      icon: Coins,
      badge: (allRedemptions.some(r => r.status === "pendente") || allReferrals.some(r => r.status === "pendente")),
      section: "Clientes",
    },
    { value: "promocoes", label: "Banners da Home", icon: Image, section: "Marketing" },
    { value: "aba_promocoes", label: "Gerenciar Promoções", icon: Tag, section: "Marketing" },
    { value: "cupons", label: "Cupons", icon: Percent, section: "Marketing" },
    { value: "manutencao", label: "Bloqueio do Site", icon: ShieldAlert, section: "Sistema" },
    { value: "config_fortecoins", label: "📲 Link WhatsApp & ForteCoins", icon: Settings, section: "Sistema" },
  ], [allRedemptions, allReferrals, allChats, pendingNotifCount, sales, gamesList]);

  // Delivery Orders State (modal de "Entregar Dados de Acesso" da aba Compras Pendentes)
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [selectedDeliveryOrder, setSelectedDeliveryOrder] = useState<any>(null);
  const [deliveryDetailsInput, setDeliveryDetailsInput] = useState("");

  const moveToDigitalMutation = trpc.usedProducts.moveToDigital.useMutation({
    onSuccess: () => {
      toast.success("Anúncio movido com sucesso para o Catálogo de Jogos Digitais!");
      adminUsedProductsQuery.refetch();
      adminDigitalProductsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao mover anúncio");
    }
  });

  // Modal de prêmios
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [prizeName, setPrizeName] = useState("");
  const [prizeCost, setPrizeCost] = useState(500);
  const [prizeBadge, setPrizeBadge] = useState("Mais Popular");
  const [prizeDesc, setPrizeDesc] = useState("");
  const [prizeStock, setPrizeStock] = useState(1);
  const [prizeImage, setPrizeImage] = useState("");
  const [uploadingPrizeImage, setUploadingPrizeImage] = useState(false);
  const [addingPrize, setAddingPrize] = useState(false);
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null);

  const resetPrizeForm = () => {
    setPrizeName("");
    setPrizeCost(500);
    setPrizeBadge("Mais Popular");
    setPrizeDesc("");
    setPrizeStock(1);
    setPrizeImage("");
    setEditingPrizeId(null);
  };

  const openEditPrize = (prize: any) => {
    setEditingPrizeId(prize.id);
    setPrizeName(prize.name || "");
    setPrizeCost(prize.cost || 500);
    setPrizeBadge(prize.badge || "Mais Popular");
    setPrizeDesc(prize.description || "");
    setPrizeStock(prize.stock ?? 1);
    setPrizeImage(prize.imageUrl || "");
    setShowPrizeModal(true);
  };

  // Delivery Dialog States
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryRedemptionId, setDeliveryRedemptionId] = useState("");
  const [deliveryPrizeName, setDeliveryPrizeName] = useState("");
  const [deliveryCode, setDeliveryCode] = useState("");
  const [delivering, setDelivering] = useState(false);

  // Refusal Dialog States
  const [refusalOpen, setRefusalOpen] = useState(false);
  const [refusalRedemptionId, setRefusalRedemptionId] = useState("");
  const [refusalPrizeName, setRefusalPrizeName] = useState("");
  const [refusalUserId, setRefusalUserId] = useState("");
  const [refusalCost, setRefusalCost] = useState(0);
  const [refusalReason, setRefusalReason] = useState("");
  const [refusing, setRefusing] = useState(false);

  // Seed state
  const [seeding, setSeeding] = useState(false);
  const [seedLog, setSeedLog] = useState<string[]>([]);

  // Modal de criação
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("collaborator");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, isAdmin]);

  // Escutar todas as Indicações
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    const q = collection(db, "referrals");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllReferrals(data);
    });

    return () => unsubscribe();
  }, [isAuthenticated, isAdmin]);

  // Escutar todas as Reivindicações de Prêmios
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    const q = collection(db, "redemptions");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllRedemptions(data);
    });

    return () => unsubscribe();
  }, [isAuthenticated, isAdmin]);

  // Escutar todos os prêmios da loja
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    const q = collection(db, "prizes");
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      if (snapshot.empty) {
        // Auto-seed predefined prizes to Firestore if empty
        const PREDEFINED_PRIZES = [
          { id: "steam_50", name: "Gift Card Steam R$ 50", cost: 500, description: "Código de ativação Steam para qualquer jogo.", badge: "Mais Popular", stock: 10, isActive: true },
          { id: "psn_50", name: "Gift Card PSN R$ 50", cost: 500, description: "Crédito na PlayStation Store para comprar jogos e DLCs.", badge: "Console", stock: 10, isActive: true },
          { id: "xbox_50", name: "Gift Card Xbox R$ 50", cost: 500, description: "Crédito Xbox para jogos, assinaturas ou passes.", badge: "Console", stock: 10, isActive: true },
          { id: "steam_100", name: "Gift Card Steam R$ 100", cost: 1000, description: "Crédito em dobro para a maior plataforma de jogos de PC.", badge: "Super Valor", stock: 10, isActive: true },
          { id: "netflix_50", name: "Gift Card Netflix R$ 50", cost: 500, description: "Assista a séries e filmes com mensalidades pagas.", badge: "Lazer", stock: 10, isActive: true },
          { id: "random_game", name: "Jogo Digital Aleatório PC", cost: 300, description: "Uma chave digital aleatória da Steam garantindo um jogo.", badge: "Surpresa", stock: 10, isActive: true }
        ];

        try {
          for (const prize of PREDEFINED_PRIZES) {
            await setDoc(doc(db, "prizes", prize.id), {
              name: prize.name,
              cost: prize.cost,
              description: prize.description,
              badge: prize.badge,
              stock: prize.stock,
              isActive: prize.isActive,
              createdAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error("Erro ao auto-cadastrar prêmios:", err);
        }
      } else {
        setAllPrizes(data);
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated, isAdmin]);

  // Escutar Jogos (agora via TRPC acima)
  // O useEffect foi removido pois o TRPC cuida disso reativamente

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim() || !gamePlatform.trim()) {
      toast.warning("Nome e plataforma são obrigatórios.");
      return;
    }
    const pricePrimaryVal = gamePricePrimary !== "" ? Number(gamePricePrimary) : null;
    const priceSecondaryVal = gamePriceSecondary !== "" ? Number(gamePriceSecondary) : null;
    if (pricePrimaryVal === null && priceSecondaryVal === null) {
      toast.warning("Informe ao menos um preço: Primária ou Secundária.");
      return;
    }
    setAddingGame(true);

    // Jogo só com conta secundária (sem primária): a coluna "price" (base, obrigatória
    // no banco) usa o preço secundário, e "Conta Primária" some do site — não faz mais
    // sentido oferecer/cobrar por uma conta primária que não existe.
    const basePriceVal = pricePrimaryVal ?? priceSecondaryVal!;
    const itemType = (gameCategory === "Assinaturas" || gameCategory === "assinatura") ? "assinatura" : "jogo";

    const payload = {
      name: gameName.trim(),
      price: basePriceVal,
      pricePrimary: pricePrimaryVal,
      priceSecondary: priceSecondaryVal,
      platform: gamePlatform.trim(),
      category: gameCategory.trim(),
      type: itemType as any,
      imageUrl: gameImageUrl.trim(),
      coverFit: gameCoverFit,
      stock: Number(gameStock),
      isActive: gameIsActive,
      isPreVenda: gameIsPreVenda,
      showInEconomia: gameShowInEconomia,
      economiaLicenseType: gameEconomiaLicenseType,
      description: "Mídia Digital Eforte Games.",
    };

    if (editingGameId) {
      adminUpdateGameMutation.mutate({ ...payload, id: editingGameId });
    } else {
      adminCreateGameMutation.mutate(payload);
    }
  };

  const resetGameForm = () => {
    setGameName("");
    setGamePrice(0);
    setGamePricePrimary("");
    setGamePriceSecondary("");
    setGamePlatform("");
    setGameCategory("");
    setGameImageUrl("");
    setGameCoverFit("cover");
    setGameStock(999);
    setGameIsActive(true);
    setGameIsPreVenda(false);
    setGameShowInEconomia(false);
    setGameEconomiaLicenseType("secundaria");
    setEditingGameId(null);
  };

  const openEditGame = (game: any) => {
    setEditingGameId(game.id);
    setGameName(game.name || "");
    setGamePrice(game.price || 0);
    setGamePricePrimary(game.pricePrimary ?? game.price_primary ?? "");
    setGamePriceSecondary(game.priceSecondary ?? game.price_secondary ?? "");
    setGamePlatform(game.platform || "");
    setGameCategory(game.category || "");
    setGameImageUrl(game.imageUrl || "");
    setGameCoverFit(game.coverFit || "cover");
    setGameStock(game.stock ?? 999);
    setGameIsActive(game.isActive ?? true);
    setGameIsPreVenda(game.isPreVenda ?? false);
    setGameShowInEconomia(game.showInEconomia ?? false);
    setGameEconomiaLicenseType(game.economiaLicenseType || "secundaria");
    setShowGameModal(true);
  };

  const handleDeleteGame = (gameId: number) => {
    toast("Tem certeza que deseja excluir permanentemente este jogo?", {
      action: {
        label: "Excluir",
        onClick: () => {
          adminDeleteGameMutation.mutate(gameId);
        }
      }
    });
  };

  const handleToggleCollaborator = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "collaborator" ? "user" : "collaborator";
    try {
      // Precisa existir no Postgres também: é o que autoriza as mutations do
      // Portal do Colaborador (criar/editar/excluir produtos da Loja real).
      await adminUpdateRoleMutation.mutateAsync({ openId: userId, role: newRole as "user" | "collaborator" });
      await updateDoc(doc(db, "users", userId), {
        role: newRole
      });
      toast.success(
        newRole === "user"
          ? "Colaborador removido. A conta continua ativa normalmente — ela só sai desta lista, que mostra apenas quem tem acesso especial."
          : "Permissão atualizada com sucesso!"
      );
    } catch (error: any) {
      console.error("Erro ao atualizar papel:", error);
      toast.error(error?.message || "Erro ao atualizar permissão.");
    }
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    if (users.find(u => u.id === userId)?.email === "luanmnogueira@gmail.com") {
      toast.warning("Não é possível alterar o cargo do gestor principal.");
      return;
    }
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      // Postgres é quem autoriza de verdade as mutations administrativas do tRPC —
      // sem essa chamada, o usuário "vira admin" só na UI e todo botão do painel falha para ele.
      await adminUpdateRoleMutation.mutateAsync({ openId: userId, role: newRole });
      await updateDoc(doc(db, "users", userId), {
        role: newRole
      });
      toast.success(
        newRole === "user"
          ? "Gestor removido. A conta continua ativa normalmente — ela só sai desta lista, que mostra apenas quem tem acesso especial."
          : "Permissão atualizada com sucesso!"
      );
    } catch (error: any) {
      console.error("Erro ao atualizar papel:", error);
      toast.error(error?.message || "Erro ao atualizar permissão.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserPassword.length < 6) {
      toast.warning("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setCreating(true);
    try {
      // Verifica se o usuário já existe no banco de dados localmente carregado
      const existingUser = users.find(u => u.email.toLowerCase() === newUserEmail.toLowerCase());
      
      if (existingUser) {
        // Usuário já existe, apenas promove ele para o novo cargo
        if (newUserRole === "admin" || newUserRole === "user" || newUserRole === "collaborator") {
          await adminUpdateRoleMutation.mutateAsync({ openId: existingUser.id, role: newUserRole });
        }
        await updateDoc(doc(db, "users", existingUser.id), {
          role: newUserRole
        });
        toast.success(`O usuário ${existingUser.email} já tinha cadastro e agora foi promovido para ${newUserRole}!`);
        setShowCreateModal(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setCreating(false);
        return;
      }

      // Se não existe, cria um novo usuário no Firebase Auth
      let secondaryApp;
      try {
        secondaryApp = initializeApp(firebaseConfig, `Secondary-${Date.now()}`);
        const secondaryAuth = getAuth(secondaryApp);
        
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPassword);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, "users", uid), {
          uid,
          email: newUserEmail,
          name: newUserName,
          role: newUserRole,
          createdAt: new Date().toISOString()
        });

        toast.success(`Usuário ${newUserName} criado com sucesso como ${newUserRole}!`);
        setShowCreateModal(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
      } finally {
        if (secondaryApp) await deleteApp(secondaryApp);
      }
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      const getFriendlyAdminError = (err: any) => {
        const msg = (err?.message || "").toLowerCase();
        if (msg.includes("email-already-in-use")) return "Este e-mail já está cadastrado.";
        if (msg.includes("weak-password")) return "A senha deve ter pelo menos 6 caracteres.";
        if (msg.includes("invalid-email")) return "O e-mail informado é inválido.";
        return err?.message || "Erro desconhecido";
      };
      toast.error("Erro ao processar usuário: " + getFriendlyAdminError(error));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (email === "luanmnogueira@gmail.com") return;
    toast(`Tem certeza que deseja remover o acesso de ${email}? (Isso removerá as permissões de acesso do usuário)`, {
      action: {
        label: "Excluir",
        onClick: async () => {
          try {
            await deleteDoc(doc(db, "users", userId));
            toast.success("Acesso removido com sucesso!");
          } catch (error) {
            toast.error("Erro ao deletar usuário.");
          }
        }
      }
    });
  };

  const handleConfirmPurchase = async (referral: any) => {
    if (referral.status === "pago") return;
    
    const rewardAmount = fcConfig.referralReward || 15;
    toast(`Confirmar que o usuário indicado (${referral.inviteeName}) efetuou a compra de um jogo? Isso creditará +${rewardAmount} Fortecoins ao padrinho.`, {
      action: {
        label: "Confirmar",
        onClick: async () => {
          try {
            // 1. Atualizar status da indicação
            await updateDoc(doc(db, "referrals", referral.id), {
              status: "pago",
              confirmedAt: new Date().toISOString()
            });

            // 2. Incrementar moedas do indicador (Postgres é o saldo real usado no checkout)
            await adminCreditCoinsMutation.mutateAsync({ openId: referral.referrerId, amount: rewardAmount });

            // 3. Refletir no Firestore para a UI atualizar na hora
            const referrerRef = doc(db, "users", referral.referrerId);
            const referrerSnap = await getDoc(referrerRef);
            if (referrerSnap.exists()) {
              const currentCoins = referrerSnap.data()?.forteCoins ?? 0;
              await updateDoc(referrerRef, {
                forteCoins: currentCoins + rewardAmount
              });
            }
            toast.success(`Sucesso! Compra de jogo confirmada e ${rewardAmount} Fortecoins adicionados ao saldo do padrinho.`);
          } catch (error) {
            console.error("Erro ao confirmar compra da indicação:", error);
            toast.error("Erro ao processar confirmação. Tente novamente.");
          }
        }
      }
    });
  };

  const openDeliveryDialog = (redemptionId: string, prizeName: string) => {
    setDeliveryRedemptionId(redemptionId);
    setDeliveryPrizeName(prizeName);
    setDeliveryCode("");
    setDeliveryOpen(true);
  };

  const openRefusalDialog = (redemptionId: string, prizeName: string, userId: string, cost: number) => {
    setRefusalRedemptionId(redemptionId);
    setRefusalPrizeName(prizeName);
    setRefusalUserId(userId);
    setRefusalCost(cost);
    setRefusalReason("");
    setRefusalOpen(true);
  };

  const submitDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryCode.trim()) {
      toast.warning("O código ou mensagem de entrega é obrigatório.");
      return;
    }

    setDelivering(true);
    try {
      await updateDoc(doc(db, "redemptions", deliveryRedemptionId), {
        status: "entregue",
        code: deliveryCode.trim(),
        deliveredAt: new Date().toISOString()
      });
      toast.success("Prêmio entregue com sucesso! O usuário receberá o código em seu painel de Fortecoins.");
      setDeliveryOpen(false);
    } catch (error) {
      console.error("Erro ao entregar prêmio:", error);
      toast.error("Erro ao registrar a entrega do prêmio.");
    } finally {
      setDelivering(false);
    }
  };

  const submitRefusal = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = refusalReason.trim() || "Solicitação recusada pelo administrador.";

    setRefusing(true);
    try {
      // 1. Obter a solicitação para saber o prizeId
      const redRef = doc(db, "redemptions", refusalRedemptionId);
      const redSnap = await getDoc(redRef);
      const redData = redSnap.data();
      const prizeId = redData?.prizeId;

      // 2. Atualizar status da solicitação
      await updateDoc(redRef, {
        status: "recusado",
        code: finalReason,
        refusedAt: new Date().toISOString()
      });

      // 3. Devolver as moedas para o usuário (Postgres é o saldo real usado no checkout)
      await adminCreditCoinsMutation.mutateAsync({ openId: refusalUserId, amount: refusalCost });

      const userRef = doc(db, "users", refusalUserId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentCoins = userSnap.data()?.forteCoins ?? 0;
        await updateDoc(userRef, {
          forteCoins: currentCoins + refusalCost
        });
      }

      // 4. Restaurar estoque do prêmio no Firestore
      if (prizeId) {
        const prizeRef = doc(db, "prizes", prizeId);
        const prizeSnap = await getDoc(prizeRef);
        if (prizeSnap.exists()) {
          const currentStock = prizeSnap.data()?.stock ?? 0;
          await updateDoc(prizeRef, {
            stock: currentStock + 1,
            isActive: true
          });
        }
      }

      toast.success(`Solicitação recusada com sucesso! ${refusalCost} Fortecoins foram devolvidos ao usuário e o estoque do prêmio foi restaurado.`);
      setRefusalOpen(false);
    } catch (error) {
      console.error("Erro ao recusar prêmio:", error);
      toast.error("Erro ao processar recusa do prêmio.");
    } finally {
      setRefusing(false);
    }
  };

  const handlePrizeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPrizeImage(true);
    try {
      const storageRef = ref(storage, `prizes_images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setPrizeImage(url);
      toast.success("Imagem do prêmio enviada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao fazer upload da imagem do prêmio:", error);
      toast.error("Erro ao fazer upload da imagem: " + (error.message || error));
    } finally {
      setUploadingPrizeImage(false);
    }
  };

  const handleAddPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prizeName.trim() || !prizeDesc.trim()) {
      toast.warning("Nome e descrição são obrigatórios.");
      return;
    }

    setAddingPrize(true);
    try {
      if (editingPrizeId) {
        await updateDoc(doc(db, "prizes", editingPrizeId), {
          name: prizeName.trim(),
          cost: Number(prizeCost),
          badge: prizeBadge.trim(),
          description: prizeDesc.trim(),
          stock: Number(prizeStock),
          imageUrl: prizeImage.trim(),
          isActive: Number(prizeStock) > 0
        });
        toast.success("Prêmio atualizado com sucesso!");
      } else {
        const prizeId = "prize_" + Date.now();
        await setDoc(doc(db, "prizes", prizeId), {
          name: prizeName.trim(),
          cost: Number(prizeCost),
          badge: prizeBadge.trim(),
          description: prizeDesc.trim(),
          stock: Number(prizeStock),
          imageUrl: prizeImage.trim(),
          isActive: Number(prizeStock) > 0,
          createdAt: new Date().toISOString()
        });
        toast.success("Prêmio cadastrado com sucesso!");
      }
      setShowPrizeModal(false);
      resetPrizeForm();
    } catch (error) {
      console.error("Erro ao salvar prêmio:", error);
      toast.error("Erro ao salvar prêmio.");
    } finally {
      setAddingPrize(false);
    }
  };

  const handleDeletePrize = async (prizeId: string) => {
    toast("Tem certeza que deseja excluir permanentemente este prêmio?", {
      action: {
        label: "Excluir",
        onClick: async () => {
          try {
            await deleteDoc(doc(db, "prizes", prizeId));
            toast.success("Prêmio excluído com sucesso!");
          } catch (error) {
            console.error("Erro ao excluir prêmio:", error);
            toast.error("Erro ao excluir prêmio.");
          }
        }
      }
    });
  };

  const handleTogglePrizeStatus = async (prizeId: string, currentStatus: boolean, stock: number) => {
    try {
      await updateDoc(doc(db, "prizes", prizeId), {
        isActive: !currentStatus,
        stock: (!currentStatus && stock <= 0) ? 1 : stock
      });
      toast.success(`Prêmio ${!currentStatus ? 'ativado' : 'pausado'} com sucesso!`);
    } catch (error) {
      console.error("Erro ao alterar status do prêmio:", error);
      toast.error("Erro ao atualizar status do prêmio.");
    }
  };

  const GAMES_CATALOG = [
    { name: "AGONY PS4/PS5", price: 9.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/485980/header.jpg" },
    { name: "ASSASSIN'S CREED MIRAGE PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/3035570/header.jpg" },
    { name: "ASSASSIN'S CREED ODYSSEY PS4/PS5", price: 44.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/812140/header.jpg" },
    { name: "ASSASSIN'S CREED ORIGINS PS4/PS5", price: 37.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/582160/header.jpg" },
    { name: "ASSASSIN'S CREED SHADOWS PS5", price: 144.90, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/3159330/header.jpg" },
    { name: "ASSASSIN'S CREED SYNDICATE PS4/PS5", price: 59.99, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/368500/header.jpg" },
    { name: "ASSASSIN'S CREED VALHALLA PS4/PS5", price: 50.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2208920/header.jpg" },
    { name: "ATOMIC HEART PS4/PS5", price: 69.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/668580/header.jpg" },
    { name: "AVATAR PS4/PS5", price: 74.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2840770/header.jpg" },
    { name: "BATTLEFIELD 1 PS4/PS5", price: 34.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1238840/header.jpg" },
    { name: "BATTLEFIELD 4 PS4/PS5", price: 29.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1238860/header.jpg" },
    { name: "BATTLEFIELD V PS4/PS5", price: 36.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1238810/header.jpg" },
    { name: "BLEACH REBIRTH OF SOULS PS5", price: 100.00, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1689620/header.jpg" },
    { name: "CALL OF DUTY GHOSTS PS4/PS5", price: 99.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/209160/header.jpg" },
    { name: "CALL OF DUTY VANGUARD PS4/PS5", price: 89.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1985820/header.jpg" },
    { name: "CALL OF DUTY WW2 PS4/PS5", price: 100.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/311210/header.jpg" },
    { name: "COD BLACK OPS 6 PS4/PS5", price: 80.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/3669540/header.jpg" },
    { name: "COD COLD WAR PS4/PS5", price: 80.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1985810/header.jpg" },
    { name: "CRASH BANDICOOT TRILOGY PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1378990/header.jpg" },
    { name: "CRASH NITRO KART PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/731490/header.jpg" },
    { name: "DEAD ISLAND 2 PS4/PS5", price: 50.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/934700/header.jpg" },
    { name: "DEAD SPACE PS5", price: 69.90, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1693980/header.jpg" },
    { name: "DEMON SLAYER 2 PS4/PS5", price: 144.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/3025800/header.jpg" },
    { name: "DETROIT BECOME HUMAN PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1222140/header.jpg" },
    { name: "DEVIL MAY CRY 5 PS5", price: 30.00, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/601150/header.jpg" },
    { name: "DEVIL MAY CRY 5 + VERGIL PS4/PS5", price: 16.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1432643/header.jpg" },
    { name: "DEVIL MAY CRY DEFINITIVE EDITION PS4", price: 36.90, platform: "PS4", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/601150/header.jpg" },
    { name: "DIABLO 4 PS4/PS5", price: 100.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2344520/header.jpg" },
    { name: "DIABLO ETERNAL COLLECTION PS4/PS5", price: 64.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2344520/header.jpg" },
    { name: "DOOM ETERNAL PS4/PS5", price: 64.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/782330/header.jpg" },
    { name: "DRAGON BALL KAKAROT PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/851850/header.jpg" },
    { name: "DRAGON BALL SPARKING ZERO PS5", price: 174.90, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1790600/header.jpg" },
    { name: "DYING LIGHT PS4/PS5", price: 20.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/239140/header.jpg" },
    { name: "DYING LIGHT 2 PS4/PS5", price: 54.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/534380/header.jpg" },
    { name: "FAR CRY 5 PS4/PS5", price: 30.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/552520/header.jpg" },
    { name: "FAR CRY 6 PS4/PS5", price: 54.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2369390/header.jpg" },
    { name: "FAR CRY NEW DAWN PS4/PS5", price: 24.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/939960/header.jpg" },
    { name: "FINAL FANTASY XVI PS5", price: 119.90, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2515020/header.jpg" },
    { name: "GHOST RECON WILDLANDS PS4/PS5", price: 34.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/460930/header.jpg" },
    { name: "GOD OF WAR 2018 PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1593500/header.jpg" },
    { name: "GOD OF WAR 3 REMASTER PS4/PS5", price: 36.99, platform: "PS4/PS5", imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800" },
    { name: "GTA V PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg" },
    { name: "HI-FI RUSH PS5", price: 59.90, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1817230/header.jpg" },
    { name: "HOGWARTS LEGACY PS4/PS5", price: 39.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/990080/header.jpg" },
    { name: "HORIZON FORBIDDEN WEST PS4/PS5", price: 100.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2420110/header.jpg" },
    { name: "JEDI FALLEN ORDER PS4/PS5", price: 44.99, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1172380/header.jpg" },
    { name: "JUST CAUSE 4 PS4/PS5", price: 19.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/517630/header.jpg" },
    { name: "MAFIA 3 PS4/PS5", price: 24.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/360430/header.jpg" },
    { name: "MARTHA IS DEAD PS4/PS5", price: 40.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/515960/header.jpg" },
    { name: "MORTAL KOMBAT 1 PS5", price: 69.90, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1971870/header.jpg" },
    { name: "MORTAL KOMBAT 11 PS4/PS5", price: 20.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/976310/header.jpg" },
    { name: "NARUTO STORM 4 PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/349040/header.jpg" },
    { name: "PREY PS4/PS5", price: 27.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/480490/header.jpg" },
    { name: "PRINCE OF PERSIA LOST CROWN PS4/PS5", price: 44.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2751000/header.jpg" },
    { name: "RED DEAD REDEMPTION 2 PS4/PS5", price: 64.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg" },
    { name: "SHADOW OF THE COLOSSUS PS4/PS5", price: 44.99, platform: "PS4/PS5", imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800" },
    { name: "SHADOW OF MORDOR PS4/PS5", price: 17.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/241930/header.jpg" },
    { name: "SNIPER ELITE 4 PS4/PS5", price: 27.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/312660/header.jpg" },
    { name: "STAR WARS OUTLAWS PS5", price: 69.90, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2842040/header.jpg" },
    { name: "THE CREW MOTORFEST PS4/PS5", price: 55.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2698940/header.jpg" },
    { name: "THE ELDER SCROLLS V SKYRIM PS4/PS5", price: 36.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/489830/header.jpg" },
    { name: "THE LAST OF US PART I PS5", price: 120.00, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1888930/header.jpg" },
    { name: "THE LAST OF US PART II PS4", price: 100.00, platform: "PS4", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2531310/header.jpg" },
    { name: "THE LAST OF US REMASTERED PS4/PS5", price: 35.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1888930/header.jpg" },
    { name: "THE ORDER 1886 PS4/PS5", price: 36.90, platform: "PS4/PS5", imageUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=800" },
    { name: "TOM CLANCY GHOST RECON BREAKPOINT PS4/PS5", price: 39.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2231380/header.jpg" },
    { name: "TONY HAWK'S PRO SKATER 1+2 PS4/PS5", price: 64.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2395210/header.jpg" },
    { name: "UNCHARTED 4 + LOST LEGACY PS4", price: 69.90, platform: "PS4", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1659420/header.jpg" },
    { name: "UNCHARTED LEGACY OF THIEVES PS5", price: 89.90, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1659420/header.jpg" },
    { name: "WATCH DOGS LEGION PS4/PS5", price: 29.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2239550/header.jpg" },
    { name: "WOLFENSTEIN THE NEW ORDER PS4/PS5", price: 16.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/201810/header.jpg" },
  ];

  const handleSeedGames = async () => {
    toast(`Isso vai carregar ${GAMES_CATALOG.length} jogos no catálogo. Continuar?`, {
      action: {
        label: "Continuar",
        onClick: async () => {
          setSeeding(true);
          setSeedLog([]);
          let inserted = 0; let updated = 0;
          for (const game of GAMES_CATALOG) {
            try {
              // Verifica se já existe na lista atual carregada pelo TRPC
              const existingGame = gamesList.find((g: any) => g.name === game.name);
              
              if (existingGame) {
                await adminUpdateGameMutation.mutateAsync({
                  id: existingGame.id,
                  name: game.name,
                  price: game.price,
                  pricePrimary: null,
                  priceSecondary: null,
                  type: "jogo",
                  platform: game.platform,
                  category: undefined,
                  imageUrl: game.imageUrl,
                  coverFit: "cover",
                  stock: 999,
                  isActive: true,
                  isPreVenda: false,
                  showInEconomia: true,
                  economiaLicenseType: "secundaria"
                });
                setSeedLog(l => [...l, `[~] Atualizado: ${game.name}`]);
                updated++;
              } else {
                await adminCreateGameMutation.mutateAsync({
                  name: game.name,
                  price: game.price,
                  pricePrimary: null,
                  priceSecondary: null,
                  type: "jogo",
                  platform: game.platform,
                  category: undefined,
                  imageUrl: game.imageUrl,
                  coverFit: "cover",
                  stock: 999,
                  isActive: true,
                  isPreVenda: false,
                  showInEconomia: true,
                  economiaLicenseType: "secundaria"
                });
                setSeedLog(l => [...l, `[+] Inserido: ${game.name}`]);
                inserted++;
              }
            } catch (e: any) {
              setSeedLog(l => [...l, `[!] Erro em ${game.name}: ${e.message}`]);
            }
          }
          toast.success(`Catálogo populado! Inseridos: ${inserted} | Atualizados: ${updated}`);
          setSeeding(false);
          adminDigitalProductsQuery.refetch();
        }
      }
    });
  };

  if (authLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-bold">Verificando Credenciais...</div>;

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center card-neon bg-slate-900 p-8 rounded-xl max-w-md w-full border border-red-600/30">
          <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Restrito ao Gestor</h1>
          <p className="text-slate-400 mb-6">Apenas o administrador principal pode gerenciar permissões.</p>
          <Button onClick={() => navigate("/")} className="w-full bg-red-600 hover:bg-red-700">Voltar para Home</Button>
        </div>
      </div>
    );
  }

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 border-r border-red-600/10 text-slate-200">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <Shield className="w-8 h-8 text-red-600 animate-pulse" />
        <div>
          <h2 className="text-lg font-black text-neon tracking-tight uppercase">Eforte Games</h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Painel do Gestor</span>
        </div>
      </div>

      {/* Nav Options */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.value;
          const showSectionHeader = Boolean(item.section) && item.section !== menuItems[index - 1]?.section;
          return (
            <div key={item.value}>
              {showSectionHeader && (
                <p className="px-4 pt-4 pb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  {item.section}
                </p>
              )}
              <button
                onClick={() => {
                  setActiveTab(item.value);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${isActive ? "bg-red-600/10 text-red-500 border-l-4 border-red-600 font-bold" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-red-500" : "text-slate-500 group-hover:text-red-500"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20">
        <div className="flex items-center gap-3 px-2 py-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center font-bold text-red-500 uppercase text-sm shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-xs truncate">{user?.name || "Administrador"}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="flex-1 h-9 text-xs border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 font-bold"
          >
            Ir para Home
          </Button>
          <Button
            variant="ghost"
            onClick={logout}
            className="h-9 w-9 p-0 text-slate-400 hover:text-red-500 hover:bg-red-950/20 rounded-lg shrink-0"
            title="Sair da Conta"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer (Sidebar overlay) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)} 
          />
          {/* Drawer Content */}
          <aside className="relative flex flex-col w-64 h-full z-10 animate-in slide-in-from-left duration-300">
            {renderSidebarContent()}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 -right-12 w-9 h-9 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </aside>
        </div>
      )}

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="bg-slate-900 border-b border-red-600/10 py-4 px-6 sticky top-0 z-30 backdrop-blur-md bg-opacity-95">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              {/* Hamburger Menu Trigger */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSidebarOpen(true)} 
                className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <Menu className="w-6 h-6" />
              </Button>

              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                <Shield className="w-6 h-6 text-red-600 shrink-0" />
                {menuItems.find(item => item.value === activeTab)?.label || (activeTab === "mensagens" || activeTab === "negociacoes" ? "Negociações & Mensagens" : "Painel do Gestor")}
              </h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {permState !== "granted" && (
                <button
                  onClick={handleToggleOrRequestNotifs}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-red-300 text-xs font-bold transition-all animate-pulse"
                  title="Clique para ativar pop-ups no Windows e avisos sonoros"
                >
                  <span>🔔</span>
                  <span>Ativar Alertas Windows</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab("notificacoes")}
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-red-600/40 flex items-center justify-center transition-all shrink-0"
                title="Central de Notificações"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                {pendingNotifCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-slate-900 animate-pulse">
                    {pendingNotifCount > 9 ? "9+" : pendingNotifCount}
                  </span>
                )}
              </button>
              <Button onClick={() => setShowCreateModal(true)} className="bg-red-600 hover:bg-red-700 font-bold btn-neon flex items-center gap-1.5 h-9 px-2.5 sm:px-4 text-xs sm:h-10 sm:text-sm shrink-0">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Criar Novo Acesso</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 py-6 sm:py-8 px-3 sm:px-6 lg:px-8 pb-36 lg:pb-16 max-w-7xl w-full mx-auto">
          <Tabs value={activeTab === "mensagens" ? "negociacoes" : activeTab} onValueChange={(val) => setActiveTab(normalizeAdminTab(val))} className="w-full">

            {/* ========================= COMPRAS PENDENTES DE ENTREGA ========================= */}
            <TabsContent value="compras_pendentes" className="space-y-6 pb-16">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <ShoppingBag className="w-6 h-6 text-red-500" /> Compras Pendentes de Entrega
                    {(() => {
                      const count = (sales || []).filter((o: any) => o.status === "pago" || o.status === "pendente").length;
                      return count > 0 ? (
                        <span className="bg-red-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full animate-pulse">
                          {count} pendente{count !== 1 ? "s" : ""}
                        </span>
                      ) : null;
                    })()}
                  </h3>
                  <p className="text-slate-400 text-sm mt-0.5">
                    Pedidos de Mídia Digital e vendas. Atendimento: Segunda a Sábado até 22:00 / Domingo até 16:00.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => simulateTestOrderMutation.mutate()}
                    disabled={simulateTestOrderMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg flex items-center gap-1.5"
                  >
                    🧪 Simular Compra de Teste
                  </Button>
                  {(() => {
                    const storeStatus = getStoreStatus();
                    return (
                      <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${storeStatus.isOpen ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/40" : "bg-amber-950/40 text-amber-400 border-amber-500/40"}`}>
                        <Clock className="w-4 h-4 animate-pulse" />
                        {storeStatus.isOpen ? "🟢 Loja Aberta (Entregas Ativas)" : "⏰ Loja Fechada (Atendimento até 22h / Dom 16h)"}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const pendingOrders = (sales || []).filter((o: any) => o.status === "pago" || o.status === "pendente");
                  if (pendingOrders.length === 0) {
                    return (
                      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
                        <CheckCircle2 className="w-12 h-12 text-green-500/40 mx-auto mb-3" />
                        <h4 className="text-base font-bold text-white">Nenhum Pedido Pendente de Entrega</h4>
                        <p className="text-slate-400 text-xs mt-1">Todos os pedidos foram entregues e concluídos com sucesso!</p>
                      </div>
                    );
                  }

                  return pendingOrders.map((order: any) => (
                    <Card key={order.id} className="bg-slate-900 border-red-600/20 p-5 card-neon space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-mono text-slate-500">Pedido #{order.id}</span>
                            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              {order.productType === "digital" ? "🎮 Mídia Digital" : order.productType === "used" ? "📦 Usado / Desapego" : "🛒 Loja"}
                            </span>
                            {order.productName?.includes("(PS4)") && (
                              <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                🎮 PS4
                              </span>
                            )}
                            {order.productName?.includes("(PS5)") && (
                              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                ⚡ PS5
                              </span>
                            )}
                            {order.accountType && (
                              <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {order.accountType === "primaria" ? "👤 Conta Primária" : "👥 Conta Secundária"}
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-white">{order.productName || "Jogo Mídia Digital"}</h4>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-lg font-black text-emerald-400">R$ {parseFloat(order.totalPrice || "0").toFixed(2).replace(".", ",")}</p>
                          <p className="text-[10px] text-slate-400">Comprado em {new Date(order.createdAt).toLocaleString("pt-BR")}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs">
                        <div>
                          <p className="text-slate-500 font-bold uppercase text-[10px]">Comprador</p>
                          <p className="text-white font-semibold">{order.buyerName || "Cliente"}</p>
                          <p className="text-slate-400 text-[11px]">{order.buyerEmail}</p>
                          {order.buyerPhone && (
                            <p className="text-green-400 text-[11px] font-bold flex items-center gap-1 mt-0.5">
                              <MessageCircle className="w-3 h-3" /> {order.buyerPhone}
                            </p>
                          )}
                          {!order.buyerPhone && (
                            <p className="text-slate-600 text-[10px] italic mt-0.5">WhatsApp não informado</p>
                          )}
                        </div>
                        <div>
                          <p className="text-slate-500 font-bold uppercase text-[10px]">Status do Pagamento</p>
                          <span className="text-green-400 font-bold uppercase text-[11px] inline-block mt-0.5">
                            ✓ {order.status}
                          </span>
                        </div>
                      </div>

                      {order.deliveryDetails && (
                        <div className="bg-slate-950 p-3 rounded-xl border border-red-600/30 space-y-1">
                          <p className="text-[10px] font-bold text-red-400 uppercase">Instruções de Entrega Cadastradas:</p>
                          <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap select-all">{order.deliveryDetails}</pre>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          onClick={() => {
                            setSelectedDeliveryOrder(order);
                            setDeliveryDetailsInput(order.deliveryDetails || "");
                            setShowDeliverModal(true);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 px-4 flex items-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          {order.deliveryDetails ? "Editar Dados de Acesso" : "🗝️ Entregar Login / Senha"}
                        </Button>
                        <Button
                          onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: "entregue" })}
                          disabled={updateOrderStatusMutation.isPending}
                          variant="outline"
                          className="bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-400 border-emerald-500/40 font-bold text-xs h-9 px-4 flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Marcar Concluído / Entregue
                        </Button>
                        {/* Botão WhatsApp — abre direto no número do comprador */}
                        <Button
                          onClick={() => {
                            const rawPhone = order.buyerPhone || "";
                            // Normaliza: remove tudo que não é dígito e garante código do país
                            const digits = rawPhone.replace(/\D/g, "");
                            const phone = digits.startsWith("55") ? digits : digits ? `55${digits}` : "";
                            const text = encodeURIComponent(
                              `Olá ${order.buyerName || "Cliente"}! Sobre o seu pedido #${order.id} (${order.productName}) na EforteGames:`
                            );
                            if (phone) {
                              window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
                            } else {
                              window.open(`https://wa.me/?text=${text}`, "_blank");
                            }
                          }}
                          variant="outline"
                          title={order.buyerPhone ? `WhatsApp: ${order.buyerPhone}` : "Número não cadastrado — abrirá sem destinatário"}
                          className={`font-bold text-xs h-9 px-3 flex items-center gap-1.5 ${
                            order.buyerPhone
                              ? "bg-green-950/30 hover:bg-green-900/50 text-green-400 border-green-500/40"
                              : "bg-slate-900 text-slate-500 border-slate-700 cursor-not-allowed"
                          }`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp{!order.buyerPhone && " ⚠️"}
                        </Button>
                        {/* Botão Chat pelo Site — abre a conversa direta com o comprador */}
                        <Button
                          onClick={() => {
                            setActiveTab("negociacoes");
                            const buyerOpenId = order.buyerOpenId;
                            const existingChat = allChats.find((c: any) =>
                              (buyerOpenId && (c.id === buyerOpenId || c.userId === buyerOpenId)) ||
                              (order.buyerEmail && c.userEmail && c.userEmail.toLowerCase() === order.buyerEmail.toLowerCase())
                            );
                            const targetId = buyerOpenId || existingChat?.id || existingChat?.userId || (order.buyerId ? String(order.buyerId) : "");
                            if (targetId) {
                              setSelectedChatUser({
                                id: targetId,
                                name: order.buyerName || existingChat?.userName || "Cliente",
                                email: order.buyerEmail || existingChat?.userEmail || "",
                                topic: `Pedido #${order.id} - ${order.productName || "Jogo"}`,
                              });
                            }
                          }}
                          variant="outline"
                          title="Abrir chat direto com este cliente"
                          className="bg-blue-950/30 hover:bg-blue-900/50 text-blue-400 border-blue-500/40 font-bold text-xs h-9 px-3 flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Chat pelo Site
                        </Button>
                        {/* Botão Excluir Pedido (útil para apagar testes) */}
                        <Button
                          onClick={() => handleDeleteSale(order.id)}
                          disabled={deleteOrderMutation.isPending}
                          variant="outline"
                          title="Excluir pedido (útil para apagar simulações e testes)"
                          className="bg-red-950/30 hover:bg-red-900/50 text-red-400 border-red-500/40 font-bold text-xs h-9 px-3 flex items-center gap-1.5 ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </Button>
                      </div>
                    </Card>
                  ));
                })()}
              </div>
            </TabsContent>

            {/* ========================= CENTRAL DE NOTIFICAÇÕES ========================= */}
            <TabsContent value="notificacoes" className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Bell className="w-6 h-6 text-red-500" /> Central de Notificações
                    {pendingNotifCount > 0 && (
                      <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-full animate-pulse">
                        {pendingNotifCount} pendente{pendingNotifCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </h3>
                  <p className="text-slate-400 text-sm mt-0.5">Visão unificada de toda a atividade do site em tempo real.</p>
                </div>

                {/* Ações de limpeza — só tiram da lista, não apagam chat/pedido/resgate de verdade */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleToggleOrRequestNotifs}
                    title={notifSoundEnabled ? "Alertas sonoros e pop-ups ativados" : "Ativar alertas sonoros e pop-ups"}
                    className={`h-8 text-xs px-3 ${notifSoundEnabled ? "border-red-600/50 text-red-400 bg-red-950/20" : "border-slate-700 text-slate-400 hover:bg-slate-800"}`}
                  >
                    {notifSoundEnabled ? "🔔 Som Ativo" : "🔕 Som Pausado"}
                  </Button>
                  {notifSelectMode && (
                    <Button
                      size="sm"
                      onClick={dismissSelectedNotifs}
                      disabled={selectedNotifIds.size === 0}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold h-8 text-xs px-3 disabled:opacity-40"
                    >
                      Apagar Selecionadas ({selectedNotifIds.size})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNotifSelectMode(v => !v);
                      setSelectedNotifIds(new Set());
                    }}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 h-8 text-xs px-3"
                  >
                    {notifSelectMode ? "Cancelar" : "Selecionar"}
                  </Button>
                </div>
              </div>

              {/* Card de Configuração de Notificações no Windows e Alertas */}
              <div className="bg-slate-900/90 border border-red-600/20 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 card-neon shadow-lg">
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-inner ${
                    permState === "granted" && notifSoundEnabled ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}>
                    {permState === "granted" && notifSoundEnabled ? "🔔" : "🔕"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-white">
                        Pop-ups no Windows & Avisos Sonoros
                      </h4>
                      {permState === "granted" && notifSoundEnabled ? (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-2.5 py-0.5 rounded-full font-bold border border-green-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Ativo no Windows
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold border border-amber-500/30">
                          {permState === "denied" ? "Bloqueado no Navegador" : "Aguardando Permissão"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                      {permState === "granted"
                        ? "O sistema emitirá pop-ups nativos no canto do Windows e som harmônico sempre que um cliente comprar, resgatar prêmios ou enviar mensagens no chat."
                        : permState === "denied"
                        ? "Notificações bloqueadas pelo navegador. Para ativar: clique no ícone de cadeado na barra de endereços (ao lado do site) e mude Notificações para 'Permitir'."
                        : "Clique no botão ao lado para autorizar o navegador a exibir balões pop-up no Windows quando entrarem novas compras ou conversas."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <Button
                    onClick={handleToggleOrRequestNotifs}
                    className={`font-bold text-xs h-9 px-4 flex-1 sm:flex-initial ${
                      permState === "granted" && notifSoundEnabled
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        : "bg-red-600 hover:bg-red-700 text-white btn-neon"
                    }`}
                  >
                    {permState === "granted" && notifSoundEnabled ? "🔕 Pausar Som" : "🔔 Ativar no Windows"}
                  </Button>
                  {permState === "granted" && (
                    <Button
                      variant="outline"
                      onClick={handleTestWindowsNotification}
                      className="border-red-500/40 text-red-400 hover:bg-red-950/30 font-bold text-xs h-9 px-3"
                      title="Disparar pop-up de teste no Windows agora"
                    >
                      🔊 Testar Alerta
                    </Button>
                  )}
                </div>
              </div>

              {/* Busca */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={notifSearch}
                  onChange={(e) => setNotifSearch(e.target.value)}
                  placeholder="Buscar por nome, cliente, jogo..."
                  className="bg-slate-950 border-slate-800 text-white text-sm h-9 pl-9"
                />
              </div>

              {/* Filtros por Categoria */}
              <div className="flex flex-wrap gap-2 items-center">
                {[
                  { key: "todas", label: "🔔 Todas", color: "bg-slate-700 text-slate-200" },
                  { key: "resgate", label: "🎁 Gift Cards", color: "bg-purple-900/60 text-purple-300 border border-purple-700/40" },
                  { key: "mensagem", label: "💬 Mensagens", color: "bg-blue-900/60 text-blue-300 border border-blue-700/40" },
                  { key: "indicacao", label: "💰 Indicações", color: "bg-yellow-900/60 text-yellow-300 border border-yellow-700/40" },
                  { key: "pedido", label: "🛒 Pedidos", color: "bg-green-900/60 text-green-300 border border-green-700/40" },
                  { key: "pendente", label: "⚠️ Pendentes", color: "bg-red-900/60 text-red-300 border border-red-700/40" },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setNotifFilter(f.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      notifFilter === f.key
                        ? "ring-2 ring-red-500 scale-105 " + f.color
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {f.label}
                    {f.key !== "todas" && (
                      <span className="ml-1.5 opacity-70">
                        ({visibleNotificationFeed.filter(n => f.key === "pendente" ? n.status === "pendente" : n.category === f.key).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Feed de Notificações */}
              <div className="space-y-3">
                {(() => {
                  const byCategory = notifFilter === "todas"
                    ? visibleNotificationFeed
                    : notifFilter === "pendente"
                      ? visibleNotificationFeed.filter(n => n.status === "pendente")
                      : visibleNotificationFeed.filter(n => n.category === notifFilter);

                  const searchTerm = notifSearch.trim().toLowerCase();
                  const filtered = searchTerm
                    ? byCategory.filter(n => n.title?.toLowerCase().includes(searchTerm) || n.subtitle?.toLowerCase().includes(searchTerm))
                    : byCategory;

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-16 text-slate-500">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-bold">{searchTerm ? "Nenhum resultado pra essa busca" : "Nenhuma atividade nesta categoria"}</p>
                        <p className="text-xs mt-1">Tudo tranquilo por aqui!</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="flex justify-between items-center pb-1">
                        <span className="text-[11px] text-slate-500">{filtered.length} notificaç{filtered.length === 1 ? "ão" : "ões"} nesta lista</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissAllVisibleNotifs(filtered.map((f: any) => f.id))}
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-7 text-[11px] px-2"
                        >
                          🗑️ Apagar Tudo Daqui
                        </Button>
                      </div>
                      {filtered.map((item: any) => {
                    const categoryColors: Record<string, string> = {
                      resgate: "border-l-purple-500 bg-purple-950/20",
                      mensagem: "border-l-blue-500 bg-blue-950/20",
                      indicacao: "border-l-yellow-500 bg-yellow-950/20",
                      pedido: "border-l-green-500 bg-green-950/20",
                    };
                    const statusBadge: Record<string, string> = {
                      pendente: "bg-amber-500/20 text-amber-400 border border-amber-600/40",
                      pago: "bg-green-500/20 text-green-400 border border-green-600/40",
                      entregue: "bg-green-500/20 text-green-400 border border-green-600/40",
                      confirmado: "bg-green-500/20 text-green-400 border border-green-600/40",
                      lido: "bg-slate-700/40 text-slate-400 border border-slate-600/40",
                      recusado: "bg-red-500/20 text-red-400 border border-red-600/40",
                    };

                    return (
                      <div
                        key={item.id}
                        className={`relative flex items-start gap-4 p-4 rounded-xl border border-slate-800 border-l-4 transition-all hover:bg-slate-800/40 cursor-default ${categoryColors[item.category] || "bg-slate-900"}`}
                      >
                        {/* Dot Pendente */}
                        {item.status === "pendente" && !notifSelectMode && (
                          <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                        )}

                        {/* Botão de apagar individual (fora do modo seleção) */}
                        {!notifSelectMode && (
                          <button
                            type="button"
                            onClick={() => dismissOneNotif(item.id)}
                            title="Apagar da lista"
                            className="absolute top-2.5 right-2.5 text-slate-600 hover:text-red-400 transition-colors text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-slate-800"
                          >
                            ✕
                          </button>
                        )}

                        {/* Checkbox de seleção */}
                        {notifSelectMode && (
                          <input
                            type="checkbox"
                            checked={selectedNotifIds.has(item.id)}
                            onChange={() => toggleNotifSelected(item.id)}
                            className="shrink-0 w-4 h-4 mt-2 accent-red-600 rounded cursor-pointer"
                          />
                        )}

                        {/* Ícone Categoria */}
                        <div className="shrink-0 w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl">
                          {item.category === "resgate" && "🎁"}
                          {item.category === "mensagem" && "💬"}
                          {item.category === "indicacao" && "💰"}
                          {item.category === "pedido" && "🛒"}
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm truncate">{item.title}</p>
                          <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{item.subtitle}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge[item.status] || statusBadge["lido"]}`}>
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                            <span className="text-[10px] text-slate-500">🕐 {item.createdAtStr}</span>
                          </div>
                        </div>

                        {/* Ações Rápidas */}
                        <div className="shrink-0 flex flex-col gap-1.5">
                          {item.category === "mensagem" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedChatUser({ id: item.data.userId || item.rawId, name: item.data.userName || "Cliente", email: item.data.userEmail });
                                setActiveTab("negociacoes");
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-7 text-[10px] px-2.5 flex items-center gap-1"
                            >
                              <MessageCircle className="w-3 h-3" /> Ver Chat
                            </Button>
                          )}
                          {item.category === "resgate" && (
                            <Button
                              size="sm"
                              onClick={() => setActiveTab("referrals")}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-7 text-[10px] px-2.5 flex items-center gap-1"
                            >
                              <Gift className="w-3 h-3" /> Ver Resgate
                            </Button>
                          )}
                          {item.category === "indicacao" && (
                            <Button
                              size="sm"
                              onClick={() => setActiveTab("referrals")}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold h-7 text-[10px] px-2.5 flex items-center gap-1"
                            >
                              <Coins className="w-3 h-3" /> Ver Indicação
                            </Button>
                          )}
                          {item.category === "pedido" && (
                            <Button
                              size="sm"
                              onClick={() => setActiveTab("vendas")}
                              className="bg-green-600 hover:bg-green-700 text-white font-bold h-7 text-[10px] px-2.5 flex items-center gap-1"
                            >
                              <ShoppingBag className="w-3 h-3" /> Ver Pedido
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                    </>
                  );
                })()}
              </div>

              {/* Resumo de Estatísticas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-800">
                {[
                  { label: "Gift Cards", count: visibleNotificationFeed.filter(n => n.category === "resgate").length, pending: visibleNotificationFeed.filter(n => n.category === "resgate" && n.status === "pendente").length, color: "text-purple-400", icon: "🎁" },
                  { label: "Mensagens", count: visibleNotificationFeed.filter(n => n.category === "mensagem").length, pending: visibleNotificationFeed.filter(n => n.category === "mensagem" && n.status === "pendente").length, color: "text-blue-400", icon: "💬" },
                  { label: "Indicações", count: visibleNotificationFeed.filter(n => n.category === "indicacao").length, pending: visibleNotificationFeed.filter(n => n.category === "indicacao" && n.status === "pendente").length, color: "text-yellow-400", icon: "💰" },
                  { label: "Pedidos", count: visibleNotificationFeed.filter(n => n.category === "pedido").length, pending: visibleNotificationFeed.filter(n => n.category === "pedido" && n.status === "pendente").length, color: "text-green-400", icon: "🛒" },
                ].map(stat => (
                  <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                    <div className="text-2xl mb-1">{stat.icon}</div>
                    <div className={`text-2xl font-black ${stat.color}`}>{stat.count}</div>
                    <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
                    {stat.pending > 0 && (
                      <div className="text-[10px] text-amber-400 font-bold mt-1">
                        ⚠️ {stat.pending} pendente{stat.pending !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
            {/* ======================================================================= */}

            <TabsContent value="visao-geral" className="pb-16">
              <div className="space-y-8 pb-12">
              {/* KPIs Row */}
              {(() => {
                const stats = getSalesStats();
                const activeCount = realUsers.filter((u: any) => {
                  if (!u.lastSignedIn) return false;
                  const lastActive = new Date(u.lastSignedIn).getTime();
                  return (Date.now() - lastActive) < 15 * 60 * 1000;
                }).length;

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card className="bg-slate-900 border-red-600/10 p-6 card-neon">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Faturamento Hoje</p>
                            <p className="text-2xl font-black text-white">R$ {stats.today.toFixed(2).replace(".", ",")}</p>
                            <p className="text-[10px] text-slate-500 mt-1 font-semibold">{stats.todayCount} venda(s)</p>
                          </div>
                          <Coins className="w-8 h-8 text-red-500" />
                        </div>
                      </Card>

                      <Card className="bg-slate-900 border-red-600/10 p-6 card-neon">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Faturamento na Semana</p>
                            <p className="text-2xl font-black text-white">R$ {stats.week.toFixed(2).replace(".", ",")}</p>
                            <p className="text-[10px] text-slate-500 mt-1 font-semibold">{stats.weekCount} venda(s)</p>
                          </div>
                          <Coins className="w-8 h-8 text-orange-500" />
                        </div>
                      </Card>

                      <Card className="bg-slate-900 border-red-600/10 p-6 card-neon">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Faturamento no Mês</p>
                            <p className="text-2xl font-black text-white">R$ {stats.month.toFixed(2).replace(".", ",")}</p>
                            <p className="text-[10px] text-slate-500 mt-1 font-semibold">{stats.monthCount} venda(s)</p>
                          </div>
                          <Coins className="w-8 h-8 text-yellow-500" />
                        </div>
                      </Card>

                      <Card className="bg-slate-900 border-red-600/10 p-6 card-neon">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Faturamento Total</p>
                            <p className="text-2xl font-black text-red-500">R$ {stats.total.toFixed(2).replace(".", ",")}</p>
                            <p className="text-[10px] text-slate-500 mt-1 font-semibold">{stats.count} venda(s) concluída(s)</p>
                          </div>
                          <Coins className="w-8 h-8 text-red-600 animate-pulse" />
                        </div>
                      </Card>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 mt-6">
                      <Card className="bg-slate-900 border-red-600/10 p-6 card-neon flex-1 max-w-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Usuários Cadastrados</p>
                            <p className="text-2xl font-black text-white">{users.length}</p>
                          </div>
                          <User className="w-8 h-8 text-slate-500" />
                        </div>
                      </Card>

                      <Card className="bg-slate-900 border-red-600/10 p-6 card-neon flex-1 max-w-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
                              Usuários Online (15m)
                            </p>
                            <p className="text-2xl font-black text-green-500">{activeCount}</p>
                          </div>
                          <UserCheck className="w-8 h-8 text-green-500" />
                        </div>
                      </Card>
                    </div>
                  </>
                );
              })()}

              {/* Chart Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-slate-900 border-red-600/10 p-6 card-neon">
                  <h3 className="text-base font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                    📈 Faturamento Diário (Últimos 7 Dias)
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                        <ChartTooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(220, 38, 38, 0.2)", borderRadius: "8px", color: "#fff" }} />
                        <Area type="monotone" dataKey="Faturamento" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFaturamento)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="bg-slate-900 border-red-600/10 p-6 card-neon flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white mb-6 uppercase tracking-wider">
                      📋 Vendas Recentes
                    </h3>
                    <div className="space-y-4">
                      {sales && sales.slice(0, 5).map((sale: any) => (
                        <div key={sale.id} className="flex justify-between items-center border-b border-slate-800/60 pb-3 last:border-0 last:pb-0">
                          <div className="max-w-[150px]">
                            <p className="font-bold text-slate-200 text-sm truncate">{sale.productName}</p>
                            <p className="text-[10px] text-slate-500 truncate">Comprador: {sale.buyerName}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-red-500 text-sm">R$ {parseFloat(sale.totalPrice || "0").toFixed(2).replace(".", ",")}</p>
                            <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${sale.status === "entregue" ? "bg-green-500/10 text-green-500" : sale.status === "pago" || sale.status === "enviado" ? "bg-blue-500/10 text-blue-400 animate-pulse" : "bg-slate-800 text-slate-400"}`}>
                              {sale.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {(!sales || sales.length === 0) && (
                        <p className="text-slate-500 text-sm italic text-center py-8">Nenhuma venda registrada.</p>
                      )}
                    </div>
                  </div>
                  {sales && sales.length > 0 && (
                    <Button onClick={() => setActiveTab("vendas")} className="w-full bg-slate-950 border border-red-600/20 hover:bg-slate-900 text-xs font-bold mt-4 h-9">
                      Ver Todas as Vendas
                    </Button>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="usuarios">
            <h2 className="text-xl font-bold text-white mb-8 border-l-4 border-red-600 pl-4 uppercase tracking-widest text-sm italic">Gestão de Equipe</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.filter(u => u.role === 'admin' || u.role === 'collaborator' || u.email === 'luanmnogueira@gmail.com').map((u) => (
                <Card key={u.id} className="bg-slate-900/40 backdrop-blur-md border-red-600/10 p-6 hover:border-red-600/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-500 card-neon relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full blur-2xl group-hover:bg-red-600/10 transition-all duration-500" />
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center border border-red-600/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] group-hover:border-red-600/60 transition-colors duration-500">
                        <User className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div>
                        <p className="font-bold text-white transition-colors duration-300 group-hover:text-red-500">{u.name || "Sem Nome"}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                    {(() => {
                      const displayRole = u.email === 'luanmnogueira@gmail.com' ? 'admin' : u.role;
                      return (
                        <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-300 ${displayRole === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)]' : displayRole === 'collaborator' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]' : 'bg-slate-800/80 text-slate-400 border-slate-700/50'}`}>
                          {displayRole}
                        </div>
                      );
                    })()}
                    {u.email !== 'luanmnogueira@gmail.com' && (
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id, u.email)} className="text-slate-600 hover:text-red-500 -mt-2 -mr-2 relative z-20">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 border-t border-slate-800/60 pt-4 relative z-10">
                    <label className="text-xs text-slate-400 font-bold block mb-1">Saldo de Fortecoins</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Coins className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-red-500" />
                        <Input
                          type="number"
                          placeholder="Forte Coins"
                          defaultValue={u.forteCoins ?? 0}
                          id={`coins-input-${u.id}`}
                          className="bg-slate-950 border-red-600/20 pl-8 h-9 text-xs"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={async () => {
                          const inputEl = document.getElementById(`coins-input-${u.id}`) as HTMLInputElement;
                          const newCoins = parseInt(inputEl?.value || "0");
                          if (isNaN(newCoins) || newCoins < 0) {
                            toast.warning("Por favor, digite um valor válido.");
                            return;
                          }
                          try {
                            // Postgres é o saldo real usado no checkout (desconto em compras) —
                            // sem isso, o valor só mudava aqui na tela, nunca no que o usuário
                            // conseguia efetivamente gastar.
                            const delta = newCoins - (u.forteCoins ?? 0);
                            await adminCreditCoinsMutation.mutateAsync({ openId: u.id, amount: delta });
                            await updateDoc(doc(db, "users", u.id), {
                              forteCoins: newCoins
                            });
                            toast.success(`Saldo de ${u.name || u.email} atualizado para ${newCoins} Fortecoins!`);
                          } catch (error) {
                            console.error("Erro ao atualizar moedas:", error);
                            toast.error("Erro ao atualizar saldo de moedas.");
                          }
                        }}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-95 transition-all duration-300 hover:shadow-[0_0_12px_rgba(220,38,38,0.4)] h-9 px-4 text-xs font-bold"
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 mt-6">
                    {u.email !== 'luanmnogueira@gmail.com' && (
                      <>
                        <Button 
                          onClick={() => handleToggleCollaborator(u.id, u.role)}
                          className={`w-full flex items-center justify-center gap-2 font-bold h-10 ${u.role === 'collaborator' ? "bg-blue-600/20 hover:bg-blue-600/30 text-blue-400" : "bg-slate-800 hover:bg-slate-700 text-white"}`}
                        >
                          {u.role === 'collaborator' ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                          {u.role === 'collaborator' ? "Remover Colaborador" : "Tornar Colaborador"}
                        </Button>
                        
                        <Button 
                          onClick={() => handleToggleAdmin(u.id, u.role)}
                          className={`w-full flex items-center justify-center gap-2 font-bold h-10 ${u.role === 'admin' ? "bg-red-600 hover:bg-red-700 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"}`}
                        >
                          <Shield className="w-4 h-4" />
                          {u.role === 'admin' ? "Remover Gestor" : "Tornar Gestor"}
                        </Button>
                      </>
                    )}
                    {u.email === 'luanmnogueira@gmail.com' && (
                      <p className="text-center text-xs text-red-500 font-bold bg-red-500/10 py-2 rounded">Gestor Principal</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="aprovar_contas" className="space-y-6 pb-16">
            <div className="border-l-4 border-red-600 pl-4">
              <h2 className="text-lg sm:text-xl font-bold text-white uppercase tracking-widest sm:text-sm italic">Aprovar Contas Enfortegames</h2>
              <p className="text-slate-400 text-xs mt-1">
                Contas cadastradas por vendedores da comunidade ficam pendentes aqui até você confirmar o comprovante
                de desvinculação do console (vídeo enviado no WhatsApp) e aprovar a publicação.
              </p>
            </div>

            {(() => {
              const pendingGames = gamesList.filter((g: any) => g.status === "pendente");
              if (pendingGames.length === 0) {
                return (
                  <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
                    <CheckCircle2 className="w-12 h-12 text-green-500/40 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-white">Nenhuma Conta Pendente</h4>
                    <p className="text-slate-400 text-xs mt-1">Todos os cadastros de conta foram revisados.</p>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingGames.map((game: any) => (
                    <Card key={game.id} className="p-5 card-neon border-amber-500/30 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="text-base font-bold text-white">{game.name}</h3>
                          <p className="text-xs text-slate-400">{game.platform || "—"} • R$ {Number(game.price || 0).toFixed(2)}</p>
                        </div>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">Pendente</span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{game.description}</p>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
                        <p className="text-slate-400">Vendedor: <span className="text-white font-bold">{game.sellerName || game.sellerStoreName || "—"}</span></p>
                        <p className="text-slate-400">Email: <span className="text-white">{game.sellerEmail || "—"}</span></p>
                        {game.keyOrCode && (
                          <p className="text-slate-400">Login/Senha: <span className="text-white font-mono select-all">{game.keyOrCode}</span></p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          size="sm"
                          disabled={adminSetDigitalStatusMutation.isPending}
                          onClick={() => adminSetDigitalStatusMutation.mutate({ id: game.id, status: "rejeitado" })}
                          className="bg-slate-800 hover:bg-red-950 border border-red-600/30 text-red-400 font-bold text-xs"
                        >
                          Rejeitar
                        </Button>
                        <Button
                          size="sm"
                          disabled={adminSetDigitalStatusMutation.isPending}
                          onClick={() => adminSetDigitalStatusMutation.mutate({ id: game.id, status: "aprovado" })}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs"
                        >
                          Aprovar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="jogos">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-8 border-l-4 border-red-600 pl-4">
              <h2 className="text-lg sm:text-xl font-bold text-white uppercase tracking-widest sm:text-sm italic">Catálogo de Jogos</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => { setBatchGames([]); setBatchRawText(""); setShowBatchModal(true); }} className="bg-slate-900 border border-red-600/30 hover:border-red-600/60 text-red-500 font-bold flex items-center justify-center gap-2 w-full sm:w-auto text-xs sm:text-sm">
                  📦 Cadastrar em Lote
                </Button>
                <Button onClick={() => { resetGameForm(); setShowGameModal(true); }} className="bg-red-600 hover:bg-red-700 font-bold btn-neon flex items-center justify-center gap-2 w-full sm:w-auto text-xs sm:text-sm">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Adicionar Jogo
                </Button>
              </div>
            </div>

            <div className="relative mb-6 max-w-sm">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={gameSearchQuery}
                onChange={(e) => setGameSearchQuery(e.target.value)}
                placeholder="Pesquisar jogo pelo nome..."
                className="bg-slate-950 border-red-600/20 text-white pl-9"
              />
            </div>

            {(() => {
              const queryStr = gameSearchQuery.trim().toLowerCase();
              const filteredGamesList = queryStr
                ? gamesList.filter((g: any) =>
                    g.name?.toLowerCase().includes(queryStr) ||
                    g.sellerName?.toLowerCase().includes(queryStr) ||
                    g.sellerEmail?.toLowerCase().includes(queryStr) ||
                    g.sellerStoreName?.toLowerCase().includes(queryStr) ||
                    String(g.sellerId || "").includes(queryStr)
                  )
                : gamesList;
              if (filteredGamesList.length === 0) {
                return (
                  <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
                    <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Nenhum jogo encontrado para "{gameSearchQuery}".</p>
                  </div>
                );
              }
              return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredGamesList.map((game: any) => (
                <Card key={game.id} className={`bg-slate-900/40 backdrop-blur-md border-red-600/10 p-4 hover:border-red-600/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-500 card-neon relative overflow-hidden group ${!game.isActive || Number(game.stock) <= 0 ? 'opacity-70 border-red-600/30' : ''}`}>
                  <div className="aspect-[16/9] w-full rounded-md overflow-hidden mb-4 bg-slate-800 flex items-center justify-center relative">
                    {game.imageUrl ? (
                      <img 
                        src={game.imageUrl} 
                        alt={game.name} 
                        className={`w-full h-full ${game.coverFit === 'contain' ? 'object-contain bg-slate-900/60 p-2' : 'object-cover'} group-hover:scale-105 transition-transform duration-500`} 
                      />
                    ) : (
                      <Gamepad2 className="w-12 h-12 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white text-sm line-clamp-2" title={game.name}>{game.name}</h3>
                        {game.sellerId && (
                          <div className="mt-1 bg-amber-950/40 border border-amber-500/30 p-2 rounded-lg text-xs space-y-0.5">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span className="font-black text-amber-400 flex items-center gap-1 text-[10px]">
                                🤝 Anunciado por: <strong className="text-white font-bold">{game.sellerName || game.sellerStoreName || `Vendedor #${game.sellerId}`}</strong>
                              </span>
                              <span className="text-[9px] font-mono text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                                ID #{game.sellerId}
                              </span>
                            </div>
                            {game.sellerEmail && (
                              <p className="text-[10px] text-slate-300 font-mono truncate" title={game.sellerEmail}>
                                ✉️ {game.sellerEmail}
                              </p>
                            )}
                            {game.sellerStoreName && game.sellerStoreName !== game.sellerName && (
                              <p className="text-[10px] text-slate-400 truncate">
                                🏪 Loja: {game.sellerStoreName}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 bg-slate-950/80 rounded border border-slate-800 p-0.5">
                        <Button variant="ghost" size="icon" onClick={() => openEditGame(game)} className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteGame(game.id)} className="h-6 w-6 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">Plataforma: <span className="text-white font-medium">{game.platform}</span></p>
                    {game.priceSecondary ? (
                      <div className="text-xs space-y-0.5 my-1 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-bold">👤 Primária:</span>
                          {game.pricePrimary ? (
                            <span className="text-green-400 font-bold">R$ {Number(game.pricePrimary).toFixed(2).replace('.', ',')}</span>
                          ) : (
                            <span className="text-slate-500 italic">Sem conta primária</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-bold">👥 Secundária:</span>
                          <span className="text-slate-300 font-bold">R$ {Number(game.priceSecondary).toFixed(2).replace('.', ',')}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mb-1">Preço: <span className="text-green-400 font-bold">R$ {Number(game.pricePrimary || game.price || 0).toFixed(2).replace('.', ',')}</span></p>
                    )}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800/50">
                      {Number(game.stock) <= 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border bg-red-500/20 text-red-400 border-red-500/40 animate-pulse">
                          Sem Estoque
                        </span>
                      ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${game.isActive ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                          {game.isActive ? "Ativo" : "Inativo"}
                        </span>
                      )}
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${Number(game.stock) <= 0 ? 'bg-red-950/60 text-red-400 font-bold border border-red-800/50' : 'bg-slate-900 text-slate-500'}`}>
                        Estq: {game.stock ?? 0}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold" title="Isso NÃO ativa/desativa o jogo — só controla se ele também aparece na página separada 'Jogue com Economia'.">⚡ Vitrine "Economia":</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentVal = game.showInEconomia !== false;

                          const applyToggle = () => {
                            // Reconstruímos o payload necessário para a mutation
                            const payload = {
                              name: game.name,
                              price: Number(game.price),
                              pricePrimary: game.pricePrimary != null ? Number(game.pricePrimary) : null,
                              priceSecondary: game.priceSecondary != null ? Number(game.priceSecondary) : null,
                              type: game.type as any,
                              platform: game.platform ?? undefined,
                              category: game.category ?? undefined,
                              imageUrl: game.imageUrl ?? undefined,
                              coverFit: game.coverFit ?? undefined,
                              stock: game.stock ?? 1,
                              isActive: game.isActive ?? true,
                              isPreVenda: game.isPreVenda ?? false,
                              economiaLicenseType: game.economiaLicenseType ?? undefined,
                              showInEconomia: !currentVal,
                              id: game.id,
                            };

                            adminUpdateGameMutation.mutate(payload, {
                              onSuccess: () => {
                                toast.success(!currentVal ? "Movido para a vitrine 'Jogue com Economia' — some do catálogo normal." : "Voltou pro catálogo normal — saiu da vitrine 'Jogue com Economia'.");
                              }
                            });
                          };

                          // Marcar "Economia" tira o jogo do catálogo normal e do banner da Home —
                          // pede confirmação só nessa direção, já que é a que causa surpresa.
                          if (!currentVal) {
                            toast(`"${game.name}" vai sumir do catálogo normal e do banner, e só vai aparecer na página "Jogue com Economia". Confirma?`, {
                              action: { label: "Confirmar", onClick: applyToggle },
                            });
                          } else {
                            applyToggle();
                          }
                        }}
                        className={`text-[9px] px-2 py-0.5 rounded font-black uppercase transition-all ${
                          game.showInEconomia !== false
                            ? "bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/40"
                            : "bg-slate-900 text-slate-500 border border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        {game.showInEconomia !== false ? `⚡ Também na Economia (${game.economiaLicenseType === "primaria" ? "Primária" : game.economiaLicenseType === "ambas" ? "Ambas" : "Secundária"})` : "Fora da Economia"}
                      </button>
                    </div>

                    {(game.keyOrCode || game.downloadUrl) && (
                      <details className="mt-2 pt-2 border-t border-slate-800">
                        <summary className="cursor-pointer text-[10px] text-amber-400 font-black uppercase tracking-wider select-none">
                          🔑 Ver Dados de Acesso da Conta
                        </summary>
                        <div className="mt-1.5 space-y-1.5">
                          {game.keyOrCode && (
                            <div>
                              <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Login / Senha / Código</p>
                              <p className="text-[10px] text-slate-200 font-mono break-all select-all bg-slate-950 border border-slate-800 rounded p-1.5">
                                {game.keyOrCode}
                              </p>
                            </div>
                          )}
                          {game.downloadUrl && (
                            <div>
                              <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">URL de Download</p>
                              <a
                                href={game.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-400 hover:text-blue-300 underline break-all block bg-slate-950 border border-slate-800 rounded p-1.5"
                              >
                                {game.downloadUrl}
                              </a>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                </Card>
              ))}
            </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="midia_fisica">
            <h2 className="text-xl font-bold text-white mb-8 border-l-4 border-red-600 pl-4 uppercase tracking-widest text-sm italic">Mídia Física / Usados</h2>

            {adminUsedProductsQuery.isLoading ? (
              <p className="text-slate-400 text-sm">Carregando anúncios...</p>
            ) : usedProductsListAdmin.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Nenhum anúncio de mídia física cadastrado ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {usedProductsListAdmin.map((p: any) => {
                  const isBoosted = Boolean(p.boostedUntil && new Date(p.boostedUntil).getTime() > Date.now());
                  return (
                    <Card key={p.id} className={`bg-slate-900/40 backdrop-blur-md border-red-600/10 p-4 hover:border-red-600/40 transition-all duration-500 card-neon relative overflow-hidden ${isBoosted ? 'border-yellow-500/40' : ''}`}>
                      <div className="aspect-[16/9] w-full rounded-md overflow-hidden mb-4 bg-slate-800 flex items-center justify-center relative">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-10 h-10 text-slate-600" />
                        )}
                        {isBoosted && (
                          <span className="absolute top-2 right-2 bg-yellow-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-slate-950" /> Destaque
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-white text-sm line-clamp-2 mb-1" title={p.name}>{p.name}</h3>
                      <p className="text-xs text-slate-400 mb-0.5">Vendedor: <span className="text-slate-300">{p.sellerStoreName || "—"}</span></p>
                      {(p.bairro || p.cidade) && (
                        <p className="text-[11px] text-slate-500 mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {[p.bairro, p.cidade, p.estado].filter(Boolean).join(", ")}
                        </p>
                      )}
                      <div className="flex justify-between items-center text-xs mb-3 mt-1">
                        <span className="text-green-400 font-bold">R$ {Number(p.price || 0).toFixed(2)}</span>
                        <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px] bg-slate-800 text-slate-400">{p.condition}</span>
                      </div>
                      <div className="flex flex-col gap-1.5 mt-2">
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => adminToggleUsedBoostMutation.mutate({ id: p.id })}
                            className={`flex-1 text-xs h-8 ${isBoosted ? "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400" : "bg-slate-800 hover:bg-slate-700 text-white"}`}
                          >
                            <Star className="w-3.5 h-3.5 mr-1" /> {isBoosted ? "Remover Destaque" : "Destacar"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteUsedProduct(p.id, p.name)} className="text-slate-500 hover:text-red-500 h-8 w-8 p-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => moveToDigitalMutation.mutate({ usedProductId: p.id })}
                          disabled={moveToDigitalMutation.isPending}
                          className="w-full bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-600/40 text-[10px] font-bold h-7 flex items-center justify-center gap-1"
                        >
                          <Gamepad2 className="w-3 h-3" /> Mover p/ Catálogo Digital
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="referrals">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Solicitações de Resgate */}
              <Card className="bg-slate-900 border-red-600/10 p-6 flex flex-col h-[600px] card-neon">
                <h3 className="text-lg font-bold text-white mb-6 border-l-4 border-red-600 pl-3 uppercase tracking-wider text-sm italic flex items-center gap-2">
                  <Gift className="w-5 h-5 text-red-500" />
                  Solicitações de Prêmios ({allRedemptions.length})
                </h3>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                  {allRedemptions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-sm">
                      Nenhuma solicitação de prêmio encontrada.
                    </div>
                  ) : (
                    allRedemptions.map((red) => (
                      <div key={red.id} className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-white text-sm">{red.prizeName}</p>
                            <p className="text-xs text-slate-400">Solicitado por: <span className="font-semibold text-slate-200">{red.userName}</span></p>
                            <p className="text-[10px] text-slate-500">{red.userEmail}</p>
                            <p className="text-[10px] text-slate-500 mt-1">Data: {new Date(red.createdAt).toLocaleString("pt-BR")}</p>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold mb-2">
                              <Coins className="w-3.5 h-3.5" />
                              {red.cost} FC
                            </span>
                            {red.status === "pendente" ? (
                              <span className="inline-block text-[10px] bg-yellow-500/10 text-yellow-500 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-yellow-500/20">
                                Pendente
                              </span>
                            ) : red.status === "recusado" ? (
                              <span className="inline-block text-[10px] bg-red-500/10 text-red-500 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-red-500/20">
                                Recusado
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] bg-green-500/10 text-green-500 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-green-500/20">
                                Entregue
                              </span>
                            )}
                          </div>
                        </div>

                        {red.status === "pendente" ? (
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => openDeliveryDialog(red.id, red.prizeName)}
                              className="flex-1 bg-red-600 hover:bg-red-700 font-bold h-9 text-xs rounded-lg"
                            >
                              Entregar Prêmio
                            </Button>
                            <Button 
                              onClick={() => openRefusalDialog(red.id, red.prizeName, red.userId, red.cost)}
                              variant="outline"
                              className="bg-red-950/20 hover:bg-red-950/40 text-red-400 border-red-500/30 hover:border-red-500/50 font-bold h-9 text-xs rounded-lg px-3"
                            >
                              Recusar
                            </Button>
                          </div>
                        ) : red.status === "recusado" ? (
                          <div className="bg-red-950/20 p-2 rounded text-xs text-red-400 border border-red-500/10 select-all truncate">
                            Recusado. Motivo: {red.code || "Nenhum motivo especificado."}
                          </div>
                        ) : (
                          <div className="bg-slate-900/60 p-2 rounded text-xs font-mono text-green-400 border border-green-500/10 select-all truncate">
                            Código: {red.code}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Registro de Indicações */}
              <Card className="bg-slate-900 border-red-600/10 p-6 flex flex-col h-[600px] card-neon">
                <h3 className="text-lg font-bold text-white mb-6 border-l-4 border-red-600 pl-3 uppercase tracking-wider text-sm italic flex items-center gap-2">
                  <User className="w-5 h-5 text-red-500" />
                  Registro de Indicações ({allReferrals.length})
                </h3>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                  {allReferrals.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-sm">
                      Nenhuma indicação registrada.
                    </div>
                  ) : (
                    allReferrals.map((ref) => (
                      <div key={ref.id} className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs text-slate-400">Padrinho (UID): <span className="font-semibold text-slate-300 font-mono text-[10px]">{ref.referrerId}</span></p>
                            <p className="font-bold text-white text-sm mt-1">Convidado: {ref.inviteeName}</p>
                            <p className="text-[10px] text-slate-500">{ref.inviteeEmail}</p>
                            <p className="text-[10px] text-slate-500 mt-1">Cadastro: {new Date(ref.createdAt).toLocaleString("pt-BR")}</p>
                          </div>
                          <div>
                            {ref.status === "pendente" ? (
                              <span className="flex items-center gap-1 text-[10px] bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-yellow-500/20">
                                <Clock className="w-3 h-3" />
                                Pendente
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-500 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-green-500/20">
                                <Check className="w-3 h-3" />
                                Compra Paga
                              </span>
                            )}
                          </div>
                        </div>

                        {ref.status === "pendente" && (
                          <Button 
                            onClick={() => handleConfirmPurchase(ref)}
                            className="w-full bg-green-600 hover:bg-green-700 font-bold h-9 text-xs rounded-lg flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Confirmar Compra (Dar +15 FC)
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vendas">
            <Card className="bg-slate-900 border-red-600/10 p-6 flex flex-col card-neon">
              <h3 className="text-lg font-bold text-white mb-6 border-l-4 border-red-600 pl-3 uppercase tracking-wider text-sm italic flex items-center gap-2">
                📦 Gerenciar Vendas ({sales?.length || 0})
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-red-600/20 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="py-3 px-4">Pedido ID</th>
                      <th className="py-3 px-4">Comprador</th>
                      <th className="py-3 px-4">Jogo/Produto</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Valor</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingSales ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic text-sm">Carregando vendas...</td>
                      </tr>
                    ) : !sales || sales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic text-sm">Nenhuma venda registrada no sistema.</td>
                      </tr>
                    ) : (
                      sales.map((sale: any) => (
                        <tr key={sale.id} className="border-b border-slate-800/40 hover:bg-slate-800/10 text-sm">
                          <td className="py-3.5 px-4 font-mono text-xs">#{sale.id}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{sale.buyerName}</div>
                            <div className="text-xs text-slate-500">{sale.buyerEmail}</div>
                            {sale.buyerPhone ? (
                              <a
                                href={(() => {
                                  const digits = String(sale.buyerPhone).replace(/\D/g, "");
                                  const phone = digits.startsWith("55") ? digits : digits ? `55${digits}` : "";
                                  const text = encodeURIComponent(`Olá ${sale.buyerName || ""}! Falo da Eforte Games sobre o seu pedido #${sale.id} (${sale.productName || ""}).`);
                                  return `https://wa.me/${phone}?text=${text}`;
                                })()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[11px] text-green-400 hover:text-green-300 font-semibold mt-1 transition-colors bg-green-950/40 hover:bg-green-900/50 border border-green-500/30 px-2 py-0.5 rounded-md"
                                title="Conversar com o cliente no WhatsApp"
                              >
                                <svg className="w-3 h-3 fill-current text-green-500 shrink-0" viewBox="0 0 24 24">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.118-2.905-6.993C16.257 1.874 13.78 1.84 11.14 1.84 5.704 1.84 1.28 6.261 1.277 11.705c-.001 1.714.453 3.39 1.317 4.873L1.576 22.25l5.071-1.328z"/>
                                </svg>
                                <span>{sale.buyerPhone}</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-600 italic block mt-0.5">WhatsApp não informado</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-200">{sale.productName}</td>
                          <td className="py-3.5 px-4">
                            <span className="text-xs uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold border border-slate-700/50">
                              {sale.productType === 'store' ? 'Loja' :
                               sale.productType === 'digital' ? 'Digital' : 'Usado'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-red-500">R$ {Number(sale.totalPrice).toFixed(2)}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${sale.status === 'pendente' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : sale.status === 'pago' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : sale.status === 'enviado' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : sale.status === 'entregue' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                              {sale.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {sale.status === 'pago' ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDeliverOrder(sale);
                                    setDeliveryInstructions(
                                      `Obrigado por adquirir o jogo ${sale.productName}, aqui está o login e senha para acesso a conta:\n\n` +
                                      `Login: \n` +
                                      `Senha: \n\n` +
                                      `Qualquer coisa estaremos a disposição para ajudar no que precisar, você pode entrar em contato conosco pelo chat do site ou pelo nosso WhatsApp: +55 43 8425-3691.`
                                    );
                                    setDeliverGameOpen(true);
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                                >
                                  Fornecer Jogo
                                </Button>
                              ) : (sale.status === 'enviado' || sale.status === 'entregue') ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedDeliverOrder(sale);
                                    setDeliveryInstructions(sale.deliveryDetails || "");
                                    setDeliverGameOpen(true);
                                  }}
                                  className="border-red-600/30 text-red-400 hover:bg-red-950/20 font-bold text-xs"
                                >
                                  Ver Entrega
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-600 italic px-2">N/A</span>
                              )}

                              {/* Cancelar Pedido (Não Fornecer) */}
                              {sale.status === 'pago' || sale.status === 'pendente' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateSaleStatus(sale.id, 'cancelado')}
                                  title="Não Fornecer (Cancelar Pedido)"
                                  className="border-slate-700 text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/30 px-2"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              ) : null}

                              {/* Excluir Pedido */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteSale(sale.id)}
                                title="Excluir Pedido"
                                className="border-slate-700 text-slate-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 px-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="premios">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Gift className="text-red-500" /> Prêmios Disponíveis na Loja
                </h3>
                <p className="text-slate-400 text-sm">
                  Adicione, remova ou altere o estoque de prêmios que os usuários podem resgatar com Fortecoins.
                </p>
              </div>
              <Button onClick={() => { resetPrizeForm(); setShowPrizeModal(true); }} className="bg-red-600 hover:bg-red-700 font-bold btn-neon flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Adicionar Prêmio
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allPrizes.map((p) => (
                <Card key={p.id} className={`bg-slate-900 border-red-600/10 p-0 flex flex-col justify-between card-neon relative overflow-hidden ${!p.isActive || p.stock <= 0 ? 'opacity-60' : ''}`}>
                  {p.imageUrl && (
                    <div className="w-full h-40 bg-slate-800">
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] bg-red-600/20 text-red-500 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                        {p.badge}
                      </span>
                      <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5" />
                        {p.cost} FC
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                      {p.name}
                      {(!p.isActive || p.stock <= 0) && (
                        <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded font-black uppercase">Esgotado</span>
                      )}
                    </h4>
                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">{p.description}</p>
                    <p className="text-[11px] text-slate-500 mt-4 font-mono">Disponível: <span className="font-bold text-slate-300">{p.stock}</span> unidades</p>
                  
                    <div className="flex gap-2 pt-4 border-t border-slate-800 mt-auto">
                      <Button
                      onClick={() => handleTogglePrizeStatus(p.id, p.isActive, p.stock)}
                      className={`flex-1 font-bold h-9 text-xs ${p.isActive ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-green-600 hover:bg-green-700 text-white"}`}
                    >
                      {p.isActive ? "Pausar" : "Ativar"}
                    </Button>
                    <Button
                      onClick={() => openEditPrize(p)}
                      variant="outline"
                      className="bg-blue-950/20 hover:bg-blue-950/40 text-blue-400 border-blue-500/30 hover:border-blue-500/50 font-bold h-9 text-xs px-3"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeletePrize(p.id)}
                      variant="outline"
                      className="bg-red-950/20 hover:bg-red-950/40 text-red-400 border-red-500/30 hover:border-red-500/50 font-bold h-9 text-xs px-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="promocoes">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  📢 Banners Promocionais
                </h3>
                <p className="text-slate-400 text-sm">
                  Gerencie os banners exibidos no carrossel da página inicial.
                </p>
              </div>
              <Button onClick={() => setShowPromoModal(true)} className="bg-red-600 hover:bg-red-700 font-bold btn-neon flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Criar Banner Promo
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {promosList.length === 0 ? (
                <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto text-2xl">
                    🖼️
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white">Nenhum Banner Personalizado Cadastrado</h4>
                    <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto mt-1">
                      A página inicial do site está exibindo os <strong>Banners Padrão do Sistema</strong> (Elden Ring, Mortal Kombat 1, Jogue com Economia e Indique e Ganhe).
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      onClick={handleImportDefaultBanners}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl btn-neon flex items-center gap-2 mx-auto text-xs sm:text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      🚀 Carregar Banners Padrão da Home para Editar
                    </Button>
                  </div>
                </div>
              ) : (
                promosList.map((p) => (
                  <Card key={p.id} className={`bg-slate-900 border-red-600/10 p-0 flex flex-col justify-between card-neon overflow-hidden ${!p.isActive ? 'opacity-65' : ''}`}>
                    <div className="h-40 bg-slate-950 relative overflow-hidden border-b border-slate-800">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">Sem Imagem</div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider ${
                          p.position === "sidebar_top" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                          p.position === "sidebar_bottom" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                          p.position === "platinador" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                          "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                          {p.position === "sidebar_top" ? "Lateral Sup" :
                           p.position === "sidebar_bottom" ? "Lateral Inf" :
                           p.position === "platinador" ? "🏆 Platinador" : "Principal"}
                        </span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider ${p.isActive ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                          {p.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-5 flex-grow">
                      <h4 className="text-base font-bold text-white mb-2 truncate">{p.title}</h4>
                      <p className="text-slate-400 text-xs truncate mb-1.5"><strong className="text-slate-500 font-bold">Link:</strong> {p.link || 'Nenhum'}</p>
                      {p.expiresAt && (
                        <p className="text-red-400 text-xs font-semibold flex items-center gap-1.5 mt-2">
                          <Clock className="w-3.5 h-3.5" />
                          Expira: {new Date(p.expiresAt).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>

                    <div className="p-5 pt-0 flex gap-2 border-t border-slate-800/60 mt-2">
                      <Button
                        onClick={() => {
                          const linkStr = p.link || "/";
                          const fullUrl = linkStr.startsWith("http") ? linkStr : `${window.location.origin}${linkStr.startsWith("/") ? "" : "/"}${linkStr}`;
                          navigator.clipboard.writeText(fullUrl);
                          toast.success("Link do banner copiado para compartilhamento!");
                        }}
                        variant="outline"
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 font-bold h-9 text-xs px-2.5 flex items-center gap-1"
                        title="Copiar Link para Compartilhar"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        onClick={() => handleTogglePromoActive(p.id, p.isActive)}
                        className={`flex-1 font-bold h-9 text-xs ${p.isActive ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-green-600 hover:bg-green-700 text-white"}`}
                      >
                        {p.isActive ? "Pausar" : "Ativar"}
                      </Button>
                      <Button
                        onClick={() => openEditPromo(p)}
                        variant="outline"
                        className="bg-blue-950/20 hover:bg-blue-950/40 text-blue-400 border-blue-500/30 hover:border-blue-500/50 font-bold h-9 text-xs px-2.5"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeletePromo(p.id)}
                        variant="outline"
                        className="bg-red-950/20 hover:bg-red-950/40 text-red-400 border-red-500/30 hover:border-red-500/50 font-bold h-9 text-xs px-2.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Aba Negociações & Mensagens dos Clientes */}
          <TabsContent value="negociacoes" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-red-500" /> Negociações & Mensagens dos Clientes
                  <span className="text-xs bg-slate-800 text-slate-400 font-normal px-2.5 py-0.5 rounded-full border border-slate-700">
                    {allChats.length} conversa{allChats.length !== 1 ? "s" : ""}
                  </span>
                </h3>
                <p className="text-slate-400 text-sm">
                  Acompanhe em tempo real as conversas dos clientes e exclua o histórico antigo para economizar armazenamento no banco.
                </p>
              </div>
            </div>

            {/* Barra de Filtro e Busca de Conversas */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Buscar conversa por nome do cliente, e-mail ou mensagem..."
                  className="bg-slate-950 border-slate-800 text-white text-xs pl-9 h-9 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setChatFilter("todas")}
                  className={`h-9 text-xs px-3 font-bold ${chatFilter === "todas" ? "bg-red-600 text-white border-red-500" : "bg-slate-950 text-slate-400 border-slate-800"}`}
                >
                  Todas ({allChats.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setChatFilter("nao_lidas")}
                  className={`h-9 text-xs px-3 font-bold ${chatFilter === "nao_lidas" ? "bg-red-600 text-white border-red-500" : "bg-slate-950 text-slate-400 border-slate-800"}`}
                >
                  Não Lidas ({allChats.filter(c => c.unreadByAdmin).length})
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredChats.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 italic bg-slate-900/40 rounded-xl border border-slate-800">
                  <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-400">
                    {chatSearch ? "Nenhuma conversa encontrada na busca" : "Nenhuma conversa registrada ainda"}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    {chatSearch ? "Tente buscar por outro termo ou nome de cliente." : "As conversas e solicitações dos clientes aparecerão aqui."}
                  </p>
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <Card key={chat.id} className="bg-slate-900 border-slate-800 p-5 flex flex-col justify-between card-neon hover:border-red-500/40 transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-red-400 font-bold text-sm uppercase shrink-0">
                            {chat.userName?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-white text-sm truncate">{chat.userName || "Usuário"}</h4>
                            <p className="text-[11px] text-slate-400 truncate">{chat.userEmail || chat.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {chat.unreadByAdmin && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-600 text-white animate-pulse">
                              Novo
                            </span>
                          )}
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleDeleteChat(chat.id, chat.userName || "Usuário")}
                            title="Excluir conversa (libera espaço no banco de dados)"
                            className="h-7 w-7 bg-red-950/20 hover:bg-red-900/50 text-red-400 border-red-500/30 hover:border-red-500/60 rounded-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono line-clamp-3 mb-4">
                        {chat.lastMessage || "Nenhuma mensagem recente."}
                      </div>
                      {chat.topic && (
                        <span className="inline-block max-w-full truncate px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide bg-green-950/40 border border-green-600/30 text-green-400 mb-3">
                          💬 {chat.topic}
                        </span>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">
                        {chat.updatedAt?.toDate ? chat.updatedAt.toDate().toLocaleString("pt-BR") : "Recente"}
                      </span>
                      <Button
                        onClick={() => setSelectedChatUser({ id: chat.userId || chat.id, name: chat.userName || "Usuário", email: chat.userEmail, topic: chat.topic })}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold h-8 text-xs flex items-center gap-1.5 px-3 rounded-lg"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Falar no Chat
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Conversas diretas Comprador ↔ Vendedor (inclui produtos da própria loja) */}
            <div className="pt-8 border-t border-slate-800">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-green-500" /> Chats Diretos com Vendedores
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Conversas privadas abertas pelo botão "Falar Vendedor". Nas conversas de produtos da
                loja, você responde como {STORE_SELLER_NAME}.
              </p>
              <SellerChatsPanel
                role="admin"
                emptyMessage="Nenhuma conversa direta com vendedores até o momento."
              />
            </div>
          </TabsContent>

          <TabsContent value="cupons">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  🎟️ Cupons de Desconto
                </h3>
                <p className="text-slate-400 text-sm">
                  Crie e gerencie cupons aplicados no fechamento de pedidos (checkout).
                </p>
              </div>
              <Button onClick={() => setShowCouponModal(true)} className="bg-red-600 hover:bg-red-700 font-bold btn-neon flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Criar Cupom
              </Button>
            </div>

            <Card className="bg-slate-900 border-red-600/10 p-6 flex flex-col card-neon">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-red-600/20 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Desconto (%)</th>
                      <th className="py-3 px-4">Uso Máximo</th>
                      <th className="py-3 px-4">Utilizados</th>
                      <th className="py-3 px-4">Expiração</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!dbCoupons || dbCoupons.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic text-sm">Nenhum cupom cadastrado no sistema.</td>
                      </tr>
                    ) : (
                      dbCoupons.map((coupon: any) => (
                        <tr key={coupon.id} className="border-b border-slate-800/40 hover:bg-slate-800/10 text-sm">
                          <td className="py-3.5 px-4 font-mono font-bold text-white text-base">
                            {coupon.code}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-red-500">
                            {coupon.discountPercentage}%
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {coupon.maxUses !== null ? coupon.maxUses : "Sem limite"}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-semibold">
                            {coupon.usedCount}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {coupon.expiresAt 
                              ? new Date(coupon.expiresAt).toLocaleDateString("pt-BR") 
                              : "Nunca"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={coupon.isActive ? "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-green-500/10 text-green-500 border-green-500/20" : "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-red-500/10 text-red-500 border-red-500/20"}>
                              {coupon.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={() => handleToggleCouponActive(coupon.id, coupon.isActive)}
                                className={`font-bold h-8 text-xs ${coupon.isActive ? "bg-slate-800 hover:bg-slate-700 text-slate-400" : "bg-green-600 hover:bg-green-700 text-white"}`}
                              >
                                {coupon.isActive ? "Desativar" : "Ativar"}
                              </Button>
                              <Button
                                onClick={() => handleDeleteCoupon(coupon.id)}
                                variant="outline"
                                className="bg-red-950/20 hover:bg-red-950/40 text-red-400 border-red-500/30 hover:border-red-500/50 font-bold h-8 text-xs px-2.5"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="aba_promocoes">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  🏷️ Gerenciar Promoções
                </h3>
                <p className="text-slate-400 text-sm">
                  Crie e gerencie as ofertas que aparecem na aba "Promoções" do site.
                </p>
              </div>
              <Button onClick={() => { resetDealForm(); setShowDealModal(true); }} className="bg-red-600 hover:bg-red-700 font-bold btn-neon flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Adicionar Promoção
              </Button>
            </div>

            <Card className="bg-slate-900 border-red-600/10 p-6 flex flex-col card-neon">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-red-600/20 text-slate-400 text-xs uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">Imagem</th>
                      <th className="py-3 px-4">Título</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4">Preço</th>
                      <th className="py-3 px-4">Preço Antigo</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dealsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic text-sm">Nenhuma promoção cadastrada no sistema.</td>
                      </tr>
                    ) : (
                      dealsList.map((deal: any) => (
                        <tr key={deal.id} className="border-b border-slate-800/40 hover:bg-slate-800/10 text-sm">
                          <td className="py-3 px-4">
                            <div className="h-10 w-16 rounded bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center">
                              {deal.imageUrl ? (
                                <img src={deal.imageUrl} alt={deal.title} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] text-slate-600 font-bold">Sem imagem</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white max-w-[200px] truncate" title={deal.title}>{deal.title}</div>
                            {deal.description && <div className="text-xs text-slate-500 max-w-[200px] truncate" title={deal.description}>{deal.description}</div>}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-300">
                            {deal.category === 'jogo' ? 'Jogos' :
                             deal.category === 'gift_card_playstation' ? 'Gift Card PlayStation' :
                             deal.category === 'gift_card_xbox' ? 'Gift Card Xbox' : deal.category}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-green-400">
                            R$ {Number(deal.price || 0).toFixed(2).replace(".", ",")}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-semibold">
                            {deal.oldPrice ? `R$ ${Number(deal.oldPrice).toFixed(2).replace(".", ",")}` : "-"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={deal.isActive ? "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-green-500/10 text-green-500 border-green-500/20" : "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-red-500/10 text-red-500 border-red-500/20"}>
                              {deal.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={() => handleToggleDealActive(deal.id, deal.isActive)}
                                className={`font-bold h-8 text-xs ${deal.isActive ? "bg-slate-800 hover:bg-slate-700 text-slate-400" : "bg-green-600 hover:bg-green-700 text-white"}`}
                              >
                                {deal.isActive ? "Pausar" : "Ativar"}
                              </Button>
                              <Button
                                onClick={() => openEditDeal(deal)}
                                variant="outline"
                                className="bg-blue-950/20 hover:bg-blue-950/40 text-blue-400 border-blue-500/30 hover:border-blue-500/50 font-bold h-8 text-xs px-2.5"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteDeal(deal.id)}
                                variant="outline"
                                className="bg-red-950/20 hover:bg-red-950/40 text-red-400 border-red-500/30 hover:border-red-500/50 font-bold h-8 text-xs px-2.5"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Aba Clube Platinador */}
          <TabsContent value="platinador" className="space-y-6">
            <PlatinadorAdminTab />
          </TabsContent>

          {/* Aba de Configuração de Valores de ForteCoins & Canais */}
          <TabsContent value="config_fortecoins" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Coins className="w-6 h-6 text-red-500" /> Configurações Gerais & Canais
                </h3>
                <p className="text-slate-400 text-sm">
                  Gerencie o link do grupo do WhatsApp, valores de recompensas e custo dos prêmios.
                </p>
              </div>
            </div>

            {/* Card de Gerenciamento do WhatsApp & Grupos */}
            <Card className="bg-slate-900 border-green-500/30 p-6 card-neon space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h4 className="font-black text-white text-base flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-green-500" /> Gerenciar Link do WhatsApp & Comunidade
                  </h4>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Caso o grupo do WhatsApp fique cheio, atualize o link abaixo para redirecionar novos clientes automaticamente.
                  </p>
                </div>
                <Button
                  onClick={handleSaveWaConfig}
                  disabled={savingWaConfig}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold h-9 px-4 text-xs flex items-center gap-1.5 shrink-0"
                >
                  <Check className="w-4 h-4" />
                  {savingWaConfig ? "Salvando..." : "Salvar Link do WhatsApp"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <Label className="text-xs text-slate-300 font-bold">URL do Grupo / Comunidade do WhatsApp</Label>
                  <Input
                    value={waConfig.groupUrl}
                    onChange={(e) => setWaConfig({ ...waConfig, groupUrl: e.target.value })}
                    placeholder="Ex: https://chat.whatsapp.com/GczvlmlbhRk4r..."
                    className="bg-slate-950 border-slate-800 text-white text-xs h-10 mt-1 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Link completo do convite do grupo do WhatsApp</span>
                </div>

                <div>
                  <Label className="text-xs text-slate-300 font-bold">Número do WhatsApp de Atendimento (com DDD)</Label>
                  <Input
                    value={waConfig.supportNumber}
                    onChange={(e) => setWaConfig({ ...waConfig, supportNumber: e.target.value })}
                    placeholder="Ex: 554384253691"
                    className="bg-slate-950 border-slate-800 text-white text-xs h-10 mt-1 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Formato: 55 + DDD + Número (apenas dígitos)</span>
                </div>
              </div>
            </Card>

            {/* Card de Teto de ForteCoins por Compra — é o valor que o checkout de verdade usa */}
            <Card className="bg-slate-900 border-amber-500/30 p-6 card-neon space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h4 className="font-black text-white text-base flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-500" /> Teto de ForteCoins por Compra
                  </h4>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Limite máximo de moedas que um cliente pode usar numa única compra, mesmo tendo saldo maior — evita que um saldo grande zere o preço do produto. É o valor que o checkout realmente aplica no servidor.
                  </p>
                </div>
                <Button
                  onClick={() => updateCoinLimitsMutation.mutate(maxCoinsInput)}
                  disabled={updateCoinLimitsMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 px-4 text-xs flex items-center gap-1.5 shrink-0"
                >
                  <Check className="w-4 h-4" />
                  {updateCoinLimitsMutation.isPending ? "Salvando..." : "Salvar Teto de FC"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <Label className="text-xs text-slate-300 font-bold">Compra Normal (FC)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={maxCoinsInput.maxCoinsPerPurchase}
                    onChange={(e) => setMaxCoinsInput({ ...maxCoinsInput, maxCoinsPerPurchase: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-800 text-white text-xs h-10 mt-1 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">10 FC = R$ 1,00 de desconto. Padrão: 10 FC (R$1,00).</span>
                </div>
                <div>
                  <Label className="text-xs text-slate-300 font-bold">Jogo em Pré-Venda / Lançamento (FC)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={maxCoinsInput.maxCoinsPreVenda}
                    onChange={(e) => setMaxCoinsInput({ ...maxCoinsInput, maxCoinsPreVenda: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-800 text-white text-xs h-10 mt-1 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Teto maior pra jogos marcados como "Pré-Venda". Padrão: 50 FC (R$5,00).</span>
                </div>
              </div>
            </Card>

            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <Coins className="w-5 h-5 text-red-500" /> Regras de ForteCoins & Tabela de Prêmios
              </h4>
              <Button
                onClick={handleSaveFcConfig}
                disabled={savingFcConfig}
                className="bg-red-600 hover:bg-red-700 font-bold btn-neon flex items-center gap-2 text-xs h-9"
              >
                <Check className="w-4 h-4" />
                {savingFcConfig ? "Salvando..." : "Salvar Regras de FC"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Regras de Recompensa */}
              <Card className="bg-slate-900 border-red-600/10 p-6 card-neon space-y-5">
                <h4 className="font-bold text-white text-base border-l-4 border-red-600 pl-3 uppercase tracking-wider text-xs">
                  🎁 Regras de Recompensa (Acúmulo)
                </h4>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-slate-300 font-bold">ForteCoins por Indicação de Amigo</Label>
                    <p className="text-[11px] text-slate-500 mb-1.5">Concedido quando o amigo indicado realiza a primeira compra de jogo.</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={fcConfig.referralReward}
                        onChange={(e) => setFcConfig({ ...fcConfig, referralReward: Number(e.target.value) })}
                        className="bg-slate-950 border-slate-800 text-white font-bold h-10"
                      />
                      <span className="text-xs text-slate-400 font-bold shrink-0">FC</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-300 font-bold">ForteCoins por Desafio de Platina (Conclusão)</Label>
                    <p className="text-[11px] text-slate-500 mb-1.5">Valor padrão concedido ao completar um desafio de platina.</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={fcConfig.platinadorReward}
                        onChange={(e) => setFcConfig({ ...fcConfig, platinadorReward: Number(e.target.value) })}
                        className="bg-slate-950 border-slate-800 text-white font-bold h-10"
                      />
                      <span className="text-xs text-slate-400 font-bold shrink-0">FC</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-300 font-bold">ForteCoins por Avaliação de Produto</Label>
                    <p className="text-[11px] text-slate-500 mb-1.5">Recompensa para cada review publicada com sucesso pelo cliente.</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={fcConfig.reviewReward}
                        onChange={(e) => setFcConfig({ ...fcConfig, reviewReward: Number(e.target.value) })}
                        className="bg-slate-950 border-slate-800 text-white font-bold h-10"
                      />
                      <span className="text-xs text-slate-400 font-bold shrink-0">FC</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-300 font-bold">Equivalência Estimada em Reais (1 FC = R$)</Label>
                    <p className="text-[11px] text-slate-500 mb-1.5">Valor de referência de cada ForteCoin em R$. Ex: 0.10 = R$ 0,10</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-bold shrink-0">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={fcConfig.coinValue}
                        onChange={(e) => setFcConfig({ ...fcConfig, coinValue: Number(e.target.value) })}
                        className="bg-slate-950 border-slate-800 text-white font-bold h-10"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Tabela de Prêmios e Preços em FC */}
              <Card className="bg-slate-900 border-red-600/10 p-6 card-neon space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-white text-base border-l-4 border-red-600 pl-3 uppercase tracking-wider text-xs mb-4">
                    🏆 Preço dos Prêmios (Resgate em FC)
                  </h4>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {allPrizes.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-6 text-center">Nenhum prêmio cadastrado.</p>
                    ) : (
                      allPrizes.map((prize) => (
                        <div key={prize.id} className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <div>
                            <p className="font-bold text-white text-xs">{prize.name}</p>
                            <p className="text-[10px] text-slate-500">Estoque: {prize.stock} un</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              defaultValue={prize.cost}
                              id={`prize-cost-input-${prize.id}`}
                              className="w-20 bg-slate-900 border-slate-700 text-xs font-bold text-red-500 text-center h-8"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">FC</span>
                            <Button
                              size="sm"
                              onClick={async () => {
                                const inputEl = document.getElementById(`prize-cost-input-${prize.id}`) as HTMLInputElement;
                                const newCost = parseInt(inputEl?.value || "500");
                                try {
                                  await updateDoc(doc(db, "prizes", prize.id), { cost: newCost });
                                  toast.success(`Custo do prêmio "${prize.name}" atualizado para ${newCost} FC!`);
                                } catch (err) {
                                  toast.error("Erro ao atualizar valor do prêmio.");
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold h-8 text-[11px] px-2.5"
                            >
                              Salvar
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <p className="text-[11px] text-slate-400 italic">
                    💡 Dica: Você também pode ajustar o saldo de moedas de qualquer usuário individual na aba <strong className="text-white">Gerenciar Acessos</strong>.
                  </p>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ABA DE MANUTENÇÃO */}
          <TabsContent value="manutencao" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-[#121212] border-red-600/30 p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-bl-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-lg bg-red-600/10 border border-red-500/20">
                  <ShieldAlert className="text-red-500 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    Modo de Manutenção (Bloqueio)
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Ative este modo para bloquear o acesso dos clientes enquanto você faz atualizações no sistema. (Administradores continuam acessando).
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-white">Status do Site</h4>
                    <p className="text-xs text-slate-400">Atualmente o site está {maintenanceConfig.isActive ? "BLOQUEADO" : "ONLINE"}</p>
                  </div>
                  <Button
                    onClick={() => setMaintenanceConfig(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className={`font-bold transition-all ${
                      maintenanceConfig.isActive 
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]" 
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(5,150,105,0.5)]"
                    }`}
                  >
                    {maintenanceConfig.isActive ? "Desativar Bloqueio" : "Ativar Bloqueio"}
                  </Button>
                </div>

                <div className="space-y-4 p-4 border border-slate-800 rounded-xl bg-slate-950">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-300 uppercase">Título da Mensagem</Label>
                    <Input
                      value={maintenanceConfig.title}
                      onChange={(e) => setMaintenanceConfig({ ...maintenanceConfig, title: e.target.value })}
                      placeholder="Ex: Estamos em Manutenção"
                      className="bg-slate-900 border-slate-800 focus-visible:ring-red-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-300 uppercase">Texto da Mensagem</Label>
                    <textarea
                      value={maintenanceConfig.message}
                      onChange={(e) => setMaintenanceConfig({ ...maintenanceConfig, message: e.target.value })}
                      className="w-full h-24 p-3 bg-slate-900 border border-slate-800 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50"
                      placeholder="Ex: Voltamos em breve. A loja está recebendo novos produtos e ajustes no sistema."
                    />
                  </div>

                  <Button 
                    onClick={handleSaveMaintenance} 
                    disabled={savingMaintenance}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-10 mt-2"
                  >
                    {savingMaintenance ? "Salvando..." : "Salvar Configurações de Manutenção"}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

        </Tabs>
      </main>
    </div>

      {/* Modal de Criação de Usuário */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white sm:max-w-[425px] card-neon">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-neon flex items-center gap-2">
              <UserPlus className="w-6 h-6" />
              Criar Novo Acesso
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Cadastre um novo colaborador ou gestor diretamente aqui.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input required value={newUserName} onChange={e => setNewUserName(e.target.value)} className="bg-slate-950 border-red-600/20 pl-10" placeholder="Ex: João Silva" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input required type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="bg-slate-950 border-red-600/20 pl-10" placeholder="email@exemplo.com" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Senha Inicial</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input required type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="bg-slate-950 border-red-600/20 pl-10" placeholder="Mínimo 6 caracteres" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Cargo / Permissão</Label>
              <select 
                value={newUserRole} 
                onChange={e => setNewUserRole(e.target.value)}
                className="w-full bg-slate-950 border border-red-600/20 rounded-md h-10 px-3 text-sm"
              >
                <option value="collaborator">Colaborador (Gerencia Produtos)</option>
                <option value="admin">Gestor (Acesso Total)</option>
                <option value="user">Usuário Comum</option>
              </select>
            </div>

            <DialogFooter className="pt-6">
              <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)} className="text-slate-400">Cancelar</Button>
              <Button type="submit" disabled={creating} className="bg-red-600 hover:bg-red-700 btn-neon min-w-[120px]">
                {creating ? "Criando..." : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Criar / Editar Prêmio */}
      <Dialog open={showPrizeModal} onOpenChange={(open) => {
        if (!open) resetPrizeForm();
        setShowPrizeModal(open);
      }}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white max-w-md card-neon">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-neon">
              <Gift className="text-red-500" /> {editingPrizeId ? "Editar Prêmio" : "Cadastrar Novo Prêmio"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              {editingPrizeId 
                ? "Altere as informações do prêmio selecionado na loja de resgates."
                : "Preencha as informações do prêmio que ficará disponível na loja de resgates."
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPrize} className="space-y-4 my-2">
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-bold uppercase">Nome do Prêmio</Label>
              <Input
                value={prizeName}
                onChange={(e) => setPrizeName(e.target.value)}
                placeholder="Ex: Gift Card PSN R$ 100"
                className="bg-slate-950 border-red-600/20 text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase">Custo em ForteCoins</Label>
                <Input
                  type="number"
                  value={prizeCost}
                  onChange={(e) => setPrizeCost(Number(e.target.value))}
                  placeholder="Ex: 500"
                  className="bg-slate-950 border-red-600/20 text-white"
                  min={1}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase">Quantidade em Estoque</Label>
                <Input
                  type="number"
                  value={prizeStock}
                  onChange={(e) => setPrizeStock(Number(e.target.value))}
                  placeholder="Ex: 1"
                  className="bg-slate-950 border-red-600/20 text-white"
                  min={0}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-bold uppercase">Badge / Categoria</Label>
              <Input
                value={prizeBadge}
                onChange={(e) => setPrizeBadge(e.target.value)}
                placeholder="Ex: Console, Mais Popular, Lazer"
                className="bg-slate-950 border-red-600/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-bold uppercase">Descrição</Label>
              <textarea
                value={prizeDesc}
                onChange={(e) => setPrizeDesc(e.target.value)}
                placeholder="Descreva o que o usuário receberá ao resgatar este prêmio..."
                className="w-full h-24 p-3 bg-slate-950 border border-red-600/20 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-bold uppercase">URL da Imagem ou Enviar Foto Local (Opcional)</Label>
              <Input
                value={prizeImage}
                onChange={(e) => setPrizeImage(e.target.value)}
                placeholder="https://exemplo.com/imagem.png"
                className="bg-slate-950 border-red-600/20 text-white mb-2"
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" className="bg-red-600 hover:bg-red-700 border-none text-white font-bold h-9 relative overflow-hidden" disabled={uploadingPrizeImage}>
                  {uploadingPrizeImage ? "Enviando..." : "Escolher arquivo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePrizeImageUpload}
                    disabled={uploadingPrizeImage}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </Button>
                <span className="text-xs text-slate-400 truncate">
                  {prizeImage ? "Imagem carregada" : "Nenhum arquivo"}
                </span>
              </div>
              {prizeImage && (
                <div className="mt-2 h-20 w-32 rounded bg-slate-800 overflow-hidden border border-slate-700">
                  <img src={prizeImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => { setShowPrizeModal(false); resetPrizeForm(); }} className="text-slate-400 hover:text-white">
                Cancelar
              </Button>
              <Button type="submit" disabled={addingPrize} className="bg-red-600 hover:bg-red-700 font-bold px-6 btn-neon">
                {addingPrize ? "Salvando..." : (editingPrizeId ? "Salvar Alterações" : "Cadastrar Prêmio")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Adicionar / Editar Jogo */}
      <Dialog open={showGameModal} onOpenChange={setShowGameModal}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white max-w-md card-neon">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-neon">
              <Gamepad2 className="text-red-500" /> {editingGameId ? "Editar Jogo" : "Cadastrar Novo Jogo"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Preencha as informações do jogo que ficará disponível na loja.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveGame} className="space-y-4 my-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-slate-300 font-bold uppercase">Nome do Jogo / Produto *</Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSearchCoverAuto()}
                  disabled={isSearchingCover || !gameName.trim()}
                  className="h-7 px-2.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/40 font-bold text-[10px] flex items-center gap-1"
                >
                  {isSearchingCover ? "🔍 Buscando..." : "✨ Buscar Capa Net"}
                </Button>
              </div>
              <Input
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                onBlur={() => { if (!gameImageUrl && gameName.trim().length >= 3) handleSearchCoverAuto(gameName); }}
                placeholder="Ex: God of War Ragnarok ou PS Plus Essential 12 Meses"
                className="bg-slate-950 border-red-600/20 text-white"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase">Plataforma *</Label>
                <Input
                  value={gamePlatform}
                  onChange={(e) => setGamePlatform(e.target.value)}
                  placeholder="Selecione abaixo ou digite..."
                  className="bg-slate-950 border-red-600/20 text-white"
                  required
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {["PS5", "PS4", "PS4/PS5", "Xbox", "PC"].map(plat => (
                    <span 
                      key={plat} 
                      onClick={() => setGamePlatform(plat)}
                      className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors border ${gamePlatform === plat ? "bg-red-600/20 text-red-400 border-red-500/50 font-bold" : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"}`}
                    >
                      {plat}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase">Categoria</Label>
                <Input
                  value={gameCategory}
                  onChange={(e) => setGameCategory(e.target.value)}
                  placeholder="Selecione abaixo ou digite..."
                  className="bg-slate-950 border-red-600/20 text-white"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {["Ação", "Aventura", "RPG", "Esportes", "Corrida", "Tiro / FPS", "Assinaturas", "Pré Venda"].map(cat => (
                    <span 
                      key={cat} 
                      onClick={() => setGameCategory(cat)}
                      className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors border ${gameCategory === cat ? "bg-red-600/20 text-red-400 border-red-500/50 font-bold" : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"}`}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Preços: Primária vs Secundária */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-lg border border-red-600/20">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-bold uppercase flex items-center gap-1">
                  <span>👤 Preço Primária (R$)</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={gamePricePrimary}
                  onChange={(e) => {
                    setGamePricePrimary(e.target.value);
                    setGamePrice(Number(e.target.value));
                  }}
                  placeholder="Deixe em branco se não tiver conta primária"
                  className="bg-slate-950 border-red-600/30 text-white font-bold"
                  min={0}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1">
                  <span>👥 Preço Secundária (R$)</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={gamePriceSecondary}
                  onChange={(e) => setGamePriceSecondary(e.target.value)}
                  placeholder="Ex: 90.00 (Opcional)"
                  className="bg-slate-950 border-slate-800 text-white font-bold"
                  min={0}
                />
              </div>
            </div>

            {/* Configuração para o "Jogue com Economia" */}
            <div className="bg-red-950/20 p-3 rounded-lg border border-red-500/30 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs text-white font-bold uppercase flex items-center gap-1.5 cursor-pointer">
                  <span>⚠️ Tirar da loja principal e pôr SÓ na vitrine "Jogue com Economia"</span>
                </Label>
                <input
                  type="checkbox"
                  checked={gameShowInEconomia}
                  onChange={(e) => {
                    const next = e.target.checked;
                    if (next) {
                      if (!window.confirm('Isso vai TIRAR este jogo do catálogo normal e do banner da Home — ele só vai aparecer na página separada /jogue-com-economia. NÃO marque isso só porque o jogo é "conta secundária/barata": jogos de conta secundária normais devem ficar desmarcados aqui. Confirma?')) {
                        return;
                      }
                    }
                    setGameShowInEconomia(next);
                  }}
                  className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-[9px] text-slate-400 leading-tight">
                Deixe DESMARCADO para jogos normais, mesmo que só tenham conta secundária — eles aparecem certinho no catálogo principal (só com a opção Secundária). Marque isto apenas para os poucos jogos que devem existir EXCLUSIVAMENTE na vitrine promocional separada /jogue-com-economia.
              </p>
              {gameShowInEconomia && (
                <div className="space-y-1.5 pt-2 border-t border-red-500/20">
                  <Label className="text-[10px] text-slate-300 font-bold uppercase block">
                    Tipo de Conta em Destaque no Economia:
                  </Label>
                  <select
                    value={gameEconomiaLicenseType}
                    onChange={(e) => setGameEconomiaLicenseType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-red-600/30 rounded-md h-9 px-3 text-xs text-white"
                  >
                    <option value="secundaria">👥 Conta Secundária (Padrão)</option>
                    <option value="primaria">👤 Conta Primária</option>
                    <option value="ambas">⚡ Ambas (Permitir escolha)</option>
                  </select>
                </div>
              )}
            </div>
            <div className="space-y-4 border border-red-600/10 p-3 rounded-lg bg-slate-950/20">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase">URL da Capa (Imagem)</Label>
                <Input
                  value={gameImageUrl}
                  onChange={(e) => setGameImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-slate-950 border-red-600/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase">Ou Enviar Foto Local</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  disabled={uploadingImage}
                  className="bg-slate-950 border-red-600/20 text-white cursor-pointer file:bg-red-600 file:text-white file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 hover:file:bg-red-700"
                />
                {uploadingImage && <p className="text-xs text-red-500 animate-pulse">Enviando imagem...</p>}
              </div>
              {gameImageUrl && (
                <div className="h-24 w-36 rounded overflow-hidden border border-red-600/20 relative group">
                  <img src={gameImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setGameImageUrl("")}
                    className="absolute top-1 right-1 bg-red-600 rounded-full p-1 text-white hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-bold uppercase">Enquadramento da Capa</Label>
              <select
                value={gameCoverFit}
                onChange={(e) => setGameCoverFit(e.target.value as "cover" | "contain")}
                className="w-full bg-slate-950 border border-red-600/20 rounded-md h-10 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50"
              >
                <option value="cover">Preencher Card (Cortar bordas se necessário)</option>
                <option value="contain">Mostrar Foto Inteira (Com fundo e sem cortes)</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2 col-span-1">
                <Label className="text-xs text-slate-300 font-bold uppercase">Estoque</Label>
                <Input
                  type="number"
                  value={gameStock}
                  onChange={(e) => setGameStock(Number(e.target.value))}
                  placeholder="Ex: 999"
                  className="bg-slate-950 border-red-600/20 text-white"
                  min={0}
                />
              </div>
              <div className="space-y-2 col-span-1 flex flex-col justify-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gameIsActive}
                    onChange={(e) => setGameIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-red-600/20 bg-slate-950 text-red-600 focus:ring-red-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase">Ativo</span>
                </label>
              </div>
              <div className="space-y-2 col-span-1 flex flex-col justify-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gameIsPreVenda}
                    onChange={(e) => setGameIsPreVenda(e.target.checked)}
                    className="w-4 h-4 rounded border-red-600/20 bg-slate-950 text-red-600 focus:ring-red-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase font-black text-amber-500">Pré-Venda</span>
                </label>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => { setShowGameModal(false); resetGameForm(); }} className="text-slate-400 hover:text-white">
                Cancelar
              </Button>
              <Button type="submit" disabled={addingGame} className="bg-red-600 hover:bg-red-700 font-bold px-6 btn-neon">
                {addingGame ? "Salvando..." : (editingGameId ? "Salvar Alterações" : "Cadastrar Jogo")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Customizado de Entrega de Prêmio */}
      <Dialog open={deliveryOpen} onOpenChange={setDeliveryOpen}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white max-w-md card-neon">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-neon">
              <Gift className="text-red-500" /> Entregar Prêmio
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Digite o código do Gift Card ou chave do jogo para entregar o prêmio <span className="font-bold text-white">"{deliveryPrizeName}"</span>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitDelivery} className="space-y-4 my-2">
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-bold uppercase">Código ou Chave de Ativação</Label>
              <textarea
                value={deliveryCode}
                onChange={(e) => setDeliveryCode(e.target.value)}
                placeholder="Insira o código pin, link de resgate ou chave de ativação aqui..."
                className="w-full h-24 p-3 bg-slate-950 border border-red-600/20 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 font-mono"
                required
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setDeliveryOpen(false)} className="text-slate-400 hover:text-white">
                Cancelar
              </Button>
              <Button type="submit" disabled={delivering} className="bg-red-600 hover:bg-red-700 font-bold px-6 btn-neon">
                {delivering ? "Enviando..." : "Confirmar Entrega"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Customizado de Recusa de Prêmio */}
      <Dialog open={refusalOpen} onOpenChange={setRefusalOpen}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white max-w-md card-neon">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-neon">
              <X className="text-red-500" /> Recusar Resgate
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Você está prestes a recusar o resgate do prêmio <span className="font-bold text-white">"{refusalPrizeName}"</span>. Isso devolverá <span className="font-bold text-red-500">{refusalCost} FC</span> ao saldo do usuário.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRefusal} className="space-y-4 my-2">
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-bold uppercase">Motivo da Recusa</Label>
              <textarea
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
                placeholder="Ex: Conta suspeita, estoque esgotado temporariamente, erro de solicitação..."
                className="w-full h-24 p-3 bg-slate-950 border border-red-600/20 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50"
                required
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setRefusalOpen(false)} className="text-slate-400 hover:text-white">
                Cancelar
              </Button>
              <Button type="submit" disabled={refusing} className="bg-red-600 hover:bg-red-700 font-bold px-6 btn-neon">
                {refusing ? "Processando..." : "Recusar Resgate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Fornecer / Ver Entrega do Jogo */}
      <Dialog open={deliverGameOpen} onOpenChange={setDeliverGameOpen}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white max-w-md card-neon">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-neon">
              <Shield className="text-red-500" /> 
              {selectedDeliverOrder?.status === 'pago' ? "Fornecer Dados do Jogo" : "Dados de Entrega do Jogo"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              {selectedDeliverOrder?.status === 'pago' 
                ? `Insira os dados de acesso da conta ou chave de ativação para entregar o jogo "${selectedDeliverOrder?.productName}" ao usuário.`
                : `Dados de entrega fornecidos para o jogo "${selectedDeliverOrder?.productName}". Você pode editá-los abaixo se necessário.`
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeliverGame} className="space-y-4 my-2">
            {/* Resumo do Comprador e WhatsApp */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Comprador:</span>
                <span className="text-white font-bold">{selectedDeliverOrder?.buyerName || "Sem Nome"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px]">E-mail:</span>
                <span className="text-slate-300 font-mono text-[11px]">{selectedDeliverOrder?.buyerEmail || "Sem E-mail"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px]">WhatsApp:</span>
                {selectedDeliverOrder?.buyerPhone ? (
                  <a
                    href={(() => {
                      const digits = String(selectedDeliverOrder.buyerPhone).replace(/\D/g, "");
                      const phone = digits.startsWith("55") ? digits : digits ? `55${digits}` : "";
                      const text = encodeURIComponent(`Olá ${selectedDeliverOrder.buyerName || ""}! Falo da Eforte Games sobre o seu pedido #${selectedDeliverOrder.id} (${selectedDeliverOrder.productName || ""}).`);
                      return `https://wa.me/${phone}?text=${text}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-green-400 hover:text-green-300 font-bold bg-green-950/40 border border-green-500/30 px-2 py-0.5 rounded transition-colors text-[11px]"
                    title="Conversar no WhatsApp"
                  >
                    <svg className="w-3 h-3 fill-current text-green-500 shrink-0" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.118-2.905-6.993C16.257 1.874 13.78 1.84 11.14 1.84 5.704 1.84 1.28 6.261 1.277 11.705c-.001 1.714.453 3.39 1.317 4.873L1.576 22.25l5.071-1.328z"/>
                    </svg>
                    <span>{selectedDeliverOrder.buyerPhone}</span>
                  </a>
                ) : (
                  <span className="text-slate-500 italic text-[11px]">Não informado</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-bold uppercase">Chave de Ativação / Dados da Conta</Label>
              <textarea
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                placeholder="Insira a chave/código do jogo, ou e-mail/senha da conta do jogo, links de instrução..."
                className="w-full h-32 p-3 bg-slate-950 border border-red-600/20 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 font-mono"
                required
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setDeliverGameOpen(false)} className="text-slate-400 hover:text-white">
                Fechar
              </Button>
              {(selectedDeliverOrder?.status === 'pago' || selectedDeliverOrder?.status === 'enviado' || selectedDeliverOrder?.status === 'entregue') && (
                <Button type="submit" disabled={deliverOrderMutation.isPending} className="bg-red-600 hover:bg-red-700 font-bold px-6 btn-neon">
                  {deliverOrderMutation.isPending 
                    ? "Salvando..." 
                    : selectedDeliverOrder?.status === 'pago' 
                      ? "Confirmar Entrega" 
                      : "Salvar Alterações"
                  }
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Cadastro em Lote */}
      <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white w-[92vw] sm:w-full sm:max-w-4xl card-neon max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-neon">
              <Plus className="text-red-500" /> Cadastrar Jogos em Lote
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Adicione múltiplos jogos de uma vez. Cole a lista abaixo e nós buscaremos as capas no Steam automaticamente.
            </DialogDescription>
          </DialogHeader>

          {batchGames.length === 0 ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase">Lista de Jogos (Formatada)</Label>
                <textarea
                  value={batchRawText}
                  onChange={(e) => setBatchRawText(e.target.value)}
                  placeholder="Exemplo de digitação:&#10;God of War; 150.00; PS5; 999&#10;FIFA 26; 250.00; PS4/PS5; 500&#10;Resident Evil 4; 180.00; PS4; 999"
                  className="w-full h-48 p-3 bg-slate-950 border border-red-600/20 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 font-mono"
                />
                <p className="text-[10px] text-slate-500">
                  Formato por linha: <strong>Nome do Jogo; Preço; Plataforma; Estoque</strong> (Separados por ponto e vírgula).
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-white">
                  Cancelar
                </Button>
                <Button onClick={handleProcessBatchText} className="bg-red-600 hover:bg-red-700 font-bold px-6 btn-neon">
                  Processar Jogos
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3 py-4 min-w-0">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Jogos marcados <strong className="text-slate-400">"Não encontrada"</strong> não existem no catálogo da Steam (comum em exclusivos de PlayStation). Clique em <strong className="text-amber-400">🔍</strong> pra abrir o Google Imagens já buscando o jogo — clique com o botão direito na foto desejada, escolha "Copiar link da imagem" e cole no campinho abaixo da capa. Ou use <strong className="text-blue-400">📸</strong> pra enviar uma foto do seu computador.
              </p>

              {/* Mobile: cards empilhados, sem precisar rolar de lado dentro do modal */}
              <div className="sm:hidden space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {batchGames.map((game, idx) => (
                  <div key={game.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
                    <div className="flex gap-3">
                      <div className="shrink-0">
                        <div className="h-16 w-16 rounded bg-slate-900 overflow-hidden border border-red-600/10 flex items-center justify-center relative">
                          {game.imageUrl ? (
                            <img src={game.imageUrl} alt="Capa" className="w-full h-full object-cover" />
                          ) : game.status === "searching" ? (
                            <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className="text-[8px] text-slate-600 text-center font-bold px-1">Não encontrada</span>
                          )}
                        </div>
                        {!game.imageUrl && game.status !== "searching" && (
                          <input
                            type="text"
                            placeholder="Colar link"
                            className="mt-1 w-16 bg-slate-900 border border-slate-800 rounded text-[8px] text-white px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              const url = (e.target as HTMLInputElement).value.trim();
                              if (!url) return;
                              const updated = [...batchGames];
                              updated[idx].imageUrl = url;
                              updated[idx].status = "found";
                              setBatchGames(updated);
                            }}
                            onBlur={(e) => {
                              const url = e.target.value.trim();
                              if (!url) return;
                              const updated = [...batchGames];
                              updated[idx].imageUrl = url;
                              updated[idx].status = "found";
                              setBatchGames(updated);
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <Input
                          value={game.name}
                          onChange={(e) => {
                            const updated = [...batchGames];
                            updated[idx].name = e.target.value;
                            setBatchGames(updated);
                          }}
                          placeholder="Nome do jogo"
                          className={`h-8 text-xs text-white ${game.isDuplicate ? "bg-amber-950/30 border-amber-500/50" : "bg-slate-900 border-slate-800"}`}
                        />
                        {game.isDuplicate && (
                          <p className="text-[9px] text-amber-400 font-bold">⚠️ Já existe no catálogo</p>
                        )}
                        <div className="flex items-center gap-1.5">
                          <label className="cursor-pointer hover:bg-slate-800 p-1.5 rounded text-blue-400 hover:text-blue-300" title="Upload local de foto">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleBatchImageUpload(game.id, file);
                              }}
                              className="hidden"
                            />
                            📸
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const q = encodeURIComponent(`${game.name} capa jogo ps4 ps5`);
                              window.open(`https://www.google.com/search?tbm=isch&q=${q}`, "_blank");
                            }}
                            className="hover:bg-slate-800 p-1.5 rounded text-amber-400 hover:text-amber-300"
                            title="Buscar capa no Google Imagens"
                          >
                            🔍
                          </button>
                          <button
                            type="button"
                            onClick={() => setBatchGames(batchGames.filter((_, i) => i !== idx))}
                            className="hover:bg-slate-800 p-1.5 rounded text-red-500 hover:text-red-400 ml-auto"
                            title="Remover linha"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Preço R$</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={game.price}
                          onChange={(e) => {
                            const updated = [...batchGames];
                            updated[idx].price = Number(e.target.value);
                            setBatchGames(updated);
                          }}
                          className="bg-slate-900 border-slate-800 h-8 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Plataforma</label>
                        <Input
                          value={game.platform}
                          onChange={(e) => {
                            const updated = [...batchGames];
                            updated[idx].platform = e.target.value;
                            setBatchGames(updated);
                          }}
                          className="bg-slate-900 border-slate-800 h-8 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Estoque</label>
                        <Input
                          type="number"
                          value={game.stock}
                          onChange={(e) => {
                            const updated = [...batchGames];
                            updated[idx].stock = Number(e.target.value);
                            setBatchGames(updated);
                          }}
                          className="bg-slate-900 border-slate-800 h-8 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop/tablet: tabela normal */}
              <div className="hidden sm:block max-h-[50vh] overflow-auto border border-red-600/10 rounded-lg min-w-0">
                <table className="w-full min-w-[640px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider border-b border-red-600/20">
                      <th className="py-2.5 px-3 w-16">Capa</th>
                      <th className="py-2.5 px-3">Nome</th>
                      <th className="py-2.5 px-3 w-28">Preço (R$)</th>
                      <th className="py-2.5 px-3 w-32">Plataforma</th>
                      <th className="py-2.5 px-3 w-24">Estoque</th>
                      <th className="py-2.5 px-3 w-20 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchGames.map((game, idx) => (
                      <tr key={game.id} className="border-b border-slate-800/60 text-xs">
                        <td className="py-3 px-3">
                          <div className="h-12 w-20 rounded bg-slate-950 overflow-hidden border border-red-600/10 flex items-center justify-center relative">
                            {game.imageUrl ? (
                              <img src={game.imageUrl} alt="Capa" className="w-full h-full object-cover" />
                            ) : game.status === "searching" ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-600 text-center font-bold px-1">Não encontrada</span>
                            )}
                          </div>
                          {!game.imageUrl && game.status !== "searching" && (
                            <input
                              type="text"
                              placeholder="Colar link da imagem"
                              className="mt-1 w-20 bg-slate-950 border border-slate-800 rounded text-[9px] text-white px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                              onKeyDown={(e) => {
                                if (e.key !== "Enter") return;
                                const url = (e.target as HTMLInputElement).value.trim();
                                if (!url) return;
                                const updated = [...batchGames];
                                updated[idx].imageUrl = url;
                                updated[idx].status = "found";
                                setBatchGames(updated);
                              }}
                              onBlur={(e) => {
                                const url = e.target.value.trim();
                                if (!url) return;
                                const updated = [...batchGames];
                                updated[idx].imageUrl = url;
                                updated[idx].status = "found";
                                setBatchGames(updated);
                              }}
                            />
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <Input
                            value={game.name}
                            onChange={(e) => {
                              const updated = [...batchGames];
                              updated[idx].name = e.target.value;
                              setBatchGames(updated);
                            }}
                            className={`h-8 text-xs text-white ${game.isDuplicate ? "bg-amber-950/30 border-amber-500/50" : "bg-slate-950 border-slate-800"}`}
                          />
                          {game.isDuplicate && (
                            <p className="text-[9px] text-amber-400 font-bold mt-0.5">⚠️ Já existe no catálogo</p>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={game.price}
                            onChange={(e) => {
                              const updated = [...batchGames];
                              updated[idx].price = Number(e.target.value);
                              setBatchGames(updated);
                            }}
                            className="bg-slate-950 border-slate-800 h-8 text-xs text-white"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <Input
                            value={game.platform}
                            onChange={(e) => {
                              const updated = [...batchGames];
                              updated[idx].platform = e.target.value;
                              setBatchGames(updated);
                            }}
                            className="bg-slate-950 border-slate-800 h-8 text-xs text-white"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <Input
                            type="number"
                            value={game.stock}
                            onChange={(e) => {
                              const updated = [...batchGames];
                              updated[idx].stock = Number(e.target.value);
                              setBatchGames(updated);
                            }}
                            className="bg-slate-950 border-slate-800 h-8 text-xs text-white"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <label className="cursor-pointer hover:bg-slate-800 p-1.5 rounded text-blue-400 hover:text-blue-300" title="Upload local de foto">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleBatchImageUpload(game.id, file);
                                }}
                                className="hidden"
                              />
                              📸
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const q = encodeURIComponent(`${game.name} capa jogo ps4 ps5`);
                                window.open(`https://www.google.com/search?tbm=isch&q=${q}`, "_blank");
                              }}
                              className="hover:bg-slate-800 p-1.5 rounded text-amber-400 hover:text-amber-300"
                              title="Buscar capa no Google Imagens (clique com botão direito na imagem escolhida e 'Copiar link da imagem', depois cole no campo abaixo da capa)"
                            >
                              🔍
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = batchGames.filter((_, i) => i !== idx);
                                setBatchGames(updated);
                              }}
                              className="hover:bg-slate-800 p-1.5 rounded text-red-500 hover:text-red-400"
                              title="Remover linha"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isSavingBatch && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-red-400 font-bold">
                    <span>Salvando jogos no catálogo...</span>
                    <span>{batchSaveProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-red-600/10">
                    <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${batchSaveProgress}%` }} />
                  </div>
                </div>
              )}

              <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setBatchGames([]); }}
                  disabled={isSavingBatch}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 w-full sm:w-auto"
                >
                  Voltar
                </Button>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => triggerBatchCoverSearch(batchGames)}
                    disabled={isProcessingBatchSearch || isSavingBatch}
                    className="text-red-500 hover:bg-red-500/10 font-bold animate-pulse w-full sm:w-auto"
                  >
                    {isProcessingBatchSearch ? "Buscando..." : "Refazer Busca de Capas"}
                  </Button>
                  <Button
                    onClick={handleSaveBatchGames}
                    disabled={isSavingBatch || batchGames.length === 0}
                    className="bg-red-600 hover:bg-red-700 font-bold px-6 btn-neon w-full sm:w-auto"
                  >
                    {isSavingBatch ? "Cadastrando..." : `Cadastrar ${batchGames.length} Jogos`}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Adicionar / Editar Banner Promocional */}
      <Dialog open={showPromoModal} onOpenChange={(open) => { if (!open) resetPromoForm(); setShowPromoModal(open); }}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white sm:max-w-[425px] card-neon">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-neon flex items-center gap-2">
              📢 {editingPromoId ? "Editar Banner Promo" : "Criar Banner Promo"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingPromoId ? "Edite as informações do banner selecionado." : "Cadastre um banner no carrossel ou na lateral de promoções da home."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePromo} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="promoTitle" className="text-slate-300">Título do Banner</Label>
              <Input
                id="promoTitle"
                value={promoTitle}
                onChange={(e) => setPromoTitle(e.target.value)}
                placeholder="Ex: Super Desconto em Gift Cards!"
                required
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-1.5 border border-red-600/10 p-3 rounded-lg bg-slate-950/20">
              <div className="space-y-1.5 mb-2">
                <Label htmlFor="promoImage" className="text-slate-300">URL da Imagem</Label>
                <Input
                  id="promoImage"
                  value={promoImage}
                  onChange={(e) => setPromoImage(e.target.value)}
                  placeholder="Ex: https://link.com/imagem.jpg"
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-bold uppercase">Ou Enviar Foto Local</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePromoImageUpload}
                  disabled={uploadingPromoImage}
                  className="bg-slate-950 border-red-600/20 text-white cursor-pointer file:bg-red-600 file:text-white file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 hover:file:bg-red-700 text-xs"
                />
                {uploadingPromoImage && <p className="text-[10px] text-red-500 animate-pulse">Enviando banner...</p>}
              </div>
              {promoImage && (
                <div className="h-20 w-full rounded overflow-hidden border border-red-600/20 relative mt-2 group">
                  <img src={promoImage} alt="Preview" className="w-full h-full object-cover" />
                  <button
                     type="button"
                     onClick={() => setPromoImage("")}
                     className="absolute top-1 right-1 bg-red-600 rounded-full p-1 text-white hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promoPosition" className="text-slate-300">Posição do Banner</Label>
              <select
                id="promoPosition"
                value={promoPosition}
                onChange={(e) => setPromoPosition(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md h-10 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50"
              >
                <option value="main">Principal (Carrossel Esquerdo)</option>
                <option value="sidebar_top">Lateral Superior (Direito)</option>
                <option value="sidebar_bottom">Lateral Inferior (Direito)</option>
                <option value="platinador">🏆 Clube Platinador (Não aparece no carrossel principal)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promoLink" className="text-slate-300">Link de Redirecionamento (Rota ou URL)</Label>
              <Input
                id="promoLink"
                value={promoLink}
                onChange={(e) => setPromoLink(e.target.value)}
                placeholder="Ex: /fortecoins ou /digital"
                className="bg-slate-950 border-slate-800 text-white"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-bold w-full">Atalhos de Link:</span>
                {[
                  { label: "🎁 ForteCoins", url: "/fortecoins" },
                  { label: "🎮 Mídias Digitais", url: "/digital" },
                  { label: "📦 Desapegos Físicos", url: "/usados" },
                  { label: "⚡ Jogue com Economia", url: "/economia" },
                  { label: "🏆 Clube Platinador", url: "/platinador" },
                ].map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setPromoLink(preset.url)}
                    className="text-[10px] px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors font-semibold"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promoCountdown" className="text-slate-300">Cronômetro de Expiração (Opcional)</Label>
              <Input
                id="promoCountdown"
                type="datetime-local"
                value={promoCountdown}
                onChange={(e) => setPromoCountdown(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowPromoModal(false); resetPromoForm(); }}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={uploadingPromoImage} className="bg-red-600 hover:bg-red-700 font-bold btn-neon">
                {editingPromoId ? "Salvar Alterações" : "Criar Banner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Chat Direto do Gestor com o Usuário */}
      {selectedChatUser && (
        <Dialog open={!!selectedChatUser} onOpenChange={() => setSelectedChatUser(null)}>
          <DialogContent className="bg-slate-900 border-red-600/30 text-white max-w-lg card-neon">
            <DialogHeader className="flex flex-row items-start justify-between pr-6">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-neon">
                  <MessageCircle className="text-red-500" /> Mensagens com {selectedChatUser.name}
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  {selectedChatUser.topic ? `Assunto: ${selectedChatUser.topic}` : selectedChatUser.email || selectedChatUser.id}
                </DialogDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteChat(selectedChatUser.id, selectedChatUser.name)}
                title="Excluir permanentemente do banco"
                className="bg-red-950/30 hover:bg-red-900/50 text-red-400 border-red-500/40 font-bold text-xs h-8 px-2.5 flex items-center gap-1.5 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </Button>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div className="h-72 overflow-y-auto p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                {chatMessages.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-12 italic">Nenhuma mensagem nesta conversa ainda. Digite abaixo para enviar a primeira mensagem.</p>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isAdminMsg = msg.sender === "admin" || msg.senderId === "admin";
                    return (
                      <div key={msg.id || idx} className={`flex flex-col ${isAdminMsg ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[85%] p-3 rounded-xl text-xs ${
                          isAdminMsg ? "bg-red-600 text-white rounded-br-none font-medium shadow" : "bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700"
                        }`}>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>
                        <span className="text-[9px] text-slate-500 mt-0.5 px-1 font-mono">
                          {isAdminMsg ? "Gestor / Admin" : selectedChatUser.name}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSendAdminMessage} className="flex gap-2">
                <Input
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  placeholder="Digite sua resposta ou código do prêmio para enviar ao usuário..."
                  className="bg-slate-950 border-slate-800 text-white text-xs h-10 flex-1"
                />
                <Button type="submit" disabled={sendingReply || !adminReplyText.trim()} className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-4">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Criação de Cupom */}
      <Dialog open={showCouponModal} onOpenChange={setShowCouponModal}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white sm:max-w-[425px] card-neon">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-neon flex items-center gap-2">
              🎟️ Criar Novo Cupom
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Cadastre um cupom de desconto para os clientes usarem no checkout.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCoupon} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="couponCode" className="text-slate-300">Código do Cupom</Label>
              <Input
                id="couponCode"
                value={couponCodeForm}
                onChange={(e) => setCouponCodeForm(e.target.value)}
                placeholder="Ex: DESCONTO10"
                required
                className="bg-slate-950 border-slate-800 text-white uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="couponDiscount" className="text-slate-300">Desconto (%)</Label>
              <Input
                id="couponDiscount"
                type="number"
                min="1"
                max="100"
                value={couponDiscountForm}
                onChange={(e) => setCouponDiscountForm(e.target.value)}
                placeholder="Ex: 15"
                required
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="couponMaxUses" className="text-slate-300">Limite de Usos (Opcional)</Label>
              <Input
                id="couponMaxUses"
                type="number"
                min="1"
                value={couponMaxUsesForm}
                onChange={(e) => setCouponMaxUsesForm(e.target.value)}
                placeholder="Ex: 50"
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="couponExpires" className="text-slate-300">Data de Expiração (Opcional)</Label>
              <Input
                id="couponExpires"
                type="date"
                value={couponExpiresForm}
                onChange={(e) => setCouponExpiresForm(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCouponModal(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 font-bold btn-neon">
                Criar Cupom
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Adicionar / Editar Promoção */}
      <Dialog open={showDealModal} onOpenChange={(open) => {
        if (!open) resetDealForm();
        setShowDealModal(open);
      }}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white max-w-md card-neon">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-neon">
              <Gift className="text-red-500" /> {editingDealId ? "Editar Promoção" : "Cadastrar Nova Promoção"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Preencha as informações do produto em oferta que ficará disponível na aba de Promoções.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveDeal} className="space-y-4 my-2">
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-bold uppercase">Título da Promoção</Label>
              <Input
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                placeholder="Ex: FIFA 26 Ultimate Edition"
                className="bg-slate-950 border-red-600/20 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-bold uppercase">Descrição / Detalhes</Label>
              <textarea
                value={dealDescription}
                onChange={(e) => setDealDescription(e.target.value)}
                placeholder="Ex: Acesso imediato à conta compartilhada com instruções passo a passo..."
                className="w-full h-20 p-3 bg-slate-950 border border-red-600/20 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-bold uppercase">Categoria</Label>
              <select
                value={dealCategory}
                onChange={(e) => setDealCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-red-600/20 rounded-md h-10 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50"
              >
                <option value="jogo">Jogos</option>
                <option value="gift_card_playstation">Gift Card PlayStation</option>
                <option value="gift_card_xbox">Gift Card Xbox</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase">Preço Promocional (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={dealPrice}
                  onChange={(e) => setDealPrice(e.target.value)}
                  placeholder="Ex: 59.90"
                  className="bg-slate-950 border-red-600/20 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase">Preço Antigo (R$ - Opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={dealOldPrice}
                  onChange={(e) => setDealOldPrice(e.target.value)}
                  placeholder="Ex: 120.00"
                  className="bg-slate-950 border-red-600/20 text-white"
                />
              </div>
            </div>
            <div className="space-y-4 border border-red-600/10 p-3 rounded-lg bg-slate-950/20">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase">URL da Imagem da Promoção</Label>
                <Input
                  value={dealImageUrl}
                  onChange={(e) => setDealImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-slate-950 border-red-600/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase">Ou Enviar Foto Local</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleDealImageUpload}
                  disabled={uploadingDealImage}
                  className="bg-slate-950 border-red-600/20 text-white cursor-pointer file:bg-red-600 file:text-white file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 hover:file:bg-red-700 text-xs"
                />
                {uploadingDealImage && <p className="text-xs text-red-500 animate-pulse">Enviando imagem...</p>}
              </div>
              {dealImageUrl && (
                <div className="h-20 w-32 rounded overflow-hidden border border-red-600/20 relative group">
                  <img src={dealImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setDealImageUrl("")}
                    className="absolute top-1 right-1 bg-red-600 rounded-full p-1 text-white hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-bold uppercase">Link do Botão (Opcional)</Label>
              <Input
                value={dealLink}
                onChange={(e) => setDealLink(e.target.value)}
                placeholder="Ex: /digital ou link externo. Se vazio, redireciona ao WhatsApp."
                className="bg-slate-950 border-red-600/20 text-white"
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => { setShowDealModal(false); resetDealForm(); }} className="text-slate-400 hover:text-white">
                Cancelar
              </Button>
              <Button type="submit" disabled={uploadingDealImage} className="bg-red-600 hover:bg-red-700 font-bold px-6 btn-neon">
                {uploadingDealImage ? "Aguarde..." : editingDealId ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Entregar Dados de Acesso ao Comprador */}
      <Dialog open={showDeliverModal} onOpenChange={setShowDeliverModal}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white sm:max-w-md card-neon">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              🗝️ Entregar Dados de Acesso
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Envie o login, senha ou instruções para o comprador do pedido #{selectedDeliveryOrder?.id}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <p className="text-slate-400 font-bold">Produto: <span className="text-white">{selectedDeliveryOrder?.productName}</span></p>
              <p className="text-slate-400 font-bold">Comprador: <span className="text-white">{selectedDeliveryOrder?.buyerName} ({selectedDeliveryOrder?.buyerEmail})</span></p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-bold uppercase">Instruções / Login & Senha da Conta</Label>
              <textarea
                rows={5}
                value={deliveryDetailsInput}
                onChange={(e) => setDeliveryDetailsInput(e.target.value)}
                placeholder={"Login: conta@exemplo.com\nSenha: 123456\nInstruções: Acesse o perfil primário..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowDeliverModal(false)} className="text-slate-400 hover:text-white text-xs">
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!selectedDeliveryOrder || !deliveryDetailsInput.trim()) {
                  toast.error("Informe os dados de acesso.");
                  return;
                }
                deliverOrderMutation.mutate({
                  orderId: selectedDeliveryOrder.id,
                  deliveryDetails: deliveryDetailsInput.trim(),
                });
              }}
              disabled={deliverOrderMutation.isPending || !deliveryDetailsInput.trim()}
              className="bg-red-600 hover:bg-red-700 font-bold text-xs text-white px-5 btn-neon"
            >
              {deliverOrderMutation.isPending ? "Enviando..." : "Confirmar Envio & Concluir Pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
