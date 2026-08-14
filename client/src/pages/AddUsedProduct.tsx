import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Foto de celular costuma vir com 3-10MB de resolução total; redimensiona pro tamanho
 * que realmente aparece na tela (capa de mídia física) antes de enviar, pra não travar
 * o cadastro com o limite de tamanho nem inflar o carregamento da loja pros compradores.
 */
async function compressImage(file: File, maxDimension = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Falha ao comprimir imagem"))), "image/jpeg", quality);
  });
}

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
    category: "midia_fisica",
    condition: "como_novo" as const,
    images: [] as string[],
    cep: "",
    estado: "",
    cidade: "",
    bairro: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const cepRequestIdRef = useRef(0);

  const { data: seller } = trpc.sellers.getByUserId.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createProductMutation = trpc.usedProducts.create.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-formatação de CEP
    if (name === "cep") {
      let cepFormatado = value.replace(/\D/g, "");
      if (cepFormatado.length > 5) {
        cepFormatado = cepFormatado.replace(/^(\d{5})(\d)/, "$1-$2");
      }
      if (cepFormatado.length > 9) {
        cepFormatado = cepFormatado.slice(0, 9);
      }
      
      setFormData(prev => ({ ...prev, [name]: cepFormatado }));

      if (cepFormatado.length === 9) {
        fetchCep(cepFormatado);
      }
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    e.target.value = "";

    setUploadingImages(true);
    let uploadedCount = 0;
    try {
      for (const file of fileList) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`A imagem ${file.name} é grande demais (máx. 20MB).`);
          continue;
        }
        try {
          const compressed = await compressImage(file);
          const imageRef = ref(storage, `used_products/${Date.now()}_${file.name.replace(/\.[^.]+$/, "")}.jpg`);
          const uploadResult = await uploadBytes(imageRef, compressed);
          const downloadUrl = await getDownloadURL(uploadResult.ref);
          setFormData((prev) => ({
            ...prev,
            images: [...prev.images, downloadUrl].slice(0, 5),
          }));
          uploadedCount++;
        } catch (err) {
          console.error("Erro ao enviar imagem:", err);
          toast.error(`Erro ao enviar a imagem ${file.name}.`);
        }
      }
      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} foto${uploadedCount > 1 ? "s" : ""} carregada${uploadedCount > 1 ? "s" : ""} com sucesso!`);
      }
    } finally {
      setUploadingImages(false);
    }
  };

  const fetchCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    // Se a pessoa corrige um dígito digitado errado, uma busca antiga (do CEP errado)
    // pode responder DEPOIS da busca nova e sobrescrever com a localização errada —
    // por isso só aplica a resposta se essa ainda for a busca mais recente disparada.
    const requestId = ++cepRequestIdRef.current;

    try {
      setIsLoading(true);
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (requestId !== cepRequestIdRef.current) return;

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          estado: data.uf,
          cidade: data.localidade,
          bairro: data.bairro,
        }));
        toast.success("Localização preenchida pelo CEP!");
      } else {
        toast.error("CEP não encontrado");
      }
    } catch (error) {
      if (requestId !== cepRequestIdRef.current) return;
      toast.error("Erro ao buscar CEP");
    } finally {
      if (requestId === cepRequestIdRef.current) setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim() || !formData.price || !formData.cep.trim() || !formData.estado || !formData.cidade.trim() || !formData.bairro.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Validação de palavras proibidas (apenas itens de games/consoles/acessórios são aceitos nesta aba)
    const textToCheck = `${formData.name} ${formData.description}`.toLowerCase();
    const forbiddenKeywords = ["roupa", "celular", "iphone", "carro", "moto", "tenis", "tênis", "relogio", "relógio", "perfume", "camisa", "pantufa", "movel", "móvel"];
    const foundForbidden = forbiddenKeywords.find(kw => textToCheck.includes(kw));

    if (foundForbidden) {
      toast.error(`Produto recusado: O termo "${foundForbidden}" não pertence à categoria de games. Esta aba é exclusiva para jogos físicos, consoles, controles e colecionáveis.`);
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
        description: `[${formData.category.toUpperCase()}] ${formData.description.trim()}`,
        category: formData.category,
        price: parseFloat(formData.price),
        condition: formData.condition,
        images: formData.images,
        cep: formData.cep.trim(),
        estado: formData.estado,
        cidade: formData.cidade.trim(),
        bairro: formData.bairro.trim(),
      });
      toast.success("Anúncio de mídia física/acessório publicado com sucesso!");
      navigate("/usados");
    } catch (error: any) {
      toast.error(error?.message || "Erro ao adicionar produto. Tente novamente.");
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
          <p className="text-slate-400 mb-6">Você precisa estar logado para publicar um anúncio.</p>
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
          <div className="mb-8 text-center sm:text-left">
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider block mb-1">Mercado de Usados Eforte</span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Revenda seus Jogos Físicos, Consoles e Acessórios 📦</h1>
            <p className="text-slate-400 text-sm">Cadastre seus discos de PS4/PS5, consoles, controles e action figures</p>
          </div>

          {/* Form Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Categoria Gamer *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                  disabled={isLoading}
                >
                  <option value="midia_fisica">Mídia Física (Discos PS4, PS5, Xbox, Switch)</option>
                  <option value="console">Console de Videogame (PS4, PS5, Xbox, Switch)</option>
                  <option value="acessorio">Controle / Acessório Gamer Original</option>
                  <option value="colecionavel">Action Figure / Colecionável Gamer</option>
                </select>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Nome do Item *
                </label>
                <Input
                  type="text"
                  name="name"
                  placeholder="Ex: Jogo Demon's Souls PS5 Mídia Física Original"
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
                  Descrição Completa *
                </label>
                <textarea
                  name="description"
                  placeholder="Informe detalhes da capa, disco/estojo, caixa original, estado de conservação, etc..."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Price & Condition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Preço de Venda (R$) *
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

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Estado de Conservação *
                  </label>
                  <select
                    name="condition"
                    value={formData.condition}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                    disabled={isLoading}
                  >
                    <option value="novo">Novo (Lacrado)</option>
                    <option value="como_novo">Como Novo (Sem riscos)</option>
                    <option value="bom">Bom Estado</option>
                    <option value="aceitavel">Aceitável</option>
                  </select>
                </div>
              </div>

              {/* Region Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    CEP de Envio/Retirada *
                  </label>
                  <Input
                    type="text"
                    name="cep"
                    placeholder="00000-000"
                    value={formData.cep}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="bg-slate-950 border-slate-800 text-white rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Estado (UF) *
                  </label>
                  <select
                    name="estado"
                    value={formData.estado}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                    disabled={isLoading}
                    required
                  >
                    <option value="">Selecione a UF...</option>
                    {BRAZIL_STATES.map(st => (
                      <option key={st.uf} value={st.uf}>{st.name} ({st.uf})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Cidade *
                  </label>
                  <Input
                    type="text"
                    name="cidade"
                    placeholder="Ex: Londrina"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="bg-slate-950 border-slate-800 text-white rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Bairro *
                  </label>
                  <Input
                    type="text"
                    name="bairro"
                    placeholder="Ex: Centro"
                    value={formData.bairro}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="bg-slate-950 border-slate-800 text-white rounded-xl"
                    required
                  />
                </div>
              </div>

              {/* Images Upload with Camera direct trigger */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Fotos do Produto (Adequadas para Capas / Discos)
                </label>
                <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center hover:border-red-500/50 transition bg-slate-950">
                  <Upload className="w-10 h-10 text-red-500 mx-auto mb-2" />
                  <p className="text-slate-300 text-sm mb-3 font-semibold">Tire uma foto clara do estojo, disco ou console</p>

                  <div className="flex flex-wrap gap-3 justify-center">
                    <label className={`cursor-pointer bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-2 ${uploadingImages ? "opacity-60 pointer-events-none" : ""}`}>
                      {uploadingImages ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Enviando foto(s)...
                        </>
                      ) : (
                        "📷 Tirar Foto com Celular / Escolher Imagem"
                      )}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageFileChange}
                        className="hidden"
                        disabled={isLoading || uploadingImages}
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">A foto é redimensionada automaticamente — não precisa se preocupar com o tamanho do arquivo.</p>
                </div>

                {/* Preview Thumbnail Grid */}
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                        <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                          className="absolute top-1 right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Safe Escrow Intermediary Terms (8%) */}
              <div className="bg-slate-950 border border-amber-800/40 p-5 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  🛡️ Termos de Intermediação & Segurança Eforte Games (8% Taxa)
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  • <strong>Garantia Intermediada (Recomendada)</strong>: Caso o cliente opte por comprar com a **Intermediação Segura Eforte (8% de taxa)**, a loja retém o valor pago. O saldo é repassado ao vendedor apenas após o comprador receber e avaliar o produto.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  • <strong>Negociações Diretas Off-site</strong>: Vendas feitas diretamente no privado e sem o escrow da plataforma são de **responsabilidade exclusiva dos usuários**. A Eforte Games não se responsabiliza por prejuízos em acordos externos.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/usados")}
                  disabled={isLoading}
                  className="flex-1 border-slate-800 text-slate-400 hover:bg-slate-900"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                  disabled={isLoading}
                >
                  {isLoading ? "Publicando..." : "Publicar Anúncio Físico"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
