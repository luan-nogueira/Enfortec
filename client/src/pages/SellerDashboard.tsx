import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, storage } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plus, TrendingUp, ShoppingCart, Star, Flame, Trash2, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

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

// Mock data removido ou mantido apenas como exemplo vazio
const mockEarningsData = [
  { name: "Semana 1", ganho: 0 },
  { name: "Semana 2", ganho: 0 },
  { name: "Semana 3", ganho: 0 },
  { name: "Semana 4", ganho: 0 },
];

export default function SellerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"vendas" | "produtos" | "avaliacoes">("vendas");
  
  const [usedProducts, setUsedProducts] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form para novo produto
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricePS4, setPricePS4] = useState("");
  const [pricePS5, setPricePS5] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [cep, setCep] = useState("");
  const [bairro, setBairro] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: pgUser } = trpc.auth.me.useQuery(undefined, { enabled: isAuthenticated });
  const createProductMutation = trpc.usedProducts.create.useMutation();
  // const boostProductMutation = trpc.usedProducts.boost.useMutation();

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    
    // Consulta apenas os produtos deste vendedor
    const q = query(collection(db, "used_products"), where("sellerId", "==", user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsedProducts(data);
    });

    return () => unsubscribe();
  }, [isAuthenticated, user?.id]);

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 5) {
      value = value.replace(/^(\d{5})(\d)/, "$1-$2");
    }
    if (value.length > 9) {
      value = value.slice(0, 9);
    }
    setCep(value);

    if (value.length === 9) {
      const cleanCep = value.replace("-", "");
      try {
        setLoading(true);
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setEstado(data.uf);
          setCidade(data.localidade);
          setBairro(data.bairro);
          toast.success("Localização preenchida pelo CEP!");
        } else {
          toast.error("CEP não encontrado");
        }
      } catch (error) {
        toast.error("Erro ao buscar CEP");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    // Bloqueio de produtos digitais
    const digitalKeywords = [
      "digital", "conta", "primária", "primaria", "secundária", "secundaria", 
      "chave", "código", "codigo", "gift card", "giftcard", "pin", "key", 
      "download", "online", "acesso", "login", "senha"
    ];
    const textToCheck = `${name} ${description}`.toLowerCase();
    const isDigital = digitalKeywords.some(keyword => textToCheck.includes(keyword));

    if (isDigital) {
      toast.error("Anúncios de Mídia Digital ou Contas não são permitidos. O Portal de Desapego é apenas para produtos físicos (mídia física, consoles, acessórios).");
      return;
    }

    if (!imageFile) {
      toast.warning("Por favor, selecione uma foto do produto.");
      return;
    }
    if (!cep.trim()) {
      toast.warning("Por favor, preencha o CEP.");
      return;
    }
    if (!estado) {
      toast.warning("Por favor, selecione um Estado.");
      return;
    }
    if (!cidade.trim()) {
      toast.warning("Por favor, preencha a Cidade.");
      return;
    }
    if (!bairro.trim()) {
      toast.warning("Por favor, preencha o Bairro.");
      return;
    }

    setLoading(true);
    try {
      // 1. Upload da Imagem
      const imageRef = ref(storage, `used_products/${Date.now()}_${imageFile.name}`);
      const uploadResult = await uploadBytes(imageRef, imageFile);
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      // 2. Salvar Documento
      await addDoc(collection(db, "used_products"), {
        name,
        description,
        pricePS4: pricePS4 ? parseFloat(pricePS4) : null,
        pricePS5: pricePS5 ? parseFloat(pricePS5) : null,
        imageUrl: downloadUrl,
        sellerId: user?.id,
        sellerName: user?.name || user?.email,
        status: "Ativo",
        cep,
        estado,
        cidade,
        bairro,
        createdAt: new Date().toISOString()
      });

      // 3. Salvar no Postgres (tRPC)
      try {
        await createProductMutation.mutateAsync({
          name,
          description,
          price: pricePS4 ? parseFloat(pricePS4) : (pricePS5 ? parseFloat(pricePS5) : 0),
          condition: "como_novo",
          images: [downloadUrl],
          cep,
          estado,
          cidade,
          bairro
        });
      } catch (pgErr) {
        console.warn("[SellerDashboard] Falha ao sincronizar com banco Postgres:", pgErr);
      }

      setName("");
      setDescription("");
      setPricePS4("");
      setPricePS5("");
      setCep("");
      setEstado("");
      setCidade("");
      setBairro("");
      setImageFile(null);
      setShowAddForm(false);
      
      const fileInput = document.getElementById("sellerImageUpload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      toast.success("Produto anunciado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao anunciar produto. Verifique os dados de acesso e a conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    toast("Deletar este anúncio?", {
      action: {
        label: "Deletar",
        onClick: async () => {
          try {
            await deleteDoc(doc(db, "used_products", id));
            toast.success("Anúncio deletado com sucesso!");
          } catch (error) {
            toast.error("Erro ao deletar anúncio.");
          }
        }
      }
    });
  };

  const handleBoostProduct = async (product: any) => {
    if (!user?.id) return;

    if (Boolean(product.boostedUntil && new Date(product.boostedUntil).getTime() > Date.now())) {
      toast.info(`Este produto já está turbinado até ${new Date(product.boostedUntil).toLocaleDateString()}!`);
      return;
    }

    toast("Deseja turbinar este anúncio por 10 ForteCoins? Ele ficará em destaque por 3 dias.", {
      action: {
        label: "Turbinar (10 FC)",
        onClick: async () => {
          try {
            setLoading(true);
            const userRef = doc(db, "users", user.id);
            const userSnap = await getDoc(userRef);
            const currentCoins = userSnap.data()?.forteCoins ?? 0;

            if (currentCoins < 10) {
              toast.error("Você não tem ForteCoins suficientes (necessário 10 FC).");
              return;
            }

            // Deduz as moedas
            await updateDoc(userRef, {
              forteCoins: currentCoins - 10
            });

            // Adiciona 3 dias
            const boostedUntilDate = new Date();
            boostedUntilDate.setDate(boostedUntilDate.getDate() + 3);

            // Atualiza Firebase
            await updateDoc(doc(db, "used_products", product.id), {
              boostedUntil: boostedUntilDate.toISOString()
            });

            toast.success("Anúncio turbinado com sucesso! ⭐");
          } catch (error) {
            console.error("Erro ao turbinar:", error);
            toast.error("Erro ao turbinar o anúncio.");
          } finally {
            setLoading(false);
          }
        }
      }
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="text-center card-neon p-8 max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Acesso Negado</h1>
          <p className="text-slate-400 mb-6">Você precisa estar logado para acessar esta página.</p>
          <Button onClick={() => navigate("/")} className="bg-red-600 hover:bg-red-700 btn-neon">Voltar para Home</Button>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-red-600/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Flame className="w-8 h-8 text-red-500" />
            <div>
              <h1 className="text-3xl font-bold text-neon">Portal de Desapego</h1>
              <p className="text-slate-400 text-sm">Venda seus itens usados para a comunidade</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 card-neon">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm mb-2">Total em Anúncios</p>
                <p className="text-3xl font-bold text-white">
                  R$ {usedProducts.reduce((acc, p) => acc + (p.pricePS4 || p.pricePS5 || 0), 0).toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-6 card-neon">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm mb-2">Produtos Ativos</p>
                <p className="text-3xl font-bold text-white">{usedProducts?.length || 0}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-6 card-neon">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm mb-2">Reputação</p>
                <p className="text-3xl font-bold text-white">Novo Vendedor</p>
              </div>
              <Star className="w-8 h-8 text-red-500" />
            </div>
          </Card>
          <Card className="p-6 card-neon border-red-500/30 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-slate-400 text-xs mb-1">Saldo Eforte (Postgres)</p>
                <p className="text-xl font-black text-red-500">
                  R$ {parseFloat(pgUser?.balance || "0.00").toFixed(2).replace('.', ',')}
                </p>
              </div>
              <Coins className="w-6 h-6 text-red-500 animate-pulse" />
            </div>
            <Button 
              size="sm" 
              onClick={() => {
                const amount = parseFloat(pgUser?.balance || "0.00").toFixed(2).replace('.', ',');
                const text = encodeURIComponent(`Olá! Gostaria de solicitar o saque do meu saldo acumulado de R$ ${amount} no painel da Eforte Games.`);
                window.open(`https://wa.me/554384253691?text=${text}`, "_blank");
              }}
              disabled={parseFloat(pgUser?.balance || "0.00") <= 0}
              className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
            >
              Solicitar Saque (WhatsApp)
            </Button>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex gap-4 border-b border-red-600/20">
            <button
              onClick={() => setActiveTab("vendas")}
              className={`px-6 py-3 font-bold transition ${
                activeTab === "vendas"
                  ? "text-red-500 border-b-2 border-red-500"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Vendas
            </button>
            <button
              onClick={() => setActiveTab("produtos")}
              className={`px-6 py-3 font-bold transition ${
                activeTab === "produtos"
                  ? "text-red-500 border-b-2 border-red-500"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Meus Produtos
            </button>
            <button
              onClick={() => setActiveTab("avaliacoes")}
              className={`px-6 py-3 font-bold transition ${
                activeTab === "avaliacoes"
                  ? "text-red-500 border-b-2 border-red-500"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Avaliações
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "vendas" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 card-neon">
              <h2 className="text-lg font-semibold text-white mb-4">Ganhos Semanais</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockEarningsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #FF6B35" }} />
                  <Legend />
                  <Bar dataKey="ganho" fill="#FF6B35" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-6 card-neon">
              <h2 className="text-lg font-semibold text-white mb-4">Últimas Vendas</h2>
              <div className="space-y-3">
                <div className="p-8 text-center bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                  <p className="text-slate-500 text-sm italic">Nenhuma venda registrada ainda.</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "produtos" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Meus Produtos Anunciados</h2>
              <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-red-600 hover:bg-red-700 btn-neon">
                {showAddForm ? "Cancelar" : <><Plus className="w-4 h-4 mr-2" /> Novo Produto</>}
              </Button>
            </div>
            
            {showAddForm && (
              <Card className="p-6 card-neon mb-8">
                <h3 className="text-lg font-bold text-white mb-4">Anunciar Produto</h3>
                <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-slate-300">Nome do Produto</Label>
                    <Input required value={name} onChange={e => setName(e.target.value)} className="bg-slate-900 border-red-600/30 text-white" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-slate-300">Descrição</Label>
                    <Input required value={description} onChange={e => setDescription(e.target.value)} className="bg-slate-900 border-red-600/30 text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Preço PS4 (R$)</Label>
                      <Input type="number" step="0.01" value={pricePS4} onChange={e => setPricePS4(e.target.value)} className="bg-slate-900 border-red-600/30 text-white" placeholder="0.00" />
                    </div>
                    <div>
                      <Label className="text-slate-300">Preço PS5 (R$)</Label>
                      <Input type="number" step="0.01" value={pricePS5} onChange={e => setPricePS5(e.target.value)} className="bg-slate-900 border-red-600/30 text-white" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-slate-300">CEP *</Label>
                        <Input
                          value={cep}
                          onChange={handleCepChange}
                          placeholder="00000-000"
                          disabled={loading}
                          required
                          className="bg-slate-900 border-slate-700"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Estado (UF) *</Label>
                        <select
                          value={estado}
                          onChange={(e) => setEstado(e.target.value)}
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                          disabled={loading}
                          required
                        >
                          <option value="">Selecione...</option>
                          {BRAZIL_STATES.map(st => (
                            <option key={st.uf} value={st.uf}>{st.name} ({st.uf})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-slate-300">Cidade *</Label>
                        <Input
                          value={cidade}
                          onChange={(e) => setCidade(e.target.value)}
                          placeholder="Ex: Londrina"
                          disabled={loading}
                          required
                          className="bg-slate-900 border-slate-700"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Bairro *</Label>
                        <Input
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                          placeholder="Ex: Centro"
                          disabled={loading}
                          required
                          className="bg-slate-900 border-slate-700"
                        />
                      </div>
                    </div>
                  <div>
                    <Label className="text-slate-300">Foto do Produto</Label>
                    <Input 
                      id="sellerImageUpload"
                      required 
                      type="file" 
                      accept="image/*"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setImageFile(e.target.files[0]);
                        }
                      }} 
                      className="bg-slate-900 border-red-600/30 file:text-red-500 file:bg-slate-950 file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded-md cursor-pointer text-slate-300" 
                    />
                  </div>
                  <div className="flex items-end md:col-span-2">
                    <Button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 py-6 text-lg font-bold">
                      {loading ? "Salvando e Enviando Imagem..." : "Salvar Anúncio"}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {usedProducts.length === 0 && !showAddForm && (
                <div className="col-span-full py-8 text-center text-slate-500">
                  Você ainda não tem nenhum produto anunciado.
                </div>
              )}
              {usedProducts.map((product) => (
                <Card key={product.id} className="p-0 card-neon overflow-hidden border-red-600/30">
                  <div className="h-48 w-full bg-slate-900 border-b border-red-600/20">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <ShoppingCart className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <h3 className="text-lg font-bold text-white line-clamp-1">{product.name}</h3>
                        {Boolean(product.boostedUntil && new Date(product.boostedUntil).getTime() > Date.now()) && (
                          <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 fill-yellow-500" /> Destaque até {new Date(product.boostedUntil).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-500 -mt-2 -mr-2" onClick={() => handleDeleteProduct(product.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2 min-h-[40px]">{product.description}</p>
                    <div className="flex flex-col gap-3 pt-4 border-t border-red-600/10">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col text-red-500 font-bold text-sm">
                          {product.pricePS4 ? <span>PS4: R$ {product.pricePS4.toFixed(2)}</span> : null}
                          {product.pricePS5 ? <span>PS5: R$ {product.pricePS5.toFixed(2)}</span> : null}
                          {!product.pricePS4 && !product.pricePS5 && <span>Sob Consulta</span>}
                        </div>
                        <span className="text-xs bg-red-600/20 text-red-400 px-3 py-1 rounded-full font-medium">
                          {product.status}
                        </span>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        disabled={loading || Boolean(product.boostedUntil && new Date(product.boostedUntil).getTime() > Date.now())}
                        onClick={() => handleBoostProduct(product)}
                        className={`w-full text-xs font-bold ${
                          Boolean(product.boostedUntil && new Date(product.boostedUntil).getTime() > Date.now())
                          ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10'
                          : 'border-yellow-600/30 text-yellow-500 hover:bg-yellow-600/10'
                        }`}
                      >
                        <Flame className="w-3.5 h-3.5 mr-1.5" />
                        {Boolean(product.boostedUntil && new Date(product.boostedUntil).getTime() > Date.now()) 
                          ? 'Anúncio Turbinado' 
                          : 'Turbinar Anúncio (10 FC)'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "avaliacoes" && (
          <Card className="p-6 card-neon">
            <h2 className="text-lg font-semibold text-white mb-4">Avaliações dos Clientes</h2>
            <div className="space-y-4">
              <div className="p-8 text-center bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                <p className="text-slate-500 text-sm italic">Você ainda não recebeu avaliações.</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
