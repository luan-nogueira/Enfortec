import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Zap, Gamepad2, Search, Shield, Package, LayoutGrid, Tag, Coins, LogOut, HelpCircle, Home as HomeIcon, Instagram, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, PlusCircle, Swords, Compass, Trophy, Gauge, Crosshair, Flame, Star, Menu, ArrowRight, Clock, Handshake } from "lucide-react";
import { getLoginUrl } from "@/const";
import UserProfileButton from "@/components/UserProfileButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { trpc } from "@/lib/trpc";
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


// Banners sem descrição (ou com descrição igual ao título) repetiam o mesmo texto duas vezes
// em cima da imagem. Só mostra a descrição quando ela realmente acrescenta algo.
function bannerDescription(banner: { title?: string; description?: string }) {
  const description = banner.description?.trim();
  return description && description !== banner.title?.trim() ? description : null;
}

// Capas reais para as seções decorativas: prefere os jogos da lista e, se algum sair do
// catálogo, completa com os primeiros disponíveis para a seção nunca ficar vazia.
function pickCovers(items: { name: string; image?: string | null }[], preferred: RegExp[], count: number) {
  const withImage = items.filter((item) => item.image);
  const chosen = preferred
    .map((re) => withImage.find((item) => re.test(item.name)))
    .filter((item): item is (typeof withImage)[number] => !!item);
  for (const item of withImage) {
    if (chosen.length >= count) break;
    if (!chosen.includes(item)) chosen.push(item);
  }
  return chosen.slice(0, count);
}

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
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs lg:text-[13px] font-extrabold text-[#FF6B73]">
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>Oferta termina em:</span>
      <span className="tabular-nums">{timeLeft.days}d {padZero(timeLeft.hours)}h {padZero(timeLeft.minutes)}m {padZero(timeLeft.seconds)}s</span>
    </div>
  );
}

