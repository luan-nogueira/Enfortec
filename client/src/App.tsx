import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Router as WouterRouter, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import FloatingChat from "./components/FloatingChat";
import SocialProofToast from "./components/SocialProofToast";
import MobileBottomNav from "./components/MobileBottomNav";
import CPFCompletionModal from "./components/CPFCompletionModal";
import TermsAcceptanceModal from "./components/TermsAcceptanceModal";

import { lazy, Suspense, useEffect, useState } from "react";
import MaintenanceScreen from "./components/MaintenanceScreen";
import { useAuth } from "./_core/hooks/useAuth";
import { db } from "./lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// Rotas fora da Home carregadas sob demanda: reduz o bundle inicial
// (o painel /admin sozinho tem ~5 mil linhas) e acelera o primeiro carregamento da loja.
const Store = lazy(() => import("./pages/Store"));
const UsedMarketplace = lazy(() => import("./pages/UsedMarketplace"));
const DigitalMedia = lazy(() => import("./pages/DigitalMedia"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PromotionsPage = lazy(() => import("./pages/PromotionsPage"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const BecomeSellerForm = lazy(() => import("./pages/BecomeSellerForm"));
const AddUsedProduct = lazy(() => import("./pages/AddUsedProduct"));
const SellDigitalProduct = lazy(() => import("./pages/SellDigitalProduct"));
const Login = lazy(() => import("./pages/Login"));
const CollaboratorDashboard = lazy(() => import("./pages/CollaboratorDashboard"));
const MyPurchases = lazy(() => import("./pages/MyPurchases"));
const FAQ = lazy(() => import("./pages/FAQ"));
const TermsFortecoins = lazy(() => import("./pages/TermsFortecoins"));
const Reviews = lazy(() => import("./pages/Reviews"));
const PlatinadorPage = lazy(() => import("./pages/PlatinadorPage"));
const JogueComEconomia = lazy(() => import("./pages/JogueComEconomia"));
const FortecoinsPage = lazy(() => import("./pages/FortecoinsPage"));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <WouterRouter>
      <Suspense fallback={<RouteFallback />}>
        <Switch>
          <Route path={"/"} component={Home} />
          <Route path={"/loja"} component={Store} />
          <Route path={"/usados"} component={UsedMarketplace} />
          <Route path={"/digital"} component={DigitalMedia} />
          <Route path={"/jogue-com-economia"} component={JogueComEconomia} />
          <Route path={"/economia"} component={JogueComEconomia} />
          <Route path={"/promocoes"} component={PromotionsPage} />
          <Route path={"/platinador"} component={PlatinadorPage} />
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
          <Route path={"/termos"} component={TermsFortecoins} />
          <Route path={"/faq"} component={FAQ} />
          <Route path={"/avaliacoes"} component={Reviews} />
          <Route path={"/404"} component={NotFound} />
          {/* Final fallback route */}
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </WouterRouter>
  );
}
function App() {
  const { isAdmin, loading: isAuthLoading } = useAuth();
  const [maintenanceConfig, setMaintenanceConfig] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "maintenance"), (docSnap) => {
      if (docSnap.exists()) {
        setMaintenanceConfig(docSnap.data());
      } else {
        setMaintenanceConfig(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("forte_referred_by", ref);
      console.log("[Referral] Referrer captured:", ref);
    }
  }, []);

  if (!isAuthLoading && maintenanceConfig?.isActive && !isAdmin) {
    return (
      <ThemeProvider defaultTheme="light">
        <MaintenanceScreen 
          title={maintenanceConfig.title} 
          message={maintenanceConfig.message} 
        />
      </ThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          <FloatingChat />
          <SocialProofToast />
          <MobileBottomNav />
          <CPFCompletionModal />
          <TermsAcceptanceModal />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
