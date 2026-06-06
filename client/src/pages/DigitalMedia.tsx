import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Gamepad2, Gift, Lock, ArrowLeft, Flame, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

// Jogos com badge especial (novos lançamentos / oferta)
const GAME_BADGES: Record<string, { label: string; color: string }> = {
  "COD BLACK OPS 7": { label: "🔥 Lançamento", color: "bg-red-600" },
  "NBA 2K26": { label: "🔥 Lançamento", color: "bg-red-600" },
  "WWE 2K26": { label: "🔥 Lançamento", color: "bg-red-600" },
  "DOOM DARK AGES": { label: "🔥 Lançamento", color: "bg-red-600" },
  "DRAGON BALL SPARKING ZERO": { label: "⭐ Popular", color: "bg-orange-500" },
  "GTA V": { label: "⭐ Popular", color: "bg-orange-500" },
  "HOGWARTS LEGACY": { label: "💰 Oferta", color: "bg-green-600" },
  "DYING LIGHT": { label: "💰 Oferta", color: "bg-green-600" },
  "MAFIA 3": { label: "💰 Oferta", color: "bg-green-600" },
  "WOLFENSTEIN": { label: "💰 Oferta", color: "bg-green-600" },
  "SHADOW OF MORDOR": { label: "💰 Oferta", color: "bg-green-600" },
};

function getGameBadge(name: string) {
  const key = Object.keys(GAME_BADGES).find(k => name.toUpperCase().includes(k));
  return key ? GAME_BADGES[key] : null;
}

export default function DigitalMedia() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("search") || "";
  });
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("genre") || null;
  });
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "asc" | "desc">("az");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutProductId, setCheckoutProductId] = useState<string | null>(null);

  const [selectedBargainProduct, setSelectedBargainProduct] = useState<any | null>(null);
  const [bargainOffer, setBargainOffer] = useState("");

  const handleBargainClick = (product: any) => {
    setSelectedBargainProduct(product);
    setBargainOffer("");
  };

  const handleFinalizeBargain = () => {
    if (!selectedBargainProduct || !bargainOffer.trim()) return;
    const price = parseFloat(selectedBargainProduct.price);
    const message = `Olá! Tenho interesse no jogo digital: ${selectedBargainProduct.name} (Preço original: R$ ${price.toFixed(2).replace('.', ',')}). Gostaria de fazer uma pechincha: você fecharia por R$ ${parseFloat(bargainOffer).toFixed(2).replace('.', ',')}?`;
    window.open(`https://wa.me/554384253691?text=${encodeURIComponent(message)}`, "_blank");
    setSelectedBargainProduct(null);
  };

  const handleBuyClick = async (product: any) => {
    const price = parseFloat(product.price);
    if (price === 0) {
      const msg = encodeURIComponent(`Olá! Tenho interesse no jogo "${product.name}" - valor sob consulta. Como faço para comprar?`);
      window.open(`https://wa.me/554384253691?text=${msg}`, '_blank');
      return;
    }

    setCheckoutProductId(product.id);
    try {
      const response = await fetch("/api/infinitepay/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: product.name,
          price: price,
          redirectUrl: `${window.location.origin}/minhas-compras`
        })
      });

      const data = await response.json();
      if (response.ok && data.success && data.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error(data.error || "Erro ao gerar link de pagamento");
      }
    } catch (error) {
      console.warn("[Checkout] Fallback para WhatsApp devido a erro:", error);
      const msg = encodeURIComponent(`Olá! Tenho interesse no jogo "${product.name}" - R$ ${price.toFixed(2).replace('.', ',')}. Como faço para comprar?`);
      window.open(`https://wa.me/554384253691?text=${msg}`, '_blank');
    } finally {
      setCheckoutProductId(null);
    }
  };

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
  }).sort((a: any, b: any) => {
    if (sortOrder === "az") return a.name.localeCompare(b.name);
    if (sortOrder === "za") return b.name.localeCompare(a.name);
    if (sortOrder === "asc") return parseFloat(a.price) - parseFloat(b.price);
    if (sortOrder === "desc") return parseFloat(b.price) - parseFloat(a.price);
    return 0;
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
            {/* Sort bar */}
            <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
              <p className="text-slate-400 text-sm">{filteredProducts.length} jogos encontrados</p>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Ordenar:</span>
                {([
                  { val: "az", label: "A→Z" },
                  { val: "za", label: "Z→A" },
                  { val: "asc", label: "Menor Preço" },
                  { val: "desc", label: "Maior Preço" },
                ] as const).map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setSortOrder(opt.val)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      sortOrder === opt.val
                        ? "bg-red-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
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
                    {/* Game badge (Lançamento / Oferta / Popular) */}
                    {(() => {
                      const badge = getGameBadge(product.name);
                      return badge ? (
                        <div className={`absolute top-2 right-2 z-10 ${badge.color} text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg`}>
                          {badge.label}
                        </div>
                      ) : null;
                    })()}
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
                    <div className="flex flex-col gap-2 mt-2">
                      <Button
                        size="sm"
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold btn-neon text-xs"
                        onClick={() => handleBuyClick(product)}
                        disabled={checkoutProductId === product.id}
                      >
                        {parseFloat(product.price) === 0 ? (
                          "Consultar via WhatsApp"
                        ) : checkoutProductId === product.id ? (
                          "Processando..."
                        ) : (
                          "Comprar com Pix/Cartão"
                        )}
                      </Button>
                      {parseFloat(product.price) > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handleBargainClick(product)}
                          className="w-full bg-slate-900 border border-red-600/30 hover:border-red-600/60 text-red-500 font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          💸 Pechinchar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de Pechincha */}
      <Dialog open={!!selectedBargainProduct} onOpenChange={(open) => !open && setSelectedBargainProduct(null)}>
        <DialogContent className="bg-slate-900 border-red-600/30 text-white sm:max-w-[425px] card-neon">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-neon flex items-center gap-2">💸 Fazer uma Pechincha</DialogTitle>
            <DialogDescription className="text-slate-400">
              Proponha sua oferta para o administrador. Se aprovado, fechamos o negócio!
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="flex gap-4 items-start mb-6">
              <div className="w-20 h-20 rounded bg-slate-800 overflow-hidden border border-red-600/20">
                <img src={selectedBargainProduct?.imageUrl} alt={selectedBargainProduct?.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-white line-clamp-2">{selectedBargainProduct?.name}</h4>
                <p className="text-xs text-slate-500">Preço original: R$ {selectedBargainProduct ? parseFloat(selectedBargainProduct.price).toFixed(2).replace('.', ',') : "0,00"}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm font-bold text-slate-300">Sua Oferta de Valor (R$)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 50.00"
                value={bargainOffer}
                onChange={(e) => setBargainOffer(e.target.value)}
                className="bg-slate-950 border-red-600/20 text-white focus-visible:ring-red-600 h-12 rounded-xl text-base"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              disabled={!bargainOffer.trim()}
              onClick={handleFinalizeBargain}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-lg rounded-xl shadow-lg shadow-green-600/20"
            >
              Enviar Proposta de Pechincha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
