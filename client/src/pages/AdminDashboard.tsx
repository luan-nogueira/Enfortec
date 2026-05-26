import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "@/lib/firebase";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, query, orderBy, serverTimestamp, addDoc, getDoc } from "firebase/firestore";
import { useLocation } from "wouter";
import { Shield, User, UserCheck, UserPlus, ArrowLeft, Plus, X, Lock, Mail, Trash2, MessageCircle, Send, Coins, Gift, Check, Clock, LogOut } from "lucide-react";
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

export default function AdminDashboard() {
  const { user, isAuthenticated, isAdmin, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("usuarios");

  // Atendimento
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [adminMessage, setAdminMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Indicações & Prêmios
  const [allReferrals, setAllReferrals] = useState<any[]>([]);
  const [allRedemptions, setAllRedemptions] = useState<any[]>([]);

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

  // Escutar Chats (Atendimento)
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    const q = query(collection(db, "chats"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChats(data);
    });

    return () => unsubscribe();
  }, [isAuthenticated, isAdmin]);

  // Escutar Mensagens do Chat Selecionado
  useEffect(() => {
    if (!selectedChat?.id) return;

    const q = query(
      collection(db, "chats", selectedChat.id, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChatMessages(data);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  // Scroll ao receber mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMessage.trim() || !selectedChat?.id) return;

    const msg = adminMessage;
    setAdminMessage("");

    try {
      // 1. Atualiza documento do chat (marca que admin respondeu)
      await updateDoc(doc(db, "chats", selectedChat.id), {
        lastMessage: msg,
        updatedAt: serverTimestamp(),
        unreadByAdmin: false
      });

      // 2. Adiciona a mensagem
      await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
        text: msg,
        senderId: user.id,
        senderName: "Gestor Eforte",
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Erro ao enviar resposta:", error);
    }
  };

  const handleToggleCollaborator = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "collaborator" ? "user" : "collaborator";
    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole
      });
    } catch (error) {
      console.error("Erro ao atualizar papel:", error);
      alert("Erro ao atualizar permissão.");
    }
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    if (users.find(u => u.id === userId)?.email === "luanmnogueira@gmail.com") {
      alert("Não é possível alterar o cargo do gestor principal.");
      return;
    }
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole
      });
    } catch (error) {
      console.error("Erro ao atualizar papel:", error);
      alert("Erro ao atualizar permissão.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserPassword.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres.");
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

      alert(`Usuário ${newUserName} criado com sucesso como ${newUserRole}!`);
      setShowCreateModal(false);
      
      // Limpar campos
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      alert("Erro ao criar usuário: " + (error.message || "Erro desconhecido"));
    } finally {
      if (secondaryApp) await deleteApp(secondaryApp);
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (email === "luanmnogueira@gmail.com") return;
    if (confirm(`Tem certeza que deseja remover o acesso de ${email}? (Isso removerá as permissões no Firestore)`)) {
      try {
        await deleteDoc(doc(db, "users", userId));
      } catch (error) {
        alert("Erro ao deletar usuário.");
      }
    }
  };

  const handleConfirmPurchase = async (referral: any) => {
    if (referral.status === "pago") return;
    
    if (confirm(`Confirmar que o usuário indicado (${referral.inviteeName}) efetuou a compra de um jogo? Isso creditará +100 Fortecoins ao padrinho.`)) {
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
          alert(`Sucesso! Compra de jogo confirmada e 100 Fortecoins adicionados ao saldo do padrinho.`);
        } else {
          alert(`A indicação foi marcada como paga, mas o padrinho correspondente (${referral.referrerId}) não foi localizado no Firestore.`);
        }
      } catch (error) {
        console.error("Erro ao confirmar compra da indicação:", error);
        alert("Erro ao processar confirmação. Tente novamente.");
      }
    }
  };

  const handleDeliverPrize = async (redemptionId: string, prizeName: string) => {
    const code = prompt(`Digite o código do Gift Card ou a chave do jogo para entregar o prêmio "${prizeName}":`);
    if (code === null) return; // Cancelou
    
    if (!code.trim()) {
      alert("O código ou mensagem de entrega é obrigatório.");
      return;
    }

    try {
      await updateDoc(doc(db, "redemptions", redemptionId), {
        status: "entregue",
        code: code.trim(),
        deliveredAt: new Date().toISOString()
      });
      alert("Prêmio entregue com sucesso! O usuário receberá o código em seu painel de Fortecoins.");
    } catch (error) {
      console.error("Erro ao entregar prêmio:", error);
      alert("Erro ao registrar a entrega do prêmio.");
    }
  };

  const handleRefusePrize = async (redemptionId: string, prizeName: string, userId: string, cost: number) => {
    const reason = prompt(`Digite o motivo da recusa para o prêmio "${prizeName}" (ex: Conta suspeita, estoque esgotado):`);
    if (reason === null) return; // Cancelou
    
    if (confirm(`Deseja realmente recusar o resgate do prêmio "${prizeName}"? Isso devolverá ${cost} Fortecoins ao usuário.`)) {
      try {
        // 1. Atualizar status
        await updateDoc(doc(db, "redemptions", redemptionId), {
          status: "recusado",
          code: reason.trim() || "Solicitação recusada pelo administrador.",
          refusedAt: new Date().toISOString()
        });

        // 2. Devolver as moedas
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const currentCoins = userSnap.data()?.forteCoins ?? 0;
          await updateDoc(userRef, {
            forteCoins: currentCoins + cost
          });
          alert(`Solicitação recusada com sucesso! ${cost} Fortecoins foram devolvidos ao saldo do usuário.`);
        } else {
          alert(`A solicitação foi recusada, mas não foi possível localizar o usuário (${userId}) para reembolsar os pontos.`);
        }
      } catch (error) {
        console.error("Erro ao recusar prêmio:", error);
        alert("Erro ao processar recusa do prêmio.");
      }
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
    if (!confirm(`Isso vai inserir ${GAMES_CATALOG.length} jogos no Firestore. Continuar?`)) return;
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
            <TabsTrigger value="atendimento" className="data-[state=active]:!bg-red-600 data-[state=active]:!text-white font-bold !h-10 !px-5 !text-sm !rounded-lg !whitespace-nowrap transition-all duration-300 hover:bg-slate-800/80 !inline-flex !items-center !justify-center !gap-2">
              Central de Atendimento
              {chats.some(c => c.unreadByAdmin) && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="referrals" className="data-[state=active]:!bg-red-600 data-[state=active]:!text-white font-bold !h-10 !px-5 !text-sm !rounded-lg !whitespace-nowrap transition-all duration-300 hover:bg-slate-800/80 !inline-flex !items-center !justify-center !gap-2">
              Indicações & Prêmios
              {(allRedemptions.some(r => r.status === "pendente") || allReferrals.some(r => r.status === "pendente")) && (
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="catalogo" className="data-[state=active]:!bg-red-600 data-[state=active]:!text-white font-bold !h-10 !px-5 !text-sm !rounded-lg !whitespace-nowrap transition-all duration-300 hover:bg-slate-800/80 !inline-flex !items-center !justify-center !gap-2">
              🎮 Catálogo
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
                            alert("Por favor, digite um valor válido.");
                            return;
                          }
                          try {
                            await updateDoc(doc(db, "users", u.id), {
                              forteCoins: newCoins
                            });
                            alert(`Saldo de ${u.name || u.email} atualizado para ${newCoins} Fortecoins!`);
                          } catch (error) {
                            console.error("Erro ao atualizar moedas:", error);
                            alert("Erro ao atualizar saldo de moedas.");
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

          <TabsContent value="atendimento">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
              {/* Lista de Chats */}
              <Card className="bg-slate-900 border-red-600/10 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-red-600/20 bg-slate-950/50">
                  <h3 className="font-black text-white text-sm uppercase tracking-widest italic">Conversas Recentes</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {chats.length === 0 && (
                    <div className="p-8 text-center text-slate-600 italic text-sm">Nenhuma conversa ativa no momento.</div>
                  )}
                  {chats.map(chat => (
                    <div 
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`p-4 border-b border-red-600/5 cursor-pointer transition flex items-center gap-3 ${
                        selectedChat?.id === chat.id ? "bg-red-600/10" : "hover:bg-slate-800"
                      }`}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-red-600/20">
                          <User className="w-5 h-5 text-slate-400" />
                        </div>
                        {chat.unreadByAdmin && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{chat.userName}</p>
                        <p className="text-xs text-slate-500 truncate italic">"{chat.lastMessage}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Janela de Chat */}
              <Card className="lg:col-span-2 bg-slate-900 border-red-600/10 flex flex-col overflow-hidden relative">
                {selectedChat ? (
                  <>
                    <div className="p-4 border-b border-red-600/20 bg-slate-950 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20">
                          <User className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <p className="font-black text-white">{selectedChat.userName}</p>
                          <p className="text-[10px] text-slate-500">{selectedChat.userEmail}</p>
                        </div>
                      </div>
                    </div>

                    <div 
                      ref={scrollRef}
                      className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/20"
                    >
                      {chatMessages.map(msg => (
                        <div 
                          key={msg.id}
                          className={`flex ${msg.senderId === user.id ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[70%] p-3 rounded-2xl text-sm font-medium ${
                            msg.senderId === user.id 
                              ? "bg-red-600 text-white rounded-br-none shadow-lg" 
                              : "bg-slate-800 text-slate-200 rounded-bl-none border border-red-600/10"
                          }`}>
                            <p className="text-[10px] opacity-50 mb-1">{msg.senderName}</p>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendAdminMessage} className="p-4 bg-slate-950 border-t border-red-600/20 flex gap-4">
                      <Input 
                        value={adminMessage}
                        onChange={e => setAdminMessage(e.target.value)}
                        placeholder="Responda ao cliente..."
                        className="bg-slate-900 border-red-600/30 text-white"
                      />
                      <Button type="submit" className="bg-red-600 hover:bg-red-700 px-6 font-bold">
                        <Send className="w-4 h-4 mr-2" />
                        Enviar
                      </Button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-600 opacity-30">
                    <MessageCircle className="w-24 h-24 mb-4" />
                    <p className="text-xl font-black italic uppercase tracking-widest">Selecione uma conversa</p>
                  </div>
                )}
              </Card>
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
                              onClick={() => handleDeliverPrize(red.id, red.prizeName)}
                              className="flex-1 bg-red-600 hover:bg-red-700 font-bold h-9 text-xs rounded-lg"
                            >
                              Entregar Prêmio
                            </Button>
                            <Button 
                              onClick={() => handleRefusePrize(red.id, red.prizeName, red.userId, red.cost)}
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

          <TabsContent value="catalogo">
            <Card className="bg-slate-900 border-red-600/10 p-8 card-neon">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                🎮 Popular Catálogo de Jogos
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                Clique no botão abaixo para inserir/atualizar todos os {GAMES_CATALOG.length} jogos PS4/PS5 no Firestore. Operação segura — não duplica jogos já existentes.
              </p>
              <Button
                onClick={handleSeedGames}
                disabled={seeding}
                className="bg-red-600 hover:bg-red-700 font-bold btn-neon px-8 py-4 text-lg mb-6"
              >
                {seeding ? `⏳ Inserindo jogos... aguarde` : `🚀 Popular ${GAMES_CATALOG.length} Jogos no Catálogo`}
              </Button>
              {seedLog.length > 0 && (
                <div className="bg-slate-950 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs border border-slate-700">
                  {seedLog.map((line, i) => (
                    <p key={i} className={line.startsWith("[+]") ? "text-green-400" : line.startsWith("[~]") ? "text-yellow-400" : line.startsWith("[!]") ? "text-red-400" : "text-white font-bold mt-2"}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </Card>
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
    </div>
  );
}
