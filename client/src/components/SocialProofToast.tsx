import { useState, useEffect } from "react";
import { Gamepad2, ShoppingBag, Trophy, X, ShieldCheck, Sparkles } from "lucide-react";

const FIRST_NAMES = [
  "Lucas", "Matheus", "Gabriel", "Felipe", "Pedro", "Guilherme", "Gustavo", 
  "Rafael", "Thiago", "Vinicius", "Bruno", "Leonardo", "Eduardo", "Rodrigo", 
  "Daniel", "Marcelo", "Henrique", "Caio", "Vitor", "Diego", "João", "André", 
  "Otávio", "Igor", "Arthur", "Renan", "Murilo", "Leandro"
];

const LAST_INITIALS = ["A.", "B.", "C.", "D.", "F.", "G.", "L.", "M.", "N.", "P.", "R.", "S.", "T.", "V."];

const CITIES = [
  "São Paulo, SP", "Rio de Janeiro, RJ", "Curitiba, PR", "Belo Horizonte, MG", 
  "Porto Alegre, RS", "Salvador, BA", "Brasília, DF", "Fortaleza, CE", 
  "Campinas, SP", "Goiânia, GO", "Florianópolis, SC", "Londrina, PR", 
  "Niterói, RJ", "Vitória, ES", "Maringá, PR", "Recife, PE", "Santos, SP"
];

const PRODUCTS = [
  { item: "GTA V (Conta Secundária)", action: "adquiriu", icon: Gamepad2, color: "text-red-500" },
  { item: "EA Sports FC 26 (Conta Primária)", action: "adquiriu", icon: Gamepad2, color: "text-red-500" },
  { item: "God of War Ragnarök (Conta Secundária)", action: "adquiriu", icon: Gamepad2, color: "text-red-500" },
  { item: "Spider-Man 2 PS5 (Mídia Física)", action: "vendeu", icon: ShoppingBag, color: "text-blue-400" },
  { item: "Call of Duty: Black Ops 6 (Conta Primária)", action: "adquiriu", icon: Gamepad2, color: "text-red-500" },
  { item: "Clube do Platinador VIP (R$ 35)", action: "assinou", icon: Trophy, color: "text-amber-400" },
  { item: "Demon's Souls PS5 (Mídia Física)", action: "vendeu", icon: ShoppingBag, color: "text-blue-400" },
  { item: "Elden Ring (Conta Secundária)", action: "adquiriu", icon: Gamepad2, color: "text-red-500" },
  { item: "Red Dead Redemption 2 (Conta Primária)", action: "adquiriu", icon: Gamepad2, color: "text-red-500" },
  { item: "PS Plus Extra 12 Meses", action: "assinou", icon: Sparkles, color: "text-amber-400" },
  { item: "Gift Card PSN R$ 100", action: "resgatou", icon: Sparkles, color: "text-purple-400" },
  { item: "Console PS5 Usado (Mídia Física)", action: "vendeu", icon: ShoppingBag, color: "text-blue-400" },
  { item: "Resident Evil 4 Remake (Conta Secundária)", action: "adquiriu", icon: Gamepad2, color: "text-red-500" },
  { item: "Controle DualSense PS5 Usado", action: "vendeu", icon: ShoppingBag, color: "text-blue-400" },
  { item: "Cyberpunk 2077 (Conta Secundária)", action: "adquiriu", icon: Gamepad2, color: "text-red-500" },
  { item: "Hogwarts Legacy (Conta Primária)", action: "adquiriu", icon: Gamepad2, color: "text-red-500" },
  { item: "Ghost of Tsushima (Mídia Física)", action: "vendeu", icon: ShoppingBag, color: "text-blue-400" },
];

const TIMES = ["há 2 min", "há 4 min", "há 6 min", "há 9 min", "há 12 min", "há 17 min", "há 23 min"];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomActivity() {
  const firstName = getRandomElement(FIRST_NAMES);
  const lastInitial = getRandomElement(LAST_INITIALS);
  const city = getRandomElement(CITIES);
  const prod = getRandomElement(PRODUCTS);
  const time = getRandomElement(TIMES);

  return {
    name: `${firstName} ${lastInitial}`,
    city,
    action: prod.action,
    item: prod.item,
    time,
    icon: prod.icon,
    color: prod.color,
  };
}

export default function SocialProofToast() {
  const [currentActivity, setCurrentActivity] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [closedByUser, setClosedByUser] = useState(false);

  useEffect(() => {
    if (closedByUser) return;

    // First delay 4 seconds
    const initialTimer = setTimeout(() => {
      setCurrentActivity(generateRandomActivity());
      setVisible(true);
    }, 4000);

    return () => clearTimeout(initialTimer);
  }, [closedByUser]);

  useEffect(() => {
    if (closedByUser || !visible) return;

    // Hide after 6 seconds
    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 6000);

    // Show next dynamic random activity 20 seconds later
    const nextTimer = setTimeout(() => {
      setCurrentActivity(generateRandomActivity());
      setVisible(true);
    }, 22000);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [visible, closedByUser]);

  if (closedByUser || !visible || !currentActivity) return null;

  const Icon = currentActivity.icon;

  return (
    <div className="fixed bottom-20 left-4 z-30 hidden sm:flex items-center gap-3 bg-slate-900/95 border border-slate-800 p-3.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
        <Icon className={`w-5 h-5 ${currentActivity.color}`} />
      </div>

      <div className="flex-1 pr-2">
        <p className="text-xs font-bold text-white leading-tight">
          {currentActivity.name} <span className="text-slate-400 font-normal">({currentActivity.city})</span>
        </p>
        <p className="text-[11px] text-slate-300 mt-0.5">
          {currentActivity.action} <strong className="text-white">{currentActivity.item}</strong>
        </p>
        <p className="text-[9px] text-red-400 font-semibold flex items-center gap-1 mt-0.5">
          <ShieldCheck className="w-3 h-3 text-green-400" /> {currentActivity.time} • Garantia Eforte
        </p>
      </div>

      <button
        onClick={() => setClosedByUser(true)}
        className="text-slate-500 hover:text-white p-1 rounded-lg transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
