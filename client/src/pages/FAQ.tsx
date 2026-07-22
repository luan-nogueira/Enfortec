import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronUp, HelpCircle, MessageCircle } from "lucide-react";
import { useState } from "react";

const WA = "https://wa.me/554384253691";

const faqs = [
  {
    category: "💳 Pagamento",
    items: [
      {
        q: "Quais formas de pagamento são aceitas?",
        a: "Aceitamos Pix, Cartão de Crédito (parcelado em até 12x) e Boleto Bancário. Todos os pagamentos são processados com segurança via InfinitePay."
      },
      {
        q: "É seguro comprar aqui?",
        a: "Sim! Utilizamos criptografia SSL e o sistema antifraude da InfinitePay. Sua compra tem garantia total — se não receber o produto, você é reembolsado."
      },
      {
        q: "O pagamento é processado imediatamente?",
        a: "Pagamentos via Pix são confirmados em segundos. Cartão de crédito pode levar alguns minutos e boleto bancário até 1 dia útil para compensar."
      },
    ]
  },
  {
    category: "📦 Entrega",
    items: [
      {
        q: "Como recebo minha mídia digital?",
        a: "Após a confirmação do pagamento, você recebe o código de ativação diretamente no WhatsApp ou e-mail cadastrado. A entrega é quase instantânea — em média em até 30 minutos no horário comercial."
      },
      {
        q: "Comprei um produto físico. Como funciona o envio?",
        a: "Produtos físicos usados são enviados pelos Correios com código de rastreio. O prazo de entrega varia de 3 a 10 dias úteis dependendo da sua localização."
      },
      {
        q: "E se eu não receber meu produto?",
        a: "Entre em contato pelo WhatsApp imediatamente. Verificamos o pedido e, se confirmado o problema, realizamos o reenvio ou reembolso total."
      },
    ]
  },
  {
    category: "🎮 Produtos",
    items: [
      {
        q: "Os jogos digitais são originais?",
        a: "Sim! Todos os jogos digitais vendidos são originais, com código de ativação válido para PlayStation Store, Steam, Xbox ou outra plataforma indicada."
      },
      {
        q: "Posso usar o jogo em mais de um console?",
        a: "Depende do tipo de conta. Para jogos de conta primária PS4/PS5, é possível jogar em qualquer console configurado como primário. Consulte nosso atendimento para mais detalhes."
      },
      {
        q: "Os produtos usados têm garantia?",
        a: "Sim! Todos os produtos físicos usados passam por verificação antes do envio e têm garantia de 30 dias contra defeitos. Leia a descrição do anúncio para detalhes específicos."
      },
    ]
  },
  {
    category: "🏆 ForteCoins",
    items: [
      {
        q: "O que são ForteCoins?",
        a: "ForteCoins (FC) são os pontos de fidelidade da Eforte Games. Você os acumula comprando jogos, indicando amigos e participando de promoções. Com eles você resgata gift cards e outros prêmios!"
      },
      {
        q: "Como ganho ForteCoins?",
        a: "Você ganha FC ao: realizar compras, indicar amigos que se cadastram (15 FC por indicação que fizer uma compra), e através de promoções especiais que lançamos periodicamente."
      },
      {
        q: "Os ForteCoins expiram?",
        a: "Atualmente os ForteCoins não expiram. Acumule à vontade e resgate quando quiser! Mas fique de olho nas atualizações — podemos implementar validade futuramente."
      },
      {
        q: "Como resgato meus ForteCoins?",
        a: "Acesse a página ForteCoins no menu, escolha um prêmio disponível e clique em 'Resgatar'. O administrador envia seu prêmio (código, gift card, etc.) em até 24 horas pelo WhatsApp."
      },
    ]
  },
  {
    category: "🛒 Como Comprar",
    items: [
      {
        q: "Como faço para comprar?",
        a: "Navegue pelo catálogo de Mídia Digital ou Usados, clique no produto desejado e depois em 'Comprar via WhatsApp'. Você será redirecionado para nosso atendimento que vai finalizar o pedido."
      },
      {
        q: "Preciso criar uma conta para comprar?",
        a: "Não é obrigatório, mas recomendamos criar conta com Google para acumular ForteCoins, acompanhar pedidos e ter um histórico de compras."
      },
      {
        q: "Como vendo meus jogos usados?",
        a: "Faça login, acesse a página 'Revendedor' para criar sua loja (ou o botão 'Vender meu Produto' na aba de Usados se já possuir cadastro) e cadastre seus produtos usados com fotos, descrição e preço. Nossa equipe aprova o anúncio em até 24 horas."
      },
    ]
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${open ? "border-red-500/40 bg-red-950/10" : "border-slate-800 bg-slate-900/50 hover:border-slate-700"}`}
      onClick={() => setOpen(!open)}
    >
      <div className="flex justify-between items-center p-4 gap-3">
        <p className="text-white font-semibold text-sm">{q}</p>
        {open
          ? <ChevronUp className="w-4 h-4 text-red-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        }
      </div>
      {open && (
        <div className="px-4 pb-4 text-slate-300 text-sm leading-relaxed border-t border-slate-800/60 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-950/60 to-slate-950 border-b border-red-600/20 sticky top-0 z-50 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-white hover:text-red-300">
            <ArrowLeft className="w-5 h-5 mr-2" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-red-500" />
            <h1 className="text-2xl font-black text-white">Perguntas <span className="text-red-500">Frequentes</span></h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Intro */}
        <div className="text-center mb-12">
          <p className="text-slate-400 text-lg">
            Tudo que você precisa saber sobre a <strong className="text-white">Eforte Games</strong>.
            Não encontrou sua resposta?{" "}
            <a href={WA} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline font-bold">
              Fale conosco no WhatsApp!
            </a>
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-10">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2 border-l-4 border-red-600 pl-3">
                {section.category}
              </h2>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-r from-red-950/40 to-slate-900 border border-red-600/30 rounded-2xl p-8 text-center">
          <MessageCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-2xl font-black text-white mb-2">Ainda tem dúvidas?</h3>
          <p className="text-slate-400 mb-6">Nossa equipe está online e pronta para te ajudar agora mesmo!</p>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 text-lg rounded-xl shadow-[0_0_20px_rgba(22,163,74,0.3)]"
            onClick={() => window.open(WA, "_blank")}
          >
            <svg className="w-5 h-5 fill-current mr-2" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.118-2.905-6.993C16.257 1.874 13.78 1.84 11.14 1.84 5.704 1.84 1.28 6.261 1.277 11.705c-.001 1.714.453 3.39 1.317 4.873L1.576 22.25l5.071-1.328z"/>
            </svg>
            Falar com Atendimento
          </Button>
        </div>
      </div>
    </div>
  );
}
