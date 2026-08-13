import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Upload, Image as ImageIcon, X, Loader2 } from "lucide-react";

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
    platform: "PS4/PS5",
    keyOrCode: "",
    downloadUrl: "",
    imageUrl: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const createProductMutation = trpc.digitalProducts.create.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB");
      return;
    }

    setUploadingImage(true);
    try {
      const imageRef = ref(storage, `digital_products/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(imageRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      setFormData(prev => ({ ...prev, imageUrl: downloadUrl }));
      toast.success("Foto da capa enviada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao fazer upload da imagem:", error);
      toast.error("Erro ao enviar imagem: " + (error?.message || "Erro desconhecido"));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const isLicenseType = formData.type === "jogo" || formData.type === "assinatura";

    if (isLicenseType) {
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
    } else if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Insira o preço do produto");
      return;
    }

    setIsLoading(true);
    try {
      await createProductMutation.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: isLicenseType
          ? (formData.hasPrimary ? parseFloat(formData.price) : parseFloat(formData.priceSecondary))
          : parseFloat(formData.price),
        pricePrimary: isLicenseType && formData.hasPrimary ? parseFloat(formData.price) : undefined,
        priceSecondary: isLicenseType && formData.hasSecondary ? parseFloat(formData.priceSecondary) : undefined,
        type: formData.type,
        platform: formData.type === "jogo" ? formData.platform : undefined,
        keyOrCode: formData.keyOrCode.trim() || undefined,
        downloadUrl: formData.downloadUrl.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined,
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
    <div className="min-h-screen bg-slate-950 text-white py-6 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-5 sm:mb-8">
            <h1 className="text-xl sm:text-3xl font-black text-white mb-2 uppercase">VENDER MINHA CONTA EFORTEGAMES 🎮</h1>
            <p className="text-slate-400 text-sm sm:text-base">Cadastre suas contas Primárias ou Secundárias de jogos digitais e assinaturas</p>
          </div>

          {/* Form Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl p-4 sm:p-8">
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

              {/* Platform Selector (if type is game) */}
              {formData.type === "jogo" && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Plataforma do Jogo *
                  </label>
                  <select
                    name="platform"
                    value={formData.platform}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                    disabled={isLoading}
                  >
                    <option value="PS5">PlayStation 5 (Exclusivo PS5)</option>
                    <option value="PS4">PlayStation 4 (Exclusivo PS4)</option>
                    <option value="PS4/PS5">Dual Entitlement (PS4 & PS5)</option>
                  </select>
                </div>
              )}

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

              {/* Product Cover Photo */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Foto do Produto / Capa do Jogo
                </label>

                {formData.imageUrl ? (
                  <div className="relative w-full max-w-xs aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group">
                    <img 
                      src={formData.imageUrl} 
                      alt="Capa do produto" 
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: "" }))}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors shadow-lg"
                      title="Remover imagem"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <label className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 hover:border-red-600/50 rounded-2xl bg-slate-950/60 hover:bg-slate-950 transition-all cursor-pointer group">
                      {uploadingImage ? (
                        <div className="flex flex-col items-center text-slate-400">
                          <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-2" />
                          <span className="text-xs font-medium">Fazendo upload da imagem...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-slate-400 group-hover:text-slate-200 transition-colors">
                          <Upload className="w-8 h-8 mb-2 text-red-500" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                            Clique para Selecionar Imagem
                          </span>
                          <span className="text-[11px] text-slate-500">
                            PNG, JPG ou WEBP (máx. 10MB)
                          </span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploadingImage || isLoading}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Optional Image URL Input */}
                <div className="pt-1">
                  <Input
                    type="url"
                    name="imageUrl"
                    placeholder="Ou cole o link direto da imagem (https://...)"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    disabled={uploadingImage || isLoading}
                    className="bg-slate-950 border-slate-800 text-white rounded-xl text-xs"
                  />
                </div>
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

              {/* Preço único (Gift Card, Licença, Outro) */}
              {formData.type !== "jogo" && formData.type !== "assinatura" && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
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
                    className="bg-slate-950 border-slate-800 text-white rounded-xl"
                    required
                  />
                </div>
              )}

              {/* Login/Senha ou Código (for account-based games) */}
              {(formData.type as string) === "jogo" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Dados de Acesso da Conta (Login e Senha)
                  </label>
                  <Input
                    type="text"
                    name="keyOrCode"
                    placeholder="Ex: login@email.com / senha123"
                    value={formData.keyOrCode}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    Login e senha (ou código de ativação) que serão enviados ao comprador após o pagamento
                  </p>
                </div>
              )}

              {/* Download URL (opcional, para jogos entregues por link direto) */}
              {(formData.type as string) === "jogo" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    URL de Download (opcional)
                  </label>
                  <Input
                    type="url"
                    name="downloadUrl"
                    placeholder="https://exemplo.com/download"
                    value={formData.downloadUrl}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    Preencha só se o jogo também for entregue por link de download, além do login da conta
                  </p>
                </div>
              )}

              {/* Key/Code (for gift cards and licenses) */}
              {((formData.type as string) === "gift_card" || (formData.type as string) === "licenca") && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
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
