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
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
