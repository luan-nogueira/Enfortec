import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Zap, Gamepad2, Users, TrendingUp, ShoppingCart, Flame } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, isAuthenticated, isAdmin, isCollaborator } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="bg-slate-950/80 backdrop-blur-md border-b border-red-700/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">🔥</div>
            <span className="text-2xl font-bold text-neon">EFORTE GAMES</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#loja" className="text-slate-300 hover:text-red-500 font-medium transition">Loja</a>
            <a href="#usados" className="text-slate-300 hover:text-red-500 font-medium transition">Usados</a>
            <a href="#digital" className="text-slate-300 hover:text-red-500 font-medium transition">Digital</a>
            <a href="#vender" className="text-slate-300 hover:text-red-500 font-medium transition">Vender</a>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">{user?.name}</span>
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="border-red-600 bg-red-600/10 text-red-500 font-black flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Gestão
                  </Button>
                )}
                {isCollaborator && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/colaborador")} className="border-red-700/50 hover:border-red-600 bg-slate-900 text-white">
                    Portal do Colaborador
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => navigate("/vendedor")} className="border-red-700/50 hover:border-red-600">
                  Meu Painel
                </Button>
              </div>
            ) : (
              <Button size="sm" className="bg-red-700 hover:bg-red-800 btn-neon" onClick={() => navigate("/login")}>
                <Zap className="w-5 h-5 mr-2" />
                Entrar
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
            <span className="text-neon">Compre, Venda</span>
            <br />
            <span className="text-white">e Ganhe com</span>
            <br />
            <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">EFORTE GAMES</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8">
            A plataforma 3 em 1 que reúne loja própria, marketplace de usados e mídia digital. Tudo em um só lugar.
          </p>
          <div className="flex gap-4">
            <Button size="lg" className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold btn-neon" onClick={() => navigate("/loja")}>
              <ShoppingCart className="w-5 h-5 mr-2" />
              Começar a Comprar
            </Button>
            <Button size="lg" variant="outline" className="border-red-700/50 hover:border-red-600 text-red-500" onClick={() => navigate("/login")}>
              <Zap className="w-5 h-5 mr-2" />
              Virar Vendedor
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-8 text-white card-neon">
            <ShoppingCart className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">Loja Própria</h3>
            <p className="text-sm text-red-100">Produtos novos com garantia</p>
          </div>
          <div className="bg-gradient-to-br from-red-700 to-red-800 rounded-lg p-8 text-white card-neon">
            <Users className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">Marketplace</h3>
            <p className="text-sm text-red-100">Compre e venda usados</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-8 text-white card-neon">
            <Gamepad2 className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">Mídia Digital</h3>
            <p className="text-sm text-red-100">Jogos, licenças e gift cards</p>
          </div>
          <div className="bg-gradient-to-br from-red-800 to-red-900 rounded-lg p-8 text-white card-neon">
            <TrendingUp className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">Ganhe</h3>
            <p className="text-sm text-red-100">Revenda e ganhe comissão</p>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section id="loja" className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">
            <span className="text-neon">Por que escolher</span> EFORTE GAMES?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-neon p-8">
              <Zap className="w-12 h-12 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Rápido e Seguro</h3>
              <p className="text-slate-300">Pagamentos seguros via Mercado Pago com proteção total do comprador e vendedor.</p>
            </div>
            <div className="card-neon p-8">
              <Flame className="w-12 h-12 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Comunidade Gamer</h3>
              <p className="text-slate-300">Conecte-se com milhares de gamers. Compre, venda e troque com segurança.</p>
            </div>
            <div className="card-neon p-8">
              <TrendingUp className="w-12 h-12 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Ganhe Dinheiro</h3>
              <p className="text-slate-300">Venda seus produtos e ganhe comissão. Receba automaticamente no seu Mercado Pago.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="usados" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">
            <span className="text-neon">Explore</span> as Categorias
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Store */}
            <div 
              className="card-neon p-8 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => navigate("/loja")}
            >
              <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-6 mb-4">
                <ShoppingCart className="w-16 h-16 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Loja Própria</h3>
              <p className="text-slate-300 mb-4">Produtos novos com garantia e entrega segura.</p>
              <Button className="w-full bg-red-700 hover:bg-red-800">Explorar Loja</Button>
            </div>

            {/* Used Marketplace */}
            <div 
              className="card-neon p-8 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => navigate("/usados")}
            >
              <div className="bg-gradient-to-br from-red-700 to-red-800 rounded-lg p-6 mb-4">
                <Users className="w-16 h-16 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Marketplace Usados</h3>
              <p className="text-slate-300 mb-4">Compre e venda produtos usados com segurança.</p>
              <Button className="w-full bg-red-700 hover:bg-red-800">Explorar Usados</Button>
            </div>

            {/* Digital Media */}
            <div 
              className="card-neon p-8 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => navigate("/digital")}
            >
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 mb-4">
                <Gamepad2 className="w-16 h-16 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Mídia Digital</h3>
              <p className="text-slate-300 mb-4">Jogos, gift cards e licenças com entrega instantânea.</p>
              <Button className="w-full bg-red-700 hover:bg-red-800">Explorar Digital</Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="vender" className="py-20 bg-gradient-to-r from-red-700/20 to-red-600/20 border-y border-red-700/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Pronto para <span className="text-neon">Ganhar Dinheiro?</span>
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Torne-se um vendedor na EFORTE GAMES e comece a ganhar dinheiro vendendo seus produtos usados ou digitais.
          </p>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold btn-neon"
            onClick={() => navigate("/login")}
          >
            <Zap className="w-5 h-5 mr-2" />
            Começar Agora
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-red-700/20 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-sm">🔥</div>
              <span className="text-lg font-bold text-neon">EFORTE GAMES</span>
            </div>
              <p className="text-slate-400 text-sm">A plataforma 3 em 1 para gamers.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Plataforma</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-red-500 transition">Loja</a></li>
                <li><a href="#" className="hover:text-red-500 transition">Marketplace</a></li>
                <li><a href="#" className="hover:text-red-500 transition">Digital</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Suporte</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-red-500 transition">Contato</a></li>
                <li><a href="#" className="hover:text-red-500 transition">FAQ</a></li>
                <li><a href="#" className="hover:text-red-500 transition">Termos</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 italic uppercase tracking-widest text-sm">Contato</h4>
              <div className="space-y-4">
                <Button 
                  onClick={() => window.open("https://wa.me/5543984253691", "_blank")}
                  className="w-full bg-[#25D366] hover:bg-[#20ba56] text-white font-black rounded-xl h-12 flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(37,211,102,0.3)] transition-all active:scale-95"
                >
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.143c1.589.943 3.383 1.44 5.212 1.441l.001.001c5.441 0 9.868-4.427 9.871-9.869.001-2.637-1.03-5.112-2.905-6.987-1.875-1.875-4.35-2.907-6.991-2.908-5.442 0-9.87 4.427-9.872 9.869-.001 1.93.539 3.813 1.562 5.443l-.1.524-1.031 3.761 3.854-1.011.514-.103zm10.274-13.31c-.19-.424-.385-.433-.564-.441l-.485-.009c-.167 0-.44.063-.67.319-.23.256-.88.859-.88 2.098 0 1.239.902 2.434 1.028 2.603.126.169 1.774 2.709 4.3 3.803.601.26 1.07.415 1.435.531.603.192 1.152.165 1.587.1.485-.072 1.492-.61 1.701-1.2.209-.59.209-1.096.146-1.2-.063-.103-.23-.167-.485-.295-.256-.126-1.492-.736-1.722-.819-.23-.083-.398-.126-.564.126-.167.256-.648.819-.795.987-.147.169-.294.188-.55.063-.256-.126-1.08-.398-2.055-1.268-.758-.677-1.27-1.512-1.417-1.769-.147-.256-.015-.395.112-.522.115-.113.256-.295.385-.441.129-.147.172-.25.256-.415.083-.167.042-.314-.021-.441-.063-.126-.564-1.36-.773-1.867z"/>
                  </svg>
                  Chamar no WhatsApp
                </Button>
                <div className="flex flex-col items-center">
                   <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">~Efortegames</p>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-500 text-sm">
            <p>&copy; 2026 EFORTE GAMES. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
