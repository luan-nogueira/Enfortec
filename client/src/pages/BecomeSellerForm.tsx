import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function BecomeSellerForm() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createSellerMutation = trpc.sellers.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeName.trim()) {
      toast.error("Nome da loja é obrigatório");
      return;
    }

    setIsLoading(true);
    try {
      await createSellerMutation.mutateAsync({
        storeName: storeName.trim(),
        description: description.trim(),
      });
      toast.success("Loja criada com sucesso!");
      navigate("/vendedor");
    } catch (error) {
      toast.error("Erro ao criar loja. Tente novamente.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Acesso Negado</h1>
          <p className="text-slate-600 mb-6">Você precisa estar logado para criar uma loja.</p>
          <Button onClick={() => navigate("/")}>Voltar para Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Torne-se um Vendedor</h1>
            <p className="text-lg text-slate-600">
              Crie sua loja e comece a ganhar dinheiro vendendo produtos usados e digitais.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Info */}
              <div className="bg-green-50 p-6 rounded-lg">
                <p className="text-sm text-slate-600 mb-2">Conta Logada</p>
                <p className="text-lg font-semibold text-slate-900">{user?.name}</p>
                <p className="text-sm text-slate-600">{user?.email}</p>
              </div>

              {/* Store Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Nome da Loja *
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Eletrônicos Premium"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="text-base"
                  disabled={isLoading}
                />
                <p className="text-xs text-slate-600 mt-1">
                  Este será o nome que seus clientes verão
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Descrição da Loja
                </label>
                <textarea
                  placeholder="Descreva sua loja, especialidades, etc..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  disabled={isLoading}
                />
                <p className="text-xs text-slate-600 mt-1">
                  Máximo 500 caracteres
                </p>
              </div>

              {/* Terms */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-700">
                  ✓ Você concorda com os <a href="#" className="text-green-600 hover:underline">Termos de Serviço</a> e <a href="#" className="text-green-600 hover:underline">Política de Privacidade</a>
                </p>
              </div>

              {/* Commission Info */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-2">Comissão da Plataforma</p>
                <p className="text-sm text-blue-800">
                  A plataforma cobra uma comissão de 10% sobre vendas de produtos usados e 15% sobre produtos digitais.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Criando..." : "Criar Loja"}
                </Button>
              </div>
            </form>
          </div>

          {/* Benefits */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold text-slate-900 mb-2">Painel Completo</h3>
              <p className="text-sm text-slate-600">
                Acompanhe suas vendas, ganhos e avaliações em tempo real.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="font-semibold text-slate-900 mb-2">Ganhe Dinheiro</h3>
              <p className="text-sm text-slate-600">
                Receba seus ganhos automaticamente via Mercado Pago.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl mb-3">🛡️</div>
              <h3 className="font-semibold text-slate-900 mb-2">Proteção Total</h3>
              <p className="text-sm text-slate-600">
                Plataforma segura com proteção do comprador e vendedor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
