import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShieldCheck, LogOut, ArrowRight, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function TermsAcceptanceModal() {
  const { isAuthenticated, user, loading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Tab control: 'fortecoins' | 'games'
  const [activeTab, setActiveTab] = useState<"fortecoins" | "games">("fortecoins");

  // Scroll checking states
  const [scrolledForteCoins, setScrolledForteCoins] = useState(false);
  const [scrolledGames, setScrolledGames] = useState(false);

  // Acceptance checkbox states
  const [acceptedForteCoins, setAcceptedForteCoins] = useState(false);
  const [acceptedGames, setAcceptedGames] = useState(false);

  const forteCoinsScrollRef = useRef<HTMLDivElement>(null);
  const gamesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only open if logged in, load finished, and hasn't accepted either terms
    // Also ensure CPF completion modal has higher priority or they don't overlap.
    // Show terms modal only if user is logged in, loading is done, has CPF,
    // but lacks acceptedForteCoinsTerms or acceptedGamesTerms.
    if (!loading && isAuthenticated && user && user.cpf && (!user.acceptedForteCoinsTerms || !user.acceptedGamesTerms)) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isAuthenticated, user, loading]);

  const handleScroll = (
    e: React.UIEvent<HTMLDivElement>,
    setScrolled: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const target = e.currentTarget;
    // Calculate scroll distance
    const threshold = 15; // pixels from the bottom
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + threshold;
    if (isAtBottom) {
      setScrolled(true);
    }
  };

  const handleAccept = async () => {
    if (!acceptedForteCoins || !acceptedGames) {
      toast.error("Você deve ler e aceitar todos os termos para prosseguir.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (user?.id) {
        const userRef = doc(db, "users", user.id);
        await setDoc(
          userRef,
          {
            acceptedForteCoinsTerms: true,
            acceptedForteCoinsTermsAt: new Date().toISOString(),
            acceptedGamesTerms: true,
            acceptedGamesTermsAt: new Date().toISOString(),
          },
          { merge: true }
        );
        toast.success("Termos aceitos com sucesso!");
        setIsOpen(false);
      }
    } catch (err: any) {
      console.error("[Terms Acceptance Error]", err);
      toast.error("Erro ao salvar aceitação dos termos. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
          <div className="w-12 h-12 bg-red-950 border border-red-500/30 rounded-xl flex items-center justify-center text-red-500">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Contratos e Termos Obrigatórios</h2>
            <p className="text-slate-400 text-xs sm:text-sm">Por favor, leia e aceite os regulamentos abaixo para continuar na plataforma</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 border-b border-slate-800 pb-3 mb-4">
          <button
            onClick={() => setActiveTab("fortecoins")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === "fortecoins"
                ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                : "bg-slate-955 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            1. Regulamento ForteCoins
            {acceptedForteCoins && <span className="ml-1 text-green-400">✓</span>}
          </button>
          <button
            onClick={() => setActiveTab("games")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === "games"
                ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                : "bg-slate-955 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            2. Licenciamento e Garantia
            {acceptedGames && <span className="ml-1 text-green-400">✓</span>}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          
          {/* Tab 1: ForteCoins Terms */}
          {activeTab === "fortecoins" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div
                ref={forteCoinsScrollRef}
                onScroll={(e) => handleScroll(e, setScrolledForteCoins)}
                className="flex-1 overflow-y-auto pr-2 border border-slate-800 rounded-xl p-4 sm:p-6 bg-slate-950/60 text-slate-300 text-xs sm:text-sm space-y-4 mb-4 select-none"
              >
                <div className="text-center pb-4 mb-4 border-b border-slate-800">
                  <h3 className="text-sm sm:text-base font-black text-white uppercase">
                    TERMO DE USO E REGULAMENTO DO PROGRAMA DE RECOMPENSAS FORTECOINS – EFORTEGAMES
                  </h3>
                </div>

                <div className="space-y-4 text-justify">
                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">1. OBJETIVO</h4>
                    <p>O presente Termo de Uso e Regulamento tem por finalidade estabelecer as regras, condições e diretrizes aplicáveis ao Programa de Recompensas ForteCoins, disponibilizado pela EFORTEGAMES, visando recompensar a fidelidade, participação e engajamento dos usuários nas atividades promovidas pela plataforma.</p>
                    <p>Ao participar do Programa ForteCoins, o usuário declara ter lido, compreendido e aceitado integralmente os termos e condições aqui estabelecidos.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">2. DEFINIÇÃO DAS FORTECOINS</h4>
                    <p>As ForteCoins são moedas virtuais promocionais disponibilizadas pela EFORTEGAMES para utilização exclusiva dentro da plataforma e de seus serviços.</p>
                    <p>As ForteCoins possuem caráter exclusivamente promocional e não constituem moeda oficial, ativo financeiro, investimento, valor mobiliário, crédito financeiro ou qualquer outra forma de patrimônio econômico.</p>
                    <div className="bg-slate-900 border border-slate-850 p-3 rounded-lg text-[11px] text-slate-400">
                      <strong>As ForteCoins não poderão, em hipótese alguma:</strong>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5">
                        <li>Ser convertidas em dinheiro;</li>
                        <li>Ser sacadas;</li>
                        <li>Ser transferidas para terceiros ou comercializadas;</li>
                        <li>Gerar qualquer direito de natureza financeira perante a EFORTEGAMES.</li>
                      </ul>
                    </div>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">3. FORMAS DE ACÚMULO</h4>
                    <p>Os usuários poderão acumular ForteCoins através das atividades disponibilizadas pela EFORTEGAMES, incluindo:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Compras na plataforma:</strong> Cashback em moedas conforme pontuação vigente.</li>
                      <li><strong>Revenda:</strong> Recebimento de bônus por negociações autorizadas no marketplace.</li>
                      <li><strong>Indicação:</strong> Recompensa ao indicar novos participantes para grupos oficiais, desde que sejam legítimos.</li>
                      <li><strong>Campanhas:</strong> Compartilhamento de conteúdos e participações em ações promocionais oficiais.</li>
                    </ul>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">4. UTILIZAÇÃO</h4>
                    <p>As moedas podem ser usadas para resgatar benefícios na EFORTEGAMES: descontos em produtos, jogos digitais, assinaturas, Gift Cards e premiações especiais. A disponibilidade varia conforme o estoque e regras internas da empresa.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">5. VALIDADE</h4>
                    <p>Todas as ForteCoins acumuladas possuem validade de <strong>90 (noventa) dias corridos</strong> a partir do crédito. Após este prazo, expiram e são removidas da conta automaticamente, sem direito a reembolso ou reativação.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">6. REGRAS DE INDICAÇÃO E UTILIZAÇÃO</h4>
                    <p>É expressamente proibido criar contas falsas, utilizar dados ou CPFs de terceiros para obter vantagens indevidas, fraudar ou manipular o sistema de pontuação. Todas as atividades estão sujeitas a auditoria.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">7. FRAUDES E PENALIDADES</h4>
                    <p>Constatada qualquer irregularidade, a EFORTEGAMES poderá aplicar penalidades como: cancelamento total de moedas, cancelamento de prêmios/jogos adquiridos por fraude, suspensão ou bloqueio definitivo da conta e do CPF do usuário.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">8. CONSULTA E SUPORTE</h4>
                    <p>O saldo pode ser consultado na área do usuário. Em caso de divergências, o suporte oficial deve ser acionado. Os registros internos da plataforma são soberanos.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">9. NATUREZA PROMOCIONAL</h4>
                    <p>O programa possui fins exclusivamente promocionais e de fidelização, não gerando qualquer vínculo societário, trabalhista ou comercial.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">10. ENCERRAMENTO E ALTERAÇÃO</h4>
                    <p>A EFORTEGAMES reserva-se o direito de alterar, suspender ou encerrar o programa a qualquer momento, comunicando através de seus canais oficiais.</p>
                  </section>
                </div>
              </div>

              {/* Checkbox block for Tab 1 */}
              <div className="p-3 bg-slate-950/30 rounded-xl border border-slate-800/80 mb-4 flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="checkbox-fortecoins"
                    disabled={!scrolledForteCoins}
                    checked={acceptedForteCoins}
                    onCheckedChange={(checked) => setAcceptedForteCoins(checked === true)}
                    className="mt-0.5 border-slate-700 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="checkbox-fortecoins"
                      className={`text-xs font-bold transition-colors cursor-pointer ${
                        scrolledForteCoins ? "text-slate-200" : "text-slate-500"
                      }`}
                    >
                      Eu li e concordo com o Regulamento do Programa ForteCoins.
                    </label>
                    {!scrolledForteCoins && (
                      <p className="text-[10px] text-red-500 font-bold">
                        * Role o documento até o final para liberar este aceite.
                      </p>
                    )}
                  </div>
                </div>
                
                {scrolledForteCoins && !acceptedForteCoins && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAcceptedForteCoins(true)}
                      className="text-red-500 hover:text-red-400 font-bold text-xs h-auto p-1"
                    >
                      Marcar como Aceito
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Games Terms */}
          {activeTab === "games" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div
                ref={gamesScrollRef}
                onScroll={(e) => handleScroll(e, setScrolledGames)}
                className="flex-1 overflow-y-auto pr-2 border border-slate-800 rounded-xl p-4 sm:p-6 bg-slate-950/60 text-slate-300 text-xs sm:text-sm space-y-4 mb-4 select-none"
              >
                <div className="text-center pb-4 mb-4 border-b border-slate-800">
                  <h3 className="text-sm sm:text-base font-black text-white uppercase">
                    TERMOS DE USO, GARANTIA E LICENCIAMENTO DIGITAL – EFORTEGAMES
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">Última atualização: 19/06/2026</p>
                </div>

                <div className="space-y-4 text-justify">
                  <p className="italic text-slate-400">Ao efetuar a compra de qualquer produto digital comercializado pela EFORTEGAMES, o cliente declara que leu, compreendeu e concordou integralmente com os presentes Termos de Uso, Garantia e Licenciamento Digital.</p>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">1. DISPOSIÇÕES GERAIS</h4>
                    <p>A EFORTEGAMES atua na comercialização de licenças digitais para plataformas PlayStation. Todas as licenças comercializadas estão sujeitas às regras técnicas, operacionais e de segurança da plataforma PlayStation vigentes no momento da utilização. O descumprimento de quaisquer regras poderá resultar na perda do suporte, garantia ou elegibilidade para substituições.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">2. MODALIDADE PRIMÁRIA</h4>
                    <p>A licença destina-se ao uso conforme orientações fornecidas.</p>
                    <p><strong>Direitos:</strong> Jogar em seu perfil pessoal, conquistar troféus em sua conta e salvar progresso normalmente.</p>
                    <p><strong>Obrigações:</strong> Não alterar e-mail, senha, ID ou dados da conta; não compartilhar com terceiros; não realizar procedimentos não autorizados.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">3. MODALIDADE SECUNDÁRIA</h4>
                    <p>A licença deve ser utilizada estritamente conforme orientações.</p>
                    <p><strong>Direitos:</strong> Jogar na conta fornecida pela loja (requer conexão constante à internet).</p>
                    <p><strong>Obrigações:</strong> Não alterar quaisquer dados; não compartilhar a conta; não utilizar em modalidade diferente da adquirida.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">4. UTILIZAÇÃO INADEQUADA DA LICENÇA</h4>
                    <p>São consideradas infrações: alteração de dados, compartilhamento, empréstimo, revenda, uso em modo diferente do adquirido e não seguir as instruções da loja. Infrações acarretam perda total de garantia e suporte.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">5. ACESSO À CONTA E DISPOSITIVOS AUTORIZADOS</h4>
                    <p>É expressamente proibido realizar login da conta fornecida em celulares, computadores, navegadores, ou vincular ao PlayStation App sem autorização. Acessos não autorizados geram bloqueios e não possuem cobertura de garantia.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">6. GARANTIA</h4>
                    <p>Garantimos a entrega dos dados e suporte inicial. A garantia não cobre: formatação do console, troca de armazenamento (HD/SSD), exclusão manual da conta pelo cliente, banimentos/bloqueios causados por atos do cliente ou mudanças de política da Sony/PlayStation. A loja não oferece garantia vitalícia.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">7. TROCA DE CONSOLE</h4>
                    <p>Em caso de troca de console, contate-nos antes. A migração dependerá exclusivamente da disponibilidade em estoque, limitações técnicas e das regras vigentes da PlayStation no momento. A troca não garante ativação gratuita em novo console.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">8. COMPATIBILIDADE E MIGRAÇÃO</h4>
                    <p>Trocas de console ou geração podem exigir licenças compatíveis. Poderá haver cobrança de taxa operacional ou necessidade de aquisição de nova licença. A loja não garante upgrades gratuitos entre gerações.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">9. INDISPONIBILIDADE DE LICENÇA</h4>
                    <p>Caso não haja estoque para migração ou suporte, o cliente pode aguardar ou solicitar análise de recompra/revenda pela loja, o que dependerá exclusivamente de critérios comerciais (sem obrigatoriedade para a EforteGames).</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">10. POLÍTICAS DA PLAYSTATION</h4>
                    <p>A EFORTEGAMES não possui vínculo oficial com a fabricante. Mudanças em atualizações ou políticas da PlayStation que afetem o compartilhamento de contas não caracterizam defeito e não geram obrigação de reembolso ou troca.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">11. REEMBOLSO</h4>
                    <p>Por se tratar de um produto digital cuja entrega expõe os dados de acesso, não haverá reembolso após o envio dos dados, exceto em casos legalmente resguardados.</p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-white border-l-2 border-red-500 pl-2">12. ACEITAÇÃO</h4>
                    <p>O cliente declara estar ciente de todas as regras, ciente das diferenças de modalidade e concorda integralmente com as restrições operacionais descritas neste termo.</p>
                  </section>
                </div>
              </div>

              {/* Checkbox block for Tab 2 */}
              <div className="p-3 bg-slate-950/30 rounded-xl border border-slate-800/80 mb-4 flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="checkbox-games"
                    disabled={!scrolledGames}
                    checked={acceptedGames}
                    onCheckedChange={(checked) => setAcceptedGames(checked === true)}
                    className="mt-0.5 border-slate-700 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="checkbox-games"
                      className={`text-xs font-bold transition-colors cursor-pointer ${
                        scrolledGames ? "text-slate-200" : "text-slate-500"
                      }`}
                    >
                      Eu li e concordo com os Termos de Uso, Garantia e Licenciamento Digital.
                    </label>
                    {!scrolledGames && (
                      <p className="text-[10px] text-red-500 font-bold">
                        * Role o documento até o final para liberar este aceite.
                      </p>
                    )}
                  </div>
                </div>

                {scrolledGames && !acceptedGames && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAcceptedGames(true)}
                      className="text-red-500 hover:text-red-400 font-bold text-xs h-auto p-1"
                    >
                      Marcar como Aceito
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 border-t border-slate-800 pt-4 mt-2">
          <Button
            variant="ghost"
            onClick={() => logout()}
            className="w-full sm:w-auto text-slate-400 hover:text-white hover:bg-slate-850 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Fazer Logout / Sair
          </Button>

          <div className="flex-1" />

          {/* Tab switching navigation helper */}
          {activeTab === "fortecoins" && (
            <Button
              onClick={() => {
                if (!acceptedForteCoins) {
                  toast.warning("Marque o aceite das ForteCoins antes de passar para a próxima aba.");
                } else {
                  setActiveTab("games");
                }
              }}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-2"
            >
              Próximo Termo
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}

          {activeTab === "games" && (
            <Button
              onClick={handleAccept}
              disabled={isSubmitting || !acceptedForteCoins || !acceptedGames}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-black px-8 py-5 text-sm sm:text-base shadow-[0_0_20px_rgba(220,38,38,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? "Salvando..." : "Aceitar todos e Entrar"}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
