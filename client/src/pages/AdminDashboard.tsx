import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useLocation } from "wouter";
import { Shield, User, UserCheck, UserPlus, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Logado como</p>
            <p className="text-sm font-bold text-white">{user?.email}</p>
          </div>
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
    </div>
  );
}
