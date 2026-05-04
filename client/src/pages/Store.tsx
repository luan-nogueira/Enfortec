import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, ShoppingCart, ArrowLeft, Flame } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Store() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { data: products, isLoading } = trpc.products.list.useQuery();

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-red-600/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/")}
              className="text-slate-300 hover:text-red-500"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Flame className="w-6 h-6 text-red-500" />
              <h1 className="text-3xl font-bold text-neon">Loja Própria</h1>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-red-500/50" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900 border-red-600/30 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">Carregando produtos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="card-neon p-6 hover:scale-105 transition-transform cursor-pointer">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg h-40 mb-4 flex items-center justify-center">
                  <ShoppingCart className="w-12 h-12 text-white opacity-50" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{product.name}</h3>
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{product.description}</p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-red-500">R$ {product.price}</span>
                  <span className="text-xs bg-red-600/20 text-red-400 px-2 py-1 rounded">
                    {product.stock} em estoque
                  </span>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Comprar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
