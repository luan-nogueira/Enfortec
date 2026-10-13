// Texto que vai pro comprador junto com a conta do jogo: na entrega automática (pool de
// contas) e no botão "Fornecer Jogo" da entrega manual. O admin edita em Sistema > Texto
// Automático de Entrega; os marcadores abaixo são trocados pelos dados reais do pedido.
export const DELIVERY_MESSAGE_PLACEHOLDERS = [
  { key: "{email}", label: "E-mail / login da conta", required: true },
  { key: "{senha}", label: "Senha da conta", required: true },
  { key: "{jogo}", label: "Nome do jogo", required: false },
  { key: "{cliente}", label: "Nome do cliente", required: false },
  { key: "{pedido}", label: "Número do pedido", required: false },
  { key: "{contatos}", label: "WhatsApp dos atendentes (os cadastrados no card de WhatsApp)", required: false },
] as const;

// Enquanto o admin não salva um texto dele, cada entrega continua com o texto que sempre
// teve: este na automática...
export const DEFAULT_DELIVERY_MESSAGE_TEMPLATE = `🎮 Obrigado por comprar na EforteGames!

Segue o acesso da sua conta — é só entrar e aproveitar:

📧 Email: {email}
🔑 Senha: {senha}

Qualquer dúvida ou problema pra acessar, você encontra vídeos de ajuda e o contato do nosso suporte logo abaixo. Bom jogo! 🔥`;

// ...e este no "Fornecer Jogo" (era montado fixo no painel, com os telefones escritos à mão).
export const DEFAULT_MANUAL_DELIVERY_MESSAGE_TEMPLATE = `Obrigado por adquirir o jogo {jogo}, aqui está o login e senha para acesso a conta:

Login: {email}
Senha: {senha}

Qualquer coisa estaremos a disposição para ajudar no que precisar, você pode entrar em contato conosco pelo chat do site ou pelos nossos WhatsApp:
{contatos}`;

/** Texto sem {email} ou sem {senha} deixaria o cliente sem o acesso que ele pagou. */
export function isValidDeliveryMessageTemplate(template: string) {
  const lower = template.toLowerCase();
  return lower.includes("{email}") && lower.includes("{senha}");
}

export function renderDeliveryMessage(
  template: string | null | undefined,
  values: { email: string; senha: string; jogo?: string | null; cliente?: string | null; pedido?: number | string | null; contatos?: string | null },
  fallbackTemplate: string = DEFAULT_DELIVERY_MESSAGE_TEMPLATE
) {
  // Sem texto salvo (ou salvo quebrado por algum caminho que não o painel) vale o padrão.
  const base = template && template.trim() && isValidDeliveryMessageTemplate(template) ? template : fallbackTemplate;
  const data: Record<string, string> = {
    email: values.email,
    senha: values.senha,
    jogo: values.jogo || "seu jogo",
    cliente: values.cliente || "Cliente",
    pedido: values.pedido != null ? String(values.pedido) : "",
    contatos: values.contatos || "",
  };
  // Troca por função (e não por string) pra senha com "$&", "$1" etc. não ser
  // interpretada como padrão especial do replace e sair corrompida pro cliente.
  return base.replace(/\{(email|senha|jogo|cliente|pedido|contatos)\}/gi, (_match, key: string) => data[key.toLowerCase()]);
}
