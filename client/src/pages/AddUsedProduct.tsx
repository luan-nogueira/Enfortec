import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";

const BRAZIL_STATES = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" }
];

export default function AddUsedProduct() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    condition: "como_novo" as const,
    images: [] as string[],
    estado: "",
    cidade: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const { data: seller } = trpc.sellers.getByUserId.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createProductMutation = trpc.usedProducts.create.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim() || !formData.price || !formData.estado || !formData.cidade.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (parseFloat(formData.price) <= 0) {
      toast.error("O preço deve ser maior que zero");
      return;
    }

    setIsLoading(true);
    try {
      await createProductMutation.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        condition: formData.condition,
        images: formData.images,
        estado: formData.estado,
        cidade: formData.cidade.trim(),
      });
      toast.success("Produto adicionado com sucesso!");
      navigate("/vendedor");
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
          <p className="text-slate-600 mb-6">Você precisa estar logado para adicionar produtos.</p>
          <Button onClick={() => navigate("/")}>Voltar para Home</Button>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Torne-se um Vendedor</h1>
          <p className="text-slate-600 mb-6">Você precisa criar uma loja antes de adicionar produtos.</p>
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => navigate("/vendedor/cadastro")}>
            Criar Loja
          </Button>
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Anunciar Produto Usado</h1>
            <p className="text-slate-600">Preencha os detalhes do seu produto para começar a vender</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Nome do Produto *
                </label>
                <Input
                  type="text"
                  name="name"
                  placeholder="Ex: iPhone 12 Pro"
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
                  placeholder="Descreva o estado do produto, características, defeitos, etc..."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                {/* Condition */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Condição do Produto *
                  </label>
                  <select
                    name="condition"
                    value={formData.condition}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={isLoading}
                  >
                    <option value="novo">Novo</option>
                    <option value="como_novo">Como Novo</option>
                    <option value="bom">Bom</option>
                    <option value="aceitavel">Aceitável</option>
                  </select>
                </div>
              </div>

              {/* Region Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Estado (UF) *
                  </label>
                  <select
                    name="estado"
                    value={formData.estado}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900 bg-white"
                    disabled={isLoading}
                    required
                  >
                    <option value="">Selecione o Estado...</option>
                    {BRAZIL_STATES.map(st => (
                      <option key={st.uf} value={st.uf}>{st.name} ({st.uf})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Cidade *
                  </label>
                  <Input
                    type="text"
                    name="cidade"
                    placeholder="Ex: Londrina"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Images Upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Fotos do Produto
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-green-500 transition">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 mb-2">Arraste fotos aqui ou clique para selecionar</p>
                  <p className="text-xs text-slate-500">PNG, JPG até 5MB cada</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Commission Info */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-2">Comissão da Plataforma</p>
                <p className="text-sm text-blue-800">
                  A plataforma cobra uma comissão de 10% sobre o valor final da venda.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/vendedor")}
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
                  {isLoading ? "Adicionando..." : "Anunciar Produto"}
                </Button>
              </div>
            </form>
          </div>

          {/* Tips */}
          <div className="mt-8 bg-green-50 border border-green-200 p-6 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3">💡 Dicas para Vender Rápido</h3>
            <ul className="space-y-2 text-sm text-green-800">
              <li>✓ Use um título claro e descritivo</li>
              <li>✓ Descreva detalhadamente o estado do produto</li>
              <li>✓ Adicione fotos de boa qualidade de todos os ângulos</li>
              <li>✓ Defina um preço competitivo</li>
              <li>✓ Responda rapidamente às mensagens dos compradores</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
