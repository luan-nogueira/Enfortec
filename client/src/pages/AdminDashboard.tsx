import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "@/lib/firebase";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { useLocation } from "wouter";
import { Shield, User, UserCheck, UserPlus, ArrowLeft, Plus, X, Lock, Mail, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
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

export default function AdminDashboard() {
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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
        <h2 className="text-xl font-bold text-white mb-8 border-l-4 border-red-600 pl-4">Gerenciar Colaboradores</h2>
        
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
