import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/firebase";
import { 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  signInWithPopup 
} from "firebase/auth";
import { Flame } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

function isValidCPF(cpf: string) {
  const cleanCPF = cpf.replace(/\D/g, "");
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
}

export default function Login() {
  const [, navigate] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation();

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.substring(0, 11);
    if (value.length > 9) {
      value = `${value.substring(0, 3)}.${value.substring(3, 6)}.${value.substring(6, 9)}-${value.substring(9)}`;
    } else if (value.length > 6) {
      value = `${value.substring(0, 3)}.${value.substring(3, 6)}.${value.substring(6)}`;
    } else if (value.length > 3) {
      value = `${value.substring(0, 3)}.${value.substring(3)}`;
    }
    setCpf(value);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!isValidCPF(cpf)) {
          setError("CPF inválido. Por favor, insira um CPF válido para se cadastrar.");
          setLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
        // Aguarda propagação da sessão no tRPC
        await new Promise(r => setTimeout(r, 800));
        await updateProfileMutation.mutateAsync({ cpf });
      }
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Erro na autenticação.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login com o Google.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md card-neon bg-slate-900 border border-red-700/30 p-8 rounded-xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-xl mb-4">🔥</div>
          <h1 className="text-3xl font-black text-neon text-center">
            EFORTE GAMES
          </h1>
          <p className="text-slate-400 mt-2 text-center">
            {isLogin ? "Faça login para continuar" : "Crie sua conta"}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input 
              id="email" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              className="bg-slate-950 border-red-700/30 focus-visible:ring-red-500" 
              placeholder="seu@email.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              className="bg-slate-950 border-red-700/30 focus-visible:ring-red-500"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <Label htmlFor="cpf">CPF</Label>
              <Input 
                id="cpf" 
                type="text" 
                value={cpf}
                onChange={handleCpfChange}
                required 
                className="bg-slate-950 border-red-700/30 focus-visible:ring-red-500"
                placeholder="000.000.000-00"
              />
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-red-700 hover:bg-red-800 btn-neon py-6"
            disabled={loading}
          >
            {loading ? "Aguarde..." : (isLogin ? "Entrar" : "Criar Conta")}
          </Button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-slate-700"></div>
          <span className="px-3 text-slate-400 text-sm">OU</span>
          <div className="flex-1 border-t border-slate-700"></div>
        </div>

        <Button 
          type="button" 
          variant="outline" 
          onClick={handleGoogleLogin}
          className="w-full bg-slate-100 hover:bg-white text-slate-900 border-none py-6 font-semibold"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continuar com o Google
        </Button>

        <p className="mt-8 text-center text-slate-400 text-sm">
          {isLogin ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-red-500 hover:text-red-400 font-semibold transition"
          >
            {isLogin ? "Crie uma agora" : "Faça login"}
          </button>
        </p>
      </div>
    </div>
  );
}
