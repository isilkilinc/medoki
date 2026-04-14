import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, ArrowRight, Loader2, Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { session, signInWithGoogle } = useAuth();
  const { isDark, setIsDark } = useTheme();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Zaten giriş yapmışsa Ana Sayfaya yönlendir
  useEffect(() => {
    if (session) {
      navigate("/");
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Lütfen e-posta ve şifrenizi giriniz.");
      return;
    }
    
    setIsLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Başarıyla giriş yapıldı.");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Kayıt başarılı! Lütfen önce e-postanızı doğrulayın veya giriş yapın.");
        setIsLogin(true); // Kayıttan sonra giriş ekranına dön
      }
    } catch (err: any) {
      toast.error(err.message || "Bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Yönlendirme Supabase tarafından yönetilir.
    } catch (err: any) {
      toast.error("Google ile giriş yapılamadı.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      {/* Üst Kısım: Tema Değiştirici */}
      <div className="absolute top-4 right-4 z-50">
        <button
          type="button"
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-full bg-muted/40 text-foreground shadow-sm border border-border/50 hover:bg-muted/80 transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="w-full max-w-sm flex flex-col animate-fade-in-up">
        {/* Logo/Başlık Alanı */}
        <div className="flex flex-col items-center justify-center mb-8">
          <img 
            src="/logo.png" 
            alt="Medoki Logo" 
            className="w-auto h-[160px] object-contain relative z-10 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)] -mb-2" 
          />
          <div className="text-center flex flex-col items-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Medoki</h1>
            <p className="text-xs font-bold text-primary/80 tracking-widest uppercase mt-0.5">Akıllı Sağlık Rehberiniz</p>
          </div>
        </div>

        {/* Form Alanı (Glassmorphism) */}
        <div className="glass-card flex flex-col gap-5 p-6 rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl shadow-xl">
          
          <div className="mb-2">
            <h2 className="text-lg font-semibold">{isLogin ? "Hoş Geldiniz" : "Hesap Oluşturun"}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isLogin ? "Devam etmek için giriş yapın." : "Kayıtlı analizler için aramıza katılın."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  placeholder="isim@ornek.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-2 rounded-xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-primary/20"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isLogin ? "Giriş Yap" : "Kayıt Ol"}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink-0 px-4 text-xs text-muted-foreground uppercase tracking-wider">veya</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={isGoogleLoading}
            className="w-full h-11 rounded-xl border border-border bg-background text-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-muted/50 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
               </svg>
            )}
            Google ile devam et
          </button>

          <div className="mt-2 text-center">
            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-sm font-medium text-primary hover:underline"
            >
              {isLogin ? "Hesabınız yok mu? Kayıt olun" : "Zaten hesabınız var mı? Giriş yapın"}
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}
