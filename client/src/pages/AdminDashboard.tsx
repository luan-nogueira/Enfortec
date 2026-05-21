import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "@/lib/firebase";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, query, orderBy, serverTimestamp, addDoc, getDoc } from "firebase/firestore";
import { useLocation } from "wouter";
import { Shield, User, UserCheck, UserPlus, ArrowLeft, Plus, X, Lock, Mail, Trash2, MessageCircle, Send, Coins, Gift, Check, Clock } from "lucide-react";
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
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
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

  const GAMES_CATALOG = [
    { name: "AGONY PS4/PS5", price: 9.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/cdn/UP3643/CUSA11335_00/6AJJ5GqsM3Gl9kAGCMuIhvJAn5bIj4DM.png" },
    { name: "ASSASSIN'S CREED MIRAGE PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/c4af4f0c80d06c8a30e4f8484a1bc6b9d195db5e.png" },
    { name: "ASSASSIN'S CREED ODYSSEY PS4/PS5", price: 44.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/jB5hPkv7TGtCbpqHIgv8DwO0.png" },
    { name: "ASSASSIN'S CREED ORIGINS PS4/PS5", price: 37.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/eMPFvSiX4bsQ0SU4ufwBTkxv.png" },
    { name: "ASSASSIN'S CREED SHADOWS PS5", price: 144.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202310/1321/4d8eb09de80d1cce0b4fcb65540c3f880e9d8edf9143acb.png" },
    { name: "ASSASSIN'S CREED SYNDICATE PS4/PS5", price: 59.99, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/3GNYFXnqhieyNGEfMCnSVMoM.png" },
    { name: "ASSASSIN'S CREED VALHALLA PS4/PS5", price: 50.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0303/jt3X0TKH5d04yV5qjlDiN3Ei.png" },
    { name: "ATOMIC HEART PS4/PS5", price: 69.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202210/2000/nNbQLSrkJYAVVuoJH0bKF8Bn.png" },
    { name: "AVATAR PS4/PS5", price: 74.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202308/2319/7e3e0d0e77f50d0da7ba1ce47a0ed3d5d04e96c18b6e4d91.png" },
    { name: "BATTLEFIELD 1 PS4/PS5", price: 34.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/2bwK9eDr6lEiNmFMcFZVBXuZ.png" },
    { name: "BATTLEFIELD 4 PS4/PS5", price: 29.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/ZicIPnBDrZ8gZRi7Ll8KhKd3.png" },
    { name: "BATTLEFIELD V PS4/PS5", price: 36.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/6vNHU9WZYiHRXUUxk5b3k1y1.png" },
    { name: "BLEACH REBIRTH OF SOULS PS5", price: 100.00, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202309/2217/9ae0ac7e5de69c11a5e34ec9b7e9fec1c1be9f0e4527c62e.png" },
    { name: "CALL OF DUTY GHOSTS PS4/PS5", price: 99.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/cdn/UP0002/CUSA00006_00/ztPoAnxVLFNsG1FkpTsEt5pE2BOqfhvG.png" },
    { name: "CALL OF DUTY VANGUARD PS4/PS5", price: 89.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202109/1323/MFJTOl5M2FHIH0WOIjHYmBLM.png" },
    { name: "CALL OF DUTY WW2 PS4/PS5", price: 100.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/n6e28gU0TGU3XVpSUDWKSRrh.png" },
    { name: "COD BLACK OPS 6 PS4/PS5", price: 80.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202406/1000/df0c7e85d13b12a04bad43bba3148de793a527afe099df2b.png" },
    { name: "COD COLD WAR PS4/PS5", price: 80.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202011/2917/cOmJDMWNBOCeZ9Coa3wHOkJp.png" },
    { name: "CRASH BANDICOOT TRILOGY PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/ByXVNqnkDQ0e6d0t3tXPhJXT.png" },
    { name: "CRASH NITRO KART PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/2718/VVjPR1q0B3w2qBBjOAT5ZIrc.png" },
    { name: "DEAD ISLAND 2 PS4/PS5", price: 50.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202212/0821/t7YKXWOXnFH8LlOzCQnnGBxE.png" },
    { name: "DEAD SPACE PS5", price: 69.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202210/2717/k2JicPEHfB2qHONk0EGXBnW4.png" },
    { name: "DEMON SLAYER 2 PS4/PS5", price: 144.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202208/1917/aTLa2FNTqnTHqTxFl6VJV6Dz.png" },
    { name: "DETROIT BECOME HUMAN PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/cXhQ63KtDd7Dyl7p0MHmrIb1.png" },
    { name: "DEVIL MAY CRY 5 PS5", price: 30.00, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202010/2614/AEvvFrHGCv8tVeUFsQO4nCBa.png" },
    { name: "DEVIL MAY CRY 5 + VERGIL PS4/PS5", price: 16.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202010/2614/AEvvFrHGCv8tVeUFsQO4nCBa.png" },
    { name: "DEVIL MAY CRY DEFINITIVE EDITION PS4", price: 36.90, platform: "PS4", imageUrl: "https://image.api.playstation.com/cdn/UP0102/CUSA01013_00/xEdzSHaOsWj9f9aPwVWXMvmUlR5VCQIN.png" },
    { name: "DIABLO 4 PS4/PS5", price: 100.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202208/2321/UMxITxYiMY27p9HxfH3XGWVx.png" },
    { name: "DIABLO ETERNAL COLLECTION PS4/PS5", price: 64.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/LxCUBfJxoZNJH7Qu0aECzTMB.png" },
    { name: "DOOM ETERNAL PS4/PS5", price: 64.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/xEkMtqvPhYxYL4bFi3WsUWm0.png" },
    { name: "DRAGON BALL KAKAROT PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/Fp1mFEKOvuMZ9XKhpnJVjJVW.png" },
    { name: "DRAGON BALL SPARKING ZERO PS5", price: 174.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202312/0611/5e3c1e04e5a5d1f123e30aab3a5d5cc0b35f4d5a.png" },
    { name: "DYING LIGHT PS4/PS5", price: 20.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/EGNJuylmGcMJmJjQfuFhd7Rx.png" },
    { name: "DYING LIGHT 2 PS4/PS5", price: 54.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202111/2917/LXXQjFfTjW2GmGHtLf4P5cXG.png" },
    { name: "FAR CRY 5 PS4/PS5", price: 30.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/7FMuzrNBl4TQYNWsHbwzAKVW.png" },
    { name: "FAR CRY 6 PS4/PS5", price: 54.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202108/1016/W2rJNLzRj0c6B8i3vj3h82CX.png" },
    { name: "FAR CRY NEW DAWN PS4/PS5", price: 24.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/Qd2xezK0r25iR2L7b5gVvqS0.png" },
    { name: "FINAL FANTASY XVI PS5", price: 119.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202212/1319/3FMiHKAXj0Mx6gjEY16a0X6E.png" },
    { name: "GHOST RECON WILDLANDS PS4/PS5", price: 34.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/5cPbSFBVjS3R8N7RL4v9bCvP.png" },
    { name: "GOD OF WAR 2018 PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0224/CEJPGKFrHQS2bWM73GBTFoB7.png" },
    { name: "GOD OF WAR 3 REMASTER PS4/PS5", price: 36.99, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/cdn/UP9000/CUSA01399_00/rLAIvMd8sGVkjrFR7VTNQ6mqdl3h91YH.png" },
    { name: "GTA V PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/VVzwK1oEzd5wZJxjsGQrFhMC.png" },
    { name: "HI-FI RUSH PS5", price: 59.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202303/1521/dGjkNy1lBz0DLHD63mPR2fRy.png" },
    { name: "HOGWARTS LEGACY PS4/PS5", price: 39.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202301/1609/jtkIOrGEv3EXmWYRJJWBRQaQ.png" },
    { name: "HORIZON FORBIDDEN WEST PS4/PS5", price: 100.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202107/2321/LNEKHhKrxFzHiFXwU6pLGPE2.png" },
    { name: "JEDI FALLEN ORDER PS4/PS5", price: 44.99, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/Qv9UfHBHV5gJTkzHaMhJjkdU.png" },
    { name: "JUST CAUSE 4 PS4/PS5", price: 19.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/KS5UJSiJMJaUmBwZDCq2TH5X.png" },
    { name: "MAFIA 3 PS4/PS5", price: 24.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/sHoX0s2gkMJlpFH5PUr8JWDY.png" },
    { name: "MARTHA IS DEAD PS4/PS5", price: 40.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202110/2920/YBRYFmq5UxkEqrz0nJPEJOTn.png" },
    { name: "MORTAL KOMBAT 1 PS5", price: 69.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202306/0812/9d0f3e4b2a1c5e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3.png" },
    { name: "MORTAL KOMBAT 11 PS4/PS5", price: 20.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/fMHYU1XYCZ3UXkpgBRuLmNPp.png" },
    { name: "NARUTO STORM 4 PS4/PS5", price: 59.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/z65dEO1vCfX4DynMNOsXGQrD.png" },
    { name: "PREY PS4/PS5", price: 27.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/Gzw7Rm2fREPJ4P4hqTd9oHkl.png" },
    { name: "PRINCE OF PERSIA LOST CROWN PS4/PS5", price: 44.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202309/0611/e2d4f3c5a7b8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.png" },
    { name: "RED DEAD REDEMPTION 2 PS4/PS5", price: 64.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/WSBm2mWYOA4r4bJwKPKqbFjR.png" },
    { name: "SHADOW OF THE COLOSSUS PS4/PS5", price: 44.99, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0302/N8f4iL5kQkH5cO64m0QxR8uL.png" },
    { name: "SHADOW OF MORDOR PS4/PS5", price: 17.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/cdn/UP1004/CUSA00207_00/aKLbcMJmHI7JC2IHxTqSV9dlzVJQVhKf.png" },
    { name: "SNIPER ELITE 4 PS4/PS5", price: 27.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/sZ6VmSpqNL7bIaAT3E17K7A3.png" },
    { name: "STAR WARS OUTLAWS PS5", price: 69.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4.png" },
    { name: "THE CREW MOTORFEST PS4/PS5", price: 55.00, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202307/1921/f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2.png" },
    { name: "THE ELDER SCROLLS V SKYRIM PS4/PS5", price: 36.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202111/1719/TYKPMn7ISGalqMqv6Y3RNGpz.png" },
    { name: "THE LAST OF US PART I PS5", price: 120.00, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202206/0321/NVU5FJ7GJvTBELPMeagHEZUt.png" },
    { name: "THE LAST OF US PART II PS4", price: 100.00, platform: "PS4", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/iyXT9t0uyxgLjmEqMZFq1TI9.png" },
    { name: "THE LAST OF US REMASTERED PS4/PS5", price: 35.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/cdn/UP9000/CUSA00552_00/pHepWgBDXBGLjIhYQHr6KMOM6cqHRXQd.png" },
    { name: "THE ORDER 1886 PS4/PS5", price: 36.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/cdn/UP9000/CUSA00422_00/V7tVhHY5zIz5pQdtNBNTdYbGkv5XWPAN.png" },
    { name: "TOM CLANCY GHOST RECON BREAKPOINT PS4/PS5", price: 39.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/QolEBjHaxZ3sPQxcvnHJIVFM.png" },
    { name: "TONY HAWK'S PRO SKATER 1+2 PS4/PS5", price: 64.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/dImGXjmTHSNImPMvOT2xVGFl.png" },
    { name: "UNCHARTED 4 + LOST LEGACY PS4", price: 69.90, platform: "PS4", imageUrl: "https://image.api.playstation.com/cdn/UP9000/CUSA04530_00/hqPoEq7PBmKfz99fKbkiGP5YPYIX5X17.png" },
    { name: "UNCHARTED LEGACY OF THIEVES PS5", price: 89.90, platform: "PS5", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202111/2917/T2ZXAZFCB6dBOBIEHMbXFhEq.png" },
    { name: "WATCH DOGS LEGION PS4/PS5", price: 29.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202011/0221/NlV5MVamTuO8VZxBr65smWDy.png" },
    { name: "WOLFENSTEIN THE NEW ORDER PS4/PS5", price: 16.90, platform: "PS4/PS5", imageUrl: "https://image.api.playstation.com/cdn/UP1001/CUSA00326_00/lMcIiAnXZT1UGRfI0cJoFDsYDCEoE8Z6.png" },
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
          <Button onClick={() => setShowCreateModal(true)} className="bg-red-600 hover:bg-red-700 font-bold btn-neon flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Criar Novo Acesso
          </Button>
        </div>
      </div>

      <main className="container mx-auto py-12 px-4">
        <Tabs defaultValue="usuarios" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900 border border-red-600/20 mb-8">
            <TabsTrigger value="usuarios" className="data-[state=active]:bg-red-600 font-bold">Gerenciar Acessos</TabsTrigger>
            <TabsTrigger value="atendimento" className="data-[state=active]:bg-red-600 font-bold flex items-center gap-2">
              Central de Atendimento
              {chats.some(c => c.unreadByAdmin) && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="referrals" className="data-[state=active]:bg-red-600 font-bold flex items-center gap-2">
              Indicações & Prêmios
              {(allRedemptions.some(r => r.status === "pendente") || allReferrals.some(r => r.status === "pendente")) && (
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="catalogo" className="data-[state=active]:bg-red-600 font-bold flex items-center gap-2">
              🎮 Catálogo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios">
            <h2 className="text-xl font-bold text-white mb-8 border-l-4 border-red-600 pl-4 uppercase tracking-widest text-sm italic">Gestão de Equipe</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((u) => (
                <Card key={u.id} className="bg-slate-900 border-red-600/10 p-6 hover:border-red-600/30 transition-all card-neon">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-red-600/20">
                        <User className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{u.name || "Sem Nome"}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${u.role === 'admin' ? 'bg-red-600 text-white' : u.role === 'collaborator' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      {u.role}
                    </div>
                    {u.email !== 'luanmnogueira@gmail.com' && (
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id, u.email)} className="text-slate-600 hover:text-red-500 -mt-2 -mr-2">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
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
                            ) : (
                              <span className="inline-block text-[10px] bg-green-500/10 text-green-500 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-green-500/20">
                                Entregue
                              </span>
                            )}
                          </div>
                        </div>

                        {red.status === "pendente" ? (
                          <Button 
                            onClick={() => handleDeliverPrize(red.id, red.prizeName)}
                            className="w-full bg-red-600 hover:bg-red-700 font-bold h-9 text-xs rounded-lg"
                          >
                            Entregar Prêmio (Enviar Código)
                          </Button>
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
