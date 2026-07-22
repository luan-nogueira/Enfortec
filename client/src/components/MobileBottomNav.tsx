import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import {
  Home as HomeIcon,
  ShoppingBag,
  ShoppingCart,
  Trophy,
  Menu,
  X,
  Flame,
  Zap,
  Star,
  Coins,
  HelpCircle,
  Package,
  Gamepad2,
  Shield,
  User,
  LogOut,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function MobileBottomNav() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [openMenu, setOpenMenu] = useState(false);

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpenMenu(false);
  };

  const navItems = [
    {
      label: "Início",
      icon: HomeIcon,
      path: "/",
      active: location === "/",
    },
    {
      label: "Loja",
      icon: ShoppingBag,
      path: "/loja",
      active: location === "/loja",
    },
    {
      label: "Platinador",
      icon: Trophy,
      path: "/platinador",
      active: location === "/platinador",
      highlight: true,
    },
    {
      label: "Compras",
      icon: ShoppingCart,
      path: "/minhas-compras",
      active: location === "/minhas-compras",
    },
  ];

  const menuSections = [
    {
      title: "Clube & Benefícios",
      items: [
        {
          label: "Área do Platinador (R$ 15/mês)",
          icon: Trophy,
          path: "/platinador",
          color: "text-[#dc143c]",
          badge: "VIP",
        },
        {
          label: "ForteCoins & Fidelidade",
          icon: Coins,
          path: "/fortecoins",
          color: "text-amber-400",
        },
        {
          label: "Promoções Imperdíveis",
          icon: Flame,
          path: "/promocoes",
          color: "text-orange-500",
        },
      ],
    },
    {
      title: "Marketplace & Produtos",
      items: [
        {
          label: "Loja Oficial (Físicos)",
          icon: ShoppingBag,
          path: "/loja",
          color: "text-blue-400",
        },
        {
          label: "Desapegos Usados",
          icon: Package,
          path: "/usados",
          color: "text-emerald-400",
        },
        {
          label: "Mídias Digitais & Keys",
          icon: Gamepad2,
          path: "/digital",
          color: "text-purple-400",
        },
      ],
    },
    {
      title: "Sua Conta & Vendas",
      items: [
        {
          label: "Virar Vendedor / Anunciar",
          icon: Zap,
          path: "/virar-vendedor",
          color: "text-[#dc143c]",
        },
        {
          label: "Minhas Compras",
          icon: ShoppingCart,
          path: "/minhas-compras",
          color: "text-gray-300",
        },
        {
          label: "Avaliações de Clientes",
          icon: Star,
          path: "/avaliacoes",
          color: "text-amber-400",
        },
        {
          label: "Perguntas Frequentes (FAQ)",
          icon: HelpCircle,
          path: "/faq",
          color: "text-gray-400",
        },
      ],
    },
  ];

  return (
    <>
      {/* Bottom Bar fixed on Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-[#080808]/95 backdrop-blur-xl border-t border-[#dc143c]/30 px-2 py-1.5 shadow-[0_-5px_20px_rgba(0,0,0,0.8)] pb-[calc(6px+env(safe-area-inset-bottom,0px))]">
        <div className="grid grid-cols-5 items-center justify-between max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleNavigate(item.path)}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
                  item.active
                    ? "text-[#dc143c] font-bold scale-105"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 ${
                      item.highlight && !item.active ? "text-amber-400 animate-pulse" : ""
                    } ${item.active ? "drop-shadow-[0_0_8px_rgba(220,20,60,0.6)]" : ""}`}
                  />
                  {item.highlight && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#dc143c] animate-ping" />
                  )}
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 font-medium leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* 5th Item: Menu Drawer Trigger */}
          <Sheet open={openMenu} onOpenChange={setOpenMenu}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-gray-400 hover:text-white transition-all">
                <Menu className="w-5 h-5 text-gray-300" />
                <span className="text-[10px] tracking-tight mt-0.5 font-medium leading-none">
                  Menu
                </span>
              </button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[85vw] sm:w-[380px] bg-[#0c0c0c] border-[#dc143c]/30 text-white p-0 flex flex-col justify-between z-[10000]">
              <SheetHeader className="p-5 border-b border-gray-800 text-left bg-gradient-to-r from-[#18080b] to-[#0c0c0c]">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-lg font-black text-white flex items-center gap-2">
                    <div className="bg-[#dc143c] p-1.5 rounded-lg">
                      <Gamepad2 className="w-4 h-4 text-white" />
                    </div>
                    Eforte <span className="text-[#dc143c]">Games</span>
                  </SheetTitle>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </Button>
                  </SheetClose>
                </div>

                {user ? (
                  <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{user.name || user.email}</p>
                      <p className="text-[11px] text-amber-400 flex items-center gap-1 font-semibold mt-0.5">
                        <Coins className="w-3 h-3" /> {user.forteCoins || 0} ForteCoins
                      </p>
                    </div>
                    <Badge className="bg-[#dc143c]/20 text-[#ff4d6d] border-[#dc143c]/40 text-[10px]">
                      {user.role === "admin" ? "Admin" : "Membro"}
                    </Badge>
                  </div>
                ) : (
                  <div className="mt-3">
                    <Button
                      onClick={() => (window.location.href = getLoginUrl())}
                      className="w-full bg-[#dc143c] hover:bg-[#b01030] text-white text-xs font-bold py-2.5 rounded-xl shadow-lg shadow-[#dc143c]/20"
                    >
                      <User className="w-4 h-4 mr-1.5" /> Entrar / Cadastrar
                    </Button>
                  </div>
                )}
              </SheetHeader>

              {/* Menu Options Scrollable */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                {menuSections.map((section) => (
                  <div key={section.title} className="space-y-2">
                    <h4 className="text-[11px] uppercase font-bold text-gray-500 tracking-wider px-2">
                      {section.title}
                    </h4>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <button
                            key={item.label}
                            onClick={() => handleNavigate(item.path)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-left transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <ItemIcon className={`w-4 h-4 ${item.color}`} />
                              <span className="text-xs font-semibold text-gray-200 group-hover:text-white">
                                {item.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.badge && (
                                <span className="bg-[#dc143c] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
                                  {item.badge}
                                </span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-300" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {user && user.role === "admin" && (
                  <div className="pt-2 border-t border-gray-800">
                    <button
                      onClick={() => handleNavigate("/admin")}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-300 hover:bg-purple-900/50"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold">Painel do Administrador</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-800 bg-[#080808] text-center text-[10px] text-gray-500">
                Eforte Games © 2026 — Todos os direitos reservados
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
