import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, Star, ShoppingCart, ArrowLeft, Flame } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function UsedMarketplace() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  
  const { data: products, isLoading } = trpc.usedProducts.list.useQuery();

  const filteredProducts = products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCondition = !selectedCondition || p.condition === selectedCondition;
    return matchesSearch && matchesCondition;
  }) || [];

  const conditions = [
    { value: "novo", label: "Novo" },
    { value: "como_novo", label: "Como Novo" },
    { value: "bom", label: "Bom" },
    { value: "aceitavel", label: "Aceitável" },
  ];

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
              <h1 className="text-3xl font-bold text-neon">Marketplace de Usados</h1>
            </div>
          </div>
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-red-500/50" />
              <Input
                placeholder="Buscar produtos usados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900 border-red-600/30 text-white placeholder:text-slate-500"
              />
            </div>
            {isAuthenticated && (
              <Button className="bg-green-600 hover:bg-green-700 text-white font-bold">
                + Anunciar Produto
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 border-b border-red-600/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCondition(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedCondition === null
                  ? "bg-red-600 text-white neon-glow"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-red-600/20"
              }`}
            >
              Todos
            </button>
            {conditions.map(condition => (
              <button
                key={condition.value}
                onClick={() => setSelectedCondition(condition.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedCondition === condition.value
                    ? "bg-red-600 text-white neon-glow"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-red-600/20"
                }`}
              >
                {condition.label}
              </button>
            ))}
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
              <div
                key={product.id}
                className="card-neon p-6 hover:scale-105 transition-transform"
              >
                <div className="bg-gradient-to-br from-green-600 to-green-700 h-40 flex items-center justify-center relative rounded-lg mb-4">
                  <ShoppingCart className="w-12 h-12 text-white opacity-50" />
                  <span className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-bold">
                    {product.condition === "novo" && "Novo"}
                    {product.condition === "como_novo" && "Como Novo"}
                    {product.condition === "bom" && "Bom"}
                    {product.condition === "aceitavel" && "Aceitável"}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-2 line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-red-500 text-red-500"
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">(0 avaliações)</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-red-500">
                    R$ {parseFloat(product.price).toFixed(2)}
                  </span>
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold">
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
