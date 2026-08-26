import { toast } from "sonner";

export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

/**
 * Retorna o estado atual da permissão de notificações do navegador/Windows
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Toca um som harmônico cristalino e moderno (estilo Slack/WhatsApp)
 * usando a Web Audio API, sem depender de arquivos externos.
 */
export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Nota 1 (Dó5 + Mi5) - Tonalidade inicial
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now); // E5

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.3, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(gain1);
    osc2.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);

    // Nota 2 (Sol5 + Dó6) - Tonalidade alta e alegre de alerta
    const t2 = now + 0.14;
    const osc3 = ctx.createOscillator();
    const osc4 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc3.type = "sine";
    osc3.frequency.setValueAtTime(783.99, t2); // G5
    osc4.type = "sine";
    osc4.frequency.setValueAtTime(1046.5, t2); // C6

    gain2.gain.setValueAtTime(0.001, t2);
    gain2.gain.exponentialRampToValueAtTime(0.35, t2 + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.5);

    osc3.connect(gain2);
    osc4.connect(gain2);
    gain2.connect(ctx.destination);

    osc3.start(t2);
    osc4.start(t2);
    osc3.stop(t2 + 0.55);
    osc4.stop(t2 + 0.55);

    // Vibração em celulares que suportam
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([150, 80, 150]);
    }
  } catch {
    // Ignora caso áudio não seja permitido sem interação prévia
  }
}

let titleFlashTimer: ReturnType<typeof setInterval> | null = null;
let originalTitle = "";

/**
 * Pisca o título da aba do navegador para chamar a atenção
 */
export function flashTabTitle(alertMessage: string, durationMs = 12000) {
  if (typeof document === "undefined") return;

  if (titleFlashTimer) {
    clearInterval(titleFlashTimer);
    titleFlashTimer = null;
  }

  if (!originalTitle) {
    originalTitle = document.title;
  }

  let showAlt = false;
  titleFlashTimer = setInterval(() => {
    document.title = showAlt ? `🔔 ${alertMessage}` : originalTitle;
    showAlt = !showAlt;
  }, 1000);

  const stopFlashing = () => {
    if (titleFlashTimer) {
      clearInterval(titleFlashTimer);
      titleFlashTimer = null;
    }
    if (originalTitle) {
      document.title = originalTitle;
    }
    window.removeEventListener("focus", stopFlashing);
  };

  window.addEventListener("focus", stopFlashing);
  setTimeout(stopFlashing, durationMs);
}

/**
 * Dispara notificação nativa do Windows / Área de Trabalho
 */
export function sendDesktopNotification(
  title: string,
  options?: {
    body?: string;
    tag?: string;
    onClickUrl?: string;
    icon?: string;
  }
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notif = new Notification(title, {
      body: options?.body,
      icon: options?.icon || "/logo.png",
      tag: options?.tag || `eforte-${Date.now()}`,
      silent: false, // Permite que o Windows emita o som padrão do sistema
    });

    notif.onclick = () => {
      window.focus();
      if (options?.onClickUrl) {
        window.location.href = options.onClickUrl;
      }
      notif.close();
    };
  } catch {
    // Alguns navegadores exigem service worker para notificações em background
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification(title, {
            body: options?.body,
            icon: options?.icon || "/logo.png",
            tag: options?.tag,
          });
        })
        .catch(() => {});
    }
  }
}

/**
 * Solicita permissão ao usuário para exibir notificações no Windows
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    toast.error("Seu navegador não suporta notificações nativas.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      playNotificationChime();
      sendDesktopNotification("🔔 Notificações Ativadas!", {
        body: "Os alertas de pedidos e mensagens da Eforte Games aparecerão aqui no Windows.",
      });
      toast.success("Notificações no Windows ativadas com sucesso!");
      return true;
    } else if (permission === "denied") {
      toast.error(
        "Notificações bloqueadas pelo navegador. Clique no cadeado na barra de endereços para permitir."
      );
      return false;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Disparador unificado para o Admin:
 * 1. Toca som cristalino harmônico
 * 2. Mostra Pop-up nativo do Windows
 * 3. Mostra Toast dentro da página
 * 4. Pisca o título da aba
 */
export function notifyAdmin(params: {
  title: string;
  body?: string;
  onClickUrl?: string;
  tag?: string;
  actionLabel?: string;
  onAction?: () => void;
  playSound?: boolean;
  showToast?: boolean;
}) {
  const {
    title,
    body,
    onClickUrl,
    tag,
    actionLabel = "Ver",
    onAction,
    playSound = true,
    showToast = true,
  } = params;

  // 1. Som de alerta
  if (playSound) {
    playNotificationChime();
  }

  // 2. Pop-up nativo do Windows
  sendDesktopNotification(title, {
    body,
    tag,
    onClickUrl,
  });

  // 3. Piscar título da aba
  flashTabTitle(title);

  // 4. Toast Sonner no site
  if (showToast) {
    toast(title, {
      description: body,
      duration: 10000,
      action: {
        label: actionLabel,
        onClick: () => {
          if (onAction) {
            onAction();
          } else if (onClickUrl) {
            window.location.href = onClickUrl;
          }
        },
      },
    });
  }
}
