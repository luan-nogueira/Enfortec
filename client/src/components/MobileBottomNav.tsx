import { useLocation } from "wouter";
import { HomeIcon, LayoutGrid, Tag, HelpCircle, Zap } from "lucide-react";

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

        {/* Anúncios */}
        <button
          onClick={() => scrollTo("anuncios")}
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
          <Tag style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 10, fontWeight: "bold" }}>Anúncios</span>
        </button>

        {/* FAQ */}
        <button
          onClick={() => navigate("/faq")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            padding: "6px 12px",
            color: location === "/faq" ? "#ef4444" : "#94a3b8",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <HelpCircle style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 10, fontWeight: "bold" }}>FAQ</span>
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
