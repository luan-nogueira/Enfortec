import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

function isValidCPF(cpf: string) {
  const cleanCPF = cpf.replace(/\D/g, "");
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
}

export default function CPFCompletionModal() {
  const { isAuthenticated, user, loading } = useAuth();
  const [cpf, setCpf] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateProfileMutation = trpc.auth.updateProfile.useMutation();

  useEffect(() => {
    // Show modal if user is logged in, loaded, but has no CPF registered
    if (!loading && isAuthenticated && user && !user.cpf) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isAuthenticated, user, loading]);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.substring(0, 11);
    if (value.length > 9) {
      value = `${value.substring(0, 3)}.${value.substring(3, 6)}.${value.substring(6, 9)}-${value.substring(9)}`;
    } else if (value.length > 6) {
      value = `${value.substring(0, 3)}.${value.substring(3, 6)}.${value.substring(6)}`;
    } else if (value.length > 3) {
      value = `${value.substring(0, 3)}.${value.substring(3)}`;
    }
    setCpf(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidCPF(cpf)) {
      setError("CPF inválido. Por favor, digite um CPF real.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Save to PostgreSQL via tRPC
      await updateProfileMutation.mutateAsync({ cpf });

      // 2. Save to Firestore
      if (user?.id) {
        const userRef = doc(db, "users", user.id);
        await setDoc(userRef, { cpf: cpf.replace(/\D/g, "") }, { merge: true });
      }

      toast.success("Cadastro concluído com sucesso!");
      setIsOpen(false);
    } catch (err: any) {
      console.error("[CPF Sync Error]", err);
      setError(err.message || "Erro ao salvar CPF. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-red-600/40 rounded-2xl max-w-md w-full p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-950 border border-red-600/50 rounded-full flex items-center justify-center mb-4 text-red-500 animate-bounce">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Conclua seu Cadastro</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Para garantir a segurança de todas as transações da comunidade, é obrigatório informar o seu CPF.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs p-3 rounded-lg w-full mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full text-left space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modal-cpf" className="text-slate-300">CPF</Label>
              <Input
                id="modal-cpf"
                type="text"
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                className="bg-slate-950 border-slate-800 text-white focus-visible:ring-red-500 text-lg py-6"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-6 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
            >
              {isSubmitting ? "Salvando..." : "Confirmar e Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
