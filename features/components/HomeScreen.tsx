import { useState, useEffect } from "react";
import { Pill, Stethoscope, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { checkTypo } from "@/lib/groq";

type Mode = "medicine" | "symptom";

interface HomeScreenProps {
  onAnalyze: (text: string, mode: Mode) => void;
  isLoading: boolean;
}

const HomeScreen = ({ onAnalyze, isLoading }: HomeScreenProps) => {
  const [mode, setMode] = useState<Mode>("medicine");
  const [input, setInput] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const { t, language } = useLanguage();

  const statusText = mode === "medicine"
    ? t("home.status_medicine")
    : t("home.status_symptom");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setSuggestion(null);
    onAnalyze(text, mode);
  };

  const handleSuggestionClick = () => {
    if (!suggestion) return;
    setInput(suggestion);
    setSuggestion(null);
    onAnalyze(suggestion, mode);
  };

  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed.length < 3 || isLoading) {
      setSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      const correction = await checkTypo(trimmed);
      if (correction && correction.toLowerCase() !== trimmed.toLowerCase()) {
        setSuggestion(correction);
      } else {
        setSuggestion(null);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [input, isLoading]);

  return (
    <section className="glass-card">
      <h1 className="font-bold mb-4 text-foreground text-lg">{t("home.title")}</h1>

      <div className="flex gap-3 flex-wrap mb-4">
        <button
          type="button"
          onClick={() => setMode("medicine")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-3 min-h-[48px] font-semibold border cursor-pointer transition-all text-sm
            ${mode === "medicine"
              ? "bg-[hsla(217,80%,55%,0.15)] dark:bg-secondary/20 border-[hsla(217,80%,55%,0.4)] dark:border-secondary/40 text-foreground shadow-[0_0_12px_rgba(0,220,200,0.1)]"
              : "bg-muted/40 border-border text-muted-foreground hover:bg-secondary/10 hover:border-secondary/30"}`}
        >
          <Pill className="w-4.5 h-4.5" />
          {t("home.medicine_analysis")}
        </button>
        <button
          type="button"
          onClick={() => setMode("symptom")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-3 min-h-[48px] font-semibold border cursor-pointer transition-all text-sm
            ${mode === "symptom"
              ? "bg-primary/15 border-primary/35 text-foreground shadow-[0_0_12px_rgba(0,220,200,0.1)]"
              : "bg-muted/40 border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/25"}`}
        >
          <Stethoscope className="w-4.5 h-4.5" />
          {t("home.symptom_suggestion")}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium" htmlFor="user-input">
          {mode === "medicine" ? t("home.input_label_medicine") : t("home.input_label_symptom")}
        </label>
        <input
          id="user-input"
          type="text"
          autoComplete="off"
          placeholder={mode === "medicine" ? t("home.placeholder_medicine") : t("home.placeholder_symptom")}
          required
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground outline-none backdrop-blur-xl text-sm transition-colors focus:border-primary/40 focus:bg-muted/70"
        />
        {suggestion && (
          <div className="text-sm font-medium animate-fade-in-up mt-1 mb-1 px-1">
            {language === "tr" ? "Bunu mu demek istediniz:" : "Did you mean:"} <button type="button" onClick={handleSuggestionClick} className="text-primary hover:text-emerald-400 cursor-pointer underline underline-offset-2 transition-colors">{suggestion}</button>?
          </div>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 min-h-[48px] font-semibold border border-primary/30 bg-primary/15 text-primary cursor-pointer transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 hover:bg-primary/20 hover:border-primary/45 hover:shadow-[0_0_16px_rgba(0,220,200,0.12)] text-sm"
        >
          <Sparkles className="w-4 h-4" />
          {isLoading ? t("home.button_loading") : t("home.button_analyze")}
        </button>
      </form>

      <div className="mt-3 text-xs text-muted-foreground min-h-[18px]" role="status" aria-live="polite">
        {statusText}
      </div>
    </section>
  );
};

export default HomeScreen;
