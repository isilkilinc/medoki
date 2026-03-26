import { useState } from "react";
import { User, LogIn, Mail, Lock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function ProfileScreen() {
  const [isLogged, setIsLogged] = useState(false);
  const { t } = useLanguage();

  if (isLogged) {
    return (
      <div className="flex flex-col items-center justify-center pt-8 pb-12 text-center animate-fade-in-up w-full">
        <div className="w-24 h-24 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6 border-2 border-primary/30 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
          <User className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold mb-2">{t("profile.welcome")}</h2>
        <p className="text-muted-foreground mb-10 px-4 leading-relaxed">{t("profile.welcome_desc")}</p>
        
        <button 
          onClick={() => setIsLogged(false)}
          className="w-full max-w-[280px] py-3.5 rounded-xl border-2 border-destructive/30 text-destructive font-medium hover:bg-destructive/10 hover:border-destructive/60 transition-colors shadow-sm"
        >
          {t("profile.logout")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center pt-4 pb-8 animate-fade-in-up w-full">
      <div className="glass-card w-full p-7 flex flex-col items-center shadow-lg border-border/50 bg-card/60">
        <div className="w-16 h-16 bg-muted/60 border border-border rounded-full flex items-center justify-center mb-6 shadow-sm">
          <User className="w-8 h-8 text-muted-foreground/80" />
        </div>
        <h2 className="text-2xl font-bold mb-8 w-full text-center">{t("profile.login_signup")}</h2>
        
        <div className="w-full space-y-4 mb-8">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="email" 
              placeholder={t("profile.email_placeholder")} 
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/60 text-sm shadow-sm"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="password" 
              placeholder={t("profile.password_placeholder")} 
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/60 text-sm shadow-sm"
            />
          </div>
        </div>

        <button 
          onClick={() => setIsLogged(true)}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(52,211,153,0.4)] hover:shadow-[0_6px_20px_rgba(52,211,153,0.6)]"
        >
          <LogIn className="w-5 h-5" />
          {t("profile.login")}
        </button>
        
        <p className="mt-6 text-sm text-muted-foreground text-center">
          {t("profile.no_account")}{" "}
          <span className="text-primary font-bold hover:underline cursor-pointer transition-all">
            {t("profile.signup")}
          </span>
        </p>
      </div>
    </div>
  );
}
