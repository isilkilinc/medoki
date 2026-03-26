import { Moon, Sun, Globe, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function SettingsScreen() {
  const { isDark, setIsDark } = useTheme();

  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex flex-col pt-4 pb-8 animate-fade-in-up w-full">
      <h2 className="text-2xl font-bold mb-6 text-center">{t("settings.title")}</h2>
      
      <div className="glass-card w-full mb-5 shadow-sm bg-card/60 p-1">
        <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-xl">
          <div className="flex items-center gap-3.5">
            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-orange-500/15 text-orange-500 dark:text-orange-400'}`}>
              {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-semibold text-foreground">{isDark ? t("settings.night_mode") : t("settings.day_mode")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("settings.mode_desc")}</p>
            </div>
          </div>
          <div 
            className={`w-12 h-6 rounded-full transition-colors relative shadow-inner ${isDark ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            onClick={() => setIsDark(!isDark)}
          >
            <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-transform shadow-md ${isDark ? 'translate-x-[1.625rem]' : 'translate-x-1'}`} />
          </div>
        </label>
      </div>

      <div className="glass-card w-full mb-5 shadow-sm bg-card/60 p-1">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-xl" 
          onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{t("settings.language")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("settings.language_desc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="text-sm font-medium">{language === 'tr' ? 'Türkçe' : 'English'}</span>
            <ChevronRight className="w-4 h-4 opacity-70" />
          </div>
        </div>
      </div>
      
      <div className="glass-card w-full shadow-sm bg-card/60 overflow-hidden">
        <div className="flex flex-col divide-y divide-border/50">
          <button className="flex items-center justify-between p-4 px-5 hover:bg-muted/40 transition-colors text-left group">
            <span className="font-semibold text-sm text-foreground/80 group-hover:text-foreground transition-colors">{t("settings.about")}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button className="flex items-center justify-between p-4 px-5 hover:bg-muted/40 transition-colors text-left group">
            <span className="font-semibold text-sm text-foreground/80 group-hover:text-foreground transition-colors">{t("settings.privacy")}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button className="flex items-center justify-between p-4 px-5 hover:bg-muted/40 transition-colors text-left group">
            <span className="font-semibold text-sm text-foreground/80 group-hover:text-foreground transition-colors">{t("settings.support")}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
