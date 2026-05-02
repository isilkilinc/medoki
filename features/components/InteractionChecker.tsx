import { useState } from "react";
import { checkDrugInteractions, InteractionResult } from "../lib/groq";
import { Plus, X, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function InteractionChecker() {
  const { t, language } = useLanguage();
  const [medicines, setMedicines] = useState<string[]>(["", ""]);
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function updateMedicine(index: number, value: string) {
    const updated = [...medicines];
    updated[index] = value;
    setMedicines(updated);
  }

  function addMedicine() {
    if (medicines.length < 5) setMedicines([...medicines, ""]);
  }

  function removeMedicine(index: number) {
    if (medicines.length <= 2) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  }

  async function handleCheck() {
    const filled = medicines.map(m => m.trim()).filter(Boolean);
    if (filled.length < 2) {
      setError(t("interaction.min_two"));
      return;
    }
    setError("");
    setIsLoading(true);
    setResult(null);
    try {
      const res = await checkDrugInteractions(filled, language);
      setResult(res);
    } catch {
      setError(t("interaction.error"));
    } finally {
      setIsLoading(false);
    }
  }

  const severityConfig = {
    major: {
      label: t("interaction.severity_major"),
      className: "border-red-500/40 bg-red-500/10",
      badgeClass: "bg-red-500/20 text-red-400",
      icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
    },
    moderate: {
      label: t("interaction.severity_moderate"),
      className: "border-orange-500/40 bg-orange-500/10",
      badgeClass: "bg-orange-500/20 text-orange-400",
      icon: <AlertTriangle className="w-4 h-4 text-orange-400" />,
    },
    minor: {
      label: t("interaction.severity_minor"),
      className: "border-yellow-500/40 bg-yellow-500/10",
      badgeClass: "bg-yellow-500/20 text-yellow-400",
      icon: <Info className="w-4 h-4 text-yellow-400" />,
    },
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-foreground mb-2">{t("interaction.title")}</h2>
      <p className="text-sm text-muted-foreground mb-6">{t("interaction.desc")}</p>

      <div className="flex flex-col gap-3 mb-4">
        {medicines.map((med, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={med}
              onChange={(e) => updateMedicine(index, e.target.value)}
              placeholder={t("interaction.placeholder").replace("{{n}}", String(index + 1))}
              className="flex-1 px-4 py-3 rounded-2xl border border-border bg-card/60 text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm"
            />
            {medicines.length > 2 && (
              <button
                onClick={() => removeMedicine(index)}
                className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {medicines.length < 5 && (
        <button
          onClick={addMedicine}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mb-6"
        >
          <Plus className="w-4 h-4" />
          {t("interaction.add")}
        </button>
      )}

      <button
        onClick={handleCheck}
        disabled={isLoading}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-lg transition-all hover:shadow-[0_0_30px_rgba(52,211,153,0.35)] hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            {t("interaction.analyzing")}
          </>
        ) : (
          t("interaction.button")
        )}
      </button>

      {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}

      {result && (
        <div className="mt-8 flex flex-col gap-4">
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
            result.hasCriticalInteraction
              ? "border-red-500/40 bg-red-500/10"
              : "border-green-500/40 bg-green-500/10"
          }`}>
            {result.hasCriticalInteraction
              ? <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
              : <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
            }
            <p className={`text-sm font-medium ${
              result.hasCriticalInteraction ? "text-red-300" : "text-green-300"
            }`}>
              {result.generalWarning}
            </p>
          </div>

          {result.pairs.map((pair, i) => {
            const config = severityConfig[pair.severity];
            return (
              <div key={i} className={`p-4 rounded-2xl border ${config.className}`}>
                <div className="flex items-center gap-2 mb-3">
                  {config.icon}
                  <span className="font-semibold text-foreground text-sm">
                    {pair.drug1} + {pair.drug2}
                  </span>
                  <span className={`ml-auto text-xs px-2 py-1 rounded-full ${config.badgeClass}`}>
                    {config.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{pair.description}</p>
                <p className="text-sm font-medium text-foreground">💡 {t("interaction.recommendation_prefix")}: {pair.recommendation}</p>
              </div>
            );
          })}

          <p className="text-xs text-muted-foreground text-center px-4">
            {t("interaction.disclaimer")}
          </p>
        </div>
      )}
    </div>
  );
}
