import { Settings } from "lucide-react";

interface MaintenanceScreenProps {
  title: string;
  message: string;
}

export default function MaintenanceScreen({ title, message }: MaintenanceScreenProps) {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="z-10 flex flex-col items-center text-center max-w-lg space-y-6">
        <div className="relative">
          <Settings className="w-24 h-24 text-red-500 animate-[spin_4s_linear_infinite]" />
          <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          {title || "Estamos em Manutenção"}
        </h1>
        
        <p className="text-slate-400 text-lg leading-relaxed">
          {message || "Voltamos em breve. A loja está recebendo novos produtos e ajustes no sistema."}
        </p>

        <div className="pt-8 opacity-40 grayscale">
          <span className="font-black text-xl tracking-widest text-slate-500">EFORTE</span>
        </div>
      </div>
    </div>
  );
}
