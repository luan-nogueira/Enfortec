import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Zap, Gamepad2, Search, Shield, Package, LayoutGrid, Tag, Coins, LogOut, HelpCircle, Home as HomeIcon, Instagram, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, PlusCircle, Swords, Compass, Trophy, Gauge, Crosshair, Flame, ShoppingCart, Star, Menu, ArrowRight } from "lucide-react";
import { getLoginUrl } from "@/const";
import UserProfileButton from "@/components/UserProfileButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
const DEFAULT_MAIN_BANNERS = [
  {
    id: "default-fortecoins",
    title: "💰 Sistema de Fidelidade ForteCoins!",
    description: "Indique amigos e ganhe 15 ForteCoins! Use suas moedas para abater no valor das suas compras no nosso marketplace.",
    imageUrl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=1200",
    link: "/fortecoins",
    expiresAt: null
  },
  {
    id: "default-digital",
    title: "🎮 Os Melhores Jogos em Mídia Digital",
    description: "Ativação rápida e segura. Compre Gift Cards e jogos de PS4/PS5 no precinho com cashback de 7 ForteCoins por compra!",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200",
    link: "/digital",
    expiresAt: null
  },
  {
    id: "default-usados",
    title: "📦 Desapegos e Produtos Físicos Usados",
    description: "Filtre produtos por Estado e Cidade. Compre e venda com a comunidade local com segurança.",
    imageUrl: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=1200",
    link: "/usados",
    expiresAt: null
  }
];

const DEFAULT_SIDEBAR_TOP = {
  id: "default-sidebar-top",
  title: "🎮 Portal de Revenda – Venda seus Jogos",
  description: "Anuncie e desapegue dos seus jogos em mídia digital de PS4 e PS5 com total segurança de escrow da Eforte Games.",
  imageUrl: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=600",
  link: "/virar-vendedor",
  expiresAt: null
};

const DEFAULT_SIDEBAR_BOTTOM = {
  id: "default-sidebar-bottom",
  title: "🎁 Indique e Ganhe ForteCoins",
  description: "Troque por prêmios, jogos, ou descontos em suas compras!",
  imageUrl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=600",
  link: "/fortecoins",
  expiresAt: null
};

const DEFAULT_SIDEBAR_PLATINADOR = {
  id: "default-sidebar-platinador",
  title: "🏆 Clube Platinador",
  description: "Cumpra desafios semanais, ganhe ForteCoins e compita no nosso Ranking de Platinas!",
  imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600",
  link: "/platinador",
  expiresAt: null
};


function BannerCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(expiresAt) - +new Date();
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTime());
    const timer = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const padZero = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="inline-flex gap-2 items-center bg-red-600/30 backdrop-blur-md px-3 py-1.5 rounded-lg border border-red-500/30 text-white font-bold text-[10px] sm:text-xs">
      <span>OFERTA TERMINA EM:</span>
      <span className="bg-slate-950/80 px-2 py-0.5 rounded text-red-500 font-mono">{timeLeft.days}D</span>
      <span className="bg-slate-950/80 px-2 py-0.5 rounded text-red-500 font-mono">{padZero(timeLeft.hours)}h</span>
      <span className="bg-slate-950/80 px-2 py-0.5 rounded text-red-500 font-mono">{padZero(timeLeft.minutes)}m</span>
      <span className="bg-slate-950/80 px-2 py-0.5 rounded text-red-500 font-mono">{padZero(timeLeft.seconds)}s</span>
    </div>
  );
}

