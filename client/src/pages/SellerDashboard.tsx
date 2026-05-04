import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plus, TrendingUp, ShoppingCart, Star, Flame } from "lucide-react";
import { useState } from "react";

const mockEarningsData = [
  { name: "Semana 1", ganho: 1200 },
  { name: "Semana 2", ganho: 1900 },
  { name: "Semana 3", ganho: 1500 },
  { name: "Semana 4", ganho: 2200 },
];

export default function SellerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"vendas" | "produtos" | "avaliacoes">("vendas");

  const { data: seller } = trpc.sellers.getByUserId.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: usedProducts } = trpc.usedProducts.getByUserId.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: orders } = trpc.orders.getBySellerId.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="text-center card-neon p-8 max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Acesso Negado</h1>
          <p className="text-slate-400 mb-6">Você precisa estar logado para acessar esta página.</p>
          <Button onClick={() => navigate("/")} className="bg-red-600 hover:bg-red-700 btn-neon">Voltar para Home</Button>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="text-center card-neon p-8 max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Torne-se um Vendedor</h1>
          <p className="text-slate-400 mb-6">Você ainda não é um vendedor. Clique abaixo para se cadastrar.</p>
          <Button onClick={() => navigate("/virar-vendedor")} className="bg-red-600 hover:bg-red-700 btn-neon w-full">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar como Vendedor
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-red-600/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Flame className="w-8 h-8 text-red-500" />
            <div>
              <h1 className="text-3xl font-bold text-neon">Painel do Vendedor</h1>
              <p className="text-slate-400 text-sm">Bem-vindo, {user?.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 card-neon">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm mb-2">Ganho Total</p>
                <p className="text-3xl font-bold text-white">R$ 5.320</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-6 card-neon">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm mb-2">Produtos Ativos</p>
                <p className="text-3xl font-bold text-white">{usedProducts?.length || 0}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-6 card-neon">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm mb-2">Avaliação</p>
                <p className="text-3xl font-bold text-white">4.8 ⭐</p>
              </div>
              <Star className="w-8 h-8 text-red-500" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex gap-4 border-b border-red-600/20">
            <button
              onClick={() => setActiveTab("vendas")}
              className={`px-6 py-3 font-bold transition ${
                activeTab === "vendas"
                  ? "text-red-500 border-b-2 border-red-500"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Vendas
            </button>
            <button
              onClick={() => setActiveTab("produtos")}
              className={`px-6 py-3 font-bold transition ${
                activeTab === "produtos"
                  ? "text-red-500 border-b-2 border-red-500"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Meus Produtos
            </button>
            <button
              onClick={() => setActiveTab("avaliacoes")}
              className={`px-6 py-3 font-bold transition ${
                activeTab === "avaliacoes"
                  ? "text-red-500 border-b-2 border-red-500"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Avaliações
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "vendas" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 card-neon">
              <h2 className="text-lg font-semibold text-white mb-4">Ganhos Semanais</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockEarningsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #FF6B35" }} />
                  <Legend />
                  <Bar dataKey="ganho" fill="#FF6B35" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-6 card-neon">
              <h2 className="text-lg font-semibold text-white mb-4">Últimas Vendas</h2>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 bg-slate-800/50 rounded-lg border border-red-600/20">
                    <p className="text-white font-medium">Venda #{i}</p>
                    <p className="text-sm text-slate-400">R$ {(1000 * i).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "produtos" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Meus Produtos</h2>
              <Button className="bg-red-600 hover:bg-red-700 btn-neon">
                <Plus className="w-4 h-4 mr-2" />
                Novo Produto
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {usedProducts?.map((product) => (
                <Card key={product.id} className="p-6 card-neon">
                  <h3 className="text-lg font-bold text-white mb-2">{product.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-red-500">R$ {product.price}</span>
                    <span className="text-xs bg-red-600/20 text-red-400 px-2 py-1 rounded">
                      {product.status}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "avaliacoes" && (
          <Card className="p-6 card-neon">
            <h2 className="text-lg font-semibold text-white mb-4">Avaliações dos Clientes</h2>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-slate-800/50 rounded-lg border border-red-600/20">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-white font-medium">Cliente #{i}</p>
                    <span className="text-red-500">{"⭐".repeat(5)}</span>
                  </div>
                  <p className="text-slate-400 text-sm">Excelente produto! Recomendo.</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
