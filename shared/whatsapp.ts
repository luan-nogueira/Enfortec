// Número padrão de cada atendente (chave = nome usado em client/src/lib/waAttendants.ts).
// Vale enquanto o admin não cadastrar outro em Sistema > WhatsApp — o que ele salvar fica
// em platform_settings.waAttendantNumbers e passa por cima destes.
export const WA_ATTENDANT_DEFAULT_NUMBERS: Record<string, string> = {
  Andre: "554384253691",
  Sandro: "5571987650840",
};

// Como o nome de cada atendente aparece escrito pro cliente.
const WA_ATTENDANT_LABELS: Record<string, string> = { Andre: "André" };

/**
 * Deixa um telefone digitado pelo admin no formato que vai em wa.me/<numero>: só dígitos,
 * com o 55 na frente se ele esqueceu. Devolve null se não parecer um número válido.
 */
export function normalizeWhatsappNumber(raw: string): string | null {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits.length >= 12 && digits.length <= 15 ? digits : null;
}

/** "554384253691" -> "+55 43 8425-3691". Número fora do padrão brasileiro sai como "+<dígitos>". */
export function formatWhatsappForDisplay(digits: string) {
  const br = digits.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return br ? `+55 ${br[1]} ${br[2]}-${br[3]}` : `+${digits}`;
}

/**
 * Lista dos contatos pra colar num texto ("• André: +55 43 8425-3691" / "• Sandro: ..."),
 * já com o número que o admin cadastrou pra cada atendente (ou o padrão, se não cadastrou).
 */
export function attendantContactsText(saved?: Record<string, string> | null) {
  return Object.keys(WA_ATTENDANT_DEFAULT_NUMBERS)
    .map((name) => `• ${WA_ATTENDANT_LABELS[name] || name}: ${formatWhatsappForDisplay(saved?.[name] || WA_ATTENDANT_DEFAULT_NUMBERS[name])}`)
    .join("\n");
}
