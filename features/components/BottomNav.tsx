import { Home, Search, Camera, User, Settings } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export type TabType = "home" | "search" | "profile" | "settings";

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onScanClick: () => void;
}

const BottomNav = ({ activeTab, onChangeTab, onScanClick }: BottomNavProps) => {
  const { t } = useLanguage();
  return (
  <nav className="bottom-nav" aria-label="Navigation">
    <button 
      className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`} 
      aria-label={t("nav.home")}
      onClick={() => onChangeTab('home')}
    >
      <Home className="w-5 h-5" />
      <span>{t("nav.home")}</span>
    </button>
    <button 
      className={`bottom-nav-item ${activeTab === 'search' ? 'active' : ''}`} 
      aria-label={t("nav.search")}
      onClick={() => onChangeTab('search')}
    >
      <Search className="w-5 h-5" />
      <span>{t("nav.search")}</span>
    </button>
    <button 
      className="bottom-nav-scan cursor-pointer" 
      aria-label={t("nav.scan")}
      onClick={onScanClick}
    >
      <Camera className="w-8 h-8" />
    </button>
    <button 
      className={`bottom-nav-item ${activeTab === 'profile' ? 'active' : ''}`} 
      aria-label={t("nav.profile")}
      onClick={() => onChangeTab('profile')}
    >
      <User className="w-5 h-5" />
      <span>{t("nav.profile")}</span>
    </button>
    <button 
      className={`bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`} 
      aria-label={t("nav.settings")}
      onClick={() => onChangeTab('settings')}
    >
      <Settings className="w-5 h-5" />
      <span>{t("nav.settings")}</span>
    </button>
  </nav>
);
};

export default BottomNav;
