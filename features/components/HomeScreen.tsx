import { useState, useEffect } from "react";
import { Pill, Stethoscope, Sparkles, Zap } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { checkTypo } from "@/lib/groq";
import InteractionChecker from "./InteractionChecker";
import ProspectusUploader from "./ProspectusUploader";
import { FileText } from "lucide-react";

type Mode = "medicine" | "symptom" | "interaction";

interface HomeScreenProps {
  onAnalyze: (text: string, mode: "medicine" | "symptom") => void;
  isLoading: boolean;
  forceInputText?: string | null;
  onProspectusAnalyze: (text: string) => void;
}

const HomeScreen = ({ onAnalyze, isLoading, forceInputText, onProspectusAnalyze }: HomeScreenProps) => {
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
    onAnalyze(text, mode as "medicine" | "symptom");
  };

  const handleSuggestionClick = () => {
    if (!suggestion) return;
    const textToAnalyze = suggestion;
    setInput(textToAnalyze);
    setSuggestion(null);
    onAnalyze(textToAnalyze, mode as "medicine" | "symptom");
  };

  useEffect(() => {
    if (forceInputText) {
      setInput(forceInputText);
    }
  }, [forceInputText]);

  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed.length < 3 || isLoading || mode === "symptom" || mode === "interaction") {
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
  }, [input, isLoading, mode]);

  return (
    <section className="glass-card">
      <h1 className="font-bold mb-4 text-foreground text-lg">{t("home.title")}</h1>

      {/* Sekmeler */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button
          type="button"
          onClick={() => setMode("medicine")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl px-1 sm:px-4 py-3 min-h-[48px] font-semibold border cursor-pointer transition-all text-[13px] sm:text-sm whitespace-nowrap flex-shrink-0
            ${mode === "medicine"
              ? "bg-[hsla(217,80%,55%,0.15)] dark:bg-secondary/20 border-[hsla(217,80%,55%,0.4)] dark:border-secondary/40 text-foreground shadow-[0_0_12px_rgba(0,220,200,0.1)]"
              : "bg-muted/40 border-border text-muted-foreground hover:bg-secondary/10 hover:border-secondary/30"}`}
        >
          <Pill className="w-4 h-4 shrink-0" />
          {t("home.medicine_analysis")}
        </button>
        <button
          type="button"
          onClick={() => setMode("symptom")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl px-1 sm:px-4 py-3 min-h-[48px] font-semibold border cursor-pointer transition-all text-[13px] sm:text-sm whitespace-nowrap flex-shrink-0
            ${mode === "symptom"
              ? "bg-primary/15 border-primary/35 text-foreground shadow-[0_0_12px_rgba(0,220,200,0.1)]"
              : "bg-muted/40 border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/25"}`}
        >
          <Stethoscope className="w-4 h-4 shrink-0" />
          {t("home.symptom_suggestion")}
        </button>
        <button
          type="button"
          onClick={() => setMode("interaction")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl px-1 sm:px-4 py-3 min-h-[48px] font-semibold border cursor-pointer transition-all text-[13px] sm:text-sm whitespace-nowrap flex-shrink-0
            ${mode === "interaction"
              ? "bg-orange-500/15 border-orange-500/35 text-foreground shadow-[0_0_12px_rgba(255,165,0,0.1)]"
              : "bg-muted/40 border-border text-muted-foreground hover:bg-orange-500/10 hover:border-orange-500/25"}`}
        >
          <Zap className="w-4 h-4 shrink-0" />
          {t("interaction.title")}
        </button>
        
      </div>

     {/* İçerik */}
      {mode === "interaction" ? (
        <InteractionChecker />
      ) : (
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
          {mode === "medicine" && (
            <div className="relative">
              <input
                type="file"
                accept="application/pdf"
                id="prospectus-input"
                style={{ display: "none" }}
                onChange={async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.currentTarget.value = "";
  if (file.size > 5_000_000) {
    alert("Dosya 5MB'dan büyük olamaz.");
    return;
  }
 try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let text = "";
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(uint8);
    const btMatches = raw.match(/BT[\s\S]*?ET/g) || [];
    for (const block of btMatches) {
      const strMatches = block.match(/\(([^)]+)\)/g) || [];
      for (const s of strMatches) {
        text += s.slice(1, -1) + " ";
      }
    }
    // Alternatif: düz metin akışlarını da çek
    const streamMatches = raw.match(/stream[\s\S]*?endstream/g) || [];
    for (const stream of streamMatches) {
      const readable = stream.replace(/[^\x20-\x7EğüşıöçĞÜŞİÖÇ]/g, " ").replace(/\s+/g, " ").trim();
      if (readable.length > 50) text += readable + " ";
    }
    text = text.replace(/\s+/g, " ").trim().slice(0, 8000);
    if (!text || text.length < 100) {
      alert("PDF'den metin çıkarılamadı. Metin tabanlı bir PDF yükleyin.");
      return;
    }
    const { analyzeProspectus } = await import("../lib/groq");
    const res = await analyzeProspectus(text, language);
    onProspectusAnalyze(res.medicineName || file.name);
  } catch (err) {
    console.error(err);
    alert("PDF okunamadı.");
  }
}}
              />
              <label
                htmlFor="prospectus-input"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl border border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 cursor-pointer transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                veya prospektüs PDF yükle
              </label>
            </div>
          )}
          {suggestion && (
            <div className="text-sm font-medium animate-fade-in-up mt-1 mb-1 px-1">
              {language === "tr" ? "Bunu mu demek istediniz:" : "Did you mean:"}{" "}
              <button
                type="button"
                onClick={handleSuggestionClick}
                className="text-primary hover:text-emerald-400 cursor-pointer underline underline-offset-2 transition-colors"
              >
                {suggestion}
              </button>?
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
          <div className="mt-1 text-xs text-muted-foreground min-h-[18px]" role="status" aria-live="polite">
            {statusText}
          </div>
        </form>
      )}
    </section>
  );
};

export default HomeScreen;
