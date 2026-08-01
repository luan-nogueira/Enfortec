import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function SellDigitalProduct() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    priceSecondary: "",
    hasPrimary: true,
    hasSecondary: true,
    type: "jogo" as "jogo" | "gift_card" | "licenca" | "assinatura" | "outro",
    keyOrCode: "",
    downloadUrl: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const createProductMutation = trpc.digitalProducts.create.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (formData.hasPrimary && (!formData.price || parseFloat(formData.price) <= 0)) {
      toast.error("Insira o valor da Conta Primária");
      return;
    }

    if (formData.hasSecondary && (!formData.priceSecondary || parseFloat(formData.priceSecondary) <= 0)) {
      toast.error("Insira o valor da Conta Secundária");
      return;
    }

    if (!formData.hasPrimary && !formData.hasSecondary) {
      toast.error("Selecione pelo menos um tipo de conta (Primária ou Secundária)");
      return;
    }

    setIsLoading(true);
    try {
      await createProductMutation.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.hasPrimary ? parseFloat(formData.price) : parseFloat(formData.priceSecondary),
        pricePrimary: formData.hasPrimary ? parseFloat(formData.price) : undefined,
        priceSecondary: formData.hasSecondary ? parseFloat(formData.priceSecondary) : undefined,
        type: formData.type,
        keyOrCode: formData.keyOrCode.trim() || undefined,
        downloadUrl: formData.downloadUrl.trim() || undefined,
      });
      toast.success("Anúncio publicado com sucesso!");
      navigate("/digital");
    } catch (error) {
      toast.error("Erro ao adicionar produto. Tente novamente.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl">
          <h1 className="text-2xl font-bold text-white mb-4">Acesso Negado</h1>
          <p className="text-slate-400 mb-6">Você precisa estar logado para cadastrar ou vender.</p>
          <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => navigate("/")}>Voltar para Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2 uppercase">VENDER MINHA CONTA EFORTEGAMES 🎮</h1>
            <p className="text-slate-400">Cadastre suas contas Primárias ou Secundárias de jogos digitais e assinaturas</p>
          </div>

          {/* Form Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Type */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Tipo de Produto Digital *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                  disabled={isLoading}
                >
                  <option value="jogo">Jogo Digital (PS4 / PS5)</option>
                  <option value="assinatura">Assinatura (PS Plus, Game Pass, etc.)</option>
                  <option value="gift_card">Gift Card</option>
                  <option value="licenca">Licença de Software</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Nome do Jogo / Item *
                </label>
                <Input
                  type="text"
                  name="name"
                  placeholder={
                    formData.type === "jogo" ? "Ex: EA Sports FC 26" :
                    formData.type === "assinatura" ? "Ex: PS Plus Essential 12 Meses" :
                    formData.type === "gift_card" ? "Ex: Gift Card Steam R$100" :
                    "Ex: Microsoft Office 2024"
                  }
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="bg-slate-950 border-slate-800 text-white rounded-xl"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Descrição Detalhada *
                </label>
                <textarea
                  name="description"
                  placeholder="Descreva seu jogo ou produto digital em detalhes..."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Toggles for Primary & Secondary accounts */}
              {(formData.type === "jogo" || formData.type === "assinatura") && (
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wider block">
                    Opções de Licença Disponíveis (Marque 1 ou ambas)
                  </span>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasPrimary}
                        onChange={(e) => setFormData(prev => ({ ...prev, hasPrimary: e.target.checked }))}
                        className="w-4 h-4 accent-red-600 rounded"
                      />
                      <span className="text-sm font-bold text-white">Disponibilizar Conta Primária</span>
                    </label>
                    {formData.hasPrimary && (
                      <div className="pl-7">
                        <Input
                          type="number"
                          name="price"
                          placeholder="Valor Conta Primária (R$)"
                          step="0.01"
                          min="0"
                          value={formData.price}
                          onChange={handleInputChange}
                          disabled={isLoading}
                          className="bg-slate-900 border-slate-800 text-white rounded-xl text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-900">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasSecondary}
                        onChange={(e) => setFormData(prev => ({ ...prev, hasSecondary: e.target.checked }))}
                        className="w-4 h-4 accent-red-600 rounded"
                      />
                      <span className="text-sm font-bold text-white">Disponibilizar Conta Secundária</span>
                    </label>
                    {formData.hasSecondary && (
                      <div className="pl-7">
                        <Input
                          type="number"
                          name="priceSecondary"
                          placeholder="Valor Conta Secundária (R$)"
                          step="0.01"
                          min="0"
                          value={formData.priceSecondary}
                          onChange={handleInputChange}
                          disabled={isLoading}
                          className="bg-slate-900 border-slate-800 text-white rounded-xl text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Download URL (for games) */}
              {(formData.type as string) === "jogo" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    URL de Download *
                  </label>
                  <Input
                    type="url"
                    name="downloadUrl"
                    placeholder="https://exemplo.com/download"
                    value={formData.downloadUrl}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    Link para download do jogo (será enviado ao comprador após pagamento)
                  </p>
                </div>
              )}

              {/* Key/Code (for gift cards and licenses) */}
              {((formData.type as string) === "gift_card" || (formData.type as string) === "licenca") && (
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Código/Chave *
                  </label>
                  <Input
                    type="text"
                    name="keyOrCode"
                    placeholder={
                      formData.type === "gift_card" ? "Código do gift card" : "Chave de licença"
                    }
                    value={formData.keyOrCode}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    Será enviado ao comprador após confirmação do pagamento
                  </p>
                </div>
              )}

              {/* Commission Info */}
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                <p className="text-sm font-semibold text-purple-900 mb-2">Comissão da Plataforma</p>
                <p className="text-sm text-purple-800">
                  A plataforma cobra uma comissão de 35% sobre o valor final da venda.
                </p>
              </div>

              {/* Security Info */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-2">🔒 Segurança</p>
                <p className="text-sm text-blue-800">
                  Seus códigos e chaves são armazenados com segurança e enviados automaticamente após o pagamento ser confirmado.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/digital")}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Adicionando..." : "Publicar Produto"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
