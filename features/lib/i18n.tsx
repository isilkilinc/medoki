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
  "settings.management": { tr: "Hesap Yönetimi", en: "Account Management" },
  "settings.preferences": { tr: "Uygulama Tercihleri", en: "App Preferences" },
  "settings.preferences_desc": { tr: "Uygulama temasını ve dilini değiştir", en: "Change app theme and language" },
  "settings.language_change": { tr: "Uygulama dilini değiştir", en: "Change the application language" },
  "settings.night_mode": { tr: "Gece Modu", en: "Night Mode" },
  "settings.day_mode": { tr: "Gündüz Modu", en: "Day Mode" },
  "settings.mode_desc": { tr: "Görünümü değiştirin", en: "Change appearance" },
  "settings.language": { tr: "Dil", en: "Language" },
  "settings.language_desc": { tr: "Uygulama dilini değiştirin", en: "Change the application language" },
  "settings.about": { tr: "Hakkında", en: "About" },
  "settings.privacy": { tr: "Gizlilik Politikası", en: "Privacy Policy" },
  "settings.support": { tr: "Yardım ve Destek", en: "Help & Support" },
  "settings.account_info": { tr: "Hesap Bilgilerim", en: "Account Information" },
  "settings.account_info_desc": { tr: "Adınızı güncelleyebilirsiniz", en: "You can update your name" },
  "settings.photo_upload_soon": { tr: "Fotoğraf yükleme yakında", en: "Photo upload coming soon" },
  "settings.full_name": { tr: "Ad Soyad", en: "Full Name" },
  "settings.full_name_placeholder": { tr: "Adınız Soyadınız", en: "Your Full Name" },
  "settings.email": { tr: "E-posta", en: "Email" },
  "settings.email_readonly_desc": { tr: "E-posta adresi değiştirilemez", en: "Email address cannot be changed" },
  "settings.phone": { tr: "CEP TELEFONU", en: "PHONE NUMBER" },
  "settings.phone_placeholder": { tr: "Örn: 5XX XXX XX XX", en: "E.g: 5XX XXX XX XX" },
  "settings.update_button": { tr: "Bilgileri Güncelle", en: "Update Information" },
  "settings.update_success": { tr: "Bilgiler başarıyla güncellendi.", en: "Profile updated." },
  "settings.security": { tr: "Güvenlik ve Şifre", en: "Security & Password" },
  "settings.security_desc": { tr: "Şifrenizi güncelleyin", en: "Update your password" },
  "settings.current_password": { tr: "Mevcut Şifre", en: "Current Password" },
  "settings.new_password": { tr: "Yeni Şifre", en: "New Password" },
  "settings.new_password_req": { tr: "En az 6 karakter", en: "At least 6 characters" },
  "settings.new_password_confirm": { tr: "Yeni Şifre Tekrar", en: "Confirm New Password" },
  "settings.updating": { tr: "Güncelleniyor...", en: "Updating..." },
  "settings.update_password": { tr: "Şifreyi Güncelle", en: "Update Password" },
  "settings.legal": { tr: "Yasal İzinler ve Sözleşmeler", en: "Legal Permissions & Agreements" },
  "settings.legal_kvkk": { tr: "KVKK Aydınlatma Metni", en: "KVKK Clarification Text" },
  "settings.legal_kvkk_desc": { tr: "Verilerinizin nasıl işlendiği", en: "How your data is processed" },
  "settings.legal_privacy": { tr: "Gizlilik Politikası", en: "Privacy Policy" },
  "settings.legal_privacy_desc": { tr: "Gizlilik haklarınız", en: "Your privacy rights" },
  "settings.legal_tos": { tr: "Kullanıcı Sözleşmesi", en: "User Agreement" },
  "settings.legal_tos_desc": { tr: "Platform kullanım koşulları", en: "Platform terms of use" },
  "settings.danger_zone": { tr: "Tehlikeli Bölge", en: "Danger Zone" },
  "settings.danger_zone_desc": { tr: "Bu işlemler geri alınamaz", en: "These actions cannot be undone" },
  "settings.delete_placeholder": { tr: "hesabımı sil", en: "hesabımı sil" },
  "settings.processing": { tr: "İşleniyor...", en: "Processing..." },
  "settings.delete_button": { tr: "Hesabımı Kalıcı Olarak Sil", en: "Permanently Delete My Account" },
  "settings.got_it": { tr: "Anladım", en: "Got it" },

  // ProfileScreen
  "profile.welcome": { tr: "Hoş geldin Işıl!", en: "Welcome Işıl!" },
  "profile.welcome_desc": { tr: "Buildathon projene harika bir başlangıç yaptın. Medoki ile ilaçlarını daha bilinçli kullanmaya hazırsın.", en: "You made a great start to your Buildathon project. You are ready to use medicines consciously with Medoki." },
  "profile.logout": { tr: "Çıkış Yap", en: "Log Out" },
  "profile.my_account": { tr: "Hesabım", en: "My Account" },
  "profile.active": { tr: "Aktif", en: "Active" },
  "profile.health_card_title": { tr: "Kişisel Sağlık Kartım", en: "Personal Health Card" },
  "profile.health_card_desc": { tr: "Bilgileriniz güvenle saklanır ve yalnızca size gösterilir.", en: "Your information is stored securely and only shown to you." },
  "profile.blood_type": { tr: "Kan Grubu", en: "Blood Type" },
  "profile.allergies": { tr: "Alerjilerim", en: "My Allergies" },
  "profile.allergies_placeholder": { tr: "Örn: Polen alerjisi, Penisilin, Fıstık...", en: "E.g: Pollen allergy, Penicillin, Peanut..." },
  "profile.chronic_conditions": { tr: "Kronik Hastalıklarım", en: "Chronic Conditions" },
  "profile.chronic_conditions_placeholder": { tr: "Örn: Diyabet Tip 2, Hipertansiyon, Astım...", en: "E.g: Type 2 Diabetes, Hypertension, Asthma..." },
  "profile.update_button": { tr: "Bilgilerimi Güncelle", en: "Update My Information" },
  "profile.update_success": { tr: "Bilgiler başarıyla güncellendi.", en: "Profile updated." },
  "profile.saving": { tr: "Kaydediliyor...", en: "Saving..." },
  "profile.unknown": { tr: "Bilinmiyor", en: "Unknown" },
  "profile.login_required": { tr: "Sağlık bilgilerinizi kaydetmek ve kişisel profilinizi görmek için giriş yapın.", en: "Log in to save your health information and view your personal profile." },
  "profile.profile": { tr: "Profil", en: "Profile" },
  "profile.login_signup": { tr: "Giriş Yap / Kayıt Ol", en: "Log In / Sign Up" },
  "profile.email_placeholder": { tr: "E-posta adresiniz", en: "Your email address" },
  "profile.password_placeholder": { tr: "Şifreniz", en: "Your password" },
  "profile.login": { tr: "Giriş Yap", en: "Log In" },
  "profile.no_account": { tr: "Henüz hesabın yok mu?", en: "Don't have an account yet?" },
  "profile.signup": { tr: "Kayıt Ol", en: "Sign Up" },

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

  // ResultsScreen
  "results.back": { tr: "Geri", en: "Back" },
  "results.copy": { tr: "Metni Kopyala", en: "Copy Text" },
  "results.share": { tr: "Analizi Paylaş", en: "Share Analysis" },
  "results.copied": { tr: "Metin panoya kopyalandı.", en: "Text copied to clipboard." },
  "results.copy_failed": { tr: "Kopyalama yapılamadı.", en: "Copy failed." },
  "results.share_fallback": { tr: "Paylaşım bu cihazda yok; özet panoya kopyalandı.", en: "Sharing not supported; summary copied to clipboard." },
  "results.error": { tr: "Beklenmeyen bir hata oluştu.", en: "An unexpected error occurred." },

  // Index loading
  "index.analyzing": { tr: "Analiz ediliyor...", en: "Analyzing..." },

  // InteractionChecker
  "interaction.title": { tr: "İlaç Etkileşim Kontrolü", en: "Drug Interaction Checker" },
  "interaction.desc": { tr: "Birlikte kullandığınız ilaçları girin, olası etkileşimleri analiz edelim.", en: "Enter the medicines you use together, let's analyze possible interactions." },
  "interaction.placeholder": { tr: "{{n}}. ilaç adı (örn: Parol)", en: "Medicine {{n}} (e.g: Aspirin)" },
  "interaction.add": { tr: "İlaç ekle (maks. 5)", en: "Add medicine (max. 5)" },
  "interaction.button": { tr: "Etkileşimi Kontrol Et", en: "Check Interactions" },
  "interaction.analyzing": { tr: "Analiz ediliyor...", en: "Analyzing..." },
  "interaction.min_two": { tr: "En az 2 ilaç adı giriniz.", en: "Please enter at least 2 medicine names." },
  "interaction.error": { tr: "Bir hata oluştu. Tekrar deneyin.", en: "An error occurred. Please try again." },
  "interaction.severity_major": { tr: "Ciddi Etkileşim", en: "Major Interaction" },
  "interaction.severity_moderate": { tr: "Orta Etkileşim", en: "Moderate Interaction" },
  "interaction.severity_minor": { tr: "Hafif Etkileşim", en: "Minor Interaction" },
  "interaction.recommendation_prefix": { tr: "Öneri", en: "Recommendation" },
  "interaction.disclaimer": { tr: "Bu bilgiler genel amaçlıdır; doktor veya eczacı tavsiyesinin yerine geçmez.", en: "This information is for general purposes only and does not replace medical advice." },
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
