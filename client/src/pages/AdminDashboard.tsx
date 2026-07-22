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
import { Shield, User, UserCheck, UserPlus, ArrowLeft, Plus, X, Lock, Mail, Trash2, MessageCircle, Send, Coins, Gift, Check, Clock, LogOut, Gamepad2, Edit, Menu, BarChart3, Users, ShoppingBag, Tag, Image, Percent, Ban, Trophy, ExternalLink, Flame } from "lucide-react";
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

export default function AdminDashboard() {
  const { user, isAuthenticated, isAdmin, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("visao-geral");
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
  const [promoPosition, setPromoPosition] = useState<"main" | "sidebar_top" | "sidebar_bottom">("main");
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

  const openEditPromo = (promo: any) => {
    setEditingPromoId(promo.id);
    setPromoTitle(promo.title || "");
    setPromoImage(promo.imageUrl || "");
    setPromoLink(promo.link || "");
    setPromoCountdown(promo.expiresAt ? new Date(promo.expiresAt).toISOString().substring(0, 16) : "");
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
        expiresAt: couponExpiresForm ? new Date(couponExpiresForm).toISOString() : null,
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

  const handleUpdateSaleStatus = (orderId: number, status: string) => {
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

  // Jogos
  const [gamesList, setGamesList] = useState<any[]>([]);
  const [showGameModal, setShowGameModal] = useState(false);
  const [gameName, setGameName] = useState("");
  const [gamePrice, setGamePrice] = useState(0);
  const [gamePlatform, setGamePlatform] = useState("");
  const [gameCategory, setGameCategory] = useState("");
  const [gameImageUrl, setGameImageUrl] = useState("");
  const [gameStock, setGameStock] = useState(999);
  const [gameIsActive, setGameIsActive] = useState(true);
  const [gameIsPreVenda, setGameIsPreVenda] = useState(false);
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

  const menuItems = useMemo(() => [
    { value: "visao-geral", label: "Visão Geral", icon: BarChart3 },
    { value: "usuarios", label: "Gerenciar Acessos", icon: Users },
    { value: "jogos", label: "Gerenciar Jogos", icon: Gamepad2 },
    { 
      value: "referrals", 
      label: "Indicações & Prêmios", 
      icon: Coins, 
      badge: (allRedemptions.some(r => r.status === "pendente") || allReferrals.some(r => r.status === "pendente")) 
    },
    { value: "premios", label: "Gerenciar Prêmios", icon: Gift },
    { value: "platinador", label: "Clube Platinador", icon: Trophy },
    { value: "vendas", label: "Gerenciar Vendas", icon: ShoppingBag },
    { value: "aba_promocoes", label: "Gerenciar Promoções", icon: Tag },
    { value: "promocoes", label: "Banners Promo", icon: Image },
    { value: "cupons", label: "Cupons", icon: Percent }
  ], [allRedemptions, allReferrals]);

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
          category: gameCategory.trim(),
          imageUrl: gameImageUrl.trim(),
          coverFit: gameCoverFit,
          stock: Number(gameStock),
          isActive: gameIsActive,
          isPreVenda: gameIsPreVenda
        });
        toast.success("Jogo atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "digital_products"), {
          name: gameName.trim(),
          price: Number(gamePrice),
          platform: gamePlatform.trim(),
          category: gameCategory.trim(),
          imageUrl: gameImageUrl.trim(),
          coverFit: gameCoverFit,
          stock: Number(gameStock),
          isActive: gameIsActive,
          isPreVenda: gameIsPreVenda,
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
    setGameCategory("");
    setGameImageUrl("");
    setGameCoverFit("cover");
    setGameStock(999);
    setGameIsActive(true);
    setGameIsPreVenda(false);
    setEditingGameId(null);
  };

  const openEditGame = (game: any) => {
    setEditingGameId(game.id);
    setGameName(game.name || "");
    setGamePrice(game.price || 0);
    setGamePlatform(game.platform || "");
    setGameCategory(game.category || "");
    setGameImageUrl(game.imageUrl || "");
    setGameCoverFit(game.coverFit || "cover");
    setGameStock(game.stock ?? 999);
    setGameIsActive(game.isActive ?? true);
    setGameIsPreVenda(game.isPreVenda ?? false);
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
    try {
      // Verifica se o usuário já existe no banco de dados localmente carregado
      const existingUser = users.find(u => u.email.toLowerCase() === newUserEmail.toLowerCase());
      
      if (existingUser) {
        // Usuário já existe, apenas promove ele para o novo cargo
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
    
    toast(`Confirmar que o usuário indicado (${referral.inviteeName}) efetuou a compra de um jogo? Isso creditará +15 Fortecoins ao padrinho.`, {
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
                forteCoins: currentCoins + 15
              });
              toast.success(`Sucesso! Compra de jogo confirmada e 15 Fortecoins adicionados ao saldo do padrinho.`);
            } else {
              toast.error(`A indicação foi marcada como paga, mas o padrinho correspondente (${referral.referrerId}) não foi localizado no servidor.`);
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
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.value;
          return (
            <button
              key={item.value}
              onClick={() => {
                setActiveTab(item.value);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                isActive
                  ? "bg-red-655/10 text-red-500 border-l-4 border-red-600 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-850"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${
                  isActive ? "text-red-500" : "text-slate-500 group-hover:text-red-500"
                }`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20">
        <div className="flex items-center gap-3 px-2 py-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-red-650/10 border border-red-500/20 flex items-center justify-center font-bold text-red-500 uppercase text-sm shrink-0">
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
            className="flex-1 h-9 text-xs border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 font-bold"
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
        <header className="bg-slate-900 border-b border-red-650/10 py-4 px-6 sticky top-0 z-30 backdrop-blur-md bg-opacity-95">
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
                {menuItems.find(item => item.value === activeTab)?.label || "Painel do Gestor"}
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Button onClick={() => setShowCreateModal(true)} className="bg-red-600 hover:bg-red-700 font-bold btn-neon flex items-center gap-1.5 h-9 text-xs sm:h-10 sm:text-sm">
                <Plus className="w-4 h-4" />
                Criar Novo Acesso
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="visao-geral">
              <div className="space-y-8">
              {/* KPIs Row */}
              {(() => {
                const stats = getSalesStats();
                const activeCount = users.filter((u: any) => {
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
                            <p className="text-2xl font-black text-green-500">{Math.max(1, activeCount)}</p>
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
                            <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                              sale.status === "entregue" ? "bg-green-500/10 text-green-500" :
                              sale.status === "pago" || sale.status === "enviado" ? "bg-blue-500/10 text-blue-400 animate-pulse" :
                              "bg-slate-800 text-slate-400"
                            }`}>
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
                    {game.category && <p className="text-xs text-slate-400 mb-1">Categoria: <span className="text-white font-medium">{game.category}</span></p>}
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
                <div className="col-span-full py-12 text-center text-slate-500 italic">
                  Nenhum banner cadastrado.
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
                          "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}>
                          {p.position === "sidebar_top" ? "Lateral Sup" :
                           p.position === "sidebar_bottom" ? "Lateral Inf" : "Principal"}
                        </span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider ${
                          p.isActive 
                          ? "bg-green-500/10 text-green-500 border-green-500/20" 
                          : "bg-red-500/10 text-red-500 border-red-500/20"
                        }`}>
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

                    <div className="p-5 pt-0 flex gap-2 border-t border-slate-850/60 mt-2">
                      <Button
                        onClick={() => handleTogglePromoActive(p.id, p.isActive)}
                        className={`flex-1 font-bold h-9 text-xs ${
                          p.isActive 
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {p.isActive ? "Pausar" : "Ativar"}
                      </Button>
                      <Button
                        onClick={() => openEditPromo(p)}
                        variant="outline"
                        className="bg-blue-950/20 hover:bg-blue-950/40 text-blue-400 border-blue-500/30 hover:border-blue-500/50 font-bold h-9 text-xs px-3"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeletePromo(p.id)}
                        variant="outline"
                        className="bg-red-950/20 hover:bg-red-950/40 text-red-400 border-red-500/30 hover:border-red-500/50 font-bold h-9 text-xs px-3"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
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
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border
                              ${coupon.isActive 
                                ? "bg-green-500/10 text-green-500 border-green-500/20" 
                                : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                              {coupon.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={() => handleToggleCouponActive(coupon.id, coupon.isActive)}
                                className={`font-bold h-8 text-xs ${
                                  coupon.isActive 
                                    ? "bg-slate-850 hover:bg-slate-800 text-slate-350"
                                    : "bg-green-600 hover:bg-green-700 text-white"
                                }`}
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
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border
                              ${deal.isActive 
                                ? "bg-green-500/10 text-green-500 border-green-500/20" 
                                : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                              {deal.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={() => handleToggleDealActive(deal.id, deal.isActive)}
                                className={`font-bold h-8 text-xs ${
                                  deal.isActive 
                                    ? "bg-slate-850 hover:bg-slate-800 text-slate-350"
                                    : "bg-green-600 hover:bg-green-700 text-white"
                                }`}
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
              <Label className="text-xs text-slate-300 font-bold uppercase">Nome do Jogo</Label>
              <Input
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="Ex: God of War Ragnarok"
                className="bg-slate-950 border-red-600/20 text-white"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-bold uppercase">Plataforma</Label>
                <Input
                  value={gamePlatform}
                  onChange={(e) => setGamePlatform(e.target.value)}
                  placeholder="Selecione abaixo ou digite..."
                  className="bg-slate-950 border-red-600/20 text-white"
                  required
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {["PS5", "PS4", "PS4/PS5"].map(plat => (
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
                  {["Ação", "Aventura", "RPG", "Esportes", "Corrida", "Tiro / FPS", "Pré Venda"].map(cat => (
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
                    <span>Salvando jogos no catálogo...</span>
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
                {uploadingDealImage ? "Aguarde..." : (editingDealId ? "Salvar Alterações" : "Criar Promoção")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlatinadorAdminTab() {
  const [gameTitle, setGameTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardCoins, setRewardCoins] = useState("500");
  const [imageUrl, setImageUrl] = useState("");
  const [platform, setPlatform] = useState("PS4 / PS5");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const challengesQuery = trpc.platinador.listChallenges.useQuery();
  const submissionsQuery = trpc.platinador.adminListSubmissions.useQuery();

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

  return (
    <div className="space-y-8">
      {/* CARD 1: CADASTRAR NOVO JOGO / DESAFIO */}
      <Card className="bg-[#121212] border-red-600/30 p-6 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Trophy className="text-red-500" /> Cadastrar Novo Desafio de Platina
        </h3>

        <form onSubmit={handleCreateChallenge} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-slate-300 font-bold uppercase">Nome do Jogo *</Label>
            <Input
              value={gameTitle}
              onChange={(e) => setGameTitle(e.target.value)}
              placeholder="Ex: God of War Ragnarök"
              className="bg-slate-950 border-red-600/20 text-white mt-1"
              required
            />
          </div>

          <div>
            <Label className="text-xs text-slate-300 font-bold uppercase">Plataforma</Label>
            <Input
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="Ex: PS4 / PS5"
              className="bg-slate-950 border-red-600/20 text-white mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-slate-300 font-bold uppercase">Recompensa em ForteCoins *</Label>
            <Input
              type="number"
              value={rewardCoins}
              onChange={(e) => setRewardCoins(e.target.value)}
              placeholder="Ex: 500"
              className="bg-slate-950 border-red-600/20 text-white mt-1"
              required
            />
          </div>

          <div>
            <Label className="text-xs text-slate-300 font-bold uppercase">URL da Imagem da Capa</Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="bg-slate-950 border-red-600/20 text-white mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs text-slate-300 font-bold uppercase">Descrição do Desafio</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Conquiste todos os troféus incluindo a vitória na arena..."
              className="w-full h-20 p-3 bg-slate-950 border border-red-600/20 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 mt-1"
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 font-bold px-6 btn-neon text-white">
              {isSubmitting ? "Cadastrando..." : "Publicar Desafio no Clube"}
            </Button>
          </div>
        </form>
      </Card>

      {/* CARD 2: COMPROVAÇÕES ENVIADAS PELOS USUÁRIOS */}
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
                  <th className="p-3">PSN ID</th>
                  <th className="p-3">Desafio ID</th>
                  <th className="p-3">Comprovante</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {submissionsQuery.data.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-slate-800/40">
                    <td className="p-3 text-xs">
                      #{sub.id} <br />
                      <span className="text-[10px] text-slate-500">
                        {new Date(sub.submittedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-white">{sub.psnId}</td>
                    <td className="p-3 text-xs text-slate-400">Desafio #{sub.challengeId}</td>
                    <td className="p-3">
                      <a
                        href={sub.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                      >
                        Ver Foto <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="p-3">
                      {sub.status === "aprovado" && (
                        <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded font-bold">
                          Aprovado (+{sub.coinsAwarded} Coins)
                        </span>
                      )}
                      {sub.status === "pendente" && (
                        <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded font-bold">
                          Pendente
                        </span>
                      )}
                      {sub.status === "rejeitado" && (
                        <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded font-bold">
                          Rejeitado
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {sub.status === "pendente" && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() =>
                              approveMutation.mutate({
                                submissionId: sub.id,
                                coinsToAward: 500,
                              })
                            }
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                          >
                            Aprovar (+500 Coins)
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const reason = prompt("Motivo da rejeição:") || "Foto ilegível ou PSN ID não bate";
                              rejectMutation.mutate({
                                submissionId: sub.id,
                                adminNotes: reason,
                              });
                            }}
                            className="text-xs font-bold"
                          >
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
