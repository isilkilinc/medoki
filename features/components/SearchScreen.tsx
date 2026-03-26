import { useState } from "react";
import { Search, Clock, ChevronRight, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface SearchScreenProps {
  onSearch: (text: string) => void;
  recentSearches: string[];
  onDeleteSearch?: (text: string) => void;
}

export default function SearchScreen({ onSearch, recentSearches, onDeleteSearch }: SearchScreenProps) {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleChipClick = (key: string) => {
    const text = t(key);
    setQuery(text);
    onSearch(text);
  };

  const handleRecentClick = (text: string) => {
    onSearch(text);
  };

  return (
    <div className="flex flex-col pt-4 pb-8 animate-fade-in-up w-full">
      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="relative mb-8 shadow-sm">
        <button type="submit" className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer z-10 transition-transform active:scale-90" aria-label="Ara">
          <Search className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
        </button>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-border bg-card/60 focus:bg-background text-foreground placeholder:text-muted-foreground/60 outline-none backdrop-blur-md transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
        />
      </form>

      {/* Popular Tags */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-foreground mb-4 pl-1">{t("search.popular")}</h3>
        <div className="flex flex-wrap gap-2.5">
          <button 
            type="button"
            onClick={() => handleChipClick("search.chip_painkiller")}
            className="px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 font-medium text-sm hover:bg-primary/20 transition-all drop-shadow-sm active:scale-95"
          >
            {t("search.chip_painkiller")}
          </button>
          <button 
            type="button"
            onClick={() => handleChipClick("search.chip_vitamin")}
            className="px-4 py-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 font-medium text-sm hover:bg-orange-500/20 transition-all drop-shadow-sm active:scale-95"
          >
            {t("search.chip_vitamin")}
          </button>
          <button 
            type="button"
            onClick={() => handleChipClick("search.chip_flu")}
            className="px-4 py-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium text-sm hover:bg-blue-500/20 transition-all drop-shadow-sm active:scale-95"
          >
            {t("search.chip_flu")}
          </button>
        </div>
      </div>

      {/* Recent Searches Header */}
      {recentSearches.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-foreground mb-4 pl-1">{t("search.recent")}</h3>
          
          {/* Recent Searches List */}
          <div className="glass-card w-full shadow-sm bg-card/60 overflow-hidden p-0 rounded-2xl">
            <div className="flex flex-col divide-y divide-border/50">
              {recentSearches.map((item, index) => (
                <button 
                  key={index}
                  type="button"
                  onClick={() => handleRecentClick(item)}
                  className="flex items-center justify-between p-4 hover:bg-primary/5 transition-all text-left group active:bg-primary/10"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground/70 group-hover:text-primary transition-colors" />
                    <span className="font-medium text-sm text-foreground/80 group-hover:text-foreground transition-colors">{item}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {onDeleteSearch && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSearch(item);
                        }}
                        className="p-1.5 -mr-1 rounded-full text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all hover:text-primary hover:bg-primary/10 focus:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:translate-x-0.5 group-hover:text-primary transition-all ml-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
