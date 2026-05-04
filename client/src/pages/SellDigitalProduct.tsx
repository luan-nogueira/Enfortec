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
    type: "jogo" as "jogo" | "gift_card" | "licenca" | "outro",
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

    if (!formData.name.trim() || !formData.description.trim() || !formData.price) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (parseFloat(formData.price) <= 0) {
      toast.error("O preço deve ser maior que zero");
      return;
    }

    if (formData.type === "jogo" && !formData.downloadUrl.trim()) {
      toast.error("URL de download é obrigatória para jogos");
      return;
    }

    if ((formData.type === "gift_card" || formData.type === "licenca") && !formData.keyOrCode.trim()) {
      toast.error("Código/Chave é obrigatória para este tipo de produto");
      return;
    }

    setIsLoading(true);
    try {
      await createProductMutation.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        type: formData.type,
        keyOrCode: formData.keyOrCode.trim() || undefined,
        downloadUrl: formData.downloadUrl.trim() || undefined,
      });
      toast.success("Produto digital adicionado com sucesso!");
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Acesso Negado</h1>
          <p className="text-slate-600 mb-6">Você precisa estar logado para vender produtos digitais.</p>
          <Button onClick={() => navigate("/")}>Voltar para Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Vender Produto Digital</h1>
            <p className="text-slate-600">Compartilhe seus jogos, gift cards ou licenças e ganhe dinheiro</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Tipo de Produto *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isLoading}
                >
                  <option value="jogo">Jogo Digital</option>
                  <option value="gift_card">Gift Card</option>
                  <option value="licenca">Licença de Software</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Nome do Produto *
                </label>
                <Input
                  type="text"
                  name="name"
                  placeholder={
                    formData.type === "jogo" ? "Ex: The Legend of Zelda" :
                    formData.type === "gift_card" ? "Ex: Gift Card Steam R$100" :
                    "Ex: Microsoft Office 2024"
                  }
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Descrição *
                </label>
                <textarea
                  name="description"
                  placeholder="Descreva seu produto digital em detalhes..."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Preço (R$) *
                </label>
                <Input
                  type="number"
                  name="price"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>

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
                  A plataforma cobra uma comissão de 15% sobre o valor final da venda.
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
