import { useState, useRef } from "react";
import { Copy, Upload, ArrowLeft, CheckCircle } from "lucide-react";
import ResultCard from "./ResultCard";
import UserExperiencesCard from "./UserExperiencesCard";
import type { MedicineResult, SymptomResult } from "@/lib/groq";
import { useLanguage } from "@/lib/i18n";
import type { ReactNode } from "react";

const STAGGER_STEP = 100;

interface ResultsScreenProps {
  mode: "medicine" | "symptom";
  result: MedicineResult | SymptomResult | null;
  error: ReactNode | null;
  query: string;
  onBack: () => void;
  isProspectusAnalysis?: boolean;
}

const ResultsScreen = ({ mode, result, error, query, onBack }: ResultsScreenProps) => {
  const [statusMsg, setStatusMsg] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const getResultsText = () => containerRef.current?.innerText?.trim() || "";

  const handleCopy = async () => {
    const text = getResultsText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setStatusMsg(t("results.copied"));
      setTimeout(() => setStatusMsg((s) => s === t("results.copied") ? "" : s), 2200);
    } catch {
      setStatusMsg(t("results.copy_failed"));
    }
  };

  const handleShare = async () => {
    const text = getResultsText();
    if (!text) return;

    const shortSummary = mode === "medicine"
      ? (result as MedicineResult)?.summary?.slice(0, 500) || ""
      : (result as SymptomResult)?.intro?.slice(0, 500) || "";

    const modeLabel = mode === "medicine" ? "İlaç / sorgu" : "Şikayet";
    const shareText = `Medoki — ${modeLabel}: ${query}\n\nKısa özet: ${shortSummary}\n\n— Medoki analizi (genel bilgilendirme; tıbbi tavsiye değildir)`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Medoki analizi", text: shareText, url: window.location.href });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setStatusMsg(t("results.share_fallback"));
      setTimeout(() => setStatusMsg((s) => s === t("results.share_fallback") ? "" : s), 2400);
    } catch {
      setStatusMsg(t("results.copy_failed"));
    }
  };

  const hasContent = !!result || !!error;

  const renderCards = () => {
    if (error) {
      return (
        <ResultCard title="İşlem tamamlanamadı" className="animate-fade-in-up">
          <p className="text-foreground/75 leading-relaxed m-0 text-sm">{error}</p>
        </ResultCard>
      );
    }

    if (!result) return null;

    if (mode === "medicine") {
      const r = result as MedicineResult;
      const cards: Array<{ title: string; content: React.ReactNode; muted?: boolean }> = [
        { title: "Ne İşe Yarar?", content: <p className="text-foreground/75 leading-relaxed m-0 text-sm">{r.purpose}</p> },
        { title: "Önerilen Doz", content: <p className="text-foreground/75 leading-relaxed m-0 text-sm">{r.dosage}</p> },
        { title: "Sık Görülen Yan Etkiler", content: <ul className="list-disc pl-5 text-foreground/75 grid gap-1.5 text-sm">{r.sideEffects.map((s, i) => <li key={i}>{s}</li>)}</ul> },
        { title: "Kritik Uyarılar", content: <ul className="list-disc pl-5 text-foreground/75 grid gap-1.5 text-sm">{r.warnings.map((s, i) => <li key={i}>{s}</li>)}</ul> },
      ];

      if (r.sensitivityWarnings && r.sensitivityWarnings.length > 0) {
        cards.push({
          title: "Hassasiyet ve İçerik Uyarıları",
          content: (
            <div className="text-foreground/80 grid gap-2.5 text-sm font-medium">
              {r.sensitivityWarnings.map((s, i) => (
                <p key={i} className="m-0 leading-relaxed">{s}</p>
              ))}
            </div>
          )
        });
      }

      cards.push({ title: "Sade Özet", content: <p className="text-foreground/75 leading-relaxed m-0 text-sm">{r.summary}</p> });
      cards.push({ title: "Tıbbi Not", content: <p className="text-foreground/75 leading-relaxed m-0 text-sm">{r.disclaimer}</p>, muted: true });

      return (
        <>
          {/* AI badge */}
          <div className="flex items-center gap-2 mb-3 animate-fade-in-up">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
              <CheckCircle className="w-3.5 h-3.5" />
              AI Tarafından Sadeleştirildi
            </span>
          </div>
          
{/* Prospektüs yönlendirme */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 animate-fade-in-up mb-1">
            <p className="text-xs text-muted-foreground">
              Bu bilgileri doğrulamak ister misiniz?
            </p>
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 shrink-0 transition-colors"
            >
              Prospektüs yükle →
            </button>
          </div>
          
          {cards.map((card, i) => (
            <ResultCard
              key={i}
              title={card.title}
              muted={card.muted}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * STAGGER_STEP}ms` }}
            >
              {card.content}
            </ResultCard>
          ))}
          <UserExperiencesCard
            items={r.userExperiences}
            style={{ animationDelay: `${cards.length * STAGGER_STEP}ms` }}
          />
        </>
      );
    }

    // Symptom mode
    const r = result as SymptomResult;
    let cardIndex = 0;
    const isRedFlag = r.intro?.includes("KRİTİK UYARI");

    return (
      <>
        {/* AI badge */}
        <div className="flex items-center gap-2 mb-3 animate-fade-in-up">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
            <CheckCircle className="w-3.5 h-3.5" />
            AI Tarafından Önerildi
          </span>
        </div>

        <ResultCard title="Şikayet Özeti" className="animate-fade-in-up" style={{ animationDelay: `${cardIndex++ * STAGGER_STEP}ms` }}>
          <p className="text-foreground/75 leading-relaxed m-0 text-sm">{r.intro}</p>
        </ResultCard>

        {!isRedFlag && (
          <>
            <ResultCard title="Önerilen Reçetesiz Çözümler" className="animate-fade-in-up" style={{ animationDelay: `${cardIndex++ * STAGGER_STEP}ms` }}>
              <p className="text-xs text-muted-foreground m-0">
                Aşağıdakiler genel bilgilendirme içindir; eczacı veya doktor onayı olmadan kullanmayın.
              </p>
            </ResultCard>

            {r.products.map((p, i) => (
              <ResultCard
                key={i}
                title={p.labelLine}
                className="animate-fade-in-up"
                style={{ animationDelay: `${cardIndex++ * STAGGER_STEP}ms` }}
              >
                {p.form && <p className="text-xs text-muted-foreground mb-2">{p.form}</p>}
                <p className="text-foreground/75 leading-relaxed m-0 text-sm"><strong className="font-bold text-foreground">Neden uygun:</strong> {p.whyItHelps || "—"}</p>
                <p className="text-foreground/75 leading-relaxed m-0 mt-1 text-sm"><strong className="font-bold text-foreground">Tipik kullanım:</strong> {p.typicalUse || "Prospektüs veya eczacıya danışın."}</p>
                {p.cautions.length > 0 && (
                  <>
                    <p className="text-foreground/75 leading-relaxed m-0 mt-1 text-sm"><strong className="font-bold text-foreground">Dikkat:</strong></p>
                    <ul className="list-disc pl-5 text-foreground/75 grid gap-1.5 text-sm">{p.cautions.map((c, j) => <li key={j}>{c}</li>)}</ul>
                  </>
                )}
              </ResultCard>
            ))}

            <ResultCard title="Genel Öneriler" className="animate-fade-in-up" style={{ animationDelay: `${cardIndex++ * STAGGER_STEP}ms` }}>
              <ul className="list-disc pl-5 text-foreground/75 grid gap-1.5 text-sm">{r.generalTips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </ResultCard>

            <ResultCard title="Ne Zaman Doktora Başvurmalı?" className="animate-fade-in-up" style={{ animationDelay: `${cardIndex++ * STAGGER_STEP}ms` }}>
              <ul className="list-disc pl-5 text-foreground/75 grid gap-1.5 text-sm">{r.whenToSeeDoctor.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </ResultCard>
          </>
        )}

        <ResultCard title="Tıbbi Not" muted className="animate-fade-in-up" style={{ animationDelay: `${cardIndex++ * STAGGER_STEP}ms` }}>
          <p className="text-foreground/75 leading-relaxed m-0 text-sm">{r.disclaimer}</p>
        </ResultCard>

        {!isRedFlag && r.userExperiences && r.userExperiences.length > 0 && (
          <UserExperiencesCard
            items={r.userExperiences}
            style={{ animationDelay: `${cardIndex++ * STAGGER_STEP}ms` }}
          />
        )}
      </>
    );
  };

  return (
    <section className="glass-card relative pb-24">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-foreground flex-1 min-w-0 m-0">
            {result ? (result as MedicineResult | SymptomResult).correctedTerm || query : query}
          </h2>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-2xl px-3 py-2.5 min-h-[40px] text-sm font-medium border border-border bg-muted/40 text-muted-foreground cursor-pointer shrink-0 transition-colors hover:bg-muted/60 hover:text-foreground active:translate-y-px"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("results.back")}
          </button>
        </div>
        <div className="flex flex-wrap gap-2.5 w-full">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!hasContent}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 text-xs font-semibold rounded-2xl px-3 py-2.5 min-h-[42px] border border-border bg-muted/40 text-muted-foreground cursor-pointer transition-all hover:bg-muted/60 hover:text-foreground active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4 opacity-80" />
            {t("results.copy")}
          </button>
        </div>
      </div>

      {/* Results */}
      <div ref={containerRef} className="grid gap-3">
        {renderCards()}
      </div>

      {/* Status */}
      <div className="mt-3 text-xs text-muted-foreground min-h-[18px]" role="status" aria-live="polite">
        {statusMsg}
      </div>

      {/* Share FAB */}
      <button
        type="button"
        onClick={handleShare}
        disabled={!hasContent}
        className="btn-share-fab absolute z-[3] right-3.5 bottom-4"
        aria-label={t("results.share")}
        title={t("results.share")}
      >
        <Upload className="w-5 h-5 opacity-95 shrink-0" />
        <span className="whitespace-nowrap max-[400px]:sr-only text-xs">{t("results.share")}</span>
      </button>
    </section>
  );
};

export default ResultsScreen;