/** Versão compacta do contador, para o card de um jogo específico na vitrine. */
function GameCardCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(expiresAt) - +new Date();
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      }
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        expired: false,
      };
    };

    setTimeLeft(calculateTime());
    const timer = setInterval(() => setTimeLeft(calculateTime()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (timeLeft.expired) return null;

  const padZero = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="inline-flex gap-1 items-center bg-slate-950/85 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-red-500/40 text-white font-bold text-[8px] shadow-[0_0_10px_rgba(220,38,38,0.25)]">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
      <div className="flex items-center gap-1 font-mono">
        {timeLeft.days > 0 && <span className="bg-red-950/60 border border-red-500/30 px-1 py-0.5 rounded text-red-400 font-bold">{timeLeft.days}d</span>}
        <span className="bg-red-950/60 border border-red-500/30 px-1 py-0.5 rounded text-red-400 font-bold">{padZero(timeLeft.hours)}h</span>
        <span className="bg-red-950/60 border border-red-500/30 px-1 py-0.5 rounded text-red-400 font-bold">{padZero(timeLeft.minutes)}m</span>
        <span className="bg-red-950/60 border border-red-500/30 px-1 py-0.5 rounded text-red-400 font-bold">{padZero(timeLeft.seconds)}s</span>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, isAuthenticated, isAdmin, isCollaborator, logout } = useAuth();
  const [, navigate] = useLocation();

  // O admin aceita "Rota ou URL" no link do banner, mas o navigate do wouter só entende rotas
  // internas — um link https:// (ex.: banner "JÁ DISPONÍVEL") não abria direito.
  const openBannerLink = (link: string | null | undefined, fallback = "/") => {
    const target = link?.trim() || fallback;
    if (/^https?:\/\//i.test(target)) {
      window.location.assign(target);
    } else {
      navigate(target);
    }
  };

  const { data: usedProducts = [], isLoading: isUsedLoading } = trpc.usedProducts.list.useQuery();
  const { data: digitalProducts = [], isLoading: isDigitalLoading } = trpc.digitalProducts.list.useQuery();
  const isLoading = isUsedLoading || isDigitalLoading;
  const [heroSearch, setHeroSearch] = useState("");
  const [activeListingTab, setActiveListingTab] = useState<"todos" | "digital" | "fisico" | "assinatura" | "primaria" | "secundaria">("todos");

  const [promos, setPromos] = useState<any[]>([]);
  const [isLoadingPromos, setIsLoadingPromos] = useState(true);
  // Guarda QUAL banner está em exibição (pelo id), não a posição dele na lista. A lista de
  // promoções é ao vivo (Firestore) e pode reordenar em segundo plano sem avisar — se
  // guardássemos só a posição (0, 1, 2...), a mesma posição passaria a mostrar um banner
  // diferente assim que a lista reordenasse, e pra quem está olhando parece que o banner
  // "pulou" sozinho sem ninguém ter clicado em nada.
  const [currentSlideId, setCurrentSlideId] = useState<string | null>(null);

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
      setIsLoadingPromos(false);
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Sem permissão para ler promos (regras do Firestore não deployadas). Usando promos padrão.");
      } else {
        console.error("Erro ao buscar promos na Home:", error);
      }
      setIsLoadingPromos(false);
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
  const dbGameBanners = digitalProducts.filter(game => {
    if (game.showInEconomia === true) return false;
    const isOutOfStock = game.isActive === false || (Number(game.stock ?? 0) <= 0 && !game.allowManualWithoutStock);
    const isExpired = !!game.expiresAt && new Date(game.expiresAt) < new Date();
    return !isOutOfStock && !isExpired;
  }).map(game => {
    let imageUrl = game.imageUrl;
    return {
      id: `game-banner-${game.id}`,
      title: game.name,
      description: `Jogo de Mídia Digital de alta performance para ${game.platform || "PS4/PS5"}. Compre no precinho com cashback de 7 ForteCoins!`,
      imageUrl: imageUrl || FALLBACK_GAME_IMAGE,
      link: `/digital?search=${encodeURIComponent(game.name)}`,
      expiresAt: null
    };
  });

  const activeBanners = [
    ...mainPromos,
    ...dbGameBanners.slice(0, 5) // Mostra apenas os 5 primeiros jogos para não poluir o banner
  ];
  // Só monta o carrossel quando promos E jogos já chegaram. Antes, os jogos chegavam depois dos
  // promos, a lista de slides mudava de tamanho no meio do carregamento e o carrossel "pulava".
  const isCarouselReady = !isLoadingPromos && !isDigitalLoading;
  const finalBanners = !isCarouselReady
    ? [] // Retorna vazio enquanto carrega para não piscar os banners padrão
    : (activeBanners.length > 0 ? activeBanners : DEFAULT_MAIN_BANNERS);

  const sidebarTopBanner = sidebarTopPromo || DEFAULT_SIDEBAR_TOP;
  const sidebarBottomBanner = sidebarBottomPromo || DEFAULT_SIDEBAR_BOTTOM;
  const sidebarPlatinadorBanner = sidebarPlatinadorPromo || DEFAULT_SIDEBAR_PLATINADOR;

  // Sempre aponta pra lista mais atual dentro do intervalo abaixo, sem precisar recriar o
  // timer toda vez que a lista reordena (só quando o TAMANHO muda — daí sim vale reiniciar
  // a contagem de 6s do zero).
  const finalBannersRef = useRef(finalBanners);
  finalBannersRef.current = finalBanners;

  const goToRelativeSlide = (step: 1 | -1) => {
    const list = finalBannersRef.current;
    if (list.length === 0) return;
    setCurrentSlideId(prevId => {
      const idx = list.findIndex(b => b.id === prevId);
      const base = idx === -1 ? 0 : idx;
      const nextIdx = (base + step + list.length) % list.length;
      return list[nextIdx].id;
    });
  };

  useEffect(() => {
    if (finalBanners.length <= 1) return;
    const interval = setInterval(() => goToRelativeSlide(1), 6000);
    return () => clearInterval(interval);
  }, [finalBanners.length]);

  // Garante que sempre haja um slide selecionado assim que a lista carrega, e corrige só se
  // o banner atual sumiu de vez (ex.: desativado no admin) — qualquer outra mudança na lista
  // não deve arrancar o visitante do banner que ele está vendo.
  useEffect(() => {
    if (finalBanners.length === 0) return;
    setCurrentSlideId(prevId => {
      if (prevId !== null && finalBanners.some(b => b.id === prevId)) return prevId;
      return finalBanners[0].id;
    });
  }, [finalBanners]);

  const nextSlide = () => goToRelativeSlide(1);
  const prevSlide = () => goToRelativeSlide(-1);

  // As buscas de usedProducts e digitalProducts agora são feitas via TRPC.

  // Últimos anúncios: digitais + físicos usados. Sem slice aqui de propósito — cada aba
  // (Primária/Secundária/Físico/etc.) precisa pescar os 24 mais recentes DENTRO da própria
  // categoria, senão uma leva de cadastros digitais lota as 24 vagas e as outras abas ficam
  // vazias mesmo tendo estoque de sobra fora dessa janela.
  const allListings = [
    ...digitalProducts.map((p: any) => ({ ...p, _type: 'digital' })),
    ...usedProducts.map((p: any) => ({ ...p, _type: 'used' }))
  ].sort((a: any, b: any) => {
    const getMs = (dateVal: any) => {
      if (!dateVal) return 0;
      if (typeof dateVal.toMillis === 'function') return dateVal.toMillis();
      if (typeof dateVal === 'number') return dateVal;
      const parsed = new Date(dateVal).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };
    return getMs(b.createdAt) - getMs(a.createdAt);
  });

  const categories = [
    { name: "Assinaturas", icon: Sparkles, color: "from-amber-500 to-yellow-600", cover: /ps plus/i },
    { name: "Ação", icon: Swords, color: "from-red-500 to-red-600", cover: /resident evil 4 gold/i },
    { name: "Aventura", icon: Compass, color: "from-blue-500 to-blue-600", cover: /spider-man/i },
    { name: "RPG", icon: Shield, color: "from-purple-500 to-purple-600", cover: /nioh 3/i },
    { name: "Esportes", icon: Trophy, color: "from-green-500 to-green-600", cover: /fc 27/i },
    { name: "Corrida", icon: Gauge, color: "from-orange-500 to-orange-600", cover: /need for speed heat/i },
    { name: "Tiro / FPS", icon: Crosshair, color: "from-slate-500 to-slate-700", cover: /ghost recon/i },
    { name: "Pré Venda", icon: Flame, color: "from-orange-500 to-yellow-500", cover: /gta vi/i },
  ];

  const mainLinks = [
    { label: "Jogue com Economia", href: "/jogue-com-economia", icon: Zap, highlight: true },
    { label: "Mídia Física", href: "/usados", icon: Package, highlight: false },
    { label: "Assinaturas", href: "/digital?type=assinatura", icon: Sparkles, highlight: false },
    { label: "Clube Platinador", href: "/platinador", icon: Trophy, highlight: false },
  ];

  const activeBanner = finalBanners.find((banner) => banner.id === currentSlideId) ?? finalBanners[0];

  const sideBanners = [
    { banner: sidebarTopBanner, fallback: "/", titleColor: "text-white" },
    { banner: sidebarBottomBanner, fallback: "/", titleColor: "text-white" },
    { banner: sidebarPlatinadorBanner, fallback: "/platinador", titleColor: "text-amber-400" },
  ];

  const onBannerImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = FALLBACK_GAME_IMAGE;
    e.currentTarget.onerror = null;
  };

  const economiaCovers = pickCovers(
    digitalProducts
      .filter((game: any) => game.showInEconomia === true)
      .map((game: any) => ({ name: game.name, image: game.imageUrl })),
    [/^gta v\b/i, /spider-man/i, /resident evil 4/i],
    3
  );

  const fisicosCovers = pickCovers(
    usedProducts.map((product: any) => ({ name: product.name, image: product.images?.[0] })),
    [/ragnarok/i, /last of us/i, /nioh/i, /pes 2021/i],
    4
  );

  const trustItems = [
    { title: "Entrega Imediata", text: "Ativação rápida e fácil", icon: Zap },
    { title: "Compra Segura", text: "Garantia Eforte Games", icon: ShieldCheck },
    { title: "Cashback ForteCoins", text: "Moedas em cada compra", icon: Coins },
    { title: "PS4, PS5 & Físicos", text: "Catálogo atualizado", icon: Gamepad2 },
  ];

  const guideCards = [
    {
      title: "ForteCoins (Fidelidade)",
      text: "Nossas moedas de fidelidade! Ganhe comprando jogos ou indicando amigos (+15 FC por amigo). Acumule e troque por Gift Cards Steam, PSN e Xbox de graça na loja de resgates.",
      link: "Ver prêmios & indicar amigo →",
      path: "/fortecoins",
      icon: Coins,
    },
    {
      title: "Venda seus Jogos e Contas",
      text: "Deseja desapegar ou revender? Crie sua loja de revendedor, anuncie seus jogos físicos usados ou chaves digitais. Nós gerenciamos o processo e você recebe direto na sua conta.",
      link: "Seja um revendedor →",
      path: "/virar-vendedor",
      icon: PlusCircle,
    },
    {
      title: "Mídia Digital com Garantia",
      text: "Compre jogos de PS4, PS5 e Gift Cards no menor preço com ativação garantida em até 24h úteis (ou reembolso). Além disso, todas as compras garantem cashback de 7 ForteCoins!",
      link: "Explorar mídia digital →",
      path: "/digital",
      icon: Sparkles,
    },
    {
      title: "Compra Segura (Escrow)",
      text: "Aqui você está 100% protegido. O dinheiro do pagamento fica retido de forma segura na plataforma e só é liberado para o vendedor após você confirmar o recebimento do produto.",
      link: "Tirar dúvidas no FAQ →",
      path: "/faq",
      icon: ShieldCheck,
    },
  ];

  const sectionTitle = "font-display font-extrabold uppercase leading-[1.1] text-white";
  const scrollRow = "flex overflow-x-auto snap-x snap-proximity scroll-pl-4 scrollbar-none";

  return (
    <div className="home-page min-h-screen bg-[#0A0A0C] text-zinc-100 overflow-x-clip w-full max-w-full">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-[#0A0A0C] border-b border-[#26262D]">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-10 pt-1.5 pb-2 lg:pt-2.5 lg:pb-1 flex flex-wrap items-center gap-x-1 lg:gap-x-4 gap-y-1 lg:gap-y-2.5">

          {/* No celular esta primeira linha nunca quebra; no computador (lg:contents) os itens
              voltam a dividir a mesma linha com a busca. */}
          <div className="flex items-center gap-1 w-full min-w-0 lg:contents">

          {/* Logo */}
          <div className="flex items-center gap-1.5 lg:gap-2.5 cursor-pointer min-w-0 h-11 mr-auto lg:mr-0" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="Eforte Games Logo" className="w-7 h-7 lg:w-9 lg:h-9 object-contain rounded-md lg:rounded-lg shrink-0" />
            <span className="text-[13px] min-[360px]:text-[15px] lg:text-[22px] font-black text-white tracking-[-0.03em] lg:tracking-[-0.02em] whitespace-nowrap">EFORTE<span className="text-[#FF2B36]">GAMES</span></span>
          </div>

          {/* Desktop & Mobile Sheet Drawer Trigger Button */}
          <Sheet>
            <SheetTrigger asChild>
              <button aria-label="Categorias" className="h-11 px-1.5 lg:px-3.5 flex items-center gap-1 lg:gap-2 text-[11px] lg:text-[13px] font-bold text-zinc-100 lg:bg-[#141418] lg:border lg:border-[#2E2E36] lg:rounded-[10px] lg:hover:border-red-600/60 transition-colors active:scale-95 shrink-0">
                <Menu className="w-[15px] h-[15px] lg:w-4 lg:h-4 text-[#FF4D57]" />
                <span className="hidden min-[390px]:inline">Categorias</span>
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
                      <a href="/usados" className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-900 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors border border-blue-950/40">
                        <span className="flex items-center gap-2.5"><Package className="w-4 h-4 text-blue-400" /> Mídia Física / Consoles Diversos</span>
                        <span className="bg-blue-600/30 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-black">NOVO</span>
                      </a>
                      <a href="/loja" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white transition-colors">
                        <Package className="w-4 h-4 text-emerald-400" /> Loja Oficial Eforte
                      </a>
                    </div>
                  </div>

                  {/* Category 3 */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2">⭐ Clube & Benefícios</h4>
                    <div className="space-y-1">
                      <a href="/platinador" className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-900 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors border border-amber-950/40">
                        <span className="flex items-center gap-2.5"><Trophy className="w-4 h-4 text-amber-400" /> Clube do Platinador (grátis)</span>
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

          {/* Right Controls */}
          <div className="flex items-center gap-1 lg:gap-2 shrink-0 lg:order-last lg:ml-auto">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-[#141418] text-xs px-2.5 h-8 hidden sm:flex" onClick={() => navigate("/fortecoins")}>
                  <Coins className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> {user?.forteCoins ?? 0} FC
                </Button>
                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-[#141418] text-xs px-2.5 h-8 hidden md:flex" onClick={() => navigate("/minhas-compras")}>
                  <Package className="w-3.5 h-3.5 mr-1.5" /> Compras
                </Button>
                <UserProfileButton />
              </div>
            ) : (
              <>
                <button type="button" className="h-11 px-[5px] lg:px-3 text-xs lg:text-sm font-semibold text-zinc-300 hover:text-white transition-colors" onClick={() => navigate("/login")}>
                  Entrar
                </button>
                <button type="button" className="h-11 text-white text-xs lg:text-sm font-extrabold active:scale-95 transition-transform" onClick={() => navigate("/login")}>
                  <span className="h-[34px] lg:h-11 px-2 min-[360px]:px-[9px] lg:px-4 flex items-center bg-red-600 hover:bg-red-700 rounded-lg lg:rounded-[10px] transition-colors">Cadastrar</span>
                </button>
              </>
            )}
          </div>

          </div>

          {/* Busca */}
          <div className="w-full lg:w-auto lg:flex-1 min-w-0 relative">
            <Search className="hidden lg:block absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#8E8E99] z-10 pointer-events-none" />
            <Input
              type="text"
              aria-label="Buscar jogos"
              placeholder="Busque por jogos (ex: Mad Max), gift cards..."
              value={heroSearch}
              onChange={(e) => setHeroSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && heroSearch.trim()) navigate(`/digital?search=${encodeURIComponent(heroSearch.trim())}`); }}
              className="w-full h-11 pl-3 pr-[70px] lg:pl-[42px] lg:pr-[92px] bg-[#141418] border-[#2E2E36] text-zinc-100 text-base lg:text-sm rounded-[10px] focus:border-red-600 focus:ring-red-600/20 placeholder:text-[12.5px] lg:placeholder:text-sm placeholder:text-[#8E8E99] transition-all"
            />
            <button
              type="button"
              className="absolute right-0 top-0 h-11 p-1 text-white text-[13px] font-extrabold active:scale-95 transition-transform"
              onClick={() => { if (heroSearch.trim()) navigate(`/digital?search=${encodeURIComponent(heroSearch.trim())}`); }}
            >
              <span className="h-9 px-2.5 lg:px-4 flex items-center bg-red-600 hover:bg-red-700 rounded-[7px] transition-colors">Buscar</span>
            </button>
          </div>
        </div>

        {/* Atalhos principais (computador) */}
        <nav aria-label="Principal" className="hidden lg:flex max-w-[1440px] mx-auto px-10 items-center gap-[26px]">
          {mainLinks.map((link) => (
            <a key={link.href} href={link.href} className={`h-10 flex items-center gap-[7px] text-sm transition-colors ${link.highlight ? "font-bold text-[#FF4D57] hover:text-[#FF6B73]" : "font-semibold text-zinc-300 hover:text-white"}`}>
              <link.icon className="w-[15px] h-[15px]" /> {link.label}
            </a>
          ))}
        </nav>
      </header>

      {/* Atalhos principais (celular) */}
      <nav aria-label="Atalhos" className={`lg:hidden ${scrollRow} gap-[18px] px-4`}>
        {mainLinks.map((link) => (
          <a key={link.href} href={link.href} className={`flex-none snap-start h-11 flex items-center gap-1.5 text-[13px] ${link.highlight ? "font-bold text-[#FF4D57]" : "font-semibold text-zinc-300"}`}>
            <link.icon className="w-3.5 h-3.5" /> {link.label}
          </a>
        ))}
      </nav>

      <div className="max-w-[1440px] mx-auto px-4 lg:px-10 lg:pt-3.5">

        {/* Hero Banner Carousel Section */}
        <section aria-label="Destaques" className="flex flex-col lg:flex-row lg:items-stretch gap-3 lg:gap-3.5">

          {/* Banner principal */}
          <div className="lg:flex-1 min-w-0 relative overflow-hidden flex flex-col xl:flex-row-reverse bg-[#141418] xl:bg-[#101014] border border-[#26262D] rounded-[14px] lg:rounded-2xl xl:min-h-[420px]">
            {activeBanner?.imageUrl && (
              <img
                src={activeBanner.imageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-[40px] saturate-[1.2] opacity-35 scale-125 pointer-events-none"
              />
            )}

            {/* Arte */}
            <div className="relative aspect-video xl:aspect-auto xl:flex-1 min-w-0 overflow-hidden">
              {!isCarouselReady && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {/* Slides */}
              {finalBanners.map((banner) => (
                <div
                  key={banner.id}
                  onClick={() => openBannerLink(banner.link)}
                  className={`absolute inset-0 w-full h-full cursor-pointer transition-opacity duration-700 ease-in-out ${
                    banner.id === activeBanner?.id ? "opacity-100 z-10" : "opacity-0 pointer-events-none z-0"
                  }`}
                >
                  {banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="hero-art-fade w-full h-full object-contain"
                      onError={onBannerImageError}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-950 to-[#0A0A0C]" />
                  )}
                </div>
              ))}

              {/* Navigation Arrows */}
              {finalBanners.length > 1 && (
                <>
                  <button
                    aria-label="Banner anterior"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevSlide();
                    }}
                    className="absolute left-1.5 lg:left-3.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#0A0A0C]/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors z-20"
                  >
                    <ChevronLeft className="w-[18px] h-[18px] lg:w-5 lg:h-5" />
                  </button>
                  <button
                    aria-label="Próximo banner"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextSlide();
                    }}
                    className="absolute right-1.5 lg:right-3.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#0A0A0C]/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors z-20"
                  >
                    <ChevronRight className="w-[18px] h-[18px] lg:w-5 lg:h-5" />
                  </button>
                </>
              )}

              {/* Slide Indicators */}
              {finalBanners.length > 1 && (
                <div className="absolute bottom-1.5 lg:bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-px lg:gap-0.5 z-20 px-1.5 lg:px-2 rounded-xl bg-[#0A0A0C]/70">
                  {finalBanners.map((banner, index) => (
                    <button
                      key={banner.id}
                      aria-label={`Ver banner ${index + 1}`}
                      aria-pressed={banner.id === activeBanner?.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlideId(banner.id);
                      }}
                      className={`h-[18px] lg:h-[22px] flex items-center justify-center ${banner.id === activeBanner?.id ? "w-[26px] lg:w-[30px]" : "w-3.5 lg:w-4"}`}
                    >
                      <span className={`h-[5px] lg:h-1.5 rounded-full transition-all duration-300 ${banner.id === activeBanner?.id ? "w-[18px] lg:w-[22px] bg-white" : "w-[5px] lg:w-1.5 bg-white/50"}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Texto */}
            <div
              onClick={() => activeBanner && openBannerLink(activeBanner.link)}
              className="relative z-10 cursor-pointer min-h-[186px] md:min-h-[96px] xl:min-h-0 xl:w-[320px] xl:shrink-0 flex flex-col md:flex-row xl:flex-col md:items-center xl:items-start xl:justify-center gap-2 md:gap-5 xl:gap-3 px-3.5 md:px-5 pt-2.5 pb-3.5 md:py-3.5 xl:py-6 xl:pl-[30px] xl:pr-1 text-left"
            >
              {activeBanner && (
                <>
                  <div className="flex-1 xl:flex-none min-h-0 min-w-0 flex flex-col justify-center gap-1.5 xl:gap-3">
                    {activeBanner.expiresAt && <BannerCountdown expiresAt={activeBanner.expiresAt} />}
                    <h2 className="font-display font-extrabold uppercase text-white text-[28px] xl:text-[44px] leading-[1.05] xl:leading-[1.03] line-clamp-3 md:line-clamp-2 xl:line-clamp-4">
                      {activeBanner.title}
                    </h2>
                    {bannerDescription(activeBanner) && (
                      <p className="text-[12.5px] xl:text-sm leading-[1.35] xl:leading-[1.45] text-zinc-300 line-clamp-2 xl:line-clamp-3">
                        {bannerDescription(activeBanner)}
                      </p>
                    )}
                  </div>
                  <Button className="h-12 w-full md:w-fit xl:mt-1 md:px-6 shrink-0 bg-red-600 hover:bg-red-700 text-white text-sm xl:text-[15px] font-extrabold rounded-[10px]">
                    Aproveitar Oferta
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Banners laterais: a arte aparece inteira e o título fica abaixo dela */}
          <div className={`${scrollRow} lg:overflow-visible lg:flex-col lg:w-[262px] lg:shrink-0 gap-2.5 -mx-4 px-4 lg:mx-0 lg:px-0`}>
            {isLoadingPromos ? (
              [0, 1, 2].map((slot) => (
                <div key={slot} className="flex-none w-[282px] lg:w-full h-[150px] lg:flex-1 bg-[#141418] rounded-[10px] lg:rounded-xl border border-[#26262D] animate-pulse" />
              ))
            ) : (
              sideBanners.map(({ banner, fallback, titleColor }) => (
                <div
                  key={banner.id}
                  onClick={() => openBannerLink(banner.link, fallback)}
                  className="flex-none snap-start flex flex-col overflow-hidden cursor-pointer bg-[#141418] border border-[#26262D] hover:border-red-600 rounded-[10px] lg:rounded-xl transition-colors"
                >
                  {banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="block h-28 w-auto min-w-[200px] max-w-[300px] lg:h-auto lg:w-full lg:min-w-0 lg:max-w-none"
                      onError={onBannerImageError}
                    />
                  ) : (
                    <div className="h-28 w-[240px] lg:h-24 lg:w-full bg-gradient-to-br from-red-950 to-[#0A0A0C]" />
                  )}
                  {/* w-0 + min-w-full: o texto acompanha a largura da arte em vez de esticar o card */}
                  <div className="w-0 min-w-full flex-1 flex flex-col justify-center gap-1 px-2.5 py-2 lg:py-1.5 text-left">
                    {banner.expiresAt && <BannerCountdown expiresAt={banner.expiresAt} />}
                    <h3 className={`text-[11px] font-extrabold leading-[1.25] ${titleColor}`}>
                      {banner.title}
                    </h3>
                    {bannerDescription(banner) && (
                      <p className="text-[10px] leading-snug text-zinc-400 line-clamp-2">
                        {bannerDescription(banner)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick Search Pills & Console Filter Pills */}
        <div className="mt-2 lg:mt-2.5 lg:flex lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-6 lg:gap-y-1.5">
          <div className={`${scrollRow} lg:overflow-visible lg:flex-wrap items-center gap-1.5 -mx-4 px-4 lg:mx-0 lg:px-0`}>
            <span className="flex-none text-xs font-bold text-zinc-400 mr-0.5 snap-start">Buscas populares:</span>
            {[
              { label: "Gift Cards PSN", url: "/digital?search=Gift+Card+PSN" },
              { label: "PS Plus / Game Pass", url: "/digital?type=assinatura" },
              { label: "Gift Cards Xbox", url: "/digital?search=Gift+Card+Xbox" },
            ].map((pill) => (
              <button
                key={pill.label}
                onClick={() => navigate(pill.url)}
                className="flex-none snap-start h-11 lg:h-[30px] flex items-center active:scale-95 transition-transform"
              >
                <span className="h-8 lg:h-[30px] px-2.5 lg:px-[11px] flex items-center gap-[5px] bg-[#1F1F26] hover:bg-[#2A2A33] rounded-full text-xs font-semibold text-zinc-100 whitespace-nowrap transition-colors">
                  <Flame className="w-3 h-3 text-[#FF6B73]" /> {pill.label}
                </span>
              </button>
            ))}
          </div>

          {/* Platform Console Pills — atalho direto para o catálogo já filtrado */}
          <div className={`${scrollRow} lg:overflow-visible lg:flex-wrap items-center gap-1.5 -mx-4 px-4 lg:mx-0 lg:px-0`}>
            <span className="flex-none text-xs font-bold text-zinc-400 mr-0.5 snap-start">Filtrar Console:</span>
            {[
              { id: null, label: "Todos Consoles" },
              { id: "PS5", label: "PS5" },
              { id: "PS4", label: "PS4" },
              { id: "PS4/PS5", label: "Dual (PS4 & PS5)" },
            ].map((plat) => (
              <button
                key={plat.label}
                onClick={() => navigate(plat.id ? `/digital?platform=${plat.id}` : "/digital")}
                className="flex-none snap-start h-11 lg:h-[30px] flex items-center active:scale-95 transition-transform"
              >
                <span className="h-8 lg:h-[30px] px-[11px] flex items-center bg-[#1F1F26] hover:bg-[#2A2A33] rounded-lg text-xs font-bold text-zinc-100 whitespace-nowrap transition-colors">
                  {plat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Trust Badges Bar */}
        <ul className="mt-1.5 lg:mt-2.5 py-3 lg:py-2.5 grid grid-cols-2 lg:flex lg:flex-wrap lg:justify-between gap-3 lg:gap-x-6 lg:gap-y-2 border-y border-[#26262D]">
          {trustItems.map((item) => (
            <li key={item.title} className="min-w-0 flex items-start lg:items-center gap-[7px] lg:gap-2">
              <item.icon className="w-4 h-4 mt-px lg:mt-0 text-[#FF4D57] shrink-0" />
              <span className="min-w-0 lg:flex lg:items-center lg:gap-2">
                <span className="block text-xs lg:text-[13px] font-bold leading-tight text-zinc-100">{item.title}</span>
                <span className="block text-[11px] lg:text-[13px] leading-snug text-zinc-400">{item.text}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Recent Listings (Anúncios) */}
        <section id="anuncios" className="pt-[18px] lg:pt-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:flex-wrap gap-2 lg:gap-x-5 lg:gap-y-2.5 mb-1.5 lg:mb-3">
            <div>
              <h2 className={`${sectionTitle} text-[26px] lg:text-[30px]`}>Últimos Anúncios</h2>
              <p className="mt-[3px] lg:mt-0.5 text-xs lg:text-[13px] text-zinc-400">Filtre por tipo de produto para não misturar anúncios.</p>
            </div>

            {/* Tab Filter Control */}
            <div className={`${scrollRow} lg:overflow-visible lg:flex-wrap gap-1.5 lg:gap-1 -mx-4 px-4 lg:mx-0 lg:p-1 lg:bg-[#141418] lg:border lg:border-[#26262D] lg:rounded-[10px]`}>
              {[
                { id: "todos", label: "Todos os Digitais" },
                { id: "digital", label: "Jogos Digitais" },
                { id: "assinatura", label: "Assinaturas" },
                { id: "primaria", label: "Contas Primárias" },
                { id: "secundaria", label: "Contas Secundárias" },
                { id: "fisico", label: "Jogos Físicos" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  aria-pressed={activeListingTab === tab.id}
                  onClick={() => setActiveListingTab(tab.id as any)}
                  className="flex-none snap-start h-11 lg:h-[34px] flex items-center"
                >
                  <span className={`h-[34px] px-3 flex items-center rounded-lg lg:rounded-[7px] text-xs lg:text-[13px] font-bold whitespace-nowrap transition-colors ${
                    activeListingTab === tab.id
                      ? "bg-zinc-100 text-[#0A0A0C]"
                      : "bg-[#1F1F26] lg:bg-transparent text-zinc-300 hover:text-white lg:hover:bg-[#1F1F26]"
                  }`}>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className={`${scrollRow} lg:grid lg:grid-cols-4 xl:grid-cols-6 lg:overflow-visible gap-2.5 lg:gap-3.5 -mx-4 px-4 lg:mx-0 lg:px-0 pb-0.5`}>
            {(() => {
              const visibleListings = allListings.filter((listing: any) => {
                if (listing.showInEconomia === true) return false;

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
              }).slice(0, 24);
              return visibleListings.length > 0 ? visibleListings.map((listing: any) => {
              const secVal = listing.priceSecondary ?? listing.price_secondary;
              const hasSec = secVal !== undefined && secVal !== null && secVal !== "" && parseFloat(secVal) > 0;
              const primVal = listing.pricePrimary ?? listing.price_primary;
              const hasPrim = primVal !== undefined && primVal !== null && primVal !== "" && parseFloat(primVal) > 0;
              // Sem pricePrimary cadastrado, "price" é só o preço base (igual ao da secundária
              // quando o jogo só tem conta secundária) — não é um preço de Primária de verdade.
              const primaryPrice = hasPrim ? parseFloat(primVal) : parseFloat(listing.price || 0);
              const secondaryPrice = hasSec ? parseFloat(secVal) : 0;

              const isAssinatura = listing.type === 'assinatura';
              const isDigital = listing._type === 'digital' && !isAssinatura;
              const isFisico = listing._type === 'used';
              // Estoque/validade precisam ser checados pra QUALQUER produto digital, incluindo
              // assinaturas — usar "isDigital" aqui (que exclui assinatura de propósito, só pra
              // rótulo/badge) fazia assinatura esgotada nunca mostrar "Indisponível" na Home.
              const isAnyDigital = listing._type === 'digital';
              const isOutOfStock = isAnyDigital && (listing.isActive === false || (Number(listing.stock ?? 0) <= 0 && !listing.allowManualWithoutStock));
              const isExpired = isAnyDigital && !!listing.expiresAt && new Date(listing.expiresAt) < new Date();
              const isUnavailable = isOutOfStock || isExpired;

              const priceValue = (value: number) => (
                <span className="whitespace-nowrap">
                  <span className="text-[11px] lg:text-xs font-semibold text-zinc-400">R$ </span>
                  <span className="text-[19px] lg:text-[21px] font-extrabold tracking-[-0.02em] text-white">{value.toFixed(2).replace('.', ',')}</span>
                </span>
              );

              return (
                <div
                  key={`${listing._type}-${listing.id}`}
                  className={`w-[170px] lg:w-auto shrink-0 lg:shrink min-w-0 snap-start flex flex-col overflow-hidden bg-[#141418] border border-[#26262D] hover:border-red-600 rounded-[10px] lg:rounded-xl lg:hover:-translate-y-[3px] transition-all cursor-pointer group game-card-shine ${isUnavailable ? 'opacity-70' : ''}`}
                  onClick={() => !isUnavailable && navigate(isFisico ? '/usados' : `/digital?search=${encodeURIComponent(listing.name)}&buy=${listing.id}`)}
                >
                  <div className={`w-full bg-[#0A0A0C] relative overflow-hidden flex items-center justify-center ${isFisico ? 'aspect-square' : 'aspect-[460/215]'}`}>
                    {listing.imageUrl || (listing.images && listing.images.length > 0) ? (
                      <>
                        {/* Fundo ambiente suave apenas para contain */}
                        {listing.coverFit === 'contain' && (
                          <img
                            src={listing.imageUrl || listing.images[0]}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-125 pointer-events-none"
                          />
                        )}
                        <img
                          src={listing.imageUrl || listing.images[0]}
                          alt={listing.name}
                          loading="lazy"
                          className={`w-full h-full ${listing.coverFit === 'contain' ? 'object-contain p-1.5 relative z-10' : 'object-cover'} group-hover:scale-105 transition-transform duration-500`}
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (!target.dataset.fallbackApplied) {
                              target.dataset.fallbackApplied = "true";
                              target.src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800";
                            }
                          }}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-[#1F1F26]">
                        <Gamepad2 className="w-8 h-8 sm:w-12 sm:h-12 opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-[5px] left-[5px] lg:top-1.5 lg:left-1.5 z-20 h-[19px] lg:h-5 px-1.5 lg:px-[7px] inline-flex items-center gap-1 bg-[#0A0A0C]/90 rounded-[5px] text-[9px] lg:text-[10px] uppercase font-extrabold tracking-[0.02em] text-white">
                      <span className={`w-[5px] h-[5px] rounded-full ${isAssinatura ? 'bg-amber-400' : isFisico ? 'bg-blue-400' : 'bg-[#FF2B36]'}`} />
                      {isAssinatura ? 'Assinatura VIP' : isFisico ? 'Mídia Física' : 'Mídia Digital'}
                    </div>

                    {isOutOfStock ? (
                      <div className="absolute bottom-[5px] right-[5px] lg:bottom-1.5 lg:right-1.5 z-20 h-[19px] lg:h-5 px-1.5 lg:px-[7px] inline-flex items-center bg-red-600 rounded-[5px] text-[9px] lg:text-[10px] font-extrabold uppercase text-white">
                        Esgotado
                      </div>
                    ) : isExpired ? (
                      <div className="absolute bottom-[5px] right-[5px] lg:bottom-1.5 lg:right-1.5 z-20 h-[19px] lg:h-5 px-1.5 lg:px-[7px] inline-flex items-center bg-red-600 rounded-[5px] text-[9px] lg:text-[10px] font-extrabold uppercase text-white">
                        Prazo Encerrado
                      </div>
                    ) : null}
                    {!isUnavailable && listing.expiresAt && (
                      <div className="absolute bottom-1.5 right-1.5 z-20">
                        <GameCardCountdown expiresAt={listing.expiresAt} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 px-2.5 pt-[9px] pb-2.5 lg:px-3 lg:pt-2.5 lg:pb-3 flex flex-col gap-[5px] lg:gap-1.5">
                    <div className="flex items-center justify-between gap-1 lg:gap-1.5 text-[10px] lg:text-[11px] font-bold">
                      <span className="flex items-center gap-[3px] text-green-400">
                        <ShieldCheck className="w-[11px] h-[11px] lg:w-3 lg:h-3" /> Verificado
                      </span>
                      {isDigital && (
                        <span className="flex items-center gap-0.5 text-amber-400">+7 FC</span>
                      )}
                    </div>
                    {(listing.sellerId || listing.seller_id || listing.sellerOpenId || listing.sellerName) ? (
                      <span className="flex items-center gap-1 text-[9px] lg:text-[10px] font-extrabold text-amber-400">
                        <Handshake className="w-3 h-3" /> Vendedor Parceiro
                      </span>
                    ) : null}
                    <h3 className="line-clamp-2 min-h-[34px] lg:min-h-[37px] text-[13px] lg:text-sm font-semibold leading-[1.3] text-zinc-100 group-hover:text-white transition-colors">
                      {listing.name}
                    </h3>

                    {/* Bloco de Exibição dos Valores */}
                    <div className="mt-auto space-y-[5px] lg:space-y-1.5">
                      {isFisico ? (
                        <div className="flex items-baseline justify-end gap-1">
                          {listing.price ? (
                            priceValue(parseFloat(listing.price))
                          ) : (
                            <span className="text-xs lg:text-sm font-bold text-[#FF4D57]">Ver anúncio</span>
                          )}
                        </div>
                      ) : hasSec && hasPrim ? (
                        <div className="space-y-0.5 text-[11px] lg:text-xs">
                          <div className="flex justify-between items-center gap-1">
                            <span className="font-bold text-zinc-400">Primária:</span>
                            <span className="font-extrabold text-white">R$ {primaryPrice.toFixed(2).replace('.', ',')}</span>
                          </div>
                          <div className="flex justify-between items-center gap-1">
                            <span className="font-bold text-zinc-400">Secundária:</span>
                            <span className="font-bold text-zinc-300">R$ {secondaryPrice.toFixed(2).replace('.', ',')}</span>
                          </div>
                        </div>
                      ) : hasSec && !hasPrim ? (
                        <div className="flex items-baseline justify-between gap-1 lg:gap-1.5">
                          <span className="text-[11px] lg:text-xs font-bold text-zinc-400">Secundária:</span>
                          {priceValue(secondaryPrice)}
                        </div>
                      ) : (
                        <div className="flex items-baseline justify-between gap-1 lg:gap-1.5">
                          <span className="text-[11px] lg:text-xs font-bold text-zinc-400">Primária:</span>
                          {primaryPrice === 0 ? (
                            <span className="text-xs lg:text-sm font-bold text-[#FF4D57]">A definir</span>
                          ) : (
                            priceValue(primaryPrice)
                          )}
                        </div>
                      )}

                      <Button
                        size="sm"
                        className={`w-full h-11 lg:h-[38px] rounded-lg px-1 lg:px-1.5 text-[11px] lg:text-xs font-extrabold leading-tight whitespace-normal shrink ${
                          isUnavailable
                            ? "bg-[#26262D] text-zinc-400 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                        disabled={isUnavailable}
                        onClick={(e: any) => {
                          e.stopPropagation();
                          if (isUnavailable) return;
                          if (isFisico) {
                            navigate('/usados');
                          } else {
                            navigate(`/digital?search=${encodeURIComponent(listing.name)}&buy=${listing.id}`);
                          }
                        }}
                      >
                        {isOutOfStock ? "Esgotado" : isExpired ? "Indisponível" : isFisico ? "Ver Anúncio" : primaryPrice === 0 ? "Contatar" : "Comprar / Escolher Conta"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="w-full col-span-full py-16 text-center bg-[#141418] rounded-2xl border border-[#26262D]">
                <Tag className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-zinc-400">Nenhum anúncio nesta categoria.</h3>
              </div>
            );
            })()}
          </div>

          <Button variant="outline" className="w-full h-11 lg:h-[46px] mt-2.5 lg:mt-3.5 bg-transparent border-[#2E2E36] text-zinc-300 hover:text-white hover:bg-[#141418] text-[13px] lg:text-sm font-bold rounded-[10px]" onClick={() => navigate("/digital")}>
            Ver Catálogo Completo de Jogos Digitais →
          </Button>
        </section>
      </div>

      {/* Banner Destaque Jogue com Economia */}
      <section className="mt-[22px] lg:mt-8 bg-[#15080A] border-y border-[#4A1218]">
        <div
          onClick={() => navigate("/jogue-com-economia")}
          className="max-w-[1440px] mx-auto px-4 lg:px-10 pt-[18px] pb-5 lg:py-[26px] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-8 cursor-pointer group"
        >
          <div className="flex flex-col gap-1.5 lg:flex-1 min-w-0">
            <div className="text-[11px] lg:text-xs font-extrabold uppercase tracking-[0.08em] text-[#FF6B73]">Seção Especial</div>
            <h3 className={`${sectionTitle} text-[26px] lg:text-[32px]`}>
              Jogue com Economia <span className="text-[#FF4D57]">Até 70% OFF</span>
            </h3>
            <p className="text-[13px] lg:text-sm leading-[1.45] lg:leading-normal text-zinc-300 lg:max-w-[620px]">
              Quer jogar os melhores títulos pagando muito menos? Descubra nosso catálogo selecionado de contas secundárias verificadas com suporte e garantia.
            </p>
            <Button className="hidden lg:flex mt-2 w-fit h-[46px] px-[18px] bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold rounded-[10px] items-center gap-2">
              <span>Explorar Ofertas</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          {economiaCovers.length > 0 && (
            <div className="grid grid-cols-3 gap-2 lg:gap-2.5 lg:flex-1 min-w-0">
              {economiaCovers.map((cover) => (
                <img key={cover.name} src={cover.image ?? undefined} alt="" loading="lazy" className="w-full aspect-[16/10] lg:aspect-[460/215] object-cover rounded-md lg:rounded-lg block" />
              ))}
            </div>
          )}
          <Button className="lg:hidden w-full h-[46px] bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold rounded-[10px] flex items-center justify-center gap-2">
            <span>Explorar Ofertas</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Popular Categories */}
      <section id="categorias" className="max-w-[1440px] mx-auto pt-5 lg:pt-8 lg:px-10">
        <h2 className={`${sectionTitle} text-[26px] lg:text-[30px] px-4 lg:px-0 mb-2.5 lg:mb-3.5`}>Categorias Populares</h2>
        <div className={`${scrollRow} lg:grid lg:grid-cols-8 lg:overflow-visible gap-2.5 lg:gap-3 px-4 lg:px-0`}>
          {categories.map((cat) => {
            const coverImage =
              digitalProducts.find((game: any) => game.imageUrl && cat.cover.test(game.name))?.imageUrl ??
              digitalProducts.find((game: any) => game.imageUrl && game.category === cat.name)?.imageUrl;
            return (
              <div
                key={cat.name}
                onClick={() => navigate(`/digital?genre=${encodeURIComponent(cat.name)}`)}
                className={`flex-none snap-start relative overflow-hidden w-[136px] h-[90px] lg:w-auto lg:h-auto lg:aspect-[3/2] cursor-pointer bg-[#141418] border border-[#26262D] hover:border-red-600 rounded-[10px] lg:rounded-xl lg:hover:-translate-y-[3px] transition-all group`}
              >
                {coverImage ? (
                  <img src={coverImage} alt="" loading="lazy" className="w-full h-full object-cover block group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
                    <cat.icon className="w-6 h-6 text-white" />
                  </div>
                )}
                <span className="absolute left-0 right-0 bottom-0 px-2.5 lg:px-3 pt-[22px] lg:pt-[26px] pb-2 lg:pb-2.5 bg-gradient-to-b from-[#0A0A0C]/0 to-[#0A0A0C]/95 text-[13px] lg:text-sm font-extrabold text-white">
                  {cat.name}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Guia Rápido: Como Funciona */}
      <section className="mt-[22px] lg:mt-8 pt-[18px] pb-5 lg:pt-[30px] lg:pb-8 bg-[#101014] border-y border-[#26262D]">
        <div className="max-w-[1440px] mx-auto lg:px-10">
          <div className="px-4 lg:px-0 mb-3 lg:mb-[18px]">
            <h2 className={`${sectionTitle} text-[26px] lg:text-[30px]`}>
              Guia Rápido: <span className="text-[#FF4D57]">Como Funciona?</span>
            </h2>
            <p className="mt-[5px] lg:mt-1 text-[13px] lg:text-sm leading-[1.4] text-zinc-400">
              Entenda em poucos passos as principais funções e recursos de segurança da nossa plataforma.
            </p>
          </div>

          <div className={`${scrollRow} lg:grid lg:grid-cols-4 lg:overflow-visible gap-2.5 lg:gap-4 px-4 lg:px-0`}>
            {guideCards.map((card) => (
              <div key={card.title} className="flex-none snap-start w-[288px] lg:w-auto p-3.5 lg:p-0 flex flex-col gap-1.5 lg:gap-2 bg-[#17171C] lg:bg-transparent border border-[#26262D] lg:border-0 rounded-xl">
                <card.icon className="w-[22px] h-[22px] lg:w-6 lg:h-6 text-[#FF4D57]" />
                <h3 className="mt-0.5 text-[15px] lg:text-base font-bold text-white">{card.title}</h3>
                <p className="text-[13px] lg:text-[13.5px] leading-[1.45] lg:leading-normal text-zinc-400">{card.text}</p>
                <button
                  type="button"
                  className="mt-auto min-h-11 lg:min-h-8 text-left text-[13px] font-bold text-[#FF4D57] hover:text-[#FF6B73] transition-colors"
                  onClick={() => navigate(card.path)}
                >
                  {card.link}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Physical Products Prominent Banner (Requirement 9) */}
      <section className="max-w-[1440px] mx-auto px-4 lg:px-10 pt-5 lg:pt-8">
        <div
          onClick={() => navigate("/usados")}
          className="p-4 lg:px-[30px] lg:py-[26px] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-8 bg-[#141418] border border-[#26262D] hover:border-red-600 rounded-[14px] lg:rounded-2xl cursor-pointer transition-colors"
        >
          <div className="flex flex-col gap-1.5 lg:gap-2 lg:flex-1 min-w-0">
            <span className="text-[11px] lg:text-xs font-extrabold uppercase tracking-[0.08em] text-[#FF6B73]">
              Espaço de Desapegos Físicos
            </span>
            <h2 className={`${sectionTitle} text-[26px] lg:text-[34px] leading-[1.08] lg:leading-[1.05]`}>
              Revenda seus Jogos Físicos, Consoles e Acessórios!
            </h2>
            <p className="text-[13px] lg:text-sm leading-[1.45] lg:leading-normal text-zinc-300 lg:max-w-[620px]">
              Encontre e venda mídias físicas em disco de PS4/PS5, videogames, controles originais e colecionáveis com a <strong className="text-white">Garantia Intermediada Eforte Games (8%)</strong>.
            </p>
            <Button className="hidden lg:flex mt-2 w-fit h-[46px] px-[18px] bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold rounded-[10px]">
              Ver Mídias Físicas & Consoles →
            </Button>
          </div>
          {fisicosCovers.length > 0 && (
            <div className="grid grid-cols-4 lg:flex gap-2 lg:gap-2.5 lg:shrink-0">
              {fisicosCovers.map((cover) => (
                <img key={cover.name} src={cover.image ?? undefined} alt="" loading="lazy" className="w-full h-[92px] lg:w-32 lg:h-[168px] object-cover rounded-md lg:rounded-lg block" />
              ))}
            </div>
          )}
          <Button className="lg:hidden w-full h-[46px] bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold rounded-[10px]">
            Ver Mídias Físicas & Consoles →
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-7 lg:mt-9 lg:border-t border-[#26262D] pt-0 lg:pt-[30px] pb-28 lg:pb-[26px]">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-10 text-center">
          <div className="flex items-center justify-center gap-2 lg:gap-2.5">
            <img src="/logo.png" alt="Eforte Games Logo" className="w-7 h-7 lg:w-8 lg:h-8 object-contain rounded-md lg:rounded-lg" />
            <span className="text-lg lg:text-xl font-black tracking-[-0.02em] text-white">EFORTE<span className="text-[#FF2B36]">GAMES</span></span>
          </div>
          <p className="mt-2.5 lg:mt-3 mb-1 lg:mb-1.5 max-w-[480px] mx-auto text-[13px] lg:text-sm leading-[1.45] lg:leading-normal text-zinc-400">
            Plataforma segura para negociações de jogos, gift cards e produtos físicos. O dinheiro só é liberado após a confirmação do comprador.
          </p>

          <a
            href="https://www.instagram.com/efortegamesdigitais_?igsh=dnl0NW56aHlna29m"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-11 inline-flex items-center gap-[7px] lg:gap-2 text-[13px] lg:text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            <Instagram className="w-4 h-4" />
            <span>@efortegamesdigitais_</span>
          </a>

          <div className="mt-0 lg:mt-1.5 flex flex-col lg:flex-row lg:flex-wrap items-center justify-center lg:gap-x-[18px] text-xs lg:text-[13px] text-[#8E8E99]">
            <p>&copy; 2026 EFORTE GAMES. Todos os direitos reservados.</p>
            <a href="/termos" className="min-h-10 lg:min-h-8 flex items-center text-[13px] font-semibold text-zinc-300 hover:text-white transition-colors">Termos de Uso e Regulamentos</a>
            {/* Crédito de quem desenvolveu o site */}
            <p>
              Desenvolvido por{" "}
              <a
                href="https://www.instagram.com/lmtech_br/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-zinc-300 hover:text-white transition-colors"
              >
                @lmtech_br
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
