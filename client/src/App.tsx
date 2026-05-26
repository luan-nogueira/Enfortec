import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Router as WouterRouter, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Store from "./pages/Store";
import UsedMarketplace from "./pages/UsedMarketplace";
import DigitalMedia from "./pages/DigitalMedia";
import AdminDashboard from "./pages/AdminDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import BecomeSellerForm from "./pages/BecomeSellerForm";
import AddUsedProduct from "./pages/AddUsedProduct";
import SellDigitalProduct from "./pages/SellDigitalProduct";
import Login from "./pages/Login";
import CollaboratorDashboard from "./pages/CollaboratorDashboard";
import MyPurchases from "./pages/MyPurchases";
import FloatingChat from "./components/FloatingChat";
import FAQ from "./pages/FAQ";

import { useEffect } from "react";
import FortecoinsPage from "./pages/FortecoinsPage";

const WA_NUMBER = "554384253691";

function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Olá! Vim pelo site Eforte Games e gostaria de mais informações.")}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-[80] group"
      title="Falar no WhatsApp"
    >
      <div className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 shadow-[0_8px_30px_rgba(34,197,94,0.5)] flex items-center justify-center transition-all hover:scale-110 active:scale-95">
        <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.118-2.905-6.993C16.257 1.874 13.78 1.84 11.14 1.84 5.704 1.84 1.28 6.261 1.277 11.705c-.001 1.714.453 3.39 1.317 4.873L1.576 22.25l5.071-1.328z"/>
        </svg>
      </div>
      <span className="absolute left-16 bottom-3 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-green-500/30 shadow-xl pointer-events-none">
        Falar no WhatsApp
      </span>
    </a>
  );
}

function Router() {
  return (
    <WouterRouter>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/loja"} component={Store} />
        <Route path={"/usados"} component={UsedMarketplace} />
        <Route path={"/digital"} component={DigitalMedia} />
        <Route path={"/admin"} component={AdminDashboard} />
        <Route path={"/vendedor"} component={SellerDashboard} />
        <Route path={"/virar-vendedor"} component={BecomeSellerForm} />
        <Route path={"/vendedor/cadastro"} component={BecomeSellerForm} />
        <Route path={"/vendedor/novo-produto-usado"} component={AddUsedProduct} />
        <Route path={"/digital/vender"} component={SellDigitalProduct} />
        <Route path={"/login"} component={Login} />
        <Route path={"/colaborador"} component={CollaboratorDashboard} />
        <Route path={"/minhas-compras"} component={MyPurchases} />
        <Route path={"/fortecoins"} component={FortecoinsPage} />
        <Route path={"/faq"} component={FAQ} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("forte_referred_by", ref);
      console.log("[Referral] Referrer captured:", ref);
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          <FloatingChat />
          <WhatsAppButton />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
