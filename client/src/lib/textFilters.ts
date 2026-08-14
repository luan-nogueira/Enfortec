/**
 * Detecta links em mensagens de chat. Usado pra bloquear comprador/vendedor
 * combinando negociação fora da plataforma (perde a Garantia Eforte Games).
 */
const LINK_PATTERN =
  /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|com\.br|net|org|me|io|link|shop|store|app|co|gg)\b(\/\S*)?/i;

export function containsLink(text: string): boolean {
  return LINK_PATTERN.test(text);
}

export const LINK_BLOCKED_MESSAGE =
  "Não é permitido enviar links pelo chat. Combine tudo por aqui e finalize pela plataforma pra manter a Garantia Eforte Games.";
