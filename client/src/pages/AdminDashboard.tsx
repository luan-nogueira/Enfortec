import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Users, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";

const mockSalesData = [
  { name: "Jan", vendas: 4000, lucro: 2400 },
  { name: "Fev", vendas: 3000, lucro: 1398 },
  { name: "Mar", vendas: 2000, lucro: 9800 },
  { name: "Abr", vendas: 2780, lucro: 3908 },
  { name: "Mai", vendas: 1890, lucro: 4800 },
];

const mockProductsData = [
  { name: "Eletrônicos", value: 45 },
  { name: "Usados", value: 30 },
  { name: "Digital", value: 25 },
];

const COLORS = ["#f97316", "#22c55e", "#a855f7"];

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Acesso Negado</h1>
          <p className="text-slate-600 mb-6">Você não tem permissão para acessar esta página.</p>
          <Button onClick={() => navigate("/")}>Voltar para Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-red-600/20">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-neon">Painel Admin - EFORTE GAMES</h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-300">{user?.name}</span>
            <Button variant="outline" size="sm" className="border-red-600/50 hover:border-red-500">Sair</Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 card-neon">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm mb-2">Total de Vendas</p>
                <p className="text-3xl font-bold text-white">R$ 45.230</p>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </Card>
          <Card className="p-6 card-neon">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm mb-2">Lucro da Plataforma</p>
                <p className="text-3xl font-bold text-white">R$ 4.523</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-6 card-neon">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm mb-2">Usuários Ativos</p>
                <p className="text-3xl font-bold text-white">1.234</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-6 card-neon">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm mb-2">Pedidos Pendentes</p>
                <p className="text-3xl font-bold text-white">23</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 p-6 card-neon">
            <h2 className="text-lg font-semibold text-white mb-4">Vendas vs Lucro</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockSalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="vendas" fill="#f97316" />
                <Bar dataKey="lucro" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-6 card-neon">
            <h2 className="text-lg font-semibold text-white mb-4">Distribuição de Produtos</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockProductsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mockProductsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Management Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 card-neon">
            <h2 className="text-lg font-semibold text-white mb-4">Anúncios Pendentes</h2>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                       <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg border border-red-600/20">
                  <div>
                    <p className="font-medium text-white">Produto #{i}</p>
                    <p className="text-sm text-slate-400">Vendedor: User {i}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Rejeitar</Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">Aprovar</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 card-neon">
            <h2 className="text-lg font-semibold text-white mb-4">Configurações de Comissão</h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-lg border border-red-600/20">
                <label className="block text-sm font-medium text-white mb-2">
                  Comissão Padrão (%)
                </label>
                <input
                  type="number"
                  defaultValue="10"
                  className="w-full px-3 py-2 border border-red-600/30 rounded-lg bg-slate-900 text-white"
                />
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg border border-red-600/20">
                <label className="block text-sm font-medium text-white mb-2">
                  Comissão Produtos Digitais (%)
                </label>
                <input
                  type="number"
                  defaultValue="15"
                  className="w-full px-3 py-2 border border-red-600/30 rounded-lg bg-slate-900 text-white"
                />
              </div>
              <Button className="w-full bg-red-600 hover:bg-red-700 btn-neon">Salvar Configurações</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
