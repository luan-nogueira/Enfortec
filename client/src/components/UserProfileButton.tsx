import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { toast } from "sonner";
import { User, Mail, Lock, KeyRound, LogOut, Loader2, ShieldCheck, Coins, Package, Star, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export default function UserProfileButton() {
  const { user, isAuthenticated, logout, isAdmin, isCollaborator } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [, navigate] = useLocation();

  const { data: orders } = trpc.orders.getByBuyerId.useQuery(undefined, {
    enabled: isAuthenticated && !!user,
    refetchInterval: 30000,
  });

  const pendingDeliveredCount = (orders || []).filter((o: any) => o.status === "enviado").length;

  if (!isAuthenticated || !user) return null;

  const handlePasswordReset = async () => {
    if (user.loginMethod === "google.com") {
      toast.info("Sua conta está vinculada ao Google. A alteração de senha deve ser feita através do Google.");
      return;
    }

    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success("E-mail de redefinição de senha enviado com sucesso!");
    } catch (error: any) {
      console.error("[Password Reset Error]", error);
      toast.error(error.message || "Erro ao enviar e-mail de redefinição.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Format CPF as 000.000.000-00 if it exists and is clean digits
  const formatCPF = (cpfValue: string | null) => {
    if (!cpfValue) return "Não cadastrado";
    const clean = cpfValue.replace(/\D/g, "");
    if (clean.length !== 11) return cpfValue; // return as is if not standard
    return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9)}`;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative flex items-center justify-center rounded-full border border-red-600/30 hover:border-red-500 hover:shadow-[0_0_12px_rgba(220,38,38,0.4)] transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-red-500/50"
        aria-label="Abrir Perfil"
      >
        <Avatar className="h-9 w-9 bg-slate-900 border-none">
          <AvatarFallback className="text-white bg-red-600 font-bold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {pendingDeliveredCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-950 animate-pulse"
            title="Você tem jogo entregue pronto para avaliação!"
          />
        )}
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-950 border border-red-600/30 text-white sm:max-w-md card-neon">
          <DialogHeader className="flex flex-col items-center border-b border-slate-800 pb-4">
            <Avatar className="h-16 w-16 bg-slate-900 border-2 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)] mb-3">
              <AvatarFallback className="text-white bg-red-600 font-black text-2xl">
                {user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <DialogTitle className="text-2xl font-black text-white tracking-tight">
              {user?.name || "Minha Conta"}
            </DialogTitle>
            <DialogDescription className="text-red-500 text-xs font-bold uppercase tracking-widest mt-1">
              Perfil do Usuário
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Aviso de Entrega Pronta */}
            {pendingDeliveredCount > 0 && (
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Entrega Concluída!
                  </span>
                  <span className="text-[9px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    {pendingDeliveredCount} jogo{pendingDeliveredCount > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  Seus dados de acesso já estão disponíveis. Teste seu jogo e avalie o atendimento para ganhar ForteCoins!
                </p>
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/minhas-compras");
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  Ver Acesso & Avaliar Atendimento
                </Button>
              </div>
            )}

            {/* Atalho para Minhas Compras */}
            <Button
              onClick={() => {
                setIsOpen(false);
                navigate("/minhas-compras");
              }}
              variant="outline"
              className="w-full border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-10 font-bold flex items-center justify-between px-3 text-xs"
            >
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4 text-red-500" />
                Minhas Compras
              </span>
              {pendingDeliveredCount > 0 ? (
                <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                  {pendingDeliveredCount} pronto{pendingDeliveredCount > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-slate-500 text-[10px]">Ver histórico</span>
              )}
            </Button>

            {/* E-mail Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  value={user.email || ""}
                  readOnly
                  disabled
                  className="pl-9 bg-slate-900/50 border-slate-800 text-slate-400 cursor-not-allowed select-all"
                />
              </div>
            </div>

            {/* CPF Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">CPF</label>
                <span className="text-[9px] text-slate-500 italic font-semibold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Não pode ser alterado
                </span>
              </div>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  value={formatCPF(user.cpf)}
                  readOnly
                  disabled
                  className="pl-9 bg-slate-900/50 border-slate-800 text-slate-400 cursor-not-allowed select-all"
                />
              </div>
            </div>

            {/* ForteCoins Balance Info */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Saldo ForteCoins</label>
              <div className="relative">
                <Coins className="absolute left-3 top-3 w-4 h-4 text-red-500" />
                <Input
                  value={`${user.forteCoins ?? 0} FC`}
                  readOnly
                  disabled
                  className="pl-9 bg-slate-900/50 border-slate-800 text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Admin Panel Access */}
            {(isAdmin || isCollaborator) && (
              <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3.5 space-y-2 mt-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Painel de Gestão
                  </span>
                  <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    {isAdmin ? "Admin" : "Colaborador"}
                  </span>
                </div>
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    window.open("/admin", "_blank");
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-10 text-xs flex items-center justify-center gap-2 btn-neon"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Acessar Painel de Controle
                </Button>
              </div>
            )}

            {/* Login Method Info */}
            {user.loginMethod === "google.com" ? (
              <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-xl text-xs text-blue-400 flex items-start gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Você está logado via <strong>Google</strong>. A segurança e senha da sua conta são gerenciadas pelo Google.
                </span>
              </div>
            ) : null}

            {/* Password Reset Section */}
            {user.loginMethod !== "google.com" && (
              <div className="pt-2">
                <Button
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword}
                  variant="outline"
                  className="w-full border-red-600/30 text-red-500 hover:bg-red-950/50 hover:border-red-500 h-11 font-bold flex items-center justify-center gap-2"
                >
                  {isResettingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  Alterar minha Senha
                </Button>
                <p className="text-[10px] text-slate-500 text-center mt-2 leading-relaxed">
                  Um e-mail de redefinição de senha será enviado para <strong>{user.email}</strong>.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800 h-11 font-semibold"
            >
              Fechar
            </Button>
            <Button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold h-11 btn-neon flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
