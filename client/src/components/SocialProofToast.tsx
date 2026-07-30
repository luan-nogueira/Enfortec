import { useState, useEffect } from "react";
import { Gamepad2, ShoppingBag, Trophy, X, ShieldCheck, Sparkles } from "lucide-react";

const RECENT_ACTIVITIES = [
  {
    id: 1,
    name: "Gabriel S.",
    city: "Curitiba, PR",
    action: "adquiriu",
    item: "GTA V (Conta Secundária)",
    time: "há 3 min",
    icon: Gamepad2,
    color: "text-red-500",
  },
  {
    id: 2,
    name: "Matheus L.",
    city: "Londrina, PR",
    action: "vendeu",
    item: "Demon's Souls PS5 (Mídia Física)",
    time: "há 11 min",
    icon: ShoppingBag,
    color: "text-blue-400",
  },
  {
    id: 3,
    name: "Felipe M.",
    city: "São Paulo, SP",
    action: "assinou",
    item: "Clube do Platinador VIP",
    time: "há 24 min",
    icon: Trophy,
    color: "text-amber-400",
  },
  {
    id: 4,
    name: "Lucas R.",
    city: "Rio de Janeiro, RJ",
    action: "adquiriu",
    item: "EA Sports FC 26 (Conta Primária)",
    time: "há 38 min",
    icon: Gamepad2,
    color: "text-red-500",
  },
  {
    id: 5,
    name: "Rodrigo T.",
    city: "Belo Horizonte, MG",
    action: "resgatou",
    item: "Gift Card PSN R$ 100 com ForteCoins",
    time: "há 45 min",
    icon: Sparkles,
    color: "text-purple-400",
  },
];

export default function SocialProofToast() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [closedByUser, setClosedByUser] = useState(false);

  useEffect(() => {
    if (closedByUser) return;

    // Wait 4 seconds after page load to show first toast
    const initialTimer = setTimeout(() => {
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

    // Show next activity 18 seconds later
    const nextTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % RECENT_ACTIVITIES.length);
      setVisible(true);
    }, 24000);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [visible, closedByUser]);

  if (closedByUser || !visible) return null;

  const activity = RECENT_ACTIVITIES[currentIndex];
  const Icon = activity.icon;

  return (
    <div className="fixed bottom-20 left-4 z-[9990] hidden sm:flex items-center gap-3 bg-slate-900/95 border border-slate-800 p-3.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
        <Icon className={`w-5 h-5 ${activity.color}`} />
      </div>

      <div className="flex-1 pr-2">
        <p className="text-xs font-bold text-white leading-tight">
          {activity.name} <span className="text-slate-400 font-normal">({activity.city})</span>
        </p>
        <p className="text-[11px] text-slate-300 mt-0.5">
          {activity.action} <strong className="text-white">{activity.item}</strong>
        </p>
        <p className="text-[9px] text-red-400 font-semibold flex items-center gap-1 mt-0.5">
          <ShieldCheck className="w-3 h-3 text-green-400" /> {activity.time} • Garantia Eforte
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
