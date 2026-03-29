import { useState } from "react";
import AmbientBackground from "@/components/AmbientBackground";
import HomeScreen from "@/components/HomeScreen";
import ResultsScreen from "@/components/ResultsScreen";
import SearchScreen from "@/components/SearchScreen";
import ScanOverlay from "@/components/ScanOverlay";
import BottomNav, { TabType } from "@/components/BottomNav";
import ProfileScreen from "@/components/ProfileScreen";
import SettingsScreen from "@/components/SettingsScreen";
import type { ReactNode } from "react";
import { analyzeMedicine, analyzeSymptom, validateMedicine } from "@/lib/groq";
import type { MedicineResult, SymptomResult } from "@/lib/groq";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

type Screen = "home" | "results";
type Mode = "medicine" | "symptom";

const Index = () => {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [screen, setScreen] = useState<Screen>("home");
  const [isLoading, setIsLoading] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [mode, setMode] = useState<Mode>("medicine");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<MedicineResult | SymptomResult | null>(null);
  const [error, setError] = useState<ReactNode | null>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("medoki_recent_searches_v2");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const cleanHistory = parsed.filter((item: string) => !/macezik|medacasol/i.test(item));
          if (cleanHistory.length !== parsed.length) {
            localStorage.setItem("medoki_recent_searches_v2", JSON.stringify(cleanHistory.length ? cleanHistory : ["Parol", "Arveles", "Majezik"]));
          }
          return cleanHistory.length ? cleanHistory : ["Parol", "Arveles", "Majezik"];
        } catch {}
      }
    }
    return ["Parol", "Arveles", "Majezik"];
  });

  const saveToHistory = (term: string) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, 5);
      localStorage.setItem("medoki_recent_searches_v2", JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteSearch = (term: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(item => item !== term);
      localStorage.setItem("medoki_recent_searches_v2", JSON.stringify(updated));
      return updated;
    });
  };

  const handleAnalyze = async (text: string, selectedMode: Mode) => {
    setMode(selectedMode);
    setQuery(text);
    setResult(null);
    setError(null);
    setIsLoading(true);
    setScreen("results");

    try {
      if (selectedMode === "medicine") {
        const validation = await validateMedicine(text);

        // Kendi kendine öneri hatasını donanımsal olarak engelle:
        if (!validation.isValid && validation.isTypo && validation.suggestion) {
          if (validation.suggestion.toLowerCase() === text.toLowerCase()) {
            validation.isValid = true; // Zaten o ilacı aratmış, engelleme!
          }
        }

        if (!validation.isValid) {
          if (validation.isTypo && validation.suggestion) {
            setError(
              <div className="flex flex-col gap-2">
                <span>'{text}' diye bir ilaç bulunamadı.</span>
                <span className="font-medium text-primary">
                  Bunu mu demek istediniz:{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("home");
                      handleAnalyze(validation.suggestion!, "medicine");
                    }}
                    className="font-bold underline cursor-pointer hover:text-emerald-400 transition-colors"
                  >
                    {validation.suggestion}
                  </button>
                  ?
                </span>
              </div>
            );
          } else {
            setError("Lütfen geçerli bir ilaç adı girdiğinizden emin olun.");
          }
          setIsLoading(false);
          return;
        }

        const res = await analyzeMedicine(text);
        saveToHistory(res.correctedTerm || text);
        setResult(res);
      } else {
        const res = await analyzeSymptom(text);
        saveToHistory(res.correctedTerm || text);
        setResult(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setScreen("home");
    setResult(null);
    setError(null);
  };

  const handleTabChange = (tab: TabType) => {
    setShowScan(false);
    if (tab === "home" && activeTab === "home") {
      handleBack();
    }
    setActiveTab(tab);
  };

  return (
    <>
      <AmbientBackground />

      <header className="relative z-[1] pt-7 pb-3 text-center px-[max(18px,env(safe-area-inset-right))] flex justify-center">
        <div className="relative inline-flex items-center justify-center gap-2.5">
          <img 
            src="/logo.png" 
            alt="Medoki Logo" 
            className="w-auto h-[144px] object-contain relative z-10 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)] hover:scale-[1.02] transition-all duration-[400ms]" 
          />
        </div>
      </header>

      <main className="relative z-[1] max-w-[480px] mx-auto px-4 pb-24">
        {activeTab === "home" && (
          screen === "home" ? (
            <HomeScreen onAnalyze={handleAnalyze} isLoading={isLoading} />
          ) : (
            <ResultsScreen
              mode={mode}
              result={result}
              error={error}
              query={query}
              onBack={handleBack}
            />
          )
        )}

        {activeTab === "search" && <SearchScreen 
          recentSearches={recentSearches} 
          onSearch={(text) => {
            setActiveTab("home");
            handleAnalyze(text, "medicine");
          }} 
          onDeleteSearch={handleDeleteSearch}
        />}
        {activeTab === "profile" && <ProfileScreen />}
        {activeTab === "settings" && <SettingsScreen />}

        {activeTab === "home" && isLoading && screen === "results" && !result && !error && (
          <div className="mt-3 text-sm text-muted-foreground text-center" role="status" aria-live="polite">
            <div className="inline-flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              {t("index.analyzing")}
            </div>
          </div>
        )}
      </main>

      {showScan && (
        <ScanOverlay 
          onClose={() => setShowScan(false)} 
          onScan={(text) => {
            setShowScan(false);
            setActiveTab("home");
            handleAnalyze(text, "medicine");
          }} 
        />
      )}

      <BottomNav activeTab={activeTab} onChangeTab={handleTabChange} onScanClick={() => setShowScan(true)} />
    </>
  );
};

export default Index;
