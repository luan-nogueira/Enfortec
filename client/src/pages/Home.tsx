import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Zap, Gamepad2, Search, Shield, Package, LayoutGrid, Tag } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { user, isAuthenticated, isAdmin, isCollaborator } = useAuth();
  const [, navigate] = useLocation();

  // Fetching data for the unified feed
  const { data: usedProducts } = trpc.usedProducts.list.useQuery();
  const { data: digitalProducts } = trpc.digitalProducts.list.useQuery();

  // Combine and sort by newest
  const allListings = [
    ...(usedProducts?.map(p => ({ ...p, _type: 'used' })) || []),
    ...(digitalProducts?.map(p => ({ ...p, _type: 'digital' })) || [])
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12);

  const categories = [
    { name: "Valorant", icon: "🎮", color: "from-red-500 to-red-600" },
    { name: "League of Legends", icon: "⚔️", color: "from-blue-500 to-blue-600" },
    { name: "Roblox", icon: "🧱", color: "from-slate-500 to-slate-600" },
    { name: "Free Fire", icon: "🔥", color: "from-orange-500 to-orange-600" },
    { name: "Steam", icon: "🚂", color: "from-slate-700 to-slate-800" },
    { name: "Gift Cards", icon: "💳", color: "from-green-500 to-green-600" },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <nav className="bg-slate-950/95 backdrop-blur-md border-b border-red-700/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">🔥</div>
            <span className="text-2xl font-black text-white tracking-tight">EFORTE<span className="text-red-500">GAMES</span></span>
          </div>
          
          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-8">
            <a href="#categorias" className="text-slate-300 hover:text-white font-medium transition flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Categorias</a>
            <a href="#anuncios" className="text-slate-300 hover:text-white font-medium transition flex items-center gap-2"><Tag className="w-4 h-4" /> Anúncios</a>
            <span className="w-px h-6 bg-slate-800"></span>
            
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-900" onClick={() => navigate("/minhas-compras")}>
                  <Package className="w-4 h-4 mr-2" /> Minhas Compras
                </Button>
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="border-red-600/50 text-red-500 hover:bg-red-950/50">
                    <Shield className="w-4 h-4 mr-2" /> Admin
                  </Button>
                )}
                <Button size="sm" onClick={() => navigate("/vendedor")} className="bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]">
                  Painel do Vendedor
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-900" onClick={() => navigate("/login")}>
                  Entrar
                </Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]" onClick={() => navigate("/login")}>
                  Cadastrar
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero / Search Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 to-slate-950 z-0 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-red-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-6 text-white leading-tight">
            O Maior Marketplace Gamer
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Compre e venda contas, itens, serviços e gift cards. 
            <strong className="text-red-400 font-semibold ml-1">Pagamento 100% Seguro.</strong>
          </p>
          
          <div className="max-w-3xl mx-auto flex gap-2 relative">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" />
              <Input 
                type="text" 
                placeholder="Busque por jogos, contas, gift cards..." 
                className="w-full h-16 pl-14 pr-4 bg-slate-900/80 border-slate-700 text-white text-lg rounded-xl focus:border-red-500 focus:ring-red-500/20 shadow-xl"
              />
            </div>
            <Button className="h-16 px-8 bg-red-600 hover:bg-red-700 text-white rounded-xl text-lg font-bold shrink-0 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
              Buscar
            </Button>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section id="categorias" className="py-12 bg-slate-900/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Gamepad2 className="text-red-500 w-6 h-6" /> Categorias Populares
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <div 
                key={cat.name}
                className="bg-slate-900 border border-slate-800 hover:border-red-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-slate-800/50 group"
              >
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                  {cat.icon}
                </div>
                <span className="text-sm font-semibold text-slate-300 text-center">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Listings (Anúncios) */}
      <section id="anuncios" className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Tag className="text-red-500 w-8 h-8" /> Últimos Anúncios
              </h2>
              <p className="text-slate-400">Descubra as melhores ofertas da comunidade.</p>
            </div>
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hidden md:flex" onClick={() => navigate("/digital")}>
              Ver todos
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {allListings.length > 0 ? allListings.map((listing: any) => (
              <div 
                key={`${listing._type}-${listing.id}`}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-red-500/40 transition-all group flex flex-col h-full cursor-pointer"
                onClick={() => navigate(listing._type === 'digital' ? '/digital' : '/usados')}
              >
                <div className="h-40 bg-slate-800 relative overflow-hidden">
                  {listing.images && listing.images.length > 0 ? (
                    <img src={listing.images[0]} alt={listing.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-800/50">
                      <Gamepad2 className="w-12 h-12 opacity-50" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-slate-950/80 backdrop-blur-md text-[10px] uppercase font-bold text-white rounded">
                    {listing._type === 'digital' ? 'Mídia Digital' : 'Usado'}
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="text-white font-medium line-clamp-2 mb-2 group-hover:text-red-400 transition-colors">
                    {listing.name}
                  </h3>
                  <div className="mt-auto flex items-end justify-between pt-4 border-t border-slate-800">
                    <span className="text-2xl font-black text-white">
                      <span className="text-sm text-slate-500 font-normal">R$</span> {Number(listing.price).toFixed(2)}
                    </span>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4">
                      Comprar
                    </Button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center">
                <Tag className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl text-slate-400">Nenhum anúncio encontrado ainda.</h3>
              </div>
            )}
          </div>
          
          <Button variant="outline" className="border-slate-700 text-slate-300 w-full mt-6 md:hidden" onClick={() => navigate("/digital")}>
            Ver todos
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-12 mt-10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">🔥</div>
            <span className="text-xl font-bold text-white">EFORTE<span className="text-red-500">GAMES</span></span>
          </div>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Plataforma segura para negociações de contas, itens e jogos. O dinheiro só é liberado após a confirmação do comprador.
          </p>
          <div className="text-slate-600 text-sm">
            <p>&copy; 2026 EFORTE GAMES. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
