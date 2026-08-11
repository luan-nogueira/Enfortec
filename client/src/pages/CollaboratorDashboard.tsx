import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Edit2, Store, Package } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function CollaboratorDashboard() {
  const { user, isAuthenticated, isCollaborator, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  // Produtos vêm do Postgres (mesma tabela lida pela Loja pública)
  const productsQuery = trpc.products.adminList.useQuery(undefined, { enabled: isAuthenticated && isCollaborator });
  const products = productsQuery.data || [];

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Produto adicionado com sucesso!");
      productsQuery.refetch();
      cancelEdit();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar produto."),
  });
  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Produto atualizado com sucesso!");
      productsQuery.refetch();
      cancelEdit();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar produto."),
  });
  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Produto excluído com sucesso!");
      productsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao deletar produto."),
  });

  // Formulário
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Jogos (Mídia Digital)");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [stock, setStock] = useState("1");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  if (authLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Carregando permissões...</div>;

  if (!isAuthenticated || !isCollaborator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4">
        <div className="text-center card-neon bg-slate-900 p-8 rounded-xl max-w-md w-full border border-red-600/30">
          <Package className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-slate-400 mb-6">
            Você não tem permissão para acessar o Portal do Colaborador.
            Entre em contato com o gestor para solicitar acesso.
          </p>
          <Button onClick={() => navigate("/")} className="w-full bg-red-600 hover:bg-red-700 btn-neon">Voltar para a Loja</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId && !imageFile) {
      toast.warning("Por favor, selecione uma imagem.");
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      toast.warning("Informe um preço válido.");
      return;
    }

    setLoading(true);
    try {
      let images: string[] | undefined;
      if (imageFile) {
        const imageRef = ref(storage, `store_products/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(imageRef, imageFile);
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        images = [downloadUrl];
      }

      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          name,
          description,
          price: parseFloat(price),
          category,
          stock: parseInt(stock) || 0,
          ...(images ? { images } : {}),
        });
      } else {
        await createMutation.mutateAsync({
          name,
          description,
          price: parseFloat(price),
          category,
          stock: parseInt(stock) || 0,
          images,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (product: any) => {
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description || "");
    setPrice(product.price ? String(product.price) : "");
    setCategory(product.category);
    setStock(product.stock ? String(product.stock) : "0");
    setImageFile(null); // obriga a não mexer na imagem a não ser que escolha outra
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice("");
    setStock("1");
    setImageFile(null);
    const fileInput = document.getElementById("imageUpload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleDeleteProduct = (id: number) => {
    toast("Tem certeza que deseja excluir este produto?", {
      action: {
        label: "Excluir",
        onClick: () => deleteMutation.mutate(id),
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-slate-900 border-b border-red-600/20 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Store className="text-red-500 w-6 h-6" />
          <h1 className="text-xl font-bold text-neon">Portal do Colaborador</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm hidden md:block">Colaborador: {user?.email}</span>
          <Button variant="outline" size="sm" className="border-red-600/50 hover:bg-red-900/20" onClick={() => navigate("/")}>Sair do Portal</Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Formulário de Adição */}
        <Card className="p-6 bg-slate-900 border-red-600/30 card-neon lg:col-span-1 h-fit">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            {editingId ? <Edit2 className="w-5 h-5 text-red-500" /> : <Plus className="w-5 h-5 text-red-500" />}
            {editingId ? "Editar Produto" : "Adicionar Novo Produto"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-slate-300">Nome do Produto</Label>
              <Input required value={name} onChange={e => setName(e.target.value)} className="bg-slate-950 border-red-600/30" placeholder="Ex: Teclado Mecânico" />
            </div>
            <div>
              <Label className="text-slate-300">Preço (R$)</Label>
              <Input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} className="bg-slate-950 border-red-600/30" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-slate-300">Categoria</Label>
              <select
                required
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full flex h-10 items-center justify-between rounded-md border border-red-600/30 bg-slate-950 px-3 py-2 text-sm text-slate-300"
              >
                <option value="Jogos (Mídia Digital)">Jogos (Mídia Digital)</option>
                <option value="Jogos (Físico)">Jogos (Físico)</option>
                <option value="Eletrônicos">Eletrônicos</option>
                <option value="Periféricos">Periféricos</option>
                <option value="Hardware">Hardware</option>
                <option value="Consoles">Consoles</option>
                <option value="Acessórios">Acessórios</option>
              </select>
            </div>
            <div>
              <Label className="text-slate-300">Quantidade em Estoque</Label>
              <Input type="number" required value={stock} onChange={e => setStock(e.target.value)} className="bg-slate-950 border-red-600/30 text-white" placeholder="0" />
            </div>
            <div>
              <Label className="text-slate-300">Foto do Produto do seu PC {editingId && "(Opcional para não alterar)"}</Label>
              <Input
                id="imageUpload"
                required={!editingId}
                type="file"
                accept="image/*"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setImageFile(e.target.files[0]);
                  }
                }}
                className="bg-slate-950 border-red-600/30 file:text-red-500 file:bg-slate-900 file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded-md cursor-pointer"
              />
            </div>
            <div>
              <Label className="text-slate-300">Descrição Curta</Label>
              <Input required value={description} onChange={e => setDescription(e.target.value)} className="bg-slate-950 border-red-600/30" placeholder="Detalhes do produto..." />
            </div>
            <div className="flex gap-2 mt-4">
              <Button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 btn-neon">
                {loading ? "Salvando..." : editingId ? "Atualizar Produto" : "Salvar na Loja"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit} className="border-red-600/30 text-slate-300 hover:text-white">
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Lista de Produtos Adicionados */}
        <Card className="p-6 bg-slate-900 border-red-600/30 card-neon lg:col-span-2">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-red-500" />
            Produtos da Loja ({products.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-red-600/20 text-slate-400">
                  <th className="pb-3 pl-2">Foto</th>
                  <th className="pb-3">Nome</th>
                  <th className="pb-3">Categoria</th>
                  <th className="pb-3">Estoque</th>
                  <th className="pb-3">Preço</th>
                  <th className="pb-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {productsQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Carregando produtos...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Nenhum produto cadastrado na loja ainda.
                    </td>
                  </tr>
                ) : (
                  products.map((product: any) => (
                    <tr key={product.id} className="border-b border-red-600/10 hover:bg-slate-800/50 transition">
                      <td className="py-3 pl-2">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-12 h-12 object-cover rounded bg-slate-800" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center text-slate-600">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 font-medium text-white">{product.name}</td>
                      <td className="py-3 text-slate-400">{product.category}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${product.stock > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {product.stock || 0} Unid.
                        </span>
                      </td>
                      <td className="py-3 text-red-400 font-bold text-sm">
                        R$ {Number(product.price || 0).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-500 mr-1" onClick={() => startEditing(product)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
}