export default function Home() {
  const { user, isAuthenticated, isAdmin, isCollaborator, logout } = useAuth();
  const [, navigate] = useLocation();

  const [usedProducts, setUsedProducts] = useState<any[]>([]);
  const [digitalProducts, setDigitalProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [heroSearch, setHeroSearch] = useState("");
  const [activeListingTab, setActiveListingTab] = useState<"todos" | "digital" | "fisico" | "assinatura" | "primaria" | "secundaria">("todos");

  const [promos, setPromos] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const qPromos = collection(db, "promos");
    const unsubPromos = onSnapshot(qPromos, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => p.isActive !== false)
        .sort((a: any, b: any) => {
          const tA = a.createdAt?.toMillis?.() || 0;
          const tB = b.createdAt?.toMillis?.() || 0;
          return tB - tA;
        });
      setPromos(data);
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Sem permissão para ler promos (regras do Firestore não deployadas). Usando promos padrão.");
      } else {
        console.error("Erro ao buscar promos na Home:", error);
      }
    });
    return () => unsubPromos();
  }, []);

  // Filter promos by position — exclude platinador banners from main carousel
  const mainPromos = promos.filter((p: any) =>
    (p.position === "main" || !p.position) &&
    p.position !== "platinador" &&
    p.link !== "/platinador" &&
    p.type !== "platinador"
  );
  const sidebarTopPromo = promos.find((p: any) => p.position === "sidebar_top");
  const sidebarBottomPromo = promos.find((p: any) => p.position === "sidebar_bottom");
  const sidebarPlatinadorPromo = promos.find((p: any) => p.position === "platinador");

  // Imagem escura e neutra de um controle (evita fotos aleatórias de pessoas quando a imagem original quebra)
  const FALLBACK_GAME_IMAGE = "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=1200";

  // Mix dynamic games from the database into the slides as requested by the user
  const dbGameBanners = digitalProducts.map(game => {
    let imageUrl = game.imageUrl;
    return {
      id: `game-banner-${game.id}`,
      title: game.name,
      description: `💥 Jogo de Mídia Digital de alta performance para ${game.platform || "PS4/PS5"}. Compre no precinho com cashback de 7 ForteCoins!`,
      imageUrl: imageUrl || FALLBACK_GAME_IMAGE,
      link: `/digital?search=${encodeURIComponent(game.name)}`,
      expiresAt: null
    };
  });

  const activeBanners = [
    ...mainPromos,
    ...dbGameBanners.slice(0, 5) // Mostra apenas os 5 primeiros jogos para não poluir o banner
  ];
  const finalBanners = activeBanners.length > 0 ? activeBanners : DEFAULT_MAIN_BANNERS;

  const sidebarTopBanner = sidebarTopPromo || DEFAULT_SIDEBAR_TOP;
  const sidebarBottomBanner = sidebarBottomPromo || DEFAULT_SIDEBAR_BOTTOM;
  const sidebarPlatinadorBanner = sidebarPlatinadorPromo || DEFAULT_SIDEBAR_PLATINADOR;

  useEffect(() => {
    if (finalBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % finalBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [finalBanners.length]);

  useEffect(() => {
    setCurrentSlide(0);
  }, [finalBanners.length]);

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % finalBanners.length);
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + finalBanners.length) % finalBanners.length);
  };

  useEffect(() => {
    // Buscar usados
    const qUsed = query(collection(db, "used_products"), orderBy("createdAt", "desc"), limit(12));
    const unsubUsed = onSnapshot(qUsed, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsedProducts(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao buscar usados na Home:", error);
    });

    // Buscar digitais
    const qDigital = query(collection(db, "digital_products"));
    const unsubDigital = onSnapshot(qDigital, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((p: any) => p.isActive !== false);
      setDigitalProducts(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao buscar digitais na Home:", error);
    });

    return () => {
      unsubUsed();
      unsubDigital();
    };
  }, []);

  // Últimos anúncios: digitais + físicos usados
  const allListings = [
    ...digitalProducts.map((p: any) => ({ ...p, _type: 'digital' })),
    ...usedProducts.map((p: any) => ({ ...p, _type: 'used' }))
  ].sort((a: any, b: any) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  }).slice(0, 24);

  const categories = [
    { name: "Assinaturas", icon: Sparkles, color: "from-amber-500 to-yellow-600" },
    { name: "Ação", icon: Swords, color: "from-red-500 to-red-600" },
    { name: "Aventura", icon: Compass, color: "from-blue-500 to-blue-600" },
    { name: "RPG", icon: Shield, color: "from-purple-500 to-purple-600" },
    { name: "Esportes", icon: Trophy, color: "from-green-500 to-green-600" },
    { name: "Corrida", icon: Gauge, color: "from-orange-500 to-orange-600" },
    { name: "Tiro / FPS", icon: Crosshair, color: "from-slate-500 to-slate-700" },
    { name: "Pré Venda", icon: Flame, color: "from-orange-500 to-yellow-500" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden w-full max-w-full">
      {/* Navigation */}
      <nav className="nav-glass sticky top-0 z-50 border-b border-slate-800/80">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex justify-between items-center gap-3">
          
          {/* Logo & Desktop Menu Drawer Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
              <img src="/logo.png" alt="Eforte Games Logo" className="w-9 h-9 object-contain rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.3)] border border-slate-800 bg-slate-950" />
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">EFORTE<span className="text-red-500">GAMES</span></span>
            </div>

            {/* Desktop & Mobile Sheet Drawer Trigger Button */}
            <Sheet>
              <SheetTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:bg-slate-800 text-xs font-bold text-slate-200 transition-all shadow-sm">
                  <Menu className="w-4 h-4 text-red-500" />
                  <span className="hidden sm:inline">Menu & Categorias</span>
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-slate-950 border-r border-slate-800 text-white w-80 sm:w-96 p-0 overflow-y-auto">
                <SheetHeader className="p-5 border-b border-slate-800 bg-slate-900/60">
                  <div className="flex items-center gap-2.5">
                    <img src="/logo.png" alt="Eforte Games" className="w-8 h-8 object-contain rounded bg-slate-950 border border-slate-800" />
                    <SheetTitle className="text-lg font-black text-white tracking-tight">
                      EFORTE<span className="text-red-500">GAMES</span>
                    </SheetTitle>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Navegação completa da plataforma</p>
                </SheetHeader>

                <div className="p-4 space-y-6">
                  {/* Category 1 */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2">🎮 Mídias Digitais & Contas</h4>
                    <div className="space-y-1">
                      <a href="/jogue-com-economia" className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-900 text-xs font-bold text-red-400 hover:text-red-300 transition-colors border border-red-950/40">
                        <span className="flex items-center gap-2.5"><Zap className="w-4 h-4 text-red-500 animate-pulse" /> Jogue com Economia (Secundárias)</span>
                        <span className="bg-red-600/30 text-red-400 text-[9px] px-1.5 py-0.5 rounded font-black">OFERTAS</span>
                      </a>
                      <a href="/digital" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white transition-colors">
                        <Gamepad2 className="w-4 h-4 text-purple-400" /> Mídias Digitais & Gift Cards
                      </a>
                      <a href="/digital?type=assinatura" className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-900 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors">
                        <span className="flex items-center gap-2.5"><Sparkles className="w-4 h-4 text-amber-400" /> Assinaturas (PS Plus / Game Pass)</span>
                        <span className="bg-amber-500/20 text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-black">VIP</span>
                      </a>
                    </div>
                  </div>

                  {/* Category 2 */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2">📦 Físicos, Consoles & Acessórios</h4>
                    <div className="space-y-1">
                      <a href="/usados" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white transition-colors">
                        <ShoppingCart className="w-4 h-4 text-blue-400" /> Desapegos de Jogos Físicos & Consoles
                      </a>
                      <a href="/usados" className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-900 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors border border-blue-950/40">
                        <span className="flex items-center gap-2.5"><Package className="w-4 h-4 text-blue-400" /> Mídia Física / Consoles Diversos</span>
                        <span className="bg-blue-600/30 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-black">NOVO</span>
                      </a>
                      <a href="/loja" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white transition-colors">
                        <Package className="w-4 h-4 text-emerald-400" /> Loja Oficial Eforte
                      </a>
                      <a href="/usados/anunciar" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white transition-colors">
                        <PlusCircle className="w-4 h-4 text-slate-400" /> Anunciar meu Item Físico
                      </a>
                    </div>
                  </div>

                  {/* Category 3 */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2">⭐ Clube & Benefícios</h4>
                    <div className="space-y-1">
                      <a href="/platinador" className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-900 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors border border-amber-950/40">
                        <span className="flex items-center gap-2.5"><Trophy className="w-4 h-4 text-amber-400" /> Clube do Platinador (R$ 35/mês)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                      <a href="/virar-vendedor" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white transition-colors">
                        <Zap className="w-4 h-4 text-red-500" /> Vender minha conta EforteGames (35%)
                      </a>
                      <a href="/fortecoins" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-900 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors">
                        <Coins className="w-4 h-4 text-amber-400" /> ForteCoins & Fidelidade
                      </a>
                    </div>
                  </div>

                  {/* Category 4 */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2">❓ Suporte & Avaliações</h4>
                    <div className="space-y-1">
                      <a href="/avaliacoes" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white transition-colors">
                        <Star className="w-4 h-4 text-yellow-500" /> Avaliações dos Clientes
                      </a>
                      <a href="/promocoes" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white transition-colors">
                        <Flame className="w-4 h-4 text-orange-500" /> Promoções Imperdíveis
                      </a>
                      <a href="/faq" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white transition-colors">
                        <HelpCircle className="w-4 h-4 text-slate-400" /> FAQ / Central de Ajuda
                      </a>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Desktop Clean Main Links (Requirement: Organizado e Sem Poluição) */}
          <div className="hidden lg:flex items-center gap-4 text-xs xl:text-sm font-medium">
            <a href="/jogue-com-economia" className="text-red-400 hover:text-red-300 font-bold transition flex items-center gap-1.5 whitespace-nowrap bg-red-950/40 border border-red-800/40 px-3 py-1 rounded-full">
              <Zap className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Jogue com Economia
            </a>
            <a href="/usados" className="text-blue-400 hover:text-blue-300 font-bold transition flex items-center gap-1.5 whitespace-nowrap bg-blue-950/30 border border-blue-800/30 px-3 py-1 rounded-full">
              <Package className="w-3.5 h-3.5 text-blue-400" /> Mídia Física
            </a>
            <a href="/digital?type=assinatura" className="text-amber-400 hover:text-amber-300 font-bold transition flex items-center gap-1.5 whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Assinaturas
            </a>
            <a href="/platinador" className="text-amber-400 hover:text-amber-300 font-bold transition flex items-center gap-1.5 whitespace-nowrap bg-amber-950/30 border border-amber-800/30 px-3 py-1 rounded-full">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Clube Platinador
            </a>
          </div>
          
          {/* Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-900 text-xs px-2.5 h-8 hidden sm:flex" onClick={() => navigate("/fortecoins")}>
                  <Coins className="w-3.5 h-3.5 mr-1.5 text-red-500" /> {user?.forteCoins ?? 0} FC
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-900 text-xs px-2.5 h-8 hidden md:flex" onClick={() => navigate("/minhas-compras")}>
                  <Package className="w-3.5 h-3.5 mr-1.5" /> Compras
                </Button>
                <UserProfileButton />
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-900 text-xs" onClick={() => navigate("/login")}>
                  Entrar
                </Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 shadow-[0_0_10px_rgba(220,38,38,0.3)]" onClick={() => navigate("/login")}>
                  Cadastrar
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Banner Carousel Section */}
      <section className="relative pt-6 pb-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-red-950/8 via-transparent to-slate-950" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-900/5 rounded-full blur-3xl" />
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-red-800/4 rounded-full blur-2xl" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left side: Banner Carousel Container */}
            <div className="lg:col-span-2 relative w-full h-[240px] sm:h-[380px] md:h-[420px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] group/carousel">
              
              {/* Slides */}
              {finalBanners.map((banner, index) => (
                <div
                  key={banner.id}
                  onClick={() => navigate(banner.link || "/")}
                  className={`absolute inset-0 w-full h-full cursor-pointer transition-all duration-700 ease-in-out ${
                    index === currentSlide ? "opacity-100 scale-100 z-10" : "opacity-0 scale-95 pointer-events-none z-0"
                  }`}
                >
                  {/* Background Image */}
                  {banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover brightness-[0.35] group-hover/carousel:scale-[1.01] transition-transform duration-700"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_GAME_IMAGE;
                        e.currentTarget.onerror = null;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-950 to-slate-900" />
                  )}

                  {/* Content Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent flex flex-col justify-end p-6 sm:p-10 text-left">
                    <div className="max-w-2xl space-y-2 sm:space-y-3">
                      {/* Countdown Timer if available */}
                      {banner.expiresAt && <BannerCountdown expiresAt={banner.expiresAt} />}
                      
                      <h2 className="text-lg sm:text-2xl md:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {banner.title}
                      </h2>
                      <p className="text-[10px] sm:text-xs md:text-sm text-slate-300 line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] max-w-xl">
                        {banner.description || banner.title}
                      </p>
                      
                      <div className="pt-1">
                        <Button className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-1.5 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all hover:scale-105">
                          Aproveitar Oferta
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Navigation Arrows */}
              {finalBanners.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevSlide();
                    }}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-950/70 hover:bg-red-600/90 text-white flex items-center justify-center border border-slate-800 hover:border-red-500/30 backdrop-blur-sm transition-all duration-300 z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextSlide();
                    }}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-950/70 hover:bg-red-600/90 text-white flex items-center justify-center border border-slate-800 hover:border-red-500/30 backdrop-blur-sm transition-all duration-300 z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </>
              )}

              {/* Dot Indicators */}
              {finalBanners.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                  {finalBanners.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlide(i);
                      }}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === currentSlide ? "bg-red-500 w-4" : "bg-slate-500/60 hover:bg-slate-400"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right side: Sidebar Banners */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 lg:grid-rows-3 gap-3 sm:gap-4 lg:h-[420px]">
              {/* Top Banner Card */}
              <div
                onClick={() => navigate(sidebarTopBanner.link || "/")}
                className="relative h-[110px] sm:h-[130px] lg:h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-lg hover:border-red-500/30 hover:shadow-[0_0_20px_rgba(220,38,38,0.1)] transition-all duration-300 group/sidebar cursor-pointer flex flex-col justify-end p-4 sm:p-5"
              >
                {sidebarTopBanner.imageUrl ? (
                  <img
                    src={sidebarTopBanner.imageUrl}
                    alt={sidebarTopBanner.title}
                    className="absolute inset-0 w-full h-full object-cover brightness-[0.4] group-hover/sidebar:scale-[1.02] transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_GAME_IMAGE;
                      e.currentTarget.onerror = null;
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-red-950 to-slate-900" />
                )}
                <div className="relative z-10 space-y-0.5 sm:space-y-1 text-left">
                  {sidebarTopBanner.expiresAt && <BannerCountdown expiresAt={sidebarTopBanner.expiresAt} />}
                  <h3 className="text-xs sm:text-sm lg:text-base font-black text-white leading-tight drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]">
                    {sidebarTopBanner.title}
                  </h3>
                  <p className="text-[9px] sm:text-[10px] lg:text-xs text-slate-300 line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] max-w-md">
                    {sidebarTopBanner.description || sidebarTopBanner.title}
                  </p>
                </div>
              </div>

              {/* Middle Banner Card */}
              <div
                onClick={() => navigate(sidebarBottomBanner.link || "/")}
                className="relative h-[110px] sm:h-[130px] lg:h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-lg hover:border-red-500/30 hover:shadow-[0_0_20px_rgba(220,38,38,0.1)] transition-all duration-300 group/sidebar cursor-pointer flex flex-col justify-end p-4 sm:p-5"
              >
                {sidebarBottomBanner.imageUrl ? (
                  <img
                    src={sidebarBottomBanner.imageUrl}
                    alt={sidebarBottomBanner.title}
                    className="absolute inset-0 w-full h-full object-cover brightness-[0.4] group-hover/sidebar:scale-[1.02] transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_GAME_IMAGE;
                      e.currentTarget.onerror = null;
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-red-950 to-slate-900" />
                )}
                <div className="relative z-10 space-y-0.5 sm:space-y-1 text-left">
                  {sidebarBottomBanner.expiresAt && <BannerCountdown expiresAt={sidebarBottomBanner.expiresAt} />}
                  <h3 className="text-xs sm:text-sm lg:text-base font-black text-white leading-tight drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]">
                    {sidebarBottomBanner.title}
                  </h3>
                  <p className="text-[9px] sm:text-[10px] lg:text-xs text-slate-300 line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] max-w-md">
                    {sidebarBottomBanner.description || sidebarBottomBanner.title}
                  </p>
                </div>
              </div>
              
              {/* Bottom Banner Card (Platinador) */}
              <div
                onClick={() => navigate(sidebarPlatinadorBanner.link || "/platinador")}
                className="relative h-[110px] sm:h-[130px] lg:h-full bg-slate-900 rounded-2xl overflow-hidden border border-amber-500/30 shadow-lg hover:border-amber-400/50 hover:shadow-[0_0_20px_rgba(251,191,36,0.15)] transition-all duration-300 group/sidebar cursor-pointer flex flex-col justify-end p-4 sm:p-5"
              >
                {sidebarPlatinadorBanner.imageUrl ? (
                  <img
                    src={sidebarPlatinadorBanner.imageUrl}
                    alt={sidebarPlatinadorBanner.title}
                    className="absolute inset-0 w-full h-full object-cover brightness-[0.4] group-hover/sidebar:scale-[1.02] transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_GAME_IMAGE;
                      e.currentTarget.onerror = null;
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-950 to-slate-900" />
                )}
                <div className="relative z-10 space-y-0.5 sm:space-y-1 text-left">
                  {sidebarPlatinadorBanner.expiresAt && <BannerCountdown expiresAt={sidebarPlatinadorBanner.expiresAt} />}
                  <h3 className="text-xs sm:text-sm lg:text-base font-black text-amber-400 leading-tight drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]">
                    {sidebarPlatinadorBanner.title}
                  </h3>
                  <p className="text-[9px] sm:text-[10px] lg:text-xs text-slate-300 line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] max-w-md">
                    {sidebarPlatinadorBanner.description || sidebarPlatinadorBanner.title}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search bar below the banner */}
          <div className="max-w-3xl mx-auto mt-6 flex flex-col sm:flex-row gap-2 relative">
            <div className="relative w-full">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-6 sm:h-6 text-slate-500" />
              <Input 
                type="text" 
                placeholder="Busque por jogos, gift cards..." 
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && heroSearch.trim()) navigate(`/digital?search=${encodeURIComponent(heroSearch.trim())}`); }}
                className="w-full h-11 sm:h-16 pl-9 sm:pl-14 pr-4 bg-slate-900/80 border-slate-800 text-white text-sm sm:text-lg rounded-xl focus:border-red-500 focus:ring-red-500/20 shadow-xl"
              />
            </div>
            <Button
              className="h-11 sm:h-16 px-5 sm:px-8 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm sm:text-lg font-bold shrink-0 shadow-[0_0_20px_rgba(220,38,38,0.4)] w-full sm:w-auto"
              onClick={() => { if (heroSearch.trim()) navigate(`/digital?search=${encodeURIComponent(heroSearch.trim())}`); }}
            >
              Buscar
            </Button>
          </div>

          {/* Quick Search Pills & Console Filter Pills */}
          <div className="max-w-4xl mx-auto mt-4 px-4 pb-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-slate-400">
              <span className="font-bold text-slate-500 shrink-0">Buscas populares:</span>
              <div className="flex sm:flex-wrap items-center gap-2 overflow-x-auto sm:overflow-visible w-full sm:w-auto py-1 scrollbar-none justify-start sm:justify-center max-w-full">
                {[
                  { label: "Gift Cards PSN", url: "/digital?search=Gift+Card+PSN" },
                  { label: "PS Plus / Game Pass", url: "/digital?type=assinatura" },
                  { label: "Gift Cards Xbox", url: "/digital?search=Gift+Card+Xbox" },
                ].map((pill) => (
                  <button
                    key={pill.label}
                    onClick={() => navigate(pill.url)}
                    className="bg-slate-900/60 border border-slate-800 hover:border-red-500/40 hover:text-white px-3 py-1.5 rounded-full transition-all text-xs font-semibold cursor-pointer active:scale-95 whitespace-nowrap shrink-0 snap-start"
                  >
                    🔥 {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Console Pills — atalho direto para o catálogo já filtrado */}
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Filtrar Console:</span>
              {[
                { id: null, label: "🎮 Todos Consoles" },
                { id: "PS5", label: "🔵 PS5" },
                { id: "PS4", label: "🔷 PS4" },
                { id: "Xbox", label: "🟢 Xbox" },
                { id: "Switch", label: "🔴 Switch" },
              ].map((plat) => (
                <button
                  key={plat.label}
                  onClick={() => navigate(plat.id ? `/digital?platform=${plat.id}` : "/digital")}
                  className="px-3 py-1 rounded-lg text-xs font-bold transition-all bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95"
                >
                  {plat.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Popular Categories */}
      <section id="categorias" className="py-6 sm:py-12 bg-slate-900/30">
        <div className="container mx-auto px-4">
          <h2 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
            <Gamepad2 className="text-red-500 w-5 h-5 sm:w-6 sm:h-6" /> Categorias Populares
          </h2>
          <div className="flex lg:grid lg:grid-cols-7 overflow-x-auto lg:overflow-x-visible gap-2 sm:gap-3 pb-4 lg:pb-0 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {categories.map((cat) => (
              <div 
                key={cat.name}
                onClick={() => navigate(`/digital?genre=${encodeURIComponent(cat.name)}`)}
                className="bg-slate-900/80 border border-slate-800/80 hover:border-red-500/40 rounded-xl p-2.5 sm:p-4 flex flex-col items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all hover:bg-slate-800/60 group hover:shadow-[0_0_20px_rgba(220,38,38,0.12)] hover:-translate-y-1 min-w-[90px] sm:min-w-[110px] lg:min-w-0 shrink-0 snap-start"
              >
                <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <cat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-[9px] sm:text-xs font-semibold text-slate-300 text-center">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Listings (Anúncios) */}
      <section id="anuncios" className="py-8 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-5 sm:mb-8 gap-4">
            <div>
              <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
                <Tag className="text-red-500 w-5 h-5 sm:w-8 sm:h-8" /> Últimos Anúncios
              </h2>
              <p className="text-slate-400 text-xs sm:text-base">Filtre por tipo de produto para não misturar anúncios.</p>
            </div>

            {/* Tab Filter Control */}
            <div className="flex items-center gap-1 sm:gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 self-stretch sm:self-auto overflow-x-auto">
              {[
                { id: "todos", label: "Todos os Digitais" },
                { id: "digital", label: "🎮 Jogos Digitais" },
                { id: "assinatura", label: "⭐ Assinaturas" },
                { id: "primaria", label: "👤 Contas Primárias" },
                { id: "secundaria", label: "👥 Contas Secundárias" },
                { id: "fisico", label: "📦 Jogos Físicos" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveListingTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    activeListingTab === tab.id
                      ? "bg-red-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex lg:grid lg:grid-cols-4 xl:grid-cols-5 overflow-x-auto lg:overflow-x-visible gap-4 pb-4 lg:pb-0 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {(() => {
              const visibleListings = allListings.filter((listing: any) => {
                if (activeListingTab === "digital") return listing._type === 'digital' && listing.type !== 'assinatura';
                if (activeListingTab === "fisico") return listing._type === 'used';
                if (activeListingTab === "assinatura") return listing.type === 'assinatura';
                if (activeListingTab === "primaria" || activeListingTab === "secundaria") {
                  if (listing._type === 'used') return false;
                  const secVal = listing.priceSecondary ?? listing.price_secondary;
                  const hasSec = secVal !== undefined && secVal !== null && secVal !== "" && parseFloat(secVal) > 0;
                  return activeListingTab === "secundaria" ? hasSec : !hasSec;
                }
                // "todos" — todos os digitais (não físicos)
                return listing._type === 'digital';
              });
              return visibleListings.length > 0 ? visibleListings.map((listing: any) => {
              const secVal = listing.priceSecondary ?? listing.price_secondary;
              const hasSec = secVal !== undefined && secVal !== null && secVal !== "" && parseFloat(secVal) > 0;
              const primaryPrice = listing.pricePrimary ? parseFloat(listing.pricePrimary) : (listing.price_primary ? parseFloat(listing.price_primary) : parseFloat(listing.price || 0));
              const secondaryPrice = hasSec ? parseFloat(secVal) : 0;

              const isAssinatura = listing.type === 'assinatura';
              const isDigital = listing._type === 'digital' && !isAssinatura;
              const isFisico = listing._type === 'used';

              return (
                <div 
                  key={`${listing._type}-${listing.id}`}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-red-500/40 transition-all hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgba(220,38,38,0.2)] flex flex-col h-full cursor-pointer min-w-[160px] sm:min-w-[220px] lg:min-w-0 w-[45vw] sm:w-[35vw] lg:w-auto snap-start shrink-0 group game-card-shine"
                  onClick={() => navigate(isFisico ? '/usados' : `/digital?search=${encodeURIComponent(listing.name)}&buy=${listing.id}`)}
                >
                  <div className="h-28 sm:h-40 bg-slate-800 relative overflow-hidden">
                    {listing.imageUrl || (listing.images && listing.images.length > 0) ? (
                      <img 
                        src={listing.imageUrl || listing.images[0]} 
                        alt={listing.name} 
                        className={`w-full h-full ${(listing.coverFit === 'contain' || isFisico) ? 'object-contain bg-slate-900/60 p-2' : 'object-cover'} group-hover:scale-105 transition-transform duration-500`} 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-800/50">
                        <Gamepad2 className="w-8 h-8 sm:w-12 sm:h-12 opacity-50" />
                      </div>
                    )}
                    <div className={`absolute top-1.5 left-1.5 sm:top-2 sm:left-2 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[8px] sm:text-[10px] uppercase font-bold text-white shadow-md backdrop-blur-sm ${
                      isAssinatura
                        ? 'bg-amber-600 border border-amber-500/30'
                        : isFisico
                          ? 'bg-blue-600 border border-blue-500/30'
                          : isDigital 
                            ? 'bg-red-600 border border-red-500/30' 
                            : 'bg-blue-600 border border-blue-500/30'
                    }`}>
                      {isAssinatura ? '⭐ Assinatura VIP' : isFisico ? '📦 Mídia Física' : '🎮 Mídia Digital'}
                    </div>

                    {/* Verified & Cashback Badges */}
                    <div className="absolute bottom-1.5 right-1.5 flex flex-col items-end gap-1">
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 flex flex-col flex-grow">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[9px] font-bold text-green-400 bg-green-950/60 px-1.5 py-0.5 rounded border border-green-800/40 flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" /> Verificado
                      </span>
                    </div>
                    <h3 className="text-white font-medium text-xs sm:text-base line-clamp-2 mb-1.5 sm:mb-2 group-hover:text-red-400 transition-colors">
                      {listing.name}
                    </h3>
                    
                    {/* Bloco de Exibição dos Valores */}
                    <div className="mt-auto pt-2 space-y-1">
                      {isFisico ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-base sm:text-2xl font-black text-white">
                            {listing.price ? (
                              <><span className="text-[10px] sm:text-sm text-slate-500 font-normal">R$</span> {parseFloat(listing.price).toFixed(2).replace('.', ',')}</>
                            ) : (
                              <span className="text-xs sm:text-lg font-bold text-red-500">Ver anúncio</span>
                            )}
                          </span>
                        </div>
                      ) : hasSec ? (
                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 space-y-1">
                          <div className="flex justify-between items-center text-[10px] sm:text-xs">
                            <span className="text-slate-400 font-bold">👤 Primária:</span>
                            <span className="font-black text-red-500">R$ {primaryPrice.toFixed(2).replace('.', ',')}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] sm:text-xs">
                            <span className="text-slate-400 font-bold">👥 Secundária:</span>
                            <span className="font-bold text-slate-300">R$ {secondaryPrice.toFixed(2).replace('.', ',')}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-slate-400 font-bold">👤 Primária:</span>
                          <span className="text-base sm:text-2xl font-black text-white">
                            {primaryPrice === 0 ? (
                              <span className="text-xs sm:text-lg font-bold text-red-500">A definir</span>
                            ) : (
                              <><span className="text-[10px] sm:text-sm text-slate-500 font-normal">R$</span> {primaryPrice.toFixed(2).replace('.', ',')}</>
                            )}
                          </span>
                        </div>
                      )}

                      <Button
                        size="sm"
                        className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg px-2.5 py-1.5 text-[10px] sm:text-xs font-bold btn-neon mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFisico) {
                            navigate('/usados');
                          } else {
                            navigate(`/digital?search=${encodeURIComponent(listing.name)}&buy=${listing.id}`);
                          }
                        }}
                      >
                        {isFisico ? "Ver Anúncio" : primaryPrice === 0 ? "Contatar" : "Comprar / Escolher Conta"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full py-16 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
                <Tag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-400">Nenhum anúncio nesta categoria.</h3>
              </div>
            );
            })()}
          </div>

          <Button variant="outline" className="border-slate-700 text-slate-300 w-full mt-6" onClick={() => navigate("/digital")}>
            Ver Catálogo Completo de Jogos Digitais →
          </Button>
        </div>
      </section>

      {/* Guia Rápido: Como Funciona */}
      <section className="py-8 sm:py-16 bg-slate-950 border-y border-red-700/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight italic mb-2">
              🎮 Guia Rápido: <span className="text-red-500">Como Funciona?</span>
            </h2>
            <p className="text-slate-400 text-xs sm:text-base max-w-2xl mx-auto">
              Entenda em poucos passos as principais funções e recursos de segurança da nossa plataforma.
            </p>
          </div>

          <div className="flex lg:grid lg:grid-cols-4 overflow-x-auto lg:overflow-x-visible gap-4 pb-4 lg:pb-0 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Card 1: Moedas ForteCoins */}
            <div className="bg-slate-900 border border-slate-800 hover:border-red-500/30 rounded-2xl p-6 transition-all hover:shadow-[0_0_15px_rgba(220,38,38,0.1)] flex flex-col justify-between group min-w-[280px] sm:min-w-[320px] lg:min-w-0 w-[85vw] lg:w-auto snap-start shrink-0">
              <div>
                <div className="w-12 h-12 bg-red-600/15 border border-red-500/30 rounded-xl flex items-center justify-center text-red-500 mb-4 group-hover:scale-110 transition-transform">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">ForteCoins (Fidelidade)</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Nossas moedas de fidelidade! Ganhe comprando jogos ou indicando amigos (+15 FC por amigo). Acumule e troque por Gift Cards Steam, PSN e Xbox de graça na loja de resgates.
                </p>
              </div>
              <Button 
                variant="ghost" 
                className="text-red-500 hover:text-red-400 hover:bg-red-950/20 text-xs font-bold w-full justify-start p-0 h-auto"
                onClick={() => navigate("/fortecoins")}
              >
                Ver prêmios & indicar amigo →
              </Button>
            </div>

            {/* Card 2: Vender Contas / Jogos */}
            <div className="bg-slate-900 border border-slate-800 hover:border-red-500/30 rounded-2xl p-6 transition-all hover:shadow-[0_0_15px_rgba(220,38,38,0.1)] flex flex-col justify-between group min-w-[280px] sm:min-w-[320px] lg:min-w-0 w-[85vw] lg:w-auto snap-start shrink-0">
              <div>
                <div className="w-12 h-12 bg-red-600/15 border border-red-500/30 rounded-xl flex items-center justify-center text-red-500 mb-4 group-hover:scale-110 transition-transform">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Venda seus Jogos e Contas</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Deseja desapegar ou revender? Crie sua loja de revendedor, anuncie seus jogos físicos usados ou chaves digitais. Nós gerenciamos o processo e você recebe direto na sua conta.
                </p>
              </div>
              <Button 
                variant="ghost" 
                className="text-red-500 hover:text-red-400 hover:bg-red-950/20 text-xs font-bold w-full justify-start p-0 h-auto"
                onClick={() => navigate("/virar-vendedor")}
              >
                Seja um revendedor →
              </Button>
            </div>

            {/* Card 3: Mídia Digital Rápida */}
            <div className="bg-slate-900 border border-slate-800 hover:border-red-500/30 rounded-2xl p-6 transition-all hover:shadow-[0_0_15px_rgba(220,38,38,0.1)] flex flex-col justify-between group min-w-[280px] sm:min-w-[320px] lg:min-w-0 w-[85vw] lg:w-auto snap-start shrink-0">
              <div>
                <div className="w-12 h-12 bg-red-600/15 border border-red-500/30 rounded-xl flex items-center justify-center text-red-500 mb-4 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Mídia Digital com Garantia</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Compre jogos de PS4, PS5 e Gift Cards no menor preço com ativação garantida em até 24h úteis (ou reembolso). Além disso, todas as compras garantem cashback de 7 ForteCoins!
                </p>
              </div>
              <Button 
                variant="ghost" 
                className="text-red-500 hover:text-red-400 hover:bg-red-950/20 text-xs font-bold w-full justify-start p-0 h-auto"
                onClick={() => navigate("/digital")}
              >
                Explorar mídia digital →
              </Button>
            </div>

            {/* Card 4: Sistema Escrow Protegido */}
            <div className="bg-slate-900 border border-slate-800 hover:border-red-500/30 rounded-2xl p-6 transition-all hover:shadow-[0_0_15px_rgba(220,38,38,0.1)] flex flex-col justify-between group min-w-[280px] sm:min-w-[320px] lg:min-w-0 w-[85vw] lg:w-auto snap-start shrink-0">
              <div>
                <div className="w-12 h-12 bg-red-600/15 border border-red-500/30 rounded-xl flex items-center justify-center text-red-500 mb-4 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Compra Segura (Escrow)</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Aqui você está 100% protegido. O dinheiro do pagamento fica retido de forma segura na plataforma e só é liberado para o vendedor após você confirmar o recebimento do produto.
                </p>
              </div>
              <Button 
                variant="ghost" 
                className="text-red-500 hover:text-red-400 hover:bg-red-950/20 text-xs font-bold w-full justify-start p-0 h-auto"
                onClick={() => navigate("/faq")}
              >
                Tirar dúvidas no FAQ →
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Physical Products Prominent Banner (Requirement 9) */}
      <section className="py-8 bg-slate-950">
        <div className="container mx-auto px-4">
          <div 
            onClick={() => navigate("/usados")}
            className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-red-950/40 to-slate-900 border border-red-600/30 p-6 sm:p-10 shadow-2xl cursor-pointer hover:border-red-500 transition-all group"
          >
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=1200')] bg-cover bg-center opacity-20 mix-blend-overlay group-hover:scale-105 transition-transform duration-700 pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <span className="bg-red-600/30 text-red-400 border border-red-500/40 text-[10px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full inline-block">
                  📦 Espaço de Desapegos Físicos
                </span>
                <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  Revenda seus Jogos Físicos, Consoles e Acessórios!
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                  Encontre e venda mídias físicas em disco de PS4/PS5, videogames, controles originais e colecionáveis com a <strong>Garantia Intermediada Eforte Games (8%)</strong>.
                </p>
              </div>

              <Button className="bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm px-6 py-3 rounded-xl shadow-lg shrink-0">
                Ver Mídias Físicas & Consoles →
              </Button>
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/60 py-12 mt-10 pb-28 lg:pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/30 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent blur-sm" />
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src="/logo.png" alt="Eforte Games Logo" className="w-8 h-8 object-contain rounded-lg border border-slate-800 bg-slate-950" />
            <span className="text-xl font-bold text-white">EFORTE<span className="text-red-500">GAMES</span></span>
          </div>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Plataforma segura para negociações de jogos, gift cards e produtos físicos. O dinheiro só é liberado após a confirmação do comprador.
          </p>
          
          <div className="flex justify-center gap-4 mb-6">
            <a 
              href="https://www.instagram.com/efortegamesdigitais_?igsh=dnl0NW56aHlna29m" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-all duration-300 group bg-slate-900/60 border border-slate-800 hover:border-red-600/30 px-5 py-2.5 rounded-xl hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]"
            >
              <Instagram className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-sm font-semibold tracking-wide">@efortegamesdigitais_</span>
            </a>
          </div>

          <div className="text-slate-600 text-sm flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mt-4">
            <p>&copy; 2026 EFORTE GAMES. Todos os direitos reservados.</p>
            <span className="hidden sm:inline text-slate-800">|</span>
            <a href="/termos" className="text-slate-500 hover:text-red-500 transition-all font-medium">Termos de Uso e Regulamentos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
