import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Gamepad2, Gift, Lock, ArrowLeft, Flame, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

// Mapeamento de gêneros → palavras-chave nos nomes dos jogos
const GENRE_MAP: Record<string, string[]> = {
  "Ação": ["god of war", "devil may cry", "doom", "wolfenstein", "batman", "spiderman", "marvel", "dying light", "dead island", "watch dogs", "gta", "ghost recon", "call of duty", "cod", "battlefield", "uncharted", "mafia", "shadow", "rdr", "red dead", "far cry", "star wars", "jedi", "hellblade", "avatar", "atomic heart", "deadpool", "wuchang", "reanimal"],
  "Aventura": ["uncharted", "horizon", "hogwarts", "assassin", "prince of persia", "detroit", "the last of us", "tlou", "martha", "the order", "shadow of the colossus", "tomb raider", "expedition"],
  "RPG": ["diablo", "final fantasy", "dragon ball", "naruto", "demon slayer", "bleach", "the elder scrolls", "skyrim", "hogwarts", "prey"],
  "Esportes": ["nba", "fifa", "wwe", "nhl", "mlb", "football", "tony hawk", "the crew", "test drive", "motorfest"],
  "Corrida": ["the crew", "test drive", "solar crown", "motorfest", "gran turismo", "need for speed", "nfs"],
  "Tiro / FPS": ["call of duty", "cod", "battlefield", "doom", "wolfenstein", "ghost recon", "sniper", "far cry", "halo", "borderlands"],
};

export default function DigitalMedia() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("genre") || null;
  });
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simple collection fetch — no composite index needed
    const unsubscribe = onSnapshot(collection(db, "digital_products"), (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => p.isActive !== false)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      setProducts(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter((p: any) => {
    const nameLower = p.name.toLowerCase();
    const matchesSearch = !searchTerm || nameLower.includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || p.type === selectedType;

    let matchesPlatform = true;
    if (selectedPlatform) {
      if (selectedPlatform === "PS5") {
        matchesPlatform = p.platform === "PS5" || p.platform === "PS4/PS5" || nameLower.includes("ps5");
      } else if (selectedPlatform === "PS4") {
        matchesPlatform = p.platform === "PS4" || p.platform === "PS4/PS5" || nameLower.includes("ps4");
      } else {
        matchesPlatform = p.platform === selectedPlatform;
      }
    }

    let matchesGenre = true;
    if (selectedGenre && GENRE_MAP[selectedGenre]) {
      matchesGenre = GENRE_MAP[selectedGenre].some(kw => nameLower.includes(kw));
    }

    return matchesSearch && matchesType && matchesPlatform && matchesGenre;
  });

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
      <div className="bg-gradient-to-r from-purple-900 to-slate-950 border-b border-red-600/20">
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
              <h1 className="text-3xl font-bold text-neon">Mídia Digital PS4 & PS5</h1>
            </div>
          </div>
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar jogos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 border-b border-red-600/20">
        <div className="container mx-auto px-4 py-4">

          {/* Chip de gênero ativo */}
          {selectedGenre && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Categoria:</span>
              <span className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/40 text-red-300 text-sm font-bold px-3 py-1 rounded-full">
                {selectedGenre}
                <button onClick={() => setSelectedGenre(null)} className="hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedType(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedType === null
                  ? "bg-red-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-red-600/20"
              }`}
            >
              Todos
            </button>
            {types.map(type => (
              <button
                key={type.value}
                onClick={() => {
                  setSelectedType(type.value);
                  setSelectedPlatform(null);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                  selectedType === type.value
                    ? "bg-red-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-red-600/20"
                }`}
              >
                <type.icon className="w-4 h-4" />
                {type.label}
              </button>
            ))}
          </div>

          {/* Sub-categorias de Plataforma */}
          {(selectedType === "jogo" || !selectedType) && (
            <div className="flex gap-2 flex-wrap mt-4 pt-3 border-t border-slate-800">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider self-center mr-2">Plataforma:</span>
              <button
                onClick={() => setSelectedPlatform(null)}
                className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition ${
                  selectedPlatform === null
                    ? "bg-red-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-850"
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setSelectedPlatform("PS5")}
                className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition flex items-center gap-1.5 ${
                  selectedPlatform === "PS5"
                    ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-850"
                }`}
              >
                🎮 PlayStation 5
              </button>
              <button
                onClick={() => setSelectedPlatform("PS4")}
                className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition flex items-center gap-1.5 ${
                  selectedPlatform === "PS4"
                    ? "bg-sky-600 text-white shadow-[0_0_15px_rgba(3,105,161,0.4)]"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-850"
                }`}
              >
                🎮 PlayStation 4
              </button>
              <button
                onClick={() => setSelectedPlatform("PS4/PS5")}
                className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition flex items-center gap-1.5 ${
                  selectedPlatform === "PS4/PS5"
                    ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-850"
                }`}
              >
                🌟 Dual (PS4 & PS5)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="card-neon animate-pulse">
                <div className="bg-slate-800 h-52 rounded-t-xl" />
                <div className="p-3">
                  <div className="h-4 bg-slate-700 rounded mb-2" />
                  <div className="h-3 bg-slate-700 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Gamepad2 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Nenhum jogo encontrado</p>
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-6">{filteredProducts.length} jogos encontrados</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product: any) => (
                <div key={product.id} className="card-neon overflow-hidden group hover:scale-105 transition-transform duration-200 flex flex-col">
                  <div className="relative overflow-hidden bg-slate-800 h-52">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {getTypeIcon(product.type)}
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 z-10">
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlatform(product.platform || "PS4/PS5");
                        }}
                        className="text-[10px] bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded font-black uppercase tracking-wider cursor-pointer transition-colors shadow-lg border border-red-500/20"
                      >
                        {product.platform || "PS4/PS5"}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="text-sm font-bold text-white line-clamp-2 mb-2 group-hover:text-red-400 transition-colors flex-1">
                      {product.name}
                    </h3>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xl font-black text-red-500">
                        {parseFloat(product.price) === 0
                          ? "Consultar"
                          : `R$ ${parseFloat(product.price).toFixed(2).replace('.', ',')}`}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold btn-neon text-xs"
                      onClick={() => {
                        const msg = encodeURIComponent(`Olá! Tenho interesse no jogo "${product.name}" - R$ ${parseFloat(product.price).toFixed(2).replace('.', ',')}. Como faço para comprar?`);
                        window.open(`https://wa.me/554384253691?text=${msg}`, '_blank');
                      }}
                    >
                      <svg className="w-3 h-3 fill-current mr-1" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.118-2.905-6.993C16.257 1.874 13.78 1.84 11.14 1.84 5.704 1.84 1.28 6.261 1.277 11.705c-.001 1.714.453 3.39 1.317 4.873L1.576 22.25l5.071-1.328z"/>
                      </svg>
                      Comprar via WhatsApp
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
