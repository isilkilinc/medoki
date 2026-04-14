import { useState, useEffect } from "react";
import AmbientBackground from "@/components/AmbientBackground";
import HomeScreen from "@/components/HomeScreen";
import ResultsScreen from "@/components/ResultsScreen";
import SearchScreen from "@/components/SearchScreen";
import ScanOverlay from "@/components/ScanOverlay";
import BottomNav, { TabType } from "@/components/BottomNav";
import ProfileScreen from "@/components/ProfileScreen";
import SettingsScreen from "@/components/SettingsScreen";
import type { ReactNode } from "react";
import { analyzeMedicine, analyzeSymptom, validateMedicine, validateSymptom } from "@/lib/groq";
import type { MedicineResult, SymptomResult } from "@/lib/groq";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { LogIn, LogOut, Loader2 } from "lucide-react";

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
  const [forceSearchInput, setForceSearchInput] = useState<string | null>(null);
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("medoki_recent_searches_v2");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.slice(0, 5);
        } catch {}
      }
    }
    return ["Parol", "Arveles", "Majezik"];
  });


  
  useEffect(() => {
    if (user) {
      supabase.from("user_search_history")
        .select("search_term")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)
        .then(({ data }) => {
           if (data) {
              const terms = data.map((d: any) => d.search_term);
              const unique = Array.from(new Set(terms)).slice(0, 5);
              if (unique.length > 0) setRecentSearches(unique as string[]);
           }
        });
    }
  }, [user]);

  const saveToHistory = async (term: string) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, 5);
      localStorage.setItem("medoki_recent_searches_v2", JSON.stringify(updated));
      return updated;
    });
    
    if (user) {
       await supabase.from("user_search_history").insert([
         { user_id: user.id, search_term: term, search_type: mode }
       ]);
    }
  };

  const handleDeleteSearch = (term: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(item => item !== term);
      localStorage.setItem("medoki_recent_searches_v2", JSON.stringify(updated));
      return updated;
    });
  };

  const handleAnalyze = async (text: string, selectedMode: Mode) => {
    if (!user) {
      const tries = parseInt(localStorage.getItem("medoki_guest_tries") || "0");
      if (tries >= 2) {
         navigate("/login");
         return;
      }
      localStorage.setItem("medoki_guest_tries", (tries + 1).toString());
    }

    setMode(selectedMode);
    setQuery(text);
    setResult(null);
    setError(null);
    setIsLoading(true);
    setScreen("results");

    try {
      if (selectedMode === "medicine") {
        const validation = await validateMedicine(text);

        if (!validation.isValid && validation.isTypo && validation.suggestion) {
          if (validation.suggestion.toLowerCase() === text.toLowerCase()) {
            validation.isValid = true; // Zaten o ilacı aratmış, engelleme!
          }
        }

        // Semptom girildiyse ilaç analizine izin verme, yönlendirme göster
        if (validation.isSymptom) {
          setError(
            <div className="flex flex-col gap-2">
              <span>
                <strong>"{text}"</strong> bir semptomdur; ilaç analizi yapılamaz.
              </span>
              <span className="font-medium text-primary">
                Semptom analizi için lütfen{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("home");
                    setScreen("home");
                    setError(null);
                    setResult(null);
                    // Semptom sekmesini açıp analizi otomatik başlat
                    handleAnalyze(text, "symptom");
                  }}
                  className="font-bold underline cursor-pointer hover:text-emerald-400 transition-colors"
                >
                  Semptom Önerisi
                </button>{" "}
                sekmesini kullanın.
              </span>
            </div>
          );
          setIsLoading(false);
          return;
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
                      const text = validation.suggestion!;
                      setForceSearchInput(text);
                      handleAnalyze(text, "medicine");
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
        // ── SEMPTOM MODU: 3 AŞAMALI DOĞRULAMA ──
        const symptomVal = await validateSymptom(text);

        if (symptomVal.stage === "error" || symptomVal.stage === "suggestion") {
          // Öneri istemiyoruz, anlamsız/hatalı tüm girişlerde işlemi iptal et
          setError("İşlem tamamlanamadı. Lütfen geçerli bir semptom veya şikayet girdiğinizden emin olun.");
          setIsLoading(false);
          return;
        }

        // Aşama 1: auto_correct — düzeltilmiş kelimeyle analiz başlat
        const termToAnalyze = symptomVal.correctedTerm || text;
        const res = await analyzeSymptom(termToAnalyze);
        saveToHistory(res.correctedTerm || termToAnalyze);
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
        
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 animate-fade-in-up">
           {authLoading ? (
               <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
           ) : user ? (
             <button
                type="button"
                onClick={() => signOut()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/40 text-xs font-semibold text-foreground shadow-sm border border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Çıkış
              </button>
           ) : (
             <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
              >
                Giriş Yap
                <LogIn className="w-3.5 h-3.5" />
              </button>
           )}
        </div>
      </header>

      <main className="relative z-[1] max-w-[480px] mx-auto px-4 pb-24">
        {activeTab === "home" && (
          screen === "home" ? (
            <>
              <HomeScreen 
                onAnalyze={(text, mode) => { 
                  setForceSearchInput(null);
                  handleAnalyze(text, mode); 
                }} 
                isLoading={isLoading} 
                forceInputText={forceSearchInput}
              />
            </>
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
