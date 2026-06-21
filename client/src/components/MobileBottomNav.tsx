import { useLocation } from "wouter";
import { Home as HomeIcon, LayoutGrid, ShoppingBag, Flame, Zap } from "lucide-react";

export default function MobileBottomNav() {
  const [location, navigate] = useLocation();

  const scrollTo = (id: string) => {
    if (location !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      className="lg:hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: "#020617",
        borderTop: "2px solid rgba(185, 28, 28, 0.4)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "8px 4px",
        }}
      >
        {/* Início */}
        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            padding: "6px 12px",
            color: location === "/" ? "#ef4444" : "#94a3b8",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <HomeIcon style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 10, fontWeight: "bold" }}>Início</span>
        </button>

        {/* Categorias */}
        <button
          onClick={() => scrollTo("categorias")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            padding: "6px 12px",
            color: "#94a3b8",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <LayoutGrid style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 10, fontWeight: "bold" }}>Categorias</span>
        </button>

        {/* Minhas Compras */}
        <button
          onClick={() => navigate("/minhas-compras")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            padding: "6px 12px",
            color: location === "/minhas-compras" ? "#ef4444" : "#94a3b8",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <ShoppingBag style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 10, fontWeight: "bold" }}>Compras</span>
        </button>

        {/* Promoções */}
        <button
          onClick={() => navigate("/promocoes")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            padding: "6px 12px",
            color: location === "/promocoes" ? "#ef4444" : "#94a3b8",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Flame style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 10, fontWeight: "bold" }}>Promoções</span>
        </button>

        {/* Revenda */}
        <button
          onClick={() => navigate("/virar-vendedor")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            padding: "6px 12px",
            color: location === "/virar-vendedor" ? "#ef4444" : "#94a3b8",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Zap style={{ width: 20, height: 20, color: "#ef4444" }} />
          <span style={{ fontSize: 10, fontWeight: "bold", color: "#f87171" }}>Revenda</span>
        </button>
      </div>
    </div>
  );
}
