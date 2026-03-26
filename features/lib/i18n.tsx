import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "tr" | "en";

interface Translations {
  [key: string]: {
    tr: string;
    en: string;
  };
}

const translations: Translations = {
  // HomeScreen
  "home.title": { tr: "Ne yapmak istersin?", en: "What would you like to do?" },
  "home.medicine_analysis": { tr: "İlaç Analizi", en: "Medicine Analysis" },
  "home.symptom_suggestion": { tr: "Semptom Önerisi", en: "Symptom Suggestion" },
  "home.input_label_medicine": { tr: "İlaç adı:", en: "Medicine name:" },
  "home.input_label_symptom": { tr: "Semptom / şikayet:", en: "Symptom / complaint:" },
  "home.placeholder_medicine": { tr: "Örn: Parol, Aferin, Majezik...", en: "E.g: Aspirin, Tylenol, Advil..." },
  "home.placeholder_symptom": { tr: "Örn: Baş ağrısı, ateş, kas ağrısı...", en: "E.g: Headache, fever, muscle pain..." },
  "home.button_loading": { tr: "Analiz ediliyor...", en: "Analyzing..." },
  "home.button_analyze": { tr: "Analiz Et", en: "Analyze" },
  "home.status_medicine": { tr: "İlaç adı girdikten sonra analiz edilecek.", en: "Will be analyzed after entering a medicine name." },
  "home.status_symptom": { tr: "Şikayetini yaz; uygun OTC ürünleri önerelim.", en: "Write your complaint; we'll suggest suitable OTC products." },

  // BottomNav
  "nav.home": { tr: "Ana Sayfa", en: "Home" },
  "nav.search": { tr: "Ara", en: "Search" },
  "nav.scan": { tr: "Tara", en: "Scan" },
  "nav.profile": { tr: "Profil", en: "Profile" },
  "nav.settings": { tr: "Ayarlar", en: "Settings" },
  "nav.coming_soon": { tr: "Çok yakında!", en: "Coming soon!" },

  // SettingsScreen
  "settings.title": { tr: "Ayarlar", en: "Settings" },
  "settings.night_mode": { tr: "Gece Modu", en: "Night Mode" },
  "settings.day_mode": { tr: "Gündüz Modu", en: "Day Mode" },
  "settings.mode_desc": { tr: "Görünümü değiştirin", en: "Change appearance" },
  "settings.language": { tr: "Dil Seçimi", en: "Language Selection" },
  "settings.language_desc": { tr: "Uygulama dilini değiştirin", en: "Change the application language" },
  "settings.about": { tr: "Hakkında", en: "About" },
  "settings.privacy": { tr: "Gizlilik Politikası", en: "Privacy Policy" },
  "settings.support": { tr: "Yardım ve Destek", en: "Help & Support" },

  // ProfileScreen
  "profile.welcome": { tr: "Hoş geldin Işıl!", en: "Welcome Işıl!" },
  "profile.welcome_desc": { tr: "Buildathon projene harika bir başlangıç yaptın. Medoki ile ilaçlarını daha bilinçli kullanmaya hazırsın.", en: "You made a great start to your Buildathon project. You are ready to use medicines consciously with Medoki." },
  "profile.logout": { tr: "Çıkış Yap", en: "Log Out" },

  // SearchScreen
  "search.placeholder": { tr: "İlaç veya semptom ara...", en: "Search medicine or symptom..." },
  "search.popular": { tr: "Popüler", en: "Popular" },
  "search.recent": { tr: "Son Aramalar", en: "Recent Searches" },
  "search.chip_painkiller": { tr: "Ağrı Kesici", en: "Painkiller" },
  "search.chip_vitamin": { tr: "Vitamin", en: "Vitamin" },
  "search.chip_flu": { tr: "Grip", en: "Flu" },

  // ScanOverlay
  "scan.placeholder": { tr: "Barkod veya ilaç adını yazın (Simüle Kamera)...", en: "Type barcode or medicine name (Simulated Camera)..." },
  "scan.button": { tr: "Tanımla", en: "Scan" },
  "scan.close": { tr: "Kapat", en: "Close" },
  "scan.analyzing": { tr: "Taranıyor...", en: "Scanning..." },
  "profile.login_signup": { tr: "Giriş Yap / Kayıt Ol", en: "Log In / Sign Up" },
  "profile.email_placeholder": { tr: "E-posta adresiniz", en: "Your email address" },
  "profile.password_placeholder": { tr: "Şifreniz", en: "Your password" },
  "profile.login": { tr: "Giriş Yap", en: "Log In" },
  "profile.no_account": { tr: "Henüz hesabın yok mu?", en: "Don't have an account yet?" },
  "profile.signup": { tr: "Kayıt Ol", en: "Sign Up" },

  // ResultsScreen
  "results.back": { tr: "Geri", en: "Back" },
  "results.copy": { tr: "Metni Kopyala", en: "Copy Text" },
  "results.share": { tr: "Analizi Paylaş", en: "Share Analysis" },
  "results.copied": { tr: "Metin panoya kopyalandı.", en: "Text copied to clipboard." },
  "results.copy_failed": { tr: "Kopyalama yapılamadı.", en: "Copy failed." },
  "results.share_fallback": { tr: "Paylaşım bu cihazda yok; özet panoya kopyalandı.", en: "Sharing not supported; summary copied to clipboard." },
  "results.error": { tr: "Beklenmeyen bir hata oluştu.", en: "An unexpected error occurred." },
  
  // Index loading
  "index.analyzing": { tr: "Analiz ediliyor...", en: "Analyzing..." }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("language");
      return (saved === "en" || saved === "tr") ? saved : "tr";
    }
    return "tr";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    if (translations[key]) {
      return translations[key][language];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
