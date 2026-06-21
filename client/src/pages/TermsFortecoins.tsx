import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, BookOpen, AlertTriangle } from "lucide-react";

export default function TermsFortecoins() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"fortecoins" | "games">("fortecoins");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100 pb-20">
      {/* Header */}
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-red-600/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1 as any)} className="text-white hover:text-red-300">
              <ArrowLeft className="w-5 h-5 mr-2" /> Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-red-500" />
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Contratos e <span className="text-red-500">Termos</span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 max-w-4xl">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row gap-2 border-b border-slate-800 pb-4 mb-6">
          <button
            onClick={() => setActiveTab("fortecoins")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all ${
              activeTab === "fortecoins"
                ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                : "bg-slate-900/50 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-900"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Regulamento ForteCoins
          </button>
          <button
            onClick={() => setActiveTab("games")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all ${
              activeTab === "games"
                ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                : "bg-slate-900/50 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-900"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Licenciamento e Garantia de Jogos
          </button>
        </div>

        {/* Tab Content: ForteCoins */}
        {activeTab === "fortecoins" && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl card-neon animate-in fade-in duration-300">
            <div className="text-center mb-8 border-b border-slate-800 pb-6">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3">
                TERMO DE USO E REGULAMENTO DO PROGRAMA DE RECOMPENSAS FORTECOINS – EFORTEGAMES
              </h2>
              <p className="text-xs text-slate-505 uppercase tracking-widest font-bold">
                Versão Atualizada 2026
              </p>
            </div>

            <div className="space-y-8 text-sm sm:text-base text-slate-355 leading-relaxed text-justify">
              
              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  1. OBJETIVO
                </h3>
                <p>
                  O presente Termo de Uso e Regulamento tem por finalidade estabelecer as regras, condições e diretrizes aplicáveis ao Programa de Recompensas ForteCoins, disponibilizado pela EFORTEGAMES, visando recompensar a fidelidade, participação e engajamento dos usuários nas atividades promovidas pela plataforma.
                </p>
                <p>
                  Ao participar do Programa ForteCoins, o usuário declara ter lido, compreendido e aceitado integralmente os termos e condições aqui estabelecidos.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  2. DEFINIÇÃO DAS FORTECOINS
                </h3>
                <p>
                  As ForteCoins são moedas virtuais promocionais disponibilizadas pela EFORTEGAMES para utilização exclusiva dentro da plataforma e de seus serviços.
                </p>
                <p>
                  As ForteCoins possuem caráter exclusivamente promocional e não constituem moeda oficial, ativo financeiro, investimento, valor mobiliário, crédito financeiro ou qualquer outra forma de patrimônio econômico.
                </p>
                <div className="bg-slate-950/80 border border-red-950 p-4 rounded-xl space-y-2">
                  <p className="font-bold text-red-400 text-xs uppercase tracking-wider">As ForteCoins não poderão, em hipótese alguma:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs sm:text-sm">
                    <li>Ser convertidas em dinheiro;</li>
                    <li>Ser sacadas;</li>
                    <li>Ser transferidas para terceiros;</li>
                    <li>Ser comercializadas;</li>
                    <li>Ser negociadas entre usuários;</li>
                    <li>Gerar qualquer direito de natureza financeira perante a EFORTEGAMES.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  3. FORMAS DE ACÚMULO DE FORTECOINS
                </h3>
                <p>
                  Os usuários poderão acumular ForteCoins através das atividades disponibilizadas e reconhecidas pela EFORTEGAMES, incluindo:
                </p>
                <div className="space-y-4 pt-2">
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    <p className="font-bold text-white mb-1">a) Compras realizadas na plataforma</p>
                    <p className="text-slate-400 text-xs sm:text-sm">O usuário poderá receber ForteCoins em razão de compras efetuadas no site da EFORTEGAMES, conforme critérios de pontuação vigentes.</p>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    <p className="font-bold text-white mb-1">b) Revenda de contas, jogos ou serviços</p>
                    <p className="text-slate-400 text-xs sm:text-sm">A EFORTEGAMES poderá conceder ForteCoins aos usuários que realizarem negociações autorizadas e aprovadas pela plataforma.</p>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    <p className="font-bold text-white mb-1">c) Indicação de novos participantes</p>
                    <p className="text-slate-400 text-xs sm:text-sm">O usuário poderá receber ForteCoins ao indicar novos participantes para os grupos oficiais da EFORTEGAMES, desde que os indicados sejam pessoas reais, possuam cadastro legítimo e atendam aos requisitos da plataforma.</p>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    <p className="font-bold text-white mb-1">d) Compartilhamento de campanhas e conteúdos</p>
                    <p className="text-slate-400 text-xs sm:text-sm">A EFORTEGAMES poderá recompensar usuários que compartilharem conteúdos, promoções e campanhas oficiais da empresa por meio dos canais autorizados.</p>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    <p className="font-bold text-white mb-1">e) Participação em campanhas promocionais</p>
                    <p className="text-slate-400 text-xs sm:text-sm">A EFORTEGAMES poderá realizar campanhas promocionais temporárias que concedam ForteCoins adicionais aos participantes, conforme regulamento específico de cada ação.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  4. UTILIZAÇÃO DAS FORTECOINS
                </h3>
                <p>
                  As ForteCoins acumuladas poderão ser utilizadas para resgate de benefícios disponibilizados pela EFORTEGAMES, incluindo:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-slate-400 text-xs sm:text-sm">
                  <li>Descontos em produtos e serviços;</li>
                  <li>Jogos digitais;</li>
                  <li>Assinaturas;</li>
                  <li>Gift Cards;</li>
                  <li>Benefícios promocionais;</li>
                  <li>Serviços disponibilizados pela plataforma;</li>
                  <li>Premiações especiais e campanhas exclusivas.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  5. VALIDADE DAS FORTECOINS
                </h3>
                <p>
                  Todas as ForteCoins acumuladas possuem validade de <strong>90 (noventa) dias corridos</strong>, contados a partir da data em que forem creditadas ao usuário.
                </p>
                <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-xl space-y-2">
                  <p className="font-bold text-red-400 text-xs sm:text-sm">Após o término do prazo de validade:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs sm:text-sm">
                    <li>As ForteCoins serão automaticamente expiradas;</li>
                    <li>O saldo expirado será removido da conta do usuário;</li>
                    <li>Não haverá restituição, compensação ou reativação das ForteCoins expiradas;</li>
                  </ul>
                </div>
                <p className="text-xs sm:text-sm text-red-500 font-bold tracking-wide">
                  ⚠️ É responsabilidade exclusiva do usuário acompanhar seu saldo e prazo de utilização.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  6. REGRAS DE INDICAÇÃO E UTILIZAÇÃO
                </h3>
                <p>
                  É expressamente proibido: criar contas falsas, utilizar dados ou CPFs de terceiros sem autorização, utilizar CPFs de terceiros para obter vantagens indevidas, criar múltiplas contas para benefício próprio, simular indicações ou utilizar softwares e automações para fraudar o sistema.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  7. FRAUDES, IRREGULARIDADES E PENALIDADES
                </h3>
                <p>
                  Constatada qualquer fraude, irregularidade ou descumprimento deste regulamento, a EFORTEGAMES poderá aplicar penalidades tais como: cancelamento das ForteCoins, cancelamento de recompensas/jogos obtidos ilegalmente, suspensão temporária da conta, bloqueio definitivo da conta e do CPF vinculado.
                </p>
              </div>
            </div>
            
            <div className="mt-10 pt-6 border-t border-slate-800 text-center text-slate-500 text-xs space-y-1">
              <p className="font-bold text-slate-400">EFORTEGAMES</p>
              <p>Programa Oficial de Recompensas ForteCoins</p>
            </div>
          </div>
        )}

        {/* Tab Content: Games & Licensing */}
        {activeTab === "games" && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl card-neon animate-in fade-in duration-300">
            <div className="text-center mb-8 border-b border-slate-800 pb-6">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3">
                TERMOS DE USO, GARANTIA E LICENCIAMENTO DIGITAL – EFORTEGAMES
              </h2>
              <p className="text-xs text-slate-505 uppercase tracking-widest font-bold">
                Última atualização: 19/06/2026
              </p>
            </div>

            <div className="space-y-8 text-sm sm:text-base text-slate-355 leading-relaxed text-justify">
              
              <div className="bg-slate-950/80 border border-red-950 p-4 rounded-xl space-y-2 mb-6">
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Ao efetuar a compra de qualquer produto digital comercializado pela EFORTEGAMES, o cliente declara que leu, compreendeu e concordou integralmente com os presentes Termos de Uso, Garantia e Licenciamento Digital.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  1. DISPOSIÇÕES GERAIS
                </h3>
                <p>
                  A EFORTEGAMES atua na comercialização de licenças digitais para plataformas PlayStation. Todas as licenças comercializadas estão sujeitas às regras técnicas, operacionais e de segurança da plataforma PlayStation vigentes no momento da utilização.
                </p>
                <p>
                  O descumprimento de quaisquer disposições destes termos poderá resultar na perda do suporte, da garantia e da elegibilidade para futuras substituições ou migrações de licença.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  2. MODALIDADE PRIMÁRIA
                </h3>
                <p>
                  A licença na modalidade Primária destina-se ao uso conforme as orientações fornecidas pela EFORTEGAMES.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-emerald-950">
                    <p className="font-bold text-emerald-400 text-xs uppercase tracking-wider mb-1">Direitos do Cliente</p>
                    <ul className="list-inside list-disc text-xs space-y-1 text-slate-300">
                      <li>Utilizar o jogo em seu perfil pessoal.</li>
                      <li>Conquistar troféus em sua conta pessoal.</li>
                      <li>Salvar progresso normalmente em seu usuário.</li>
                    </ul>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-red-950">
                    <p className="font-bold text-red-400 text-xs uppercase tracking-wider mb-1">Obrigações do Cliente</p>
                    <ul className="list-inside list-disc text-xs space-y-1 text-slate-300">
                      <li>Não alterar e-mail, senha, ID ou dados da conta.</li>
                      <li>Não compartilhar a conta com terceiros.</li>
                      <li>Não realizar procedimentos não autorizados.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  3. MODALIDADE SECUNDÁRIA
                </h3>
                <p>
                  A licença na modalidade Secundária deverá ser utilizada estritamente conforme as orientações fornecidas pela EFORTEGAMES.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-emerald-950">
                    <p className="font-bold text-emerald-400 text-xs uppercase tracking-wider mb-1">Direitos do Cliente</p>
                    <ul className="list-inside list-disc text-xs space-y-1 text-slate-300">
                      <li>Utilizar o conteúdo adquirido na forma orientada pela loja.</li>
                    </ul>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-red-950">
                    <p className="font-bold text-red-400 text-xs uppercase tracking-wider mb-1">Obrigações do Cliente</p>
                    <ul className="list-inside list-disc text-xs space-y-1 text-slate-300">
                      <li>Não alterar e-mail, senha, ID ou dados da conta.</li>
                      <li>Não compartilhar a conta com terceiros.</li>
                      <li>Não usar em modalidade diferente da contratada.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  4. UTILIZAÇÃO INADEQUADA DA LICENÇA
                </h3>
                <p>
                  Será considerada utilização inadequada: alteração de dados da conta fornecida, compartilhamento com terceiros, empréstimo, revenda, uso em modalidade inadequada e descumprimento de orientações da loja. A utilização inadequada acarreta na perda de garantia e suspensão do suporte.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  5. ACESSO À CONTA E DISPOSITIVOS AUTORIZADOS
                </h3>
                <p>
                  É expressamente proibido realizar login da conta fornecida em celulares, computadores, navegadores, ou vincular ao PlayStation App sem autorização prévia. Acessos em dispositivos não autorizados geram bloqueios que não serão cobertos pela garantia.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  6. GARANTIA
                </h3>
                <p>
                  A EFORTEGAMES garante a entrega dos dados para acesso e suporte correspondente. A garantia não cobre formatação de console, troca de armazenamento (HD/SSD), exclusão manual da conta pelo cliente, suspensões ou bloqueios aplicados pela PlayStation, e mudanças globais de política da Sony/PlayStation. A loja não oferece garantia vitalícia.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  7. TROCA DE CONSOLE E MIGRAÇÕES
                </h3>
                <p>
                  Em caso de troca de console, o cliente deverá entrar em contato com a EFORTEGAMES antes de realizar qualquer procedimento. A migração ou nova ativação dependerá de viabilidade técnica, disponibilidade em estoque e regras vigentes da PlayStation, podendo exigir pagamento de taxas administrativas ou aquisição de nova licença compatível.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-black text-white border-l-4 border-red-600 pl-3">
                  8. POLÍTICAS DA PLAYSTATION E REEMBOLSO
                </h3>
                <p>
                  A EFORTEGAMES não possui qualquer vínculo oficial com a fabricante. Mudanças em atualizações ou políticas da PlayStation que afetem o compartilhamento de contas não caracterizam defeito do produto.
                </p>
                <p>
                  Por se tratar de produto digital cuja entrega consiste no fornecimento imediato de dados de acesso e licenciamento, não haverá reembolso após o envio das credenciais de acesso, exceto nos casos resguardados por lei.
                </p>
              </div>

            </div>
            
            <div className="mt-10 pt-6 border-t border-slate-800 text-center text-slate-500 text-xs space-y-1">
              <p className="font-bold text-slate-400">EFORTEGAMES</p>
              <p>Termos de Uso, Garantia e Licenciamento Digital de Jogos</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
