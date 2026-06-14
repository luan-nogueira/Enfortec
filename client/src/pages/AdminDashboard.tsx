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
import { Shield, User, UserCheck, UserPlus, ArrowLeft, Plus, X, Lock, Mail, Trash2, MessageCircle, Send, Coins, Gift, Check, Clock, LogOut, Gamepad2, Edit } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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

export default function AdminDashboard() {
  const { user, isAuthenticated, isAdmin, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("usuarios");

  // Delivery Game States
  const [deliverGameOpen, setDeliverGameOpen] = useState(false);
  const [selectedDeliverOrder, setSelectedDeliverOrder] = useState<any>(null);
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  const { data: sales, isLoading: loadingSales, refetch: refetchSales } = trpc.orders.listAll.useQuery(undefined, {
    enabled: isAuthenticated && isAdmin,
  });

  const deliverOrderMutation = trpc.orders.deliverOrder.useMutation({
    onSuccess: () => {
      refetchSales();
      setDeliverGameOpen(false);
      toast.success("Dados do jogo salvos e enviados com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao entregar o jogo: " + (err.message || "Erro desconhecido"));
    }
  });

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

  // Jogos
  const [gamesList, setGamesList] = useState<any[]>([]);
  const [showGameModal, setShowGameModal] = useState(false);
  const [gameName, setGameName] = useState("");
  const [gamePrice, setGamePrice] = useState(0);
  const [gamePlatform, setGamePlatform] = useState("");
  const [gameImageUrl, setGameImageUrl] = useState("");
  const [gameStock, setGameStock] = useState(999);
  const [gameIsActive, setGameIsActive] = useState(true);
  const [gameCoverFit, setGameCoverFit] = useState<"cover" | "contain">("cover");
  const [addingGame, setAddingGame] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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
      let platform = "PS4/PS5";
      let stock = 999;

      // Caso A: Se a linha contiver ponto e vírgula, tratamos como delimitador clássico
      if (text.includes(";")) {
        const parts = text.split(";");
        name = parts[0]?.trim() || "";
        price = parts[1] ? parseFloat(parts[1].trim().replace(",", ".")) : 0;
        platform = parts[2]?.trim() || "PS4/PS5";
        stock = parts[3] ? parseInt(parts[3].trim()) : 999;
      } else {
        // Caso B: Parse inteligente do texto corrido (ex: "A Plague Tale Requiem PS5 74 90")
        let nameAndPlatform = text;
        const doubleNumberRegex = /\s+(\d+)\s+(\d{2})$/; // ex: "74 90" ou "134 90"
        const singlePriceRegex = /\s+(\d+[,.]\d{2})$/;   // ex: "24.90" ou "24,90"
        const simpleIntRegex = /\s+(\d+)$/;              // ex: "20" ou "60"

        if (doubleNumberRegex.test(text)) {
          const match = text.match(doubleNumberRegex);
          price = parseFloat(`${match[1]}.${match[2]}`);
          nameAndPlatform = text.replace(doubleNumberRegex, "").trim();
        } else if (singlePriceRegex.test(text)) {
          const match = text.match(singlePriceRegex);
          price = parseFloat(match[1].replace(",", "."));
          nameAndPlatform = text.replace(singlePriceRegex, "").trim();
        } else if (simpleIntRegex.test(text)) {
          const match = text.match(simpleIntRegex);
          price = parseFloat(match[1]);
          nameAndPlatform = text.replace(simpleIntRegex, "").trim();
        }

        // Tenta extrair plataforma do final do nome
        const platformRegex = /\s*\(?(PS4\s*[\/\-&eE]?\s*PS5|PS5\s*[\/\-&eE]?\s*PS4|PS5|PS4)\)?$/i;
        if (platformRegex.test(nameAndPlatform)) {
          const match = nameAndPlatform.match(platformRegex);
          platform = match[1].toUpperCase().replace(/\s+/g, "/"); // Normaliza para PS4/PS5, PS5 ou PS4
          name = nameAndPlatform.replace(platformRegex, "").trim();
        } else {
          name = nameAndPlatform;
        }

        // Se o preço for 0, mas estivermos na promoção secundária ou semelhante, podemos dar um valor padrão como 33.30
        if (price === 0) {
          price = 33.30;
        }
      }

      if (name) {
        parsedGames.push({
          id: `batch-${index}-${Date.now()}`,
          name,
          price: isNaN(price) ? 33.30 : price,
          platform: platform || "PS4/PS5",
          stock: isNaN(stock) ? 999 : stock,
          imageUrl: "",
          status: "pending",
          errorMsg: ""
        });
      }
    });

    setBatchGames(parsedGames);
    triggerBatchCoverSearch(parsedGames);
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

    let count = 0;
    try {
      for (const game of batchGames) {
        await addDoc(collection(db, "digital_products"), {
          name: game.name.trim(),
          price: Number(game.price),
          platform: game.platform.trim(),
          imageUrl: game.imageUrl.trim(),
          stock: Number(game.stock),
          isActive: true,
          type: "jogo",
          description: "Jogo Mídia Digital.",
          createdAt: new Date().toISOString()
        });
        count++;
        setBatchSaveProgress(Math.round((count / batchGames.length) * 100));
      }
      toast.success(`${count} jogos cadastrados com sucesso!`);
      setShowBatchModal(false);
      setBatchRawText("");
      setBatchGames([]);
    } catch (error) {
      console.error("Erro ao cadastrar lote:", error);
      toast.error(`Erro ao salvar lote de jogos. Cadastrados: ${count} de ${batchGames.length}.`);
    } finally {
      setIsSavingBatch(false);
      setBatchSaveProgress(0);
    }
  };

  // Indicações & Prêmios
  const [allReferrals, setAllReferrals] = useState<any[]>([]);
  const [allRedemptions, setAllRedemptions] = useState<any[]>([]);
  const [allPrizes, setAllPrizes] = useState<any[]>([]);

  // Modal de prêmios
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [prizeName, setPrizeName] = useState("");
  const [prizeCost, setPrizeCost] = useState(500);
  const [prizeBadge, setPrizeBadge] = useState("Mais Popular");
  const [prizeDesc, setPrizeDesc] = useState("");
  const [prizeStock, setPrizeStock] = useState(1);
  const [addingPrize, setAddingPrize] = useState(false);
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null);

  const resetPrizeForm = () => {
    setPrizeName("");
    setPrizeCost(500);
    setPrizeBadge("Mais Popular");
    setPrizeDesc("");
    setPrizeStock(1);
    setEditingPrizeId(null);
  };

  const openEditPrize = (prize: any) => {
    setEditingPrizeId(prize.id);
    setPrizeName(prize.name || "");
    setPrizeCost(prize.cost || 500);
    setPrizeBadge(prize.badge || "Mais Popular");
    setPrizeDesc(prize.description || "");
    setPrizeStock(prize.stock ?? 1);
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

  // Escutar Jogos
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    const q = collection(db, "digital_products");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setGamesList(data);
    });

    return () => unsubscribe();
  }, [isAuthenticated, isAdmin]);

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim() || !gamePlatform.trim()) {
      toast.warning("Nome e plataforma são obrigatórios.");
      return;
    }
    setAddingGame(true);
    try {
      if (editingGameId) {
        await updateDoc(doc(db, "digital_products", editingGameId), {
          name: gameName.trim(),
          price: Number(gamePrice),
          platform: gamePlatform.trim(),
          imageUrl: gameImageUrl.trim(),
          coverFit: gameCoverFit,
          stock: Number(gameStock),
          isActive: gameIsActive
        });
        toast.success("Jogo atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "digital_products"), {
          name: gameName.trim(),
          price: Number(gamePrice),
          platform: gamePlatform.trim(),
          imageUrl: gameImageUrl.trim(),
          coverFit: gameCoverFit,
          stock: Number(gameStock),
          isActive: gameIsActive,
          type: "jogo",
          description: "Jogo Mídia Digital.",
          createdAt: new Date().toISOString()
        });
        toast.success("Jogo cadastrado com sucesso!");
      }
      setShowGameModal(false);
      resetGameForm();
    } catch (error) {
      console.error("Erro ao salvar jogo:", error);
      toast.error("Erro ao salvar jogo.");
    } finally {
      setAddingGame(false);
    }
  };

  const resetGameForm = () => {
    setGameName("");
    setGamePrice(0);
    setGamePlatform("");
    setGameImageUrl("");
    setGameCoverFit("cover");
    setGameStock(999);
    setGameIsActive(true);
    setEditingGameId(null);
  };

  const openEditGame = (game: any) => {
    setEditingGameId(game.id);
    setGameName(game.name || "");
    setGamePrice(game.price || 0);
    setGamePlatform(game.platform || "");
    setGameImageUrl(game.imageUrl || "");
    setGameCoverFit(game.coverFit || "cover");
    setGameStock(game.stock ?? 999);
    setGameIsActive(game.isActive ?? true);
    setShowGameModal(true);
  };

  const handleDeleteGame = (gameId: string) => {
    toast("Tem certeza que deseja excluir permanentemente este jogo?", {
      action: {
        label: "Excluir",
        onClick: async () => {
          try {
            await deleteDoc(doc(db, "digital_products", gameId));
            toast.success("Jogo excluído com sucesso!");
          } catch (error) {
            console.error("Erro ao excluir jogo:", error);
            toast.error("Erro ao excluir jogo.");
          }
        }
      }
    });
  };

  const handleToggleCollaborator = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "collaborator" ? "user" : "collaborator";
    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole
      });
      toast.success("Permissão atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar papel:", error);
      toast.error("Erro ao atualizar permissão.");
    }
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    if (users.find(u => u.id === userId)?.email === "luanmnogueira@gmail.com") {
      toast.warning("Não é possível alterar o cargo do gestor principal.");
      return;
    }
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole
      });
      toast.success("Permissão atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar papel:", error);
      toast.error("Erro ao atualizar permissão.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserPassword.length < 6) {
      toast.warning("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setCreating(true);
    let secondaryApp;
    try {
      // Técnica da instância secundária para não deslogar o Admin
      secondaryApp = initializeApp(firebaseConfig, `Secondary-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      
      // 1. Criar no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPassword);
      const uid = userCredential.user.uid;

      // 2. Criar documento no Firestore
      await setDoc(doc(db, "users", uid), {
        uid,
        email: newUserEmail,
        name: newUserName,
        role: newUserRole,
        createdAt: new Date().toISOString()
      });

      toast.success(`Usuário ${newUserName} criado com sucesso como ${newUserRole}!`);
      setShowCreateModal(false);
      
      // Limpar campos
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast.error("Erro ao criar usuário: " + (error.message || "Erro desconhecido"));
    } finally {
      if (secondaryApp) await deleteApp(secondaryApp);
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (email === "luanmnogueira@gmail.com") return;
    toast(`Tem certeza que deseja remover o acesso de ${email}? (Isso removerá as permissões no Firestore)`, {
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
    
    toast(`Confirmar que o usuário indicado (${referral.inviteeName}) efetuou a compra de um jogo? Isso creditará +100 Fortecoins ao padrinho.`, {
      action: {
        label: "Confirmar",
        onClick: async () => {
          try {
            // 1. Atualizar status da indicação
            await updateDoc(doc(db, "referrals", referral.id), {
              status: "pago",
              confirmedAt: new Date().toISOString()
            });

            // 2. Incrementar moedas do indicador
            const referrerRef = doc(db, "users", referral.referrerId);
            const referrerSnap = await getDoc(referrerRef);
            
            if (referrerSnap.exists()) {
              const currentCoins = referrerSnap.data()?.forteCoins ?? 0;
              await updateDoc(referrerRef, {
                forteCoins: currentCoins + 100
              });
              toast.success(`Sucesso! Compra de jogo confirmada e 100 Fortecoins adicionados ao saldo do padrinho.`);
            } else {
              toast.error(`A indicação foi marcada como paga, mas o padrinho correspondente (${referral.referrerId}) não foi localizado no Firestore.`);
            }
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

      // 3. Devolver as moedas para o usuário
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
    { name: "DRAGON BALL KAKAROT PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/454650/header.jpg" },
    { name: "DRAGON BALL SPARKING ZERO PS5", price: 174.90, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1790600/header.jpg" },
    { name: "DYING LIGHT PS4/PS5", price: 20.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/239140/header.jpg" },
    { name: "DYING LIGHT 2 PS4/PS5", price: 54.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/534380/header.jpg" },
    { name: "FAR CRY 5 PS4/PS5", price: 30.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/552520/header.jpg" },
    { name: "FAR CRY 6 PS4/PS5", price: 54.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2369390/header.jpg" },
    { name: "FAR CRY NEW DAWN PS4/PS5", price: 24.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/939960/header.jpg" },
    { name: "FINAL FANTASY XVI PS5", price: 119.90, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2515020/header.jpg" },
    { name: "GHOST RECON WILDLANDS PS4/PS5", price: 34.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/460930/header.jpg" },
    { name: "GOD OF WAR 2018 PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1593500/header.jpg" },
    { name: "GOD OF WAR 3 REMASTER PS4/PS5", price: 36.99, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2322010/header.jpg" },
    { name: "GTA V PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/3240220/header.jpg" },
    { name: "HI-FI RUSH PS5", price: 59.90, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1817230/header.jpg" },
    { name: "HOGWARTS LEGACY PS4/PS5", price: 39.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/990080/header.jpg" },
    { name: "HORIZON FORBIDDEN WEST PS4/PS5", price: 100.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2420110/header.jpg" },
    { name: "JEDI FALLEN ORDER PS4/PS5", price: 44.99, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1172380/header.jpg" },
    { name: "JUST CAUSE 4 PS4/PS5", price: 19.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/517630/header.jpg" },
    { name: "MAFIA 3 PS4/PS5", price: 24.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/360430/header.jpg" },
    { name: "MARTHA IS DEAD PS4/PS5", price: 40.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/515960/header.jpg" },
    { name: "MORTAL KOMBAT 1 PS5", price: 69.90, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1971870/header.jpg" },
    { name: "MORTAL KOMBAT 11 PS4/PS5", price: 20.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/976310/header.jpg" },
    { name: "NARUTO STORM 4 PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/495160/header.jpg" },
    { name: "PREY PS4/PS5", price: 27.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/480490/header.jpg" },
    { name: "PRINCE OF PERSIA LOST CROWN PS4/PS5", price: 44.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2751000/header.jpg" },
    { name: "RED DEAD REDEMPTION 2 PS4/PS5", price: 64.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg" },
    { name: "SHADOW OF THE COLOSSUS PS4/PS5", price: 44.99, platform: "PS4/PS5", imageUrl: "https://gmedia.playstation.com/is/image/SIEPDC/shadow-of-the-colossus-store-art-01-us-15nov17?$native$" },
    { name: "SHADOW OF MORDOR PS4/PS5", price: 17.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/241930/header.jpg" },
    { name: "SNIPER ELITE 4 PS4/PS5", price: 27.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/312660/header.jpg" },
    { name: "STAR WARS OUTLAWS PS5", price: 69.90, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2842040/header.jpg" },
    { name: "THE CREW MOTORFEST PS4/PS5", price: 55.00, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2698940/header.jpg" },
    { name: "THE ELDER SCROLLS V SKYRIM PS4/PS5", price: 36.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/489830/header.jpg" },
    { name: "THE LAST OF US PART I PS5", price: 120.00, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1888930/header.jpg" },
    { name: "THE LAST OF US PART II PS4", price: 100.00, platform: "PS4", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2531310/header.jpg" },
    { name: "THE LAST OF US REMASTERED PS4/PS5", price: 35.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1888930/header.jpg" },
    { name: "THE ORDER 1886 PS4/PS5", price: 36.90, platform: "PS4/PS5", imageUrl: "https://gmedia.playstation.com/is/image/SIEPDC/the-order-1886-keyart-01-en-24jul20?$native$" },
    { name: "TOM CLANCY GHOST RECON BREAKPOINT PS4/PS5", price: 39.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2231380/header.jpg" },
    { name: "TONY HAWK'S PRO SKATER 1+2 PS4/PS5", price: 64.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2395210/header.jpg" },
    { name: "UNCHARTED 4 + LOST LEGACY PS4", price: 69.90, platform: "PS4", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1659420/header.jpg" },
    { name: "UNCHARTED LEGACY OF THIEVES PS5", price: 89.90, platform: "PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1659420/header.jpg" },
    { name: "WATCH DOGS LEGION PS4/PS5", price: 29.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/2239550/header.jpg" },
    { name: "WOLFENSTEIN THE NEW ORDER PS4/PS5", price: 16.90, platform: "PS4/PS5", imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/201810/header.jpg" },
  ];

  const handleSeedGames = async () => {
    toast(`Isso vai inserir ${GAMES_CATALOG.length} jogos no Firestore. Continuar?`, {
      action: {
        label: "Continuar",
        onClick: async () => {
          setSeeding(true);
          setSeedLog([]);
          const col = collection(db, "digital_products");
          let inserted = 0; let updated = 0;
          for (const game of GAMES_CATALOG) {
            try {
              const { getDocs, query: q2, where } = await import("firebase/firestore");
              const snap = await getDocs(q2(col, where("name", "==", game.name)));
              if (!snap.empty) {
                await updateDoc(snap.docs[0].ref, { price: game.price, imageUrl: game.imageUrl, platform: game.platform, isActive: true });
                setSeedLog(l => [...l, `[~] Atualizado: ${game.name}`]);
                updated++;
              } else {
                await addDoc(col, { ...game, type: "jogo", description: "Jogo PS4/PS5 - Mídia Digital.", isActive: true, stock: 999, createdAt: new Date().toISOString() });
                setSeedLog(l => [...l, `[+] Inserido: ${game.name}`]);
                inserted++;
              }
            } catch (e: any) {
              setSeedLog(l => [...l, `[!] Erro em ${game.name}: ${e.message}`]);
            }
          }
          setSeedLog(l => [...l, `\n✅ Concluído! Inseridos: ${inserted}, Atualizados: ${updated}`]);
          setSeeding(false);
          toast.success("Processo de seeding concluído!");
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="bg-slate-900 border-b border-red-600/20 p-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-3xl font-black text-neon flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-600" />
              Painel do Gestor
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowCreateModal(true)} className="bg-red-600 hover:bg-red-700 font-bold btn-neon flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Criar Novo Acesso
            </Button>
            <Button variant="ghost" onClick={logout} className="text-slate-400 hover:text-red-500 hover:bg-red-950/20 font-bold flex items-center gap-2 h-10 px-4">
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto py-12 px-4">
        <Tabs defaultValue="usuarios" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900/60 border border-red-600/20 mb-8 !flex !items-center !justify-start !overflow-x-auto !overflow-y-hidden !max-w-full !h-12 !p-1 !gap-2 !rounded-xl !w-full md:!w-auto">
            <TabsTrigger value="usuarios" className="data-[state=active]:!bg-red-600 data-[state=active]:!text-white font-bold !h-10 !px-5 !text-sm !rounded-lg !whitespace-nowrap transition-all duration-300 hover:bg-slate-800/80 !inline-flex !items-center !justify-center">Gerenciar Acessos</TabsTrigger>
            <TabsTrigger value="jogos" className="data-[state=active]:!bg-red-600 data-[state=active]:!text-white font-bold !h-10 !px-5 !text-sm !rounded-lg !whitespace-nowrap transition-all duration-300 hover:bg-slate-800/80 !inline-flex !items-center !justify-center !gap-2">
              <Gamepad2 className="w-4 h-4" />
              Gerenciar Jogos
            </TabsTrigger>
            <TabsTrigger value="referrals" className="data-[state=active]:!bg-red-600 data-[state=active]:!text-white font-bold !h-10 !px-5 !text-sm !rounded-lg !whitespace-nowrap transition-all duration-300 hover:bg-slate-800/80 !inline-flex !items-center !justify-center !gap-2">
              Indicações & Prêmios
              {(allRedemptions.some(r => r.status === "pendente") || allReferrals.some(r => r.status === "pendente")) && (
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="premios" className="data-[state=active]:!bg-red-600 data-[state=active]:!text-white font-bold !h-10 !px-5 !text-sm !rounded-lg !whitespace-nowrap transition-all duration-300 hover:bg-slate-800/80 !inline-flex !items-center !justify-center !gap-2">
              <Gift className="w-4 h-4" />
              Gerenciar Prêmios
            </TabsTrigger>
            <TabsTrigger value="vendas" className="data-[state=active]:!bg-red-600 data-[state=active]:!text-white font-bold !h-10 !px-5 !text-sm !rounded-lg !whitespace-nowrap transition-all duration-300 hover:bg-slate-800/80 !inline-flex !items-center !justify-center !gap-2">
              📦 Gerenciar Vendas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios">
            <h2 className="text-xl font-bold text-white mb-8 border-l-4 border-red-600 pl-4 uppercase tracking-widest text-sm italic">Gestão de Equipe</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((u) => (
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
                    <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-300 ${
                      u.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)]' :
                      u.role === 'collaborator' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]' :
                      'bg-slate-800/80 text-slate-400 border-slate-700/50'
                    }`}>
                      {u.role}
                    </div>
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
                          className={`w-full flex items-center justify-center gap-2 font-bold h-10 ${
                            u.role === 'collaborator' 
                            ? "bg-blue-600/20 hover:bg-blue-600/30 text-blue-400" 
                            : "bg-slate-800 hover:bg-slate-700 text-white"
                          }`}
                        >
                          {u.role === 'collaborator' ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                          {u.role === 'collaborator' ? "Remover Colaborador" : "Tornar Colaborador"}
                        </Button>
                        
                        <Button 
                          onClick={() => handleToggleAdmin(u.id, u.role)}
                          className={`w-full flex items-center justify-center gap-2 font-bold h-10 ${
                            u.role === 'admin' 
                            ? "bg-red-600 hover:bg-red-700 text-white" 
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                          }`}
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

          <TabsContent value="jogos">
            <div className="flex justify-between items-center mb-8 border-l-4 border-red-600 pl-4">
              <h2 className="text-xl font-bold text-white uppercase tracking-widest text-sm italic">Catálogo de Jogos</h2>
              <div className="flex gap-2">
                <Button onClick={() => { setBatchGames([]); setBatchRawText(""); setShowBatchModal(true); }} className="bg-slate-900 border border-red-600/30 hover:border-red-600/60 text-red-500 font-bold flex items-center gap-2">
                  📦 Cadastrar em Lote
                </Button>
                <Button onClick={() => { resetGameForm(); setShowGameModal(true); }} className="bg-red-600 hover:bg-red-700 font-bold btn-neon flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Adicionar Jogo
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {gamesList.map((game) => (
                <Card key={game.id} className={`bg-slate-900/40 backdrop-blur-md border-red-600/10 p-4 hover:border-red-600/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-500 card-neon relative overflow-hidden group ${!game.isActive ? 'opacity-50' : ''}`}>
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
                      <h3 className="font-bold text-white text-sm line-clamp-2 flex-1" title={game.name}>{game.name}</h3>
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
                    <p className="text-xs text-slate-400 mb-1">Preço: <span className="text-green-400 font-bold">R$ {Number(game.price || 0).toFixed(2)}</span></p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800/50">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                        game.isActive 
                        ? "bg-green-500/10 text-green-500 border-green-500/20" 
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                      }`}>
                        {game.isActive ? "Ativo" : "Inativo"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium bg-slate-900 px-2 py-0.5 rounded">
                        Estq: {game.stock}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
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
                      <div key={red.id} className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl space-y-3">
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
                      <div key={ref.id} className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl space-y-2">
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
                            Confirmar Compra (Dar +100 FC)
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
                            <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border
                              ${sale.status === 'pendente' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                sale.status === 'pago' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                sale.status === 'enviado' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                sale.status === 'entregue' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                              {sale.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
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
                              <span className="text-xs text-slate-600 italic">N/A</span>
                            )}
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
                <Card key={p.id} className={`bg-slate-900 border-red-600/10 p-6 flex flex-col justify-between card-neon relative ${!p.isActive || p.stock <= 0 ? 'opacity-60' : ''}`}>
                  <div>
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
                  </div>

                  <div className="flex gap-2 mt-6 pt-4 border-t border-slate-800">
                    <Button
                      onClick={() => handleTogglePrizeStatus(p.id, p.isActive, p.stock)}
                      className={`flex-1 font-bold h-9 text-xs ${
                        p.isActive 
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
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
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

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
              <Label className="text-xs text-slate-300 font-bold uppercase">Nome do Jogo</Label>
              <Input
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="Ex: God of War Ragnarok"
                className="bg-slate-950 border-red-600/20 text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase">Plataforma</Label>
                <Input
                  value={gamePlatform}
                  onChange={(e) => setGamePlatform(e.target.value)}
                  placeholder="Ex: PS4/PS5"
                  className="bg-slate-950 border-red-600/20 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase">Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={gamePrice}
                  onChange={(e) => setGamePrice(Number(e.target.value))}
                  placeholder="Ex: 150.00"
                  className="bg-slate-950 border-red-600/20 text-white"
                  min={0}
                  required
                />
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
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
              <div className="space-y-2 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer h-10">
                  <input
                    type="checkbox"
                    checked={gameIsActive}
                    onChange={(e) => setGameIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-red-600/20 bg-slate-950 text-red-600 focus:ring-red-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-300 uppercase">Ativo na Loja</span>
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
        <DialogContent className="bg-slate-900 border-red-600/30 text-white max-w-4xl card-neon max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-neon">
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
            <div className="space-y-6 py-4">
              <div className="max-h-[50vh] overflow-y-auto border border-red-600/10 rounded-lg">
                <table className="w-full text-left border-collapse">
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
                              <span className="text-[9px] text-slate-600 text-center font-bold">Sem capa</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Input
                            value={game.name}
                            onChange={(e) => {
                              const updated = [...batchGames];
                              updated[idx].name = e.target.value;
                              setBatchGames(updated);
                            }}
                            className="bg-slate-950 border-slate-800 h-8 text-xs text-white"
                          />
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
                    <span>Salvando jogos no Firestore...</span>
                    <span>{batchSaveProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-red-600/10">
                    <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${batchSaveProgress}%` }} />
                  </div>
                </div>
              )}

              <DialogFooter className="flex items-center justify-between gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setBatchGames([]); }}
                  disabled={isSavingBatch}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Voltar
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => triggerBatchCoverSearch(batchGames)}
                    disabled={isProcessingBatchSearch || isSavingBatch}
                    className="text-red-500 hover:bg-red-500/10 font-bold animate-pulse"
                  >
                    {isProcessingBatchSearch ? "Buscando..." : "Refazer Busca de Capas"}
                  </Button>
                  <Button
                    onClick={handleSaveBatchGames}
                    disabled={isSavingBatch || batchGames.length === 0}
                    className="bg-red-600 hover:bg-red-700 font-bold px-6 btn-neon"
                  >
                    {isSavingBatch ? "Cadastrando..." : `Cadastrar ${batchGames.length} Jogos`}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
