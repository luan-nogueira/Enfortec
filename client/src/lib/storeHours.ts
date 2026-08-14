/**
 * Horário de Funcionamento da EforteGames:
 * - Segunda a Sábado: 08:00 às 22:00
 * - Domingo: 08:00 às 16:00
 */

export interface StoreStatus {
  isOpen: boolean;
  statusText: string;
  nextOpeningText: string;
  noticeMessage: string;
}

export function getStoreStatus(date: Date = new Date()): StoreStatus {
  // Ajusta/verifica no fuso horário do Brasil (America/Sao_Paulo)
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "America/Sao_Paulo",
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  };
  
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(date);
  
  let weekdayStr = "";
  let hour = date.getHours();

  for (const part of parts) {
    if (part.type === "weekday") weekdayStr = part.value.toLowerCase();
    if (part.type === "hour") hour = parseInt(part.value, 10);
  }

  // Fallback se Intl falhar
  const day = date.getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sáb
  const isSunday = weekdayStr ? (weekdayStr.includes("sun")) : (day === 0);

  let isOpen = false;
  let nextOpeningText = "";

  if (isSunday) {
    // Domingo: 08:00 às 16:00
    if (hour >= 8 && hour < 16) {
      isOpen = true;
    } else {
      isOpen = false;
      nextOpeningText = hour >= 16 ? "segunda-feira às 08:00" : "hoje (domingo) às 08:00";
    }
  } else {
    // Segunda a Sábado: 08:00 às 22:00
    if (hour >= 8 && hour < 22) {
      isOpen = true;
    } else {
      isOpen = false;
      const isSaturday = weekdayStr ? weekdayStr.includes("sat") : day === 6;
      if (isSaturday && hour >= 22) {
        nextOpeningText = "domingo às 08:00";
      } else if (hour >= 22) {
        nextOpeningText = "amanhã às 08:00";
      } else {
        nextOpeningText = "hoje às 08:00";
      }
    }
  }

  const statusText = isOpen
    ? "Loja Aberta • Entregas Instantâneas"
    : "Loja Fechada • Atendimento encerrado";

  const noticeMessage =
    `Aviso de Horário de Atendimento: A compra foi realizada fora do horário de funcionamento da loja (Segunda a Sábado até 22h / Domingo até 16h). Seu pedido foi registrado com sucesso e o envio da mídia digital será realizado ${nextOpeningText} assim que a loja abrir!`;

  return {
    isOpen,
    statusText,
    nextOpeningText,
    noticeMessage,
  };
}
