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
  const [searchTerm, setSearchTerm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("search") || "";
  });
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  const { data: products, isLoading } = trpc.digitalProducts.list.useQuery();

  const filteredProducts = products?.filter((p: any) => {
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
            {filteredProducts.map((product: any) => (
              <div key={product.id} className="card-neon p-6 hover:scale-105 transition-transform">
                <div className="bg-gradient-to-br from-purple-600 to-purple-700 h-40 flex items-center justify-center relative rounded-lg mb-4 overflow-hidden border border-purple-500/20">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    />
                  ) : (
                    getTypeIcon(product.type)
                  )}
                </div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-white line-clamp-2 flex-1">{product.name}</h3>
                  <span className="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded ml-2 whitespace-nowrap">
                    {types.find(t => t.value === product.type)?.label}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{product.description}</p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-red-500">
                    {parseFloat(product.price) === 0 
                      ? "A definir com ADM" 
                      : `R$ ${parseFloat(product.price).toFixed(2).replace('.', ',')}`}
                  </span>
                  <span className="text-xs text-slate-400">
                    {parseFloat(product.price) === 0 ? "Sob consulta" : `${product.stock} disponíveis`}
                  </span>
                </div>
                {parseFloat(product.price) === 0 ? (
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold btn-neon flex items-center justify-center gap-2"
                    onClick={() => {
                      const message = encodeURIComponent(`Olá! Tenho interesse no jogo "${product.name}" da Eforte Games. Como funciona para adquirir?`);
                      window.open(`https://wa.me/554384253691?text=${message}`, '_blank');
                    }}
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.118-2.905-6.993C16.257 1.874 13.78 1.84 11.14 1.84 5.704 1.84 1.28 6.261 1.277 11.705c-.001 1.714.453 3.39 1.317 4.873L1.576 22.25l5.071-1.328zM17.18 14.39c-.3-.15-1.782-.88-2.062-.98-.28-.1-.48-.15-.68.15-.2.3-.77.98-.94 1.18-.17.2-.34.22-.64.07-1.3-.65-2.28-1.15-3.18-2.7-.24-.41-.24-.26.17-.68.18-.18.39-.46.59-.69.2-.23.27-.39.41-.65.13-.26.07-.49-.03-.69-.1-.2-.8-1.92-1.1-2.63-.29-.7-.59-.6-.81-.61-.21-.01-.45-.01-.69-.01-.24 0-.63.09-.96.45-.33.36-1.27 1.24-1.27 3.03 0 1.8 1.31 3.53 1.49 3.77.18.24 2.58 3.94 6.25 5.53.87.38 1.56.6 2.09.77.88.28 1.68.24 2.3.15.7-.1 2.06-.84 2.35-1.65.29-.82.29-1.51.2-1.65-.08-.15-.3-.23-.6-.38z"/>
                    </svg>
                    Contatar ADM
                  </Button>
                ) : (
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold">
                    <Download className="w-4 h-4 mr-2" />
                    Comprar & Baixar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
