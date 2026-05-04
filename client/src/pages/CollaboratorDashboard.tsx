import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Plus, Trash2, Edit2, Store, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface Product {
  id: string;
  name: string;
  description: string;
  pricePS4?: number;
  pricePS5?: number;
  category: string;
  imageUrl: string;
}

export default function CollaboratorDashboard() {
  const { user, isAuthenticated, isCollaborator, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  
  // Formulário
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricePS4, setPricePS4] = useState("");
  const [pricePS5, setPricePS5] = useState("");
  const [category, setCategory] = useState("Jogos (Mídia Digital)");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Escutar produtos do Firestore em tempo real
  useEffect(() => {
    const productsRef = collection(db, "store_products");
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(data);
    });

    return () => unsubscribe();
  }, []);

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
      alert("Por favor, selecione uma imagem.");
      return;
    }
    
    setLoading(true);
    try {
      let downloadUrl = "";
      if (imageFile) {
        // Upload nova imagem se foi selecionada
        const imageRef = ref(storage, `store_products/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(imageRef, imageFile);
        downloadUrl = await getDownloadURL(uploadResult.ref);
      }

      const productData: any = {
        name,
        description,
        pricePS4: pricePS4 ? parseFloat(pricePS4) : null,
        pricePS5: pricePS5 ? parseFloat(pricePS5) : null,
        category,
        collaboratorId: user?.id,
        collaboratorName: user?.name || user?.email,
      };

      if (downloadUrl) {
        productData.imageUrl = downloadUrl;
      }

      if (editingId) {
        // Atualizar existente
        await updateDoc(doc(db, "store_products", editingId), productData);
        alert("Produto atualizado com sucesso!");
      } else {
        // Criar novo
        productData.createdAt = new Date().toISOString();
        await addDoc(collection(db, "store_products"), productData);
        alert("Produto adicionado com sucesso!");
      }

      // Limpar form
      cancelEdit();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      alert("Erro ao salvar produto. Verifique as permissões do Firestore/Storage.");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description);
    setPricePS4(product.pricePS4 ? product.pricePS4.toString() : "");
    setPricePS5(product.pricePS5 ? product.pricePS5.toString() : "");
    setCategory(product.category);
    setImageFile(null); // obriga a não mexer na imagem a não ser que escolha outra
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setPricePS4("");
    setPricePS5("");
    setImageFile(null);
    const fileInput = document.getElementById("imageUpload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      try {
        await deleteDoc(doc(db, "store_products", id));
      } catch (error) {
        console.error("Erro ao deletar:", error);
        alert("Erro ao deletar produto.");
      }
    }
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Preço PS4 (R$)</Label>
                <Input type="number" step="0.01" value={pricePS4} onChange={e => setPricePS4(e.target.value)} className="bg-slate-950 border-red-600/30" placeholder="0.00" />
              </div>
              <div>
                <Label className="text-slate-300">Preço PS5 (R$)</Label>
                <Input type="number" step="0.01" value={pricePS5} onChange={e => setPricePS5(e.target.value)} className="bg-slate-950 border-red-600/30" placeholder="0.00" />
              </div>
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
                  <th className="pb-3">Preço</th>
                  <th className="pb-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Nenhum produto cadastrado na loja ainda.
                    </td>
                  </tr>
                ) : (
                  products.map(product => (
                    <tr key={product.id} className="border-b border-red-600/10 hover:bg-slate-800/50 transition">
                      <td className="py-3 pl-2">
                        <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded bg-slate-800" />
                      </td>
                      <td className="py-3 font-medium text-white">{product.name}</td>
                      <td className="py-3 text-slate-400">{product.category}</td>
                      <td className="py-3 text-red-400 font-bold text-sm">
                        {product.pricePS4 ? <div>PS4: R$ {product.pricePS4.toFixed(2)}</div> : null}
                        {product.pricePS5 ? <div>PS5: R$ {product.pricePS5.toFixed(2)}</div> : null}
                        {!product.pricePS4 && !product.pricePS5 && "Sob Consulta"}
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
