import { trpc } from "@/lib/trpc";
import { WA_ATTENDANT_DEFAULT_NUMBERS } from "@shared/whatsapp";

// Atendentes do WhatsApp — usado em qualquer lugar do site que precise deixar o
// cliente escolher com quem falar (chat, pechincha, etc.) em vez de mandar direto
// pro número genérico de suporte.
export const WA_ATTENDANTS = [
  {
    name: "Andre",
    role: "Suporte & Vendas",
    number: WA_ATTENDANT_DEFAULT_NUMBERS.Andre,
    avatar: "A",
    color: "bg-red-600",
  },
  {
    name: "Sandro",
    role: "Suporte & Vendas",
    number: WA_ATTENDANT_DEFAULT_NUMBERS.Sandro,
    avatar: "S",
    color: "bg-blue-600",
  },
];

// Mesma lista, mas com o número que o admin cadastrou pra cada atendente no painel
// (Sistema > WhatsApp) no lugar do padrão acima — assim quem troca de telefone muda num
// lugar só e vale pra pechincha e pro chat. O padrão fica de reserva enquanto a
// configuração não carregou ou se o campo ficou em branco.
export function useWaAttendants() {
  const { data: platformSettings } = trpc.settings.get.useQuery();
  const saved = (platformSettings?.waAttendantNumbers || {}) as Record<string, string>;
  return WA_ATTENDANTS.map((att) => (saved[att.name] ? { ...att, number: saved[att.name] } : att));
}
