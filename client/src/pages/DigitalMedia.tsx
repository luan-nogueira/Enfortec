import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, Gamepad2, Gift, Lock, ArrowLeft, Flame, Download } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function DigitalMedia() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  const { data: products, isLoading } = trpc.digitalProducts.list.useQuery();

  const filteredProducts = products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || p.type === selectedType;
    return matchesSearch && matchesType;
  }) || [];

  const types = [
    { value: "jogo", label: "Jogos", icon: Gamepad2 },
    { value: "gift_card", label: "Gift Cards", icon: Gift },
    { value: "licenca", label: "Licenças", icon: Lock },
    { value: "outro", label: "Outros", icon: Gamepad2 },
  ];

  const getTypeIcon = (type: string) => {
    const typeObj = types.find(t => t.value === type);
    const Icon = typeObj?.icon || Gamepad2;
    return <Icon className="w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 border-b border-red-600/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/")}
              className="text-white hover:text-red-300"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Flame className="w-6 h-6 text-red-500" />
              <h1 className="text-3xl font-bold text-white">Mídia Digital</h1>
            </div>
          </div>
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-purple-200" />
              <Input
                placeholder="Buscar produtos digitais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-purple-500/30 border-purple-400 text-white placeholder:text-purple-200"
              />
            </div>
            {isAuthenticated && (
              <Button className="bg-red-600 hover:bg-red-700 text-white font-bold btn-neon">
                + Vender Digital
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
              onClick={() => setSelectedType(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedType === null
                  ? "bg-red-600 text-white neon-glow"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-red-600/20"
              }`}
            >
              Todos
            </button>
            {types.map(type => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                  selectedType === type.value
                    ? "bg-red-600 text-white neon-glow"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-red-600/20"
                }`}
              >
                <type.icon className="w-4 h-4" />
                {type.label}
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
              <div key={product.id} className="card-neon p-6 hover:scale-105 transition-transform">
                <div className="bg-gradient-to-br from-purple-600 to-purple-700 h-40 flex items-center justify-center relative rounded-lg mb-4">
                  {getTypeIcon(product.type)}
                </div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-white line-clamp-2 flex-1">{product.name}</h3>
                  <span className="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded ml-2 whitespace-nowrap">
                    {types.find(t => t.value === product.type)?.label}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{product.description}</p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-red-500">R$ {product.price}</span>
                  <span className="text-xs text-slate-400">
                    {product.stock} disponíveis
                  </span>
                </div>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold">
                  <Download className="w-4 h-4 mr-2" />
                  Comprar & Baixar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
